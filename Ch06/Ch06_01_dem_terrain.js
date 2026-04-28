/**
 * ===============================================
 * บทที่ 6: การวิเคราะห์ข้อมูลเชิงพื้นที่
 * ===============================================
 *
 * Ch06_01_dem_terrain.js
 * หัวข้อ: Digital Elevation Models (DEMs) - Slope, Aspect, Hillshade
 *
 * สำหรับใช้ใน Google Earth Engine Code Editor
 * เขียนโดย: GEE Book Team
 * อัปเดต: 2025
 *
 * ===============================================
 */

// ============================================
// 1. กำหนด ROI (ภูเขา/เขตเมืองที่มีความสูงหลากหลาย)
// ============================================
var roi = ee.Geometry.Rectangle([100.3, 13.5, 100.8, 14.0]);

// ============================================
// 2. โหลด SRTM DEM (Shuttle Radar Topography Mission)
// ============================================
print('=== Load SRTM DEM ===');
var dem = ee.Image('USGS/SRTMGL1_003');  // 30m resolution

// Clip ให้ ROI
var demClipped = dem.clip(roi);

print('DEM Image:', demClipped);
print('DEM Resolution: 30 meters');
print('DEM Data Range:', demClipped.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 3. แสดง DEM บนแผนที่
// ============================================
Map.addLayer(demClipped, {
  min: 0,
  max: 2500,
  palette: ['green', 'yellow', 'brown', 'white']
}, 'SRTM DEM');

// ============================================
// 4. คำนวณ Slope (ความชัน)
// ============================================
print('\n=== Calculate Slope ===');
// Slope = ระดับความชันของพื้นดิน (หน่วย: องศา)
// 0-5° = เรียบ, 5-15° = ชันน้อย, 15-30° = ชันมาก, > 30° = ชันมากเลย

var slope = ee.Terrain.slope(demClipped);

Map.addLayer(slope, {
  min: 0,
  max: 45,
  palette: ['green', 'yellow', 'orange', 'red']
}, 'Slope (degrees)');

print('Slope Range:', slope.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 5. คำนวณ Aspect (ทิศทาง)
// ============================================
print('\n=== Calculate Aspect ===');
// Aspect = ทิศทางที่ลาดของพื้นดิน (0° = N, 90° = E, 180° = S, 270° = W)

var aspect = ee.Terrain.aspect(demClipped);

Map.addLayer(aspect, {
  min: 0,
  max: 360,
  palette: ['blue', 'cyan', 'green', 'yellow', 'orange', 'red', 'blue']
}, 'Aspect (degrees)');

print('Aspect Range (N=0°, E=90°, S=180°, W=270°):', aspect.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 6. คำนวณ Hillshade (ร่มแสง)
// ============================================
print('\n=== Calculate Hillshade ===');
// Hillshade = สร้าง 3D effect โดยเลียนแบบแสงจากมุม 45°
// ใช้ดูรูปร่างภูเขาที่เห็นชัดเจน

var hillshade = ee.Terrain.hillshade(demClipped);

Map.addLayer(hillshade, {
  min: 150,
  max: 255
}, 'Hillshade');

// ============================================
// 7. ตัวอย่าง: Elevation Classes (การจำแนกระดับความสูง)
// ============================================
print('\n=== Elevation Classes ===');

var lowland = demClipped.lte(100);       // ระดับน้ำ-100m
var highland = demClipped.gt(100).and(demClipped.lte(500));  // 100-500m
var mountain = demClipped.gt(500).and(demClipped.lte(1000)); // 500-1000m
var highmountain = demClipped.gt(1000);  // > 1000m

var elevationClass = lowland.multiply(0)
    .add(highland.multiply(1))
    .add(mountain.multiply(2))
    .add(highmountain.multiply(3))
    .rename('elevation_class');

Map.addLayer(elevationClass, {
  min: 0,
  max: 3,
  palette: ['green', 'yellow', 'orange', 'red']
}, 'Elevation Classes');

// ============================================
// 8. ตัวอย่าง: Slope Classes (การจำแนกระดับความชัน)
// ============================================
print('\n=== Slope Classes ===');

var flat = slope.lte(5);           // 0-5° = เรียบ
var gentle = slope.gt(5).and(slope.lte(15));   // 5-15° = ชันน้อย
var steep = slope.gt(15).and(slope.lte(30));   // 15-30° = ชันมาก
var verysteep = slope.gt(30);      // > 30° = ชันมากเลย

var slopeClass = flat.multiply(0)
    .add(gentle.multiply(1))
    .add(steep.multiply(2))
    .add(verysteep.multiply(3))
    .rename('slope_class');

Map.addLayer(slopeClass, {
  min: 0,
  max: 3,
  palette: ['green', 'yellow', 'orange', 'red']
}, 'Slope Classes');

print('Flat (0-5°):', flat.reduceRegion({
  reducer: ee.Reducer.sum(), geometry: roi, scale: 30
}));
print('Gentle (5-15°):', gentle.reduceRegion({
  reducer: ee.Reducer.sum(), geometry: roi, scale: 30
}));
print('Steep (15-30°):', steep.reduceRegion({
  reducer: ee.Reducer.sum(), geometry: roi, scale: 30
}));
print('Very Steep (>30°):', verysteep.reduceRegion({
  reducer: ee.Reducer.sum(), geometry: roi, scale: 30
}));

// ============================================
// 9. ตัวอย่าง: Aspect Classes (การจำแนกทิศทาง)
// ============================================
print('\n=== Aspect Classes ===');

var north = aspect.gt(315).or(aspect.lte(45));
var east = aspect.gt(45).and(aspect.lte(135));
var south = aspect.gt(135).and(aspect.lte(225));
var west = aspect.gt(225).and(aspect.lte(315));

var aspectClass = north.multiply(0)
    .add(east.multiply(1))
    .add(south.multiply(2))
    .add(west.multiply(3))
    .rename('aspect_class');

Map.addLayer(aspectClass, {
  min: 0,
  max: 3,
  palette: ['red', 'yellow', 'green', 'blue']
}, 'Aspect Classes (N-E-S-W)');

// ============================================
// 10. ตัวอย่าง: Flow Accumulation (ทิศทางไหลน้ำ)
// ============================================
print('\n=== Flow Accumulation ===');

var flowAccumulation = ee.Terrain.flowAccumulation(demClipped);

Map.addLayer(flowAccumulation.log(), {
  min: 0,
  max: 8,
  palette: ['white', 'lightblue', 'blue', 'darkblue']
}, 'Flow Accumulation (log)');

// ============================================
// 11. อื่น DEM Options ใน GEE
// ============================================
print('\n=== DEM Options in GEE ===');
print('1. SRTM (USGS/SRTMGL1_003) - 30m, Global');
print('2. ALOS World 3D (JAXA/ALOS/AW3D30) - 30m, Newer');
print('3. Copernicus DEM (COPERNICUS/DEM/GLO30) - 30m, High accuracy');
print('4. GEBCO (GEBCO_2023) - 15 arc-second, Bathymetry');

// ============================================
// 12. ตัวอย่าง: Compute Terrain Index
// ============================================
print('\n=== Topographic Index (TI) ===');
// TI = ln(α / tan(β))
// α = specific catchment area
// β = slope

var catchmentArea = flowAccumulation.multiply(30).multiply(30);  // Convert to m²
var slopeRad = slope.multiply(Math.PI).divide(180);  // Convert to radians
var ti = catchmentArea.divide(slopeRad.tan())
    .log()
    .rename('topographic_index');

// ============================================
// 13. Center Map and Statistics
// ============================================
Map.centerObject(roi, 11);

// คำนวณสถิติพื้นฐาน
print('\n=== Terrain Statistics ===');
var stats = demClipped.reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.minMax(), '', true),
  geometry: roi,
  scale: 30
});

print('Mean Elevation (m):', ee.Number(stats.get('SRTM_GL1_Ellip_srtm_mean')));
print('Min Elevation (m):', ee.Number(stats.get('SRTM_GL1_Ellip_srtm_min')));
print('Max Elevation (m):', ee.Number(stats.get('SRTM_GL1_Ellip_srtm_max')));

print('\n=== สำเร็จ ===');
