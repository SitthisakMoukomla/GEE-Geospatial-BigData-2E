/*
 * Ch10_06_vertex_ai_predict.js
 * Predict from Vertex AI Model in GEE
 * เรียก Vertex AI Deep Learning model จาก GEE Code Editor
 *
 * ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
 * วันที่: 2025
 */

/*
 * Workflow:
 * 1. Export image from GEE
 * 2. Call Vertex AI REST API with prediction request
 * 3. Get semantic segmentation output
 * 4. Visualize results on map
 */

print('=== Vertex AI Prediction from GEE ===\n');

// === 1. Define Study Area ===
var roi = ee.Geometry.Rectangle([100.4, 13.7, 100.6, 13.9]);  // Bangkok
var year = 2025;

Map.centerObject(roi, 12);

// === 2. Prepare Image for Prediction ===
// Get Sentinel-2 image and scale to match training data

var image = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(year + '-01-01', year + '-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .median()
    .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']);

// Add NDVI
var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
var image_with_ndvi = image.addBands(ndvi);

print('Image prepared with 7 bands');

// === 3. Use ee.Model.fromVertexAi() (GEE Built-in) ===
// GEE provides native support for Vertex AI models

print('\n--- Method 1: Using ee.Model.fromVertexAi() (Built-in) ---');

try {
  var model = ee.Model.fromVertexAi({
    // Endpoint configuration
    projectId: 'your-project-id',
    endpointId: 'your-endpoint-id',  // From Vertex AI console
    inputTileSize: [256, 256],       // Patch size for prediction

    // Output specification
    outputBands: {
      'predictions': {
        'type': ee.PixelType.float(),
        'dimensions': [256, 256, 9]  // 256x256x9 for 9 classes
      }
    },

    // Model configuration
    inputShape: [256, 256, 7],  // Must match training input
    outputShape: [256, 256, 9]  // Must match model output
  });

  print('✓ Vertex AI model loaded');
  print('  Endpoint: your-endpoint-id');
  print('  Input: 256x256x7');
  print('  Output: 256x256x9');

} catch(err) {
  print('Error loading model: ' + err);
  print('Make sure:');
  print('  - Endpoint is deployed (green status)');
  print('  - Project ID is correct');
  print('  - Endpoint ID is correct');
}

// === 4. Prepare Data for Prediction ===
// Normalize bands to match training preprocessing

function normalize_for_prediction(image) {
  // Normalize to [0, 1] (Sentinel-2 is in [0, 10000])
  var normalized = image.divide(10000.0);

  // Clip to valid range
  normalized = normalized.clip(0.0, 1.0);

  return normalized;
}

var input_image = normalize_for_prediction(image_with_ndvi);

print('\nInput image normalized');

// === 5. Make Prediction (Method 1: Built-in) ===

print('\n--- 5. Making Prediction ---');

try {
  var predictions = model.predictImage(input_image.toFloat());

  print('✓ Prediction successful');
  print('  Shape:', predictions.bandNames().length().getInfo(), 'bands');

  // Get the class with highest probability
  var predicted_class = predictions.reduce(ee.Reducer.argmax()).rename('class');

  // Get the maximum probability
  var probability = predictions.reduce(ee.Reducer.max()).rename('probability');

  // Visualize
  Map.addLayer(
    predicted_class.clip(roi),
    {min: 0, max: 8, palette: ['blue', 'green', 'lightgreen', 'purple', 'orange',
                                 'tan', 'red', 'gray', 'lightgray']},
    'Predicted Land Cover'
  );

  Map.addLayer(
    probability.clip(roi),
    {min: 0, max: 1, palette: ['red', 'yellow', 'green']},
    'Prediction Confidence'
  );

} catch(err) {
  print('Prediction error: ' + err);
}

// === 6. Alternative: REST API Method (Python Backend) ===

print('\n--- Method 2: REST API (For Production) ---');

print("""
For production, call Vertex AI from Python backend:

import requests
import google.auth
import json
import base64
import numpy as np

credentials, project = google.auth.default()

# Prepare request
endpoint = f'https://us-central1-aiplatform.googleapis.com/v1/projects/{project}/locations/us-central1/endpoints/YOUR_ENDPOINT_ID:predict'

# Create test instance (256x256x7 image)
test_image = np.random.rand(256, 256, 7).tolist()

request_body = {
    'instances': [test_image]
}

# Make prediction
headers = {'Authorization': f'Bearer {credentials.token}'}
response = requests.post(endpoint, json=request_body, headers=headers)

predictions = response.json()['predictions']
# predictions[0] = [256, 256, 9] probability map
""");

// === 7. Post-process Predictions ===

print('\n--- 7. Post-processing ---');

// Filter low-confidence predictions
var confidence_threshold = 0.6;
var high_confidence = probability.gte(confidence_threshold);

// Mask low confidence
var final_prediction = predicted_class.updateMask(high_confidence);

Map.addLayer(
  final_prediction.clip(roi),
  {min: 0, max: 8, palette: ['blue', 'green', 'lightgreen', 'purple', 'orange',
                              'tan', 'red', 'gray', 'lightgray']},
  'Final Prediction (>60% confidence)'
);

// === 8. Per-Class Statistics ===

print('\n--- 8. Per-Class Statistics ---');

var class_names = [
  'water', 'trees', 'grass', 'flooded_veg', 'crops',
  'shrub', 'built', 'bare', 'snow'
];

// Calculate area per class
var area_image = ee.Image.pixelArea().divide(1e6);  // sq km

var class_area = predicted_class.eq(ee.List.sequence(0, 8))
    .rename(class_names)
    .multiply(area_image);

var area_stats = class_area.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e13
});

print('Land Cover Area (sq km):');
for (var i = 0; i < class_names.length; i++) {
  var area = area_stats.get(class_names[i]).getInfo();
  print('  ' + class_names[i] + ': ' + area.toFixed(2));
}

// === 9. Comparison with Dynamic World ===

print('\n--- 9. Comparison with Dynamic World ---');

var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate(year + '-01-01', year + '-06-30')
    .filterBounds(roi)
    .select('label')
    .mode();

// Confusion-like analysis
var agreement = predicted_class.eq(dw);
var agreement_pct = agreement.multiply(area_image)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 10,
      maxPixels: 1e13
    })
    .get('constant')
    .getInfo();

var total_area = roi.area().divide(1e6).getInfo();
var agreement_percentage = (agreement_pct / total_area * 100).toFixed(1);

print('Agreement with Dynamic World: ' + agreement_percentage + '%');

Map.addLayer(
  dw,
  {min: 0, max: 8, palette: ['blue', 'green', 'lightgreen', 'purple', 'orange',
                              'tan', 'red', 'gray', 'lightgray']},
  'Dynamic World (Reference)'
);

// === 10. Export Predictions ===

print('\n--- 10. Export Results ---');

Export.image.toDrive({
  image: predicted_class.byte(),
  description: 'unet_prediction_bangkok',
  region: roi,
  scale: 10,
  fileFormat: 'GeoTIFF'
});

Export.image.toDrive({
  image: probability.float(),
  description: 'unet_confidence_bangkok',
  region: roi,
  scale: 10,
  fileFormat: 'GeoTIFF'
});

print('Export tasks submitted');

// === 11. Endpoint Management ===

print('\n--- 11. Vertex AI Endpoint Management ---');

print("""
To manage endpoint:

1. Monitor Performance:
   - Go to Vertex AI Endpoints console
   - Check latency, throughput
   - Monitor costs

2. Update Auto-scaling:
   - Min replicas (usually 1)
   - Max replicas (10+ for high volume)
   - CPU/memory thresholds

3. Deploy New Model Version:
   - Retrain on new data
   - Upload new model
   - Deploy to same endpoint
   - Route traffic gradually (canary deployment)

4. Undeploy when done:
   - endpoint.undeploy(model_id)
   - Prevents unnecessary costs

5. Delete Endpoint:
   - Only after testing complete
   - Cannot recover endpoint

Cost Optimization:
  - Use batch prediction for bulk processing
  - Reduce max replicas during off-hours
  - Monitor prediction latency
""");

// === 12. Troubleshooting ===

print('\n--- 12. Common Issues ---');

print("""
Issue 1: "Endpoint not found"
  - Check endpoint ID in Vertex AI console
  - Verify project ID is correct
  - Ensure endpoint is deployed (green status)

Issue 2: "Timeout or slow predictions"
  - Check endpoint replicas (may be scaling up)
  - Verify image size matches training (256x256)
  - Check GEE to Vertex AI network connectivity

Issue 3: "Prediction quality poor"
  - Verify training data was representative
  - Check image preprocessing matches training
  - Validate with Dynamic World reference
  - May need more training data

Issue 4: "Model size too large"
  - Consider model compression (quantization)
  - Use TensorFlow Lite for mobile
  - Deploy multiple smaller models
""");

// === 13. Advanced: Batch Prediction ===

print('\n--- 13. Batch Prediction ---');

print("""
For large-scale predictions over entire regions:

1. Use Vertex AI Batch Prediction API
   - Input: Large GeoTIFF or TFRecord files
   - Output: Predictions written to GCS
   - More cost-effective than online endpoint

2. Python script:
   aiplatform.BatchPredictionJob.create(
       display_name='batch_prediction_job',
       model_name=model_name,
       instances_format='tf-record',
       predictions_format='tf-record',
       input_config={
           'gcs_source': 'gs://bucket/input/*.tfrecord'
       },
       output_config={
           'gcs_destination': 'gs://bucket/output/'
       }
   ).submit()

3. Advantages:
   - Cheaper per prediction
   - No real-time latency constraints
   - Automatic scaling
""");

// === 14. Production Deployment Checklist ===

print('\n--- 14. Production Checklist ---');

print("""
Before deploying to production:

[ ] Model validation:
    - Test on validation set
    - Compare with baselines
    - Verify performance metrics

[ ] Endpoint testing:
    - Test predictions with various inputs
    - Monitor latency
    - Check error handling

[ ] Cost optimization:
    - Estimate monthly costs
    - Set up billing alerts
    - Configure auto-scaling

[ ] Monitoring:
    - Set up Cloud Monitoring
    - Create dashboards
    - Set up alerts

[ ] Documentation:
    - Model card (architecture, data, limitations)
    - Endpoint documentation
    - API specifications

[ ] Security:
    - Restrict endpoint access
    - Use service accounts
    - Encrypt data in transit

[ ] Disaster recovery:
    - Backup model and code
    - Document recovery procedures
    - Test recovery process
""");

print('\n=== Complete Vertex AI Workflow ===');
print('✓ Data export (GEE → TFRecord)');
print('✓ Model training (Vertex AI)');
print('✓ Model deployment (Vertex AI Endpoint)');
print('✓ Predictions (GEE integration)');
