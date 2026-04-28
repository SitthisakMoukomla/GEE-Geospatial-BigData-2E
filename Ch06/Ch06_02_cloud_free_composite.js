/**
 * ===============================================
 * บทที่ 6: การวิเคราะห์ข้อมูลเชิงพื้นที่
 * ===============================================
 *
 * Ch06_02_cloud_free_composite.js
 * หัวข้อ: Cloud-free Composite - สร้างภาพปลอดเมฆ (Landsat 8+9)
 *
 * สำหรับใช้ใน Google Earth Engine Code Editor
 * เขียนโดย: GEE Book Team
 * อัปเดต: 2025
 *
 * ===============================================
 */

// ============================================
// 1. กำหนด ROI
// ============================================
var roi = ee.Geometry.Rectangle([100.3, 13.5, 100.8, 14.0]);

// ============================================
// 2. ฟังก์ชัน: Apply Scale Factors (Collection 2)
// ============================================
print('=== Landsat 8/9 Collection 2 Cloud-free Composite ===');

function applyScaleFactors(image) {
  // Optical bands: SR_B* (TOA Reflectance)
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  // Thermal bands: ST_B* (Land Surface Temperature in Kelvin)
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);

  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// ============================================
// 3. ฟังก์ชัน: Cloud Masking (QA_PIXEL)
// ============================================
function maskClouds(image) {
  // QA_PIXEL band จาก Collection 2
  var qa = image.select('QA_PIXEL');

  // Bit 3 = Cloud, Bit 4 = Cloud Shadow
  // เราต้องการ mask ที่ cloud and shadow = 0 (ปลอด cloud)
  var mask = qa.bitwiseAnd(1 << 3).eq(0)    // Cloud = 0
      .and(qa.bitwiseAnd(1 << 4).eq(0));    // Cloud Shadow = 0

  return image.updateMask(mask);
}

// ============================================
// 4. โหลด Landsat 8 Collection 2
// ============================================
print('\n=== Load Landsat 8 Collection 2 ===');

var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUD_COVER', 50));  // Pre-filter เมื่อ < 50%

print('Landsat 8 images (pre-filter):', l8.size());

// ============================================
// 5. โหลด Landsat 9 Collection 2
// ============================================
print('\n=== Load Landsat 9 Collection 2 ===');

var l9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUD_COVER', 50));

print('Landsat 9 images (pre-filter):', l9.size());

// ============================================
// 6. รวม Landsat 8 + 9 (เพื่อเพิ่มจำนวนภาพ)
// ============================================
print('\n=== Merge Landsat 8 + 9 ===');

var combined = l8.merge(l9);

print('Combined L8+L9 images:', combined.size());

// ============================================
// 7. Processing Pipeline: Filter → Cloud Mask → Scale
// ============================================
print('\n=== Processing Pipeline ===');

var processedCollection = combined
    // 1. Filter by date
    .filterDate('2025-01-01', '2025-06-30')
    // 2. Filter by bounds
    .filterBounds(roi)
    // 3. Filter by cloud cover
    .filter(ee.Filter.lt('CLOUD_COVER', 50))
    // 4. Map cloud masking function
    .map(maskClouds)
    // 5. Map scale factor function
    .map(applyScaleFactors);

print('Images after processing:', processedCollection.size());

// ============================================
// 8. สร้าง Median Composite (ปลอดเมฆ)
// ============================================
print('\n=== Create Median Composite ===');

// Median รับ pixel ตรงกลาง ซึ่งเป็นประโยชน์เมื่อมี cloud
// (cloud pixels ถูก mask ออก ดังนั้น median จะหลีกเลี่ยง cloud)
var composite = processedCollection.median().clip(roi);

print('Composite Image:', composite);
print('Composite Bands:', composite.bandNames().getInfo());

// ============================================
// 9. Display True Color Composite
// ============================================
print('\n=== Display True Color ===');

Map.addLayer(composite, {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],  // Red, Green, Blue
  min: 0,
  max: 0.3
}, 'Cloud-free Composite (True Color)');

// ============================================
// 10. Display False Color (Vegetation)
// ============================================
print('\n=== Display False Color (Vegetation) ===');

Map.addLayer(composite, {
  bands: ['SR_B5', 'SR_B4', 'SR_B3'],  // NIR, Red, Green
  min: 0,
  max: 0.4
}, 'False Color - Vegetation');

// ============================================
// 11. ตัวอย่าง: Sentinel-2 Cloud-free Composite (สำหรับเปรียบเทียบ)
// ============================================
print('\n=== Sentinel-2 Cloud-free Composite (for comparison) ===');

function maskS2clouds(image) {
  var scl = image.select('SCL');
  // SCL band: 3=Cloud Shadow, 8=Cloud, 9=Cloud High Probability, 10=Thin Cirrus
  var mask = scl.neq(3)
      .and(scl.neq(8))
      .and(scl.neq(9))
      .and(scl.neq(10));
  return image.updateMask(mask).multiply(0.0001);
}

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))
    .map(maskS2clouds);

var s2Composite = s2.median().clip(roi);

Map.addLayer(s2Composite, {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 0.3
}, 'S2 Cloud-free Composite');

// ============================================
// 12. ตัวอย่าง: Mean Composite (Alternative)
// ============================================
print('\n=== Mean Composite (Alternative) ===');

var meanComposite = processedCollection.mean().clip(roi);

Map.addLayer(meanComposite, {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 0.3
}, 'Mean Composite');

// ============================================
// 13. ตัวอย่าง: Percentile Composite (90th percentile)
// ============================================
print('\n=== Percentile Composite (90th) ===');

var percentileComposite = processedCollection.reduce(
    ee.Reducer.percentile([90])
).clip(roi);

var p90Bands = percentileComposite.bandNames().map(function(name) {
  return ee.String(name).replace('_p90', '');
});

var p90Composite = percentileComposite.rename(p90Bands);

Map.addLayer(p90Composite.select(['SR_B4_p90', 'SR_B3_p90', 'SR_B2_p90']), {
  min: 0,
  max: 0.3
}, '90th Percentile Composite');

// ============================================
// 14. สรุปวิธีการ
// ============================================
print('\n=== Composite Methods ===');
print('1. MEDIAN:     ใช้ pixel ตรงกลาง - ดีสำหรับ cloud masking');
print('2. MEAN:       ใช้ค่าเฉลี่ย - ให้ภาพที่นุ่มนวล');
print('3. PERCENTILE: ใช้ percentile ที่กำหนด - ยืดหยุ่นสูง');

// ============================================
// 15. ตัวอย่าง: NDVI จาก Composite
// ============================================
print('\n=== NDVI from Composite ===');

var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4'])
    .rename('NDVI');

Map.addLayer(ndvi, {
  min: -0.2,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'darkgreen']
}, 'NDVI');

// ============================================
// 16. Center Map and Finish
// ============================================
Map.centerObject(roi, 11);

print('\n=== Summary Statistics ===');
var stats = composite.select(['SR_B4', 'SR_B3', 'SR_B2']).reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 30
});

print('Mean Red:', ee.Number(stats.get('SR_B4')));
print('Mean Green:', ee.Number(stats.get('SR_B3')));
print('Mean Blue:', ee.Number(stats.get('SR_B2')));

print('\n=== สำเร็จ ===');
