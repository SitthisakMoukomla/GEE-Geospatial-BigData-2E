/*====================================================================
 * บทที่ 8.5 Gradient Tree Boost Classification (ใหม่ใน Second Edition)
 * Ch08_03_gradient_tree_boost.js
 *
 * วัตถุประสงค์:
 *   - ใช้ Gradient Tree Boost (GTB) สำหรับ land cover classification
 *   - เปรียบเทียบกับ Random Forest
 *   - มักให้ accuracy สูงกว่า RF ในหลายกรณี
 *
 * ประเด็น: GTB มักใช้เวลา train นานกว่า RF
 * แต่ผลลัพธ์มักแม่นยำกว่า
 *
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
  // Water
  var waterPoints = [
    ee.Geometry.Point([100.45, 13.72]),
    ee.Geometry.Point([100.55, 13.95]),
    ee.Geometry.Point([100.65, 13.80])
  ];
  var water = ee.FeatureCollection(waterPoints.map(function(pt) {
    return ee.Feature(pt.buffer(100), {class: 0});
  }));

  // Forest
  var forestPoints = [
    ee.Geometry.Point([100.80, 13.85]),
    ee.Geometry.Point([100.70, 14.00]),
    ee.Geometry.Point([100.40, 13.95])
  ];
  var forest = ee.FeatureCollection(forestPoints.map(function(pt) {
    return ee.Feature(pt.buffer(150), {class: 1});
  }));

  // Urban
  var urbanPoints = [
    ee.Geometry.Point([100.52, 13.73]),
    ee.Geometry.Point([100.62, 13.82]),
    ee.Geometry.Point([100.75, 13.85])
  ];
  var urban = ee.FeatureCollection(urbanPoints.map(function(pt) {
    return ee.Feature(pt.buffer(200), {class: 2});
  }));

  // Crop
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

// Add spectral indices
var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
var ndwi = composite.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI');
var ndbi = composite.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');

var input = composite
  .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
  .addBands([ndvi, ndwi, ndbi]);

print('Input bands:', input.bandNames());

// ====== 2. Training Data Preparation ======

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

print('Train set size:', trainSet.size());
print('Test set size:', testSet.size());

// ====== 3. Train Gradient Tree Boost Classifier ======

/**
 * smileGradientTreeBoost parameters:
 *  - numberOfTrees: 100 (default) — จำนวน trees
 *  - learningRate: 0.1 (default) — shrinkage parameter
 *  - loss: 'LeastSquares' (default) — loss function
 *  - seed: 0
 *
 * Note: GTB มักดี default hyperparameters
 *       แต่อาจทดลอง numberOfTrees 50-300
 */
var gtb = ee.Classifier.smileGradientTreeBoost({
  numberOfTrees: 100,
  learningRate: 0.1,
  loss: 'LeastSquares',
  seed: 0
}).train(trainSet, 'class', bands);

print('Gradient Tree Boost trained');

// ====== 4. Test Accuracy Assessment ======

var testAccuracyGTB = testSet.classify(gtb);
var confMatrixGTB = testAccuracyGTB.errorMatrix('class', 'classification');

var accuracyGTB = confMatrixGTB.accuracy();
var kappaGTB = confMatrixGTB.kappa();
var consumersGTB = confMatrixGTB.consumersAccuracy();
var producersGTB = confMatrixGTB.producersAccuracy();

print('========== GTB Accuracy Assessment ==========');
print('Confusion Matrix:');
print(confMatrixGTB);
print('\nOverall Accuracy:', accuracyGTB);
print('Kappa Coefficient:', kappaGTB);
print('Consumers Accuracy:', consumersGTB);
print('Producers Accuracy:', producersGTB);

// ====== 5. Classify Full Image ======

var classifiedGTB = input.classify(gtb);

// ====== 6. Visualization ======

var visClassification = {
  min: 0,
  max: 3,
  palette: ['#0000FF', '#00AA00', '#FF0000', '#FFFF00']
};

Map.addLayer(classifiedGTB, visClassification, 'Land Cover (GTB Classification)');

// Reference layer
var visRGB = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 0.3,
  gamma: 1.4
};

Map.addLayer(composite, visRGB, 'Landsat Composite (RGB)', false);

// ====== 7. Smoothing (Optional) ======

var classified_smooth = classifiedGTB.focal_mode(1, 'circle', 'pixels', 1);
Map.addLayer(classified_smooth, visClassification, 'Land Cover (GTB Smoothed)');

// ====== 8. Area Calculation ======

var areaImage = classified_smooth.multiply(ee.Image.pixelArea())
  .divide(1e6);

var areas = areaImage.reduceRegion({
  reducer: ee.Reducer.sum().unweighted(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e10
});

var classNames = ['Water', 'Forest', 'Urban', 'Crop'];
var classAreas = areas.getInfo();

print('========== Land Cover Areas (GTB) ==========');
classNames.forEach(function(name, index) {
  var area = classAreas['classification_' + index];
  if (area !== undefined) {
    print(name + ': ' + area.toFixed(2) + ' km²');
  }
});

// ====== 9. Comparison with Random Forest (Optional) ======

/**
 * เพื่อเปรียบเทียบ เรานำเสนอ RF ในนี่ด้วย
 * จำนวน trees น้อยลงเพื่อลด computation time
 */

var rf = ee.Classifier.smileRandomForest({
  numberOfTrees: 100,
  seed: 0
}).train(trainSet, 'class', bands);

var testAccuracyRF = testSet.classify(rf);
var confMatrixRF = testAccuracyRF.errorMatrix('class', 'classification');

var accuracyRF = confMatrixRF.accuracy();
var kappaRF = confMatrixRF.kappa();

print('========== Classifier Comparison ==========');
print('Random Forest Accuracy:', accuracyRF);
print('Random Forest Kappa:', kappaRF);
print('\nGradient Tree Boost Accuracy:', accuracyGTB);
print('Gradient Tree Boost Kappa:', kappaGTB);
print('\nGTB advantage over RF:');
print('  Accuracy difference:', ee.Number(accuracyGTB).subtract(accuracyRF).getInfo());
print('  Kappa difference:', ee.Number(kappaGTB).subtract(kappaRF).getInfo());

// ====== Export Results (Optional) ======

/*
Export.image.toDrive({
  image: classified_smooth,
  description: 'LandCover_GTB_Bangkok_2024',
  region: roi,
  scale: 30,
  crs: 'EPSG:4326'
});
*/

// ====== Map Setup ======

Map.setCenter(100.6, 13.85, 11);
Map.setOptions('SATELLITE');

print('Gradient Tree Boost classification complete!');
