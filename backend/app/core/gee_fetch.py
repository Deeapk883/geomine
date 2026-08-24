import ee
import numpy as np

# Initialize Earth Engine
try:
    ee.Initialize()
except Exception:
    ee.Authenticate()
    ee.Initialize()

def fetch_sentinel_9band_roi(geojson_coords: list):
    """
    Fetches Sentinel-2 imagery for ROI and generates 9-band composite:
    Bands: B2, B3, B4, B8, B11, B12, NDVI, NDBI, NDMI
    """
    roi = ee.Geometry.Polygon(geojson_coords)
    
    # Sentinel-2 SR collection (cloud masked, median composite for 2026)
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
    
    # Combine into 9-channel image and reproject to EPSG:4326 at 10m native Sentinel-2 resolution
    img_9band = s2.select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']).addBands([ndvi, ndbi, ndmi]).reproject(crs='EPSG:4326', scale=10)
    
    return img_9band, roi