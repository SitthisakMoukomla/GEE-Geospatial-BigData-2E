/*====================================================================
 * บทที่ 7.4 Smart Farming — ติดตามสุขภาพพืชด้วย NDVI Time Series
 * Ch07_04_smart_farming_ndvi.js
 *
 * วัตถุประสงค์:
 *   - สร้าง NDVI time series จาก Sentinel-2
 *   - ติดตามการเจริญเติบโตของพืช
 *   - วัดผล crop health indicators
 *
 * ข้อมูล: COPERNICUS/S2_SR_HARMONIZED (Collection 2)
 * ROI: Single farm plot, Nakhon Sawan Province
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
// แปลงข้าวโพดที่ Nakhon Sawan
var farmPlot = ee.Geometry.Point([100.5, 15.0]);

// สำหรับ clipping ให้ใหญ่ขึ้นเล็กน้อย (500m buffer)
var roiBounds = farmPlot.buffer(500);

// ====== Helper Functions ======

/**
 * ฟังก์ชัน: มาส์กเมฆจากข้อมูล Sentinel-2
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
 * ฟังก์ชัน: คำนวณ NDVI
 * NDVI = (NIR - RED) / (NIR + RED)
 */
function addNDVI(image) {
  // Sentinel-2 Collection 2: B8 = NIR, B4 = Red
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

// ====== Data Loading ======
var s2Collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate('2024-01-01', '2025-01-01')
  .filterBounds(roiBounds)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
  .map(maskClouds)
  .map(addNDVI);

// สกัด NDVI series
var ndviSeries = s2Collection.select('NDVI')
  .map(function(image) {
    return image.copyProperties(image, ['system:time_start']);
  });

// ====== Visualization: Composite Images ======
// สร้าง composite ภาพตัวแทนสำหรับแต่ละฤดู

// Q1 (ม.ค.-มี.ค.)
var q1Composite = s2Collection
  .filterDate('2024-01-01', '2024-03-31')
  .median()
  .select(['B4', 'B3', 'B2'])  // RGB
  .clip(roiBounds);

// Q2 (เม.ย.-มิ.ย.)
var q2Composite = s2Collection
  .filterDate('2024-04-01', '2024-06-30')
  .median()
  .select(['B4', 'B3', 'B2'])
  .clip(roiBounds);

// Q3 (ก.ค.-ก.ย.)
var q3Composite = s2Collection
  .filterDate('2024-07-01', '2024-09-30')
  .median()
  .select(['B4', 'B3', 'B2'])
  .clip(roiBounds);

// Q4 (ต.ค.-ธ.ค.)
var q4Composite = s2Collection
  .filterDate('2024-10-01', '2024-12-31')
  .median()
  .select(['B4', 'B3', 'B2'])
  .clip(roiBounds);

var visRGB = {
  min: 0,
  max: 3000,
  gamma: 1.4
};

Map.addLayer(q1Composite, visRGB, 'Q1 (Jan-Mar) RGB');
Map.addLayer(q2Composite, visRGB, 'Q2 (Apr-Jun) RGB');
Map.addLayer(q3Composite, visRGB, 'Q3 (Jul-Sep) RGB');
Map.addLayer(q4Composite, visRGB, 'Q4 (Oct-Dec) RGB');

// NDVI composite
var ndviComposite = s2Collection.median().select('NDVI');
var visNDVI = {
  min: -0.2,
  max: 0.8,
  palette: ['red', 'yellow', 'green']
};
Map.addLayer(ndviComposite, visNDVI, 'Mean NDVI (Year)');

// ====== Time Series Chart ======
var chart = ui.Chart.image.series(ndviSeries, farmPlot, ee.Reducer.mean(), 10)
  .setOptions({
    title: 'NDVI Time Series - Farm Plot 2024',
    vAxis: {
      title: 'NDVI',
      viewWindow: {min: 0, max: 1}
    },
    hAxis: {
      title: 'Date'
    },
    pointSize: 4,
    lineWidth: 2
  });

print(chart);

// ====== Statistics ======
var stats = ndviSeries.reduce(ee.Reducer.mean()
  .combine(ee.Reducer.stdDev(), '')
  .combine(ee.Reducer.min(), '_min')
  .combine(ee.Reducer.max(), '_max'));

var regionStats = stats.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roiBounds,
  scale: 10,
  maxPixels: 1e8
});

print('========== NDVI Statistics (Farm Plot) ==========');
print('Mean NDVI:', regionStats.get('NDVI_mean'));
print('Std Dev:', regionStats.get('NDVI_stdDev'));
print('Min NDVI:', regionStats.get('NDVI_min'));
print('Max NDVI:', regionStats.get('NDVI_max'));

// ====== Crop Health Classification ======
/**
 * จำแนก crop health ตามค่า NDVI:
 *  NDVI < 0.2 : Poor / Bare soil
 *  0.2 - 0.4  : Weak
 *  0.4 - 0.6  : Moderate
 *  0.6 - 0.8  : Good
 *  > 0.8      : Excellent
 */
var healthClass = ndviComposite
  .where(ndviComposite.lt(0.2), 0)     // Poor
  .where(ndviComposite.gte(0.2).and(ndviComposite.lt(0.4)), 1)   // Weak
  .where(ndviComposite.gte(0.4).and(ndviComposite.lt(0.6)), 2)   // Moderate
  .where(ndviComposite.gte(0.6).and(ndviComposite.lt(0.8)), 3)   // Good
  .where(ndviComposite.gte(0.8), 4);   // Excellent

var visHealth = {
  min: 0,
  max: 4,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'darkgreen']
};

Map.addLayer(healthClass, visHealth, 'Crop Health Classification');

// ====== Map Setup ======
Map.setCenter(100.5, 15.0, 12);
Map.setOptions('SATELLITE');
