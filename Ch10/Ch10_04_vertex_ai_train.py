#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ch10_04_vertex_ai_train.py
Train U-Net Model with TensorFlow on Vertex AI
โมเดล Deep Learning สำหรับ semantic segmentation

ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
วันที่: 2025
"""

import tensorflow as tf
import numpy as np
from tensorflow import keras
from tensorflow.keras import layers
import sys

print("=== Train U-Net for Land Cover Segmentation ===\n")

# ============================================
# 1. TFRecord Parsing
# ============================================

print("--- 1. TFRecord Parsing ---")

def parse_tfrecord(example):
    """Parse TFRecord examples from GEE export"""

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

    # Reshape bands to [256, 256]
    image = tf.stack([
        tf.reshape(parsed['B2'], [256, 256]),
        tf.reshape(parsed['B3'], [256, 256]),
        tf.reshape(parsed['B4'], [256, 256]),
        tf.reshape(parsed['B8'], [256, 256]),
        tf.reshape(parsed['B11'], [256, 256]),
        tf.reshape(parsed['B12'], [256, 256]),
        tf.reshape(parsed['NDVI'], [256, 256]),
    ], axis=-1)  # [256, 256, 7]

    label = tf.reshape(parsed['label'], [256, 256])

    return image, label

print("✓ Parse function defined")

# ============================================
# 2. Load and Preprocess Dataset
# ============================================

print("\n--- 2. Load Dataset ---")

# Note: In real deployment, load from GCS
# For demonstration, we show the structure

try:
    # Load from GCS TFRecord files
    dataset = tf.data.TFRecordDataset(
        'gs://your-bucket/gee_training/train*.tfrecord.gz',
        compression_type='GZIP',
        num_parallel_reads=4  # Parallel file reading
    )

    dataset = dataset.map(parse_tfrecord, num_parallel_calls=4)

    print("✓ Dataset loaded from GCS")

except Exception as e:
    print(f"! Could not load from GCS: {e}")
    print("  In production, this would load from your GCS bucket")

# ============================================
# 3. Data Preprocessing
# ============================================

print("\n--- 3. Preprocessing ---")

def normalize_image(image, label):
    """Normalize image bands"""
    # Sentinel-2 bands are in [0, 10000] range
    image = tf.cast(image, tf.float32) / 10000.0

    # Clamp to valid range
    image = tf.clip_by_value(image, 0.0, 1.0)

    # Labels are already in [0, 8]
    label = tf.cast(label, tf.int32)

    return image, label

print("✓ Preprocessing function defined")

# ============================================
# 4. Define U-Net Architecture
# ============================================

print("\n--- 4. U-Net Model ---")

def unet_model(input_shape=(256, 256, 7), num_classes=9):
    """
    U-Net architecture for semantic segmentation
    Encoder-decoder with skip connections
    """

    inputs = keras.Input(shape=input_shape)

    # === ENCODER ===
    # Block 1
    c1 = layers.Conv2D(64, (3, 3), padding='same', activation='relu')(inputs)
    c1 = layers.Conv2D(64, (3, 3), padding='same', activation='relu')(c1)
    p1 = layers.MaxPooling2D((2, 2))(c1)

    # Block 2
    c2 = layers.Conv2D(128, (3, 3), padding='same', activation='relu')(p1)
    c2 = layers.Conv2D(128, (3, 3), padding='same', activation='relu')(c2)
    p2 = layers.MaxPooling2D((2, 2))(c2)

    # Block 3
    c3 = layers.Conv2D(256, (3, 3), padding='same', activation='relu')(p2)
    c3 = layers.Conv2D(256, (3, 3), padding='same', activation='relu')(c3)
    p3 = layers.MaxPooling2D((2, 2))(c3)

    # Block 4
    c4 = layers.Conv2D(512, (3, 3), padding='same', activation='relu')(p3)
    c4 = layers.Conv2D(512, (3, 3), padding='same', activation='relu')(c4)
    p4 = layers.MaxPooling2D((2, 2))(c4)

    # === BOTTLENECK ===
    b = layers.Conv2D(1024, (3, 3), padding='same', activation='relu')(p4)
    b = layers.Conv2D(1024, (3, 3), padding='same', activation='relu')(b)

    # === DECODER ===
    # Block 4 up
    u4 = layers.UpSampling2D((2, 2))(b)
    u4 = layers.concatenate([u4, c4], axis=-1)
    c4_up = layers.Conv2D(512, (3, 3), padding='same', activation='relu')(u4)
    c4_up = layers.Conv2D(512, (3, 3), padding='same', activation='relu')(c4_up)

    # Block 3 up
    u3 = layers.UpSampling2D((2, 2))(c4_up)
    u3 = layers.concatenate([u3, c3], axis=-1)
    c3_up = layers.Conv2D(256, (3, 3), padding='same', activation='relu')(u3)
    c3_up = layers.Conv2D(256, (3, 3), padding='same', activation='relu')(c3_up)

    # Block 2 up
    u2 = layers.UpSampling2D((2, 2))(c3_up)
    u2 = layers.concatenate([u2, c2], axis=-1)
    c2_up = layers.Conv2D(128, (3, 3), padding='same', activation='relu')(u2)
    c2_up = layers.Conv2D(128, (3, 3), padding='same', activation='relu')(c2_up)

    # Block 1 up
    u1 = layers.UpSampling2D((2, 2))(c2_up)
    u1 = layers.concatenate([u1, c1], axis=-1)
    c1_up = layers.Conv2D(64, (3, 3), padding='same', activation='relu')(u1)
    c1_up = layers.Conv2D(64, (3, 3), padding='same', activation='relu')(c1_up)

    # === OUTPUT ===
    outputs = layers.Conv2D(num_classes, (1, 1), activation='softmax')(c1_up)

    model = keras.Model(inputs, outputs)
    return model

print("✓ U-Net model defined")

# ============================================
# 5. Create Model Instance
# ============================================

print("\n--- 5. Instantiate Model ---")

model = unet_model(input_shape=(256, 256, 7), num_classes=9)
model.summary()

# ============================================
# 6. Compile Model
# ============================================

print("\n--- 6. Compile Model ---")

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=1e-4),
    loss=keras.losses.SparseCategoricalCrossentropy(),
    metrics=[
        keras.metrics.SparseCategoricalAccuracy(name='accuracy'),
        keras.metrics.MeanIoU(num_classes=9, name='miou')  # Mean Intersection over Union
    ]
)

print("✓ Model compiled")
print("  Optimizer: Adam (lr=1e-4)")
print("  Loss: SparseCategoricalCrossentropy")
print("  Metrics: Accuracy, mIoU")

# ============================================
# 7. Data Pipeline
# ============================================

print("\n--- 7. Data Pipeline ---")

# In production, load from GCS TFRecord
# For demo, create dummy data

batch_size = 16

# Preprocess and batch
# dataset = dataset.map(normalize_image, num_parallel_calls=4)
# dataset = dataset.shuffle(buffer_size=100)
# dataset = dataset.batch(batch_size)
# dataset = dataset.prefetch(tf.data.AUTOTUNE)

# For demonstration, create synthetic data
train_images = np.random.rand(100, 256, 256, 7).astype(np.float32)
train_labels = np.random.randint(0, 9, (100, 256, 256)).astype(np.int32)

dataset = tf.data.Dataset.from_tensor_slices((train_images, train_labels))
dataset = dataset.batch(batch_size).prefetch(tf.data.AUTOTUNE)

print(f"✓ Data pipeline created")
print(f"  Batch size: {batch_size}")
print(f"  Number of batches: {len(dataset)}")

# ============================================
# 8. Training
# ============================================

print("\n--- 8. Training ---")

# Callbacks
callbacks = [
    keras.callbacks.ModelCheckpoint(
        'gs://your-bucket/models/unet_best.h5',
        monitor='miou',
        save_best_only=True,
        mode='max'
    ),
    keras.callbacks.EarlyStopping(
        monitor='loss',
        patience=5,
        restore_best_weights=True
    ),
    keras.callbacks.ReduceLROnPlateau(
        monitor='loss',
        factor=0.5,
        patience=3,
        min_lr=1e-6
    )
]

print("Training configuration:")
print("  Epochs: 50")
print("  Batch size: 16")
print("  Callbacks: ModelCheckpoint, EarlyStopping, ReduceLROnPlateau")

# Train model
history = model.fit(
    dataset,
    epochs=50,
    callbacks=callbacks,
    validation_split=0.2,
    verbose=1
)

print("\n✓ Training complete")

# ============================================
# 9. Evaluate Model
# ============================================

print("\n--- 9. Evaluation ---")

eval_result = model.evaluate(dataset)
print(f"\nEvaluation Results:")
print(f"  Loss: {eval_result[0]:.4f}")
print(f"  Accuracy: {eval_result[1]:.4f}")
print(f"  mIoU: {eval_result[2]:.4f}")

# ============================================
# 10. Save Model
# ============================================

print("\n--- 10. Save Model ---")

# Save in SavedModel format (Vertex AI compatible)
model.save('gs://your-bucket/models/unet_landcover')
print("✓ Model saved to GCS")
print("  gs://your-bucket/models/unet_landcover")

# Also save in H5 format for reference
model.save('gs://your-bucket/models/unet_landcover.h5')
print("  gs://your-bucket/models/unet_landcover.h5")

# ============================================
# 11. Model Info for Deployment
# ============================================

print("\n--- 11. Model Information ---")

print(f"""
Model: U-Net for Land Cover Segmentation
Architecture:
  Input: 256x256x7 (Sentinel-2 bands + NDVI)
  Output: 256x256x9 (9 land cover classes)
  Parameters: {model.count_params():,}

Training Data:
  Source: Google Earth Engine (Sentinel-2)
  Region: Bangkok, Thailand
  Resolution: 10m
  Date: 2025-01-01 to 2025-06-30

Output Classes:
  0 = water
  1 = trees
  2 = grass
  3 = flooded_veg
  4 = crops
  5 = shrub_scrub
  6 = built
  7 = bare
  8 = snow_ice

Next Step: Deploy to Vertex AI Endpoint
  See: Ch10_05_vertex_ai_deploy.py
""")

# ============================================
# 12. Training Metrics Plot (Optional)
# ============================================

print("\n--- 12. Training History ---")

if history is not None:
    print("Training metrics available:")
    for key in history.history.keys():
        print(f"  - {key}")
    print("\nTo plot: use matplotlib or tensorboard")

print("\n=== Training Complete ===")
