/*
 * =========================================
 * บทที่ 2: การอ่าน Metadata ของ Landsat 9
 * =========================================
 * ไฟล์: Ch02_02_image_metadata.js
 *
 * คำอธิบาย: ทำความเข้าใจ Metadata ของภาพดาวเทียม
 *          - ชื่อ Collection และ Image ID
 *          - Band Names (Collection 2)
 *          - Image Properties (วันที่, เมฆ, etc.)
 *          - Cloud Score และ Quality Flags
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. กำหนด ROI ========

var roi = ee.Geometry.Point(100.5, 13.75);  // กรุงเทพมหานคร

print('ROI:', roi);


// ======== 2. โหลด Landsat 9 Collection 2 ========

// Landsat 9 เป็นดาวเทียมล่าสุด (Launch 2021, Operational 2022)
// มี OLI-2 sensor และ TIRS-2 thermal
var l9Collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2');

print('Landsat 9 Collection Info:', l9Collection);


// ======== 3. กรองและดึงภาพแรก ========

var l9Filtered = l9Collection
    .filterDate('2024-12-01', '2025-02-28')
    .filterBounds(roi);

var firstImage = l9Filtered.first();

print('จำนวนภาพ Landsat 9 ที่พบ:', l9Filtered.size());
print('\nFirst Image Info:');
print('Image ID:', firstImage.id());


// ======== 4. ดู Band Names (Collection 2) ========

var bandNames = firstImage.bandNames();

print('\n=== Band Names (Collection 2) ===');
print('Band Names:', bandNames);

// แสดงแต่ละ Band
var bandList = bandNames.getInfo();
for (var i = 0; i < bandList.length; i++) {
  print('Band ' + (i+1) + ':', bandList[i]);
}

// สำคัญ: Collection 2 ใช้ชื่อใหม่!
// - SR_B1 ถึง SR_B7 (Surface Reflectance)
// - ST_B10 (Thermal Infrared)
// - QA_PIXEL (Quality Assessment)
// - QA_RADSAT (Radiometric Saturation)


// ======== 5. ดู Image Properties ========

var propertyNames = firstImage.propertyNames();

print('\n=== Image Properties ===');
print('Property Names:', propertyNames);

// แสดงค่าของ property บางตัว
print('\nProperty Values:');
print('CLOUD_COVER:', firstImage.get('CLOUD_COVER'));
print('CLOUD_COVER_LAND:', firstImage.get('CLOUD_COVER_LAND'));
print('DATA_TYPE:', firstImage.get('DATA_TYPE'));
print('WRS_PATH:', firstImage.get('WRS_PATH'));
print('WRS_ROW:', firstImage.get('WRS_ROW'));


// ======== 6. ดู Acquisition Date ========

var acquisitionTime = firstImage.get('SENSING_TIME');
var timestamp = firstImage.getNumber('SENSING_TIME');

print('\n=== Date & Time ===');
print('SENSING_TIME (raw):', acquisitionTime);
print('SENSING_TIME (numeric):', timestamp);

// แปลงเป็นวันที่ที่อ่านได้
var date = ee.Date(timestamp);
print('Acquisition Date:', date.format('YYYY-MM-dd HH:mm:ss'));


// ======== 7. ดู Geometric Info ========

var bounds = firstImage.geometry();
var boundingBox = bounds.bounds();

print('\n=== Geometric Information ===');
print('Image Bounds:', bounds);
print('Bounding Box:', boundingBox);

// ดู Coordinate
var coordinates = ee.List(bounds.getCoordinates()).get(0);
print('Coordinates:', coordinates);


// ======== 8. ดู Scale ========

var projection = firstImage.projection();
var scale = projection.nominalScale();

print('\n=== Projection & Scale ===');
print('Projection:', projection);
print('Nominal Scale (m):', scale);


// ======== 9. ดู Data Type ของแต่ละ Band ========

print('\n=== Data Type by Band ===');

// Optical bands (SR_B1-SR_B7) - uint16
print('Optical Band Data Type: uint16 (0-65535 as DN)');
print('After Scale Factor: 0-1 (reflectance)');

// Thermal band (ST_B10) - uint16
print('Thermal Band Data Type: uint16 (0-65535 as DN)');
print('After Scale Factor: 149-399 K (Kelvin)');

// QA bands
print('QA_PIXEL Data Type: uint8 (bitwise flags)');
print('QA_RADSAT Data Type: uint8 (bitwise flags)');


// ======== 10. ตรวจสอบ QA_PIXEL ========

// QA_PIXEL ใช้ Bit Flags เพื่อบอกคุณภาพของ Pixel
var qaPixel = firstImage.select('QA_PIXEL');

print('\n=== QA_PIXEL Information ===');
print('QA_PIXEL range: 0-65535');
print('Bit 3: Cloud (0=not cloud, 1=cloud)');
print('Bit 4: Cloud Shadow (0=not shadow, 1=shadow)');
print('Bit 5: Snow (0=not snow, 1=snow)');
print('Bit 6: Clear (0=not assessed, 1=clear)');
print('Bit 7: Water (0=not water, 1=water)');

// ตัวอย่าง: ดู QA value ที่ ROI
var qaSample = firstImage.sample(roi, 30).first();
print('QA_PIXEL value at ROI:', qaSample.get('QA_PIXEL'));


// ======== 11. ตรวจสอบ Cloud Coverage ========

print('\n=== Cloud Information ===');

var cloudCover = firstImage.getNumber('CLOUD_COVER');
var cloudCoverLand = firstImage.getNumber('CLOUD_COVER_LAND');

print('CLOUD_COVER (entire scene %):', cloudCover);
print('CLOUD_COVER_LAND (land only %):', cloudCoverLand);

// ประเมินคุณภาพภาพ
if (cloudCoverLand.lte(10).getInfo()) {
  print('✓ ภาพมีคุณภาพสูง (เมฆน้อยกว่า 10%)');
} else if (cloudCoverLand.lte(30).getInfo()) {
  print('~ ภาพมีคุณภาพปานกลาง (เมฆ 10-30%)');
} else {
  print('✗ ภาพมีเมฆมาก (เมฆ > 30%)');
}


// ======== 12. ดู Sun Elevation & Azimuth ========

var sunElevation = firstImage.get('SUN_ELEVATION');
var sunAzimuth = firstImage.get('SUN_AZIMUTH');

print('\n=== Sun Geometry ===');
print('SUN_ELEVATION (°):', sunElevation);
print('SUN_AZIMUTH (°):', sunAzimuth);


// ======== 13. ดู System Metadata ========

print('\n=== System Metadata ===');
print('Image system:index:', firstImage.get('system:index'));
print('Image system:time_start:', firstImage.get('system:time_start'));
print('Image system:time_end:', firstImage.get('system:time_end'));


// ======== 14. สร้างตารางข้อมูล Summary ========

print('\n=== IMAGE SUMMARY TABLE ===');

var summaryText = [
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  'Landsat 9 Collection 2',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  'Collection: LANDSAT/LC09/C02/T1_L2',
  'Image ID: ' + firstImage.id().getInfo(),
  'Acquisition Date: ' + date.format('YYYY-MM-DD HH:mm:ss').getInfo(),
  'WRS Path/Row: ' + firstImage.get('WRS_PATH').getInfo() + '/' +
                      firstImage.get('WRS_ROW').getInfo(),
  'Cloud Cover (Land): ' + cloudCoverLand.getInfo() + '%',
  'Spatial Resolution: 30m (Multispectral), 15m (Panchromatic), 100m (Thermal)',
  'Radiometric Resolution: 14-bit',
  'Sun Elevation: ' + sunElevation.getInfo() + '°',
  'Sensor: OLI-2 + TIRS-2',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
];

print('\n');
for (var i = 0; i < summaryText.length; i++) {
  print(summaryText[i]);
}


// ======== 15. เปรียบเทียบกับ Landsat 8 ========

// สำหรับการเปรียบเทียบ
var l8Collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2');
var l8Filtered = l8Collection
    .filterDate('2024-12-01', '2025-02-28')
    .filterBounds(roi);

print('\n=== Landsat 8 vs Landsat 9 Comparison ===');
print('Landsat 8 images found:', l8Filtered.size().getInfo());
print('Landsat 9 images found:', l9Filtered.size().getInfo());
print('Total images (L8+L9): ' +
      (l8Filtered.size().getInfo() + l9Filtered.size().getInfo()));

// Landsat 9 มี radiometric resolution ดีกว่า (14-bit vs 12-bit ของ L8)
print('\nAdvantage of Landsat 9:');
print('- 14-bit radiometric resolution (vs 12-bit in L8)');
print('- TIRS-2 with better stray light correction');
print('- Combined L8+L9 gives 8-day revisit (vs 16-day)');


// ======== สรุป ========

print('\n=== สรุปบทนี้ ===');
print('✓ ดู Band Names (Collection 2)');
print('✓ อ่าน Image Properties (วันที่, เมฆ, พิกัด)');
print('✓ ตรวจสอบ QA Flags');
print('✓ ดู Sun Geometry');
print('✓ ประเมินคุณภาพภาพ');
print('✓ เปรียบเทียบ Landsat 8 vs 9');
print('\nลำดับถัดไป: Ch02_03 - Common Datasets');
