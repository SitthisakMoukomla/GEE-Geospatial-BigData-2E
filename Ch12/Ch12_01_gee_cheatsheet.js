/*
บทที่ 12: GEE JavaScript Quick Reference
==========================================

Ch12_01_gee_cheatsheet.js — GEE JavaScript Cheatsheet

Complete reference of common GEE operations in JavaScript
All code snippets can run directly in GEE Code Editor

Topics:
1. Load Data (Image, ImageCollection, FeatureCollection)
2. Filter Data (Date, Spatial, Property)
3. Cloud Masking
4. Scale Factors & Unit Conversion
5. Calculate Indices (NDVI, NDBI, NDWI)
6. Export Data (Drive, Asset, Cloud Storage)
7. Classification (Random Forest, SVM)
8. Charting & Visualization

Author: GEE JavaScript Tutorial
Language: Thai/English
*/

// ============================================================================
// 1. LOAD DATA
// ============================================================================

// Load Single Image
var image = ee.Image('USGS/SRTMGL1_003');
var image2 = ee.Image('COPERNICUS/S2_SR_HARMONIZED/20250101T030631_20250101T033718_T49SGD');

// Load Image Collection (multiple images over time)
var s2_collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');
var landsat_collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2');
var landsat9_collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2');

// Load Feature Collection (vector data)
var country_boundaries = ee.FeatureCollection('FAO/GAUL/2015/level0');
var cities = ee.FeatureCollection('USDOS/GEONAMES/v1/cities');

// ============================================================================
// 2. FILTER DATA
// ============================================================================

// Filter by Date
var filtered_date = s2_collection
    .filterDate('2025-01-01', '2025-06-30');

// Filter by Bounding Box (Region of Interest)
var roi = ee.Geometry.Rectangle([100.3, 13.5, 100.9, 14.0]); // Bangkok
var filtered_spatial = s2_collection.filterBounds(roi);

// Filter by Polygon/Point
var point = ee.Geometry.Point(100.5, 13.75);
var buffer = point.buffer(5000); // 5km buffer
var filtered_point = s2_collection.filterBounds(buffer);

// Filter by Property (metadata)
var low_cloud = s2_collection.filter(
    ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)
);

// Chain filters together
var filtered = s2_collection
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(point)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

// ============================================================================
// 3. CLOUD MASKING
// ============================================================================

// Sentinel-2: Use QA60 band
function maskCloudsSentinel2(image) {
    var qa = image.select('QA60');
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
        .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
    return image.updateMask(mask);
}

var s2_cloudFree = s2_collection.map(maskCloudsSentinel2);

// Landsat 8/9: Use QA_PIXEL band (Collection 2)
function maskCloudsLandsat(image) {
    var qa = image.select('QA_PIXEL');
    var cloudBitMask = 1 << 3;
    var shadowBitMask = 1 << 4;
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
        .and(qa.bitwiseAnd(shadowBitMask).eq(0));
    return image.updateMask(mask);
}

var landsat_cloudFree = landsat_collection.map(maskCloudsLandsat);

// Simple cloud filter (alternative)
var simple_filter = s2_collection
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .median();

// ============================================================================
// 4. SCALE FACTORS & UNIT CONVERSION
// ============================================================================

// Sentinel-2: Surface Reflectance (0-10000 scale)
// Bands: B1-B12 (some reserved), B1a, B2-B4, B5-B6, B7, B8, B8a, B11-B12
// Divide by 10000 to get reflectance (0-1)

var s2_image = ee.Image('COPERNICUS/S2_SR_HARMONIZED/20250101T030631_20250101T033718_T49SGD');
var s2_refl = s2_image.divide(10000);

// Landsat 8/9 Collection 2: Surface Reflectance (0-10000 scale)
// Bands: SR_B1-B7, ST_B10 (thermal)
var landsat_image = ee.Image('LANDSAT/LC08/C02/T1_L2/LC08_130050_20250101');
var landsat_refl = landsat_image.select(['SR_B.*']).divide(10000);

// Landsat Temperature: ST_B10 (Thermal band)
var temp_k = landsat_image.select('ST_B10');
var temp_c = temp_k.subtract(273.15); // Kelvin to Celsius

// Sentinel-5P: NO2 (tropospheric column density)
// Already in mol/m² units
var no2 = ee.Image('COPERNICUS/S5P/OFFL/L3_NO2').select('tropospheric_NO2_column_number_density');

// ============================================================================
// 5. CALCULATE INDICES
// ============================================================================

// NDVI (Normalized Difference Vegetation Index)
// Good for vegetation monitoring
// NDVI = (NIR - RED) / (NIR + RED)
// Sentinel-2: B8 (NIR), B4 (RED)
// Landsat: B5 (NIR), B4 (RED)

var ndvi = s2_image
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI');

var ndvi_landsat = landsat_image
    .normalizedDifference(['SR_B5', 'SR_B4'])
    .rename('NDVI');

// NDBI (Normalized Difference Built-up Index)
// Good for built-up/urban areas
// NDBI = (SWIR - NIR) / (SWIR + NIR)
// Sentinel-2: B11 (SWIR), B8 (NIR)

var ndbi = s2_image
    .normalizedDifference(['B11', 'B8'])
    .rename('NDBI');

// NDWI (Normalized Difference Water Index)
// Good for water bodies and moisture
// NDWI = (NIR - SWIR) / (NIR + SWIR)
// Sentinel-2: B8 (NIR), B11 (SWIR)

var ndwi = s2_image
    .normalizedDifference(['B8', 'B11'])
    .rename('NDWI');

// NDMI (Normalized Difference Moisture Index)
// NDMI = (NIR - SWIR) / (NIR + SWIR)
// Sentinel-2: B8 (NIR), B12 (SWIR2)

var ndmi = s2_image
    .normalizedDifference(['B8', 'B12'])
    .rename('NDMI');

// NBR (Normalized Burn Ratio) - for fire detection
// NBR = (NIR - SWIR2) / (NIR + SWIR2)
// Sentinel-2: B8 (NIR), B12 (SWIR2)

var nbr = s2_image
    .normalizedDifference(['B8', 'B12'])
    .rename('NBR');

// ============================================================================
// 6. EXPORT DATA
// ============================================================================

// Export to Google Drive
Export.image.toDrive({
    image: ndvi,
    description: 'ndvi_bangkok_2025',
    scale: 10, // meters
    region: roi,
    folder: 'GEE_exports',
    maxPixels: 1e13
});

// Export to Earth Engine Asset (for future use)
Export.image.toAsset({
    image: ndvi,
    description: 'ndvi_asset',
    assetId: 'projects/your-project/assets/ndvi_bangkok',
    scale: 10,
    region: roi,
    maxPixels: 1e13
});

// Export to Google Cloud Storage (GCS)
Export.image.toCloudStorage({
    image: ndvi,
    description: 'ndvi_gcs',
    bucket: 'your-bucket',
    fileNamePrefix: 'gee_exports/ndvi_bangkok',
    scale: 10,
    region: roi,
    fileFormat: 'GeoTIFF'
});

// Export ImageCollection (multiple images)
var collection_filtered = s2_collection
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .map(function(img) {
        return img.normalizedDifference(['B8', 'B4']).rename('NDVI');
    });

var count = collection_filtered.size().getInfo();
print('Images to export:', count);

// Export FeatureCollection
var features = ee.FeatureCollection(
    roi.buffer(1000).geometries().map(function(g) {
        return ee.Feature(g);
    })
);

Export.table.toDrive({
    collection: features,
    description: 'roi_features',
    fileFormat: 'SHP'
});

// ============================================================================
// 7. CLASSIFICATION (NDVI-based & Machine Learning)
// ============================================================================

// Simple NDVI Thresholding Classification
var vegetation_class = ndvi
    .where(ndvi.lt(0.3), 0)      // Non-vegetation
    .where(ndvi.gte(0.3).and(ndvi.lt(0.5)), 1) // Low veg
    .where(ndvi.gte(0.5).and(ndvi.lt(0.7)), 2) // Moderate veg
    .where(ndvi.gte(0.7), 3);     // High vegetation

// Random Forest Classification (requires training data)
var trainingData = ee.FeatureCollection([
    // Feature 1: class 0 (non-veg)
    ee.Feature(ee.Geometry.Point([100.5, 13.75]), {class: 0}),
    // Feature 2: class 1 (vegetation)
    ee.Feature(ee.Geometry.Point([100.6, 13.76]), {class: 1}),
    // ... more training points
]);

// Sample training data
var training = s2_image.sampleRectangles({
    collection: trainingData,
    properties: ['class'],
    scale: 10
});

// Train Random Forest classifier
var classifier = ee.Classifier.smileRandomForest(100).train({
    features: training,
    classProperty: 'class',
    inputProperties: ['B2', 'B3', 'B4', 'B5', 'B8', 'B11']
});

// Apply classification
var classified = s2_image.classify(classifier);

// ============================================================================
// 8. CHARTING & VISUALIZATION
// ============================================================================

// Visualization Parameters
var ndvi_vis = {
    min: -1,
    max: 1,
    palette: ['red', 'yellow', 'green']
};

var true_color_vis = {
    bands: ['B4', 'B3', 'B2'],
    min: 0,
    max: 3000,
    gamma: 1.2
};

// Add layer to map
Map.addLayer(ndvi, ndvi_vis, 'NDVI');
Map.addLayer(s2_image, true_color_vis, 'True Color');

// Center map
Map.centerObject(roi, 10);

// Print statistics
var stats = ndvi.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 10
});

print('Mean NDVI:', stats);

// Chart: Image series (time series chart)
var chart = ui.Chart.image.series({
    imageCollection: s2_collection
        .filterBounds(point)
        .map(function(img) {
            return img.normalizedDifference(['B8', 'B4']).rename('NDVI');
        }),
    region: point.buffer(500),
    reducer: ee.Reducer.mean(),
    scale: 10,
    xProperty: 'system:time_start'
}).setOptions({
    title: 'NDVI Time Series',
    vAxis: {title: 'NDVI'},
    hAxis: {title: 'Date'},
    lineWidth: 2,
    pointSize: 3
});

print(chart);

// ============================================================================
// QUICK REFERENCE TABLE
// ============================================================================

/*

BAND REFERENCE:
================

Sentinel-2 (10/20/60m resolution):
- B1: Coastal (60m)
- B2: Blue (10m)
- B3: Green (10m)
- B4: Red (10m)
- B5-B6: Red Edge (20m)
- B7: Red Edge (20m)
- B8: NIR (10m)
- B8a: Red Edge (20m)
- B9: Water Vapor (60m)
- B11: SWIR (20m)
- B12: SWIR2 (20m)

Landsat 8/9 Collection 2 (30m):
- SR_B1: Coastal
- SR_B2: Blue
- SR_B3: Green
- SR_B4: Red
- SR_B5: NIR
- SR_B6: SWIR1
- SR_B7: SWIR2
- ST_B10: Thermal IR

COMMON INDICES:
================
NDVI = (NIR - RED) / (NIR + RED)      [Vegetation]
NDBI = (SWIR - NIR) / (SWIR + NIR)    [Built-up]
NDWI = (NIR - SWIR) / (NIR + SWIR)    [Water]
NBR  = (NIR - SWIR2) / (NIR + SWIR2)  [Burn]

SCALE FACTORS:
================
Sentinel-2 SR: /10000 → Reflectance [0-1]
Landsat 8/9 SR: /10000 → Reflectance [0-1]
Landsat Thermal: Kelvin (subtract 273.15 for Celsius)

*/

// End of cheatsheet
