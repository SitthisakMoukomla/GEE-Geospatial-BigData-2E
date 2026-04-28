/*====================================================================
 * บทที่ 8.7 AlphaEarth Embeddings — Foundation Model (ใหม่ใน Second Edition)
 * Ch08_06_alpha_earth.js
 *
 * วัตถุประสงค์:
 *   - ใช้ AlphaEarth embeddings จาก Google DeepMind
 *   - Foundation model ที่ pre-train บน Sentinel-2
 *   - Embeddings เป็น compressed representation ที่เก็บ
 *     spectral-spatial features ได้ดีกว่า pixel values
 *
 * ข้อได้เปรียบ:
 *   - Embedding มี semantic meaning ที่สูงขึ้น
 *   - ต้อง training data น้อยกว่า
 *   - Transfer learning: ใช้ knowledge จาก pre-training
 *
 * หมายเหตุ:
 *   - AlphaEarth ยังอยู่ในระหว่างการเปิด (ที่เวลา Second Edition)
 *   - Code นี้อาจต้อง update ตามการเปลี่ยนแปลง API
 *
 * Reference: Google DeepMind & Google Earth Engine Blog
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
var roi = ee.Geometry.Rectangle([
  100.3, 13.5,
  100.9, 14.2
]);

// ====== Alternative: If AlphaEarth not available yet ======

/**
 * หากยังไม่มี AlphaEarth ใน GEE catalog
 * ให้ใช้ Sentinel-2 standard bands เป็น embedding proxy
 * โดยทำ dimensionality reduction แทน
 */

// ====== Helper Functions ======

function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 4;
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
    .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
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

// ====== 1. Data Preparation with Sentinel-2 ======

/**
 * เนื่องจากการ availability ของ AlphaEarth
 * เราจะทำ demo กับ Sentinel-2 bands + indices
 * ซึ่งเป็น "pseudo-embeddings"
 */

var s2Collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate('2024-01-01', '2024-12-31')
  .filterBounds(roi)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .map(maskClouds)
  .median()
  .clip(roi);

print('Sentinel-2 bands:', s2Collection.bandNames());

// ====== 2. Create "Embedding-like" Features ======

/**
 * สร้าง high-dimensional feature set
 * ที่มี characteristics คล้ายๆ embeddings:
 *  - Multiple spectral bands
 *  - Derived indices
 *  - Textural information (optional)
 */

// Spectral bands
var b2 = s2Collection.select('B2');    // Blue
var b3 = s2Collection.select('B3');    // Green
var b4 = s2Collection.select('B4');    // Red
var b5 = s2Collection.select('B5');    // Red Edge
var b6 = s2Collection.select('B6');    // Red Edge
var b7 = s2Collection.select('B7');    // Red Edge
var b8 = s2Collection.select('B8');    // NIR
var b11 = s2Collection.select('B11');  // SWIR 1
var b12 = s2Collection.select('B12');  // SWIR 2

// Spectral indices
var ndvi = s2Collection.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndwi = s2Collection.normalizedDifference(['B3', 'B8']).rename('NDWI');
var ndbi = s2Collection.normalizedDifference(['B11', 'B8']).rename('NDBI');
var ndii = s2Collection.normalizedDifference(['B8', 'B11']).rename('NDII');
var bsi = s2Collection.expression(
  '(B11 + B4 - B8 - B3) / (B11 + B4 + B8 + B3)',
  {B11: b11, B4: b4, B8: b8, B3: b3}
).rename('BSI');

var gci = b8.divide(b4).subtract(1).rename('GCI');

// Combine as "embedding"
var embedding = s2Collection
  .select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12'])
  .addBands([ndvi, ndwi, ndbi, ndii, bsi, gci]);

print('Embedding-like feature set bands:', embedding.bandNames());
print('Total bands:', embedding.bandNames().length());

// ====== 3. (Commented) Actual AlphaEarth Usage ======

/**
 * เมื่อ AlphaEarth พร้อมใช้งาน ให้ uncomment:
 *
var alphaEarth = ee.Image('GOOGLE/ALPHAEARTH/EMBEDDINGS/V1')
  .clip(roi);

var embBands = alphaEarth.bandNames();
print('AlphaEarth bands:', embBands);

var embedding = alphaEarth;
 */

// ====== 4. Training Data Preparation ======

var training = createTrainingData();
var embBands = embedding.bandNames();

var trainingSamples = embedding.sampleRegions({
  collection: training,
  properties: ['class'],
  scale: 10
});

var trainingSamplesRandom = trainingSamples.randomColumn('random');
var trainSet = trainingSamplesRandom.filter(ee.Filter.lt('random', 0.7));
var testSet = trainingSamplesRandom.filter(ee.Filter.gte('random', 0.7));

print('Train samples:', trainSet.size());
print('Test samples:', testSet.size());

// ====== 5. Train with Embeddings ======

/**
 * ทำการ train classifier โดยใช้ embeddings แทน standard bands
 * Random Forest สาข random forests
 */

var rf = ee.Classifier.smileRandomForest(100)
  .train(trainSet, 'class', embBands);

print('Random Forest trained on embeddings');

// ====== 6. Accuracy Assessment ======

var testAccuracy = testSet.classify(rf);
var confMatrix = testAccuracy.errorMatrix('class', 'classification');

var oa = confMatrix.accuracy();
var kappa = confMatrix.kappa();

print('========== Accuracy (Using Embeddings) ==========');
print('Overall Accuracy:', oa);
print('Kappa:', kappa);
print('Confusion Matrix:');
print(confMatrix);

// ====== 7. Classify Full Image ======

var classified = embedding.classify(rf);

var visClassification = {
  min: 0,
  max: 3,
  palette: ['#0000FF', '#00AA00', '#FF0000', '#FFFF00']
};

Map.addLayer(classified, visClassification, 'Land Cover (Embedding-based RF)');

// ====== 8. Smoothing ======

var classified_smooth = classified.focal_mode(1, 'circle', 'pixels', 1);
Map.addLayer(classified_smooth, visClassification, 'Land Cover (Smoothed)');

// ====== 9. Visualization: Feature Importance ======

/**
 * ดู feature importance จาก trained classifier
 */
var featureImportance = rf.explain();
print('Feature Importance:');
print(featureImportance);

// ====== 10. Comparison ======

/**
 * เพื่อเห็นความแตกต่าง ก็สร้าง classifier จาก standard bands
 */

var standardInput = s2Collection.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12']);

var standardSamples = standardInput.sampleRegions({
  collection: training,
  properties: ['class'],
  scale: 10
});

var standardRandom = standardSamples.randomColumn('random');
var standardTrain = standardRandom.filter(ee.Filter.lt('random', 0.7));
var standardTest = standardRandom.filter(ee.Filter.gte('random', 0.7));

var standardRF = ee.Classifier.smileRandomForest(100)
  .train(standardTrain, 'class', standardInput.bandNames());

var standardAccuracy = standardTest.classify(standardRF);
var standardConfMatrix = standardAccuracy.errorMatrix('class', 'classification');

var standardOA = standardConfMatrix.accuracy();
var standardKappa = standardConfMatrix.kappa();

print('========== Comparison: Embeddings vs Standard Bands ==========');
print('Embedding-based Accuracy:', oa);
print('Embedding-based Kappa:', kappa);
print('\nStandard Bands Accuracy:', standardOA);
print('Standard Bands Kappa:', standardKappa);
print('\nAdvantage:', ee.Number(oa).subtract(standardOA).getInfo());

// ====== 11. Area Calculation ======

var areaImage = classified_smooth.multiply(ee.Image.pixelArea())
  .divide(1e6);

var areas = areaImage.reduceRegion({
  reducer: ee.Reducer.sum().unweighted(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e10
});

var classNames = ['Water', 'Forest', 'Urban', 'Crop'];
var classAreas = areas.getInfo();

print('========== Land Cover Areas (Embedding-based) ==========');
classNames.forEach(function(name, index) {
  var area = classAreas['classification_' + index];
  if (area !== undefined) {
    print(name + ': ' + area.toFixed(2) + ' km²');
  }
});

// ====== Notes ======

print('========== NOTES ON ALPHAEARTH ==========');
print('AlphaEarth Embeddings provide:');
print('  - Pre-trained representations from Sentinel-2');
print('  - Better semantic features than raw pixel values');
print('  - Improved classification with limited training data');
print('  - Transfer learning capability');
print('');
print('This example uses Sentinel-2 bands + indices as "pseudo-embeddings"');
print('Replace with actual AlphaEarth when available in GEE');

// ====== Map Setup ======

Map.setCenter(100.6, 13.85, 11);
Map.setOptions('SATELLITE');

print('AlphaEarth-style embedding classification complete!');
