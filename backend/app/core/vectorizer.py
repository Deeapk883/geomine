import io
import base64
import cv2
import numpy as np
from PIL import Image
import matplotlib.cm as cm
import rasterio.features
from rasterio.features import geometry_mask
from shapely.geometry import shape, Polygon, MultiPolygon, mapping
from pyproj import Geod

geod = Geod(ellps="WGS84")

def extract_outer_ring(coords: list) -> list:
    """
    Safely extracts the 2D outer ring list of [lng, lat] coordinates from GeoJSON coordinate arrays.
    Handles [[[lng, lat], ...]] (GeoJSON Polygon) and [[lng, lat], ...] structures.
    """
    if not coords:
        return []
    curr = coords
    while isinstance(curr, list) and len(curr) > 0 and isinstance(curr[0], list) and isinstance(curr[0][0], list):
        curr = curr[0]
    return curr

def clean_polygon_geometry(geom):
    """
    Ensures valid Polygon/MultiPolygon geometry, dropping point/linestring artifacts from difference operations.
    """
    if geom is None or geom.is_empty:
        return None
    if not geom.is_valid:
        geom = geom.buffer(0)
    if geom.geom_type in ('Polygon', 'MultiPolygon'):
        return geom
    if geom.geom_type == 'GeometryCollection':
        polys = []
        for g in geom.geoms:
            if g.geom_type == 'Polygon' and not g.is_empty:
                polys.append(g)
            elif g.geom_type == 'MultiPolygon' and not g.is_empty:
                polys.extend(g.geoms)
        if not polys:
            return None
        return MultiPolygon(polys) if len(polys) > 1 else polys[0]
    return None

def mask_heatmap_by_roi(heatmap: np.ndarray, transform_matrix, roi_coords: list) -> np.ndarray:
    """
    Masks out bounding box padding pixels outside the user-drawn ROI polygon.
    Ensures model predictions outside the ROI polygon are zeroed out.
    """
    if not roi_coords or transform_matrix is None:
        return heatmap
        
    try:
        outer_ring = extract_outer_ring(roi_coords)
        if len(outer_ring) < 3:
            return heatmap
            
        roi_poly = Polygon(outer_ring)
        if not roi_poly.is_valid:
            roi_poly = roi_poly.buffer(0)

        inside_mask = geometry_mask([roi_poly], out_shape=heatmap.shape, transform=transform_matrix, invert=True)
        return np.where(inside_mask, heatmap, 0.0)
    except Exception as e:
        print(f"ROI masking warning: {e}")
        return heatmap

def heatmap_to_png_overlay(heatmap: np.ndarray, min_thresh: float = 0.15, max_thresh: float = 0.65, transform_matrix=None, roi_coords: list = None) -> str:
    """
    Generates smooth continuous mining heatmap overlay matching the Google Colab pipeline.
    Uses cv2.GaussianBlur (15x15 kernel, sigma=2.5), 'hot' colormap, and Smooth Cosine Alpha Ramp.
    """
    if roi_coords is not None and transform_matrix is not None:
        heatmap = mask_heatmap_by_roi(heatmap, transform_matrix, roi_coords)

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

def extract_hotspots_from_heatmap(heatmap: np.ndarray, transform_matrix=None, roi_coords: list = None, base_threshold: float = 0.15) -> tuple:
    """
    Extracts high probability pit hotspots and calculates total surface area in km².
    """
    if roi_coords is not None and transform_matrix is not None:
        heatmap = mask_heatmap_by_roi(heatmap, transform_matrix, roi_coords)

    smoothed_heatmap = cv2.GaussianBlur(heatmap, (15, 15), sigmaX=2.5, sigmaY=2.5)
    max_val = float(np.max(smoothed_heatmap))
    threshold = min(base_threshold, max_val * 0.5) if max_val > 0.05 else base_threshold
    
    binary_mask = (smoothed_heatmap >= threshold).astype(np.uint8)
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
        r, c = np.unravel_index(np.argmax(smoothed_heatmap), smoothed_heatmap.shape)
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

def analyze_boundary_encroachment(
    heatmap: np.ndarray,
    transform_matrix,
    boundary_coords: list,
    roi_coords: list = None,
    threshold: float = 0.35,
    min_area_m2: float = 250.0
) -> dict:
    """
    Performs spatial vector analysis between CNN prediction heatmap and legal lease boundary polygon.
    Identifies legal vs illegal encroached mining areas strictly within the scanned ROI polygon.
    Reduced sensitivity (threshold=0.35, min_area_m2=250.0) filters out faint/slight noise detections.
    """
    outer_ring = extract_outer_ring(boundary_coords)
    if not outer_ring or len(outer_ring) < 3:
        raise ValueError("Invalid boundary polygon coordinates provided")

    lease_poly = Polygon(outer_ring)
    if not lease_poly.is_valid:
        lease_poly = lease_poly.buffer(0)
    
    try:
        lease_area_m2 = abs(geod.geometry_area_perimeter(lease_poly)[0])
    except Exception:
        lease_area_m2 = abs(lease_poly.area * 12393.0 * 1e6)
    
    lease_area_km2 = round(lease_area_m2 / 1e6, 4)
    lease_area_ha = round(lease_area_m2 / 10000.0, 2)

    # 1. Mask heatmap to ROI polygon (remove bounding-box padding noise outside ROI)
    if roi_coords is not None and transform_matrix is not None:
        heatmap = mask_heatmap_by_roi(heatmap, transform_matrix, roi_coords)

    # 2. Gaussian smoothing matching visual heatmap overlay pipeline
    smoothed_heatmap = cv2.GaussianBlur(heatmap, (15, 15), sigmaX=2.5, sigmaY=2.5)

    # 3. Binary thresholding for mining areas (>= 0.35 probability)
    binary_mask = (smoothed_heatmap >= threshold).astype(np.uint8)
    
    legal_mined_m2 = 0.0
    encroached_m2 = 0.0
    encroached_features = []
    legal_mined_features = []

    if np.any(binary_mask) and transform_matrix is not None:
        shapes_gen = rasterio.features.shapes(binary_mask, mask=binary_mask == 1, transform=transform_matrix)
        for idx, (geom, val) in enumerate(shapes_gen):
            mining_poly = shape(geom)
            if not mining_poly.is_valid:
                mining_poly = mining_poly.buffer(0)

            # Intersection (Legal Mining within Lease Boundary)
            intersection_geom = clean_polygon_geometry(mining_poly.intersection(lease_poly))
            if intersection_geom is not None and not intersection_geom.is_empty:
                try:
                    area_m2 = abs(geod.geometry_area_perimeter(intersection_geom)[0])
                except Exception:
                    area_m2 = abs(intersection_geom.area * 12393.0 * 1e6)
                if area_m2 >= min_area_m2:  # Ignore faint/trivial noise patches below min_area_m2
                    legal_mined_m2 += area_m2
                    legal_mined_features.append(mapping(intersection_geom))

            # Difference (Illegal Encroached Mining outside Lease Boundary)
            difference_geom = clean_polygon_geometry(mining_poly.difference(lease_poly))
            if difference_geom is not None and not difference_geom.is_empty:
                try:
                    area_m2 = abs(geod.geometry_area_perimeter(difference_geom)[0])
                except Exception:
                    area_m2 = abs(difference_geom.area * 12393.0 * 1e6)
                if area_m2 >= min_area_m2:  # Ignore faint/trivial noise patches below min_area_m2
                    encroached_m2 += area_m2
                    encroached_features.append(mapping(difference_geom))

    encroached_km2 = round(encroached_m2 / 1e6, 4)
    encroached_ha = round(encroached_m2 / 10000.0, 2)
    legal_mined_km2 = round(legal_mined_m2 / 1e6, 4)
    legal_mined_ha = round(legal_mined_m2 / 10000.0, 2)

    violation_detected = encroached_m2 >= min_area_m2

    return {
        "status": "success",
        "violation_detected": violation_detected,
        "severity": "CRITICAL" if encroached_ha >= 0.5 else ("WARNING" if violation_detected else "COMPLIANT"),
        "permitted_lease_area": {
            "m2": round(lease_area_m2, 2),
            "ha": lease_area_ha,
            "km2": lease_area_km2
        },
        "legal_mined_area": {
            "m2": round(legal_mined_m2, 2),
            "ha": legal_mined_ha,
            "km2": legal_mined_km2
        },
        "encroached_area": {
            "m2": round(encroached_m2, 2),
            "ha": encroached_ha,
            "km2": encroached_km2
        },
        "encroached_features": encroached_features,
        "legal_mined_features": legal_mined_features
    }


