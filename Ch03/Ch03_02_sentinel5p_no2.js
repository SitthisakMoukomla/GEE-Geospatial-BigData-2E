/*
 * =========================================
 * บทที่ 3: Sentinel-5P NO₂ - คุณภาพอากาศ
 * =========================================
 * ไฟล์: Ch03_02_sentinel5p_no2.js
 *
 * คำอธิบาย: ใช้ Sentinel-5P ติดตามมลพิษ NO₂
 *          - ตรวจจับแหล่งกำเนิดมลพิษ
 *          - แสดงการแพร่กระจายมลพิษ
 *          - Time Series Analysis
 *          - แสดงเหนือกรุงเทพฯ
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. กำหนด ROI ========

// กรุงเทพมหานคร
var roi = ee.Geometry.Point(100.5, 13.75);

// เพิ่ม Buffer เพื่อเห็นการแพร่กระจาย
var roiBuffered = roi.buffer(200000);  // 200 กม. (ประมาณ 4-5 จังหวัด)

print('ROI (Bangkok area):', roiBuffered);


// ======== 2. โหลด Sentinel-5P NO₂ Collection ========

// Sentinel-5P TROPOMI sensor ติดตามก๊าซบรรยากาศ
// NO₂ = Nitrogen Dioxide (มลพิษจากเมืองและโรงงาน)
var s5pNO2 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2');

print('Sentinel-5P NO2 Collection:', s5pNO2);


// ======== 3. ตรวจสอบ Bands ========

var firstNO2 = s5pNO2.first();
print('First S5P Image:', firstNO2.id());
print('S5P Bands:', firstNO2.bandNames());

// Bands ที่สำคัญ:
// - tropospheric_NO2_column_number_density (หลัก)
// - stratospheric_NO2_column_number_density
// - NO2_column_number_density (รวม)
// - tropopause_pressure
// - absorbing_aerosol_index


// ======== 4. กรองข้อมูล ========

var startDate = '2025-01-01';
var endDate = '2025-03-31';  // Q1 2025

var s5pFiltered = s5pNO2
    .filterDate(startDate, endDate)
    .filterBounds(roiBuffered);

print('จำนวนภาพ S5P NO2:', s5pFiltered.size().getInfo());


// ======== 5. เลือก NO₂ Band หลัก ========

// Tropospheric NO₂ = NO₂ ในชั้นบรรยากาศที่ใกล้พื้นดิน (สิ่งที่ส่งผลต่อมนุษย์)
var no2Tropospheric = s5pFiltered.select('tropospheric_NO2_column_number_density');

print('NO₂ Tropospheric Collection:', no2Tropospheric);

// สร้าง Mean Composite
var no2Mean = no2Tropospheric.mean();

print('NO₂ Mean Composite:', no2Mean);

// สร้าง Max Composite (แหล่งกำเนิดเด่นที่สุด)
var no2Max = no2Tropospheric.max();

// สร้าง Min Composite (วันที่ดี)
var no2Min = no2Tropospheric.min();


// ======== 6. Visualization Parameters สำหรับ NO₂ ========

// NO₂ column density มีหน่วยเป็น mol/m²
// ค่าแนวนอน: 0-0.0002 mol/m² = 0-200 × 10¹⁵ mol/m²
var no2Vis = {
  min: 0,
  max: 0.0002,
  palette: [
    '000000',  // Black = ต่ำสุด (ไม่มี NO₂)
    '0000ff',  // Blue
    '00ffff',  // Cyan
    '00ff00',  // Green
    'ffff00',  // Yellow
    'ff8800',  // Orange
    'ff0000'   // Red = สูงสุด (มลพิษสูง)
  ]
};

// แสดง NO₂ Mean
Map.addLayer(no2Mean.clip(roiBuffered), no2Vis, 'NO₂ Mean (Q1 2025)');

// แสดง NO₂ Max
Map.addLayer(no2Max.clip(roiBuffered), no2Vis, 'NO₂ Max', false);


// ======== 7. ตรวจจับแหล่งกำเนิดมลพิษ ========

// Anomaly Detection: ค่าที่สูงกว่า Mean สะสม
var no2Threshold = 0.00015;  // mol/m² (มลพิษสูง)

var highNO2 = no2Mean.gte(no2Threshold);

var hotspotVis = {
  min: 0,
  max: 1,
  palette: ['transparent', 'ff0000']
};

Map.addLayer(highNO2.clip(roiBuffered), hotspotVis, 'NO₂ Hotspots (Pollution Sources)');


// ======== 8. ดึงค่า NO₂ ที่ ROI ========

var no2Sample = no2Mean.sample(roi, 50000).first();
print('Mean NO₂ at Bangkok:', no2Sample.get('tropospheric_NO2_column_number_density'));


// ======== 9. Time Series Analysis ========

// วิเคราะห์ความเปลี่ยนแปลง NO₂ ตามเวลา
var dailyNO2 = [];

for (var day = 1; day <= 90; day++) {
  var dayDate = ee.Date(startDate).advance(day - 1, 'day');
  var nextDay = dayDate.advance(1, 'day');

  var dayNO2 = s5pNO2
      .filterDate(dayDate, nextDay)
      .filterBounds(roiBuffered)
      .select('tropospheric_NO2_column_number_density')
      .mean();

  if (dayNO2.bandCount().getInfo() > 0) {
    dailyNO2.push(dayNO2);
  }
}

print('Daily NO₂ composites:', dailyNO2.length);


// ======== 10. สร้าง Chart NO₂ ตามเวลา ========

// ดึง Time Series Data
var timeSeriesNO2 = s5pFiltered
    .select('tropospheric_NO2_column_number_density')
    .map(function(img) {
      var date = img.date();
      var mean = img.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: roiBuffered,
        scale: 5000,
        maxPixels: 1e6
      });
      return ee.Feature(null, {
        'date': date.millis(),
        'NO2': mean.get('tropospheric_NO2_column_number_density')
      });
    });

var timeSeriesFC = ee.FeatureCollection(timeSeriesNO2);

// สร้าง Chart
var chart = ui.Chart.feature.byProperty({
  features: timeSeriesFC,
  xProperties: ['date'],
  yProperties: ['NO2'],
  seriesTitle: 'NO₂ Tropospheric Column'
}).setChartType('LineChart').setOptions({
  title: 'Sentinel-5P NO₂ Time Series (Bangkok Q1 2025)',
  hAxis: {
    title: 'Date',
    format: 'MMM dd'
  },
  vAxis: {
    title: 'NO₂ (mol/m²)'
  },
  pointSize: 4,
  lineWidth: 2
});

print(chart);


// ======== 11. เปรียบเทียบ NO₂ ในแต่ละเดือน ========

// มกราคม 2025
var jan2025NO2 = s5pNO2
    .filterDate('2025-01-01', '2025-02-01')
    .filterBounds(roiBuffered)
    .select('tropospheric_NO2_column_number_density')
    .mean();

// กุมภาพันธ์ 2025
var feb2025NO2 = s5pNO2
    .filterDate('2025-02-01', '2025-03-01')
    .filterBounds(roiBuffered)
    .select('tropospheric_NO2_column_number_density')
    .mean();

// มีนาคม 2025
var mar2025NO2 = s5pNO2
    .filterDate('2025-03-01', '2025-04-01')
    .filterBounds(roiBuffered)
    .select('tropospheric_NO2_column_number_density')
    .mean();

print('January NO₂:', jan2025NO2);
print('February NO₂:', feb2025NO2);
print('March NO₂:', mar2025NO2);

// แสดง Comparison
Map.addLayer(jan2025NO2.clip(roiBuffered), no2Vis, 'NO₂ January', false);
Map.addLayer(feb2025NO2.clip(roiBuffered), no2Vis, 'NO₂ February', false);
Map.addLayer(mar2025NO2.clip(roiBuffered), no2Vis, 'NO₂ March', false);


// ======== 12. Trend Analysis ========

// คำนวณ Difference ระหว่าง Month
var no2TrendFebMinusJan = feb2025NO2.subtract(jan2025NO2);
var no2TrendMarMinusFeb = mar2025NO2.subtract(feb2025NO2);

var trendVis = {
  min: -0.00005,
  max: 0.00005,
  palette: ['0000ff', 'ffffff', 'ff0000']  // Blue = decrease, Red = increase
};

Map.addLayer(no2TrendFebMinusJan.clip(roiBuffered), trendVis, 'NO₂ Trend (Feb-Jan)', false);
Map.addLayer(no2TrendMarMinusFeb.clip(roiBuffered), trendVis, 'NO₂ Trend (Mar-Feb)', false);


// ======== 13. ตรวจจับแหล่งกำเนิด (Point Source) ========

// ใช้ Gradient Detection เพื่อหา Edges = แหล่งกำเนิด
var no2Gradient = ee.Terrain.gradient(no2Mean.select(0));

var gradientVis = {
  min: 0,
  max: 0.00001,
  palette: ['black', 'white']
};

Map.addLayer(no2Gradient.clip(roiBuffered), gradientVis, 'NO₂ Gradient (Source Detection)', false);


// ======== 14. ดู Other Gases ใน S5P ========

// S5P ติดตาม 7 ก๊าซต่างๆ
// สำหรับตัวอย่าง: SO₂ (จากภูเขาไฟ/โรงงาน)
var s5pSO2 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_SO2');

var so2Filtered = s5pSO2
    .filterDate(startDate, endDate)
    .filterBounds(roiBuffered)
    .select('SO2_column_number_density')
    .mean();

var so2Vis = {
  min: 0,
  max: 0.0005,
  palette: [
    'ffffff',
    '00ff00',
    'ffff00',
    'ff8800',
    'ff0000'
  ]
};

Map.addLayer(so2Filtered.clip(roiBuffered), so2Vis, 'SO₂ Column', false);


// ======== 15. Correlation between NO₂ and Activities ========

// NO₂ มาจากหลากหลายแหล่ง:
// - Vehicles (รถยนต์)
// - Power plants (โรงไฟฟ้า)
// - Industrial facilities (โรงงาน)
// - Biomass burning (เผาไหม้)

// ใน Bangkok ส่วนใหญ่มาจากยานพาหนะและโรงงาน
// ใน Northern Thailand (Feb-Mar) มาจากการเผาไหม้เกษตร

print('NO₂ Source Interpretation:');
print('- High in urban areas (Bangkok, Chiang Mai, Rayong)');
print('- Seasonal pattern: Higher in dry season (Dec-Mar)');
print('- During COVID: Significant decrease observed');
print('- Correlates with economic activity');


// ======== 16. Create Legend ========

var legend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px',
    margin: '10px'
  }
});

var legendTitle = ui.Label({
  value: 'NO₂ Tropospheric Column',
  style: {
    fontWeight: 'bold',
    fontSize: '12px',
    margin: '0 0 8px 0'
  }
});

legend.add(legendTitle);

var legendTexts = [
  '0.0000 - No pollution',
  '0.0001 - Low',
  '0.0002 - High',
  '> 0.0002 - Very High'
];

for (var i = 0; i < legendTexts.length; i++) {
  legend.add(ui.Label(legendTexts[i]));
}

Map.add(legend);


// ======== 17. Center Map ========

Map.centerObject(roiBuffered, 9);


// ======== สรุป ========

print('\n=== สรุปบทนี้ ===');
print('✓ โหลด Sentinel-5P TROPOMI NO₂ Collection');
print('✓ Visualization NO₂ Tropospheric Column');
print('✓ ตรวจจับแหล่งกำเนิดมลพิษ (Hotspots)');
print('✓ Time Series Analysis');
print('✓ Monthly Comparison');
print('✓ Trend Analysis (Month-to-month)');
print('✓ Point Source Detection');
print('✓ Examined other gases (SO₂)');
print('✓ Interpreted pollution sources');
print('\nข้อดี: Daily global coverage, ติดตามหลายก๊าซ');
print('ข้อจำกัด: ความละเอียด 7 กม., ค่อนข้างต่อเนื่อง');
print('\nลำดับถัดไป: บทที่ 4 - Image Collection (Collection 2)');
