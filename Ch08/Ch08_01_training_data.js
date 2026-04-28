/*====================================================================
 * บทที่ 8.4 Training Data และ Model Evaluation
 * Ch08_01_training_data.js
 *
 * วัตถุประสงค์:
 *   - สร้าง Training Data จาก FeatureCollections
 *   - จำแนกหมวดหมู่ดิน (Water, Forest, Urban, Crop)
 *   - เตรียมข้อมูลสำหรับ supervised classification
 *
 * ข้อมูล: Landsat 8 Collection 2
 * ROI: Bangkok metropolitan area
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
// กรุงเทพมหานคร
var roi = ee.Geometry.Rectangle([
  100.3, 13.5,
  100.9, 14.2
]);

// ====== Training Class Definitions ======
/**
 * สร้าง training samples สำหรับแต่ละ class
 * ในการใช้จริง ให้ใช้ GEE Code Editor Geometry Drawing Tools
 * เพื่อลาก Polygon สำหรับแต่ละ class
 * ที่นี่เราใช้ Geometry.Point + buffer เป็นตัวอย่าง
 */

// Class 0: Water (น้ำ) - สีน้ำเงิน
var waterPoints = [
  ee.Geometry.Point([100.45, 13.72]),  // Chao Phraya River
  ee.Geometry.Point([100.55, 13.95]),  // Lumphini Lake
  ee.Geometry.Point([100.65, 13.80])   // Samsen Canal
];

var water = ee.FeatureCollection(waterPoints.map(function(pt) {
  return ee.Feature(pt.buffer(100), {class: 0, label: 'Water'});
}));

// Class 1: Forest (ป่า/สวน) - สีเขียว
var forestPoints = [
  ee.Geometry.Point([100.80, 13.85]),  // Donmueang area
  ee.Geometry.Point([100.70, 14.00]),  // Vimanmek area
  ee.Geometry.Point([100.40, 13.95])   // Benjakitti Park
];

var forest = ee.FeatureCollection(forestPoints.map(function(pt) {
  return ee.Feature(pt.buffer(150), {class: 1, label: 'Forest'});
}));

// Class 2: Urban (เมือง/การค้า) - สีแดง
var urbanPoints = [
  ee.Geometry.Point([100.52, 13.73]),  // Central CBD
  ee.Geometry.Point([100.62, 13.82]),  // Silom area
  ee.Geometry.Point([100.75, 13.85])   // Sukhumvit area
];

var urban = ee.FeatureCollection(urbanPoints.map(function(pt) {
  return ee.Feature(pt.buffer(200), {class: 2, label: 'Urban'});
}));

// Class 3: Crop/Agriculture (พืชผล) - สีเหลือง
var cropPoints = [
  ee.Geometry.Point([100.35, 14.05]),  // Northern suburbs
  ee.Geometry.Point([100.85, 14.10])   // Eastern suburbs
];

var crop = ee.FeatureCollection(cropPoints.map(function(pt) {
  return ee.Feature(pt.buffer(150), {class: 3, label: 'Crop'});
}));

// ====== Merge Training Data ======
var training = water
  .merge(forest)
  .merge(urban)
  .merge(crop);

print('Training samples count:', training.size());
print('Training data structure:', training.first());

// ====== Visualize Training Samples on Map ======
var colorPalette = ['#0000FF', '#00AA00', '#FF0000', '#FFFF00'];
var samples = ee.List.sequence(0, 3);

samples.forEach(function(classNum) {
  var classSample = training.filter(ee.Filter.eq('class', classNum));
  var color = ee.List(colorPalette).get(classNum);
  Map.addLayer(classSample, {color: color}, 'Class ' + classNum);
});

// ====== Create Base Image ======
/**
 * เตรียม base image สำหรับ sampling
 */

function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 4;
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
    .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}

function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image
    .addBands(opticalBands, null, true)
    .addBands(thermalBands, null, true);
}

// สร้าง composite image
var composite = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterDate('2024-01-01', '2024-12-31')
  .filterBounds(roi)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(maskClouds)
  .map(applyScaleFactors)
  .median()
  .clip(roi);

// ====== Add Indices ======
/**
 * เพิ่ม spectral indices เพื่อ improve classification
 */

// NDVI: (NIR - Red) / (NIR + Red)
var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');

// NDWI: (Green - NIR) / (Green + NIR)
var ndwi = composite.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI');

// NDBI: (SWIR - NIR) / (SWIR + NIR)
var ndbi = composite.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');

// Combine all bands
var input = composite
  .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
  .addBands([ndvi, ndwi, ndbi]);

print('Input image bands:', input.bandNames());

// ====== Visualize Indices ======
Map.addLayer(ndvi, {min: -0.2, max: 0.8, palette: ['red', 'yellow', 'green']}, 'NDVI');
Map.addLayer(ndwi, {min: -1, max: 1, palette: ['brown', 'white', 'blue']}, 'NDWI');
Map.addLayer(ndbi, {min: -1, max: 1, palette: ['blue', 'white', 'red']}, 'NDBI');

// ====== Sample Training Points ======
/**
 * สกัด pixel values ที่ตำแหน่ง training points
 * scale = 30 (Landsat resolution)
 */
var bands = input.bandNames();
var trainingSamples = input.sampleRegions({
  collection: training,
  properties: ['class'],
  scale: 30
});

print('Training samples (sampled from image):', trainingSamples.size());
print('Sample structure:', trainingSamples.first());

// ====== Export Training Data (Optional) ======
/**
 * สามารถ export training data เพื่อใช้กับ classifiers อื่น
 */

// Export to CSV (uncomment to use)
/*
Export.table.toDrive({
  collection: trainingSamples,
  description: 'LandCover_TrainingData_Bangkok',
  folder: 'GEE_Exports',
  fileFormat: 'CSV'
});
*/

// ====== Statistics of Training Data ======
/**
 * ดู distribution ของ training data
 */

print('========== Training Data Statistics ==========');

// นับจำนวนสำหรับแต่ละ class
var classStats = training.reduceColumns(ee.Reducer.frequencyHistogram(), ['class']);
print('Class distribution:', classStats.get('histogram'));

// ====== Map Setup ======
Map.setCenter(100.6, 13.85, 11);
Map.setOptions('SATELLITE');

print('Training data ready for classification!');
