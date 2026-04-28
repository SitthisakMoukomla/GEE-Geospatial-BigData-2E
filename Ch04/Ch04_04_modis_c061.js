/*
 * =========================================
 * บทที่ 4: MODIS Collection 061 NDVI
 * =========================================
 * ไฟล์: Ch04_04_modis_c061.js
 *
 * คำอธิบาย: ใช้ MODIS Collection 6.1 (C061)
 *          - Daily global coverage
 *          - Scale Factor: 0.0001
 *          - Time Series Analysis
 *          - NDVI Trend Over Time
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. กำหนด ROI ========

var roi = ee.Geometry.Point(100.5, 13.75);  // กรุงเทพมหานคร

var roiBuffer = roi.buffer(100000);  // 100 km buffer

print('ROI:', roi);
print('Analysis Area:', roiBuffer);


// ======== 2. ทำความเข้าใจ MODIS ========

print('\n=== MODIS Overview ===');
print('MODIS = Moderate Resolution Imaging Spectroradiometer');
print('Spacecraft: Terra (morning) + Aqua (afternoon)');
print('Spatial Resolution: 250m-1km');
print('Temporal Resolution: Daily (global coverage every 1-2 days)');
print('Data Type: Vegetation Indices (NDVI, EVI, etc.)');
print('Collection 6.1 (061) - Latest version');
print('ข้อดี: Daily coverage, long time series (2000-present)');
print('ข้อจำกัด: ความละเอียด 250m-1km (ต่ำกว่า Landsat)');


// ======== 3. Load MODIS Collection 061 ========

// MOD13Q1 = Terra Vegetation Indices 16-Day 250m
// MYD13Q1 = Aqua Vegetation Indices 16-Day 250m
// MCD43A4 = Nadir BRDF-Adjusted Reflectance (Daily)

// เลือก MOD13Q1 (Terra, 16-day)
var modisNDVI = ee.ImageCollection('MODIS/061/MOD13Q1');

print('\n=== MODIS Collection 061 MOD13Q1 ===');
print('Collection ID: MODIS/061/MOD13Q1');
print('Source: Terra satellite');
print('Temporal Resolution: 16-day composite');
print('Spatial Resolution: 250m');
print('Bands: NDVI, EVI, BLUE, RED, NIR, MIR, VI_Quality');

// Check first image
var firstMODIS = modisNDVI.first();
print('\nFirst Image:', firstMODIS.id());
print('Bands:', firstMODIS.bandNames());


// ======== 4. Filter MODIS Data ========

var startDate = '2024-01-01';
var endDate = '2025-03-31';

var modisMasked = modisNDVI
    .filterDate(startDate, endDate)
    .filterBounds(roiBuffer);

print('\nFiltered images:', modisMasked.size().getInfo());

// Check first filtered image
var firstFiltered = modisMasked.first();
print('First filtered image:', firstFiltered.id());
print('Properties:', firstFiltered.propertyNames());


// ======== 5. Scale Factor Application ========

// MODIS NDVI มี Scale Factor = 0.0001
// DN (Digital Number) * 0.0001 = Actual NDVI

function applyMODISScaleFactors(image) {
  // NDVI
  var ndvi = image.select('NDVI').multiply(0.0001);

  // EVI (Enhanced Vegetation Index)
  var evi = image.select('EVI').multiply(0.0001);

  // Red, NIR, Blue (Reflectance) - also 0.0001
  var red = image.select('red').multiply(0.0001);
  var nir = image.select('NIR').multiply(0.0001);
  var blue = image.select('blue').multiply(0.0001);

  return image.addBands([ndvi, evi, red, nir, blue], null, true);
}

print('\n=== Applying Scale Factor ===');
var modisScaled = modisMasked.map(applyMODISScaleFactors);

var firstScaled = modisScaled.first();
print('Scaled image:', firstScaled.id());

// Check values after scaling
var scaledSample = firstScaled.select('NDVI').sample(roi, 250).first();
print('NDVI value after scaling:', scaledSample.get('NDVI'));
print('(Should be between 0-1, typically 0.2-0.8 for vegetation)');


// ======== 6. Create Composite (Median) ========

print('\n=== Creating Composites ===');

// Q1 2025 (Jan-Mar)
var q1NDVI = modisScaled
    .filterDate('2025-01-01', '2025-04-01')
    .select('NDVI')
    .median();

// Q4 2024 (Oct-Dec)
var q4_2024_NDVI = modisScaled
    .filterDate('2024-10-01', '2025-01-01')
    .select('NDVI')
    .median();

// Full year 2024
var year2024NDVI = modisScaled
    .filterDate('2024-01-01', '2025-01-01')
    .select('NDVI')
    .median();

print('Q1 2025 Composite:', q1NDVI);
print('Q4 2024 Composite:', q4_2024_NDVI);
print('Year 2024 Composite:', year2024NDVI);


// ======== 7. Visualization Parameters ========

var visNDVI = {
  min: 0,
  max: 1,
  palette: [
    'blue',        // 0.0 - Water
    'white',       // 0.1 - Snow/Cloud
    'brown',       // 0.2 - Bare soil
    'tan',         // 0.3 - Grassland
    'lightgreen',  // 0.4 - Light vegetation
    'green',       // 0.6 - Dense vegetation
    'darkgreen'    // 1.0 - Very dense forest
  ]
};

// Add layers to map
Map.addLayer(q1NDVI.clip(roiBuffer), visNDVI, 'MODIS NDVI Q1 2025 (250m)');
Map.addLayer(q4_2024_NDVI.clip(roiBuffer), visNDVI, 'MODIS NDVI Q4 2024', false);
Map.addLayer(year2024NDVI.clip(roiBuffer), visNDVI, 'MODIS NDVI Year 2024', false);


// ======== 8. Calculate Statistics ========

print('\n=== NDVI Statistics ===');

// Q1 2025
var q1Stats = q1NDVI.reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.minMax(), null, true),
  geometry: roiBuffer,
  scale: 250,
  maxPixels: 1e9
});

print('\nQ1 2025:');
print('  Mean NDVI:', ee.Number(q1Stats.get('NDVI_mean')).getInfo());
print('  Min NDVI:', ee.Number(q1Stats.get('NDVI_min')).getInfo());
print('  Max NDVI:', ee.Number(q1Stats.get('NDVI_max')).getInfo());

// Q4 2024
var q4Stats = q4_2024_NDVI.reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.minMax(), null, true),
  geometry: roiBuffer,
  scale: 250,
  maxPixels: 1e9
});

print('\nQ4 2024:');
print('  Mean NDVI:', ee.Number(q4Stats.get('NDVI_mean')).getInfo());

// Year 2024
var yearStats = year2024NDVI.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roiBuffer,
  scale: 250,
  maxPixels: 1e9
});

print('\nYear 2024:');
print('  Mean NDVI:', ee.Number(yearStats.get('NDVI_mean')).getInfo());


// ======== 9. Time Series Analysis ========

print('\n=== Time Series Analysis ===');

// Extract monthly NDVI values
var monthlyNDVI = [];

for (var month = 1; month <= 12; month++) {
  var monthStart = ee.Date('2024-' + String(month).padStart(2, '0') + '-01');
  var monthEnd = monthStart.advance(1, 'month');

  var monthlyComposite = modisScaled
      .filterDate(monthStart, monthEnd)
      .select('NDVI')
      .mean();

  var monthlyValue = monthlyComposite.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roiBuffer,
    scale: 250,
    maxPixels: 1e9
  });

  monthlyNDVI.push({
    month: month,
    ndvi: ee.Number(monthlyValue.get('NDVI')).getInfo()
  });
}

print('\nMonthly NDVI 2024:');
for (var i = 0; i < monthlyNDVI.length; i++) {
  var monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i];
  print(monthName + ': ' + monthlyNDVI[i].ndvi.toFixed(3));
}


// ======== 10. Trend Analysis ========

print('\n=== Trend Analysis ===');

// NDVI Anomaly: Difference from long-term mean
var longTermMeanNDVI = modisScaled
    .filterDate('2020-01-01', '2024-12-31')
    .select('NDVI')
    .mean();

var ndviAnomaly = q1NDVI.subtract(longTermMeanNDVI);

var anomalyVis = {
  min: -0.2,
  max: 0.2,
  palette: ['ff0000', 'ffffff', '00ff00']  // Red=low, Green=high
};

Map.addLayer(ndviAnomaly.clip(roiBuffer), anomalyVis, 'NDVI Anomaly (Q1 vs 2020-2024)', false);

print('NDVI Anomaly (Q1 2025 vs historical mean):');
var anomalyStats = ndviAnomaly.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roiBuffer,
  scale: 250,
  maxPixels: 1e9
});
print('  Anomaly:', ee.Number(anomalyStats.get('NDVI')).getInfo());


// ======== 11. EVI Comparison ========

// EVI (Enhanced Vegetation Index) ไวต่อ Vegetation มากกว่า NDVI
// Better for high vegetation areas (less saturation)

var eviComparison = modisScaled
    .filterDate('2025-01-01', '2025-04-01')
    .select('EVI')
    .median();

var visEVI = {
  min: 0,
  max: 1,
  palette: ['blue', 'white', 'brown', 'tan', 'lightgreen', 'green']
};

Map.addLayer(eviComparison.clip(roiBuffer), visEVI, 'MODIS EVI Q1 2025 (250m)', false);

print('\n=== NDVI vs EVI ===');
print('NDVI: Normalized Difference Vegetation Index');
print('  - Sensitive to atmospheric effects');
print('  - Saturates in high vegetation areas');
print('  - More stable temporally');
print('');
print('EVI: Enhanced Vegetation Index');
print('  - Better for dense vegetation');
print('  - Corrects for atmospheric effects');
print('  - Avoids saturation');


// ======== 12. Quality Assessment ========

print('\n=== Quality Information ===');

// VI_Quality flag indicates data reliability
var qualityImage = modisMasked.first().select('VI_Quality');

print('VI_Quality Band:');
print('  - Values: 0-3 (0=best, 3=lower quality)');
print('  - Check for cloudy or low-quality pixels');

var qualityMask = qualityImage.lte(1);  // Keep only best/good quality

var modisQualityFiltered = modisMasked
    .map(function(img) {
      var quality = img.select('VI_Quality');
      return img.updateMask(quality.lte(1));
    })
    .map(applyMODISScaleFactors);

var q1QualityFiltered = modisQualityFiltered
    .filterDate('2025-01-01', '2025-04-01')
    .select('NDVI')
    .median();

Map.addLayer(q1QualityFiltered.clip(roiBuffer), visNDVI, 'MODIS NDVI Q1 (Quality Filtered)', false);


// ======== 13. Spatial Analysis ========

print('\n=== Spatial Analysis ===');

// Identify low vegetation areas
var lowVegMask = q1NDVI.lt(0.3);  // NDVI < 0.3 = low vegetation

var lowVegVis = {
  min: 0,
  max: 1,
  palette: ['transparent', 'red']
};

Map.addLayer(lowVegMask.clip(roiBuffer), lowVegVis, 'Low Vegetation Areas', false);

// Count low vegetation pixels
var lowVegCount = lowVegMask.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roiBuffer,
  scale: 250,
  maxPixels: 1e9
});

print('Low vegetation pixels (NDVI < 0.3):', ee.Number(lowVegCount.get('NDVI')).getInfo());

// Calculate percentage
var totalPixels = ee.Image(1).reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: roiBuffer,
  scale: 250,
  maxPixels: 1e9
});

var lowVegPercentage = ee.Number(lowVegCount.get('NDVI'))
    .divide(ee.Number(totalPixels.get('constant')))
    .multiply(100);

print('Low vegetation percentage:', lowVegPercentage.getInfo().toFixed(2) + '%');


// ======== 14. Compare with Other Sensors ========

print('\n=== Comparison: MODIS vs Landsat ===');
print('MODIS:');
print('  - Resolution: 250m-1km');
print('  - Temporal: Daily, 16-day composite');
print('  - Archive: 2000-present (25 years)');
print('  - Use: Regional/global monitoring, trend analysis');
print('');
print('Landsat:');
print('  - Resolution: 30m');
print('  - Temporal: 8-16 days');
print('  - Archive: 1984-present (40 years)');
print('  - Use: Local/regional detail, land cover mapping');


// ======== 15. Center Map ========

Map.centerObject(roiBuffer, 10);


// ======== Export Option ========

/*
Export.image.toDrive({
  image: q1NDVI.select('NDVI'),
  description: 'MODIS_NDVI_Bangkok_Q1_2025',
  scale: 250,
  region: roiBuffer,
  maxPixels: 1e9
});
*/


// ======== สรุป ========

print('\n=== สรุปบทนี้ ===');
print('✓ โหลด MODIS Collection 061 (MOD13Q1)');
print('✓ Apply Scale Factor (0.0001)');
print('✓ Create Composite (16-day periods)');
print('✓ Time Series Analysis (Monthly NDVI)');
print('✓ Trend Analysis (Anomaly from mean)');
print('✓ EVI Comparison (Enhanced Index)');
print('✓ Quality Assessment (VI_Quality)');
print('✓ Spatial Analysis (Low vegetation areas)');
print('✓ Compare with Landsat 8/9');
print('\nข้อดี MODIS: Daily coverage, long archive, global');
print('ข้อจำกัด: ความละเอียด 250m-1km');
print('\nลำดับถัดไป: Ch04_05 - Sentinel-2 SR Harmonized');
