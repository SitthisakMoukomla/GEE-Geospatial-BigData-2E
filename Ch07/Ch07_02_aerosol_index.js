/*====================================================================
 * บทที่ 7.2 ติดตาม Aerosol Index — หมอกควันภาคเหนือ
 * Ch07_02_aerosol_index.js
 *
 * วัตถุประสงค์:
 *   - วิเคราะห์ Absorbing Aerosol Index (AAI) จาก Sentinel-5P
 *   - ตรวจจับหมอกควัน
 *   - วิสุอัลไลเซชั่น spatial pattern
 *
 * ข้อมูล: COPERNICUS/S5P/OFFL/L3_AER_AI
 * ROI: Northern Thailand (Chiang Mai region)
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
// ภาคเหนือ (เชียงใหม่)
var roi = ee.Geometry.Rectangle([
  97.5, 17.0,    // ตะวันตก-ใต้
  101.5, 20.5    // ตะวันออก-เหนือ
]);

var chiangmaiPoint = ee.Geometry.Point([99.0, 18.8]);

// ====== Function: Get Aerosol Index ======
/**
 * ดึง Aerosol Index image collection
 */
function getAerosolIndex(startDate, endDate, geometry) {
  return ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_AER_AI')
    .filterDate(startDate, endDate)
    .filterBounds(geometry)
    .select('absorbing_aerosol_index')
    .mean()
    .clip(geometry);
}

// ====== Data Loading ======
// ดึงข้อมูล Aerosol Index ประมาณ Feb-Apr (ฤดูหมอกควัน)
// ใช้ข้อมูลจากปีที่ผ่านมา เนื่องจากดาต้า future อาจไม่พร้อม
var aai2024 = getAerosolIndex('2024-02-01', '2024-04-30', roi);
var aai2023 = getAerosolIndex('2023-02-01', '2023-04-30', roi);

// สำหรับประกอบการแสดงผล ให้ใช้ data ที่มี
var aai = aai2024.max(aai2023);  // เลือก max เพื่อให้เห็นหมอกควัน

// ====== Visualization ======
var visAAI = {
  min: -1,
  max: 3,
  palette: ['blue', 'green', 'yellow', 'orange', 'red']
};

Map.addLayer(aai, visAAI, 'Aerosol Index (หมอกควัน)');

// ====== Thresholding — Smoke Detection ======
// AAI > 1.0 บ่งชี้มีอนุภาค (smoke/dust)
// AAI > 2.0 บ่งชี้หมอกควันหนา
var smokeDetection = aai.gte(1.0).selfMask();
var heavySmoke = aai.gte(2.0).selfMask();

Map.addLayer(smokeDetection, {palette: 'yellow'}, 'Smoke Detection (AAI > 1.0)');
Map.addLayer(heavySmoke, {palette: 'red'}, 'Heavy Smoke (AAI > 2.0)');

// ====== Statistics ======
var statsAAI = aai.reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), ''),
  geometry: roi,
  scale: 5000,
  maxPixels: 1e8
});

var statsSmoke = smokeDetection.multiply(ee.Image.pixelArea())
  .divide(1e6)  // แปลงเป็น km²
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 5000,
    maxPixels: 1e8
  });

var statsHeavy = heavySmoke.multiply(ee.Image.pixelArea())
  .divide(1e6)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 5000,
    maxPixels: 1e8
  });

print('========== Aerosol Index Analysis (Northern Thailand) ==========');
print('Mean AAI:', statsAAI.get('absorbing_aerosol_index_mean'));
print('Std Dev AAI:', statsAAI.get('absorbing_aerosol_index_stdDev'));
print('Smoke Area (AAI > 1.0) [km²]:', statsSmoke.get('absorbing_aerosol_index'));
print('Heavy Smoke Area (AAI > 2.0) [km²]:', statsHeavy.get('absorbing_aerosol_index'));

// ====== Time Series Chart ======
// สร้าง time series ของ AAI ที่จุด Chiang Mai
var tsSeries = ui.Chart.image.series(
  ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_AER_AI')
    .filterDate('2024-01-01', '2024-12-31')
    .filterBounds(chiangmaiPoint)
    .select('absorbing_aerosol_index'),
  chiangmaiPoint,
  ee.Reducer.mean(),
  5000
);

tsSeries.setOptions({
  title: 'Aerosol Index Time Series - Chiang Mai 2024',
  vAxis: {title: 'Absorbing Aerosol Index'},
  hAxis: {title: 'Date'},
  pointSize: 3
});

print(tsSeries);

// ====== Map Setup ======
Map.setCenter(99.0, 18.8, 7);
Map.setOptions('SATELLITE');
