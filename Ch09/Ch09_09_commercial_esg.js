/*
 * Ch09_09_commercial_esg.js
 * Commercial Application: ESG Deforestation Monitoring
 * ติดตาม Deforestation สำหรับ ESG (Environmental, Social, Governance) Reporting
 *
 * ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
 * วันที่: 2025
 */

/*
 * Use Case: Corporate ESG Reporting
 * - Monitor forest loss in supply chain areas
 * - Demonstrate environmental compliance
 * - Meet investor/customer ESG requirements
 * - Track SDG 15 (Life on Land)
 */

// === 1. Define Concession/Supply Chain Area ===
// ในการใช้งานจริง บริษัทส่ง boundary ของพื้นที่ concession/supply chain

var concession_area = ee.Geometry.Polygon([[
  [100.0, 13.5],
  [101.0, 13.5],
  [101.0, 14.5],
  [100.0, 14.5],
  [100.0, 13.5]
]]);

var year_start = 2019;
var year_end = 2023;

print('=== ESG DEFORESTATION MONITORING ===');
print('Area of interest: concession area');
print('Analysis period:', year_start, '-', year_end);

// === 2. Load Hansen Global Forest Change Data ===
// University of Maryland (UMD) Global Forest Change (GFC)
// Resolution: 30m
// Data: 2000 baseline + annual loss/gain

var gfc = ee.Image('UMD/hansen/global_forest_change_2023_v1_11');

// Extract relevant layers
var treeCover2000 = gfc.select('treecover2000');      // Baseline forest 2000
var lossYear = gfc.select('lossyear');                // Year of loss (0=no loss, 1=2001, ..., 23=2023)
var gain = gfc.select('gain');                        // Forest gain (binary)
var dataMask = gfc.select('datamask');                // Data availability

print('Hansen GFC layers loaded');

// === 3. Identify Recent Forest Loss (2019-2023) ===
// lossyear: 19=2019, 20=2020, 21=2021, 22=2022, 23=2023

var recent_loss = lossYear.gte(year_start - 2000)
                           .and(lossYear.lte(year_end - 2000))
                           .rename('RecentLoss');

// === 4. Calculate Forest Loss Area ===

// คำนวณพื้นที่สูญเสีย (sq km)
var loss_area_pixels = recent_loss.multiply(ee.Image.pixelArea()).divide(1e6);  // sq km

var total_loss = loss_area_pixels.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: concession_area,
  scale: 30,
  maxPixels: 1e13
});

var loss_sq_km = total_loss.get('RecentLoss');

print('Total forest loss 2019-2023 (sq km):', loss_sq_km.getInfo());

// === 5. Baseline Forest Cover (2000) ===
// สร้าง threshold สำหรับ forest (เช่น >= 50% tree cover)

var forest_threshold = 50;  // percent
var forest_2000 = treeCover2000.gte(forest_threshold).rename('Forest2000');

// คำนวณ forest area baseline
var baseline_forest_area = forest_2000
    .multiply(ee.Image.pixelArea())
    .divide(1e6)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: concession_area,
      scale: 30,
      maxPixels: 1e13
    });

print('Baseline forest area 2000 (sq km):', baseline_forest_area.get('Forest2000').getInfo());

// === 6. Forest Loss Percentage ===
// Percent of baseline forest that was lost

var forest_loss_pct = loss_sq_km.divide(baseline_forest_area.get('Forest2000')).multiply(100);

print('Forest loss percentage: ', forest_loss_pct.getInfo(), '%');

// === 7. Annual Loss Breakdown ===
// Deforestation by year

print('\nAnnual forest loss 2019-2023 (sq km):');

var years = ee.List.sequence(year_start - 2000, year_end - 2000);

var annual_loss = years.map(function(year_code) {
  var year = ee.Number(year_code).add(2000).getInfo();
  var annual = lossYear.eq(year_code).multiply(ee.Image.pixelArea()).divide(1e6);
  var area = annual.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: concession_area,
    scale: 30,
    maxPixels: 1e13
  });
  print('  ' + year + ':', area.get('lossyear').getInfo(), 'sq km');
});

// === 8. Visualize Loss and Gain ===

Map.centerObject(concession_area, 8);

// Forest baseline
Map.addLayer(
  forest_2000.clip(concession_area),
  {palette: ['white', 'darkgreen']},
  'Forest Baseline 2000 (50% tree cover)'
);

// Recent loss
Map.addLayer(
  recent_loss.clip(concession_area),
  {palette: ['red']},
  'Forest Loss 2019-2023'
);

// Forest gain
Map.addLayer(
  gain.clip(concession_area),
  {palette: ['blue']},
  'Forest Gain (any period)'
);

// === 9. Transition Analysis ===
// เปลี่ยนแปลง: forest → non-forest

var forest_loss_pixels = forest_2000.eq(1).and(recent_loss.eq(1));
var forest_gain_pixels = forest_2000.eq(0).and(gain.eq(1));

// Loss to what? (need NDVI or LC classification)
// Simplified: assume loss to agriculture/urban

print('\n=== FOREST TRANSITION ===');

var transition_loss = forest_loss_pixels.multiply(ee.Image.pixelArea()).divide(1e6);
var transition_gain = forest_gain_pixels.multiply(ee.Image.pixelArea()).divide(1e6);

var net_change = transition_gain.subtract(transition_loss).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: concession_area,
  scale: 30,
  maxPixels: 1e13
});

print('Net forest change (sq km):', net_change.get('difference').getInfo());

// === 10. ESG Indicators Calculation ===

print('\n=== ESG INDICATORS ===');

// SDG 15.1.1: Forest area as proportion of total land area
var total_area = concession_area.area().divide(1e6);  // sq km
var forest_proportion = baseline_forest_area.get('Forest2000').divide(total_area).multiply(100);

print('Forest area (% of total land):', forest_proportion.getInfo(), '%');

// Deforestation rate (% per year)
var years_elapsed = year_end - year_start;
var annual_rate = forest_loss_pct.divide(years_elapsed);

print('Average annual deforestation rate:', annual_rate.getInfo(), '%/year');

// Forest loss intensity (sq km/year)
var annual_loss_intensity = loss_sq_km.divide(years_elapsed);

print('Average annual loss intensity:', annual_loss_intensity.getInfo(), 'sq km/year');

// === 11. Carbon Implications (Simplified) ===
// Forest biomass ≈ 150-200 tons/hectare in tropical forest
// 1 sq km = 100 hectares
// Carbon content ≈ biomass * 0.47 (IPCC)

var biomass_per_hectare = 180;  // tons/ha (tropical estimate)
var forest_loss_hectares = loss_sq_km.multiply(100);
var total_biomass_lost = forest_loss_hectares.multiply(biomass_per_hectare);
var carbon_lost = total_biomass_lost.multiply(0.47);

print('\n=== CARBON IMPACT ===');
print('Biomass lost:', total_biomass_lost.getInfo(), 'tons');
print('Carbon loss (CO2 equivalent):', carbon_lost.multiply(3.67).getInfo(), 'tons');

// === 12. Export Results for ESG Report ===

// Export loss map
Export.image.toDrive({
  image: recent_loss.clip(concession_area).uint8(),
  description: 'forest_loss_2019_2023',
  region: concession_area,
  scale: 30,
  fileFormat: 'GeoTIFF'
});

// Export forest baseline
Export.image.toDrive({
  image: forest_2000.clip(concession_area).uint8(),
  description: 'forest_baseline_2000',
  region: concession_area,
  scale: 30,
  fileFormat: 'GeoTIFF'
});

// === 13. Comparison with Previous Year (Year-on-Year) ===

print('\n=== YEAR-ON-YEAR COMPARISON ===');

// 2022 loss
var loss_2022 = lossYear.eq(22).multiply(ee.Image.pixelArea()).divide(1e6);
var area_2022 = loss_2022.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: concession_area,
  scale: 30,
  maxPixels: 1e13
}).get('lossyear').getInfo();

// 2023 loss (latest)
var loss_2023 = lossYear.eq(23).multiply(ee.Image.pixelArea()).divide(1e6);
var area_2023 = loss_2023.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: concession_area,
  scale: 30,
  maxPixels: 1e13
}).get('lossyear').getInfo();

var yoy_change = area_2023 - area_2022;

print('Forest loss 2022:', area_2022, 'sq km');
print('Forest loss 2023:', area_2023, 'sq km');
print('Year-on-year change:', yoy_change, 'sq km');
print('Trend:', (yoy_change > 0 ? 'INCREASING (worse)' : 'DECREASING (better)'));

// === 14. ESG Report Summary ===

print('\n=== ESG REPORT SUMMARY ===');
print('Company: [Name]');
print('Reporting Period:', year_start + '-' + year_end);
print('');
print('ENVIRONMENTAL:');
print('  ✓ Forest loss monitored via satellite');
print('  ✓ 2019-2023: ' + loss_sq_km.getInfo() + ' sq km lost');
print('  ✓ Rate: ' + annual_loss_intensity.getInfo() + ' sq km/year');
print('  ✓ Carbon impact: ' + carbon_lost.getInfo() + ' tons CO2e');
print('');
print('GOVERNANCE:');
print('  ✓ ESG monitoring in place');
print('  ✓ Real-time satellite monitoring');
print('  ✓ Transparent reporting');
print('');
print('ACTIONS:');
print('  □ Reduce deforestation to zero by [year]');
print('  □ Implement forest protection measures');
print('  □ Restore degraded areas');
print('  □ Engage with local communities');
print('');
print('ALIGNMENT:');
print('  ✓ SDG 15 (Life on Land)');
print('  ✓ Net-zero commitments');
print('  ✓ Corporate sustainability goals');

// === 15. Risk Assessment ===

print('\n=== RISK ASSESSMENT ===');

var loss_percentage = forest_loss_pct.getInfo();

if (loss_percentage > 5) {
  print('⚠️  HIGH RISK: Loss > 5%');
  print('   Action: Escalate to board, stakeholders');
} else if (loss_percentage > 2) {
  print('⚠️  MEDIUM RISK: Loss 2-5%');
  print('   Action: Investigate causes, develop mitigation');
} else {
  print('✓ LOW RISK: Loss < 2%');
  print('   Action: Continue monitoring');
}
