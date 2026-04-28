/*
 * Ch10_01_alpha_earth_embeddings.js
 * AlphaEarth Embeddings Classification in GEE
 * ใช้ Foundation Model embeddings สำหรับ land cover classification
 *
 * ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
 * วันที่: 2025
 */

/*
 * AlphaEarth: Foundation Model จาก Google DeepMind
 * - Pre-trained บน petabytes ของ Sentinel-2 images
 * - สร้าง 128-dimensional embeddings (semantic features)
 * - ดีกว่า spectral bands สำหรับ classification
 * - Available ใน GEE: projects/sat-io/open-datasets/EMBEDDINGS/ALPHA_EARTH
 */

print('=== AlphaEarth Embeddings Classification ===\n');

// === 1. Define Study Area ===
var roi = ee.Geometry.Rectangle([100.4, 13.7, 100.6, 13.9]);  // Bangkok area

// === 2. Load AlphaEarth Embeddings ===
// AlphaEarth embeddings เป็น ImageCollection ของ 128-dimensional vectors

var embeddings = ee.ImageCollection('projects/sat-io/open-datasets/EMBEDDINGS/ALPHA_EARTH')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi);

print('AlphaEarth embeddings loaded');
print('Date range: 2025-01-01 to 2025-06-30');

// Take median to reduce temporal noise
var embeddings_median = embeddings.median();

// AlphaEarth bands: emb_0 ถึง emb_127 (128 embedding dimensions)
var embedding_bands = embeddings_median.bandNames();
print('Number of embedding bands:', embedding_bands.length().getInfo());

// === 3. Create Training Data ===
// สร้าง training points โดยการ sample pixels จากแต่ละ land cover class
// ในการใช้งานจริง ควร collect ground truth data

var training_points = ee.FeatureCollection([
  // Water class (ตัวอย่าง: Chao Phraya River)
  ee.Feature(ee.Geometry.Point(100.50, 13.75), {class: 0, class_name: 'water'}),
  ee.Feature(ee.Geometry.Point(100.48, 13.73), {class: 0, class_name: 'water'}),
  ee.Feature(ee.Geometry.Point(100.52, 13.77), {class: 0, class_name: 'water'}),

  // Vegetation/Forest class
  ee.Feature(ee.Geometry.Point(100.45, 13.85), {class: 1, class_name: 'forest'}),
  ee.Feature(ee.Geometry.Point(100.42, 13.80), {class: 1, class_name: 'forest'}),
  ee.Feature(ee.Geometry.Point(100.40, 13.72), {class: 1, class_name: 'forest'}),

  // Urban/Built-up class
  ee.Feature(ee.Geometry.Point(100.55, 13.80), {class: 2, class_name: 'urban'}),
  ee.Feature(ee.Geometry.Point(100.58, 13.75), {class: 2, class_name: 'urban'}),
  ee.Feature(ee.Geometry.Point(100.60, 13.82), {class: 2, class_name: 'urban'}),

  // Agricultural class
  ee.Feature(ee.Geometry.Point(100.35, 13.65), {class: 3, class_name: 'agriculture'}),
  ee.Feature(ee.Geometry.Point(100.38, 13.62), {class: 3, class_name: 'agriculture'}),
  ee.Feature(ee.Geometry.Point(100.32, 13.68), {class: 3, class_name: 'agriculture'})
]);

print('Training points created:', training_points.size().getInfo());
print('Classes:');
print('  0 = water');
print('  1 = forest');
print('  2 = urban');
print('  3 = agriculture');

// === 4. Sample Embeddings at Training Points ===
// ดึง embedding features ที่ตำแหน่ง training points

var training_samples = embeddings_median.sampleRegions({
  collection: training_points,
  properties: ['class', 'class_name'],
  scale: 10  // Sentinel-2 native resolution
});

print('Training samples extracted:', training_samples.size().getInfo());

// === 5. Train Random Forest Classifier ===
// ใช้ embedding vectors เป็น features แทน spectral bands

var classifier = ee.Classifier.smileRandomForest({
  numberOfTrees: 100,
  variablesPerSplit: 16,  // sqrt(128) ≈ 16
  minLeafPopulation: 1
}).train({
  features: training_samples,
  classProperty: 'class',
  inputProperties: embedding_bands  // Use all 128 embedding dimensions
});

print('Random Forest classifier trained');
print('Number of trees: 100');

// === 6. Apply Classification ===
// Classify ทั้งพื้นที่ ROI โดยใช้ trained classifier

var classified = embeddings_median.classify(classifier);

print('Classification applied to ROI');

// === 7. Visualize Results ===
Map.centerObject(roi, 12);

// Show original Sentinel-2 RGB
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .median();

Map.addLayer(
  s2.select(['B4', 'B3', 'B2']),
  {min: 0, max: 2000, gamma: 1.5},
  'Sentinel-2 RGB'
);

// Classification result
var classification_palette = ['blue', 'green', 'gray', 'yellow'];
Map.addLayer(
  classified.clip(roi),
  {min: 0, max: 3, palette: classification_palette},
  'AlphaEarth Classification'
);

// === 8. Accuracy Assessment ===
// Split data into training and validation

var training_size = training_samples.size().getInfo();
var split = 0.8;  // 80% training, 20% validation

var training = training_samples.randomColumn().filter(
  ee.Filter.lt('random', split)
);
var validation = training_samples.randomColumn().filter(
  ee.Filter.gte('random', split)
);

print('\nAccuracy Assessment:');
print('Training samples:', training.size().getInfo());
print('Validation samples:', validation.size().getInfo());

// Train on training set
var classifier_train = ee.Classifier.smileRandomForest(100).train({
  features: training,
  classProperty: 'class',
  inputProperties: embedding_bands
});

// Validate
var classified_validation = validation.classify(classifier_train);

var confusion_matrix = classified_validation.errorMatrix('class', 'classification');
var accuracy = confusion_matrix.accuracy();
var kappa = confusion_matrix.kappa();

print('Overall Accuracy:', accuracy.getInfo().toFixed(3));
print('Kappa Coefficient:', kappa.getInfo().toFixed(3));

// === 9. Per-Class Accuracy ===
print('\nPer-Class Producer\'s Accuracy:');
var producers_accuracy = confusion_matrix.producersAccuracy();
print('  0 (water):', producers_accuracy.get([0]).getInfo().toFixed(3));
print('  1 (forest):', producers_accuracy.get([1]).getInfo().toFixed(3));
print('  2 (urban):', producers_accuracy.get([2]).getInfo().toFixed(3));
print('  3 (agriculture):', producers_accuracy.get([3]).getInfo().toFixed(3));

print('\nPer-Class User\'s Accuracy:');
var users_accuracy = confusion_matrix.consumersAccuracy();
print('  0 (water):', users_accuracy.get([0]).getInfo().toFixed(3));
print('  1 (forest):', users_accuracy.get([1]).getInfo().toFixed(3));
print('  2 (urban):', users_accuracy.get([2]).getInfo().toFixed(3));
print('  3 (agriculture):', users_accuracy.get([3]).getInfo().toFixed(3));

// === 10. Comparison: AlphaEarth vs Spectral Bands ===

// For comparison, do same classification with spectral bands
var spectral_bands = s2.select(['B2', 'B3', 'B4', 'B5', 'B8', 'B11', 'B12']);

var spectral_training = spectral_bands.sampleRegions({
  collection: training_points,
  properties: ['class', 'class_name'],
  scale: 10
});

var spectral_classifier = ee.Classifier.smileRandomForest(100).train({
  features: spectral_training,
  classProperty: 'class',
  inputProperties: spectral_bands.bandNames()
});

var spectral_classified = spectral_bands.classify(spectral_classifier);

// Validate spectral approach
var spectral_validation = validation.map(function(feature) {
  var point = feature.geometry();
  var spectral_features = spectral_bands.sampleRectangle(ee.Geometry.Point(point), 5);
  return feature.set('spectral_classification',
    spectral_classifier.classify(spectral_features).getInfo());
});

print('\n=== Comparison: AlphaEarth vs Spectral Bands ===');
print('AlphaEarth embeddings:');
print('  Accuracy:', accuracy.getInfo().toFixed(3));
print('  Advantage: Pre-trained on huge dataset, captures semantic features');
print('');
print('Spectral bands:');
print('  Simpler, explainable by domain experts');
print('  Limited to visible/IR wavelengths');

// === 11. Area Statistics ===
var area_image = ee.Image.pixelArea().divide(1e6);  // sq km
var class_area = classified.multiply(area_image).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e13
});

print('\n=== Land Cover Area (sq km) ===');
print('Water:', class_area.get('classification_0').getInfo().toFixed(2));
print('Forest:', class_area.get('classification_1').getInfo().toFixed(2));
print('Urban:', class_area.get('classification_2').getInfo().toFixed(2));
print('Agriculture:', class_area.get('classification_3').getInfo().toFixed(2));

// === 12. Export Results ===
Export.image.toDrive({
  image: classified.byte(),
  description: 'alpha_earth_classification',
  region: roi,
  scale: 10,
  fileFormat: 'GeoTIFF'
});

// === 13. Advantages of AlphaEarth ===

print('\n=== AlphaEarth Advantages ===');
print('✓ Pre-trained on global Sentinel-2 data');
print('✓ Captures semantic features (not just spectral)');
print('✓ Better accuracy with small training sets');
print('✓ Consistent globally (no retraining needed)');
print('✓ Fast inference (just sample + classify)');
print('✓ 128 dimensions encode rich spatial information');

print('\n=== When to use AlphaEarth ===');
print('✓ General land cover classification');
print('✓ Limited training data');
print('✓ Global consistency needed');
print('✓ Similarity searches (find similar pixels)');
print('✗ Not ideal for: very specific classes (rare crop), SAR data');
