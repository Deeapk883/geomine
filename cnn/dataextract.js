// ============================================================
// MINING DETECTION - CNN TRAINING DATA EXPORT (TYPE-FIXED)
// ============================================================

// ── STEP 1: Define classes & combined boundaries ────────────
var classList = [
  { fc: mines,          label: 1, name: 'mines' },
  { fc: agriculture,    label: 3, name: 'agriculture' },
  { fc: urban_building, label: 4, name: 'urban' },
  { fc: rocky_hilly,    label: 5, name: 'rocky' },
  { fc: water,          label: 6, name: 'water' },
  { fc: forest,         label: 7, name: 'forest' },
  { fc: river_beds,     label: 8, name: 'riverbeds' }
];

var totalBounds = ee.FeatureCollection([
  mines, agriculture, urban_building, 
  rocky_hilly, water, forest, river_beds
]).flatten().geometry().bounds();

// ── STEP 2: Strict SCL Masking Function ─────────────────────
var maskCloudShadowStrict = function(image) {
  var scl = image.select('SCL');
  var validMask = scl.neq(0)
    .and(scl.neq(1))
    .and(scl.neq(2))
    .and(scl.neq(3))
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));
    
  return image.updateMask(validMask);
};

// ── STEP 3: Load Sentinel-2 & Create Composite ───────────────
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate('2024-01-01', '2024-12-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
  .filterBounds(totalBounds)
  .map(maskCloudShadowStrict);

print('✓ Sentinel-2 Image Count in Collection:', s2.size());

var composite = s2.median();

// ── STEP 4: Align Bands & Calculate Indices ──────────────────
var bands_10m = composite.select(['B2', 'B3', 'B4', 'B8']);
var bands_20m = composite.select(['B11', 'B12']).resample('bilinear');

var compositeAligned = bands_10m.addBands(bands_20m);

var ndvi = compositeAligned.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndbi = compositeAligned.normalizedDifference(['B11', 'B8']).rename('NDBI');
var ndmi = compositeAligned.normalizedDifference(['B8', 'B11']).rename('NDMI');

// ── STEP 5: Stack 9 Spectral Bands ───────────────────────────
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
]);

// ── STEP 6: Export Polygons with Unified Data Type ───────────
var totalExportsQueued = 0;

classList.forEach(function(item) {
  var fc = item.fc;
  var count = fc.size().getInfo();
  var featureList = fc.toList(count);
  
  for (var i = 0; i < count; i++) {
    var feat = ee.Feature(featureList.get(i));
    var geom = feat.geometry();
    var bounds = geom.bounds();
    
    var classLabelBand = ee.Image.constant(item.label).rename('class_label');
    
    // Explicitly convert ALL bands to float32 using .toFloat()
    var exportImage = image_9band
      .addBands(classLabelBand)
      .toFloat()
      .clip(geom)
      .unmask(-9999);
    
    var taskName = 'label_' + item.label + '_' + item.name + '_poly_' + i;
    
    Export.image.toDrive({
      image: exportImage,
      description: taskName,
      fileNamePrefix: taskName,
      folder: 'CNN_Mining_Patches',
      region: bounds,
      scale: 10,
      crs: 'EPSG:4326',
      maxPixels: 1e9,
      fileFormat: 'GeoTIFF'
    });
    
    totalExportsQueued++;
  }
});

print('✓ SUCCESS: ' + totalExportsQueued + ' tasks ready with unified Float32 types.');