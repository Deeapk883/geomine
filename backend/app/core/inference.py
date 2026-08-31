import torch
import torchvision.models as models
import torch.nn as nn
import numpy as np
import os
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.config import settings

class EfficientNet9Band(nn.Module):
    def __init__(self, num_classes=7):
        super().__init__()
        self.model = models.efficientnet_b0(weights=None)
        orig_conv = self.model.features[0][0]
        self.model.features[0][0] = nn.Conv2d(
            in_channels=9,
            out_channels=orig_conv.out_channels,
            kernel_size=orig_conv.kernel_size,
            stride=orig_conv.stride,
            padding=orig_conv.padding,
            bias=False
        )
        self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, num_classes)

    def forward(self, x):
        return self.model(x)

def load_inference_model():
    model = EfficientNet9Band()
    if os.path.exists(settings.MODEL_WEIGHTS_PATH):
        checkpoint = torch.load(settings.MODEL_WEIGHTS_PATH, map_location=torch.device('cpu'))
        if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
            checkpoint = checkpoint["state_dict"]

        model_keys = set(model.state_dict().keys())
        new_state = {}
        for k, v in checkpoint.items():
            if k in model_keys:
                new_state[k] = v
            elif f"model.{k}" in model_keys:
                new_state[f"model.{k}"] = v
            elif k.startswith("model.") and k[6:] in model_keys:
                new_state[k[6:]] = v
            else:
                new_state[k] = v
        model.load_state_dict(new_state)
    model.eval()
    
    norm_stats = None
    if os.path.exists(settings.NORM_STATS_PATH):
        norm_stats = torch.load(settings.NORM_STATS_PATH, map_location=torch.device('cpu'))
        
    return model, norm_stats

def run_sliding_window_inference(img_9band: np.ndarray) -> np.ndarray:
    """
    Performs sliding-window inference over a 9-band numpy image array of shape (9, H, W).
    Returns a 2D probability heatmap of shape (H, W).
    """
    model, norm_stats = load_inference_model()
    
    C, H, W = img_9band.shape
    patch_size = settings.PATCH_SIZE
    stride = settings.STRIDE
    
    heatmap = np.zeros((H, W), dtype=np.float32)
    count_map = np.zeros((H, W), dtype=np.float32)
    
    img_tensor = torch.from_numpy(img_9band).float()
    
    # Normalize channels
    if norm_stats is not None and "mean" in norm_stats and "std" in norm_stats:
        mean = norm_stats["mean"].view(9, 1, 1)
        std = norm_stats["std"].view(9, 1, 1)
        img_tensor = (img_tensor - mean) / (std + 1e-6)
    else:
        for c in range(C):
            c_std = img_tensor[c].std()
            if c_std > 0:
                img_tensor[c] = (img_tensor[c] - img_tensor[c].mean()) / c_std

    model.eval()
    patches = []
    coords = []
    
    for y in range(0, max(1, H - patch_size + 1), stride):
        for x in range(0, max(1, W - patch_size + 1), stride):
            y_end = min(y + patch_size, H)
            x_end = min(x + patch_size, W)
            
            patch = img_tensor[:, y:y_end, x:x_end]
            if patch.shape[1] < patch_size or patch.shape[2] < patch_size:
                padded = torch.zeros((9, patch_size, patch_size), dtype=torch.float32)
                padded[:, :patch.shape[1], :patch.shape[2]] = patch
                patch = padded
                
            patches.append(patch)
            coords.append((y, y_end, x, x_end))
            
    if patches:
        batch_size = 128
        with torch.no_grad():
            for i in range(0, len(patches), batch_size):
                batch_patches = torch.stack(patches[i:i + batch_size])
                logits = model(batch_patches)
                probs = torch.softmax(logits, dim=1)
                mine_probs = probs[:, 0].cpu().numpy()
                
                for idx, prob in enumerate(mine_probs):
                    y, y_end, x, x_end = coords[i + idx]
                    heatmap[y:y_end, x:x_end] += float(prob)
                    count_map[y:y_end, x:x_end] += 1.0

    count_map[count_map == 0] = 1.0
    heatmap = heatmap / count_map
    return heatmap


# ---------------------------------------------------------------------------
# Tiled inference
# ---------------------------------------------------------------------------

def _infer_one_tile(tile_meta: dict, model, norm_stats) -> dict:
    """
    Worker function: fetches one tile from GEE, runs sliding-window inference,
    and returns the heatmap + tile metadata.
    Imported lazily to avoid circular imports.
    """
    from app.core.gee_fetch import fetch_tile_as_numpy

    try:
        arr = fetch_tile_as_numpy(tile_meta)          # (9, H, W)
        heatmap = _run_inference_with_model(arr, model, norm_stats)
        return {
            "ok": True,
            "heatmap": heatmap,
            "shape": heatmap.shape,
            "tile": tile_meta,
        }
    except Exception as e:
        print(f"[Tile ({tile_meta['row']},{tile_meta['col']})] ERROR: {e}")
        return {
            "ok": False,
            "heatmap": None,
            "shape": None,
            "tile": tile_meta,
        }


def _run_inference_with_model(img_9band: np.ndarray, model, norm_stats) -> np.ndarray:
    """
    Same as run_sliding_window_inference but accepts a pre-loaded model
    so we don't reload weights for every tile.
    """
    C, H, W = img_9band.shape
    patch_size = settings.PATCH_SIZE
    stride = settings.STRIDE

    heatmap = np.zeros((H, W), dtype=np.float32)
    count_map = np.zeros((H, W), dtype=np.float32)

    img_tensor = torch.from_numpy(img_9band).float()

    if norm_stats is not None and "mean" in norm_stats and "std" in norm_stats:
        mean = norm_stats["mean"].view(9, 1, 1)
        std = norm_stats["std"].view(9, 1, 1)
        img_tensor = (img_tensor - mean) / (std + 1e-6)
    else:
        for c in range(C):
            c_std = img_tensor[c].std()
            if c_std > 0:
                img_tensor[c] = (img_tensor[c] - img_tensor[c].mean()) / c_std

    patches = []
    coords = []

    for y in range(0, max(1, H - patch_size + 1), stride):
        for x in range(0, max(1, W - patch_size + 1), stride):
            y_end = min(y + patch_size, H)
            x_end = min(x + patch_size, W)
            patch = img_tensor[:, y:y_end, x:x_end]
            if patch.shape[1] < patch_size or patch.shape[2] < patch_size:
                padded = torch.zeros((9, patch_size, patch_size), dtype=torch.float32)
                padded[:, :patch.shape[1], :patch.shape[2]] = patch
                patch = padded
            patches.append(patch)
            coords.append((y, y_end, x, x_end))

    if patches:
        with torch.no_grad():
            for i in range(0, len(patches), 128):
                batch = torch.stack(patches[i:i + 128])
                logits = model(batch)
                probs = torch.softmax(logits, dim=1)
                mine_probs = probs[:, 0].cpu().numpy()
                for idx, prob in enumerate(mine_probs):
                    y, y_end, x, x_end = coords[i + idx]
                    heatmap[y:y_end, x:x_end] += float(prob)
                    count_map[y:y_end, x:x_end] += 1.0

    count_map[count_map == 0] = 1.0
    return heatmap / count_map


def run_tiled_inference(geojson_coords: list, max_workers: int = 4) -> tuple:
    """
    Splits the ROI into geographic tiles, fetches each at full resolution,
    runs sliding-window inference on each tile, and stitches results into
    a single full-resolution heatmap.

    Returns:
        (heatmap: np.ndarray shape (H_total, W_total),
         total_H: int,
         total_W: int,
         tile_grid_shape: (n_rows, n_cols))
    """
    from app.core.gee_fetch import generate_tiles

    tiles, n_rows, n_cols = generate_tiles(geojson_coords)
    total_tiles = len(tiles)
    print(f"[TiledInference] {total_tiles} tiles ({n_rows}r × {n_cols}c), workers={max_workers}")

    # Load model once — shared across all workers (read-only eval mode, safe)
    model, norm_stats = load_inference_model()

    # Run tiles in parallel thread pool (GEE calls are I/O-bound)
    results = [None] * total_tiles
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_idx = {
            executor.submit(_infer_one_tile, tiles[i], model, norm_stats): i
            for i in range(total_tiles)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            results[idx] = future.result()

    # -----------------------------------------------------------------------
    # Stitch tiles into one heatmap
    # Build per-row lists of heatmaps, then vstack rows
    # -----------------------------------------------------------------------
    # First pass: collect tile heatmaps into a 2D grid
    grid = [[None] * n_cols for _ in range(n_rows)]
    for res in results:
        tile = res["tile"]
        r, c = tile["row"], tile["col"]
        if res["ok"] and res["heatmap"] is not None:
            grid[r][c] = res["heatmap"]
        else:
            # Fallback: zero tile — will be visible as no-signal region
            grid[r][c] = None

    # Second pass: determine canonical tile pixel sizes per row and column
    # (tiles may differ slightly at boundaries)
    row_heights = []
    col_widths = []

    for r in range(n_rows):
        h = 0
        for c in range(n_cols):
            if grid[r][c] is not None:
                h = max(h, grid[r][c].shape[0])
        row_heights.append(max(1, h))

    for c in range(n_cols):
        w = 0
        for r in range(n_rows):
            if grid[r][c] is not None:
                w = max(w, grid[r][c].shape[1])
        col_widths.append(max(1, w))

    total_H = sum(row_heights)
    total_W = sum(col_widths)

    # Third pass: assemble into big canvas
    full_heatmap = np.zeros((total_H, total_W), dtype=np.float32)

    y_offset = 0
    for r in range(n_rows):
        x_offset = 0
        for c in range(n_cols):
            th = row_heights[r]
            tw = col_widths[c]
            tile_hm = grid[r][c]
            if tile_hm is not None:
                # Crop or pad to canonical size (handles rounding at edges)
                tile_h, tile_w = tile_hm.shape
                copy_h = min(th, tile_h)
                copy_w = min(tw, tile_w)
                full_heatmap[y_offset:y_offset + copy_h,
                             x_offset:x_offset + copy_w] = tile_hm[:copy_h, :copy_w]
            x_offset += tw
        y_offset += th

    print(f"[TiledInference] Stitched heatmap shape: {full_heatmap.shape}")
    return full_heatmap, total_H, total_W, (n_rows, n_cols)