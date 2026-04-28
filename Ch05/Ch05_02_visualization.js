/**
 * ===============================================
 * บทที่ 5: การจัดการข้อมูล (Data Management)
 * ===============================================
 *
 * Ch05_02_visualization.js
 * หัวข้อ: Image Visualization - True Color, False Color, Single Band
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
var roi = ee.Geometry.Point(100.5, 13.75).buffer(10000);

// ============================================
// 2. Load Collection 2 Landsat 8 + Apply Scale Factors
// ============================================
// ฟังก์ชัน: ใช้ Scale Factors สำหรับ Collection 2
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// ฟังก์ชัน: Cloud Masking (QA_PIXEL)
function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  // Bit 3: Cloud, Bit 4: Cloud Shadow
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
// 3. True Color Composite (Natural Colors)
// ============================================
print('=== True Color Composite ===');
Map.addLayer(composite, {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],  // Red, Green, Blue
  min: 0,
  max: 0.3
}, 'True Color');

// ============================================
// 4. False Color Composites
// ============================================
print('=== False Color Composites ===');

// False Color 1: Vegetation (NIR-Red-Green)
// เน้นพืชพรรณ โดยพืชจะเห็นเป็นสีแดง
Map.addLayer(composite, {
  bands: ['SR_B5', 'SR_B4', 'SR_B3'],  // NIR, Red, Green
  min: 0,
  max: 0.4
}, 'False Color - Vegetation');

// False Color 2: Urban/Bare Soil (SWIR2-NIR-Red)
// เน้นพื้นที่เมือง ดิน ลาดหินจะเห็นเป็นสีแดง
Map.addLayer(composite, {
  bands: ['SR_B7', 'SR_B5', 'SR_B4'],  // SWIR2, NIR, Red
  min: 0,
  max: 0.4
}, 'False Color - Urban/Bare Soil');

// False Color 3: Agriculture/Health (SWIR1-NIR-Blue)
Map.addLayer(composite, {
  bands: ['SR_B6', 'SR_B5', 'SR_B2'],  // SWIR1, NIR, Blue
  min: 0,
  max: 0.4
}, 'False Color - Agriculture');

// False Color 4: Water (SWIR1-Red-Green)
Map.addLayer(composite, {
  bands: ['SR_B6', 'SR_B4', 'SR_B3'],  // SWIR1, Red, Green
  min: 0,
  max: 0.4
}, 'False Color - Water');

// ============================================
// 5. Single Band Visualization
// ============================================
print('=== Single Band Visualization ===');

// NDVI (Normalized Difference Vegetation Index)
var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']);
Map.addLayer(ndvi, {
  min: -0.2,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'darkgreen']
}, 'NDVI');

// NDWI (Normalized Difference Water Index)
var ndwi = composite.normalizedDifference(['SR_B3', 'SR_B5']);
Map.addLayer(ndwi, {
  min: -0.5,
  max: 0.8,
  palette: ['red', 'orange', 'yellow', 'lightblue', 'darkblue']
}, 'NDWI');

// NDBI (Normalized Difference Built-up Index)
var ndbi = composite.normalizedDifference(['SR_B6', 'SR_B5']);
Map.addLayer(ndbi, {
  min: -0.3,
  max: 0.6,
  palette: ['blue', 'cyan', 'white', 'yellow', 'red']
}, 'NDBI');

// ============================================
// 6. Single Band - Red only
// ============================================
print('=== Single Band - Red Channel ===');
var redBand = composite.select('SR_B4');
Map.addLayer(redBand, {
  min: 0,
  max: 0.3,
  palette: ['black', 'darkred', 'red', 'lightred', 'white']
}, 'Red Band');

// ============================================
// 7. Land Surface Temperature (LST)
// ============================================
print('=== Land Surface Temperature ===');
var lst = composite.select('ST_B10');  // Thermal band (Kelvin)
var lstC = lst.subtract(273.15);  // แปลงเป็น Celsius
Map.addLayer(lstC, {
  min: 20,
  max: 45,
  palette: ['blue', 'cyan', 'lightgreen', 'yellow', 'orange', 'red']
}, 'LST (°C)');

// ============================================
// 8. Band Combinations Reference Table
// ============================================
print('\n=== Band Combinations Reference ===');
print('Band 2 (Blue):     SR_B2 - 450-515 nm');
print('Band 3 (Green):    SR_B3 - 525-600 nm');
print('Band 4 (Red):      SR_B4 - 630-680 nm');
print('Band 5 (NIR):      SR_B5 - 845-885 nm');
print('Band 6 (SWIR1):    SR_B6 - 1560-1660 nm');
print('Band 7 (SWIR2):    SR_B7 - 2100-2300 nm');
print('Thermal Band:      ST_B10 - 10,900-12,500 nm');

// ============================================
// 9. Center Map and Finish
// ============================================
Map.centerObject(roi, 11);
print('\n=== สำเร็จ ===');
