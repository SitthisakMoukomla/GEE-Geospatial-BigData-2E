/*
 * =========================================
 * บทที่ 1: โหลดและแสดงภาพดาวเทียมแรก
 * =========================================
 * ไฟล์: Ch01_02_first_satellite_image.js
 *
 * คำอธิบาย: ขั้นตอนแรกสำหรับใช้ GEE
 *          - โหลด Landsat 8 Collection 2
 *          - ทำความเข้าใจ Image Collection
 *          - แสดงภาพบนแผนที่
 *          - ดูข้อมูล Metadata
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. กำหนด Region of Interest (ROI) ========

// สร้าง Point ที่กรุงเทพมหานคร (100.5°E, 13.75°N)
var roi = ee.Geometry.Point(100.5, 13.75);

print('ROI (Point Geometry):', roi);


// ======== 2. โหลด Landsat 8 Collection 2 ========

// Landsat 8 Collection 2 Level 2 (Surface Reflectance)
// ⚠️ สำคัญ: ต้องใช้ C02 (Collection 2) ไม่ใช่ C01 ที่ยุติแล้ว
var l8Collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2');

print('Landsat 8 Collection Info:', l8Collection);


// ======== 3. กรองข้อมูลด้วย Filter ========

// กรองตามวันที่
var startDate = '2024-12-01';
var endDate = '2025-02-28';

var l8Filtered = l8Collection
    .filterDate(startDate, endDate)
    .filterBounds(roi);

print('จำนวนภาพที่พบ:', l8Filtered.size());
print('Filtered Collection:', l8Filtered);


// ======== 4. ดูข้อมูล Image ตัวแรก ========

var firstImage = l8Filtered.first();

print('\n=== ข้อมูล Image ตัวแรก ===');
print('Image ID:', firstImage.id());
print('Image info:', firstImage);

// ดูชื่อ Band ทั้งหมด (Collection 2 ใช้ชื่อใหม่!)
var bandNames = firstImage.bandNames();
print('Band names (Collection 2):', bandNames);

// ดู Image Properties (metadata)
var imageProperties = firstImage.propertyNames();
print('Image properties:', imageProperties);


// ======== 5. ตรวจสอบค่า Pixel ที่ ROI ========

// สุ่มตัวอย่างค่า pixel ที่ ROI
var sample = firstImage.sample(roi, 30);  // 30 เมตร resolution
print('Sample value at ROI:', sample.first());


// ======== 6. สร้าง Composite (Median) ========

// สร้างภาพ Composite โดยใช้ค่า Median ของทั้ง Collection
var composite = l8Filtered.median().clip(roi);

print('Composite Image:', composite);
print('Composite bands:', composite.bandNames());


// ======== 7. กำหนด Visualization Parameters ========

// สำหรับ True Color RGB
// Landsat 8 Collection 2: Red=SR_B4, Green=SR_B3, Blue=SR_B2
// ⚠️ ต้องใช้ชื่อ Band ใหม่ (SR_B* ไม่ใช่ B*)
var visParamsTrueColor = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],  // Red, Green, Blue
  min: 0,
  max: 0.3,
  gamma: 1.2
};

print('Visualization Parameters for True Color:', visParamsTrueColor);


// ======== 8. แสดงภาพบนแผนที่ ========

// เพิ่มเลเยอร์ True Color
Map.addLayer(composite, visParamsTrueColor, 'Landsat 8 True Color');

// จำหน่าย Map ไปยังจุดศูนย์กลาง
Map.centerObject(roi, 10);  // zoom level 10


// ======== 9. สร้าง False Color Composite ========

// False Color: NIR=Red, Red=Green, Green=Blue
// ช่วยให้เห็นพืชพรรณชัดเจน (พืชจะเป็นสีแดง)
var visParamsFalseColor = {
  bands: ['SR_B5', 'SR_B4', 'SR_B3'],  // NIR, Red, Green
  min: 0,
  max: 0.3,
  gamma: 1.2
};

Map.addLayer(composite, visParamsFalseColor, 'Landsat 8 False Color');


// ======== 10. คำนวณ NDVI (แบบง่าย) ========

// NDVI = (NIR - Red) / (NIR + Red)
// Landsat 8 C02: NIR=SR_B5, Red=SR_B4
var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');

print('NDVI:', ndvi);

// กำหนด Visualization สำหรับ NDVI
var ndviVis = {
  min: 0,
  max: 0.8,
  palette: ['red', 'yellow', 'green']
};

Map.addLayer(ndvi, ndviVis, 'NDVI');


// ======== 11. แสดงสถิติข้อมูล ========

// คำนวณค่าสถิติของ NDVI
var ndviStats = ndvi.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e9
});

print('NDVI Statistics:');
print('Mean NDVI:', ndviStats.get('NDVI'));


// ======== 12. ดูข้อมูล Histogram ========

// สร้าง Histogram สำหรับ SR_B4 (Red Band)
var histogram = ui.Chart.image.histogram({
  image: composite.select('SR_B4'),
  region: roi,
  scale: 30,
  maxPixels: 1e6
});

histogram.setOptions({
  title: 'Histogram of Red Band (SR_B4)',
  hAxis: { title: 'Digital Number' },
  vAxis: { title: 'Frequency' }
});

print(histogram);


// ======== 13. Export ข้อมูล (Optional) ========

// ถ้าต้องการ export ภาพ uncomment บรรทัดนี้
/*
Export.image.toDrive({
  image: composite.select(['SR_B4', 'SR_B3', 'SR_B2']),
  description: 'Landsat8_TrueColor_Bangkok',
  scale: 30,
  region: roi,
  maxPixels: 1e9
});
*/


// ======== สรุป ========

print('\n=== สรุปบทนี้ ===');
print('✓ โหลด Landsat 8 Collection 2');
print('✓ กรองข้อมูลตามวันที่และพื้นที่');
print('✓ ดูข้อมูล Metadata และ Band names');
print('✓ สร้าง Composite ด้วย Median');
print('✓ แสดง True Color และ False Color');
print('✓ คำนวณ NDVI');
print('✓ ดูสถิติและ Histogram');
print('\nลำดับถัดไป: บทที่ 2 - GEE Data Catalog');
