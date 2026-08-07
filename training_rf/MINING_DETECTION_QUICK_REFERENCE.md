# MINING DETECTION - QUICK REFERENCE & EXECUTION GUIDE

## QUICK FACTS

| Item | Value |
|------|-------|
| **Best Model** | XGBoost |
| **Mines Recall** | 93% (catches 93% of real mines) |
| **Mines Precision** | 81% (81% predicted are actually mines) |
| **Mines F1-Score** | 0.87 |
| **Overall Accuracy** | 84.88% (spatial validation) |
| **Feature Count** | 9 (6 bands + 3 indices) |
| **Training Samples** | 142,464 pixels from 155 drawn polygons |
| **Spatial Split** | 70% train (108 polygons) / 30% test (47 polygons) |
| **Stage Status** | Stage 1 COMPLETE, Stage 2 PENDING |

---

## CLASSES & MAPPING

### Original Labels (From GEE)
```
1 = mines
3 = agriculture
4 = urban
5 = rock
6 = water
7 = forest
```

### Encoded Labels (0-5) After Training
```
0 = agriculture (from original 3)
1 = forest (from original 7)
2 = mines (from original 1)
3 = rock (from original 5)
4 = urban (from original 4)
5 = water (from original 6)
```

**For output:** Decode back using `label_encoder.pkl`

---

## FEATURES (IN THIS EXACT ORDER)

```
['B11', 'B12', 'B2', 'B3', 'B4', 'B8', 'NDBI', 'NDMI', 'NDVI']
```

**Definitions:**
- B2 = Blue (490 nm)
- B3 = Green (560 nm)
- B4 = Red (665 nm)
- B8 = NIR/Near-Infrared (842 nm)
- B11 = SWIR1 (1610 nm)
- B12 = SWIR2 (2190 nm)
- NDVI = Normalized Difference Vegetation Index = (B8 - B4) / (B8 + B4)
- NDBI = Normalized Difference Built-up Index = (B11 - B8) / (B11 + B8)
- NDMI = Normalized Difference Moisture Index = (B8 - B11) / (B8 + B11)

---

## DEPLOYMENT CODE SKELETON

### 1. Load Models & Preprocessors
```python
import joblib
import xgboost as xgb
import pickle
import numpy as np

# Load trained artifacts
xgb_model = xgb.XGBClassifier()
xgb_model.load_model('xgb_model.json')

scaler = joblib.load('scaler.pkl')
label_encoder = joblib.load('label_encoder.pkl')

with open('feature_names.pkl', 'rb') as f:
    feature_names = pickle.load(f)
```

### 2. Prepare New Data from Sentinel-2
```python
# Assume you have 'image' with bands B2, B3, B4, B8, B11, B12
# Extract features in correct order
sentinel_bands = image[['B11', 'B12', 'B2', 'B3', 'B4', 'B8']]  # 6 bands

# Calculate indices
ndvi = (image['B8'] - image['B4']) / (image['B8'] + image['B4'] + 1e-8)
ndbi = (image['B11'] - image['B8']) / (image['B11'] + image['B8'] + 1e-8)
ndmi = (image['B8'] - image['B11']) / (image['B8'] + image['B11'] + 1e-8)

# Stack all features in correct order
X = np.column_stack([
    image['B11'], image['B12'], image['B2'], image['B3'], 
    image['B4'], image['B8'], ndbi, ndmi, ndvi
])
# X shape: (n_pixels, 9)
```

### 3. Normalize (CRITICAL!)
```python
X_scaled = scaler.transform(X)
# Uses mean & std from training data
```

### 4. Get Predictions
```python
# Get class predictions
y_pred = xgb_model.predict(X_scaled)  # Shape: (n_pixels,)

# Get probabilities
y_proba = xgb_model.predict_proba(X_scaled)  # Shape: (n_pixels, 6)

# Decode predictions back to original class labels
y_decoded = label_encoder.inverse_transform(y_pred)
```

### 5. Extract Mining Areas
```python
# Get mining probability (class 2 in encoded labels)
mining_proba = y_proba[:, 2]

# Apply threshold (aggressive for Stage 1)
mining_mask = mining_proba > 0.3  # >30% confidence

# Connected component analysis to find clusters
from scipy import ndimage
labeled_array, num_features = ndimage.label(mining_mask)

# Extract bounding boxes
mining_regions = []
for i in range(1, num_features + 1):
    coords = np.where(labeled_array == i)
    if len(coords[0]) > 100:  # Minimum size threshold
        y_min, y_max = coords[0].min(), coords[0].max()
        x_min, x_max = coords[1].min(), coords[1].max()
        
        mining_regions.append({
            'region_id': i,
            'pixel_coords': (y_min, y_max, x_min, x_max),
            'size_pixels': len(coords[0]),
            'avg_confidence': mining_proba[labeled_array == i].mean()
        })
```

### 6. Output Results
```python
# Create mining map (same size as input image)
mining_map = np.zeros(image.shape[:2])
for region in mining_regions:
    y_min, y_max, x_min, x_max = region['pixel_coords']
    mining_map[y_min:y_max, x_min:x_max] = region['avg_confidence']

# Convert pixels to geographic coordinates
# (depends on how you loaded the image)
```

---

## PERFORMANCE BY CLASS (Reference)

```
Class         Recall  Precision  F1     Notes
Mines         93%     81%        0.87   ⭐ BEST - High recall catches most mines
Water         93%     99%        0.96   ⭐ Nearly perfect
Rock          80%     84%        0.82   ✓ Good
Forest        78%     94%        0.85   ✓ Misses some but high precision
Agriculture   78%     74%        0.76   ~ Acceptable, not critical
Urban         79%     66%        0.72   ~ Some confusion with rock
```

---

## EXPECTED WORKFLOW (Weekly Monitoring)

### Week 1
```
1. Download Sentinel-2 for 200×200 km region
2. Extract 9 features
3. Normalize with scaler
4. Run XGBoost → get mining probability map
5. Extract bounding boxes → List of 50-100 candidate areas
6. Save mining map as baseline
```

### Week 2 (7 days later)
```
1. Download new Sentinel-2
2. Repeat steps 2-5
3. Compare to Week 1 map:
   - New areas = new mining detected → Alert
   - Expanded areas = existing mining growing → Alert
   - Reduced areas = reclamation → Track
4. Update baseline
```

---

## IMPORTANT WARNINGS

### ⚠️ DO NOT
- ❌ Use random train-test split for validation (use spatial split)
- ❌ Skip the scaler (will break model predictions)
- ❌ Change feature order
- ❌ Use different pixel resolution without retraining
- ❌ Apply model to very different geographic region without testing

### ✅ DO
- ✓ Always normalize new data with training scaler
- ✓ Keep features in order: B11, B12, B2, B3, B4, B8, NDBI, NDMI, NDVI
- ✓ Apply mining probability threshold ~0.3 (aggressive for Stage 1)
- ✓ Use connected components to extract region bounding boxes
- ✓ Validate on test region with known mining locations first

---

## THRESHOLD TUNING

**Current Setting:** mining_proba > 0.3 (aggressive)

| Threshold | Effect | Use Case |
|-----------|--------|----------|
| 0.2 | Very aggressive, catch almost all mines but many false positives | Initial screening |
| 0.3 | Current setting, good balance | Production monitoring |
| 0.4 | Conservative, fewer false positives but miss some mines | High-precision only |
| 0.5 | Very conservative, high precision but miss real mines | Not recommended |

**For Stage 1:** Use 0.2-0.3 (let Stage 2 CNN filter)

---

## CHANGE DETECTION ALGORITHM

```python
# Week 1 mining map
mining_map_w1 = extract_mining_map(image_w1)

# Week 2 mining map
mining_map_w2 = extract_mining_map(image_w2)

# Find changes
new_mining = mining_map_w2 - mining_map_w1
new_mining[new_mining < 0.2] = 0  # Only significant increases

# Alert if significant new mining detected
new_area_pixels = (new_mining > 0.3).sum()
if new_area_pixels > 100:  # >100 pixels = ~10 hectares at 10m resolution
    print(f"ALERT: New mining detected in {new_area_pixels} pixels")
```

---

## WHAT TO DO NEXT

### Option A: Deploy Stage 1 on Test Region (RECOMMENDED - Start Here)
```
Status: ✅ READY
Time: 1-2 hours
Steps:
1. Select 50×50 km region with known mining
2. Download Sentinel-2 imagery
3. Apply XGBoost model
4. Validate results
5. If good, expand to 200×200 km
```

### Option B: Implement Change Detection (Medium)
```
Status: ✅ READY
Time: 2-3 hours
Steps:
1. Extract mining map from Week 1 Sentinel-2
2. Extract mining map from Week 2 Sentinel-2
3. Compare maps
4. Implement alerts
5. Schedule weekly monitoring
```

### Option C: Train CNN for Stage 2 (Complex, Future)
```
Status: ⏳ PLANNED
Time: 1-2 weeks
Steps:
1. Collect 200-400 labeled mining patches
2. Collect 200-400 labeled non-mining patches
3. Fine-tune pretrained model (EuroSAT/ResNet50)
4. Integrate with Stage 1
5. Achieve 90%+ final precision
```

---

## TROUBLESHOOTING

### Problem: Model predictions all same class
**Solution:** Check if you normalized with scaler

### Problem: Feature order mismatch error
**Solution:** Ensure features are in order: B11, B12, B2, B3, B4, B8, NDBI, NDMI, NDVI

### Problem: Scaler says wrong number of features
**Solution:** Model expects exactly 9 features - check you have all bands and indices

### Problem: Accuracy drops when applied to different region
**Solution:** EXPECTED! Spatial split validates generalization. Test on known mining areas to verify

### Problem: Too many false positives
**Solution:** Increase threshold from 0.3 to 0.4, or implement Stage 2 CNN

### Problem: Missing real mines
**Solution:** Lower threshold to 0.2, or train CNN to improve detection

---

## CONTACT INFORMATION FOR CONTINUATION

**In next chat, mention:**

"I'm continuing the mining detection project:
- Completed Stage 1 with XGBoost model
- Achieved 93% mines recall, 81% precision, 0.87 F1-score
- Used spatial validation (85% accuracy, not 97% overfitting)
- Trained on 142k samples from 155 polygons
- 9 features: 6 bands + 3 indices (B11, B12, B2, B3, B4, B8, NDBI, NDMI, NDVI)
- Ready to deploy on 200×200 km region OR train CNN Stage 2"

**Files saved to:** `/content/drive/My Drive/model_training_major/`
- xgb_model.json (XGBoost)
- scaler.pkl (StandardScaler)
- label_encoder.pkl
- feature_names.pkl

---

**LAST UPDATED:** August 7, 2026
**PROJECT STATUS:** Stage 1 Complete ✓ → Ready for Deployment or Stage 2 CNN Training
