from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from rasterio.transform import from_bounds
from app.core.gee_fetch import fetch_sentinel_9band_roi
from app.core.inference import run_sliding_window_inference
from app.core.vectorizer import analyze_boundary_encroachment

router = APIRouter()

class BoundaryCheckRequest(BaseModel):
    scan_coordinates: List  # Scan ROI [[[lng, lat], ...]]
    boundary_coordinates: List  # Legal Lease Boundary [[[lng, lat], ...]]
    scan_id: Optional[str] = None
    threshold: Optional[float] = 0.35
    min_area_m2: Optional[float] = 250.0

@router.post("/boundary/check")
def check_boundary(payload: BoundaryCheckRequest):
    try:
        # Fetch 9-band Sentinel-2 Imagery & Geometry from GEE
        img_9band_ee, roi_ee = fetch_sentinel_9band_roi(payload.scan_coordinates)
        
        pixel_data = img_9band_ee.sampleRectangle(region=roi_ee, defaultValue=0).getInfo()
        band_names = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12', 'NDVI', 'NDBI', 'NDMI']
        channels = [np.array(pixel_data['properties'][b]) for b in band_names]
        img_9band_array = np.stack(channels, axis=0).astype(np.float32)

        # Run PyTorch Sliding-Window Inference
        heatmap = run_sliding_window_inference(img_9band_array)

        # Setup Transform Matrix
        coords = payload.scan_coordinates[0]
        lngs = [p[0] for p in coords]
        lats = [p[1] for p in coords]
        min_lng, max_lng = min(lngs), max(lngs)
        min_lat, max_lat = min(lats), max(lats)
        
        _, H, W = img_9band_array.shape
        transform_matrix = from_bounds(min_lng, min_lat, max_lng, max_lat, max(1, W), max(1, H))

        # Perform Spatial Encroachment Vector Analysis (Reduced Sensitivity)
        result = analyze_boundary_encroachment(
            heatmap=heatmap,
            transform_matrix=transform_matrix,
            boundary_coords=payload.boundary_coordinates,
            roi_coords=payload.scan_coordinates,
            threshold=payload.threshold,
            min_area_m2=payload.min_area_m2
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Boundary encroachment analysis failed: {str(e)}")
