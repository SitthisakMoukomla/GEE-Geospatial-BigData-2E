/*====================================================================
 * บทที่ 7.3 Flood Detection ด้วย Sentinel-1 SAR
 * Ch07_03_flood_detection_sar.js
 *
 * วัตถุประสงค์:
 *   - ตรวจจับน้ำท่วมโดยใช้ SAR VH backscatter
 *   - เปรียบเทียบภาพก่อนและระหว่างเหตุน้ำท่วม
 *   - คำนวณพื้นที่น้ำท่วม
 *
 * หลักการ:
 *   - น้ำมี backscatter ต่ำ (smooth surface)
 *   - พื้นดินแห้งมี backscatter สูง
 *   - ความแตกต่าง (before - during) > threshold = flood
 *
 * ข้อมูล: COPERNICUS/S1_GRD
 * ROI: Chao Phraya River Basin, Thailand
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
// ลุ่มน้ำเจ้าพระยา (Bangkok region)
var roi = ee.Geometry.Rectangle([
  100.0, 14.5,   // ตะวันตก-ใต้
  101.0, 15.5    // ตะวันออก-เหนือ
]);

// ====== Helper Functions ======

/**
 * ฟังก์ชัน: สกัด Sentinel-1 VH band
 * ใช้ IW mode, VH polarization, descending orbit
 */
function getSentinel1VH(startDate, endDate, geometry) {
  return ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterDate(startDate, endDate)
    .filterBounds(geometry)
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .select('VH')
    .median();
}

/**
 * ฟังก์ชัน: มาส์กข้อมูลที่มีคุณภาพต่ำ
 */
function maskLowQuality(image) {
  // Sentinel-1 มี artifacts ที่บริเวณขอบ ให้มาส์กออก
  var geometry = image.geometry();
  var bounds = geometry.buffer(-1000);  // ลบขอบ 1 km
  return image.clip(bounds);
}

// ====== Data Loading ======
// ภาพก่อนน้ำท่วม (ฤดูแล้ง ม.ค.-มี.ค. 2025)
var before = getSentinel1VH('2025-01-01', '2025-03-31', roi)
  .map(maskLowQuality)
  .clip(roi);

// ภาพระหว่างน้ำท่วม (ฤดูฝน ก.ย.-ต.ค. 2024)
var during = getSentinel1VH('2024-09-01', '2024-10-15', roi)
  .map(maskLowQuality)
  .clip(roi);

// ====== Change Detection — Flood Extraction ======
/**
 * หลักการ: VH backscatter ลดลง = เนื่องจากน้ำ
 * flood mask = (before - during) > threshold
 */
var diff = before.subtract(during).rename('VH_diff');

// ตั้ง threshold: ถ้า backscatter ลดลง > 5 dB คิดว่าเป็นน้ำท่วม
var threshold = 5;
var flood = diff.gt(threshold).selfMask().rename('flood');

// ====== Visualization ======
var visVH = {
  min: -25,
  max: -5,
  palette: ['white', 'lightgray', 'gray', 'darkgray', 'black']
};

Map.addLayer(before, visVH, 'Before (Dry) - VH backscatter');
Map.addLayer(during, visVH, 'During (Flood) - VH backscatter');
Map.addLayer(diff, {
  min: -10,
  max: 10,
  palette: ['blue', 'white', 'red']
}, 'VH Difference (before - during)');
Map.addLayer(flood, {palette: 'cyan'}, 'Flood Extent (threshold: ' + threshold + ' dB)');

// ====== Area Calculation ======
/**
 * คำนวณพื้นที่น้ำท่วม:
 * - pixel area ของ Sentinel-1 = 10m × 10m = 100 m²
 * - คำนวณรวมทั้ง ROI
 */
var floodArea = flood
  .multiply(ee.Image.pixelArea())
  .divide(1e6);  // แปลงเป็น km²

var areaStats = floodArea.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e10
});

var floodAreaKm2 = areaStats.get('flood');

// ====== Statistics ======
var statsVH = {
  before_mean: before.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 10,
    maxPixels: 1e10
  }).get('VH'),
  during_mean: during.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 10,
    maxPixels: 1e10
  }).get('VH'),
  diff_mean: diff.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 10,
    maxPixels: 1e10
  }).get('VH_diff')
};

print('========== Flood Detection Analysis (Chao Phraya) ==========');
print('Mean VH Before (Dry):', statsVH.before_mean);
print('Mean VH During (Flood):', statsVH.during_mean);
print('Mean VH Difference:', statsVH.diff_mean);
print('Flood Area (km²):', floodAreaKm2);
print('Threshold Used (dB):', threshold);

// ====== Additional Analysis ======
// หาส่วนที่ลดน้อยที่สุด (most certain flood)
var certainFlood = diff.gt(threshold * 1.5);  // 7.5 dB
Map.addLayer(certainFlood, {palette: 'blue'}, 'Certain Flood (threshold: 7.5 dB)');

// ====== Map Setup ======
Map.setCenter(100.5, 15.0, 10);
Map.setOptions('SATELLITE');
