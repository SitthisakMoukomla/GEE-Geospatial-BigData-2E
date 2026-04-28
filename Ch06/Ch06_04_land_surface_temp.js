/**
 * ===============================================
 * บทที่ 6: การวิเคราะห์ข้อมูลเชิงพื้นที่
 * ===============================================
 *
 * Ch06_04_land_surface_temp.js
 * หัวข้อ: Land Surface Temperature (LST) - อุณหภูมิพื้นผิวและเกาะความร้อนเมือง
 *
 * สำหรับใช้ใน Google Earth Engine Code Editor
 * เขียนโดย: GEE Book Team
 * อัปเดต: 2025
 *
 * ===============================================
 */

// ============================================
// 1. กำหนด ROI (เลือกพื้นที่ที่มีเมืองและชนบท)
// ============================================
var roi = ee.Geometry.Rectangle([100.3, 13.5, 100.8, 14.0]);

// ============================================
// 2. Prepare Landsat 8 Collection 2
// ============================================
print('=== Land Surface Temperature Analysis ===');

function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  // Thermal band: ST_B10 สำหรับ Temperature (Kelvin)
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0)
      .and(qa.bitwiseAnd(1 << 4).eq(0));
  return image.updateMask(mask);
}

var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .map(maskClouds)
    .map(applyScaleFactors);

var composite = l8.median().clip(roi);

print('Landsat 8 Composite:', composite);

// ============================================
// 3. Extract Thermal Band (ST_B10)
// ============================================
print('\n=== Extract Thermal Band ===');

var lst_kelvin = composite.select('ST_B10');

print('LST (Kelvin) Range:', lst_kelvin.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 4. Convert Kelvin to Celsius
// ============================================
print('\n=== Convert to Celsius ===');

var lst_celsius = lst_kelvin.subtract(273.15);

Map.addLayer(lst_celsius, {
  min: 20,
  max: 45,
  palette: ['blue', 'cyan', 'lightgreen', 'yellow', 'orange', 'red']
}, 'LST (°C)');

print('LST (Celsius) Range:', lst_celsius.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 5. Convert to Fahrenheit (Optional)
// ============================================
print('\n=== Convert to Fahrenheit (Optional) ===');

var lst_fahrenheit = lst_celsius.multiply(9).divide(5).add(32);

Map.addLayer(lst_fahrenheit, {
  min: 68,
  max: 113,
  palette: ['blue', 'cyan', 'lightgreen', 'yellow', 'orange', 'red']
}, 'LST (°F)');

// ============================================
// 6. Create Temperature Classes
// ============================================
print('\n=== Temperature Classification ===');

var cold = lst_celsius.lte(20);      // <= 20°C
var cool = lst_celsius.gt(20).and(lst_celsius.lte(25));   // 20-25°C
var warm = lst_celsius.gt(25).and(lst_celsius.lte(35));   // 25-35°C
var hot = lst_celsius.gt(35).and(lst_celsius.lte(45));    // 35-45°C
var veryhot = lst_celsius.gt(45);    // > 45°C

var tempClass = cold.multiply(0)
    .add(cool.multiply(1))
    .add(warm.multiply(2))
    .add(hot.multiply(3))
    .add(veryhot.multiply(4))
    .rename('temperature_class');

Map.addLayer(tempClass, {
  min: 0,
  max: 4,
  palette: ['blue', 'cyan', 'green', 'orange', 'red']
}, 'Temperature Classes');

// ============================================
// 7. Urban Heat Island Detection (UHI)
// ============================================
print('\n=== Urban Heat Island (UHI) Analysis ===');

// ใช้ NDBI (Normalized Difference Built-up Index) เพื่อแยกพื้นที่เมือง
var ndbi = composite.normalizedDifference(['SR_B6', 'SR_B5'])
    .rename('NDBI');

// แยก Urban กับ Rural
var urbanThreshold = 0.1;
var urbanMask = ndbi.gt(urbanThreshold);
var ruralMask = ndbi.lte(urbanThreshold);

// Urban LST
var urbanLST = lst_celsius.updateMask(urbanMask);
Map.addLayer(urbanLST, {
  min: 20,
  max: 45,
  palette: ['blue', 'cyan', 'lightgreen', 'yellow', 'orange', 'red']
}, 'Urban LST');

// Rural LST
var ruralLST = lst_celsius.updateMask(ruralMask);
Map.addLayer(ruralLST, {
  min: 20,
  max: 45,
  palette: ['blue', 'cyan', 'lightgreen', 'yellow', 'orange', 'red']
}, 'Rural LST');

// ============================================
// 8. คำนวณ Urban Heat Island Intensity
// ============================================
print('\n=== Calculate UHI Intensity ===');

var urbanMean = urbanLST.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 30
});

var ruralMean = ruralLST.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 30
});

var uhi_intensity = ee.Number(urbanMean.get('LST')).subtract(
    ee.Number(ruralMean.get('LST'))
);

print('Urban Mean LST (°C):', urbanMean.get('LST'));
print('Rural Mean LST (°C):', ruralMean.get('LST'));
print('UHI Intensity (°C):', uhi_intensity);

// ============================================
// 9. UHI Map (แสดงความแตกต่าง)
// ============================================
print('\n=== UHI Difference Map ===');

var uhi_map = urbanLST.subtract(ruralLST.median());

Map.addLayer(uhi_map, {
  min: -5,
  max: 10,
  palette: ['blue', 'cyan', 'white', 'orange', 'red']
}, 'UHI Difference Map');

// ============================================
// 10. ตัวอย่าง: Combine with Vegetation
// ============================================
print('\n=== LST vs Vegetation ===');

var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']);

// พื้นที่ที่มี NDVI สูง (พืช) ควรจะเย็น
Map.addLayer(ndvi, {
  min: -0.2,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'darkgreen']
}, 'NDVI (for comparison)');

// Create chart comparing LST and NDVI
var combined_data = composite
    .addBands(lst_celsius.rename('LST'))
    .addBands(ndvi.rename('NDVI'));

print('Combined LST-NDVI data created');

// ============================================
// 11. Statistical Analysis
// ============================================
print('\n=== LST Statistics ===');

var stats = lst_celsius.reduceRegion({
  reducer: ee.Reducer.mean()
      .combine(ee.Reducer.stdDev(), '', true)
      .combine(ee.Reducer.minMax(), '', true),
  geometry: roi,
  scale: 30
});

print('Mean LST:', ee.Number(stats.get('LST_mean')));
print('StdDev LST:', ee.Number(stats.get('LST_stdDev')));
print('Min LST:', ee.Number(stats.get('LST_min')));
print('Max LST:', ee.Number(stats.get('LST_max')));

// ============================================
// 12. Quantile Analysis
// ============================================
print('\n=== LST Quantile Analysis ===');

var percentiles = lst_celsius.reduceRegion({
  reducer: ee.Reducer.percentile([10, 25, 50, 75, 90]),
  geometry: roi,
  scale: 30
});

print('10th Percentile (cold):', ee.Number(percentiles.get('LST_p10')));
print('25th Percentile:', ee.Number(percentiles.get('LST_p25')));
print('Median (50th Percentile):', ee.Number(percentiles.get('LST_p50')));
print('75th Percentile:', ee.Number(percentiles.get('LST_p75')));
print('90th Percentile (hot):', ee.Number(percentiles.get('LST_p90')));

// ============================================
// 13. LST Zones
// ============================================
print('\n=== Create LST Zones ===');

// ใช้ quantile แบ่งเป็น 5 zone
var coldZone = lst_celsius.lte(25);
var coolZone = lst_celsius.gt(25).and(lst_celsius.lte(30));
var moderateZone = lst_celsius.gt(30).and(lst_celsius.lte(35));
var warmZone = lst_celsius.gt(35).and(lst_celsius.lte(40));
var hotZone = lst_celsius.gt(40);

var lstZones = coldZone.multiply(0)
    .add(coolZone.multiply(1))
    .add(moderateZone.multiply(2))
    .add(warmZone.multiply(3))
    .add(hotZone.multiply(4))
    .rename('lst_zones');

Map.addLayer(lstZones, {
  min: 0,
  max: 4,
  palette: ['blue', 'cyan', 'green', 'orange', 'red']
}, 'LST Zones');

// ============================================
// 14. Export LST if needed
// ============================================
print('\n=== Export Options ===');
print('// Uncomment to export LST:');
print('// Export.image.toDrive({');
print('//   image: lst_celsius,');
print('//   description: "LST_2025",');
print('//   region: roi,');
print('//   scale: 30');
print('// });');

// ============================================
// 15. Information: LST Interpretation
// ============================================
print('\n=== LST Interpretation ===');
print('LST ranges (tropical region):');
print('  < 20°C:  Very cool (water, high elevation)');
print('  20-25°C: Cool (vegetation, rural)');
print('  25-35°C: Moderate (mixed areas)');
print('  35-45°C: Hot (urban, bare soil)');
print('  > 45°C:  Very hot (dense urban, industrial)');

print('\nUHI Intensity:');
print('  < 1°C:   No significant UHI');
print('  1-3°C:   Weak UHI');
print('  3-5°C:   Moderate UHI');
print('  > 5°C:   Strong UHI');

// ============================================
// 16. Center Map and Finish
// ============================================
Map.centerObject(roi, 11);
print('\n=== สำเร็จ ===');
