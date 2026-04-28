/*====================================================================
 * บทที่ 8.4 Model Evaluation — Accuracy Assessment & Confusion Matrix
 * Ch08_05_accuracy_assessment.js
 *
 * วัตถุประสงค์:
 *   - สร้าง confusion matrix จากการ classify test data
 *   - คำนวณ accuracy metrics:
 *     * Overall Accuracy (OA)
 *     * Kappa Coefficient (κ)
 *     * User's Accuracy (Commission Error)
 *     * Producer's Accuracy (Omission Error)
 *
 * Reference:
 *   Congalton, R. G. (1991). A review of assessing the accuracy of
 *   classifications of remotely sensed data. Remote Sensing of Environment.
 *
 * ข้อมูล: LANDSAT/LC08/C02/T1_L2
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

function createTrainingData() {
  var waterPoints = [
    ee.Geometry.Point([100.45, 13.72]),
    ee.Geometry.Point([100.55, 13.95]),
    ee.Geometry.Point([100.65, 13.80])
  ];
  var water = ee.FeatureCollection(waterPoints.map(function(pt) {
    return ee.Feature(pt.buffer(100), {class: 0});
  }));

  var forestPoints = [
    ee.Geometry.Point([100.80, 13.85]),
    ee.Geometry.Point([100.70, 14.00]),
    ee.Geometry.Point([100.40, 13.95])
  ];
  var forest = ee.FeatureCollection(forestPoints.map(function(pt) {
    return ee.Feature(pt.buffer(150), {class: 1});
  }));

  var urbanPoints = [
    ee.Geometry.Point([100.52, 13.73]),
    ee.Geometry.Point([100.62, 13.82]),
    ee.Geometry.Point([100.75, 13.85])
  ];
  var urban = ee.FeatureCollection(urbanPoints.map(function(pt) {
    return ee.Feature(pt.buffer(200), {class: 2});
  }));

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

var composite = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterDate('2024-01-01', '2024-12-31')
  .filterBounds(roi)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(maskClouds)
  .map(applyScaleFactors)
  .median()
  .clip(roi);

var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
var ndwi = composite.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI');
var ndbi = composite.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');

var input = composite
  .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
  .addBands([ndvi, ndwi, ndbi]);

// ====== 2. Training Data ======

var training = createTrainingData();
var bands = input.bandNames();

var trainingSamples = input.sampleRegions({
  collection: training,
  properties: ['class'],
  scale: 30
});

var trainingSamplesRandom = trainingSamples.randomColumn('random');
var trainSet = trainingSamplesRandom.filter(ee.Filter.lt('random', 0.7));
var testSet = trainingSamplesRandom.filter(ee.Filter.gte('random', 0.7));

print('Train samples:', trainSet.size());
print('Test samples:', testSet.size());

// ====== 3. Train Classifier ======

var rf = ee.Classifier.smileRandomForest(100)
  .train(trainSet, 'class', bands);

// ====== 4. Generate Confusion Matrix ======

/**
 * errorMatrix function:
 *  - Reference label column: 'class'
 *  - Classified label column: 'classification'
 *  - ตัวแรกคือ reference (actual), ตัวที่สอง คือ predicted
 */
var testAccuracy = testSet.classify(rf);
var confMatrix = testAccuracy.errorMatrix('class', 'classification');

print('========== CONFUSION MATRIX ==========');
print(confMatrix);

// ====== 5. Extract Confusion Matrix Data ======

/**
 * ลองดู matrix structure
 * สำหรับ 4 classes ควรจะ 4x4 matrix
 */
var confMatrixArray = confMatrix.array().getInfo();
print('\nConfusion Matrix Array:');
print(confMatrixArray);

// ====== 6. Calculate Accuracy Metrics ======

// Overall Accuracy (OA)
var oa = confMatrix.accuracy();
print('========== ACCURACY METRICS ==========');
print('Overall Accuracy (OA):', oa);

// Kappa Coefficient
// κ = (Po - Pe) / (1 - Pe)
// Po = overall accuracy
// Pe = expected accuracy by chance
var kappa = confMatrix.kappa();
print('Kappa Coefficient (κ):', kappa);

// User's Accuracy (1 - Commission Error)
// สำหรับแต่ละ class: ความแม่นยำของ positive predictions
var usersAccuracy = confMatrix.consumersAccuracy();
print('\nUser\'s Accuracy (Commission Error):');
print(usersAccuracy);

// Producer's Accuracy (1 - Omission Error)
// สำหรับแต่ละ class: sensitivity/recall
var producersAccuracy = confMatrix.producersAccuracy();
print('\nProducer\'s Accuracy (Omission Error):');
print(producersAccuracy);

// F1 Score (harmonic mean of precision & recall)
// F1 = 2 * (precision * recall) / (precision + recall)
var f1 = confMatrix.fscore();
print('\nF1-Score (per class):');
print(f1);

// ====== 7. Detailed Breakdown ======

/**
 * แสดง metrics สำหรับแต่ละ class
 */
var classNames = ['Water', 'Forest', 'Urban', 'Crop'];
var usersInfo = usersAccuracy.getInfo();
var producersInfo = producersAccuracy.getInfo();
var f1Info = f1.getInfo();

print('========== PER-CLASS METRICS ==========');
classNames.forEach(function(className, idx) {
  print('\nClass ' + idx + ': ' + className);
  print('  User\'s Accuracy:', usersInfo[idx]);
  print('  Producer\'s Accuracy:', producersInfo[idx]);
  print('  F1-Score:', f1Info[idx]);
});

// ====== 8. Interpretation ======

print('========== INTERPRETATION GUIDE ==========');
print('Overall Accuracy (OA):');
print('  - % ของ pixels ที่ classify ถูก');
print('  - 0-1 scale; > 0.85 ถือว่าดี');

print('\nKappa Coefficient (κ):');
print('  - แก้ไข OA ด้วย expected accuracy');
print('  - 0: random classification');
print('  - 1: perfect classification');
print('  - > 0.80: Excellent; 0.60-0.80: Good; < 0.60: Fair/Poor');

print('\nUser\'s Accuracy (UA):');
print('  - สำหรับ class i: TP_i / (TP_i + FP_i)');
print('  - "ของที่ classify เป็น class i จริงๆเป็น class i กี่%"');
print('  - เรียกอีกชื่อว่า Producer\'s Risk (1 - UA)');

print('\nProducer\'s Accuracy (PA):');
print('  - สำหรับ class i: TP_i / (TP_i + FN_i)');
print('  - "ของ class i จริงๆ classify ถูก กี่%"');
print('  - เรียกอีกชื่อว่า User\'s Risk (1 - PA)');

print('\nF1-Score:');
print('  - Harmonic mean ของ precision & recall');
print('  - ใช้เมื่อต้องการ balance ระหว่าง UA & PA');

// ====== 9. Classify Full Image ======

var classified = input.classify(rf);

var visClassification = {
  min: 0,
  max: 3,
  palette: ['#0000FF', '#00AA00', '#FF0000', '#FFFF00']
};

Map.addLayer(classified, visClassification, 'Land Cover Classification');

// ====== 10. Visualize Test Accuracy ======

/**
 * เพื่อดูว่า test set ไหน classify ผิด
 * สามารถแสดง difference map
 */
var testDiff = testAccuracy
  .eq(testSet)
  .selfMask();

var correctPixels = testDiff.updateMask(testDiff.eq(1));
Map.addLayer(correctPixels, {palette: 'green'}, 'Correctly Classified Test Pixels', false);

// ====== Export Results (Optional) ======

/*
Export.table.toDrive({
  collection: confMatrix,
  description: 'ConfusionMatrix_Bangkok_2024',
  folder: 'GEE_Exports',
  fileFormat: 'CSV'
});
*/

// ====== Map Setup ======

Map.setCenter(100.6, 13.85, 11);
Map.setOptions('SATELLITE');

print('Accuracy assessment complete!');
