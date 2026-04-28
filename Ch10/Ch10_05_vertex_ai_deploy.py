#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ch10_05_vertex_ai_deploy.py
Deploy Model on Vertex AI
อัพโหลดและ deploy deep learning model บน Vertex AI

ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
วันที่: 2025
"""

import google.cloud.aiplatform as aiplatform
from google.cloud import storage
import sys

print("=== Deploy U-Net Model to Vertex AI ===\n")

# ============================================
# 1. Setup Vertex AI
# ============================================

print("--- 1. Initialize Vertex AI ---")

try:
    # Initialize Vertex AI
    aiplatform.init(
        project='your-project-id',
        location='us-central1',  # Change as needed
        staging_bucket='gs://your-bucket/vertex-ai-staging'
    )
    print("✓ Vertex AI initialized")
    print("  Project: your-project-id")
    print("  Location: us-central1")
    print("  Staging: gs://your-bucket/vertex-ai-staging")

except Exception as e:
    print(f"Error: {e}")
    print("Make sure you have:")
    print("  - google-cloud-aiplatform installed")
    print("  - GCP project with Vertex AI enabled")
    print("  - Authentication set up")
    sys.exit(1)

# ============================================
# 2. Verify Model Artifact
# ============================================

print("\n--- 2. Verify Model Artifact ---")

model_uri = 'gs://your-bucket/models/unet_landcover'

try:
    storage_client = storage.Client()
    bucket_name = 'your-bucket'
    bucket = storage_client.bucket(bucket_name)

    blobs = bucket.list_blobs(prefix='models/unet_landcover/')
    blob_list = list(blobs)

    if blob_list:
        print(f"✓ Found {len(blob_list)} model files:")
        for blob in blob_list[:5]:  # Show first 5
            print(f"  - {blob.name} ({blob.size / 1e6:.2f} MB)")
    else:
        print("! No model files found in GCS")
        print(f"  Expected: {model_uri}")

except Exception as e:
    print(f"Error listing GCS files: {e}")

# ============================================
# 3. Upload Model to Vertex AI
# ============================================

print("\n--- 3. Upload Model to Vertex AI ---")

try:
    model = aiplatform.Model.upload(
        display_name='unet-landcover-sentinel2',
        artifact_uri=model_uri,
        serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-12:latest',
        # For GPU: 'us-docker.pkg.dev/vertex-ai/prediction/tf2-gpu.2-12:latest',
        description='U-Net for Sentinel-2 land cover classification (Bangkok)',
        parameters={
            'model_type': 'semantic-segmentation',
            'input_shape': [256, 256, 7],
            'output_classes': 9,
            'source': 'google-earth-engine'
        }
    )

    print("✓ Model uploaded to Vertex AI Model Registry")
    print(f"  Display name: {model.display_name}")
    print(f"  Model ID: {model.resource_name}")
    print(f"  Status: {model.state.name}")

except Exception as e:
    print(f"Error uploading model: {e}")
    print("\nMake sure:")
    print("  - Model files are in GCS")
    print("  - GCS bucket is accessible")
    print("  - Vertex AI has permissions")

# ============================================
# 4. Create Endpoint
# ============================================

print("\n--- 4. Create Endpoint ---")

try:
    endpoint = aiplatform.Endpoint.create(
        display_name='unet-landcover-endpoint'
    )

    print("✓ Endpoint created")
    print(f"  Endpoint name: {endpoint.display_name}")
    print(f"  Endpoint ID: {endpoint.resource_name}")
    print(f"  URI: {endpoint.uri}")

except Exception as e:
    print(f"Error creating endpoint: {e}")

# ============================================
# 5. Deploy Model to Endpoint
# ============================================

print("\n--- 5. Deploy Model to Endpoint ---")

try:
    deployed_model = endpoint.deploy(
        model=model,
        display_name='unet-landcover-deployment',
        machine_type='n1-standard-4',  # CPU: 4 vCPU, 15 GB RAM
        # For GPU: machine_type='n1-standard-4', accelerator_type='NVIDIA_TESLA_K80'
        min_replica_count=1,
        max_replica_count=3,
        traffic_percentage=100,
        deploy_request_timeout=3600  # 1 hour timeout
    )

    print("✓ Model deployed to endpoint")
    print(f"  Deployed model ID: {deployed_model.id}")
    print(f"  Status: Deploying (may take 10-15 minutes)")
    print(f"  Auto-scaling: 1-3 replicas")

except Exception as e:
    print(f"Error deploying model: {e}")

# ============================================
# 6. Wait for Deployment
# ============================================

print("\n--- 6. Monitor Deployment ---")

print("""
Deployment in progress...

To check status:
  1. Go to: https://console.cloud.google.com/vertex-ai/endpoints
  2. Select your project
  3. Click on 'unet-landcover-endpoint'
  4. View deployment status

Or use Python:
  endpoint.wait()
""")

try:
    endpoint.wait()
    print("✓ Deployment complete!")

except Exception as e:
    print(f"Note: {e}")

# ============================================
# 7. Test Prediction (After Deployment)
# ============================================

print("\n--- 7. Test Prediction ---")

print("""
Once endpoint is ready (green status), test with:

import numpy as np
import google.cloud.aiplatform as aiplatform

# Load test image (256x256x7)
test_image = np.random.rand(1, 256, 256, 7).astype(np.float32)

# Make prediction
predictions = endpoint.predict(instances=[test_image.tolist()])

# Output: [1, 256, 256, 9] - land cover probability map
""")

# ============================================
# 8. Deployment Configuration Summary
# ============================================

print("\n--- 8. Deployment Summary ---")

deployment_summary = {
    'Model': 'U-Net Landcover',
    'Framework': 'TensorFlow 2.12',
    'Input': '256x256x7 (Sentinel-2 + NDVI)',
    'Output': '256x256x9 (Land cover probabilities)',
    'Endpoint': 'unet-landcover-endpoint',
    'Machine': 'n1-standard-4 (CPU)',
    'Min Replicas': 1,
    'Max Replicas': 3,
    'Auto-scaling': 'Enabled',
    'Estimated Cost': '$0.25-0.75/hour (depending on traffic)'
}

for key, value in deployment_summary.items():
    print(f"{key:15}: {value}")

# ============================================
# 9. Next Steps
# ============================================

print("\n--- 9. Next Steps ---")

next_steps = """
1. Monitor Endpoint
   - Check status in Vertex AI console
   - Wait for "green" status (ready)

2. Test Predictions
   - Use endpoint.predict() with test images
   - Verify output format

3. Set Up Auto-scaling
   - Configure min/max replicas
   - Set traffic thresholds

4. Integration with GEE
   - See Ch10_06_vertex_ai_predict.js
   - Call endpoint from GEE JavaScript

5. Monitor Performance
   - Check latency, throughput
   - Monitor costs
   - Adjust replicas as needed

6. Update Model
   - Retrain with new data
   - Upload new version
   - Deploy to endpoint
   - No downtime with traffic routing

7. Clean Up (When Done)
   - Undeploy model: endpoint.undeploy(model_id)
   - Delete endpoint: endpoint.delete()
   - This stops charges
"""

print(next_steps)

# ============================================
# 10. Vertex AI Console Links
# ============================================

print("\n--- 10. Console Links ---")

console_links = """
Important GCP Console Links:

1. Vertex AI Models:
   https://console.cloud.google.com/vertex-ai/models

2. Vertex AI Endpoints:
   https://console.cloud.google.com/vertex-ai/endpoints

3. Vertex AI Predictions:
   https://console.cloud.google.com/vertex-ai/predictions

4. Cloud Monitoring (Metrics):
   https://console.cloud.google.com/monitoring

5. Cloud Billing:
   https://console.cloud.google.com/billing

6. GCS Buckets:
   https://console.cloud.google.com/storage
"""

print(console_links)

# ============================================
# 11. Cost Estimation
# ============================================

print("\n--- 11. Cost Estimation ---")

cost_info = """
Vertex AI Pricing (as of 2025):

Predictions:
  - Per 1000 predictions: $0.50
  - Per hour (online): $0.25-0.75 depending on machine

Example Costs:
  - 10,000 predictions/month: $5
  - Always-on endpoint: $60-180/month
  - High traffic (millions): Custom pricing

Optimization:
  - Use batch prediction for bulk processing
  - Set aggressive auto-scaling limits
  - Monitor unused endpoints
  - Consider Cloud Functions for simple predictions
"""

print(cost_info)

print("\n=== Deployment Configuration Complete ===")
print(f"\nEndpoint is now deploying.")
print(f"Check status: https://console.cloud.google.com/vertex-ai/endpoints")
print(f"Next: See Ch10_06_vertex_ai_predict.js for GEE integration")
