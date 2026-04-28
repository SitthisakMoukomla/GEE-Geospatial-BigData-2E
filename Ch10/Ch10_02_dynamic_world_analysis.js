/*
 * Ch10_02_dynamic_world_analysis.js
 * Dynamic World Complete Workflow
 * Foundation Model สำหรับ real-time land cover classification
 *
 * ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
 * วันที่: 2025
 */

/*
 * Dynamic World: Foundation Model จาก Google Research
 * - Automatic classification ทุก Sentinel-2 pass (~5 วัน)
 * - 9 land cover classes
 * - Probability score สำหรับแต่ละ class
 * - ไม่ต้อง train model เอง
 * - Available: GOOGLE/DYNAMICWORLD/V1
 */

print('=== Dynamic World Analysis ===\n');

// === 1. Define Area of Interest ===
var roi = ee.Geometry.Point(100.5, 13.75).buffer(50000);
var year = 2025;

Map.centerObject(roi, 9);

// === 2. Load Dynamic World Data ===
var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate(year + '-01-01', year + '-12-31')
    .filterBounds(roi);

print('Dynamic World loaded');
print('Date range: ' + year + '-01-01 to ' + year + '-12-31');

// === 3. Class Names and Palette ===
var class_names = [
  'water',           // 0
  'trees',           // 1
  'grass',           // 2
  'flooded_veg',     // 3
  'crops',           // 4
  'shrub_scrub',     // 5
  'built',           // 6
  'bare',            // 7
  'snow_ice'         // 8
];

var class_palette = [
  '#419BDF',  // water - light blue
  '#397D49',  // trees - green
  '#88B053',  // grass - light green
  '#7A87C6',  // flooded_veg - purple
  '#E49635',  // crops - orange
  '#DFC35A',  // shrub_scrub - tan
  '#C4281B',  // built - red
  '#A59B8F',  // bare - gray
  '#B39FE1'   // snow_ice - light purple
];

// === 4. Mode Composite (Most Common Class) ===
// Select the class that appears most frequently across all observations

var dw_mode = dw.select('label').mode().clip(roi);

Map.addLayer(
  dw_mode,
  {min: 0, max: 8, palette: class_palette},
  'Dynamic World Mode Composite 2025'
);

// === 5. Probability-Based Classification ===
// Use confidence scores to filter low-confidence pixels

var dw_probability = dw.select(['water', 'trees', 'grass', 'flooded_veg', 'crops',
                                 'shrub_scrub', 'built', 'bare', 'snow_ice']);

// Get max probability per pixel
var max_prob = dw_probability.reduce(ee.Reducer.max()).rename('max_prob');
var confident_mask = max_prob.gte(0.5);  // Only pixels with >= 50% confidence

Map.addLayer(
  confident_mask.clip(roi),
  {palette: ['red', 'green']},
  'High Confidence Pixels (>50%)'
);

// === 6. Temporal Analysis: Change Detection ===
// Compare different time periods in the year

var q1_dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate(year + '-01-01', year + '-03-31')
    .filterBounds(roi)
    .select('label').mode();

var q4_dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate(year + '-10-01', year + '-12-31')
    .filterBounds(roi)
    .select('label').mode();

var changed = q1_dw.neq(q4_dw);  // Pixels where class changed

Map.addLayer(
  changed.selfMask().clip(roi),
  {palette: ['red']},
  'Land Cover Changed Q1→Q4'
);

// === 7. Land Cover Area Statistics ===

// Create binary image for each class
var class_images = ee.ImageCollection(
  ee.List.sequence(0, 8).map(function(class_num) {
    return dw_mode.eq(class_num).byte().rename('class_' + class_num);
  })
);

// Calculate area for each class
var area_image = ee.Image.pixelArea().divide(1e6);  // to sq km

var area_by_class = dw_mode.eq(ee.List.sequence(0, 8))
    .rename(class_names)
    .multiply(area_image);

var area_stats = area_by_class.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e13
});

print('\n=== Land Cover Area (sq km) ===');
for (var i = 0; i < class_names.length; i++) {
  var area_km2 = area_stats.get(class_names[i]).getInfo();
  print(class_names[i] + ':', area_km2.toFixed(2), 'sq km');
}

// === 8. Transition Matrix (What changed to what) ===

print('\n=== Land Cover Change Matrix ===');
print('Q1 2025 → Q4 2025');

// Create transition classes
var transition_classes = [];
for (var i = 0; i < 3; i++) {  // Simplified: only show first 3 classes for brevity
  for (var j = 0; j < 3; j++) {
    var transition = q1_dw.eq(i).and(q4_dw.eq(j));
    var transition_area = transition.multiply(area_image).reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 10,
      maxPixels: 1e13
    });

    var from_class = class_names[i];
    var to_class = class_names[j];
    var area = transition_area.get('constant').getInfo();

    if (area > 0.1) {  // Only print transitions > 0.1 sq km
      print(from_class + ' → ' + to_class + ': ' + area.toFixed(2) + ' sq km');
    }
  }
}

// === 9. Seasonal Progression ===

print('\n=== Seasonal Land Cover Progression ===');

var months = ee.List.sequence(1, 12);

var monthly_area = months.map(function(month) {
  var month_dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
      .filter(ee.Filter.calendarRange(month, month, 'month'))
      .filterDate(year + '-01-01', year + '-12-31')
      .filterBounds(roi)
      .select('label').mode();

  // Count pixels for 'crops' class as example
  var crops_pixels = month_dw.eq(4);
  var crops_area = crops_pixels.multiply(area_image).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 10,
    maxPixels: 1e13
  });

  return ee.Feature(null, {
    month: month,
    crops_area: crops_area.get('constant')
  });
});

// Chart seasonal progression
var seasonal_chart = ui.Chart.feature.byFeature(
  ee.FeatureCollection(monthly_area),
  'month',
  'crops_area'
).setChartType('ColumnChart')
 .setOptions({
   title: 'Monthly Crop Area 2025',
   hAxis: {title: 'Month'},
   vAxis: {title: 'Area (sq km)'},
   legend: {position: 'none'}
 });

print(seasonal_chart);

// === 10. Water Body Mapping (Dynamic World) ===

var water_mask = dw_mode.eq(0);
var water_area = water_mask.multiply(area_image).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e13
});

Map.addLayer(
  water_mask.selfMask().clip(roi),
  {palette: ['blue']},
  'Water Bodies'
);

print('\nTotal water area:', water_area.get('constant').getInfo().toFixed(2), 'sq km');

// === 11. Urban Expansion Monitoring ===

var built_2025 = dw_mode.eq(6).multiply(area_image);
var built_area_2025 = built_2025.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e13
});

Map.addLayer(
  dw_mode.eq(6).selfMask().clip(roi),
  {palette: ['red']},
  'Built-up Areas 2025'
);

print('Built-up area 2025:', built_area_2025.get('constant').getInfo().toFixed(2), 'sq km');

// === 12. Multi-year Comparison (2021 vs 2025) ===

var dw_2021 = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate('2021-01-01', '2021-12-31')
    .filterBounds(roi)
    .select('label').mode();

var built_2021 = dw_2021.eq(6).multiply(area_image);
var built_area_2021 = built_2021.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e13
}).get('constant').getInfo();

var built_growth = built_area_2025.get('constant').getInfo() - built_area_2021;
var growth_rate = built_growth / built_area_2021 * 100;

print('\n=== Urban Expansion 2021-2025 ===');
print('Built-up 2021:', built_area_2021.toFixed(2), 'sq km');
print('Built-up 2025:', built_area_2025.get('constant').getInfo().toFixed(2), 'sq km');
print('Growth:', built_growth.toFixed(2), 'sq km');
print('Growth rate:', growth_rate.toFixed(1), '%');

// === 13. Accuracy Assessment ===
// Compare Dynamic World with high-quality reference data (if available)

print('\n=== Dynamic World Characteristics ===');
print('Accuracy: ~75-80% (varies by region)');
print('Best for: Regional overview, screening');
print('Not ideal for: Precise classification, rare classes');

// === 14. Integration with Other Data ===

// Combine Dynamic World with NDVI
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(year + '-01-01', year + '-12-31')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .median();

var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');

Map.addLayer(
  ndvi.clip(roi),
  {min: 0, max: 0.8, palette: ['red', 'yellow', 'green']},
  'NDVI (for comparison)'
);

// === 15. Export for Analysis ===

Export.image.toDrive({
  image: dw_mode.byte(),
  description: 'dynamic_world_2025',
  region: roi,
  scale: 10,
  fileFormat: 'GeoTIFF'
});

// === 16. Use Cases and Applications ===

print('\n=== Dynamic World Applications ===');
print('✓ Land cover baseline/screening');
print('✓ Change detection (automated)');
print('✓ Urban expansion monitoring');
print('✓ Crop area estimation');
print('✓ Water body tracking');
print('✓ Disaster response (flooding, fire)');
print('✓ No manual training required');

print('\n=== When NOT to use Dynamic World ===');
print('✗ Fine-scale classification (<1 hectare)');
print('✗ Custom classes (e.g., specific crop type)');
print('✗ Very high accuracy requirement (>90%)');
print('✗ Non-optical data (SAR, thermal)');
