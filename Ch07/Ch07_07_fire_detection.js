/*====================================================================
 * บทที่ 7.5 Forestry Application — ตรวจจับไฟป่า (Fire Detection)
 * Ch07_07_fire_detection.js
 *
 * วัตถุประสงค์:
 *   - ตรวจจับ active fire hotspots โดยใช้ FIRMS data
 *   - นับจำนวนจุดไฟ per pixel
 *   - สร้าง heat map ของพื้นที่เสี่ยงไฟ
 *
 * ข้อมูล: NASA FIRMS (Fire Information for Resource Management System)
 * ROI: Northern Thailand (potential fire zones)
 *
 * หมายเหตุ: FIRMS data ใน GEE อาจมี limitation ในการเข้าถึง
 * Alternative: ใช้ Sentinel-5P emissions หรือ MODIS thermal
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
// ภาคเหนือ (บริเวณที่มีความเสี่ยงไฟป่า)
var roi = ee.Geometry.Rectangle([
  97.5, 17.0,    // ตะวันตก-ใต้
  101.5, 20.5    // ตะวันออก-เหนือ
]);

// ====== Alternative Approach ======
// เนื่องจาก FIRMS ใน GEE อาจมี limitation
// เราใช้ MODIS Thermal data (MOD11A2) เป็น proxy สำหรับ fire detection
// Fire มี temperature สูงมาก (> 50°C) ซึ่ง MODIS thermal สามารถตรวจจับได้

// ====== Helper Functions ======

/**
 * ฟังก์ชัน: สกัด LST (Land Surface Temperature) จาก MODIS
 */
function getMODIS_LST(startDate, endDate, geometry) {
  return ee.ImageCollection('MODIS/061/MOD11A2')
    .filterDate(startDate, endDate)
    .filterBounds(geometry)
    .select('LST_Day_1km')
    .map(function(image) {
      // Convert from Kelvin to Celsius
      var lstC = image.multiply(0.02).subtract(273.15);
      return lstC.rename('LST_C');
    });
}

/**
 * ฟังก์ชัน: สกัด thermal band จาก Sentinel-2 (ถ้าต้องการ)
 * Note: Sentinel-2 ไม่มี thermal band แต่มี SWIR
 */
function getSentinel2_SWIR(startDate, endDate, geometry) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(startDate, endDate)
    .filterBounds(geometry)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .select(['B11', 'B12']);  // SWIR bands
}

// ====== Data Loading: MODIS Temperature ======
var startDate = '2024-01-01';
var endDate = '2024-12-31';

var lstCollection = getMODIS_LST(startDate, endDate, roi);

// หา composite สำหรับ dry season (เดือนที่มีความเสี่ยง)
var lstDrySeason = ee.ImageCollection('MODIS/061/MOD11A2')
  .filterDate('2024-02-01', '2024-05-31')  // peak fire season (ก.พ.-พ.ค.)
  .filterBounds(roi)
  .select('LST_Day_1km')
  .map(function(image) {
    return image.multiply(0.02).subtract(273.15);
  })
  .max()  // หา maximum temperature
  .clip(roi);

// ====== Visualization: LST Map ======
var visLST = {
  min: 15,
  max: 55,
  palette: ['blue', 'green', 'yellow', 'orange', 'red', 'darkred']
};

Map.addLayer(lstDrySeason, visLST, 'Max LST Dry Season (°C)');

// ====== Fire Hotspot Detection ======
/**
 * Criteria for potential fire:
 *  - LST > 40°C : High temperature zone
 *  - LST > 50°C : Very high temperature (possible active fire)
 */
var highTemp = lstDrySeason.gt(40).selfMask();
var veryHighTemp = lstDrySeason.gt(50).selfMask();

Map.addLayer(highTemp, {palette: 'yellow'}, 'High Temperature (>40°C)');
Map.addLayer(veryHighTemp, {palette: 'red'}, 'Very High Temperature (>50°C)');

// ====== Alternative: SWIR-based Fire Detection ======
/**
 * ใช้ Sentinel-2 SWIR bands
 * Fire มักมี high reflectance ใน B12 (SWIR 2)
 */
var swir = getSentinel2_SWIR('2024-02-01', '2024-05-31', roi);

// Calculate NDII (Normalized Difference Infrared Index)
// NDII = (B11 - B12) / (B11 + B12)
// Fire มี low NDII (water absorption)
var ndii = swir.map(function(img) {
  var b11 = img.select('B11');
  var b12 = img.select('B12');
  var ndii_val = b11.subtract(b12).divide(b11.add(b12)).rename('NDII');
  return img.addBands(ndii_val);
}).select('NDII').min();

var visNDII = {
  min: -0.5,
  max: 0.5,
  palette: ['red', 'white', 'blue']
};

Map.addLayer(ndii, visNDII, 'NDII - SWIR based (negative = potential burn)');

// ====== Burn/Fire Detection ======
// Low NDII + High reflectance B12 = burn area
var burn = ndii.lt(-0.1).selfMask();
Map.addLayer(burn, {palette: 'darkred'}, 'Potential Burn Area (NDII < -0.1)');

// ====== Statistics ======
// นับพื้นที่เสี่ยงไฟ
function calculateArea(mask, label) {
  var area = mask
    .multiply(ee.Image.pixelArea())
    .divide(1e6);  // km²

  var areaStats = area.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 1000,
    maxPixels: 1e10
  });

  print(label + ' Area (km²):', areaStats);
  return areaStats;
}

calculateArea(highTemp, 'High Temperature Zone');
calculateArea(veryHighTemp, 'Very High Temperature Zone');
calculateArea(burn, 'Potential Burn Area');

// ====== Temperature Statistics ======
var tempStats = lstDrySeason.reduceRegion({
  reducer: ee.Reducer.mean()
    .combine(ee.Reducer.stdDev(), '')
    .combine(ee.Reducer.min(), '_min')
    .combine(ee.Reducer.max(), '_max')
    .combine(ee.Reducer.percentile([10, 25, 50, 75, 90]), ''),
  geometry: roi,
  scale: 1000,
  maxPixels: 1e10
});

print('========== Fire Risk Analysis (Dry Season) ==========');
print('Mean LST:', tempStats.get('LST_Day_1km_mean'));
print('Std Dev:', tempStats.get('LST_Day_1km_stdDev'));
print('Min LST:', tempStats.get('LST_Day_1km_min'));
print('Max LST:', tempStats.get('LST_Day_1km_max'));
print('Temperature Distribution:', tempStats);

// ====== Time Series: Monthly Fire Risk ======
var monthlyFireRisk = function(month, monthLabel) {
  var startMonth = '2024-' + ('0' + month).slice(-2) + '-01';
  var endMonth = month < 12 ?
    '2024-' + ('0' + (month + 1)).slice(-2) + '-01' :
    '2025-01-01';

  var monthlyLST = ee.ImageCollection('MODIS/061/MOD11A2')
    .filterDate(startMonth, endMonth)
    .filterBounds(roi)
    .select('LST_Day_1km')
    .map(function(image) {
      return image.multiply(0.02).subtract(273.15);
    })
    .mean();

  var meanTemp = monthlyLST.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 1000,
    maxPixels: 1e10
  });

  return {month: monthLabel, temp: meanTemp.get('LST_Day_1km')};
};

// สร้าง monthly analysis
print('\n========== Monthly LST Analysis ==========');
for (var m = 1; m <= 12; m++) {
  var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  monthlyFireRisk(m, monthNames[m - 1]);
}

// ====== Map Setup ======
Map.setCenter(99.5, 18.5, 7);
Map.setOptions('SATELLITE');
