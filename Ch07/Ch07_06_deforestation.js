/*====================================================================
 * บทที่ 7.5 Forestry Application — ตรวจจับการตัดไม้ (Deforestation)
 * Ch07_06_deforestation.js
 *
 * วัตถุประสงค์:
 *   - วิเคราะห์การเปลี่ยนแปลง NDVI เพื่อตรวจจับการตัดไม้
 *   - เปรียบเทียบ NDVI สองช่วงเวลา (baseline vs recent)
 *   - ระบุพื้นที่ potential deforestation
 *
 * ตรรมชาติของ NDVI ที่ deforestation:
 *   - ป่าธรรมชาติ: NDVI > 0.6
 *   - ที่ถูกตัดไม้: NDVI ลดลงอย่างมาก
 *   - threshold: NDVI_2025 - NDVI_2020 < -0.3 = likely deforestation
 *
 * ข้อมูล: LANDSAT/LC08/C02/T1_L2 (Collection 2)
 * ROI: Forest area, Nakhon Sawan Province
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
// พื้นที่ป่า Nakhon Sawan
var roi = ee.Geometry.Rectangle([
  100.0, 15.5,   // ตะวันตก-ใต้
  101.0, 16.5    // ตะวันออก-เหนือ
]);

// ====== Helper Functions ======

/**
 * ฟังก์ชัน: มาส์กเมฆโดยใช้ QA_PIXEL
 * Landsat 8/9 Collection 2 ใช้ QA_PIXEL flag
 */
function maskClouds(image) {
  var qa = image.select('QA_PIXEL');

  // Bit 3 = cloud shadow, Bit 4 = cloud
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 4;

  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
    .and(qa.bitwiseAnd(cloudsBitMask).eq(0));

  return image.updateMask(mask);
}

/**
 * ฟังก์ชัน: Apply scale factors (Landsat C02 SR)
 * Landsat Collection 2 ให้ข้อมูลที่ต้องคูณด้วย scale factor
 */
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);

  return image
    .addBands(opticalBands, null, true)
    .addBands(thermalBands, null, true);
}

/**
 * ฟังก์ชัน: คำนวณ NDVI
 * SR_B5 = NIR, SR_B4 = Red (Collection 2)
 */
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  return image.addBands(ndvi);
}

// ====== Data Loading: Baseline (2020) ======
var ndvi2020 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate('2020-01-01', '2020-06-30')
  .filterBounds(roi)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(maskClouds)
  .map(applyScaleFactors)
  .map(addNDVI)
  .select('NDVI')
  .median()
  .clip(roi);

// ====== Data Loading: Recent (2025) ======
// รวม Landsat 8 และ Landsat 9 (ถ้ามี)
var ndvi2025 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterDate('2025-01-01', '2025-06-30')
  .filterBounds(roi)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(maskClouds)
  .map(applyScaleFactors)
  .map(addNDVI)
  .select('NDVI')
  .median()
  .clip(roi);

// ====== Visualization: NDVI Maps ======
var visNDVI = {
  min: -0.2,
  max: 0.8,
  palette: ['red', 'yellow', 'green', 'darkgreen']
};

Map.addLayer(ndvi2020, visNDVI, 'NDVI 2020 (Baseline)');
Map.addLayer(ndvi2025, visNDVI, 'NDVI 2025 (Recent)');

// ====== Change Detection ======
var ndviDiff = ndvi2025.subtract(ndvi2020).rename('NDVI_Diff');

var visChange = {
  min: -1,
  max: 1,
  palette: ['red', 'white', 'green']
};

Map.addLayer(ndviDiff, visChange, 'NDVI Change (2025 - 2020)');

// ====== Deforestation Detection ======
/**
 * Criteria: NDVI ลดลง > 0.3 = possible deforestation
 * ลดลงมากกว่า 0.5 = high confidence deforestation
 */
var threshold_moderate = -0.3;
var threshold_severe = -0.5;

var deforestMod = ndviDiff.lt(threshold_moderate).selfMask();
var deforestSevere = ndviDiff.lt(threshold_severe).selfMask();

var visDefores = {
  palette: ['red']
};

Map.addLayer(deforestMod, visDefores, 'Potential Deforestation (ΔNDVi < -0.3)');
Map.addLayer(deforestSevere, {palette: 'darkred'}, 'Severe Deforestation (ΔNDVi < -0.5)');

// ====== Area Calculation ======
/**
 * คำนวณพื้นที่ deforestation
 * Landsat resolution = 30m × 30m = 900 m²
 */
function calculateDeforestArea(mask, label) {
  var area = mask
    .multiply(ee.Image.pixelArea())
    .divide(1e6);  // convert to km²

  var areaSum = area.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e10
  });

  print(label + ' Area (km²):', areaSum);
  return areaSum;
}

calculateDeforestArea(deforestMod, 'Moderate Deforestation');
calculateDeforestArea(deforestSevere, 'Severe Deforestation');

// ====== Forest Loss by Threshold ======
// Quantify forest loss as a function of NDVI change
var forestChange = ndviDiff
  .where(ndviDiff.gte(0), 0)  // ไม่มี loss
  .rename('forest_loss_indicator');

var lossStats = forestChange.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e10
});

print('========== Deforestation Analysis ==========');
print('Mean NDVI 2020:', ndvi2020.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e10
}));

print('Mean NDVI 2025:', ndvi2025.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e10
}));

print('Mean NDVI Change:', ndviDiff.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e10
}));

print('Forest Loss Indicator:', lossStats);

// ====== Additional: Forest Cover Classification ======
/**
 * จำแนกการใช้ประโยชน์ดิน:
 *  NDVI > 0.6  : Dense Forest
 *  0.4 - 0.6   : Moderate Forest
 *  0.2 - 0.4   : Sparse Vegetation
 *  < 0.2       : Non-Forest (built-up, agriculture, bare soil)
 */
var forestClass = ndvi2025
  .where(ndvi2025.lt(0.2), 0)     // Non-forest
  .where(ndvi2025.gte(0.2).and(ndvi2025.lt(0.4)), 1)  // Sparse veg
  .where(ndvi2025.gte(0.4).and(ndvi2025.lt(0.6)), 2)  // Moderate forest
  .where(ndvi2025.gte(0.6), 3);   // Dense forest

var visClass = {
  min: 0,
  max: 3,
  palette: ['gray', 'yellow', 'lightgreen', 'darkgreen']
};

Map.addLayer(forestClass, visClass, 'Forest Classification 2025');

// ====== Map Setup ======
Map.setCenter(100.5, 16.0, 10);
Map.setOptions('SATELLITE');
