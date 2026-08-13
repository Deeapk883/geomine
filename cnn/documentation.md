Here is the complete, production-ready technical documentation for your **Satellite-Based Mining Detection System**. You can save this directly as a `README.md` or `DOCUMENTATION.md` file for future reference.

---

# Satellite-Based Mining Detection System

**Architecture:** 9-Channel EfficientNet-B0 CNN with Sliding-Window Inference

**Data Sources:** Sentinel-2 Surface Reflectance (Harmonized) via Google Earth Engine (GEE)

**Target Performance:** ~94.72% Test Accuracy | ~92.65% Mine Recall

---

## 📋 Table of Contents

1. [System Architecture](https://www.google.com/search?q=%23system-architecture)
2. [Input Data & Band Specification](https://www.google.com/search?q=%23input-data--band-specification)
3. [Prerequisites & Environment Setup](https://www.google.com/search?q=%23prerequisites--environment-setup)
4. [Component 1: GEE Region Selection & Export](https://www.google.com/search?q=%23component-1-gee-region-selection--export)
5. [Component 2: Deep Learning Inference & Heatmap Generation](https://www.google.com/search?q=%23component-2-deep-learning-inference--heatmap-generation)
6. [Component 3: Interactive Leaflet Visualization](https://www.google.com/search?q=%23component-3-interactive-leaflet-visualization)
7. [Troubleshooting & Maintenance](https://www.google.com/search?q=%23troubleshooting--maintenance)

---

## 🏗️ System Architecture

The pipeline consists of three core stages:

1. **Satellite Data Pipeline (GEE):** Extracts, filters, cloud-masks, resamples, and constructs a multi-spectral 9-band composite GeoTIFF from Sentinel-2 SR imagery.
2. **PyTorch Inference Pipeline (Colab/GPU):** Loads a custom 9-channel EfficientNet-B0 model and runs a 50%-overlapping sliding-window classification (32×32 pixel chips / 320m×320m resolution) across the GeoTIFF.
3. **Geospatial Mapping & Analytics:** Converts model outputs into a normalized probability heatmap, exports georeferenced GeoTIFFs, and renders an interactive Leaflet map over Google Satellite imagery.

```
┌───────────────────────────┐
│ Google Earth Engine (GEE) │  --> Fetches Sentinel-2 imagery, computes spectral indices (NDVI, NDBI, NDMI)
└─────────────┬─────────────┘
              │ 9-Band GeoTIFF Export
              ▼
┌───────────────────────────┐
│  PyTorch Sliding Window   │  --> Normalizes via dataset stats (z-score), feeds 32x32 chips to EfficientNet-B0
└─────────────┬─────────────┘
              │ Softmax Probabilities
              ▼
┌───────────────────────────┐
│ Georeferenced Visualizer  │  --> Outputs static Matplotlib plots, GeoTIFF heatmaps, & Folium Leaflet UI
└───────────────────────────┘

```

---

## 📡 Input Data & Band Specification

The model consumes **9 channels** extracted at **10-meter spatial resolution**:

| Index | Band Name | Resolution | Description |
| --- | --- | --- | --- |
| **0** | `B2` | 10m | Blue (490 nm) |
| **1** | `B3` | 10m | Green (560 nm) |
| **2** | `B4` | 10m | Red (665 nm) |
| **3** | `B8` | 10m | Near-Infrared (NIR - 842 nm) |
| **4** | `B11` | 20m $\rightarrow$ 10m | Short-Wave Infrared 1 (SWIR1 - 1610 nm) |
| **5** | `B12` | 20m $\rightarrow$ 10m | Short-Wave Infrared 2 (SWIR2 - 2190 nm) |
| **6** | `NDVI` | Calculated | Normalized Difference Vegetation Index: $\frac{\text{B8} - \text{B4}}{\text{B8} + \text{B4}}$ |
| **7** | `NDBI` | Calculated | Normalized Difference Built-Up Index: $\frac{\text{B11} - \text{B8}}{\text{B11} + \text{B8}}$ |
| **8** | `NDMI` | Calculated | Normalized Difference Moisture Index: $\frac{\text{B8} - \text{B11}}{\text{B8} + \text{B11}}$ |

---

## 🛠️ Prerequisites & Environment Setup

### Required Python Libraries

```bash
pip install rasterio torch torchvision numpy matplotlib folium pillow tqdm

```

### File Hierarchy Setup

```text
/content/drive/MyDrive/
├── CNN_Mining_Inference/
│   └── ROI_Inference_Target.tif        # Exported from GEE
└── CNN_Processed_Dataset/
    ├── best_efficientnet_b0.pth        # Trained PyTorch Model Weights
    └── norm_stats.pt                   # Mean & Std Tensors for Normalization

```

---

## 🌐 Component 1: GEE Region Selection & Export

Run this JavaScript code in the **Google Earth Engine Code Editor**. Draw a box/polygon over your region of interest and name the geometry variable **`roi`** (it will save as `var roi: Polygon`).

```javascript
// ============================================================
// STEP 1: GOOGLE EARTH ENGINE DATA EXPORT
// ============================================================

// 1. Set Date Range
var startDate = '2026-01-01';
var endDate   = '2026-08-14'; 

// 2. Scene Classification Layer (SCL) Cloud Masking Function
var maskCloudShadowStrict = function(image) {
  var scl = image.select('SCL');
  var validMask = scl.neq(0)   // No Data
    .and(scl.neq(1))           // Saturated/Defective
    .and(scl.neq(2))           // Dark Area Pixels
    .and(scl.neq(3))           // Cloud Shadows
    .and(scl.neq(8))           // Cloud Medium Probability
    .and(scl.neq(9))           // Cloud High Probability
    .and(scl.neq(10))          // Thin Cirrus
    .and(scl.neq(11));         // Snow
  return image.updateMask(validMask);
};

// 3. Filter Sentinel-2 Collection
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(roi)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .map(maskCloudShadowStrict);

print('✓ Available Sentinel-2 Scenes:', s2.size());

// 4. Create Median Composite & Align Resolution
var composite = s2.median();

var bands_10m = composite.select(['B2', 'B3', 'B4', 'B8']);
var bands_20m = composite.select(['B11', 'B12']).resample('bilinear');
var compositeAligned = bands_10m.addBands(bands_20m);

// 5. Compute Spectral Indices
var ndvi = compositeAligned.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndbi = compositeAligned.normalizedDifference(['B11', 'B8']).rename('NDBI');
var ndmi = compositeAligned.normalizedDifference(['B8', 'B11']).rename('NDMI');

// 6. Stack 9 Bands & Set NoData Mask
var image_9band = ee.Image([
  compositeAligned.select('B2'),
  compositeAligned.select('B3'),
  compositeAligned.select('B4'),
  compositeAligned.select('B8'),
  compositeAligned.select('B11'),
  compositeAligned.select('B12'),
  ndvi,
  ndbi,
  ndmi
]).toFloat().clip(roi).unmask(-9999);

// Preview RGB on Map
Map.centerObject(roi, 13);
Map.addLayer(image_9band.select(['B4', 'B3', 'B2']), {min: 0, max: 3000}, '2026 Sentinel-2 RGB');

// 7. Export GeoTIFF to Google Drive
Export.image.toDrive({
  image: image_9band,
  description: 'ROI_Inference_Target',
  fileNamePrefix: 'ROI_Inference_Target',
  folder: 'CNN_Mining_Inference',
  region: roi,
  scale: 10,
  crs: 'EPSG:4326',
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

print('👉 Task generated. Go to Tasks tab and click RUN.');

```

---

## 🐍 Component 2: Deep Learning Inference & Heatmap Generation

This script executes in **Google Colab**. It restores the 9-channel EfficientNet architecture, loads weights, performs sliding-window predictions, saves a georeferenced output GeoTIFF, and visualizes static plots.

```python
# ============================================================
# STEP 2: SLIDING-WINDOW INFERENCE & STATIC PLOTTING
# ============================================================
import os
import rasterio
import numpy as np
import torch
import torch.nn as nn
import torchvision.models as models
import matplotlib.pyplot as plt
from tqdm import tqdm

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# 1. Define File Paths
TIF_PATH = '/content/drive/MyDrive/CNN_Mining_Inference/ROI_Inference_Target.tif'
MODEL_PATH = '/content/drive/MyDrive/CNN_Processed_Dataset/best_efficientnet_b0.pth'
STATS_PATH = '/content/drive/MyDrive/CNN_Processed_Dataset/norm_stats.pt'

# 2. Re-construct Custom 9-Channel EfficientNet-B0 Architecture
def build_model():
    model = models.efficientnet_b0(weights=None)
    
    # Modify first Conv layer to accept 9 channels
    old_conv = model.features[0][0]
    new_conv = nn.Conv2d(
        in_channels=9, 
        out_channels=old_conv.out_channels,
        kernel_size=old_conv.kernel_size, 
        stride=old_conv.stride,
        padding=old_conv.padding, 
        bias=False
    )
    model.features[0][0] = new_conv
    
    # Modify classifier for 7 output classes
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 7)
    return model

# 3. Load Model Weights & Normalization Parameters
model = build_model().to(device)
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.eval()

norm_stats = torch.load(STATS_PATH)
mean = norm_stats['mean'].numpy().reshape(9, 1, 1)
std  = norm_stats['std'].numpy().reshape(9, 1, 1)

print("✓ Model and Normalization Statistics loaded successfully!")

# 4. Load Target GeoTIFF
with rasterio.open(TIF_PATH) as src:
    img_9ch = src.read()  # Shape: (9, H, W)
    img_9ch = np.nan_to_num(img_9ch, nan=-9999.0)
    profile = src.profile

_, H, W = img_9ch.shape
print(f"🗺️ Raster Dimensions: Height={H}px, Width={W}px ({H*10}m x {W*10}m)")

# 5. Initialize Accumulator Grids
mine_prob_map = np.zeros((H, W), dtype=np.float32)
counts_map    = np.zeros((H, W), dtype=np.float32)

CHIP_SIZE = 32
STRIDE = 16  # 50% Overlap for smooth edge transitions

# 6. Extract Patches via Sliding Window
patches = []
coords = []

for r in range(0, H - CHIP_SIZE + 1, STRIDE):
    for c in range(0, W - CHIP_SIZE + 1, STRIDE):
        chip = img_9ch[:, r:r+CHIP_SIZE, c:c+CHIP_SIZE]
        
        # Skip patch if central core contains NoData pixels (-9999)
        if np.any(chip[:, 8:24, 8:24] == -9999.0):
            continue
            
        # Z-score Normalization
        chip_norm = (chip - mean) / (std + 1e-6)
        patches.append(chip_norm)
        coords.append((r, c))

# 7. Batch Inference
BATCH_SIZE = 64
X_test = torch.tensor(np.array(patches), dtype=torch.float32)

with torch.no_grad():
    for i in tqdm(range(0, len(X_test), BATCH_SIZE), desc="Inference Progress"):
        batch_x = X_test[i:i+BATCH_SIZE].to(device)
        outputs = model(batch_x)
        probs = torch.softmax(outputs, dim=1)
        
        # Extract Probability for Class 0 (Mines)
        mine_probs = probs[:, 0].cpu().numpy()
        
        for idx, (r, c) in enumerate(coords[i:i+BATCH_SIZE]):
            mine_prob_map[r:r+CHIP_SIZE, c:c+CHIP_SIZE] += mine_probs[idx]
            counts_map[r:r+CHIP_SIZE, c:c+CHIP_SIZE] += 1.0

# Normalize Overlapping Regions
counts_map[counts_map == 0] = 1.0
mine_heatmap = mine_prob_map / counts_map

# 8. Export Georeferenced Heatmap GeoTIFF
profile.update(dtype=rasterio.float32, count=1, nodata=0)
heatmap_export_path = '/content/mining_detection_heatmap.tif'

with rasterio.open(heatmap_export_path, 'w', **profile) as dst:
    dst.write(mine_heatmap.astype(rasterio.float32), 1)

print(f"✓ Georeferenced Heatmap saved to: {heatmap_export_path}")

# 9. Plot Static 3-Panel Figure
rgb = img_9ch[[2, 1, 0], :, :].transpose(1, 2, 0)
rgb_min, rgb_max = np.percentile(rgb[rgb > 0], (2, 98))
rgb_scaled = np.clip((rgb - rgb_min) / (rgb_max - rgb_min + 1e-6), 0, 1)

binary_mask = (mine_heatmap > 0.5).astype(np.float32)

fig, axes = plt.subplots(1, 3, figsize=(20, 7))

axes[0].imshow(rgb_scaled)
axes[0].set_title('Sentinel-2 Natural RGB (2026)', fontsize=13)
axes[0].axis('off')

axes[1].imshow(rgb_scaled)
im1 = axes[1].imshow(mine_heatmap, cmap='hot', alpha=0.6, vmin=0.0, vmax=1.0)
axes[1].set_title('Mining Probability Heatmap', fontsize=13)
axes[1].axis('off')
fig.colorbar(im1, ax=axes[1], fraction=0.046, pad=0.04, label='Probability')

axes[2].imshow(rgb_scaled)
axes[2].imshow(np.ma.masked_where(binary_mask == 0, binary_mask), cmap='Reds', alpha=0.7)
axes[2].set_title('Detected Mining Locations (>50% Conf.)', fontsize=13)
axes[2].axis('off')

plt.tight_layout()
plt.savefig('/content/mining_detection_results.png', dpi=300)
plt.show()

```

---

## 🗺️ Component 3: Interactive Leaflet Visualization

Run this script in Colab to build an interactive, zoomable map rendered on top of high-resolution **Google Satellite** and **Google Hybrid** basemaps.

```python
# ============================================================
# STEP 3: INTERACTIVE LEAFLET MAP (FOLIUM)
# ============================================================
import folium
import rasterio
from rasterio.warp import transform_bounds
from PIL import Image
import matplotlib.cm as cm

# 1. Transform Bounding Box to WGS84 Lat/Lon Coordinates
with rasterio.open(TIF_PATH) as src:
    bounds = src.bounds
    crs = src.crs
    left, bottom, right, top = transform_bounds(crs, 'EPSG:4326', *bounds)
    center_lat = (bottom + top) / 2
    center_lon = (left + right) / 2

# 2. Instantiate Folium Map
m = folium.Map(location=[center_lat, center_lon], zoom_start=13, max_zoom=20)

# Add Google Satellite Basemap
folium.TileLayer(
    tiles='https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attr='Google',
    name='Google Satellite',
    overlay=False,
    control=True
).add_to(m)

# Add Google Hybrid Basemap (Satellite + Labels)
folium.TileLayer(
    tiles='https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attr='Google',
    name='Google Hybrid',
    overlay=False,
    control=True
).add_to(m)

# 3. Create Colorized Overlay PNG
heatmap_norm = np.clip(mine_heatmap, 0, 1)
colormap = cm.get_cmap('hot')
colored_heatmap = colormap(heatmap_norm) # Outputs RGBA array

# Apply alpha transparency threshold
colored_heatmap[mine_heatmap < 0.25, 3] = 0.0   # Fully transparent for low risk
colored_heatmap[mine_heatmap >= 0.25, 3] = 0.65  # 65% visible for detected zones

img_overlay = (colored_heatmap * 255).astype(np.uint8)
png_path = '/content/overlay_heatmap.png'
Image.fromarray(img_overlay).save(png_path)

# 4. Attach Heatmap Overlay to Map
folium.raster_layers.ImageOverlay(
    image=png_path,
    bounds=[[bottom, left], [top, right]],
    opacity=0.8,
    name='Mining Detection Heatmap'
).add_to(m)

# 5. Enable Layer Control Toggle
folium.LayerControl().add_to(m)

# Display Map in Colab Output Cell
m

```

---

## ⚙️ Troubleshooting & Maintenance

| Issue / Error | Root Cause | Solution |
| --- | --- | --- |
| `ValueError: 'reds' is not a valid value for cmap` | Matplotlib colormap names are case-sensitive. | Change `'reds'` to `'Reds'` (capitalized). |
| `KeyError: 'SCL'` in GEE | Selected scene is L1C (Top of Atmosphere) instead of L2A (Surface Reflectance). | Ensure collection is `COPERNICUS/S2_SR_HARMONIZED`. |
| Black or Blank Heatmap | Image normalisation mismatch or NoData handling issue. | Check `norm_stats.pt` channel order matching: `[B2, B3, B4, B8, B11, B12, NDVI, NDBI, NDMI]`. |
| Map Out of Bounds / Misaligned Overlay | CRS coordinate mismatch between raster and Folium. | Use `rasterio.warp.transform_bounds(src.crs, 'EPSG:4326', *bounds)`. |