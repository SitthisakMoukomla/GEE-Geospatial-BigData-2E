#!/usr/bin/env python3
"""
บทที่ 12: GEE Python Quick Reference
=====================================

Ch12_02_gee_cheatsheet.py — GEE Python/geemap Cheatsheet

Complete reference of common GEE operations in Python
All code snippets can run in Google Colab or Jupyter

Topics:
1. Load Data (Image, ImageCollection, FeatureCollection)
2. Filter Data (Date, Spatial, Property)
3. Cloud Masking
4. Scale Factors & Unit Conversion
5. Calculate Indices (NDVI, NDBI, NDWI)
6. Export Data (Drive, Asset, Cloud Storage)
7. Classification (Random Forest, SVM)
8. Charting & Visualization with geemap

Author: GEE Python Tutorial
Language: Thai/English
"""

import ee
import geemap
import pandas as pd
import matplotlib.pyplot as plt

# ============================================================================
# SETUP
# ============================================================================

# Authenticate & Initialize
# ee.Authenticate()  # Do once per machine
PROJECT_ID = 'your-cloud-project-id'
ee.Initialize(project=PROJECT_ID)

print("Earth Engine Python API initialized")


# ============================================================================
# 1. LOAD DATA
# ============================================================================

print("\n" + "="*70)
print("1. LOAD DATA")
print("="*70)

# Load Single Image
image = ee.Image('USGS/SRTMGL1_003')
image2 = ee.Image('COPERNICUS/S2_SR_HARMONIZED/20250101T030631_20250101T033718_T49SGD')

# Load Image Collection (multiple images over time)
s2_collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
landsat8_collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
landsat9_collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')

# Load Feature Collection (vector data)
country_boundaries = ee.FeatureCollection('FAO/GAUL/2015/level0')
cities = ee.FeatureCollection('USDOS/GEONAMES/v1/cities')

print("✓ Loaded data successfully")


# ============================================================================
# 2. FILTER DATA
# ============================================================================

print("\n" + "="*70)
print("2. FILTER DATA")
print("="*70)

# Filter by Date
filtered_date = s2_collection.filterDate('2025-01-01', '2025-06-30')
print("✓ Filter by date: 2025-01-01 to 2025-06-30")

# Filter by Bounding Box (Region of Interest)
roi = ee.Geometry.Rectangle([100.3, 13.5, 100.9, 14.0])  # Bangkok
filtered_spatial = s2_collection.filterBounds(roi)
print("✓ Filter by bounds: Bangkok area")

# Filter by Polygon/Point
point = ee.Geometry.Point(100.5, 13.75)
buffer = point.buffer(5000)  # 5km buffer
filtered_point = s2_collection.filterBounds(buffer)
print("✓ Filter by point with 5km buffer")

# Filter by Property (metadata)
low_cloud = s2_collection.filter(
    ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)
)
print("✓ Filter by cloud cover < 20%")

# Chain filters (Recommended)
filtered = (s2_collection
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(point)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))
print("✓ Chained multiple filters")


# ============================================================================
# 3. CLOUD MASKING
# ============================================================================

print("\n" + "="*70)
print("3. CLOUD MASKING")
print("="*70)

# Sentinel-2: Use QA60 band
def mask_clouds_sentinel2(image):
    """Mask clouds in Sentinel-2 image"""
    qa = image.select('QA60')
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    mask = qa.bitwiseAnd(cloud_bit_mask).eq(0) \
           .And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    return image.updateMask(mask)

s2_cloud_free = s2_collection.map(mask_clouds_sentinel2)
print("✓ Sentinel-2 cloud masking function applied")

# Landsat 8/9: Use QA_PIXEL band (Collection 2)
def mask_clouds_landsat(image):
    """Mask clouds in Landsat image"""
    qa = image.select('QA_PIXEL')
    cloud_bit_mask = 1 << 3
    shadow_bit_mask = 1 << 4
    mask = qa.bitwiseAnd(cloud_bit_mask).eq(0) \
           .And(qa.bitwiseAnd(shadow_bit_mask).eq(0))
    return image.updateMask(mask)

landsat_cloud_free = landsat8_collection.map(mask_clouds_landsat)
print("✓ Landsat cloud masking function applied")

# Simple cloud filter (alternative, less accurate)
simple_filter = (s2_collection
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .median())
print("✓ Simple cloud filter applied")


# ============================================================================
# 4. SCALE FACTORS & UNIT CONVERSION
# ============================================================================

print("\n" + "="*70)
print("4. SCALE FACTORS & UNIT CONVERSION")
print("="*70)

# Sentinel-2: Surface Reflectance (0-10000 scale)
s2_image = ee.Image('COPERNICUS/S2_SR_HARMONIZED/20250101T030631_20250101T033718_T49SGD')
s2_refl = s2_image.divide(10000)
print("✓ Sentinel-2: Divided by 10000 for reflectance [0-1]")

# Landsat 8/9 Collection 2: Surface Reflectance (0-10000 scale)
landsat_image = ee.Image('LANDSAT/LC08/C02/T1_L2/LC08_130050_20250101')
landsat_refl = landsat_image.select(['SR_B.*']).divide(10000)
print("✓ Landsat: Divided SR_B* by 10000 for reflectance")

# Landsat Temperature: ST_B10 (Thermal band)
temp_k = landsat_image.select('ST_B10')
temp_c = temp_k.subtract(273.15)  # Kelvin to Celsius
print("✓ Landsat: Converted thermal band from Kelvin to Celsius")

# Sentinel-5P: NO2 (already in mol/m² units)
no2 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2').select(
    'tropospheric_NO2_column_number_density')
print("✓ Sentinel-5P: NO2 already in mol/m² units")


# ============================================================================
# 5. CALCULATE INDICES
# ============================================================================

print("\n" + "="*70)
print("5. CALCULATE INDICES")
print("="*70)

# NDVI (Normalized Difference Vegetation Index)
ndvi = s2_image.normalizedDifference(['B8', 'B4']).rename('NDVI')
print("✓ NDVI = (B8-B4)/(B8+B4) — Vegetation monitoring")

# NDVI for Landsat
ndvi_landsat = landsat_image.normalizedDifference(
    ['SR_B5', 'SR_B4']).rename('NDVI')
print("✓ NDVI Landsat = (SR_B5-SR_B4)/(SR_B5+SR_B4)")

# NDBI (Normalized Difference Built-up Index)
ndbi = s2_image.normalizedDifference(['B11', 'B8']).rename('NDBI')
print("✓ NDBI = (B11-B8)/(B11+B8) — Built-up/Urban areas")

# NDWI (Normalized Difference Water Index)
ndwi = s2_image.normalizedDifference(['B8', 'B11']).rename('NDWI')
print("✓ NDWI = (B8-B11)/(B8+B11) — Water bodies")

# NDMI (Normalized Difference Moisture Index)
ndmi = s2_image.normalizedDifference(['B8', 'B12']).rename('NDMI')
print("✓ NDMI = (B8-B12)/(B8+B12) — Moisture/Wetness")

# NBR (Normalized Burn Ratio) - Fire detection
nbr = s2_image.normalizedDifference(['B8', 'B12']).rename('NBR')
print("✓ NBR = (B8-B12)/(B8+B12) — Burn severity")


# ============================================================================
# 6. EXPORT DATA
# ============================================================================

print("\n" + "="*70)
print("6. EXPORT DATA")
print("="*70)

# Export to Google Drive
task1 = ee.batch.Export.image.toDrive(
    image=ndvi,
    description='ndvi_bangkok_2025',
    folder='GEE_exports',
    scale=10,
    region=roi,
    maxPixels=1e13
)
task1.start()
print("✓ Task started: Export to Google Drive")

# Export to Earth Engine Asset
task2 = ee.batch.Export.image.toAsset(
    image=ndvi,
    description='ndvi_asset',
    assetId='projects/your-project/assets/ndvi_bangkok',
    scale=10,
    region=roi,
    maxPixels=1e13
)
task2.start()
print("✓ Task started: Export to EE Asset")

# Export to Google Cloud Storage
task3 = ee.batch.Export.image.toCloudStorage(
    image=ndvi,
    description='ndvi_gcs',
    bucket='your-bucket',
    fileNamePrefix='gee_exports/ndvi_bangkok',
    scale=10,
    region=roi,
    fileFormat='GeoTIFF'
)
task3.start()
print("✓ Task started: Export to Cloud Storage")

# Export FeatureCollection to Drive
features = country_boundaries.limit(10)
task4 = ee.batch.Export.table.toDrive(
    collection=features,
    description='countries_features',
    fileFormat='SHP'
)
task4.start()
print("✓ Task started: Export FeatureCollection")

# Check task status
print("\nTask status:")
print(f"  Task 1: {task1.status()}")


# ============================================================================
# 7. CLASSIFICATION
# ============================================================================

print("\n" + "="*70)
print("7. CLASSIFICATION")
print("="*70)

# Simple NDVI-based Classification
vegetation_class = (ndvi
    .where(ndvi.lt(0.3), 0)                           # Non-vegetation
    .where(ndvi.gte(0.3).And(ndvi.lt(0.5)), 1)      # Low vegetation
    .where(ndvi.gte(0.5).And(ndvi.lt(0.7)), 2)      # Moderate vegetation
    .where(ndvi.gte(0.7), 3))                        # High vegetation
print("✓ NDVI-based classification (4 classes)")

# Random Forest Classification
# Create training data (example)
training_features = ee.FeatureCollection([
    ee.Feature(ee.Geometry.Point([100.5, 13.75]), {'class': 0}),
    ee.Feature(ee.Geometry.Point([100.6, 13.76]), {'class': 1}),
])

# Sample training pixels
training = s2_image.sampleRectangles(
    collection=training_features,
    properties=['class'],
    scale=10
)

# Train classifier
classifier = ee.Classifier.smileRandomForest(100).train(
    features=training,
    classProperty='class',
    inputProperties=['B2', 'B3', 'B4', 'B5', 'B8', 'B11']
)

# Apply classification
classified = s2_image.classify(classifier)
print("✓ Random Forest classifier trained and applied")


# ============================================================================
# 8. VISUALIZATION WITH GEEMAP
# ============================================================================

print("\n" + "="*70)
print("8. VISUALIZATION WITH GEEMAP")
print("="*70)

# Create map
Map = geemap.Map(center=[13.75, 100.5], zoom=10)

# Visualization parameters
ndvi_vis = {
    'min': -1,
    'max': 1,
    'palette': ['red', 'yellow', 'green']
}

true_color_vis = {
    'bands': ['B4', 'B3', 'B2'],
    'min': 0,
    'max': 3000,
    'gamma': 1.2
}

# Add layers
Map.addLayer(ndvi, ndvi_vis, 'NDVI')
Map.addLayer(s2_image, true_color_vis, 'True Color')
Map.addLayer(vegetation_class, {'min': 0, 'max': 3, 'palette': ['red', 'yellow', 'lime', 'green']}, 'Vegetation Class')

# Add basemaps
Map.add_basemap('CartoDB positron')
Map.add_basemap('SATELLITE')

print("✓ Interactive map with 3 layers created")


# ============================================================================
# 9. STATISTICS & CHARTING
# ============================================================================

print("\n" + "="*70)
print("9. STATISTICS & CHARTING")
print("="*70)

# Get statistics for a region
stats = ndvi.reduceRegion(
    reducer=ee.Reducer.mean(),
    geometry=roi,
    scale=10
).getInfo()

print(f"Mean NDVI: {stats.get('NDVI', 'N/A'):.4f}")

# Time series chart (with geemap)
chart = geemap.chart.image_series(
    imageCollection=s2_collection
        .filterBounds(point)
        .map(lambda img: img.normalizedDifference(['B8', 'B4']).rename('NDVI')),
    region=point.buffer(500),
    reducer=ee.Reducer.mean(),
    scale=10,
    x_property='system:time_start',
    title='NDVI Time Series'
)

print("✓ Time series chart created")


# ============================================================================
# 10. EXTRACT TO PANDAS DATAFRAME
# ============================================================================

print("\n" + "="*70)
print("10. EXTRACT TO PANDAS DATAFRAME")
print("="*70)

# Get data from multiple images
data_list = []

for month in range(1, 4):  # Example: 3 months
    monthly_image = (s2_collection
        .filterDate(f'2025-{month:02d}-01', f'2025-{month+1:02d}-01')
        .filterBounds(point)
        .median())

    ndvi_month = monthly_image.normalizedDifference(['B8', 'B4'])

    stats = ndvi_month.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=point.buffer(500),
        scale=10
    ).getInfo()

    data_list.append({
        'month': month,
        'ndvi_mean': stats.get('B8', None)
    })

df = pd.DataFrame(data_list)
print(df)
print("✓ Data extracted to pandas DataFrame")


# ============================================================================
# QUICK REFERENCE TABLE
# ============================================================================

reference = """
QUICK REFERENCE
================

BAND REFERENCE (Sentinel-2):
- B2: Blue (10m)
- B3: Green (10m)
- B4: Red (10m)
- B8: NIR (10m)
- B11: SWIR1 (20m)
- B12: SWIR2 (20m)

BAND REFERENCE (Landsat 8/9):
- SR_B2: Blue
- SR_B3: Green
- SR_B4: Red
- SR_B5: NIR
- SR_B6: SWIR1
- SR_B7: SWIR2

COMMON INDICES:
NDVI = (NIR - RED) / (NIR + RED)      [Vegetation]
NDBI = (SWIR - NIR) / (SWIR + NIR)    [Built-up]
NDWI = (NIR - SWIR) / (NIR + SWIR)    [Water]
NBR  = (NIR - SWIR2) / (NIR + SWIR2)  [Burn]

SCALE FACTORS:
Sentinel-2: /10000
Landsat: /10000

USEFUL METHODS:
- .filterDate(start, end)
- .filterBounds(geometry)
- .filter(ee.Filter.*)
- .map(function)
- .median() / .mean()
- .reduceRegion(reducer, geometry, scale)
- .classify(classifier)
- .normalizedDifference([band1, band2])
- .updateMask(mask)
- .export to Drive/Asset/GCS
"""

print(reference)


# ============================================================================
# END OF CHEATSHEET
# ============================================================================

print("\n" + "="*70)
print("CHEATSHEET COMPLETE")
print("="*70)
print("""
All examples are executable in Google Colab or Jupyter
Modify parameters as needed for your use case

Resources:
- GEE Python API Docs: https://developers.google.com/earth-engine/apidocs
- geemap Docs: https://geemap.org
- Earth Engine Examples: https://developers.google.com/earth-engine/tutorials
""")
