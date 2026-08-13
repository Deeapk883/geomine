// ============================================================
// REAL-WORLD INFERENCE - STEP 1: GEE REGION EXPORT
// ============================================================
// Make sure you drew a shape on the map named 'roi'

// Set date range for recent imagery (2026)
var startDate = '2026-01-01';
var endDate   = '2026-08-14'; 

// SCL Cloud Masking Function
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

// Filter Sentinel-2 Collection
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(roi)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .map(maskCloudShadowStrict);

print('✓ Available Sentinel-2 Scenes:', s2.size());

// Create Median Composite
var composite = s2.median();

// Align Bands & Indices
var bands_10m = composite.select(['B2', 'B3', 'B4', 'B8']);
var bands_20m = composite.select(['B11', 'B12']).resample('bilinear');
var compositeAligned = bands_10m.addBands(bands_20m);

var ndvi = compositeAligned.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndbi = compositeAligned.normalizedDifference(['B11', 'B8']).rename('NDBI');
var ndmi = compositeAligned.normalizedDifference(['B8', 'B11']).rename('NDMI');

// Stack 9 Bands & Convert to Float32
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

// Add RGB layer to map for preview
Map.centerObject(roi, 13);
Map.addLayer(image_9band.select(['B4', 'B3', 'B2']), {min: 0, max: 3000}, '2026 Sentinel-2 RGB');

// Export ROI to Drive
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

print('👉 Go to Tasks tab on the right and click RUN on ROI_Inference_Target');