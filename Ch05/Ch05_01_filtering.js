/**
 * ===============================================
 * บทที่ 5: การจัดการข้อมูล (Data Management)
 * ===============================================
 *
 * Ch05_01_filtering.js
 * หัวข้อ: Filtering Image Collection - กรองภาพตามวันที่ เมฆ พื้นที่ และฤดูกาล
 *
 * สำหรับใช้ใน Google Earth Engine Code Editor
 * เขียนโดย: GEE Book Team
 * อัปเดต: 2025
 *
 * ===============================================
 */

// ============================================
// 1. กำหนด ROI (Region of Interest)
// ============================================
var roi = ee.Geometry.Rectangle([100.3, 13.5, 100.8, 14.0]); // บริเวณกรุงเทพฯ

// ============================================
// 2. กรองตามวันที่ (filterDate)
// ============================================
print('=== 2. กรองตามวันที่ ===');
var l8_date = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30');
print('จำนวนภาพ Landsat 8 (6 เดือน):', l8_date.size());

// ============================================
// 3. กรองเมฆ < 10% (Metadata Filter)
// ============================================
print('\n=== 3. กรองเมฆ ===');
var l8_clean = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-12-31')
    .filter(ee.Filter.lt('CLOUD_COVER', 10));
print('จำนวนภาพ Landsat 8 (เมฆ < 10%):', l8_clean.size());

// Sentinel-2 ใช้ metadata ต่างกัน
var s2_clean = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate('2025-01-01', '2025-12-31')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));
print('จำนวนภาพ Sentinel-2 (เมฆ < 10%):', s2_clean.size());

// ============================================
// 4. กรองตามตำแหน่ง (filterBounds)
// ============================================
print('\n=== 4. กรองตามตำแหน่ง ===');
var l8_roi = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-12-31')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUD_COVER', 20));
print('จำนวนภาพใน ROI (เมฆ < 20%):', l8_roi.size());

// ============================================
// 5. Calendar Range Filter - กรองตามฤดูกาล/เดือน
// ============================================
print('\n=== 5. Calendar Range Filter (กรองตามเดือน) ===');

// กรองเฉพาะฤดูแล้ง (มกราคม-มีนาคม) จาก 5 ปีย้อนหลัง
var dry_season = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2020-01-01', '2025-12-31')
    .filterBounds(roi)
    .filter(ee.Filter.calendarRange(1, 3, 'month'));  // เดือน 1-3
print('จำนวนภาพฤดูแล้ง (5 ปี, ม.ค.-มี.ค.):', dry_season.size());

// กรองเฉพาะฤดูฝน (พฤษภาคม-ตุลาคม)
var rainy_season = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2020-01-01', '2025-12-31')
    .filterBounds(roi)
    .filter(ee.Filter.calendarRange(5, 10, 'month'));  // เดือน 5-10
print('จำนวนภาพฤดูฝน (5 ปี, พ.ค.-ต.ค.):', rainy_season.size());

// ============================================
// 6. ตัวอย่าง: รวมหลายเงื่อนไข
// ============================================
print('\n=== 6. รวมหลายเงื่อนไข ===');
var l8_complete = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-12-31')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUD_COVER', 15))
    .filter(ee.Filter.calendarRange(1, 3, 'month'));  // ฤดูแล้งเท่านั้น
print('จำนวนภาพ (รวมทุกเงื่อนไข):', l8_complete.size());

// ============================================
// 7. แสดงข้อมูล
// ============================================
print('\n=== 7. ข้อมูล Metadata ของ Collection ===');
var first_image = l8_complete.first();
print('ภาพแรก:', first_image);
print('Date:', first_image.date());
print('Cloud Cover:', first_image.get('CLOUD_COVER'));

// ============================================
// 8. ส่วนแสดงภาพ (ถ้ามีข้อมูล)
// ============================================
if (l8_complete.size().getInfo() > 0) {
  var composite = l8_complete.median();
  Map.addLayer(composite, {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 0,
    max: 0.3
  }, 'Composite True Color');
}

Map.centerObject(roi, 10);
print('\n=== สำเร็จ ===');
