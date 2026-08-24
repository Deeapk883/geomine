from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.cache import get_cached_scan, save_scan_cache
from app.core.gee_fetch import fetch_sentinel_9band_roi
from app.core.inference import run_sliding_window_inference
from app.core.vectorizer import heatmap_to_png_overlay, extract_hotspots_from_heatmap
import uuid
import numpy as np
from datetime import datetime
from rasterio.transform import from_bounds

router = APIRouter()

class ScanRequest(BaseModel):
    coordinates: list  # [[[lng, lat], [lng, lat], ...]]
    force_rescan: bool = False

@router.post("/scan")
def scan_roi(payload: ScanRequest):
    # 1. Check SQLite Cache
    if not payload.force_rescan:
        cached = get_cached_scan(payload.coordinates)
        if cached and isinstance(cached, dict) and "heatmap_image" in cached and "hotspots" in cached:
            cached["cached"] = True
            return cached

    try:
        # 2. Fetch 9-band Sentinel-2 Imagery & Geometry from GEE
        img_9band_ee, roi_ee = fetch_sentinel_9band_roi(payload.coordinates)
        
        # Extract pixel data into numpy array (Channels, Height, Width)
        pixel_data = img_9band_ee.sampleRectangle(region=roi_ee, defaultValue=0).getInfo()
        
        band_names = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12', 'NDVI', 'NDBI', 'NDMI']
        channels = [np.array(pixel_data['properties'][b]) for b in band_names]
        img_9band_array = np.stack(channels, axis=0).astype(np.float32)

        # 3. Run PyTorch Sliding-Window Inference
        heatmap = run_sliding_window_inference(img_9band_array)

        # 4. Generate Heatmap PNG Overlay & Extract Hotspots
        coords = payload.coordinates[0]
        lngs = [p[0] for p in coords]
        lats = [p[1] for p in coords]
        min_lng, max_lng = min(lngs), max(lngs)
        min_lat, max_lat = min(lats), max(lats)
        
        _, H, W = img_9band_array.shape
        transform_matrix = from_bounds(min_lng, min_lat, max_lng, max_lat, max(1, W), max(1, H))
            
        heatmap_image = heatmap_to_png_overlay(heatmap, transform_matrix=transform_matrix, roi_coords=payload.coordinates)
        hotspots, total_area_km2 = extract_hotspots_from_heatmap(heatmap, transform_matrix=transform_matrix, roi_coords=payload.coordinates)

        # 5. Build Final Response
        scan_id = f"scan_{uuid.uuid4().hex[:8]}"
        response = {
            "status": "success",
            "cached": False,
            "scan_id": scan_id,
            "timestamp": datetime.utcnow().isoformat(),
            "heatmap_image": heatmap_image,
            "bounds": [[min_lat, min_lng], [max_lat, max_lng]],
            "total_pits_found": len(hotspots),
            "total_mined_area_km2": round(total_area_km2, 4),
            "hotspots": hotspots
        }

        save_scan_cache(payload.coordinates, response)
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan execution failed: {str(e)}")
