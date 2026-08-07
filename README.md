# ⛏️ GeoMine - Mining & Land Cover Detection System

GeoMine is an Earth Observation and Machine Learning system for monitoring land cover classes and detecting mining operations using satellite imagery.

## 🛰️ Module 1: Data Extraction

The `data_extraction.js` script runs on **Google Earth Engine (GEE)** to extract spectral band signatures and calculate satellite indices from Sentinel-2 Surface Reflectance imagery (`COPERNICUS/S2_SR_HARMONIZED`).

### 📊 Spectral Features & Indices

- **Bands Extracted**: B2 (Blue), B3 (Green), B4 (Red), B8 (NIR), B11 (SWIR-1), B12 (SWIR-2)
- **NDVI** (Normalized Difference Vegetation Index): `(B8 - B4) / (B8 + B4)`
- **NDBI** (Normalized Difference Built-up Index): `(B11 - B8) / (B11 + B8)`
- **NDMI** (Normalized Difference Moisture Index): `(B8 - B11) / (B8 + B11)`

### 🏷️ Target Classes

| Class ID | Land Cover / Feature | Export CSV File Prefix |
| :--- | :--- | :--- |
| **Class 1** | Mines | `training_mines.csv` |
| **Class 3** | Agriculture | `training_agriculture.csv` |
| **Class 4** | Urban / Built-up | `training_urban.csv` |
| **Class 5** | Bare Rock / Soil | `training_rock.csv` |
| **Class 6** | Water Bodies | `training_water.csv` |
| **Class 7** | Forest / Dense Vegetation | `training_forest.csv` |

### 🚀 Usage

1. Open [Google Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Load your vector region polygon assets (`class1`, `class3`, `class4`, `class5`, `class6`, `class7`).
3. Paste the contents of `data_extraction.js` into the Code Editor.
4. Click **Run**.
5. Execute the export tasks in the **Tasks** tab to export training datasets to Google Drive.
