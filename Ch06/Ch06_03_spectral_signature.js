/**
 * ===============================================
 * บทที่ 6: การวิเคราะห์ข้อมูลเชิงพื้นที่
 * ===============================================
 *
 * Ch06_03_spectral_signature.js
 * หัวข้อ: Spectral Signature - ลายเซ็นสเปกตรัมของวัตถุต่างๆ
 *
 * สำหรับใช้ใน Google Earth Engine Code Editor
 * เขียนโดย: GEE Book Team
 * อัปเดต: 2025
 *
 * ===============================================
 */

// ============================================
// 1. กำหนด ROI และ Points
// ============================================
var roi = ee.Geometry.Rectangle([100.3, 13.5, 100.8, 14.0]);

// จุดสำหรับศึกษา Spectral Signature
var waterPoint = ee.Geometry.Point([100.5, 13.72]);      // แม่น้ำ/ทะเลสาบ
var vegetationPoint = ee.Geometry.Point([100.55, 13.75]); // พื้นที่ป่า
var urbanPoint = ee.Geometry.Point([100.5, 13.75]);      // พื้นที่เมือง
var soilPoint = ee.Geometry.Point([100.45, 13.70]);      // ดิน/ไร่

// ============================================
// 2. Prepare Landsat 8 Composite
// ============================================
print('=== Spectral Signature Analysis ===');

function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0)
      .and(qa.bitwiseAnd(1 << 4).eq(0));
  return image.updateMask(mask);
}

var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .map(maskClouds)
    .map(applyScaleFactors);

var composite = l8.median().clip(roi);

// ============================================
// 3. ตัวอย่าง 1: Spectral Signature Chart (Point)
// ============================================
print('\n=== Spectral Signature Chart (Single Point) ===');

var spectralPoint = ee.Geometry.Point([100.5, 13.75]);

// สร้าง Chart สำหรับ Optical Bands
var chart_optical = ui.Chart.image.regions({
  image: composite.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7']),
  regions: spectralPoint,
  scale: 30,
  xLabels: ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2']
});

chart_optical.setOptions({
  title: 'Spectral Signature at Point (Landsat 8)',
  hAxis: {
    title: 'Bands'
  },
  vAxis: {
    title: 'Reflectance'
  }
});

print(chart_optical);

// ============================================
// 4. ตัวอย่าง 2: Compare Multiple Land Cover Types
// ============================================
print('\n=== Compare Spectral Signatures ===');

// FeatureCollection ของสามประเภท
var samples = ee.FeatureCollection([
  ee.Feature(waterPoint, {label: 'Water', class: 0}),
  ee.Feature(vegetationPoint, {label: 'Vegetation', class: 1}),
  ee.Feature(soilPoint, {label: 'Soil', class: 2})
]);

// Sample values ที่จุด
var sampledImage = composite.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7']);
var sampled = sampledImage.sampleRectangles({
  collection: samples,
  scale: 30,
  geometries: true
});

print('Sampled Features:', sampled.size());

// ============================================
// 5. สร้าง Chart สำหรับเปรียบเทียบหลาย Classes
// ============================================
print('\n=== Spectral Signature Comparison Chart ===');

// นึกว่า sampled data มี multiple features
// สร้าง chart โดยใช้ features หลากหลาย
var chart_multi = ui.Chart.feature.byProperty({
  features: samples,
  xProperty: 'label'
});

print('Note: Sampled features prepared for comparison');

// ============================================
// 6. ตัวอย่าง: NDVI Spectral Signature
// ============================================
print('\n=== NDVI Spectral Signature ===');

var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4'])
    .rename('NDVI');

var chart_ndvi = ui.Chart.image.regions({
  image: ndvi,
  regions: samples,
  scale: 30,
  seriesProperty: 'label'
});

chart_ndvi.setOptions({
  title: 'NDVI Values by Land Cover Type',
  hAxis: {title: 'Pixel'},
  vAxis: {title: 'NDVI'}
});

print(chart_ndvi);

// ============================================
// 7. ตัวอย่าง: Create Classification based on Spectral Pattern
// ============================================
print('\n=== Spectral-based Classification ===');

// คำนวณ Index สำหรับแยกประเภท
var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']);
var ndwi = composite.normalizedDifference(['SR_B3', 'SR_B5']);
var ndbi = composite.normalizedDifference(['SR_B6', 'SR_B5']);

// ประเภท: Water, Vegetation, Urban, Soil
var classification = ee.Image(0)
    // Water: NDWI > 0.3
    .where(ndwi.gt(0.3), 0)
    // Vegetation: NDVI > 0.5
    .where(ndvi.gt(0.5), 1)
    // Urban: NDBI > 0.1
    .where(ndbi.gt(0.1), 2)
    // Default: Soil
    .rename('classification');

Map.addLayer(classification, {
  min: 0,
  max: 3,
  palette: ['blue', 'green', 'red', 'brown']
}, 'Spectral Classification');

// ============================================
// 8. ตัวอย่าง: Histogram of Spectral Values
// ============================================
print('\n=== Histogram of Spectral Values ===');

var histogram_red = ui.Chart.image.histogram({
  image: composite.select('SR_B4'),
  region: roi,
  scale: 30,
  maxBuckets: 50
});

histogram_red.setOptions({
  title: 'Distribution of Red Band (SR_B4)',
  hAxis: {title: 'Reflectance'},
  vAxis: {title: 'Frequency'}
});

print(histogram_red);

// ============================================
// 9. ตัวอย่าง: Spectral Index Chart
// ============================================
print('\n=== Spectral Indices Across Points ===');

// สร้าง FeatureCollection ที่มีหลายจุด
var multiPoints = ee.FeatureCollection([
  ee.Feature(waterPoint.buffer(30), {type: 'Water'}),
  ee.Feature(vegetationPoint.buffer(30), {type: 'Vegetation'}),
  ee.Feature(urbanPoint.buffer(30), {type: 'Urban'}),
  ee.Feature(soilPoint.buffer(30), {type: 'Soil'})
]);

// Sample NDVI, NDWI, NDBI
var indices = composite
    .addBands(ndvi.rename('NDVI'))
    .addBands(ndwi.rename('NDWI'))
    .addBands(ndbi.rename('NDBI'));

var sampled_indices = indices.sampleRectangles({
  collection: multiPoints,
  scale: 30,
  geometries: true
});

print('Sampled Indices:', sampled_indices.size());

// ============================================
// 10. Display Points on Map
// ============================================
print('\n=== Add Sample Points to Map ===');

Map.addLayer(samples, {color: 'red'}, 'Sample Points');
Map.addLayer(multiPoints, {color: 'yellow'}, 'Multi-point Samples');

// ============================================
// 11. Spectral Values at Single Point
// ============================================
print('\n=== Detailed Spectral Values at Point ===');

var point_values = composite.sample(waterPoint, 30);
print('Values at Water Point:', point_values.first());

var point_values_veg = composite.sample(vegetationPoint, 30);
print('Values at Vegetation Point:', point_values_veg.first());

var point_values_urban = composite.sample(urbanPoint, 30);
print('Values at Urban Point:', point_values_urban.first());

var point_values_soil = composite.sample(soilPoint, 30);
print('Values at Soil Point:', point_values_soil.first());

// ============================================
// 12. Information: Spectral Characteristics
// ============================================
print('\n=== Spectral Characteristics by Land Cover ===');
print('Water:');
print('  - Blue: High (often blue light penetrates water)');
print('  - Green: Medium');
print('  - Red: Low (absorbed by water)');
print('  - NIR: Very Low (absorbed by water)');
print('  - NDVI: Negative');
print('  - NDWI: High (> 0.3)');

print('\nVegetation:');
print('  - Red: Low (absorbed by chlorophyll)');
print('  - NIR: Very High (reflected by leaf structure)');
print('  - NDVI: High (> 0.5 for dense vegetation)');
print('  - NDWI: Medium (0.2-0.4)');

print('\nUrban/Built-up:');
print('  - Red: Medium-High');
print('  - NIR: Medium');
print('  - SWIR: High');
print('  - NDVI: Low (< 0.3)');
print('  - NDBI: High (> 0.1)');

print('\nBare Soil:');
print('  - Red: Medium');
print('  - NIR: Medium (less than vegetation)');
print('  - SWIR: High');
print('  - NDVI: Low-Medium (0.2-0.4)');
print('  - NDBI: Medium');

// ============================================
// 13. Center Map and Finish
// ============================================
Map.centerObject(roi, 11);
print('\n=== สำเร็จ ===');
