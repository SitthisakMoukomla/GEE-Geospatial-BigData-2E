/**
 * ===============================================
 * บทที่ 6: การวิเคราะห์ข้อมูลเชิงพื้นที่
 * ===============================================
 *
 * Ch06_06_esa_worldcover.js
 * หัวข้อ: ESA WorldCover - Land Cover ทั่วโลก 10m จาก Sentinel-1/2
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
// 2. ESA WorldCover Dataset Information
// ============================================
print('=== ESA WorldCover Analysis ===');
print('Dataset: ESA/WorldCover/v200');
print('Resolution: 10 meters');
print('Sensor: Sentinel-1 (SAR) + Sentinel-2 (Optical)');
print('Year: 2021');
print('Coverage: Global');

// ============================================
// 3. Load ESA WorldCover
// ============================================
print('\n=== Load ESA WorldCover ===');

var worldcover = ee.Image('ESA/WorldCover/v200').clip(roi);

print('WorldCover Image:', worldcover);
print('Available bands:', worldcover.bandNames().getInfo());

// ============================================
// 4. ESA WorldCover Classes
// ============================================
print('\n=== ESA WorldCover Classes ===');
print('Value | Class                 | Color');
print('------|----------------------|--------');
print('10    | Tree cover            | 006400');
print('20    | Shrubland             | ffbb22');
print('30    | Grassland             | ffff4c');
print('40    | Cropland              | f096ff');
print('50    | Built-up              | fa0000');
print('60    | Bare / Sparse veg     | b4b4b4');
print('80    | Permanent water       | 0064c8');
print('90    | Herbaceous wetland    | 0096a0');
print('95    | Mangroves             | 00cf75');

// ============================================
// 5. Define Visualization Parameters
// ============================================
print('\n=== Visualization Parameters ===');

var wcVis = {
  min: 10,
  max: 95,
  palette: [
    '006400', // 10 Tree cover
    'ffbb22', // 20 Shrubland
    'ffff4c', // 30 Grassland
    'f096ff', // 40 Cropland
    'fa0000', // 50 Built-up
    'b4b4b4', // 60 Bare / Sparse vegetation
    '0064c8', // 80 Permanent water
    '0096a0', // 90 Herbaceous wetland
    '00cf75'  // 95 Mangroves
  ]
};

Map.addLayer(worldcover, wcVis, 'ESA WorldCover 2021');

// ============================================
// 6. Extract Individual Classes
// ============================================
print('\n=== Extract Individual Classes ===');

// Trees (10)
var trees = worldcover.eq(10);
Map.addLayer(trees.selfMask(), {palette: 'darkgreen'}, 'Trees');

// Shrubland (20)
var shrubland = worldcover.eq(20);
Map.addLayer(shrubland.selfMask(), {palette: 'orange'}, 'Shrubland');

// Grassland (30)
var grassland = worldcover.eq(30);
Map.addLayer(grassland.selfMask(), {palette: 'yellow'}, 'Grassland');

// Cropland (40)
var cropland = worldcover.eq(40);
Map.addLayer(cropland.selfMask(), {palette: 'pink'}, 'Cropland');

// Built-up (50)
var builtup = worldcover.eq(50);
Map.addLayer(builtup.selfMask(), {palette: 'red'}, 'Built-up');

// Bare Ground (60)
var bare = worldcover.eq(60);
Map.addLayer(bare.selfMask(), {palette: 'gray'}, 'Bare/Sparse Vegetation');

// Water (80)
var water = worldcover.eq(80);
Map.addLayer(water.selfMask(), {palette: 'blue'}, 'Permanent Water');

// Wetland (90)
var wetland = worldcover.eq(90);
Map.addLayer(wetland.selfMask(), {palette: 'cyan'}, 'Herbaceous Wetland');

// Mangroves (95)
var mangroves = worldcover.eq(95);
Map.addLayer(mangroves.selfMask(), {palette: 'lightgreen'}, 'Mangroves');

// ============================================
// 7. Group Classes into Broader Categories
// ============================================
print('\n=== Group into Broader Categories ===');

// Forest (10)
var forest = worldcover.eq(10);

// Vegetation (10+20+30+40+95)
var vegetation = worldcover.eq(10)
    .or(worldcover.eq(20))
    .or(worldcover.eq(30))
    .or(worldcover.eq(40))
    .or(worldcover.eq(95));

Map.addLayer(vegetation.selfMask(), {palette: 'green'}, 'All Vegetation');

// Water (80+90)
var allwater = worldcover.eq(80)
    .or(worldcover.eq(90));

Map.addLayer(allwater.selfMask(), {palette: 'blue'}, 'All Water');

// Built-up and Bare (50+60)
var urban = worldcover.eq(50)
    .or(worldcover.eq(60));

Map.addLayer(urban.selfMask(), {palette: 'red'}, 'Urban/Bare');

// ============================================
// 8. Create Simplified Classification
// ============================================
print('\n=== Simplified Classification ===');

// 0 = Water, 1 = Natural Vegetation, 2 = Cropland, 3 = Built/Bare, 4 = Other

var simplified = ee.Image(4)  // Default: Other
    .where(worldcover.eq(80).or(worldcover.eq(90)), 0)  // Water
    .where(worldcover.eq(10).or(worldcover.eq(20))
        .or(worldcover.eq(30)).or(worldcover.eq(95)), 1)  // Natural Vegetation
    .where(worldcover.eq(40), 2)  // Cropland
    .where(worldcover.eq(50).or(worldcover.eq(60)), 3);  // Built/Bare

Map.addLayer(simplified, {
  min: 0,
  max: 4,
  palette: ['blue', 'green', 'yellow', 'red', 'gray']
}, 'Simplified Classification');

// ============================================
// 9. Area Calculation
// ============================================
print('\n=== Area Calculation (in km²) ===');

// สำหรับแต่ละ class คำนวณพื้นที่
var areaCalc = function(value, label) {
  var classImage = worldcover.eq(value);
  var area = classImage
      .multiply(ee.Image.pixelArea())
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: roi,
        scale: 10,
        maxPixels: 1e8
      });
  var areaKm2 = ee.Number(area.get('Map')).divide(1e6);
  print(label + ': ' + areaKm2.getInfo().toFixed(2) + ' km²');
  return areaKm2;
};

var areaTree = areaCalc(10, 'Tree cover');
var areaShrub = areaCalc(20, 'Shrubland');
var areaGrass = areaCalc(30, 'Grassland');
var areaCrop = areaCalc(40, 'Cropland');
var areaBuilt = areaCalc(50, 'Built-up');
var areaBare = areaCalc(60, 'Bare/Sparse');
var areaWater = areaCalc(80, 'Permanent Water');
var areaWetland = areaCalc(90, 'Herbaceous Wetland');
var areaMangrove = areaCalc(95, 'Mangroves');

// ============================================
// 10. Total Area by Grouped Categories
// ============================================
print('\n=== Total Area by Broad Categories ===');

var vegArea = ee.Image(0)
    .where(vegetation, 1)
    .multiply(ee.Image.pixelArea())
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 10,
      maxPixels: 1e8
    });

var vegAreaKm2 = ee.Number(vegArea.get('Map')).divide(1e6);
print('Total Vegetation: ' + vegAreaKm2.getInfo().toFixed(2) + ' km²');

var waterArea = ee.Image(0)
    .where(allwater, 1)
    .multiply(ee.Image.pixelArea())
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 10,
      maxPixels: 1e8
    });

var waterAreaKm2 = ee.Number(waterArea.get('Map')).divide(1e6);
print('Total Water: ' + waterAreaKm2.getInfo().toFixed(2) + ' km²');

// ============================================
// 11. Percentage Distribution
// ============================================
print('\n=== Percentage Distribution ===');

var totalPixels = worldcover.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e8
});

print('Total pixels:', ee.Number(totalPixels.get('Map')).getInfo());

// ============================================
// 12. Comparison with Dynamic World (if desired)
// ============================================
print('\n=== Comparison: ESA WorldCover vs Dynamic World ===');
print('ESA WorldCover:');
print('  - Resolution: 10m');
print('  - Data source: Sentinel-1 (SAR) + Sentinel-2');
print('  - Year: 2021');
print('  - Classes: 9 main classes');
print('  - Use case: Long-term baseline mapping');

print('\nDynamic World:');
print('  - Resolution: 10m');
print('  - Data source: Sentinel-2 (Optical)');
print('  - Frequency: Near real-time (every image)');
print('  - Classes: 9 classes');
print('  - Use case: Change detection, time series');

// ============================================
// 13. Create Change Map (compare with derived data)
// ============================================
print('\n=== Potential Change Detection ===');

// Example: Identify potential deforestation areas
// (where trees are expected but not found)
// This would require comparing with previous year data

var deforestation_potential = forest.not();
Map.addLayer(deforestation_potential.selfMask(),
    {palette: 'orange'}, 'Non-Forest Area (potential deforestation)');

// ============================================
// 14. Create Suitability Maps
// ============================================
print('\n=== Suitability Maps (Examples) ===');

// Agricultural suitability: Cropland + Grassland
var agriSuitable = worldcover.eq(40)
    .or(worldcover.eq(30));
Map.addLayer(agriSuitable.selfMask(), {palette: 'yellow'}, 'Agricultural Land');

// Conservation priority: Natural vegetation
var conservationPriority = worldcover.eq(10)
    .or(worldcover.eq(20))
    .or(worldcover.eq(90))
    .or(worldcover.eq(95));
Map.addLayer(conservationPriority.selfMask(),
    {palette: 'darkgreen'}, 'Conservation Priority');

// Urban expansion areas: Adjacent to built-up
var urbanBuffer = builtup.focal_max(100, 'circle', 'meters');
Map.addLayer(urbanBuffer.selfMask(), {palette: 'darkred'}, 'Urban Buffer Zone');

// ============================================
// 15. Export Options
// ============================================
print('\n=== Export Options ===');
print('// Uncomment to export:');
print('// Export.image.toDrive({');
print('//   image: worldcover,');
print('//   description: "ESA_WorldCover_2021",');
print('//   region: roi,');
print('//   scale: 10');
print('// });');

// ============================================
// 16. Additional Resources
// ============================================
print('\n=== Additional Resources ===');
print('ESA WorldCover v200: https://esa-worldcover.org/');
print('Product Handbook: See ESA documentation');
print('Validation accuracy: ~75% globally');
print('Best use: Baseline land cover mapping');

// ============================================
// 17. Center Map and Finish
// ============================================
Map.centerObject(roi, 11);
print('\n=== สำเร็จ ===');
