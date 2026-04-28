/*
 * Ch09_03_near_realtime.js
 * Near Real-time Dashboard (FIRMS + S5P + DW + GPM)
 * ติดตาม ไฟป่า + คุณภาพอากาศ + land cover + ปริมาณฝน แบบ near real-time
 *
 * ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
 * วันที่: 2025
 */

// === 0. กำหนดพื้นที่ศึกษา ===
var roi = ee.Geometry.Point(100.5, 13.75).buffer(100000);
Map.centerObject(roi, 9);

// === 1. FIRMS Active Fire (7 วันล่าสุด) ===
// FIRMS = Fire Information for Resource Management System
// ความถี่: ทุก 12 ชม. NRT data

var currentDate = ee.Date(Date.now());
var firmsDates = currentDate.advance(-7, 'day');

var firms = ee.ImageCollection('FIRMS')
    .filterDate(firmsDates, currentDate)
    .filterBounds(roi);

// T21 = Thermal anomaly (fire brightness)
var maxFRP = firms.select('T21').max();  // max fire detection ใน 7 วัน

Map.addLayer(
  maxFRP.clip(roi),
  {min: 300, max: 500, palette: ['yellow', 'orange', 'red']},
  'Active Fire Hotspots (7 days)'
);

// === 2. Sentinel-5P — Air Quality (7 วันล่าสุด) ===
// Sentinel-5P monitoring ก๊าซ atmospheric (NO₂, SO₂, CO, O₃)
// ความถี่: รายวัน

var s5p_no2 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
    .filterDate(firmsDates, currentDate)
    .filterBounds(roi)
    .select('tropospheric_NO2_column_number_density')
    .mean();

Map.addLayer(
  s5p_no2.clip(roi),
  {
    min: 0,
    max: 0.0002,
    palette: ['black', 'blue', 'green', 'yellow', 'orange', 'red']
  },
  'NO2 (7-day average)'
);

// === 3. Dynamic World — Land Cover (Recent) ===
// Near real-time land cover classification ทุก Sentinel-2 pass (~5 วัน)

var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate(firmsDates, currentDate)
    .filterBounds(roi);

var dwLabel = dw.select('label').mode().clip(roi);

var dwPalette = [
  '#419BDF',  // water
  '#397D49',  // trees
  '#88B053',  // grass
  '#7A87C6',  // flooded_veg
  '#E49635',  // crops
  '#DFC35A',  // shrub
  '#C4281B',  // built
  '#A59B8F',  // bare
  '#B39FE1'   // snow
];

Map.addLayer(
  dwLabel,
  {min: 0, max: 8, palette: dwPalette},
  'Land Cover (Recent)'
);

// === 4. GPM IMERG — Rainfall (7 วันล่าสุด) ===
// Global Precipitation Measurement (GPM) IMERG
// ความถี่: ทุก 30 นาที NRT data

var gpm = ee.ImageCollection('NASA/GPM_L3/IMERG_V07')
    .filterDate(firmsDates, currentDate)
    .filterBounds(roi)
    .select('precipitation')
    .sum();

Map.addLayer(
  gpm.clip(roi),
  {min: 0, max: 200, palette: ['white', 'cyan', 'blue', 'navy']},
  'Rainfall 7-day (mm)'
);

// === 5. Analysis: Fire + Vegetation Relationship ===
// สหสัมพันธ์ระหว่าง hotspot กับ vegetation
print('=== Near Real-time Analysis ===');

// Calculate vegetation near fire hotspots
var firePixels = maxFRP.gte(350);  // สูงกว่า threshold

// ดึง Sentinel-2 NDVI ล่าสุด
var s2_recent = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(firmsDates, currentDate)
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .median();

var ndvi = s2_recent.normalizedDifference(['B8', 'B4']).rename('NDVI');

Map.addLayer(
  ndvi.clip(roi),
  {min: 0, max: 0.8, palette: ['brown', 'yellow', 'green']},
  'NDVI (Recent)'
);

// === 6. Time Series Chart: NDVI Near Fire Hotspots ===
// สร้าง chart แสดง NDVI ในช่วง 7 วัน เพื่อดูการเปลี่ยนแปลง

var dateRange = ee.List.sequence(
  firmsDates.getInfo().value,
  currentDate.getInfo().value,
  1000 * 60 * 60 * 24  // 1 day
);

var ndvi_timeseries = dateRange.map(function(date) {
  var start = ee.Date(date);
  var end = start.advance(1, 'day');

  var daily_ndvi = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterDate(start, end)
      .filterBounds(roi)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
      .median()
      .normalizedDifference(['B8', 'B4']);

  var mean_ndvi = daily_ndvi.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 10,
    maxPixels: 1e9
  });

  return ee.Feature(null, {
    date: start,
    ndvi: mean_ndvi.get('nd')
  });
});

var chart = ui.Chart.feature.byFeature(
  ee.FeatureCollection(ndvi_timeseries),
  'date',
  'ndvi'
).setChartType('ColumnChart')
 .setOptions({
   title: 'Daily NDVI (7-day)',
   hAxis: {title: 'Date'},
   vAxis: {title: 'NDVI'}
 });

print(chart);

// === 7. Export Recent Composite ===
Export.image.toDrive({
  image: s2_recent.select(['B4', 'B3', 'B2']).uint16(),  // RGB
  description: 'recent_composite',
  region: roi,
  scale: 10
});

// === 8. Statistics Summary ===
var fireStats = maxFRP.reduceRegion({
  reducer: ee.Reducer.max(),
  geometry: roi,
  scale: 1000,
  maxPixels: 1e9
});

var ndviStats = ndvi.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e13
});

var rainfallStats = gpm.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 10000,
  maxPixels: 1e9
});

print('Max Fire Brightness (7d):', fireStats.get('T21'));
print('Mean NDVI (Recent):', ndviStats.get('nd'));
print('Total Rainfall (7d, mm):', rainfallStats.get('precipitation'));

// === 9. Dashboard Summary Panel ===
print('=== NEAR REAL-TIME DASHBOARD SUMMARY ===');
print('ข้อมูล 7 วันล่าสุด (Updated automatically)');
print('- FIRMS: Fire hotspots');
print('- S5P: NO₂ air quality');
print('- Dynamic World: Land cover');
print('- GPM: Rainfall');
print('- Sentinel-2: NDVI vegetation');
print('');
print('เหมาะสำหรับ: Emergency response, disaster monitoring');
