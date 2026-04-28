#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ch10_03_vertex_ai_export.py
Export Training Data from GEE as TFRecord
เตรียมข้อมูลจาก GEE สำหรับ Vertex AI Deep Learning

ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
วันที่: 2025
"""

import ee
import sys

print("=== Export Training Data from GEE to TFRecord ===\n")

# ============================================
# 1. Initialize GEE
# ============================================

try:
    ee.Initialize(project='your-project-id')
    print("✓ GEE initialized")
except Exception as e:
    print(f"Error initializing GEE: {e}")
    print("Make sure you have:")
    print("  - earthengine-api installed: pip install earthengine-api")
    print("  - GCP project with Earth Engine enabled")
    print("  - Authenticated with: earthengine authenticate")
    sys.exit(1)

# ============================================
# 2. Define Study Area and Dates
# ============================================

# Area: Bangkok, Thailand
roi = ee.Geometry.Rectangle([100.0, 13.5, 101.0, 14.5])
start_date = '2025-01-01'
end_date = '2025-06-30'

print(f"Study area: Bangkok bbox {roi.bounds().getInfo()['coordinates']}")
print(f"Date range: {start_date} to {end_date}")

# ============================================
# 3. Load and Prepare Sentinel-2 Data
# ============================================

# Load Sentinel-2 SR Harmonized
image = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(start_date, end_date)
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .median()
    .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']))

print("\nSelected bands: B2, B3, B4, B8, B11, B12")
print("Bands shape (30m resolution):", image.bandNames().getInfo())

# Add NDVI as additional feature
ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
image = image.addBands(ndvi)

print("Added NDVI band")
print("Total bands:", image.bandNames().length().getInfo())

# ============================================
# 4. Create Land Cover Labels
# ============================================

# Use Dynamic World as labels
labels = (ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate(start_date, end_date)
    .filterBounds(roi)
    .select('label')
    .mode()
    .rename('label'))

print("\nLabels source: Dynamic World")
print("Classes: 0-8 (9 land cover classes)")

# ============================================
# 5. Combine Image and Labels
# ============================================

training_image = image.addBands(labels)

print("Training image prepared")
print("Total bands:", training_image.bandNames().length().getInfo())

# ============================================
# 6. Export as TFRecord
# ============================================

print("\n=== Exporting to TFRecord ===")

# Export parameters
export_task = ee.batch.Export.image.toCloudStorage(
    image=training_image,
    description='sentinel2_training_data',
    bucket='your-gcs-bucket',  # ← Replace with your GCS bucket
    fileNamePrefix='gee_training/sentinel2_bangkok',
    region=roi,
    scale=10,  # Sentinel-2 native resolution
    fileFormat='TFRecord',
    formatOptions={
        'patchDimensions': [256, 256],   # 256x256 pixel patches
        'maxFileSize': 104857600,         # 100 MB per file
        'compressed': True                 # gzip compression
    }
)

print("\nTFRecord export configuration:")
print(f"  Bucket: your-gcs-bucket/gee_training/")
print(f"  Format: TFRecord")
print(f"  Patch size: 256x256 pixels")
print(f"  Scale: 10m (native Sentinel-2)")
print(f"  Compression: gzip")

# Start export
export_task.start()
print(f"\n✓ Export task started: {export_task.id}")
print("Status:", export_task.status())

# ============================================
# 7. Monitor Export Progress
# ============================================

print("\nTo check progress:")
print("  1. Go to https://code.earthengine.google.com")
print("  2. Click 'Tasks' tab")
print("  3. Monitor 'sentinel2_training_data' task")
print("  4. Or use: earthengine task list")

# ============================================
# 8. Alternative: Export with Validation Split
# ============================================

print("\n=== Alternative: Export with Train/Val Split ===")

# Add a random column for train/validation split
training_image_split = training_image.randomColumn('random')

# Training data (80%)
training_export = ee.batch.Export.image.toCloudStorage(
    image=training_image_split.updateMask(
        training_image_split.select('random').lte(0.8)
    ),
    description='sentinel2_training_set',
    bucket='your-gcs-bucket',
    fileNamePrefix='gee_training/train',
    region=roi,
    scale=10,
    fileFormat='TFRecord',
    formatOptions={
        'patchDimensions': [256, 256],
        'maxFileSize': 104857600,
        'compressed': True
    }
)

# Validation data (20%)
validation_export = ee.batch.Export.image.toCloudStorage(
    image=training_image_split.updateMask(
        training_image_split.select('random').gt(0.8)
    ),
    description='sentinel2_validation_set',
    bucket='your-gcs-bucket',
    fileNamePrefix='gee_training/validation',
    region=roi,
    scale=10,
    fileFormat='TFRecord',
    formatOptions={
        'patchDimensions': [256, 256],
        'maxFileSize': 104857600,
        'compressed': True
    }
)

print("Training set export task created")
print("Validation set export task created")
print("(Start these separately when needed)")

# ============================================
# 9. TFRecord Format Details
# ============================================

print("\n=== TFRecord Format Details ===")
print("""
TFRecord is TensorFlow's native format:
  • Efficient binary format
  • Supports large datasets
  • Works natively with tf.data API
  • Compresses well

GEE TFRecord export includes:
  • Patches of specified size (256x256)
  • Serialized as tf.train.Example protos
  • Includes all selected bands
  • One .tfrecord file per patch

Output files:
  - gs://bucket/gee_training/sentinel2_bangkok.tfrecord.gz
  - Multiple files if >maxFileSize (104MB)
  - Each file is independently readable
""")

# ============================================
# 10. GCS Setup Required
# ============================================

print("\n=== GCS Setup Required ===")
print("""
Before exporting, set up Google Cloud Storage:

1. Create GCS bucket:
   gsutil mb gs://your-gcs-bucket

2. Set permissions:
   - GCP project must have Earth Engine enabled
   - Service account must have Storage permissions
   - Or use application default credentials

3. Verify access:
   gsutil ls gs://your-gcs-bucket

4. After export, verify:
   gsutil ls -r gs://your-bucket/gee_training/
""")

# ============================================
# 11. Next Steps: Use in Vertex AI
# ============================================

print("\n=== Next Steps: Use in Vertex AI ===")
print("""
After TFRecord export:

1. Monitor export completion (GEE Tasks panel)

2. Verify files in GCS:
   gsutil ls -h gs://your-bucket/gee_training/

3. Parse TFRecord in Python:
   See Ch10_04_vertex_ai_train.py

4. Train model on Vertex AI:
   Use tf.data.TFRecordDataset to load data
   Build U-Net or other model
   Train on Vertex AI GPU

5. Deploy model:
   Upload to Vertex AI Model Registry
   Create endpoint
   Make predictions
""")

# ============================================
# 12. Example: Parse TFRecord Later
# ============================================

print("\n=== Example: Parse TFRecord (for reference) ===")
print("""
# Load TFRecord in training script
def parse_tfrecord(example):
    features = {
        'B2': tf.io.FixedLenFeature([256*256], tf.float32),
        'B3': tf.io.FixedLenFeature([256*256], tf.float32),
        'B4': tf.io.FixedLenFeature([256*256], tf.float32),
        'B8': tf.io.FixedLenFeature([256*256], tf.float32),
        'B11': tf.io.FixedLenFeature([256*256], tf.float32),
        'B12': tf.io.FixedLenFeature([256*256], tf.float32),
        'NDVI': tf.io.FixedLenFeature([256*256], tf.float32),
        'label': tf.io.FixedLenFeature([256*256], tf.int64),
    }

    parsed = tf.io.parse_single_example(example, features)

    # Reshape to [256, 256, 7]
    image = tf.stack([
        tf.reshape(parsed['B2'], [256, 256]),
        tf.reshape(parsed['B3'], [256, 256]),
        tf.reshape(parsed['B4'], [256, 256]),
        tf.reshape(parsed['B8'], [256, 256]),
        tf.reshape(parsed['B11'], [256, 256]),
        tf.reshape(parsed['B12'], [256, 256]),
        tf.reshape(parsed['NDVI'], [256, 256]),
    ], axis=-1)

    label = tf.reshape(parsed['label'], [256, 256])

    return image, label

# Load dataset
dataset = tf.data.TFRecordDataset(
    'gs://bucket/gee_training/*.tfrecord.gz',
    compression_type='GZIP'
)
dataset = dataset.map(parse_tfrecord).batch(16)
""")

print("\n=== Export Configuration Summary ===")
print(f"""
Task ID: sentinel2_training_data
Source: GEE ImageCollection
Bands: B2, B3, B4, B8, B11, B12, NDVI, label (8 total)
Region: Bangkok (100-101°E, 13.5-14.5°N)
Date: {start_date} to {end_date}
Scale: 10m
Patch size: 256x256 pixels
Format: TFRecord (gzipped)
Output: gs://your-gcs-bucket/gee_training/

Status: {export_task.status()}
Next: Monitor in GEE Code Editor Tasks panel
""")
