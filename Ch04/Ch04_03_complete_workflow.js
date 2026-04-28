/*
 * =========================================
 * บทที่ 4: Complete Landsat 8 Workflow
 * =========================================
 * ไฟล์: Ch04_03_complete_workflow.js
 *
 * คำอธิบาย: Workflow เสร็จสมบูรณ์
 *          1. Load Landsat 8 C02
 *          2. Cloud Mask (QA_PIXEL)
 *          3. Scale Factor
 *          4. Create Composite
 *          5. Calculate NDVI, NDBI, MNDWI
 *          6. Visualize & Export
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== STEP 1: Define ROI ========

var roi = ee.Geometry.Point(100.5, 13.75);  // กรุงเทพมหานคร

// Create buffer for larger analysis area
var roiBuffer = roi.buffer(50000);  // 50 km

print('ROI:', roi);
print('Analysis Area (Buffered):', roiBuffer);


// ======== STEP 2: Define Helper Functions ========

// Function 2A: Cloud & Shadow Masking
function maskCloudsShadows(image) {
  // QA_PIXEL bit flags
  var qa = image.select('QA_PIXEL');

  var cloudBit = 1 << 3;      // Bit 3: Cloud
  var shadowBit = 1 << 4;     // Bit 4: Cloud Shadow

  var mask = qa.bitwiseAnd(cloudBit).eq(0)
      .and(qa.bitwiseAnd(shadowBit).eq(0));

  return image.updateMask(mask);
}

// Function 2B: Scale Factor Application
function applyScaleFactors(image) {
  // Optical bands (SR_B1-SR_B7)
  var opticalBands = image.select('SR_B.')
      .multiply(0.0000275).add(-0.2);

  // Thermal band (ST_B10)
  var thermalBands = image.select('ST_B.*')
      .multiply(0.00341802).add(149.0);

  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// Function 2C: Calculate Indices
function calculateIndices(image) {
  // NDVI = (NIR - Red) / (NIR + Red)
  // SR_B5 = NIR, SR_B4 = Red
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');

  // NDBI = (SWIR - NIR) / (SWIR + NIR)
  // SR_B6 = SWIR, SR_B5 = NIR (Built-up Index)
  var ndbi = image.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');

  // MNDWI = (Green - SWIR) / (Green + SWIR)
  // SR_B3 = Green, SR_B6 = SWIR (Water Index)
  var mndwi = image.normalizedDifference(['SR_B3', 'SR_B6']).rename('MNDWI');

  return image.addBands([ndvi, ndbi, mndwi]);
}

print('✓ Helper functions defined');


// ======== STEP 3: Load Data ========

var startDate = '2025-01-01';
var endDate = '2025-06-30';

var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(startDate, endDate)
    .filterBounds(roiBuffer);

print('\n=== Data Loading ===');
print('Landsat 8 Collection:', l8);
print('Number of images:', l8.size().getInfo());

// Also load Landsat 9 to combine
var l9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterDate(startDate, endDate)
    .filterBounds(roiBuffer);

print('Landsat 9 images:', l9.size().getInfo());

// Combine L8 + L9
var combined = l8.merge(l9);
print('Combined L8+L9 images:', combined.size().getInfo());


// ======== STEP 4: Apply Processing Pipeline ========

print('\n=== Processing Pipeline ===');

// Pipeline: Load → Cloud Mask → Scale Factor → Calculate Indices
var processed = combined
    .map(maskCloudsShadows)           // Step 1: Remove clouds
    .map(applyScaleFactors)            // Step 2: Scale to reflectance
    .map(calculateIndices);            // Step 3: Calculate indices

print('✓ Processed collection:', processed.size().getInfo());

// View first processed image
var firstProcessed = processed.first();
print('First processed image:', firstProcessed.id());
print('Available bands:', firstProcessed.bandNames());


// ======== STEP 5: Create Composite ========

print('\n=== Creating Composite ===');

// Create Median Composite (robust to outliers)
var composite = processed.median().clip(roiBuffer);

print('Composite bands:', composite.bandNames());

// Calculate pixel count to ensure quality
var pixelCount = composite.select('NDVI').bandCount();
print('Composite created successfully');


// ======== STEP 6: Visualization Preparation ========

print('\n=== Preparing Visualizations ===');

// True Color (RGB)
var visTrueColor = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 0.3,
  gamma: 1.2
};

// False Color (NIR, Red, Green) - highlights vegetation
var visFalseColor = {
  bands: ['SR_B5', 'SR_B4', 'SR_B3'],
  min: 0,
  max: 0.3,
  gamma: 1.2
};

// NDVI - Vegetation Index
var visNDVI = {
  min: 0,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'green', 'darkgreen']
};

// NDBI - Built-up Index
var visNDBI = {
  min: -0.3,
  max: 0.5,
  palette: ['blue', 'cyan', 'white', 'yellow', 'red']
};

// MNDWI - Water Index
var visMNDWI = {
  min: -0.5,
  max: 0.5,
  palette: ['red', 'orange', 'white', 'cyan', 'blue']
};

// Land Surface Temperature (LST)
var visLST = {
  min: 20,
  max: 40,
  palette: ['blue', 'cyan', 'green', 'yellow', 'orange', 'red']
};

print('✓ Visualization parameters ready');


// ======== STEP 7: Add Layers to Map ========

print('\n=== Adding Layers to Map ===');

Map.addLayer(composite, visTrueColor, 'True Color (L8/L9 Median)', true);
Map.addLayer(composite, visFalseColor, 'False Color (Vegetation)', false);
Map.addLayer(composite.select('NDVI'), visNDVI, 'NDVI', false);
Map.addLayer(composite.select('NDBI'), visNDBI, 'NDBI (Built-up)', false);
Map.addLayer(composite.select('MNDWI'), visMNDWI, 'MNDWI (Water)', false);

// Land Surface Temperature
var lstCelsius = composite.select('ST_B10').subtract(273.15);
Map.addLayer(lstCelsius, visLST, 'Land Surface Temperature (°C)', false);

Map.centerObject(roiBuffer, 10);

print('✓ All layers added to map');


// ======== STEP 8: Calculate Statistics ========

print('\n=== Calculating Statistics ===');

// NDVI Statistics
var ndviStats = composite.select('NDVI').reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), null, true),
  geometry: roiBuffer,
  scale: 30,
  maxPixels: 1e9
});

print('\nNDVI Statistics:');
print('  Mean:', ee.Number(ndviStats.get('NDVI_mean')).getInfo());
print('  StdDev:', ee.Number(ndviStats.get('NDVI_stdDev')).getInfo());

// NDBI Statistics
var ndbiStats = composite.select('NDBI').reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), null, true),
  geometry: roiBuffer,
  scale: 30,
  maxPixels: 1e9
});

print('\nNDBI Statistics:');
print('  Mean:', ee.Number(ndbiStats.get('NDBI_mean')).getInfo());
print('  StdDev:', ee.Number(ndbiStats.get('NDBI_stdDev')).getInfo());

// MNDWI Statistics
var mndwiStats = composite.select('MNDWI').reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), null, true),
  geometry: roiBuffer,
  scale: 30,
  maxPixels: 1e9
});

print('\nMNDWI Statistics:');
print('  Mean:', ee.Number(mndwiStats.get('MNDWI_mean')).getInfo());
print('  StdDev:', ee.Number(mndwiStats.get('MNDWI_stdDev')).getInfo());

// LST Statistics
var lstStats = lstCelsius.reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.minMax(), null, true),
  geometry: roiBuffer,
  scale: 30,
  maxPixels: 1e9
});

print('\nLand Surface Temperature (°C):');
print('  Mean:', ee.Number(lstStats.get('ST_B10_mean')).getInfo());
print('  Min:', ee.Number(lstStats.get('ST_B10_min')).getInfo());
print('  Max:', ee.Number(lstStats.get('ST_B10_max')).getInfo());


// ======== STEP 9: Classification (Optional) ========

print('\n=== Simple Classification ===');

// Classify based on NDVI
// Forest: NDVI > 0.6
// Vegetation: 0.4 < NDVI < 0.6
// Urban: NDBI > 0.1 (and low NDVI)
// Water: MNDWI > 0.4

var ndvi = composite.select('NDVI');
var ndbi = composite.select('NDBI');
var mndwi = composite.select('MNDWI');

var classification = ee.Image(0);  // Start with 0

// Water
classification = classification.where(mndwi.gt(0.3), 1);

// Forest
classification = classification.where(ndvi.gt(0.6), 2);

// Vegetation
classification = classification.where(
    ndvi.gt(0.4).and(ndvi.lte(0.6)), 3);

// Urban/Built-up
classification = classification.where(
    ndbi.gt(0.1).and(ndvi.lt(0.4)), 4);

// Bare Land
classification = classification.where(
    ndvi.lt(0.2).and(ndbi.lt(0.1)), 5);

var classificationVis = {
  min: 0,
  max: 5,
  palette: ['black', 'blue', 'green', 'yellow', 'red', 'gray']
};

Map.addLayer(classification.clip(roiBuffer), classificationVis, 'Land Cover Classification', false);

print('Classification: 0=No Data, 1=Water, 2=Forest, 3=Vegetation, 4=Urban, 5=Bare');


// ======== STEP 10: Export Results ========

print('\n=== Export Options ===');

// Option 1: Export True Color Composite
/*
Export.image.toDrive({
  image: composite.select(['SR_B4', 'SR_B3', 'SR_B2']),
  description: 'Landsat8_TrueColor_Bangkok_Q1_2025',
  scale: 30,
  region: roiBuffer,
  maxPixels: 1e9
});
*/

// Option 2: Export Indices
/*
Export.image.toDrive({
  image: composite.select(['NDVI', 'NDBI', 'MNDWI']),
  description: 'Landsat8_Indices_Bangkok_Q1_2025',
  scale: 30,
  region: roiBuffer,
  maxPixels: 1e9
});
*/

// Option 3: Export Classification
/*
Export.image.toDrive({
  image: classification,
  description: 'Landsat8_Classification_Bangkok_Q1_2025',
  scale: 30,
  region: roiBuffer,
  maxPixels: 1e9
});
*/

print('✓ Export templates ready (uncomment to use)');


// ======== STEP 11: Create Chart ========

print('\n=== Histogram & Charts ===');

// Histogram of NDVI
var histNDVI = ui.Chart.image.histogram({
  image: composite.select('NDVI'),
  region: roiBuffer,
  scale: 30,
  maxPixels: 1e6
}).setOptions({
  title: 'NDVI Distribution (Bangkok Q1 2025)',
  hAxis: { title: 'NDVI' },
  vAxis: { title: 'Frequency' }
});

print(histNDVI);


// ======== STEP 12: Summary ========

print('\n' + '='.repeat(50));
print('COMPLETE LANDSAT 8 WORKFLOW - SUMMARY');
print('='.repeat(50));

print('\n1. DATA LOADING');
print('   ✓ Loaded Landsat 8 & 9 Collection 2');
print('   ✓ Filter by date: ' + startDate + ' to ' + endDate);
print('   ✓ Filter by bounds: Bangkok area (50 km buffer)');
print('   ✓ Total images: ' + combined.size().getInfo());

print('\n2. PROCESSING');
print('   ✓ Cloud & Shadow Masking (QA_PIXEL)');
print('   ✓ Scale Factor Application (0.0000275, -0.2)');
print('   ✓ Index Calculation (NDVI, NDBI, MNDWI)');

print('\n3. COMPOSITE CREATION');
print('   ✓ Median Composite (robust to outliers)');
print('   ✓ Clipped to ROI buffer');

print('\n4. INDICES & STATISTICS');
print('   ✓ NDVI (Vegetation): Mean ~' +
    Number(ndviStats.get('NDVI_mean').getInfo()).toFixed(3));
print('   ✓ NDBI (Built-up): Mean ~' +
    Number(ndbiStats.get('NDBI_mean').getInfo()).toFixed(3));
print('   ✓ MNDWI (Water): Mean ~' +
    Number(mndwiStats.get('MNDWI_mean').getInfo()).toFixed(3));
print('   ✓ LST (Temperature): ' +
    Number(lstStats.get('ST_B10_mean').getInfo()).toFixed(1) + '°C');

print('\n5. VISUALIZATIONS');
print('   ✓ True Color');
print('   ✓ False Color (Vegetation highlight)');
print('   ✓ NDVI Map');
print('   ✓ NDBI Map');
print('   ✓ MNDWI Map');
print('   ✓ Land Surface Temperature');
print('   ✓ Land Cover Classification');

print('\n6. READY FOR EXPORT');
print('   ✓ Composite image');
print('   ✓ Index layers');
print('   ✓ Classification map');

print('\n' + '='.repeat(50));
print('WORKFLOW COMPLETE!');
print('='.repeat(50));


// ======== Final Checklist ========

print('\n=== CHECKLIST FOR FUTURE USE ===');
print('☐ Verify Collection 2 (C02) is used');
print('☐ Check Band Names (SR_B*, ST_B*)');
print('☐ Apply Cloud Mask FIRST');
print('☐ Apply Scale Factor SECOND');
print('☐ Calculate indices AFTER scaling');
print('☐ Adjust visualization parameters if needed');
print('☐ Export to Drive or Cloud Storage');
print('☐ Verify export completion');
