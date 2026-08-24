from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import ee
import io
from PIL import Image
import numpy as np
from app.core.gemini_analyzer import analyze_pit_material

try:
    ee.Initialize()
except Exception:
    ee.Authenticate()
    ee.Initialize()

router = APIRouter()

class InspectRequest(BaseModel):
    scan_id: str
    pit_id: str
    latitude: float
    longitude: float

@router.post("/inspect")
def inspect_pit(payload: InspectRequest):
    try:
        # 1. Define small buffer bounding box around pit centroid
        point = ee.Geometry.Point([payload.longitude, payload.latitude])
        buffer_roi = point.buffer(250)  # 250 meter radius

        # 2. Fetch Sentinel-2 True Color RGB (B4, B3, B2)
        rgb_img = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                   .filterBounds(buffer_roi)
                   .filterDate("2025-01-01", "2026-12-31")
                   .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10))
                   .median()
                   .select(['B4', 'B3', 'B2'])
                   .reproject(crs='EPSG:4326', scale=10)
                   .unmask(0))

        # Sample RGB pixel values
        pixel_data = rgb_img.sampleRectangle(region=buffer_roi, defaultValue=0).getInfo()
        r = np.array(pixel_data['properties']['B4'])
        g = np.array(pixel_data['properties']['B3'])
        b = np.array(pixel_data['properties']['B2'])

        # Normalize to 0-255 uint8 image
        rgb = np.stack([r, g, b], axis=-1)
        rgb_norm = np.clip((rgb / 3000.0) * 255, 0, 255).astype(np.uint8)

        # Convert to PNG Byte stream
        pil_img = Image.fromarray(rgb_norm)
        img_byte_arr = io.BytesIO()
        pil_img.save(img_byte_arr, format='PNG')
        image_bytes = img_byte_arr.getvalue()

        # 3. Trigger Gemini Multimodal Analysis
        material_analysis = analyze_pit_material(image_bytes, payload.latitude, payload.longitude)

        return {
            "scan_id": payload.scan_id,
            "pit_id": payload.pit_id,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "material_analysis": material_analysis
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inspection failed: {str(e)}")