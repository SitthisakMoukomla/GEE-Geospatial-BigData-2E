/*
 * =========================================
 * บทที่ 4: Cloud Masking ด้วย QA_PIXEL
 * =========================================
 * ไฟล์: Ch04_02_cloud_masking.js
 *
 * คำอธิบาย: Landsat C02 ใช้ QA_PIXEL แทน BQA
 *          - Bit Flags: Cloud (Bit 3), Shadow (Bit 4)
 *          - bitwiseAnd operation
 *          - Confidence levels
 *          - Optional: Snow, Dilated Cloud
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. กำหนด ROI ========

var roi = ee.Geometry.Point(100.5, 13.75);  // กรุงเทพมหานคร

var roiBuffered = roi.buffer(50000);

print('ROI (Buffered):', roiBuffered);


// ======== 2. โหลด Landsat 8 Collection 2 ========

// Collection 2 ใช้ QA_PIXEL (ไม่ใช่ BQA)
var l8Raw = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roiBuffered);

print('Landsat 8 Collection (before cloud mask):', l8Raw);
print('จำนวนภาพ:', l8Raw.size().getInfo());


// ======== 3. ทำความเข้าใจ QA_PIXEL ========

print('\n=== QA_PIXEL Bit Structure ===');

// QA_PIXEL มีคำสั่งเพื่อบอกคุณภาพของแต่ละ Pixel
// มีหลาย Bits ที่เก็บข้อมูลต่างๆ:

var qaInfo = [
  ['Bit 0', 'Fill', 'Pixel is fill (no data)'],
  ['Bit 1', 'Dilated Cloud', 'Dilated cloud'],
  ['Bit 2', 'Cloud Confidence (1)', 'Cloud confidence bit 1'],
  ['Bit 3', 'Cloud', 'Cloud'],
  ['Bit 4', 'Cloud Shadow', 'Cloud shadow'],
  ['Bit 5', 'Snow', 'Snow'],
  ['Bit 6', 'Clear', 'Clear'],
  ['Bit 7', 'Water', 'Water']
];

print('QA_PIXEL Bit Meanings:');
for (var i = 0; i < qaInfo.length; i++) {
  print(qaInfo[i][0] + ' = ' + qaInfo[i][1] + ': ' + qaInfo[i][2]);
}


// ======== 4. Basic Cloud Mask (Bit 3) ========

// Cloud Bit = Bit 3
// bit value 1 = cloud present, 0 = no cloud

function maskCloudsBit3(image) {
  var qa = image.select('QA_PIXEL');

  // Create cloud mask: (1 << 3) = 8 in binary
  // bitwiseAnd: ดึงเฉพาะ Bit 3
  // eq(0): เลือกเฉพาะ pixel ที่ Bit 3 = 0 (ไม่มีเมฆ)
  var cloudBit = 1 << 3;
  var cloudMask = qa.bitwiseAnd(cloudBit).eq(0);

  return image.updateMask(cloudMask);
}

print('\n=== Mask 1: Cloud (Bit 3) Only ===');
var l8MaskCloud = l8Raw.map(maskCloudsBit3);

// แสดง First Image
var firstCloud = l8MaskCloud.first();
print('First masked image:', firstCloud.id());

// Visualization
var visMask = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 50000  // Raw DN
};

Map.addLayer(firstCloud, visMask, 'Cloud Mask Only (Bit 3)', false);


// ======== 5. Cloud + Shadow Mask (Bits 3 & 4) ========

// Cloud Shadow Bit = Bit 4

function maskCloudsAndShadowBit3_4(image) {
  var qa = image.select('QA_PIXEL');

  var cloudBit = 1 << 3;     // Cloud
  var shadowBit = 1 << 4;    // Cloud Shadow

  // Create mask: both cloud AND shadow must be 0
  var mask = qa.bitwiseAnd(cloudBit).eq(0)
      .and(qa.bitwiseAnd(shadowBit).eq(0));

  return image.updateMask(mask);
}

print('\n=== Mask 2: Cloud + Shadow (Bits 3 & 4) ===');
var l8MaskCloudShadow = l8Raw.map(maskCloudsAndShadowBit3_4);

var firstCloudShadow = l8MaskCloudShadow.first();
print('First masked image:', firstCloudShadow.id());

Map.addLayer(firstCloudShadow, visMask, 'Cloud + Shadow Mask (Bits 3,4)', false);


// ======== 6. Complete Cloud Mask (Bits 1, 3, 4, 5) ========

// Optional: Dilated Cloud (Bit 1), Snow (Bit 5)

function maskCloudsComplete(image) {
  var qa = image.select('QA_PIXEL');

  // Define bits
  var dilatedCloudBit = 1 << 1;  // Dilated cloud
  var cloudBit = 1 << 3;          // Cloud
  var cloudShadowBit = 1 << 4;    // Cloud shadow
  var snowBit = 1 << 5;           // Snow

  // Create comprehensive mask
  var mask = qa.bitwiseAnd(dilatedCloudBit).eq(0)
      .and(qa.bitwiseAnd(cloudBit).eq(0))
      .and(qa.bitwiseAnd(cloudShadowBit).eq(0))
      .and(qa.bitwiseAnd(snowBit).eq(0));

  return image.updateMask(mask);
}

print('\n=== Mask 3: Complete (Dilated, Cloud, Shadow, Snow) ===');
var l8MaskComplete = l8Raw.map(maskCloudsComplete);

var firstComplete = l8MaskComplete.first();
print('First masked image:', firstComplete.id());

Map.addLayer(firstComplete, visMask, 'Complete Cloud Mask', false);


// ======== 7. Scale Factor + Cloud Mask ========

// IMPORTANT: Scale Factor AFTER cloud mask
// Order: Load → Cloud Mask → Scale Factor

function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.')
      .multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*')
      .multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

print('\n=== Complete Workflow: Cloud Mask → Scale Factor ===');

var l8Final = l8Raw
    .map(maskCloudsAndShadowBit3_4)  // Step 1: Cloud mask
    .map(applyScaleFactors);         // Step 2: Scale factor

var l8Composite = l8Final.median().clip(roiBuffered);

print('Final composite:', l8Composite);

// Proper visualization (scaled reflectance)
var visScaled = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 0.3
};

Map.addLayer(l8Composite, visScaled, 'L8 Composite (Masked + Scaled)');


// ======== 8. Visualization: Cloud Mask Effect ========

// สร้าง Image ของ QA_PIXEL เพื่อเห็น Cloud Distribution
var firstImage = l8Raw.first();
var qaPixel = firstImage.select('QA_PIXEL');

// สร้าง Visual mask (สีแสดง cloud areas)
var cloudMaskVis = maskCloudsAndShadowBit3_4(firstImage);
var cloudCount = cloudMaskVis.bandNames().length;

print('Bands remaining after cloud mask:', cloudCount.getInfo());

// แสดง Quality Pixels
var qaVis = {
  min: 0,
  max: 32768,
  palette: ['black', 'white']
};

Map.addLayer(qaPixel.clip(roiBuffered), qaVis, 'QA_PIXEL Values', false);


// ======== 9. Cloud Percentage ========

// ดึง Cloud Cover Information จาก Image Properties
var cloudCover = firstImage.get('CLOUD_COVER');
print('CLOUD_COVER property:', cloudCover);

// Calculate percentage of masked pixels
var totalPixels = ee.Image(1).reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: roiBuffered,
  scale: 30,
  maxPixels: 1e9
});

var maskedImage = maskCloudsAndShadowBit3_4(firstImage);
var validPixels = maskedImage.select(0).reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: roiBuffered,
  scale: 30,
  maxPixels: 1e9
});

var validCount = ee.Number(validPixels.get('SR_B4')).divide(
    ee.Number(totalPixels.get('constant')));

print('Valid pixels (%):', validCount.multiply(100));


// ======== 10. Multi-temporal: Show improvement ========

print('\n=== Multi-temporal Comparison ===');

// Load multiple dates
var l8Timeline = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roiBuffered);

// Apply cloud mask and scale
var l8TimelineProcessed = l8Timeline
    .map(maskCloudsAndShadowBit3_4)
    .map(applyScaleFactors);

print('Timeline collection (processed):', l8TimelineProcessed.size().getInfo());

// Find best image (least masked pixels)
var bestImage = l8TimelineProcessed
    .map(function(img) {
      var cloudPercent = img.bandNames().length;
      return img.set('cloud_mask_applied', 1);
    })
    .first();

print('Best image:', bestImage.id());
Map.addLayer(bestImage, visScaled, 'Best Image (Least Clouds)', false);


// ======== 11. Confidence Levels (Optional) ========

// Collection 2 มี Confidence bits สำหรับ Cloud
// Bit 2 = High confidence cloud vs Bit 1 = Dilated cloud

function maskHighConfidenceCloud(image) {
  var qa = image.select('QA_PIXEL');

  // Cloud Confidence Low (Bit 2)
  var cloudConfLow = 1 << 2;

  // Cloud (Bit 3)
  var cloudBit = 1 << 3;

  // Shadow (Bit 4)
  var shadowBit = 1 << 4;

  // Mask: only remove high-confidence clouds and shadows
  var mask = qa.bitwiseAnd(cloudBit).eq(0)
      .and(qa.bitwiseAnd(shadowBit).eq(0));

  return image.updateMask(mask);
}

var l8HighConfidence = l8Raw.map(maskHighConfidenceCloud);

print('\nHigh Confidence Cloud Mask applied');


// ======== 12. Export Masked Composite ========

/*
// Uncomment to export
Export.image.toDrive({
  image: l8Composite.select(['SR_B4', 'SR_B3', 'SR_B2']),
  description: 'Landsat8_Masked_Bangkok',
  scale: 30,
  region: roiBuffered,
  maxPixels: 1e9
});
*/


// ======== 13. Center Map ========

Map.centerObject(roiBuffered, 10);


// ======== 14. Summary Comparison ========

print('\n=== Cloud Masking Summary ===');
print('Collection 1: BQA band (deprecated)');
print('Collection 2: QA_PIXEL band (current)');
print('');
print('Common Bit Flags (Collection 2):');
print('  Bit 3: Cloud');
print('  Bit 4: Cloud Shadow');
print('  Bit 1: Dilated Cloud');
print('  Bit 5: Snow');
print('');
print('bitwiseAnd Logic:');
print('  (1 << 3) = 8 (binary: 00001000)');
print('  qa.bitwiseAnd(8): extracts only Bit 3');
print('  .eq(0): keeps pixels where Bit 3 = 0 (no cloud)');


// ======== สรุป ========

print('\n=== สรุปบทนี้ ===');
print('✓ Collection 2 ใช้ QA_PIXEL (ไม่ใช่ BQA)');
print('✓ Bit 3 = Cloud, Bit 4 = Shadow');
print('✓ bitwiseAnd operation เพื่อดึง bits');
print('✓ Order: Cloud Mask → Scale Factor');
print('✓ Optional: Dilated Cloud (Bit 1), Snow (Bit 5)');
print('✓ ตรวจสอบ CLOUD_COVER property');
print('✓ Calculate valid pixel percentage');
print('\n⚠️ ต้อง Cloud Mask ก่อน Scale Factor เสมอ!');
print('\nลำดับถัดไป: Ch04_03 - Complete Workflow');
