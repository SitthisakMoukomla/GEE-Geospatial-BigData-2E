/*
 * =========================================
 * บทที่ 2: Dynamic World Land Cover
 * =========================================
 * ไฟล์: Ch02_01_dynamic_world.js
 *
 * คำอธิบาย: ใช้ Dynamic World Classification
 *          - โหลด Dynamic World Collection
 *          - สร้าง Land Cover Map
 *          - แสดงผลด้วย 9 classes
 *          - ดู Mode (สิ่งปกคลุมที่เด่นที่สุด)
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. กำหนด ROI ========

var roi = ee.Geometry.Point(100.5, 13.75);  // กรุงเทพมหานคร

// เพิ่ม Buffer เพื่อให้ได้พื้นที่ใหญ่ขึ้น
var roiBuffered = roi.buffer(50000);  // 50 กม.

print('ROI (Buffered):', roiBuffered);


// ======== 2. โหลด Dynamic World Collection ========

// Dynamic World เป็นข้อมูล Land Cover ที่ Google สร้างด้วย Deep Learning
// จากภาพ Sentinel-2 โดยอัตโนมัติ ทุกๆ วัน ทั่วโลก
var dynamicWorld = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1');

print('Dynamic World Collection:', dynamicWorld);


// ======== 3. กรองข้อมูล ========

var startDate = '2024-12-01';
var endDate = '2025-02-28';

var dwFiltered = dynamicWorld
    .filterDate(startDate, endDate)
    .filterBounds(roiBuffered);

print('จำนวนภาพ DW:', dwFiltered.size());


// ======== 4. ดู Band Names ของ Dynamic World ========

var firstDWImage = dwFiltered.first();
var dwBands = firstDWImage.bandNames();

print('Dynamic World Bands:', dwBands);
// คาดว่าจะมี: water, trees, grass, flooded_vegetation, crops,
//             shrub_and_scrub, built, bare, snow_and_ice, label


// ======== 5. สร้าง Mode Composite ========

// Mode = ค่าที่เกิดขึ้นบ่อยที่สุด (most frequent classification)
// ใช้เพื่อให้เห็นสิ่งปกคลุม "เด่นที่สุด" ในแต่ละ Pixel
var dwMode = dwFiltered.mode();

print('DW Mode Composite:', dwMode);


// ======== 6. เลือก Label Band ========

// Label Band มีค่า 0-8 แทน 9 ประเภท
var landCoverLabel = dwMode.select('label');

print('Land Cover Label:', landCoverLabel);


// ======== 7. สร้างตารางแปลงความหมายของ Label ========

// Dynamic World Classification (9 classes):
// 0 = Water        - พื้นที่น้ำ (สีน้ำเงิน)
// 1 = Trees        - ป่าไม้ (สีเขียวเข้ม)
// 2 = Grass        - หญ้า/ทุ่งหญ้า (สีเขียวอ่อน)
// 3 = Flooded Veg. - พืชที่ท่วมน้ำ/หนองน้ำ (สีฟ้าอ่อน)
// 4 = Crops        - พื้นที่เกษตร (สีเหลือง)
// 5 = Shrub        - พุ่มไม้/灌木 (สีส้มอ่อน)
// 6 = Built        - พื้นที่สร้างสรรค์/เมือง (สีแดง)
// 7 = Bare         - หินเปลือย/พื้นดิน (สีน้ำตาล)
// 8 = Snow/Ice     - หิมะ/น้ำแข็ง (สีขาว)


// ======== 8. กำหนด Visualization Parameters ========

// สีสำหรับแต่ละคลาส (เหมือนกับ GEE Official)
var palette = [
  '419BDF',  // 0: Water - น้ำเงิน
  '397D49',  // 1: Trees - เขียวเข้ม
  '88B053',  // 2: Grass - เขียวอ่อน
  '7A87C6',  // 3: Flooded Vegetation - ม่วงอ่อน
  'E49635',  // 4: Crops - ส้มเหลือง
  'DFC35A',  // 5: Shrub/Scrub - เหลืองอ่อน
  'C4281B',  // 6: Built - แดง
  'A59B8F',  // 7: Bare - น้ำตาล
  'B39FE1'   // 8: Snow/Ice - ม่วงอ่อน
];

var visParams = {
  min: 0,
  max: 8,
  palette: palette
};


// ======== 9. แสดงผลบนแผนที่ ========

Map.addLayer(landCoverLabel, visParams, 'Dynamic World Classification');
Map.centerObject(roiBuffered, 10);


// ======== 10. สร้าง Legend ========

// สร้าง Panel สำหรับ Legend
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px',
    margin: '10px'
  }
});

// เพิ่ม Title
var legendTitle = ui.Label({
  value: 'Dynamic World Classification',
  style: {
    fontWeight: 'bold',
    fontSize: '14px',
    margin: '0 0 8px 0',
    padding: '0'
  }
});
legend.add(legendTitle);

// สร้างรายการ Legend
var landCoverNames = [
  'Water',
  'Trees',
  'Grass',
  'Flooded Vegetation',
  'Crops',
  'Shrub/Scrub',
  'Built',
  'Bare',
  'Snow/Ice'
];

for (var i = 0; i < 9; i++) {
  var color = palette[i];
  var name = landCoverNames[i];

  // สร้าง Color Box
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + color,
      padding: '8px',
      margin: '0 0 4px 0',
      border: '1px solid #ccc'
    }
  });

  // สร้าง Label Text
  var labelText = ui.Label({
    value: i + ': ' + name,
    style: {
      margin: '0 0 4px 8px'
    }
  });

  // เพิ่มเข้า Legend
  var legendItem = ui.Panel({
    widgets: [colorBox, labelText],
    layout: ui.Panel.Layout.flow('horizontal')
  });

  legend.add(legendItem);
}

// เพิ่ม Legend ลงแผนที่
Map.add(legend);


// ======== 11. คำนวณ Pixel Count ========

// นับจำนวน Pixel ของแต่ละคลาส
var pixelCounts = landCoverLabel.reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(),
  geometry: roiBuffered,
  scale: 10,
  maxPixels: 1e9
});

print('\nPixel Counts by Class:');
print('Frequency Histogram:', pixelCounts);


// ======== 12. คำนวณ Percentage Coverage ========

// คำนวณร้อยละพื้นที่ของแต่ละคลาส
var areaImage = ee.Image.pixelArea().divide(1e6);  // Convert to km²

for (var i = 0; i < 9; i++) {
  var classMask = landCoverLabel.eq(i);
  var classArea = areaImage.updateMask(classMask).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roiBuffered,
    scale: 10,
    maxPixels: 1e9
  });

  var area = ee.Number(classArea.get('area'));
  print(landCoverNames[i] + ' area (km²):', area);
}


// ======== 13. สร้างภาพ Filtered สำหรับแต่ละคลาส ========

// สร้าง Mask เฉพาะป่าไม้ (Trees)
var treesMask = landCoverLabel.eq(1);
var treesArea = ee.Image(1).updateMask(treesMask);

var treesVis = {
  min: 0,
  max: 1,
  palette: ['transparent', '397D49']
};

Map.addLayer(treesArea, treesVis, 'Trees Only', false);

// สร้าง Mask เฉพาะพื้นที่เกษตร (Crops)
var cropsMask = landCoverLabel.eq(4);
var cropsArea = ee.Image(1).updateMask(cropsMask);

var cropsVis = {
  min: 0,
  max: 1,
  palette: ['transparent', 'E49635']
};

Map.addLayer(cropsArea, cropsVis, 'Crops Only', false);


// ======== 14. สร้าง Chart ========

// Chart แสดงการเปลี่ยนแปลง Land Cover over time
var dwByMonth = dynamicWorld
    .filterBounds(roiBuffered)
    .filterDate('2024-01-01', '2025-02-28');

// สร้าง Monthly Composite
var months = ee.List.sequence(1, 12).map(function(month) {
  var startMonth = ee.Date('2024-01-01').advance(ee.Number(month).subtract(1), 'month');
  var endMonth = startMonth.advance(1, 'month');

  var monthlyComposite = dwByMonth
      .filterDate(startMonth, endMonth)
      .mode();

  return monthlyComposite.set('month', month);
});

print('Monthly composites:', months);


// ======== สรุป ========

print('\n=== สรุปบทนี้ ===');
print('✓ โหลด Dynamic World Collection');
print('✓ สร้าง Mode Composite (ค่าเด่นที่สุด)');
print('✓ แสดง 9 Land Cover Classes พร้อมสี');
print('✓ สร้าง Legend');
print('✓ คำนวณพื้นที่ของแต่ละคลาส');
print('✓ กรอง Land Cover เฉพาะคลาส');
print('\nลำดับถัดไป: Ch02_02 - Image Metadata');
