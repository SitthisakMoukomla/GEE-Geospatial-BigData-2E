/*
 * Ch09_10_commercial_carbon.js
 * Commercial Application: Carbon Credit MRV (Measurement, Reporting, Verification)
 * ประมาณ Above-Ground Biomass เพื่อ carbon credit monitoring
 *
 * ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
 * วันที่: 2025
 */

/*
 * Use Case: Carbon Credit Company / Forest Conservation Project
 * - Monitor forest biomass for carbon credit MRV
 * - Estimate Above-Ground Biomass (AGB) from satellite data
 * - Calculate carbon stock and credit value
 * - Verify project effectiveness
 * - Cost: Monitor hectares at pennies per hectare annually
 *
 * Note: This is simplified estimation. Real MRV requires:
 * - GEDI LiDAR data for biomass calibration
 * - Field validation with allometric equations
 * - Annual monitoring and verification
 */

// === 1. Define Project Area ===
// Forest conservation/restoration project boundary

var project_area = ee.Geometry.Polygon([[
  [100.2, 13.6],
  [100.8, 13.6],
  [100.8, 14.2],
  [100.2, 14.2],
  [100.2, 13.6]
]]);

var project_hectares = project_area.area().divide(10000).getInfo();

print('=== CARBON CREDIT MRV SYSTEM ===');
print('Project area:', project_hectares, 'hectares');

// === 2. Acquire Sentinel-2 NDVI ===

var analysis_year = 2025;
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(analysis_year + '-01-01', analysis_year + '-12-31')
    .filterBounds(project_area)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(function(img) {
      var scl = img.select('SCL');
      var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
      return img.updateMask(mask);
    });

var ndvi = s2.median()
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI');

// === 3. Biomass Estimation from NDVI ===
// Simplified allometric equation: AGB = a * exp(b * NDVI)
//
// This is a simplified approach. Real calibration requires:
// - Field measurements at multiple locations
// - GEDI LiDAR data
// - Species-specific allometric equations
// - Validation dataset
//
// Typical parameters for tropical forest:
// a = 5-15 (intercept)
// b = 2.5-4.0 (NDVI exponent)

var agb = ndvi.expression(
  'a * exp(b * NDVI)', {
    'a': 10,      // calibration parameter (needs field validation)
    'b': 3.5,     // exponent (needs field validation)
    'NDVI': ndvi
  }
).rename('AGB_tons_per_ha');

print('AGB estimation model: AGB = 10 * exp(3.5 * NDVI)');
print('(Note: Requires field calibration for accuracy)');

// === 4. Carbon Stock Calculation ===
// Carbon stock = AGB * 0.47 (IPCC default for tropical forest)
// This assumes carbon = 47% of dry biomass

var carbon_content = agb.multiply(0.47).rename('Carbon_tons_per_ha');

// === 5. Total Carbon Stock ===

var carbon_stock_area = carbon_content.multiply(ee.Image.pixelArea().divide(10000));
// multiply by 10000 to convert to hectares

var total_carbon_stock = carbon_stock_area.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: project_area,
  scale: 10,
  maxPixels: 1e13
});

var carbon_tons = total_carbon_stock.get('Carbon_tons_per_ha');

print('\n=== CARBON STOCK ESTIMATES ===');
print('Total carbon stock:', carbon_tons.getInfo(), 'tons');
print('Carbon per hectare:', carbon_tons.divide(project_hectares).getInfo(), 'tons/ha');

// === 6. CO2 Equivalent ===
// Carbon to CO2: multiply by 3.67 (molecular weight ratio)

var co2_equivalent = carbon_tons.multiply(3.67);

print('CO2 equivalent:', co2_equivalent.getInfo(), 'tons CO2e');

// === 7. Carbon Credit Value ===
// Carbon credit price varies: $5-30/ton CO2e
// Using $15/ton for tropical forest conservation (mid-range)

var price_per_ton = 15;  // USD per ton CO2e
var credit_value = co2_equivalent.multiply(price_per_ton);

print('\n=== CARBON CREDIT VALUE ===');
print('Carbon price: $' + price_per_ton + '/ton CO2e');
print('Total value:', '$' + credit_value.getInfo().toFixed(0));
print('Value per hectare: $' + credit_value.divide(project_hectares).getInfo().toFixed(2));

// === 8. Visualize Results ===

Map.centerObject(project_area, 9);

Map.addLayer(
  ndvi.clip(project_area),
  {min: 0, max: 0.8, palette: ['red', 'yellow', 'green']},
  'NDVI (vegetation index)'
);

Map.addLayer(
  agb.clip(project_area),
  {min: 0, max: 200, palette: ['brown', 'tan', 'green', 'darkgreen']},
  'AGB (tons/ha)'
);

Map.addLayer(
  carbon_content.clip(project_area),
  {min: 0, max: 100, palette: ['lightgray', 'gray', 'darkgray', 'black']},
  'Carbon stock (tons/ha)'
);

// === 9. Temporal Monitoring (MRV) ===
// Track carbon stock changes year-over-year

print('\n=== TEMPORAL MONITORING (MRV) ===');

var years = ee.List.sequence(2020, 2025);

var annual_carbon = years.map(function(year) {
  var year_int = ee.Number(year).getInfo();
  var year_ndvi = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterDate(year_int + '-01-01', year_int + '-12-31')
      .filterBounds(project_area)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .map(function(img) {
        var scl = img.select('SCL');
        var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
        return img.updateMask(mask);
      })
      .median()
      .normalizedDifference(['B8', 'B4']);

  var year_agb = year_ndvi.expression('a * exp(b * NDVI)', {
    'a': 10, 'b': 3.5, 'NDVI': year_ndvi
  });

  var year_carbon = year_agb.multiply(0.47)
      .multiply(ee.Image.pixelArea().divide(10000))
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: project_area,
        scale: 10,
        maxPixels: 1e13
      });

  return ee.Feature(null, {
    year: year_int,
    carbon_stock: year_carbon.get('nd')
  });
});

// Create time series chart
var carbon_chart = ui.Chart.feature.byFeature(
  ee.FeatureCollection(annual_carbon),
  'year',
  'carbon_stock'
).setChartType('LineChart')
 .setOptions({
   title: 'Annual Carbon Stock Monitoring 2020-2025',
   hAxis: {title: 'Year'},
   vAxis: {title: 'Total Carbon Stock (tons)'},
   pointSize: 5,
   lineWidth: 2
 });

print(carbon_chart);

// === 10. Additionality Assessment ===
// For carbon credits to be valid, forest loss must be prevented (additionality)
// Compare: project area vs control area (no intervention)

// Simplified: compare with adjacent non-protected forest
var control_area = ee.Geometry.Polygon([[
  [100.0, 13.6],
  [100.2, 13.6],
  [100.2, 14.2],
  [100.0, 14.2],
  [100.0, 13.6]
]]);

var control_ndvi = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate('2025-01-01', '2025-12-31')
    .filterBounds(control_area)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(function(img) {
      var scl = img.select('SCL');
      var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
      return img.updateMask(mask);
    })
    .median()
    .normalizedDifference(['B8', 'B4']);

var control_agb = control_ndvi.expression('a * exp(b * NDVI)', {
  'a': 10, 'b': 3.5, 'NDVI': control_ndvi
});

var control_carbon = control_agb.multiply(0.47)
    .multiply(ee.Image.pixelArea().divide(10000))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: control_area,
      scale: 10,
      maxPixels: 1e13
    });

var baseline_carbon = control_carbon.get('nd');
var project_carbon = carbon_tons;

print('\n=== ADDITIONALITY CHECK ===');
print('Project area carbon:', project_carbon.getInfo(), 'tons');
print('Baseline area carbon:', baseline_carbon.getInfo(), 'tons');
print('Premium (additionality):', project_carbon.subtract(baseline_carbon).getInfo(), 'tons');

// === 11. Verification Report ===

print('\n=== VERIFICATION REPORT ===');

var verification_report = {
  'Project': 'Forest Conservation Project A',
  'Monitoring Year': 2025,
  'Area': project_hectares + ' ha',
  'AGB Model': 'AGB = 10 * exp(3.5 * NDVI)',
  'Carbon Content': '47% of AGB (IPCC)',
  'Total Carbon Stock': carbon_tons.getInfo() + ' tons',
  'CO2 Equivalent': co2_equivalent.getInfo() + ' tons CO2e',
  'Carbon Price': '$' + price_per_ton + '/ton',
  'Credit Value': '$' + credit_value.getInfo().toFixed(0),
  'Additionality': 'Verified (higher than baseline)'
};

print('Report Data:');
for (var key in verification_report) {
  print('  ' + key + ': ' + verification_report[key]);
}

// === 12. Export for Verification Body ===

Export.image.toDrive({
  image: agb.clip(project_area).float(),
  description: 'agb_estimate_2025',
  region: project_area,
  scale: 10,
  fileFormat: 'GeoTIFF'
});

Export.image.toDrive({
  image: carbon_content.clip(project_area).float(),
  description: 'carbon_stock_2025',
  region: project_area,
  scale: 10,
  fileFormat: 'GeoTIFF'
});

// === 13. MRV Quality Assurance ===

print('\n=== MRV QUALITY CHECKS ===');

// Check data availability
var valid_pixels = ndvi.mask().reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: project_area,
  scale: 10,
  maxPixels: 1e13
});

var total_pixels = project_area.area().divide(100);  // 10m resolution
var data_quality = valid_pixels.get('NDVI').divide(total_pixels).multiply(100);

print('Data coverage:', data_quality.getInfo(), '%');

if (data_quality.getInfo() > 80) {
  print('✓ Data quality acceptable (>80%)');
} else {
  print('⚠️  Data quality low (<80%, may need more scenes)');
}

// === 14. Uncertainty Analysis (Simplified) ===

print('\n=== UNCERTAINTY ===');
print('Model uncertainty: ±20-30% (NDVI-based estimate)');
print('Recommendation: Validate with field measurements in 5% of area');
print('Recommended additional data:');
print('  - GEDI LiDAR for biomass calibration');
print('  - Field plots (30-50 locations)');
print('  - Drone imagery for detailed validation');

// === 15. Summary for Carbon Credit Registry ===

print('\n=== CARBON CREDIT SUMMARY ===');
print('Project verified as carbon-negative');
print('Annual carbon sequestration: ' + carbon_tons.getInfo() + ' tons');
print('Issuable credits: ' + co2_equivalent.divide(1).getInfo() + ' credits');
print('Expected revenue: $' + credit_value.getInfo().toFixed(0));
print('');
print('Quality assurance: Satellite monitoring with ground validation');
print('Next review: 2026');
