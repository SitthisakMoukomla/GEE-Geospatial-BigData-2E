/**
 * ===============================================
 * บทที่ 5: การจัดการข้อมูล (Data Management)
 * ===============================================
 *
 * Ch05_05_band_math.js
 * หัวข้อ: Mathematical Operations - NDVI, NDWI, NDBI, EVI, MNDWI, NBR
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

print('=== Landsat 8 Composite Prepared ===');
print('Bands available:', composite.bandNames().getInfo());

// ============================================
// 3. NDVI - Normalized Difference Vegetation Index
// ============================================
print('\n=== NDVI: Vegetation Index ===');
// สูตร: (NIR - Red) / (NIR + Red)
// Range: -1 to 1
// > 0.5 = ป่า, 0.3-0.5 = พืชพรรณ, 0.1-0.3 = หญ้า, < 0.1 = ดิน/น้ำ

var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4'])
    .rename('NDVI');

Map.addLayer(ndvi, {
  min: -0.2,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'darkgreen']
}, 'NDVI');

print('NDVI Range:', ndvi.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 4. NDWI - Normalized Difference Water Index
// ============================================
print('\n=== NDWI: Water Index ===');
// สูตร: (Green - NIR) / (Green + NIR)
// Range: -1 to 1
// > 0.3 = น้ำ, 0-0.3 = พืช, < 0 = ดิน/เมือง

var ndwi = composite.normalizedDifference(['SR_B3', 'SR_B5'])
    .rename('NDWI');

Map.addLayer(ndwi, {
  min: -0.5,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightblue', 'darkblue']
}, 'NDWI');

print('NDWI Range:', ndwi.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 5. NDBI - Normalized Difference Built-up Index
// ============================================
print('\n=== NDBI: Built-up Index ===');
// สูตร: (SWIR1 - NIR) / (SWIR1 + NIR)
// Range: -1 to 1
// > 0.1 = เมือง/สิ่งก่อสร้าง, < 0.1 = พืชพรรณ/น้ำ

var ndbi = composite.normalizedDifference(['SR_B6', 'SR_B5'])
    .rename('NDBI');

Map.addLayer(ndbi, {
  min: -0.3,
  max: 0.6,
  palette: ['blue', 'cyan', 'white', 'yellow', 'red']
}, 'NDBI');

print('NDBI Range:', ndbi.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 6. EVI - Enhanced Vegetation Index
// ============================================
print('\n=== EVI: Enhanced Vegetation Index ===');
// สูตร: 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)
// ดีกว่า NDVI เมื่อ vegetation หนาแน่น

var nir = composite.select('SR_B5');
var red = composite.select('SR_B4');
var blue = composite.select('SR_B2');

var evi = nir.subtract(red)
    .divide(nir.add(red.multiply(6))
                .subtract(blue.multiply(7.5))
                .add(1))
    .multiply(2.5)
    .rename('EVI');

Map.addLayer(evi, {
  min: -0.2,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'darkgreen']
}, 'EVI');

print('EVI Range:', evi.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 7. MNDWI - Modified Normalized Difference Water Index
// ============================================
print('\n=== MNDWI: Modified Water Index ===');
// สูตร: (Green - SWIR1) / (Green + SWIR1)
// ดีสำหรับแยกน้ำออกจากพืช

var mndwi = composite.normalizedDifference(['SR_B3', 'SR_B6'])
    .rename('MNDWI');

Map.addLayer(mndwi, {
  min: -0.5,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightblue', 'darkblue']
}, 'MNDWI');

print('MNDWI Range:', mndwi.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 8. NBR - Normalized Burn Ratio
// ============================================
print('\n=== NBR: Burn Ratio (Fire/Damage Detection) ===');
// สูตร: (NIR - SWIR2) / (NIR + SWIR2)
// ใช้ตรวจจับผลกระทบจากไฟป่า

var nbr = composite.normalizedDifference(['SR_B5', 'SR_B7'])
    .rename('NBR');

Map.addLayer(nbr, {
  min: -0.5,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'darkgreen']
}, 'NBR');

print('NBR Range:', nbr.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: roi,
  scale: 30
}));

// ============================================
// 9. เพิ่มเติม: GNDVI (Green NDVI)
// ============================================
print('\n=== GNDVI: Green NDVI (for vegetation) ===');
// สูตร: (NIR - Green) / (NIR + Green)

var gndvi = composite.normalizedDifference(['SR_B5', 'SR_B3'])
    .rename('GNDVI');

Map.addLayer(gndvi, {
  min: -0.2,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'darkgreen']
}, 'GNDVI');

// ============================================
// 10. เพิ่มเติม: OSAVI (Optimized Soil-Adjusted Vegetation Index)
// ============================================
print('\n=== OSAVI: Optimized SAVI ===');
// สูตร: (NIR - Red) / (NIR + Red + 0.16)

var osavi = nir.subtract(red)
    .divide(nir.add(red).add(0.16))
    .rename('OSAVI');

Map.addLayer(osavi, {
  min: -0.2,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'darkgreen']
}, 'OSAVI');

// ============================================
// 11. แล้วคำนวณในคราวเดียว (Stack all indices)
// ============================================
print('\n=== Stack All Indices ===');

var allIndices = composite
    .addBands(ndvi)
    .addBands(ndwi)
    .addBands(ndbi)
    .addBands(evi)
    .addBands(mndwi)
    .addBands(nbr)
    .addBands(gndvi)
    .addBands(osavi);

print('All Indices Bands:', allIndices.bandNames().getInfo());

// ============================================
// 12. สรุป Indices และสูตร
// ============================================
print('\n=== Index Summary Table ===');
print('Index | Formula | Used for');
print('------|---------|----------');
print('NDVI  | (NIR-R)/(NIR+R) | Vegetation');
print('NDWI  | (G-NIR)/(G+NIR) | Water/Moisture');
print('NDBI  | (S1-NIR)/(S1+NIR) | Built-up');
print('EVI   | 2.5*(NIR-R)/(NIR+6R-7.5B+1) | Dense Vegetation');
print('MNDWI | (G-S1)/(G+S1) | Water (refined)');
print('NBR   | (NIR-S2)/(NIR+S2) | Burn/Fire');
print('GNDVI | (NIR-G)/(NIR+G) | Green vegetation');
print('OSAVI | (NIR-R)/(NIR+R+0.16) | Vegetation (soil adjusted)');

// ============================================
// 13. Center Map and Finish
// ============================================
Map.centerObject(roi, 11);
print('\n=== สำเร็จ ===');
