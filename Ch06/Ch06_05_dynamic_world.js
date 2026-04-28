/**
 * ===============================================
 * บทที่ 6: การวิเคราะห์ข้อมูลเชิงพื้นที่
 * ===============================================
 *
 * Ch06_05_dynamic_world.js
 * หัวข้อ: Dynamic World - Land Cover แบบ Near Real-time และ Change Detection
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
// 2. Dynamic World Dataset Information
// ============================================
print('=== Dynamic World Analysis ===');
print('Dataset: GOOGLE/DYNAMICWORLD/V1');
print('Resolution: 10 meters');
print('Frequency: Every Sentinel-2 image (2-5 days)');
print('Data from: June 2015 - Present');
print('Classes: 9');

// ============================================
// 3. Load Dynamic World
// ============================================
print('\n=== Load Dynamic World ===');

var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi);

print('Dynamic World images in period:', dw.size());

// ============================================
// 4. Dynamic World 9 Classes
// ============================================
print('\n=== Dynamic World Classes ===');
print('Class | Label             | Color');
print('------|------------------|--------');
print('0     | Water             | #419BDF');
print('1     | Trees             | #397D49');
print('2     | Grass             | #88B053');
print('3     | Flooded Vegetation| #7A87C6');
print('4     | Crops             | #E49635');
print('5     | Shrub & Scrub     | #DFC35A');
print('6     | Built Area        | #C4281B');
print('7     | Bare Ground       | #A59B8F');
print('8     | Snow & Ice        | #B39FE1');

// ============================================
// 5. Create Mode Composite (Most common class)
// ============================================
print('\n=== Create Mode Composite ===');

var dwComposite = dw.select('label').mode().clip(roi);

// Define visualization parameters
var dwVis = {
  min: 0,
  max: 8,
  palette: [
    '#419BDF', // 0 Water
    '#397D49', // 1 Trees
    '#88B053', // 2 Grass
    '#7A87C6', // 3 Flooded Vegetation
    '#E49635', // 4 Crops
    '#DFC35A', // 5 Shrub & Scrub
    '#C4281B', // 6 Built Area
    '#A59B8F', // 7 Bare Ground
    '#B39FE1'  // 8 Snow & Ice
  ]
};

Map.addLayer(dwComposite, dwVis, 'Dynamic World Mode Composite');

// ============================================
// 6. Probability Bands (Confidence)
// ============================================
print('\n=== Dynamic World Probability Bands ===');

// Dynamic World มี probability bands สำหรับแต่ละ class
// เช่น label_prob, water, trees, grass, etc.

var dwProb = dw.select('.*_prob').mean().clip(roi);

print('Available probability bands:');
print('  - water_prob');
print('  - trees_prob');
print('  - grass_prob');
print('  - flooded_vegetation_prob');
print('  - crops_prob');
print('  - shrub_prob');
print('  - built_prob');
print('  - bare_prob');
print('  - snow_ice_prob');

// ============================================
// 7. Single Class Extraction
// ============================================
print('\n=== Extract Single Class ===');

// Extract only "Built Area" (class 6)
var builtArea = dwComposite.eq(6).rename('built');
Map.addLayer(builtArea.selfMask(), {palette: 'red'}, 'Built Area Only');

// Extract only "Trees" (class 1)
var trees = dwComposite.eq(1).rename('trees');
Map.addLayer(trees.selfMask(), {palette: 'darkgreen'}, 'Trees Only');

// Extract only "Water" (class 0)
var water = dwComposite.eq(0).rename('water');
Map.addLayer(water.selfMask(), {palette: 'blue'}, 'Water Only');

// ============================================
// 8. Multi-class Extraction
// ============================================
print('\n=== Multi-class Extraction ===');

// Vegetation: Trees + Grass + Crops
var vegetation = dwComposite.eq(1)
    .or(dwComposite.eq(2))
    .or(dwComposite.eq(4))
    .rename('vegetation');
Map.addLayer(vegetation.selfMask(), {palette: 'green'}, 'All Vegetation');

// Urban: Built Area + Bare Ground
var urban = dwComposite.eq(6)
    .or(dwComposite.eq(7))
    .rename('urban');
Map.addLayer(urban.selfMask(), {palette: 'orange'}, 'Urban Area');

// ============================================
// 9. Change Detection: 2020 vs 2025
// ============================================
print('\n=== Change Detection ===');

// Load 2020 data
var dw2020 = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate('2020-01-01', '2020-12-31')
    .filterBounds(roi)
    .select('label')
    .mode();

// Load 2025 data
var dw2025 = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .select('label')
    .mode();

print('2020 composite:', dw2020);
print('2025 composite:', dw2025);

// ============================================
// 10. New Built Area: Changes to class 6
// ============================================
print('\n=== Change: Any → Built Area ===');

// ปิกเซลที่ 2020 ไม่ใช่ Built แต่ 2025 เป็น Built
var newBuilt = dw2020.neq(6).and(dw2025.eq(6)).rename('new_built');
Map.addLayer(newBuilt.selfMask(), {palette: 'red'}, 'New Built Area (2020→2025)');

// ============================================
// 11. Forest Loss: Changes from Trees
// ============================================
print('\n=== Change: Trees → Other ===');

// ปิกเซลที่ 2020 เป็น Trees แต่ 2025 เปลี่ยนไป
var forestLoss = dw2020.eq(1).and(dw2025.neq(1)).rename('forest_loss');
Map.addLayer(forestLoss.selfMask(), {palette: 'orange'}, 'Forest Loss (2020→2025)');

// ============================================
// 12. Vegetation Gain: Changes to vegetation
// ============================================
print('\n=== Change: Any → Vegetation ===');

var vegGain = dw2020.neq(1).and(dw2025.eq(1))
    .or(dw2020.neq(2).and(dw2025.eq(2)))
    .or(dw2020.neq(4).and(dw2025.eq(4)))
    .rename('veg_gain');
Map.addLayer(vegGain.selfMask(), {palette: 'green'}, 'Vegetation Gain (2020→2025)');

// ============================================
// 13. Water Extent Changes
// ============================================
print('\n=== Water Extent Changes ===');

var waterLoss = dw2020.eq(0).and(dw2025.neq(0)).rename('water_loss');
var waterGain = dw2020.neq(0).and(dw2025.eq(0)).rename('water_gain');

Map.addLayer(waterLoss.selfMask(), {palette: 'orange'}, 'Water Loss (2020→2025)');
Map.addLayer(waterGain.selfMask(), {palette: 'blue'}, 'Water Gain (2020→2025)');

// ============================================
// 14. Change Matrix (Transition Matrix)
// ============================================
print('\n=== Transition Matrix (2020 → 2025) ===');

// Create transition image: 2020 class * 10 + 2025 class
var transition = dw2020.multiply(10).add(dw2025).rename('transition');

// Count pixels for each transition
var transitionCounts = transition.reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e8
});

print('Transition counts:', transitionCounts.get('transition'));

// ============================================
// 15. Class Area Statistics
// ============================================
print('\n=== Class Area Statistics (2025) ===');

var classAreas = dwComposite.multiply(30).multiply(30)  // Convert pixels to m²
    .divideDecimal(1e6)  // Convert to km²
    .reduceRegion({
      reducer: ee.Reducer.frequencyHistogram(),
      geometry: roi,
      scale: 10,
      maxPixels: 1e8
    });

print('Class histogram (2025):', classAreas.get('label'));

// ============================================
// 16. Time Series Analysis
// ============================================
print('\n=== Time Series: Built Area Over Time ===');

// Calculate built area for each month
var months = ee.List.sequence(1, 6);

var timeSeriesBuilt = months.map(function(month) {
  var month_num = ee.Number(month);
  var start = ee.Date('2025-01-01').advance(month_num.subtract(1), 'month');
  var end = start.advance(1, 'month');

  var built_pixels = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
      .filterDate(start, end)
      .filterBounds(roi)
      .select('label')
      .eq(6)  // Built area class
      .max()  // Any pixel with built in this month
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: roi,
        scale: 10
      });

  return ee.Feature(null, {
    'month': month,
    'built_pixels': built_pixels.get('label')
  });
});

var timeSeriesFeatures = ee.FeatureCollection(timeSeriesBuilt);
print('Time Series (Built Area pixels by month):', timeSeriesFeatures.size());

// ============================================
// 17. Confidence Analysis
// ============================================
print('\n=== Confidence Analysis ===');

// Get the label probability for the mode class
var labelProb = dw.select('label_prob').mode().clip(roi);

Map.addLayer(labelProb, {
  min: 0,
  max: 1,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'darkgreen']
}, 'Classification Confidence');

// ============================================
// 18. Create Simplified Classification
// ============================================
print('\n=== Simplified Classification ===');

// Group into 4 main categories:
// 0 = Water, 1 = Vegetation, 2 = Built, 3 = Bare/Other

var simplified = ee.Image(3)  // Default: Bare/Other
    .where(dwComposite.eq(0), 0)  // Water
    .where(dwComposite.eq(1).or(dwComposite.eq(2))
        .or(dwComposite.eq(3)).or(dwComposite.eq(4)), 1)  // Vegetation
    .where(dwComposite.eq(6), 2)  // Built
    .rename('simplified');

Map.addLayer(simplified, {
  min: 0,
  max: 3,
  palette: ['blue', 'green', 'red', 'brown']
}, 'Simplified Classification');

// ============================================
// 19. Export Options
// ============================================
print('\n=== Export Options ===');
print('// Uncomment to export:');
print('// Export.image.toDrive({');
print('//   image: dwComposite,');
print('//   description: "DynamicWorld_2025",');
print('//   region: roi,');
print('//   scale: 10');
print('// });');

// ============================================
// 20. Center Map and Finish
// ============================================
Map.centerObject(roi, 11);
print('\n=== สำเร็จ ===');
