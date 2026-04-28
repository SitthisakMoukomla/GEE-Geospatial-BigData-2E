/*====================================================================
 * บทที่ 7.4 Smart Farming — ติดตามนาข้าวด้วย SAR
 * Ch07_05_rice_paddy_sar.js
 *
 * วัตถุประสงค์:
 *   - ใช้ Sentinel-1 VH time series ติดตามการปลูกข้าว
 *   - สังเกต pattern เปลี่ยนแปลง VH ตลอดฤดูการปลูก
 *   - ระบุระยะการปลูก (ต้นข้าว, ข้าวยาวน้อย, เก็บเกี่ยว)
 *
 * หลักการ SAR สำหรับข้าว:
 *   - น้ำขัง: VH ต่ำ (backscatter เล็ก)
 *   - พืชเจริญ: VH สูงขึ้น (scattering มากขึ้น)
 *   - หลังเก็บเกี่ยว: VH ลดลง
 *
 * ข้อมูล: COPERNICUS/S1_GRD
 * ROI: Rice field, Suphan Buri Province
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
// แปลงนาข้าว Suphan Buri
var ricePlot = ee.Geometry.Point([100.2, 15.5]);

var roiBounds = ricePlot.buffer(500);

// ====== Helper Functions ======

/**
 * ฟังก์ชัน: สกัด Sentinel-1 VH time series
 */
function getSentinel1Series(startDate, endDate, geometry) {
  return ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterDate(startDate, endDate)
    .filterBounds(geometry)
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .select('VH');
}

/**
 * ฟังก์ชัน: แปลง linear backscatter เป็น dB
 * backscatter_dB = 10 * log10(linear_value)
 */
function linearToDb(image) {
  // Sentinel-1 VH มักเก็บเป็น dB แล้ว แต่เพื่อ consistency ให้ ensure
  return image;
}

// ====== Data Loading ======
// ข้อมูลปี 2024 (ประมาณ 1 ปี)
var s1Series = getSentinel1Series('2024-01-01', '2024-12-31', roiBounds);

// ====== Visualization: Individual Images ======
// ภาพตัวแทนจากแต่ละเดือน
var monthlyMedian = function(monthStart, monthEnd, label) {
  var img = s1Series.filterDate(monthStart, monthEnd).median().clip(roiBounds);
  Map.addLayer(img, {
    min: -25,
    max: -5,
    palette: ['black', 'darkgray', 'gray', 'lightgray', 'white']
  }, label);
  return img;
};

// Visualize monthly patterns
monthlyMedian('2024-01-01', '2024-02-01', 'Jan - VH');
monthlyMedian('2024-03-01', '2024-04-01', 'Mar - VH');
monthlyMedian('2024-05-01', '2024-06-01', 'May - VH');
monthlyMedian('2024-07-01', '2024-08-01', 'Jul - VH');
monthlyMedian('2024-09-01', '2024-10-01', 'Sep - VH');
monthlyMedian('2024-11-01', '2024-12-01', 'Nov - VH');

// ====== Time Series Chart ======
var chart = ui.Chart.image.series(s1Series, ricePlot, ee.Reducer.mean(), 10)
  .setOptions({
    title: 'SAR VH Time Series - Rice Paddy 2024',
    vAxis: {
      title: 'VH (dB)',
      viewWindow: {min: -25, max: -5}
    },
    hAxis: {
      title: 'Date'
    },
    pointSize: 3,
    lineWidth: 2,
    series: {
      0: {color: 'blue'}
    }
  });

print(chart);

// ====== Rice Growing Phase Detection ======
/**
 * Pattern ของนาข้าว (สมมติฐาน):
 * - พ.ค.-มิ.ย.: เตรียมดิน + หว่านข้าว (VH ต่ำ เพราะมีน้ำ)
 * - ก.ค.-ส.ค.: ข้าวเจริญเติบโต (VH สูงขึ้น)
 * - ก.ย.-ต.ค.: ข้าวอ่อน-ก่ึงแก (VH สูงสุด)
 * - พ.ย.: เก็บเกี่ยว (VH ลดลง)
 */

// สร้าง composite สำหรับแต่ละ phase
var phase_planting = s1Series.filterDate('2024-05-01', '2024-06-30').median();
var phase_growth = s1Series.filterDate('2024-07-01', '2024-08-31').median();
var phase_heading = s1Series.filterDate('2024-09-01', '2024-10-31').median();
var phase_harvest = s1Series.filterDate('2024-11-01', '2024-11-30').median();

print('========== Rice Paddy Growing Phases ==========');
print('Planting Phase (May-Jun) - Mean VH:',
  phase_planting.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roiBounds,
    scale: 10,
    maxPixels: 1e8
  }));

print('Growth Phase (Jul-Aug) - Mean VH:',
  phase_growth.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roiBounds,
    scale: 10,
    maxPixels: 1e8
  }));

print('Heading Phase (Sep-Oct) - Mean VH:',
  phase_heading.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roiBounds,
    scale: 10,
    maxPixels: 1e8
  }));

print('Harvest Phase (Nov) - Mean VH:',
  phase_harvest.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roiBounds,
    scale: 10,
    maxPixels: 1e8
  }));

// ====== Additional Analysis ======
// คำนวณ VH gradient (อัตราการเปลี่ยน)
var vhGrowth = phase_growth.subtract(phase_planting);
var vhDecline = phase_harvest.subtract(phase_heading);

var visGradient = {
  min: -3,
  max: 3,
  palette: ['red', 'white', 'green']
};

Map.addLayer(vhGrowth, visGradient, 'VH Growth (Growth Phase - Planting)');
Map.addLayer(vhDecline, visGradient, 'VH Decline (Harvest - Heading)');

// ====== Overall Statistics ======
var yearlyMean = s1Series.mean();
var yearlyStdDev = s1Series.reduce(ee.Reducer.stdDev());

var stats = yearlyMean.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roiBounds,
  scale: 10,
  maxPixels: 1e8
});

var statsStd = yearlyStdDev.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roiBounds,
  scale: 10,
  maxPixels: 1e8
});

print('========== Annual SAR Statistics ==========');
print('Mean VH (dB):', stats.get('VH'));
print('Std Dev VH:', statsStd.get('VH_stdDev'));

// ====== Map Setup ======
Map.setCenter(100.2, 15.5, 12);
Map.setOptions('SATELLITE');
