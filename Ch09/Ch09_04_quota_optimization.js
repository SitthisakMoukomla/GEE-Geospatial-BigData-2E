/*
 * Ch09_04_quota_optimization.js
 * Quota Optimization Techniques
 * เทคนิคการประหยัด EECU-hours เพื่อเตรียมตัวสำหรับ Quota Tiers (27 เมษายน 2026)
 *
 * ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
 * วันที่: 2025
 */

print('=== GEE Quota Optimization Techniques ===');

var roi = ee.Geometry.Point(100.5, 13.75).buffer(50000);
var year = 2025;

// ============================================
// เทคนิค 1: ลดพื้นที่การคำนวณ (filterBounds ก่อน)
// ============================================
print('');
print('--- TECHNIQUE 1: Reduce computation area ---');

// ❌ แย่ — คำนวณทั้งโลก แล้วค่อย clip
print('❌ BAD: Compute global → clip');
var ndvi_bad = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(year + '-01-01', year + '-06-30')
    .median()
    .normalizedDifference(['SR_B5', 'SR_B4']);
// var result_bad = ndvi_bad.clip(roi);  // ✗ ใช้ EECU มาก

// ✅ ดี — filterBounds ก่อนคำนวณ (ประหยัด quota 10-100 เท่า)
print('✅ GOOD: filterBounds first → compute');
var ndvi_good = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(roi)  // ← filter geometry ก่อน
    .filterDate(year + '-01-01', year + '-06-30')
    .median()
    .normalizedDifference(['SR_B5', 'SR_B4'])
    .clip(roi);

Map.addLayer(ndvi_good, {min: 0, max: 0.8, palette: ['red', 'yellow', 'green']}, 'NDVI (Optimized)');

// ============================================
// เทคนิค 2: ลดจำนวน Images (cloud cover filter + limit)
// ============================================
print('');
print('--- TECHNIQUE 2: Reduce number of images ---');

// ❌ แย่ — load ทั้งปี cloud cover เต็ม ไม่ limit
print('❌ BAD: Full year, any cloud cover, no limit');
var full_year = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(year + '-01-01', year + '-12-31')
    .filterBounds(roi);
print('  Images in full year:', full_year.size());

// ✅ ดี — จำกัด cloud cover + จำกัด images + จำกัด เดือน
print('✅ GOOD: Q1 only, cloud<30%, limit 30 images');
var q1_optimized = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(roi)
    .filterDate(year + '-01-01', year + '-03-31')
    .filter(ee.Filter.lt('CLOUD_COVER', 30))
    .limit(30);  // ← จำกัดจำนวนภาพ
print('  Optimized collection size:', q1_optimized.size());

// ============================================
// เทคนิค 3: ใช้ Scale ที่เหมาะสม (native resolution)
// ============================================
print('');
print('--- TECHNIQUE 3: Use appropriate scale ---');

// Landsat native resolution = 30m
// ❌ แย่ — export ด้วย scale 10m (3x data, 9x pixels)
print('❌ BAD: Export Landsat 30m data at 10m scale');
print('  Results in 3x larger file, 9x more pixels = high quota cost');

// ✅ ดี — ใช้ native resolution
print('✅ GOOD: Export at native 30m (or coarser)');
Export.image.toDrive({
  image: ndvi_good,
  description: 'ndvi_optimized',
  region: roi,
  scale: 30  // ← Landsat native resolution
});

// ✅ ดี — export ที่ coarser resolution ถ้าสามารถ
Export.image.toDrive({
  image: ndvi_good,
  description: 'ndvi_coarse',
  region: roi,
  scale: 100  // ← ถ้า 100m พอ ประหยัดกว่า
});

// ============================================
// เทคนิค 4: ใช้ .aside() สำหรับ debugging
// ============================================
print('');
print('--- TECHNIQUE 4: Use .aside() for debugging ---');

// ❌ แย่ — print interrupt chain, ต้อง compute 2 ครั้ง
print('❌ BAD: print() in chain causes re-computation');
var collection1 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(roi)
    .filterDate(year + '-01-01', year + '-03-31');
// print(collection1.size());  // ← triggers computation
// var median1 = collection1.median();  // ← compute again

// ✅ ดี — .aside() ไม่ interrupt chain
print('✅ GOOD: Use .aside() to inspect without interrupting');
var median2 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(roi)
    .filterDate(year + '-01-01', year + '-03-31')
    .aside(print, 'Filtered collection')  // ← print without interrupting
    .median()
    .aside(print, 'Median result');

// ============================================
// เทคนิค 5: ใช้ Sentinel-2 สำหรับ high resolution (free quota)
// ============================================
print('');
print('--- TECHNIQUE 5: Prefer Sentinel-2 when possible ---');

// Sentinel-2 10-20m resolution (vs Landsat 30m) แต่ quota cost เหมือน
// และมีข้อมูลมากกว่า (5-day revisit vs 16-day)
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(roi)
    .filterDate(year + '-01-01', year + '-03-31')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

var s2_ndvi = s2.median()
    .normalizedDifference(['B8', 'B4']);

Map.addLayer(s2_ndvi, {min: 0, max: 0.8}, 'S2 NDVI (10m, free quota)');

// ============================================
// เทคนิค 6: ใช้ Sentinel-1 SAR สำหรับ all-weather (cloud-free)
// ============================================
print('');
print('--- TECHNIQUE 6: Use Sentinel-1 for all-weather ---');

// Sentinel-1 SAR ไม่ถูกกระทบจากเมฆ ประหยัด cloud masking processing
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(roi)
    .filterDate(year + '-01-01', year + '-03-31')
    .filter(ee.Filter.eq('instrumentMode', 'IW'));

print('S1 VV/VH backscatter (all-weather, no cloud masking needed)');

// ============================================
// เทคนิค 7: ใช้ Pre-computed Products
// ============================================
print('');
print('--- TECHNIQUE 7: Use pre-computed products ---');

// ❌ แย่ — compute NDVI เอง ทุกครั้ง
// var ndvi_manual = s2.median().normalizedDifference(['B8', 'B4']);

// ✅ ดี — ใช้ MODIS NDVI ที่ compute ไว้แล้ว
var modis_ndvi = ee.ImageCollection('MODIS/061/MOD13A1')
    .filterBounds(roi)
    .filterDate(year + '-01-01', year + '-03-31')
    .select('NDVI');

Map.addLayer(modis_ndvi.median(), {min: 0, max: 0.8}, 'MODIS NDVI (pre-computed)');

// ============================================
// เทคนิค 8: ใช้ Batch Export แทน Drive
// ============================================
print('');
print('--- TECHNIQUE 8: Use Cloud Storage instead of Drive ---');

print('Batch Export to Cloud Storage = เร็วกว่า + ประหยัด quota');
print('GCS benefits:');
print('  - Faster export (native cloud storage)');
print('  - Direct access for analysis');
print('  - Compatible with Vertex AI');
print('  - Can read via Cloud Functions/Apps');

// ============================================
// เทคนิค 9: Cache Intermediate Results
// ============================================
print('');
print('--- TECHNIQUE 9: Cache intermediate results ---');

// ❌ แย่ — compute median 3 ครั้ง (NDVI, EVI, NDWI)
// var median1 = s2.median();
// var ndvi = median1.normalizedDifference(['B8', 'B4']);
// var evi = median1.expression(...);
// var ndwi = median1.normalizedDifference(['B8', 'B11']);

// ✅ ดี — compute median 1 ครั้ง แล้วใช้ซ้ำ
var median = s2.median();
var ndvi_cached = median.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndwi_cached = median.normalizedDifference(['B8', 'B11']).rename('NDWI');
var evi_cached = median.expression(
  '2.5 * ((NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1))',
  {NIR: median.select('B8'), RED: median.select('B4'), BLUE: median.select('B2')}
).rename('EVI');

// ============================================
// เทคนิค 10: Monitor Usage ตลอดเวลา
// ============================================
print('');
print('--- TECHNIQUE 10: Monitor quota usage ---');

print('Check quota at: https://console.cloud.google.com/apis/api/earthengine.googleapis.com/quotas');
print('Monitor your project consumption:');
print('  - Log in to Google Cloud Console');
print('  - Select your project');
print('  - Go to APIs > Earth Engine');
print('  - View quotas and usage');

// ============================================
// Summary: Quota-Saving Checklist
// ============================================
print('');
print('=== QUOTA OPTIMIZATION CHECKLIST ===');
print('[✓] filterBounds() before computation');
print('[✓] Filter cloud cover (lt 20-30%)');
print('[✓] Limit number of images (.limit(N))');
print('[✓] Use native resolution or coarser');
print('[✓] Use .aside() for debugging');
print('[✓] Prefer Sentinel-2 over Landsat (high res, free quota)');
print('[✓] Use SAR for all-weather (no cloud masking)');
print('[✓] Use pre-computed products (MODIS, Dynamic World)');
print('[✓] Export to Cloud Storage (faster, cheaper)');
print('[✓] Monitor usage in GCP Console');
print('[✓] Consider Research Tier if academic');
