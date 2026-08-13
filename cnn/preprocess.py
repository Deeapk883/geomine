# ============================================================
# STEP 1: INSTALL DEPENDENCIES & MOUNT DRIVE
# ============================================================

import os
import glob
import numpy as np
import rasterio
import torch
from sklearn.model_selection import train_test_split
from tqdm import tqdm
from google.colab import drive

# Mount Google Drive
drive.mount('/content/drive')

# ============================================================
# STEP 2: CONFIGURATION & HELPER FUNCTIONS
# ============================================================
DRIVE_FOLDER = '/content/drive/MyDrive/CNN_Mining_Patches'
OUTPUT_DIR = '/content/processed_dataset'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Map GEE labels (1,3,4,5,6,7,8) to contiguous CNN targets (0..6)
CLASS_MAP = {
    1: 0,  # Mines
    3: 1,  # Agriculture
    4: 2,  # Urban
    5: 3,  # Rocky / Hilly
    6: 4,  # Water
    7: 5,  # Forest
    8: 6   # River Beds
}

CLASS_NAMES = {
    0: 'Mines',
    1: 'Agriculture',
    2: 'Urban',
    3: 'Rocky/Hilly',
    4: 'Water',
    5: 'Forest',
    6: 'River Beds'
}

CHIP_SIZE = 32
STRIDE = 16
NODATA_VAL = -9999.0

def is_valid_chip(chip_9ch, target_class):
    """
    Evaluates center 16x16 core for -9999 NoData pixels and applies CV filtering.
    """
    # Extract center 16x16 core (rows 8:24, cols 8:24)
    core = chip_9ch[:, 8:24, 8:24]
    
    # 1. NoData / NaN Check
    if np.any(core == NODATA_VAL) or np.any(np.isnan(core)):
        return False

    # 2. Target Class 0 (Mines): No CV Filter
    if target_class == 0:
        return True

    # 3. Coefficient of Variation (CV = std / mean) on NIR channel (Index 3)
    nir_core = core[3, :, :]
    mean_val = np.mean(nir_core)
    std_val = np.std(nir_core)

    if mean_val == 0:
        return False

    cv = std_val / (mean_val + 1e-6)

    # Water Class (4): Require uniform surface (CV < 0.3)
    if target_class == 4:
        return cv < 0.3
    # Other Non-Mine Classes: Require moderate spatial uniformity (CV < 0.8)
    else:
        return cv < 0.8


def pad_and_crop_small(img_9ch):
    """
    Tier 1 & 2: Pads images smaller than 40x40 to at least 48x48 
    and returns a centered 32x32 crop.
    """
    _, h, w = img_9ch.shape
    pad_h = max(0, 48 - h)
    pad_w = max(0, 48 - w)

    pad_top = pad_h // 2
    pad_bottom = pad_h - pad_top
    pad_left = pad_w // 2
    pad_right = pad_w - pad_left

    # Pad with NODATA_VAL
    padded = np.pad(
        img_9ch,
        ((0, 0), (pad_top, pad_bottom), (pad_left, pad_right)),
        mode='constant',
        constant_values=NODATA_VAL
    )

    # Take centered 32x32 crop
    _, ph, pw = padded.shape
    start_h = (ph - CHIP_SIZE) // 2
    start_w = (pw - CHIP_SIZE) // 2

    return padded[:, start_h:start_h + CHIP_SIZE, start_w:start_w + CHIP_SIZE]




    # ============================================================
# STEP 3: MAIN PROCESSING & CHIPPING LOOP (ROBUST / FIXED)
# ============================================================
tif_files = glob.glob(os.path.join(DRIVE_FOLDER, '*.tif'))
print(f"📁 Found {len(tif_files)} GeoTIFF files in {DRIVE_FOLDER}")

X_list = []
y_list = []

for filepath in tqdm(tif_files, desc="Extracting Chips"):
    try:
        filename = os.path.basename(filepath)
        
        # 1. Parse raw class label directly from filename (e.g., label_1_mines_poly_2.tif -> 1)
        # Format guaranteed: 'label_<RAW_LABEL>_<NAME>_poly_<INDEX>.tif'
        raw_label = int(filename.split('_')[1])
        
        if raw_label not in CLASS_MAP:
            continue
            
        target_label = CLASS_MAP[raw_label]

        with rasterio.open(filepath) as src:
            arr = src.read()  # Shape: (10, H, W)
            
            # Extract 9 spectral channels
            img_9ch = arr[:9, :, :].astype(np.float32)
            
            # Convert any NaN values from rasterio reading into explicit NODATA_VAL (-9999.0)
            img_9ch = np.nan_to_num(img_9ch, nan=NODATA_VAL)
            
            _, h, w = img_9ch.shape

            # --- TIER 1 & 2: Small Polygons (<= 40x40) ---
            if h <= 40 or w <= 40:
                chip = pad_and_crop_small(img_9ch)
                if is_valid_chip(chip, target_label):
                    X_list.append(chip)
                    y_list.append(target_label)

            # --- TIER 3: Large Polygons (> 40x40) ---
            else:
                for r in range(0, h - CHIP_SIZE + 1, STRIDE):
                    for c in range(0, w - CHIP_SIZE + 1, STRIDE):
                        chip = img_9ch[:, r:r + CHIP_SIZE, c:c + CHIP_SIZE]
                        if is_valid_chip(chip, target_label):
                            X_list.append(chip)
                            y_list.append(target_label)

    except Exception as e:
        print(f"⚠️ Error reading {os.path.basename(filepath)}: {e}")

X_all = np.array(X_list, dtype=np.float32) # Shape: (N, 9, 32, 32)
y_all = np.array(y_list, dtype=np.int64)   # Shape: (N,)

print(f"\n✓ Successfully extracted {len(X_all)} total clean 32x32 chips across all 402 files!")
print("=" * 50)
for cls_idx, cls_name in CLASS_NAMES.items():
    count = np.sum(y_all == cls_idx)
    print(f"  • Class {cls_idx} ({cls_name:<12}): {count} chips")





