// GeoMine - Google Earth Engine Data Extraction Script
// Extracts Sentinel-2 SR Harmonized imagery and calculates spectral indices (NDVI, NDBI, NDMI)
// Samples regions for 6 distinct classes and exports dataset tables to Google Drive in CSV format.

var c1 = class1.map(function(f) { return f.set('label', 1); });
var c3 = class3.map(function(f) { return f.set('label', 3); });
var c4 = class4.map(function(f) { return f.set('label', 4); });
var c5 = class5.map(function(f) { return f.set('label', 5); });
var c6 = class6.map(function(f) { return f.set('label', 6); });
var c7 = class7.map(function(f) { return f.set('label', 7); });

var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate('2023-01-01', '2023-12-31')
  .median();

var image = sentinel2.select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']);
var ndvi = sentinel2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndbi = sentinel2.normalizedDifference(['B11', 'B8']).rename('NDBI');
var ndmi = sentinel2.normalizedDifference(['B8', 'B11']).rename('NDMI');
var allBands = image.addBands([ndvi, ndbi, ndmi]);

// ============ EXPORT EACH CLASS SEPARATELY ============

// CLASS 1: MINES
var samples1 = allBands.sampleRegions({
  collection: c1,
  properties: ['label'],
  scale: 20,
  tileScale: 16
});

Export.table.toDrive({
  collection: samples1,
  description: 'export_class_mines',
  fileNamePrefix: 'training_mines',
  fileFormat: 'CSV'
});

// CLASS 3: AGRICULTURE
var samples3 = allBands.sampleRegions({
  collection: c3,
  properties: ['label'],
  scale: 20,
  tileScale: 16
});

Export.table.toDrive({
  collection: samples3,
  description: 'export_class_agriculture',
  fileNamePrefix: 'training_agriculture',
  fileFormat: 'CSV'
});

// CLASS 4: URBAN
var samples4 = allBands.sampleRegions({
  collection: c4,
  properties: ['label'],
  scale: 20,
  tileScale: 16
});

Export.table.toDrive({
  collection: samples4,
  description: 'export_class_urban',
  fileNamePrefix: 'training_urban',
  fileFormat: 'CSV'
});

// CLASS 5: ROCK
var samples5 = allBands.sampleRegions({
  collection: c5,
  properties: ['label'],
  scale: 20,
  tileScale: 16
});

Export.table.toDrive({
  collection: samples5,
  description: 'export_class_rock',
  fileNamePrefix: 'training_rock',
  fileFormat: 'CSV'
});

// CLASS 6: WATER
var samples6 = allBands.sampleRegions({
  collection: c6,
  properties: ['label'],
  scale: 20,
  tileScale: 16
});

Export.table.toDrive({
  collection: samples6,
  description: 'export_class_water',
  fileNamePrefix: 'training_water',
  fileFormat: 'CSV'
});

// CLASS 7: FOREST
var samples7 = allBands.sampleRegions({
  collection: c7,
  properties: ['label'],
  scale: 20,
  tileScale: 16
});

Export.table.toDrive({
  collection: samples7,
  description: 'export_class_forest',
  fileNamePrefix: 'training_forest',
  fileFormat: 'CSV'
});
