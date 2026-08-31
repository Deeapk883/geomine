import math
import ee
import numpy as np

# Initialize Earth Engine
try:
    ee.Initialize()
except Exception:
    ee.Authenticate()
    ee.Initialize()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
TILE_SIZE_KM = 8.0          # Each tile covers ~8km × 8km at full resolution
MAX_TILES = 100             # Safety cap: refuse to process more than 100 tiles
TARGET_PX_PER_TILE = 512   # Target pixel width/height per tile
MIN_SCALE_M = 10.0          # Never go below Sentinel-2 native 10m resolution
BAND_NAMES = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12', 'NDVI', 'NDBI', 'NDMI']


def extract_outer_ring(coords: list) -> list:
    if not coords:
        return []
    curr = coords
    while isinstance(curr, list) and len(curr) > 0 and isinstance(curr[0], list) and isinstance(curr[0][0], list):
        curr = curr[0]
    return curr


# ---------------------------------------------------------------------------
# Original single-fetch function (used for small areas)
# ---------------------------------------------------------------------------
def fetch_sentinel_9band_roi(geojson_coords: list):
    """
    Fetches Sentinel-2 imagery for ROI and generates 9-band composite:
    Bands: B2, B3, B4, B8, B11, B12, NDVI, NDBI, NDMI
    Dynamically adjusts scale to stay within GEE sampleRectangle pixel limits (262,144 max).
    """
    ring = extract_outer_ring(geojson_coords)
    roi = ee.Geometry.Polygon(ring)

    # Calculate adaptive scale (meters per pixel)
    lngs = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    min_lng, max_lng = min(lngs), max(lngs)
    min_lat, max_lat = min(lats), max(lats)
    mid_lat = (min_lat + max_lat) / 2.0
    dx_m = (max_lng - min_lng) * 111320 * math.cos(math.radians(mid_lat))
    dy_m = (max_lat - min_lat) * 111320
    max_dim_m = max(dx_m, dy_m)
    scale = float(max(MIN_SCALE_M, max_dim_m / 480.0))

    # Sentinel-2 SR collection (cloud masked, median composite for 2025-2026)
    s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
          .filterBounds(roi)
          .filterDate("2025-01-01", "2026-12-31")
          .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
          .median()
          .clip(roi))

    # Calculate Indices
    ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')
    ndbi = s2.normalizedDifference(['B11', 'B8']).rename('NDBI')
    ndmi = s2.normalizedDifference(['B8', 'B11']).rename('NDMI')

    # Combine into 9-channel image and reproject to EPSG:4326 at adaptive resolution
    img_9band = s2.select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']).addBands([ndvi, ndbi, ndmi]).reproject(crs='EPSG:4326', scale=scale)

    return img_9band, roi


# ---------------------------------------------------------------------------
# Tiled fetch helpers
# ---------------------------------------------------------------------------
def _bbox_area_km2(ring: list) -> float:
    """Returns approx
    imate bounding box area in km²."""
    lngs = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    mid_lat = (min(lats) + max(lats)) / 2.0
    dx_km = (max(lngs) - min(lngs)) * 111.32 * math.cos(math.radians(mid_lat))
    dy_km = (max(lats) - min(lats)) * 111.32
    return dx_km * dy_km


def is_large_area(geojson_coords: list, threshold_km2: float = 50.0) -> bool:
    """Returns True if the ROI bbox area exceeds threshold_km2."""
    ring = extract_outer_ring(geojson_coords)
    if not ring:
        return False
    return _bbox_area_km2(ring) > threshold_km2


def generate_tiles(geojson_coords: list, tile_size_km: float = TILE_SIZE_KM) -> list:
    """
    Splits the bounding box of geojson_coords into geographic tiles of
    approximately tile_size_km × tile_size_km.

    Returns a list of dicts:
        {
            "ring": [[lng, lat], ...],   # 5-point closed polygon ring
            "min_lng": float,
            "max_lng": float,
            "min_lat": float,
            "max_lat": float,
            "row": int,
            "col": int,
        }
    """
    ring = extract_outer_ring(geojson_coords)
    lngs = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    min_lng, max_lng = min(lngs), max(lngs)
    min_lat, max_lat = min(lats), max(lats)
    mid_lat = (min_lat + max_lat) / 2.0

    # Convert tile_size_km to degrees
    tile_lat_deg = tile_size_km / 111.32
    tile_lng_deg = tile_size_km / (111.32 * math.cos(math.radians(mid_lat)))

    tiles = []
    row = 0
    lat = min_lat
    while lat < max_lat:
        col = 0
        lng = min_lng
        lat_end = min(lat + tile_lat_deg, max_lat)
        while lng < max_lng:
            lng_end = min(lng + tile_lng_deg, max_lng)
            tile_ring = [
                [lng,     lat],
                [lng_end, lat],
                [lng_end, lat_end],
                [lng,     lat_end],
                [lng,     lat],
            ]
            tiles.append({
                "ring": tile_ring,
                "min_lng": lng,
                "max_lng": lng_end,
                "min_lat": lat,
                "max_lat": lat_end,
                "row": row,
                "col": col,
            })
            lng = lng_end
            col += 1
        lat = lat_end
        row += 1

    n_rows = row
    n_cols = max((t["col"] for t in tiles), default=0) + 1

    if len(tiles) > MAX_TILES:
        raise ValueError(
            f"Selected area requires {len(tiles)} tiles which exceeds the safety limit of {MAX_TILES}. "
            f"Please select a smaller region."
        )

    return tiles, n_rows, n_cols


def fetch_tile_as_numpy(tile: dict) -> tuple:
    """
    Fetches a single geographic tile from GEE at the best possible resolution
    and returns it as a (9, H, W) numpy float32 array.

    Returns:
        (img_array, actual_H, actual_W) or raises on failure.
    """
    ring = tile["ring"]
    roi = ee.Geometry.Polygon(ring)

    # Compute scale: aim for TARGET_PX_PER_TILE pixels on longest side
    dx_m = (tile["max_lng"] - tile["min_lng"]) * 111320 * math.cos(
        math.radians((tile["min_lat"] + tile["max_lat"]) / 2.0)
    )
    dy_m = (tile["max_lat"] - tile["min_lat"]) * 111320
    max_dim_m = max(dx_m, dy_m)
    scale = float(max(MIN_SCALE_M, max_dim_m / TARGET_PX_PER_TILE))

    # Build Sentinel-2 composite
    s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
          .filterBounds(roi)
          .filterDate("2025-01-01", "2026-12-31")
          .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
          .median()
          .clip(roi))

    ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')
    ndbi = s2.normalizedDifference(['B11', 'B8']).rename('NDBI')
    ndmi = s2.normalizedDifference(['B8', 'B11']).rename('NDMI')

    img_9band = (s2.select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'])
                   .addBands([ndvi, ndbi, ndmi])
                   .reproject(crs='EPSG:4326', scale=scale))

    pixel_data = img_9band.sampleRectangle(region=roi, defaultValue=0).getInfo()
    channels = [np.array(pixel_data['properties'][b], dtype=np.float32) for b in BAND_NAMES]
    arr = np.stack(channels, axis=0)   # (9, H, W)
    return arr