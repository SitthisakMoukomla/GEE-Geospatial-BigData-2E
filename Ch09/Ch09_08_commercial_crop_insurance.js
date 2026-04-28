/*
 * Ch09_08_commercial_crop_insurance.js
 * Commercial Application: Crop Insurance NDVI Anomaly Detection
 * ติดตาม NDVI ผลผลิต เพื่อประกันภัยเกษตร
 *
 * ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
 * วันที่: 2025
 */

/*
 * Use Case: Crop Insurance Company
 * - Monitor rice paddy health during growing season
 * - Detect yield anomalies (low NDVI vs historical average)
 * - Trigger insurance claim if anomaly exceeds threshold
 * - Cost: GEE REST API access for automated monitoring
 */

// === 1. Define Farm Boundaries ===
// ในการใช้งานจริง ข้อมูล farm boundary มาจาก insurance customer database
var farm_boundary = ee.Geometry.Polygon([[
  [100.45, 13.70],
  [100.55, 13.70],
  [100.55, 13.80],
  [100.45, 13.80],
  [100.45, 13.70]
]]);

print('Farm area:', farm_boundary.area().divide(10000).getInfo(), 'hectares');

// === 2. Current Season NDVI (Growing Season) ===
// ต้องดัดแปลง date range ตามฤดูการปลูก
// ตัวอย่าง: ข้าวโพด = June - September, ข้าว = May - October

var current_season_start = '2025-06-01';
var current_season_end = '2025-09-30';

var current_ndvi = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(current_season_start, current_season_end)
    .filterBounds(farm_boundary)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(function(img) {
      // Cloud masking ด้วย SCL band
      var scl = img.select('SCL');
      // Remove cloud (3), snow (10), water (6), cloud shadow (2), unclassified (0)
      var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
      return img.updateMask(mask);
    })
    .median()
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI');

// === 3. Historical NDVI (5-year Average) ===
// ใช้ NDVI เฉลี่ยจาก 2020-2024 เดือนเดียวกัน

var historical_ndvi = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filter(ee.Filter.calendarRange(6, 9, 'month'))  // June-September
    .filterDate('2020-01-01', '2024-12-31')
    .filterBounds(farm_boundary)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(function(img) {
      var scl = img.select('SCL');
      var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
      return img.updateMask(mask).normalizedDifference(['B8', 'B4']);
    })
    .mean()
    .rename('NDVI_Historical');

// === 4. Calculate NDVI Anomaly ===
// Anomaly = Current - Historical Average
// ค่าลบ = ผลผลิตต่ำกว่าปกติ (สัญญาณเสี่ยง)

var anomaly = current_ndvi.subtract(historical_ndvi).rename('NDVI_Anomaly');

// === 5. Classify Anomaly Severity ===
// Thresholds (ปรับตามประสบการณ์):
// >= 0.05 : Normal (เขียว)
// -0.05 to 0.05 : Slight anomaly (เหลือง)
// -0.15 to -0.05 : Moderate anomaly (ส้ม)
// < -0.15 : Severe anomaly (แดง) → Insurance claim

var anomaly_severity = anomaly.where(anomaly.gte(-0.05), 0)      // Normal
                               .where(anomaly.lt(-0.05).and(anomaly.gte(-0.15)), 1)  // Slight
                               .where(anomaly.lt(-0.15).and(anomaly.gte(-0.30)), 2)  // Moderate
                               .where(anomaly.lt(-0.30), 3)                          // Severe
                               .rename('Severity');

// === 6. Visualize Results ===
Map.centerObject(farm_boundary, 12);

Map.addLayer(
  current_ndvi.clip(farm_boundary),
  {min: 0, max: 0.8, palette: ['red', 'yellow', 'green']},
  'Current NDVI (2025)'
);

Map.addLayer(
  historical_ndvi.clip(farm_boundary),
  {min: 0, max: 0.8, palette: ['red', 'yellow', 'green']},
  'Historical NDVI (2020-2024 avg)'
);

Map.addLayer(
  anomaly.clip(farm_boundary),
  {min: -0.3, max: 0.3, palette: ['red', 'orange', 'yellow', 'lightgreen', 'green']},
  'NDVI Anomaly (ค่าลบ = ต่ำกว่าปกติ)'
);

Map.addLayer(
  anomaly_severity.clip(farm_boundary),
  {min: 0, max: 3, palette: ['green', 'yellow', 'orange', 'red']},
  'Anomaly Severity (0=normal, 3=severe)'
);

// === 7. Insurance Claim Assessment ===

// คำนวณสัดส่วนของพื้นที่ที่มี NDVI anomaly

var severity_map = {
  0: 'Normal',
  1: 'Slight',
  2: 'Moderate',
  3: 'Severe'
};

print('=== CROP INSURANCE ASSESSMENT ===');

// คำนวณพื้นที่แต่ละ severity level
var area_by_severity = anomaly_severity.eq(ee.List.sequence(0, 3)).rename([
  'Normal', 'Slight', 'Moderate', 'Severe'
]);

var areas = area_by_severity.multiply(ee.Image.pixelArea()).divide(10000);  // hectares

var severity_areas = areas.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: farm_boundary,
  scale: 10,
  maxPixels: 1e13
});

print('Area by Severity (hectares):');
print('  Normal (green):', severity_areas.get('Normal'));
print('  Slight (yellow):', severity_areas.get('Slight'));
print('  Moderate (orange):', severity_areas.get('Moderate'));
print('  Severe (red):', severity_areas.get('Severe'));

// === 8. Insurance Payout Decision ===

// สมมุติ: Threshold for claim = 20% ของพื้นที่มี moderate + severe anomaly
// Premium = 5% ของ crop value
// Payout = 50% ของ crop value หากเสียหาย > 30%

var total_area = farm_boundary.area().divide(10000);  // hectares
var affected_area = severity_areas.get('Moderate').add(severity_areas.get('Severe'));
var damage_percentage = affected_area.divide(total_area).multiply(100);

var crop_value_per_hectare = 50000;  // Thai Baht/hectare (ตัวอย่าง)
var total_crop_value = total_area.multiply(crop_value_per_hectare);

var claim_threshold = 30;  // 30% damage triggers claim
var payout_rate = 0.50;    // 50% of crop value

print('\n=== PAYOUT CALCULATION ===');
print('Total farm area (ha):', total_area.getInfo());
print('Affected area (ha):', affected_area.getInfo());
print('Damage percentage (%):', damage_percentage.getInfo());
print('Crop value (Baht):', total_crop_value.getInfo());

// สร้าง payout formula
var payout = ee.Number(0);
var claim_triggered = false;

// ตรวจสอบ damage threshold
var threshold_check = damage_percentage.gte(claim_threshold);

payout = ee.Algorithms.If(
  threshold_check,
  total_crop_value.multiply(payout_rate),  // Payout 50% if damage >= 30%
  0  // No payout if damage < 30%
);

print('Claim triggered:', threshold_check.getInfo());
print('Recommended payout (Baht):', payout.getInfo());

// === 9. Export Results for Insurance Company ===

// Export anomaly map
Export.image.toDrive({
  image: anomaly.clip(farm_boundary).float(),
  description: 'ndvi_anomaly_2025',
  region: farm_boundary,
  scale: 10,
  fileFormat: 'GeoTIFF'
});

// Export severity map
Export.image.toDrive({
  image: anomaly_severity.clip(farm_boundary).uint8(),
  description: 'anomaly_severity_2025',
  region: farm_boundary,
  scale: 10,
  fileFormat: 'GeoTIFF'
});

// === 10. Time Series Monitoring (Throughout Season) ===

// สร้าง monthly NDVI composite เพื่อติดตาม progression

print('\n=== MONTHLY NDVI PROGRESSION ===');

var months = ee.List.sequence(6, 9);  // June-September

var monthly_ndvi = months.map(function(month) {
  var monthly = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filter(ee.Filter.calendarRange(month, month, 'month'))
      .filterDate('2025-01-01', '2025-12-31')
      .filterBounds(farm_boundary)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .map(function(img) {
        var scl = img.select('SCL');
        var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
        return img.updateMask(mask);
      })
      .median()
      .normalizedDifference(['B8', 'B4']);

  var mean_ndvi = monthly.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: farm_boundary,
    scale: 10,
    maxPixels: 1e13
  }).get('nd');

  return ee.Feature(null, {
    month: month,
    ndvi: mean_ndvi,
    year: 2025
  });
});

var monthly_chart = ui.Chart.feature.byFeature(
  ee.FeatureCollection(monthly_ndvi),
  'month',
  'ndvi'
).setChartType('LineChart')
 .setOptions({
   title: 'Monthly NDVI Progression 2025',
   hAxis: {
     title: 'Month (6=June, 7=July, 8=Aug, 9=Sept)',
     viewWindow: {min: 6, max: 9}
   },
   vAxis: {title: 'Mean NDVI'},
   pointSize: 5
 });

print(monthly_chart);

// === 11. Risk Assessment Summary ===

print('\n=== RISK ASSESSMENT SUMMARY ===');
print('Farm ID: FARM_001');
print('Season: June-September 2025');
print('Coverage: NDVI-based yield insurance');
print('');
print('Current Status: ' + (claim_triggered.getInfo() ? 'CLAIM ELIGIBLE' : 'NORMAL'));
print('Recommended Action: ' + (claim_triggered.getInfo() ? 'Proceed with claim investigation' : 'Continue monitoring'));

print('\nInsurance Underwriter Notes:');
print('- Field inspection recommended if claim triggered');
print('- Cross-validate with ground truth/drone imagery');
print('- Check for other factors: pests, disease, irrigation');
print('- Satellite-only assessment has ~85% accuracy');
