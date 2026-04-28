/*
 * Ch09_01_ard_dashboard.js
 * Multi-source ARD Dashboard (Landsat + DW + ERA5 + CHIRPS)
 * Analysis Ready Data จากหลายแหล่ง รวมในหนึ่ง Dashboard
 *
 * ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
 * วันที่: 2025
 */

// === 1. กำหนดพื้นที่ศึกษา (ROI) ===
var roi = ee.Geometry.Point(100.5, 13.75).buffer(50000);
var year = 2025;

// === 2. Landsat C02 — NDVI ===
// Landsat 8 Collection 2 Level 2 Surface Reflectance
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(year + '-01-01', year + '-06-30')
    .filterBounds(roi)
    .map(function(img) {
      // Apply scale factors ถ้า metadata ไม่มี
      var sr = img.select('SR_B.').multiply(0.0000275).add(-0.2);

      // Cloud masking ด้วย QA_PIXEL
      var qa = img.select('QA_PIXEL');
      var cloudMask = qa.bitwiseAnd(1 << 3).eq(0)  // ลบเมฆ
                         .and(qa.bitwiseAnd(1 << 4).eq(0));  // ลบเงา

      return img.addBands(sr, null, true).updateMask(cloudMask);
    });

// คำนวณ NDVI จาก Landsat 8
// Band B5 = NIR, B4 = Red
var ndvi = l8.median()
    .normalizedDifference(['SR_B5', 'SR_B4'])
    .rename('NDVI');

// === 3. Dynamic World — Land Cover ===
// Land cover classification เกือบ real-time จาก Google Research
var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate(year + '-01-01', year + '-06-30')
    .filterBounds(roi);

// Mode composite (ค่าที่ปรากฏบ่อยที่สุด)
var dwLabel = dw.select('label').mode().clip(roi);

// Palette: water, trees, grass, flooded_veg, crops, shrub, built, bare, snow
var dwPalette = [
  '#419BDF',  // 0: water (น้ำ)
  '#397D49',  // 1: trees (ต้นไม้)
  '#88B053',  // 2: grass (หญ้า)
  '#7A87C6',  // 3: flooded vegetation (พืชน้ำ)
  '#E49635',  // 4: crops (พืชไร่)
  '#DFC35A',  // 5: shrub & scrub (灌木)
  '#C4281B',  // 6: built-up (พื้นที่สร้างสร้าง)
  '#A59B8F',  // 7: bare (บาร์เร)
  '#B39FE1'   // 8: snow & ice (หิมะ)
];

// === 4. ERA5-Land — Temperature ===
// Climate reanalysis data จาก ECMWF (European Center)
var temp = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
    .filterDate(year + '-01-01', year + '-06-30')
    .filterBounds(roi)
    .select('temperature_2m')  // ค่า 2m temperature
    .mean()
    .subtract(273.15);  // แปลง Kelvin เป็น Celsius

// === 5. CHIRPS — Rainfall ===
// Daily rainfall data ความละเอียด 0.05 degrees
var rain = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
    .filterDate(year + '-01-01', year + '-06-30')
    .filterBounds(roi)
    .select('precipitation')
    .sum();  // ปริมาณน้ำฝนรวม

// === 6. Visualization ===
Map.centerObject(roi, 9);

// NDVI layer
Map.addLayer(
  ndvi.clip(roi),
  {min: 0, max: 0.8, palette: ['brown', 'yellow', 'green']},
  'NDVI (Landsat 8)'
);

// Dynamic World layer
Map.addLayer(
  dwLabel,
  {min: 0, max: 8, palette: dwPalette},
  'Land Cover (Dynamic World)'
);

// Temperature layer
Map.addLayer(
  temp.clip(roi),
  {min: 25, max: 38, palette: ['blue', 'yellow', 'red']},
  'Temperature (°C)'
);

// Rainfall layer
Map.addLayer(
  rain.clip(roi),
  {min: 0, max: 800, palette: ['white', 'cyan', 'blue', 'navy']},
  'Rainfall (mm)'
);

// === 7. สถิติพื้นฐาน ===
print('=== ARD Dashboard Statistics ===');
print('NDVI Range:', ndvi.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e13
}));

print('Temperature Range (°C):', temp.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 5000,
  maxPixels: 1e13
}));

print('Total Rainfall (mm):', rain.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 5000,
  maxPixels: 1e13
}));

// Land cover area
var areaByClass = dwLabel.eq(ee.List.sequence(0, 8)).rename([
  'water', 'trees', 'grass', 'flooded_veg', 'crops',
  'shrub', 'built', 'bare', 'snow'
]);

var areas = areaByClass.multiply(ee.Image.pixelArea()).divide(1e6);  // sq km
var lcStats = areas.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e13
});

print('Land Cover Area (sq km):', lcStats);
