import math
import ee

# Initialize Earth Engine
try:
    ee.Initialize()
except Exception:
    ee.Authenticate()
    ee.Initialize()

def extract_outer_ring(coords: list) -> list:
    if not coords:
        return []
    curr = coords
    while isinstance(curr, list) and len(curr) > 0 and isinstance(curr[0], list) and isinstance(curr[0][0], list):
        curr = curr[0]
    return curr

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
    scale = float(max(10.0, max_dim_m / 480.0))

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