import io
import base64
import cv2
import numpy as np
from PIL import Image
import matplotlib.cm as cm
import rasterio.features
from shapely.geometry import shape

def heatmap_to_png_overlay(heatmap: np.ndarray, min_thresh: float = 0.15, max_thresh: float = 0.65) -> str:
    """
    Generates smooth continuous mining heatmap overlay matching the Google Colab pipeline.
    Uses cv2.GaussianBlur (15x15 kernel, sigma=2.5), 'hot' colormap, and Smooth Cosine Alpha Ramp.
    """
    H, W = heatmap.shape
    max_val = float(np.max(heatmap))
    
    # 1. OpenCV Gaussian Blur (15x15 kernel, sigma=2.5) matching Colab pipeline
    smoothed_heatmap = cv2.GaussianBlur(heatmap, (15, 15), sigmaX=2.5, sigmaY=2.5)
    heatmap_norm = np.clip(smoothed_heatmap, 0.0, 1.0)

    # 2. Matplotlib 'hot' Colormap
    colormap = cm.get_cmap('hot')
    colored_heatmap = colormap(heatmap_norm)

    # 3. Adaptive Smooth Cosine Alpha Ramp matching Colab pipeline
    eff_min = min(min_thresh, max_val * 0.3) if max_val > 0.05 else min_thresh
    eff_max = max(max_thresh, max_val) if max_val > eff_min else max(0.65, eff_min + 0.1)
    
    raw_alpha = np.clip((smoothed_heatmap - eff_min) / (eff_max - eff_min + 1e-6), 0.0, 1.0)
    smooth_alpha = 0.5 * (1.0 - np.cos(np.pi * raw_alpha)) * 0.75  # 75% max opacity
    colored_heatmap[:, :, 3] = smooth_alpha

    # 4. Convert to RGBA PNG image bytes & Bilinear Resize matching Colab pipeline
    img_bytes = (colored_heatmap * 255).astype(np.uint8)
    
    MAX_DIM = 1600
    scale = min(MAX_DIM / max(1, W), MAX_DIM / max(1, H))
    new_W, new_H = (int(W * scale), int(H * scale)) if scale > 1.0 else (max(512, W * 2), max(512, H * 2))
    
    heatmap_img = Image.fromarray(img_bytes, mode='RGBA').resize((new_W, new_H), resample=Image.Resampling.BILINEAR)

    buffer = io.BytesIO()
    heatmap_img.save(buffer, format='PNG', optimize=True)
    b64_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{b64_str}"



def extract_hotspots_from_heatmap(heatmap: np.ndarray, transform_matrix=None, base_threshold: float = 0.15) -> tuple:
    """
    Extracts high probability pit hotspots and calculates total surface area in km².
    """
    max_val = float(np.max(heatmap))
    threshold = min(base_threshold, max_val * 0.5) if max_val > 0.05 else base_threshold
    
    binary_mask = (heatmap >= threshold).astype(np.uint8)
    mined_pixels = int(np.sum(binary_mask))
    
    if transform_matrix is not None:
        pixel_area_deg2 = abs(transform_matrix.a * transform_matrix.e)
        # 1 deg^2 ~ 12393 km^2 on Earth surface
        total_area_km2 = round(mined_pixels * pixel_area_deg2 * 12393.0, 4)
    else:
        total_area_km2 = round(mined_pixels * 0.0009, 4) # ~30m resolution pixel
        
    hotspots = []
    if np.any(binary_mask):
        shapes_gen = rasterio.features.shapes(binary_mask, mask=binary_mask == 1, transform=transform_matrix)
        for idx, (geom, val) in enumerate(shapes_gen):
            poly = shape(geom)
            centroid = poly.centroid
            
            area_km2 = round(poly.area * 12393.0, 4) if transform_matrix else round(poly.area * 0.0009, 4)
            
            hotspots.append({
                "id": f"pit_{idx + 1}",
                "confidence": round(max_val, 2),
                "centroid": [round(centroid.y, 5), round(centroid.x, 5)],
                "area_km2": max(0.01, area_km2)
            })
            
    # Guarantee at least 1 pit hotspot if any feature/probability exists in ROI
    if not hotspots and max_val > 0.01:
        r, c = np.unravel_index(np.argmax(heatmap), heatmap.shape)
        if transform_matrix is not None:
            lng, lat = transform_matrix * (c + 0.5, r + 0.5)
        else:
            lat, lng = float(r), float(c)
            
        hotspots.append({
            "id": "pit_1",
            "confidence": round(max_val, 2),
            "centroid": [round(lat, 5), round(lng, 5)],
            "area_km2": max(0.01, total_area_km2 or 0.05)
        })
        
    return hotspots, max(0.01, total_area_km2)
