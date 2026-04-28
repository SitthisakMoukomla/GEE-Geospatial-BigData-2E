/*
 * =========================================
 * บทที่ 4: Sentinel-2 SR Harmonized Workflow
 * =========================================
 * ไฟล์: Ch04_05_sentinel2_harmonized.js
 *
 * คำอธิบาย: Sentinel-2 Surface Reflectance Harmonized
 *          - COPERNICUS/S2_SR_HARMONIZED (ต้องใช้นี้!)
 *          - Cloud masking with SCL band
 *          - 10m spatial resolution (เวโลิตี)
 *          - 13 spectral bands
 *          - Complete analysis workflow
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. กำหนด ROI ========

var roi = ee.Geometry.Point(100.5, 13.75);  // กรุงเทพมหานคร

var roiBuffer = roi.buffer(50000);  // 50 km

print('ROI:', roi);
print('Analysis Area:', roiBuffer);


// ======== 2. ทำความเข้าใจ Sentinel-2 ========

print('\n=== Sentinel-2 Overview ===');
print('Satellite: Sentinel-2A (2015) & Sentinel-2B (2017)');
print('Sensor: MSI (Multispectral Instrument)');
print('Spatial Resolution: 10m, 20m, 60m (depending on band)');
print('Temporal Resolution: 5 days (with both satellites)');
print('Number of Bands: 13 (B1-B12 + B8A)');
print('Data Format: Surface Reflectance (SR)');
print('Dataset: COPERNICUS/S2_SR_HARMONIZED (updated 2022+)');
print('');
print('⚠️ IMPORTANT: Must use S2_SR_HARMONIZED (not S2_SR)');
print('  - Reason: Baseline change on 2022-01-25');
print('  - Harmonized version corrects DN offset differences');


// ======== 3. Load Sentinel-2 Collection ========

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roiBuffer);

print('\n=== Sentinel-2 SR Harmonized Collection ===');
print('Collection ID: COPERNICUS/S2_SR_HARMONIZED');
print('Total images:', s2.size().getInfo());

// Check first image
var firstS2 = s2.first();
print('First image:', firstS2.id());
print('Bands:', firstS2.bandNames());


// ======== 4. View Metadata ========

print('\n=== Image Metadata ===');

// Check cloud percentage
var cloudCover = firstS2.get('CLOUDY_PIXEL_PERCENTAGE');
print('Cloud Cover (%):', cloudCover);

// Check date
var acqDate = firstS2.date();
print('Acquisition Date:', acqDate.format('YYYY-MM-dd').getInfo());


// ======== 5. Filter for Cloud-Free Images ========

// CLOUDY_PIXEL_PERCENTAGE < 20%
var s2Filtered = s2.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

print('\nFiltered by cloud < 20%:');
print('Images after filtering:', s2Filtered.size().getInfo());


// ======== 6. Cloud Masking with SCL Band ========

// SCL (Scene Classification) band values:
// 0=No Data, 1=Saturated/Defective, 2=Vegetation, 3=Not Vegetated
// 4=Water, 5=Unclassified, 6=Cloud Shadow, 7=Vegetation, 8=Not Vegetated
// 9=Water, 10=Cloud Medium Prob, 11=Cloud High Prob, 12=Thin Cirrus

function maskS2clouds(image) {
  var scl = image.select('SCL');

  // Values to mask (cloud and cloud-related)
  var cloudBits = [3, 8, 9, 10];  // Cloud shadow, medium cloud, high cloud, cirrus

  var mask = ee.Image(1);  // Start with all 1s (all pixels valid)

  // Mask out cloud and shadow pixels
  for (var i = 0; i < cloudBits.length; i++) {
    mask = mask.and(scl.neq(cloudBits[i]));
  }

  return image.updateMask(mask);
}

print('\n=== Cloud Masking with SCL ===');
var s2Masked = s2Filtered.map(maskS2clouds);

var firstMasked = s2Masked.first();
print('First masked image:', firstMasked.id());


// ======== 7. Scale Factor Application ========

// Sentinel-2 SR scale factor = 0.0001
// DN * 0.0001 = Reflectance (0-1)

function applyS2ScaleFactor(image) {
  // Select all bands and multiply by scale factor
  var allBands = image.select(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7',
                                'B8', 'B8A', 'B11', 'B12'])
      .multiply(0.0001);

  return image.addBands(allBands, null, true);
}

print('\n=== Applying Scale Factor ===');
var s2Scaled = s2Masked.map(applyS2ScaleFactor);

var firstScaled = s2Scaled.first();
print('First scaled image:', firstScaled.id());

// Verify scale
var scaledSample = firstScaled.select('B4').sample(roi, 10).first();
print('B4 (Red) value after scaling:', scaledSample.get('B4'));
print('(Should be between 0-1)');


// ======== 8. Select Bands of Interest ========

// Sentinel-2 bands:
// B1 (60m): Coastal aerosol
// B2 (10m): Blue
// B3 (10m): Green
// B4 (10m): Red
// B5 (20m): Vegetation Red Edge
// B6 (20m): Vegetation Red Edge
// B7 (20m): Vegetation Red Edge
// B8 (10m): NIR
// B8A (20m): Narrow NIR
// B11 (20m): SWIR
// B12 (20m): SWIR
// SCL (20m): Scene Classification

// Resample 20m bands to 10m
function resampleTo10m(image) {
  return image
      .resample('bilinear')  // Use bilinear interpolation
      .reproject({
        crs: image.projection().getInfo().crs,
        scale: 10
      });
}

var s2_10m = s2Scaled.map(resampleTo10m);

print('\n=== Resampled to 10m ===');
var first10m = s2_10m.first();
print('Bands at 10m:', first10m.bandNames());


// ======== 9. Create Composite ========

var s2Composite = s2_10m.median().clip(roiBuffer);

print('\n=== Composite Created ===');
print('Composite bands:', s2Composite.bandNames());


// ======== 10. Visualization Parameters ========

// True Color (RGB)
var visTrueColor = {
  bands: ['B4', 'B3', 'B2'],  // Red, Green, Blue
  min: 0,
  max: 0.3,
  gamma: 1.2
};

// False Color (NIR, Red, Green) - Vegetation
var visFalseColor = {
  bands: ['B8', 'B4', 'B3'],  // NIR, Red, Green
  min: 0,
  max: 0.3,
  gamma: 1.2
};

// NIR + SWIR composite (Fire/Water)
var visFireWater = {
  bands: ['B12', 'B8A', 'B4'],  // SWIR, NIR, Red
  min: 0,
  max: 0.3,
  gamma: 1.2
};


// ======== 11. Calculate Indices ========

function calculateIndices(image) {
  // NDVI = (NIR - Red) / (NIR + Red)
  // B8 = NIR, B4 = Red
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');

  // NDBI = (SWIR - NIR) / (SWIR + NIR)
  // B11 = SWIR, B8 = NIR (Built-up Index)
  var ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');

  // NDMI = (NIR - SWIR) / (NIR + SWIR)
  // B8A = Narrow NIR, B11 = SWIR (Moisture Index)
  var ndmi = image.normalizedDifference(['B8A', 'B11']).rename('NDMI');

  // NDWI = (Green - NIR) / (Green + NIR)
  // B3 = Green, B8 = NIR (Normalized Difference Water Index)
  var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');

  // MNDWI = (Green - SWIR) / (Green + SWIR)
  // B3 = Green, B11 = SWIR (Modified NDWI - better for water)
  var mndwi = image.normalizedDifference(['B3', 'B11']).rename('MNDWI');

  return image.addBands([ndvi, ndbi, ndmi, ndwi, mndwi]);
}

var s2WithIndices = s2Composite;
s2WithIndices = calculateIndices(s2WithIndices);

print('\n=== Indices Calculated ===');
print('Added bands: NDVI, NDBI, NDMI, NDWI, MNDWI');


// ======== 12. Add Layers to Map ========

Map.addLayer(s2Composite, visTrueColor, 'Sentinel-2 True Color (10m)');
Map.addLayer(s2Composite, visFalseColor, 'Sentinel-2 False Color (Vegetation)', false);
Map.addLayer(s2Composite, visFireWater, 'Sentinel-2 Fire/Water', false);

// Indices
var visNDVI = {
  min: 0,
  max: 0.8,
  palette: ['red', 'yellow', 'green', 'darkgreen']
};

Map.addLayer(s2WithIndices.select('NDVI'), visNDVI, 'NDVI', false);

var visNDBI = {
  min: -0.3,
  max: 0.5,
  palette: ['blue', 'cyan', 'white', 'yellow', 'red']
};

Map.addLayer(s2WithIndices.select('NDBI'), visNDBI, 'NDBI (Built-up)', false);

var visMNDWI = {
  min: -0.5,
  max: 0.5,
  palette: ['red', 'orange', 'white', 'cyan', 'blue']
};

Map.addLayer(s2WithIndices.select('MNDWI'), visMNDWI, 'MNDWI (Water)', false);


// ======== 13. Statistics ========

print('\n=== Index Statistics ===');

var ndviStats = s2WithIndices.select('NDVI').reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.minMax(), null, true),
  geometry: roiBuffer,
  scale: 10,
  maxPixels: 1e9
});

print('NDVI:');
print('  Mean:', ee.Number(ndviStats.get('NDVI_mean')).getInfo().toFixed(3));
print('  Min:', ee.Number(ndviStats.get('NDVI_min')).getInfo().toFixed(3));
print('  Max:', ee.Number(ndviStats.get('NDVI_max')).getInfo().toFixed(3));

var ndbiStats = s2WithIndices.select('NDBI').reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roiBuffer,
  scale: 10,
  maxPixels: 1e9
});

print('\nNDBI:');
print('  Mean:', ee.Number(ndbiStats.get('NDBI_mean')).getInfo().toFixed(3));

var mndwiStats = s2WithIndices.select('MNDWI').reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roiBuffer,
  scale: 10,
  maxPixels: 1e9
});

print('\nMNDWI:');
print('  Mean:', ee.Number(mndwiStats.get('MNDWI_mean')).getInfo().toFixed(3));


// ======== 14. Classification ========

var ndvi = s2WithIndices.select('NDVI');
var ndbi = s2WithIndices.select('NDBI');
var mndwi = s2WithIndices.select('MNDWI');

// Simple classification
var classification = ee.Image(0);

// 1 = Water
classification = classification.where(mndwi.gt(0.3), 1);

// 2 = Forest
classification = classification.where(ndvi.gt(0.6), 2);

// 3 = Vegetation
classification = classification.where(ndvi.gt(0.4).and(ndvi.lte(0.6)), 3);

// 4 = Urban
classification = classification.where(ndbi.gt(0.1).and(ndvi.lt(0.4)), 4);

// 5 = Bare
classification = classification.where(ndvi.lt(0.2), 5);

var classVis = {
  min: 0,
  max: 5,
  palette: ['black', 'blue', 'green', 'yellow', 'red', 'gray']
};

Map.addLayer(classification.clip(roiBuffer), classVis, 'Sentinel-2 Classification', false);

print('\nClassification: 0=No Data, 1=Water, 2=Forest, 3=Vegetation, 4=Urban, 5=Bare');


// ======== 15. Comparison with Landsat 8 ========

print('\n=== Sentinel-2 vs Landsat 8 ===');
print('Sentinel-2:');
print('  - Resolution: 10m (higher detail)');
print('  - Bands: 13 (more spectral info)');
print('  - Temporal: 5 days');
print('  - Archive: 2015-present (10 years)');
print('');
print('Landsat 8:');
print('  - Resolution: 30m');
print('  - Bands: 11');
print('  - Temporal: 8 days (with L9)');
print('  - Archive: 2013-present (12 years)');


// ======== 16. Export ========

/*
Export.image.toDrive({
  image: s2Composite.select(['B4', 'B3', 'B2']),
  description: 'Sentinel2_TrueColor_Bangkok',
  scale: 10,
  region: roiBuffer,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: s2WithIndices.select(['NDVI', 'NDBI', 'MNDWI']),
  description: 'Sentinel2_Indices_Bangkok',
  scale: 10,
  region: roiBuffer,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: classification,
  description: 'Sentinel2_Classification_Bangkok',
  scale: 10,
  region: roiBuffer,
  maxPixels: 1e9
});
*/


// ======== 17. Center Map ========

Map.centerObject(roiBuffer, 10);


// ======== สรุป ========

print('\n=== สรุปบทนี้ ===');
print('✓ โหลด Sentinel-2 SR Harmonized');
print('✓ Cloud filtering (CLOUDY_PIXEL_PERCENTAGE)');
print('✓ Cloud masking (SCL band)');
print('✓ Scale Factor (0.0001)');
print('✓ Resampling 20m bands to 10m');
print('✓ Create Composite (Median)');
print('✓ Calculate Multiple Indices (NDVI, NDBI, NDMI, NDWI, MNDWI)');
print('✓ Land Cover Classification');
print('✓ Compare with Landsat 8');
print('✓ Export Results');
print('\n⚠️ IMPORTANT: Use S2_SR_HARMONIZED, not S2_SR!');
print('ข้อดี: 10m resolution, 13 bands, 5-day revisit');
print('ข้อจำกัด: Shorter archive (since 2015)');
print('\n📚 บทที่ 4 เสร็จสิ้น!');
