/**
 * ===============================================
 * บทที่ 5: การจัดการข้อมูล (Data Management)
 * ===============================================
 *
 * Ch05_03_raster_vector.js
 * หัวข้อ: Raster to Vector Conversion - แปลง Raster เป็น Vector Polygon
 *
 * สำหรับใช้ใน Google Earth Engine Code Editor
 * เขียนโดย: GEE Book Team
 * อัปเดต: 2025
 *
 * ===============================================
 */

// ============================================
// 1. กำหนด ROI
// ============================================
var roi = ee.Geometry.Rectangle([100.3, 13.5, 100.8, 14.0]);

// ============================================
// 2. Prepare Landsat 8 Composite
// ============================================
// ฟังก์ชัน: Apply Scale Factors
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// ฟังก์ชัน: Cloud Masking
function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0)
      .and(qa.bitwiseAnd(1 << 4).eq(0));
  return image.updateMask(mask);
}

// โหลด Landsat 8 Collection 2
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .map(maskClouds)
    .map(applyScaleFactors);

var composite = l8.median().clip(roi);

// ============================================
// 3. สร้าง NDVI Index
// ============================================
print('=== NDVI Calculation ===');
var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4'])
    .rename('NDVI');
print('NDVI Image:', ndvi);

// ============================================
// 4. ตัวอย่าง 1: แปลง NDVI Threshold เป็น Polygon
// ============================================
print('\n=== Example 1: Forest Classification (NDVI > 0.5) ===');

// สร้าง Binary Mask: NDVI > 0.5 = ป่า
var forest = ndvi.gt(0.5)
    .rename('forest')
    .selfMask();  // ลบพิกเซลที่มี value = 0

// แสดงบนแผนที่
Map.addLayer(forest, {palette: 'green'}, 'Forest Mask (NDVI > 0.5)');

// แปลง Raster ป่า เป็น Vector (Polygon)
var forestVectors = forest.reduceToVectors({
  geometry: roi,
  scale: 30,
  geometryType: 'polygon',
  eightConnected: true,  // ใช้ 8-connected neighbors
  maxPixels: 1e8
});

print('จำนวน Forest Polygons:', forestVectors.size());
Map.addLayer(forestVectors, {color: 'darkgreen', strokeWidth: 2}, 'Forest Polygons');

// ============================================
// 5. ตัวอย่าง 2: Classification หลายประเภท
// ============================================
print('\n=== Example 2: Multi-class Classification ===');

// กำหนด NDVI Threshold สำหรับแต่ละประเภท
var waterClass = ndvi.lt(0);      // NDVI < 0 = น้ำ
var bareClass = ndvi.gte(0).and(ndvi.lt(0.2));  // 0 <= NDVI < 0.2 = ดิน
var grassClass = ndvi.gte(0.2).and(ndvi.lt(0.5));  // 0.2 <= NDVI < 0.5 = หญ้า
var forestClass = ndvi.gte(0.5);  // NDVI >= 0.5 = ป่า

// สร้าง Classification Raster
var classification = waterClass.multiply(0)
    .add(bareClass.multiply(1))
    .add(grassClass.multiply(2))
    .add(forestClass.multiply(3))
    .rename('class');

print('Classification Image (0=Water, 1=Bare, 2=Grass, 3=Forest):', classification);

// แสดงบนแผนที่
var visParams = {
  min: 0,
  max: 3,
  palette: ['blue', 'brown', 'yellow', 'green']
};
Map.addLayer(classification, visParams, 'Classification Raster');

// ============================================
// 6. แปลง Classification เป็น Vector
// ============================================
print('\n=== Convert Classification to Vectors ===');

var classVectors = classification.reduceToVectors({
  geometry: roi,
  scale: 30,
  geometryType: 'polygon',
  eightConnected: true,
  maxPixels: 1e8,
  labelProperty: 'class'  // ชื่อ property ที่เก็บค่า class
});

print('จำนวน Classification Polygons:', classVectors.size());
Map.addLayer(classVectors, {color: 'red', strokeWidth: 1}, 'Classification Polygons');

// ============================================
// 7. ตัวอย่าง 3: Use NDWI for Water Detection
// ============================================
print('\n=== Example 3: Water Detection (NDWI > 0.3) ===');

var ndwi = composite.normalizedDifference(['SR_B3', 'SR_B5'])
    .rename('NDWI');

// สร้าง Water Mask
var water = ndwi.gt(0.3)
    .rename('water')
    .selfMask();

Map.addLayer(water, {palette: 'blue'}, 'Water Mask (NDWI > 0.3)');

// แปลงเป็น Vector
var waterVectors = water.reduceToVectors({
  geometry: roi,
  scale: 30,
  geometryType: 'polygon',
  eightConnected: true,
  maxPixels: 1e8
});

print('จำนวน Water Polygons:', waterVectors.size());
Map.addLayer(waterVectors, {color: 'darkblue', strokeWidth: 2}, 'Water Polygons');

// ============================================
// 8. เพิ่มข้อมูล Property ให้ Polygon
// ============================================
print('\n=== Add Properties to Polygons ===');

// สร้าง Forest Vectors ที่มี area property
var forestVectorsWithArea = forestVectors.map(function(feature) {
  var area = feature.geometry().area().divide(10000);  // แปลงเป็น hectare
  return feature.set('area_ha', area);
});

// ตรวจสอบ Feature แรก
var firstFeature = forestVectorsWithArea.first();
print('First Forest Feature:', firstFeature);

// ============================================
// 9. Filter Vectors ตามขนาด (Optional)
// ============================================
print('\n=== Filter Polygons by Size ===');

// เลือก Polygon ที่มีพื้นที่ >= 5 ไร่ (0.5 ha)
var largeForest = forestVectorsWithArea.filter(
    ee.Filter.gte('area_ha', 0.5)
);

print('Large Forest Polygons (>= 0.5 ha):', largeForest.size());
Map.addLayer(largeForest, {color: 'lime', strokeWidth: 2}, 'Large Forest Polygons');

// ============================================
// 10. Center Map and Finish
// ============================================
Map.centerObject(roi, 11);
print('\n=== สำเร็จ ===');
