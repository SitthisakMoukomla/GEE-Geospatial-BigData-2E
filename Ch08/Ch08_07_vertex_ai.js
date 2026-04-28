/*====================================================================
 * บทที่ 8.8 Vertex AI Integration — Deep Learning with GEE
 * Ch08_07_vertex_ai.js
 *
 * วัตถุประสงค์:
 *   - เชื่อมต่อ Google Cloud Vertex AI กับ GEE
 *   - Train Deep Learning model (CNN) บน TensorFlow/PyTorch
 *   - Deploy model และเรียกใช้ predictions จาก GEE
 *
 * ลำดับขั้น:
 *   1. Export training patches จาก GEE -> Cloud Storage
 *   2. Train model บน Vertex AI (TensorFlow/PyTorch)
 *   3. Deploy model เป็น Vertex AI Endpoint
 *   4. เรียก model จาก GEE ผ่าน ee.Model.fromAiPlatformPredictor()
 *
 * หมายเหตุ:
 *   - ต้องมี Google Cloud Project กับ Vertex AI ที่เปิดใช้
 *   - Code นี้เป็น template; ส่วน training ต้องทำใน Python
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
var roi = ee.Geometry.Rectangle([
  100.3, 13.5,
  100.9, 14.2
]);

// ====== Step 0: Data Preparation ======

function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 4;
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
    .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}

var composite = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterDate('2024-01-01', '2024-12-31')
  .filterBounds(roi)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(maskClouds)
  .median()
  .clip(roi);

// Scale to 0-1 for DL
var input = composite
  .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
  .multiply(0.0000275)
  .add(-0.2);

print('Input image prepared for deep learning');

// ====== Step 1: Export Training Patches (Optional Template) ======

/**
 * หากต้องการ export training patches ให้ uncomment
 * สำหรับใช้ใน Python training pipeline
 *
 * Patches should be:
 *  - 64x64 หรือ 128x128 pixels
 *  - ปะปนหลากหลาย ROI
 *  - paired กับ ground truth labels
 */

/*
// สร้าง sample points สำหรับ patches
var gridPoints = ee.FeatureCollection.randomPoints({
  region: roi,
  points: 100,
  seed: 0
});

// Export patches
Export.image.toDrive({
  image: input,
  description: 'TrainingPatches_Landsat_Bangkok',
  region: roi,
  scale: 30,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e9
});
*/

// ====== Step 2: Model Training (Python on Vertex AI) ======

/**
 * Python code (pseudocode) สำหรับ Vertex AI:
 *
import tensorflow as tf
from google.cloud import aiplatform, storage
import numpy as np

# 1. Load training data จาก Cloud Storage
# training_data = load_from_gcs('gs://your-bucket/training-patches/')

# 2. Define CNN model
model = tf.keras.Sequential([
    tf.keras.layers.Conv2D(32, 3, activation='relu', input_shape=(64, 64, 6)),
    tf.keras.layers.MaxPooling2D(),
    tf.keras.layers.Conv2D(64, 3, activation='relu'),
    tf.keras.layers.MaxPooling2D(),
    tf.keras.layers.Flatten(),
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dropout(0.5),
    tf.keras.layers.Dense(4, activation='softmax')  # 4 classes
])

# 3. Compile
model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

# 4. Train
model.fit(training_data, epochs=20, validation_split=0.2)

# 5. Save model
model.save('gs://your-bucket/land-cover-cnn/')

# 6. Deploy to Vertex AI
endpoint = aiplatform.Endpoint.create(
    display_name='land-cover-cnn-endpoint'
)
# ... (deploy saved model)
 */

print('========== Manual Training Steps ==========');
print('1. Export patches from GEE using Export.image.toDrive()');
print('2. Train CNN using TensorFlow/PyTorch (Python script)');
print('3. Save model to Cloud Storage');
print('4. Deploy to Vertex AI Endpoint');
print('5. Use ee.Model.fromAiPlatformPredictor() below');

// ====== Step 3: Load Trained Model from Vertex AI ======

/**
 * เมื่อ model ถูก deploy บน Vertex AI แล้ว
 * ใช้ code ด้านล่างเพื่อเรียกใช้
 */

/**
 * ตัวอย่าง configuration สำหรับ model predictor:
 *  - projectName: GCP project ID
 *  - modelName: ชื่อ model ที่ deployed
 *  - version: version ID
 *  - inputTileSize: [height, width]
 *  - inputOverlapSize: overlap สำหรับ tiling
 *  - proj: projection
 *  - outputBands: expected output
 */

/**
 * UNCOMMENT & CONFIGURE สำหรับการใช้ Vertex AI model:

var model = ee.Model.fromAiPlatformPredictor({
  projectName: 'YOUR-GCP-PROJECT-ID',
  modelName: 'land-cover-cnn',
  version: 'v1',
  inputTileSize: [64, 64],
  inputOverlapSize: [8, 8],
  proj: ee.Projection('EPSG:4326').atScale(30),
  fixInputProj: true,
  outputBands: {
    classification: {
      type: ee.PixelType.int8(),
      dimensions: 0
    }
  }
});

var prediction = model.predictImage(input.float());
Map.addLayer(prediction, {
  min: 0, max: 3,
  palette: ['#0000FF', '#00AA00', '#FF0000', '#FFFF00']
}, 'Deep Learning Classification');
 */

// ====== Step 4: (Demo) Simulated DL Output ======

/**
 * สำหรับ demo purposes โดยไม่มี actual trained model
 * เราใช้ rules-based classifier เหมือน "DL model"
 */

// สร้าง index เหมือน features
var ndvi = input.normalizedDifference(['B5', 'B3']).rename('NDVI');
var ndbi = input.normalizedDifference(['B6', 'B5']).rename('NDBI');
var ndwi = input.normalizedDifference(['B2', 'B5']).rename('NDWI');

// Rule-based "model" output (simulate DL)
var simulated = ndvi.where(ndvi.lt(0.2), 2)        // Urban
  .where(ndvi.gte(0.2).and(ndvi.lt(0.4)), 3)       // Crop
  .where(ndvi.gte(0.4).and(ndvi.lt(0.6)), 1)       // Forest
  .where(ndvi.gte(0.6), 1)                         // Forest
  .where(ndwi.gt(0.3), 0);                         // Water

var vis = {
  min: 0, max: 3,
  palette: ['#0000FF', '#00AA00', '#FF0000', '#FFFF00']
};

Map.addLayer(simulated, vis, 'Simulated DL Prediction (Demo)');

// ====== Step 5: Post-Processing ======

var prediction_smooth = simulated.focal_mode(1, 'circle', 'pixels', 1);
Map.addLayer(prediction_smooth, vis, 'DL Prediction (Smoothed)');

// ====== Step 6: Area Statistics ======

var areaImage = prediction_smooth.multiply(ee.Image.pixelArea())
  .divide(1e6);

var areas = areaImage.reduceRegion({
  reducer: ee.Reducer.sum().unweighted(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e10
});

var classNames = ['Water', 'Forest', 'Urban', 'Crop'];
var classAreas = areas.getInfo();

print('========== DL Prediction Areas ==========');
classNames.forEach(function(name, index) {
  var area = classAreas['classification_' + index];
  if (area !== undefined) {
    print(name + ': ' + area.toFixed(2) + ' km²');
  }
});

// ====== Step 7: Batch Prediction (Optional) ======

/**
 * สำหรับการ predict บน multiple tiles/regions
 * ใช้ ee.Batch.Export
 */

/*
Export.image.toDrive({
  image: prediction_smooth,
  description: 'DL_Prediction_Bangkok',
  region: roi,
  scale: 30,
  crs: 'EPSG:4326'
});
*/

// ====== Step 8: Accuracy Assessment (if ground truth available) ======

/**
 * หากมี ground truth validation data
 * สามารถ assess accuracy ของ DL model
 */

print('========== Vertex AI Integration Notes ==========');
print('Advantages of Deep Learning:');
print('  - Automatically learns complex spatial-spectral patterns');
print('  - Potential higher accuracy than tree-based methods');
print('  - Can handle high-dimensional inputs');
print('');
print('Challenges:');
print('  - Requires large labeled dataset');
print('  - Computational cost higher');
print('  - Training complexity (hyperparameter tuning)');
print('  - Less interpretability than traditional classifiers');

// ====== Step 9: Workflow Summary ======

print('========== VERTEX AI WORKFLOW SUMMARY ==========');
print('GEE -> Export patches -> Vertex AI -> Train DL -> Deploy');
print('');
print('1. Export training patches (30m resolution) from GEE');
print('2. Preprocess & augment on Vertex AI');
print('3. Train CNN (e.g., ResNet, EfficientNet)');
print('4. Evaluate on validation set');
print('5. Deploy as Vertex AI Endpoint');
print('6. Call from GEE: ee.Model.fromAiPlatformPredictor()');
print('7. Generate predictions across entire ROI');
print('8. Post-process & export results');

// ====== Map Setup ======

Map.setCenter(100.6, 13.85, 11);
Map.setOptions('SATELLITE');

print('Vertex AI integration template ready!');
print('Configure with your GCP project and trained model.');
