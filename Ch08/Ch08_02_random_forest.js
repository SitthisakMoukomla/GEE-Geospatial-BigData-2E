/*====================================================================
 * บทที่ 8.5 Supervised Classification — Random Forest Complete Workflow
 * Ch08_02_random_forest.js
 *
 * วัตถุประสงค์:
 *   - สร้าง complete random forest classification workflow
 *   - เทรน model, ประเมิน accuracy, สร้างแผนที่
 *   - ใช้ Landsat 8 Collection 2
 *
 * ไฟไลจาก: Ch08_01 training data
 * ข้อมูล: LANDSAT/LC08/C02/T1_L2, LANDSAT/LC09/C02/T1_L2
 * ROI: Bangkok metropolitan area
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
var roi = ee.Geometry.Rectangle([
  100.3, 13.5,
  100.9, 14.2
]);

// ====== Helper Functions ======

/**
 * ฟังก์ชัน: มาส์กเมฆ (Landsat Collection 2)
 */
function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 4;
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
    .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}

/**
 * ฟังก์ชัน: Apply scale factors (Landsat C02 SR)
 */
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image
    .addBands(opticalBands, null, true)
    .addBands(thermalBands, null, true);
}

/**
 * ฟังก์ชัน: สร้าง training data
 */
function createTrainingData() {
  // Water samples
  var waterPoints = [
    ee.Geometry.Point([100.45, 13.72]),
    ee.Geometry.Point([100.55, 13.95]),
    ee.Geometry.Point([100.65, 13.80])
  ];
  var water = ee.FeatureCollection(waterPoints.map(function(pt) {
    return ee.Feature(pt.buffer(100), {class: 0});
  }));

  // Forest samples
  var forestPoints = [
    ee.Geometry.Point([100.80, 13.85]),
    ee.Geometry.Point([100.70, 14.00]),
    ee.Geometry.Point([100.40, 13.95])
  ];
  var forest = ee.FeatureCollection(forestPoints.map(function(pt) {
    return ee.Feature(pt.buffer(150), {class: 1});
  }));

  // Urban samples
  var urbanPoints = [
    ee.Geometry.Point([100.52, 13.73]),
    ee.Geometry.Point([100.62, 13.82]),
    ee.Geometry.Point([100.75, 13.85])
  ];
  var urban = ee.FeatureCollection(urbanPoints.map(function(pt) {
    return ee.Feature(pt.buffer(200), {class: 2});
  }));

  // Crop samples
  var cropPoints = [
    ee.Geometry.Point([100.35, 14.05]),
    ee.Geometry.Point([100.85, 14.10])
  ];
  var crop = ee.FeatureCollection(cropPoints.map(function(pt) {
    return ee.Feature(pt.buffer(150), {class: 3});
  }));

  return water.merge(forest).merge(urban).merge(crop);
}

// ====== 1. Data Preparation ======

// Create composite
var composite = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterDate('2024-01-01', '2024-12-31')
  .filterBounds(roi)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(maskClouds)
  .map(applyScaleFactors)
  .median()
  .clip(roi);

// Add indices
var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
var ndwi = composite.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI');
var ndbi = composite.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');

var input = composite
  .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
  .addBands([ndvi, ndwi, ndbi]);

print('Input bands:', input.bandNames());

// ====== 2. Training Data Creation & Sampling ======

var training = createTrainingData();
var bands = input.bandNames();

var trainingSamples = input.sampleRegions({
  collection: training,
  properties: ['class'],
  scale: 30
});

print('Training samples:', trainingSamples.size());

// ====== 3. Add Random Column for Train/Test Split ======

var trainingSamplesRandom = trainingSamples.randomColumn('random');

// 70% for training, 30% for testing
var trainSet = trainingSamplesRandom.filter(ee.Filter.lt('random', 0.7));
var testSet = trainingSamplesRandom.filter(ee.Filter.gte('random', 0.7));

print('Train set size:', trainSet.size());
print('Test set size:', testSet.size());

// ====== 4. Train Random Forest Classifier ======

/**
 * smileRandomForest parameters:
 *  - numberOfTrees: 200 (default: 100)
 *  - variablesPerSplit: null (auto)
 *  - minLeafPopulation: 1 (default)
 *  - bagFraction: 0.5 (default)
 *  - seed: 0 (for reproducibility)
 */
var rf = ee.Classifier.smileRandomForest({
  numberOfTrees: 200,
  variablesPerSplit: null,
  minLeafPopulation: 1,
  bagFraction: 0.5,
  seed: 0
}).train(trainSet, 'class', bands);

print('Random Forest trained');
print('Random Forest feature importance:', rf.explain());

// ====== 5. Test Accuracy Assessment ======

// Classify test set
var testAccuracy = testSet.classify(rf);

// Generate confusion matrix
var confMatrix = testAccuracy.errorMatrix('class', 'classification');

// Calculate metrics
var accuracy = confMatrix.accuracy();
var kappa = confMatrix.kappa();
var consumers = confMatrix.consumersAccuracy();
var producers = confMatrix.producersAccuracy();

print('========== Accuracy Assessment ==========');
print('Confusion Matrix:');
print(confMatrix);
print('\nOverall Accuracy:', accuracy);
print('Kappa Coefficient:', kappa);
print('Consumers Accuracy:', consumers);
print('Producers Accuracy:', producers);

// ====== 6. Classify Full Image ======

var classified = input.classify(rf);

// ====== 7. Visualization ======

var visClassification = {
  min: 0,
  max: 3,
  palette: ['#0000FF', '#00AA00', '#FF0000', '#FFFF00']
};

Map.addLayer(classified, visClassification, 'Land Cover (RF Classification)');

// Add RGB composite for reference
var visRGB = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 0.3,
  gamma: 1.4
};

Map.addLayer(composite, visRGB, 'Landsat Composite (RGB)', false);

// ====== 8. Post-Processing (Optional) ======

/**
 * Apply median filter เพื่อ smooth results
 * ลด salt-and-pepper noise
 */
var classified_smooth = classified.focal_mode(1, 'circle', 'pixels', 1);

Map.addLayer(classified_smooth, visClassification, 'Land Cover (RF Smoothed)');

// ====== 9. Area Calculation ======

/**
 * คำนวณพื้นที่สำหรับแต่ละ class
 */
var areaImage = classified.multiply(ee.Image.pixelArea())
  .divide(1e6);  // convert to km²

var areas = areaImage.reduceRegion({
  reducer: ee.Reducer.sum().unweighted(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e10
});

var classNames = ['Water', 'Forest', 'Urban', 'Crop'];
var classAreas = areas.getInfo();

print('========== Land Cover Areas ==========');
classNames.forEach(function(name, index) {
  var area = classAreas['classification_' + index];
  if (area !== undefined) {
    print(name + ': ' + area.toFixed(2) + ' km²');
  }
});

// ====== 10. Export Results (Optional) ======

/**
 * Export classified map to Cloud Storage or Drive
 */

/*
Export.image.toDrive({
  image: classified_smooth,
  description: 'LandCover_RF_Bangkok_2024',
  region: roi,
  scale: 30,
  crs: 'EPSG:4326'
});

Export.image.toAsset({
  image: classified_smooth,
  description: 'LandCover_RF_Bangkok_2024',
  assetId: 'projects/my-project/assets/landcover_rf',
  region: roi,
  scale: 30,
  crs: 'EPSG:4326'
});
*/

// ====== Map Setup ======

Map.setCenter(100.6, 13.85, 11);
Map.setOptions('SATELLITE');

print('Random Forest classification complete!');
