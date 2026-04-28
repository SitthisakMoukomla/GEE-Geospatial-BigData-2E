/*
 * =========================================
 * บทที่ 3: Sentinel-1 SAR - ตรวจจับน้ำท่วม
 * =========================================
 * ไฟล์: Ch03_01_sentinel1_sar_flood.js
 *
 * คำอธิบาย: ใช้ Sentinel-1 SAR ตรวจจับน้ำท่วม
 *          - Active Sensor (ไม่ขึ้นกับแสงอาทิตย์)
 *          - ทะลุเมฆได้
 *          - VV/VH Polarization
 *          - Threshold-based flood detection
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. กำหนด ROI ========

var roi = ee.Geometry.Point(100.5, 13.75);  // กรุงเทพมหานคร

// เพิ่ม Buffer
var roiBuffered = roi.buffer(50000);  // 50 กม.

print('ROI (Buffered):', roiBuffered);


// ======== 2. โหลด Sentinel-1 GRD Collection ========

// GRD = Ground Range Detected (เตรียมให้ใช้งานแล้ว)
// VV = Vertical-Vertical polarization
// VH = Vertical-Horizontal polarization
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD');

print('Sentinel-1 GRD Collection:', s1);


// ======== 3. กรองข้อมูล ========

// กรองสำหรับช่วงเวลาที่ชุ่มฉี่ (ฤดูมรสุม ตรวจจับน้ำท่วม)
var startDate = '2024-09-01';  // เริ่มฤดูมรสุม
var endDate = '2024-10-31';    // จบฤดูมรสุม

var s1Filtered = s1
    .filterDate(startDate, endDate)
    .filterBounds(roiBuffered)
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))  // Interferometric Wide mode
    .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));  // Descending orbit

print('จำนวนภาพ S1:', s1Filtered.size().getInfo());

var firstS1 = s1Filtered.first();
print('First S1 Image:', firstS1.id());
print('S1 Bands:', firstS1.bandNames());


// ======== 4. ดึง VH Band (ใช้สำหรับตรวจจับน้ำ) ========

// VH (Cross-polarization) ไวต่อการสะท้อนจากพื้นผิว
// น้ำมีพื้นผิวเรียบ → สะท้อนออกไป → ค่า VH ต่ำมาก
var vh = s1Filtered.select('VH');

print('VH Collection:', vh);

// สร้าง Median Composite (ลดสัญญาณรบกวน)
var vhMedian = vh.median();

print('VH Median:', vhMedian);

// Visualization parameters สำหรับ VH
// VH ในหน่วย dB (Decibel) โดยปกติอยู่ระหว่าง -25 ถึง 5 dB
var vhVis = {
  min: -25,
  max: 5,
  palette: ['000000', '0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000']
};

Map.addLayer(vhMedian.clip(roiBuffered), vhVis, 'VH Backscatter (dB)');


// ======== 5. Flood Detection - Threshold Method ========

// หลักการ: น้ำมี VH ต่ำ (< -20 dB)
// พื้นที่แห้งมี VH สูงกว่า (> -15 dB)
var floodThreshold = -20;  // dB

// สร้าง Flood Mask (1 = flood, 0 = no flood)
var floodMask = vhMedian.lt(floodThreshold);

print('Flood Detection (threshold < -20 dB)');
print('Flood Mask:', floodMask);

// Visualization สำหรับ Flood
var floodVis = {
  min: 0,
  max: 1,
  palette: ['ffffff', '0000ff']  // white=no flood, blue=flood
};

Map.addLayer(floodMask.clip(roiBuffered), floodVis, 'Flood Detection (SAR)');


// ======== 6. ตรวจจับ Water Bodies (ไม่รวม Flood) ========

// วิธีที่ 2: ใช้ Historical Water Index
// ดึงภาพ Pre-flood (ก่อนมีน้ำท่วม)
var s1PreFlood = s1
    .filterDate('2024-07-01', '2024-08-31')  // ก่อน flooding
    .filterBounds(roiBuffered)
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));

var vhPreFlood = s1PreFlood.select('VH').median();

print('Pre-flood VH:', vhPreFlood);

// สร้าง Difference Image
var vhDifference = vhMedian.subtract(vhPreFlood);

var diffVis = {
  min: -5,
  max: 5,
  palette: ['ff0000', '000000', '0000ff']
};

Map.addLayer(vhDifference.clip(roiBuffered), diffVis, 'VH Difference (Flood vs Pre-flood)');

// Flood detection ด้วย Difference
var floodDifference = vhDifference.lt(-5);  // ลดลงมาก = ตรวจจับน้ำท่วม

var floodDiffVis = {
  min: 0,
  max: 1,
  palette: ['ffffff', 'ff0000']
};

Map.addLayer(floodDifference.clip(roiBuffered), floodDiffVis, 'Flood Change Detection');


// ======== 7. Speckle Filtering (ลดสัญญาณรบกวน) ========

// Speckle Noise = ความเฉพาะของ SAR ที่ทำให้ภาพดูเป็นจุด
function applyLeeSigmaFilter(img) {
  return img.focal_median(7, 'square', 'pixels');
}

var vhFiltered = applyLeeSigmaFilter(vhMedian);

var vhFilteredVis = {
  min: -25,
  max: 5,
  palette: ['000000', '0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000']
};

Map.addLayer(vhFiltered.clip(roiBuffered), vhFilteredVis, 'VH Filtered (Speckle Reduced)');


// ======== 8. ใช้ VV Band เพิ่มเติม ========

// VV = Co-polarization (parallel)
// VV ให้ข้อมูลเพิ่มเติมเกี่ยวกับพื้นผิว
var vv = s1Filtered.select('VV').median();

var vvVis = {
  min: -20,
  max: 10,
  palette: ['000000', '0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000']
};

Map.addLayer(vv.clip(roiBuffered), vvVis, 'VV Backscatter (dB)', false);

// VV/VH Ratio (Radiative Index) - ช่วยจำแนก Land Cover
var vvvhRatio = vv.divide(vh);

var ratioVis = {
  min: 0,
  max: 10,
  palette: ['0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000']
};

Map.addLayer(vvvhRatio.clip(roiBuffered), ratioVis, 'VV/VH Ratio', false);


// ======== 9. Morphological Operations ========

// ใช้ Morphological Operations เพื่อ Clean Up Flood Mask
function connectFloodPixels(floodMask) {
  // Dilation: ขยายพื้นที่น้ำท่วม
  var dilated = floodMask.focal_max(1, 'square', 'pixels');
  // Erosion: หดเข้า (ลบ Noise)
  var cleaned = dilated.focal_min(1, 'square', 'pixels');
  return cleaned;
}

var floodCleaned = connectFloodPixels(floodMask);

var floodCleanedVis = {
  min: 0,
  max: 1,
  palette: ['ffffff', '0000ff']
};

Map.addLayer(floodCleaned.clip(roiBuffered), floodCleanedVis, 'Flood (Morphologically Cleaned)');


// ======== 10. คำนวณพื้นที่น้ำท่วม ========

// Calculate area
var pixelArea = ee.Image.pixelArea();  // m² ต่อ pixel

var floodArea = pixelArea
    .updateMask(floodMask)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roiBuffered,
      scale: 10,
      maxPixels: 1e9
    });

var floodAreaKm2 = ee.Number(floodArea.get('area')).divide(1e6);  // Convert to km²

print('พื้นที่น้ำท่วม (km²):', floodAreaKm2);


// ======== 11. Multi-temporal Analysis ========

// วิเคราะห์ความเปลี่ยนแปลงของน้ำท่วมตลอดเวลา
var monthlyFlood = [];

for (var month = 9; month <= 10; month++) {
  var monthStart = ee.Date('2024-' + month + '-01');
  var monthEnd = monthStart.advance(1, 'month');

  var monthlyS1 = s1
      .filterDate(monthStart, monthEnd)
      .filterBounds(roiBuffered)
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));

  var monthlyVH = monthlyS1.select('VH').median();
  var monthlyFlood = monthlyVH.lt(-20);

  print('Flood extent in month ' + month + ':', monthlyFlood);
}


// ======== 12. สร้าง Confidence Map ========

// นับจำนวนภาพที่ตรวจจับน้ำท่วม
var floodCount = s1Filtered.select('VH')
    .map(function(img) {
      return img.lt(-20).rename('flood');
    })
    .sum();

var maxImages = s1Filtered.size();

print('จำนวนภาพทั้งหมด:', maxImages.getInfo());
print('Flood count image:', floodCount);

// Confidence = Flood Count / Total Images
var floodConfidence = floodCount.divide(maxImages);

var confidenceVis = {
  min: 0,
  max: 1,
  palette: ['ffffff', 'ffff00', 'ff0000']
};

Map.addLayer(floodConfidence.clip(roiBuffered), confidenceVis, 'Flood Confidence (%)');


// ======== 13. Integration with Optical Data ========

// เปรียบเทียบกับ Sentinel-2 (ถ้าเมฆไม่มาก)
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(startDate, endDate)
    .filterBounds(roiBuffered)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30));

var mndwi = s2.map(function(img) {
  // MNDWI = (Green - SWIR) / (Green + SWIR)
  // = (B3 - B11) / (B3 + B11)
  return img.normalizedDifference(['B3', 'B11']).rename('MNDWI');
}).median();

var mndwiVis = {
  min: -0.5,
  max: 0.5,
  palette: ['ff0000', 'ffffff', '0000ff']
};

Map.addLayer(mndwi.clip(roiBuffered), mndwiVis, 'Sentinel-2 MNDWI (Water Index)', false);


// ======== 14. Export Results ========

// Export flood map
/*
Export.image.toDrive({
  image: floodMask.select(['VH']),
  description: 'Sentinel1_FloodDetection_Bangkok',
  scale: 10,
  region: roiBuffered,
  maxPixels: 1e9
});
*/


// ======== 15. Center Map ========

Map.centerObject(roiBuffered, 10);


// ======== สรุป ========

print('\n=== สรุปบทนี้ ===');
print('✓ โหลด Sentinel-1 SAR GRD Collection');
print('✓ ตรวจจับน้ำท่วมด้วย VH Threshold');
print('✓ Change Detection (Pre-flood vs Post-flood)');
print('✓ Speckle Filtering');
print('✓ Morphological Operations (Clean-up)');
print('✓ Flood Area Calculation');
print('✓ Multi-temporal Analysis');
print('✓ Flood Confidence Map');
print('✓ Integration with Optical Data (S2 MNDWI)');
print('\nข้อดี SAR: ทะลุเมฆ, ทำงานได้กลางคืน');
print('ข้อจำกัด: ต้อง interpret จาก Backscatter');
print('\nลำดับถัดไป: Ch03_02 - Sentinel-5P NO₂');
