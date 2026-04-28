/**
 * ===============================================
 * บทที่ 5: การจัดการข้อมูล (Data Management)
 * ===============================================
 *
 * Ch05_04_export.js
 * หัวข้อ: Export Data from GEE - Export to Drive, Cloud Storage, Asset, Shapefile
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
// 2. Prepare Landsat 8 Composite
// ============================================
// ฟังก์ชัน: Apply Scale Factors
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// ฟังก์ชัน: Cloud Masking
function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0)
      .and(qa.bitwiseAnd(1 << 4).eq(0));
  return image.updateMask(mask);
}

// โหลด Landsat 8 Collection 2
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .map(maskClouds)
    .map(applyScaleFactors);

var composite = l8.median().clip(roi);

// ============================================
// 3. สร้าง Vector Data (Forest Polygons)
// ============================================
print('=== สร้าง Vector Data ===');

var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']);
var forest = ndvi.gt(0.5).selfMask();

var forestVectors = forest.reduceToVectors({
  geometry: roi,
  scale: 30,
  geometryType: 'polygon',
  eightConnected: true,
  maxPixels: 1e8
});

print('Forest Polygons:', forestVectors.size());

// ============================================
// 4. Export Image to Google Drive (GeoTIFF)
// ============================================
print('\n=== Export 1: Image to Google Drive ===');

Export.image.toDrive({
  image: composite.select(['SR_B4', 'SR_B3', 'SR_B2', 'SR_B5']),
  description: 'L8_composite_2025_Drive',
  folder: 'GEE_exports',
  region: roi,
  scale: 30,
  crs: 'EPSG:32647',     // UTM Zone 47N (Thailand)
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF'
});

print('✓ Export: L8_composite_2025_Drive (GeoTIFF to Google Drive)');

// ============================================
// 5. Export Image as GeoTIFF (Multi-band)
// ============================================
print('\n=== Export 2: Multi-band GeoTIFF ===');

Export.image.toDrive({
  image: composite.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7']),
  description: 'L8_all_bands_2025',
  folder: 'GEE_exports',
  region: roi,
  scale: 30,
  crs: 'EPSG:32647',
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});

print('✓ Export: L8_all_bands_2025 (Cloud-optimized GeoTIFF)');

// ============================================
// 6. Export Single Index (NDVI)
// ============================================
print('\n=== Export 3: NDVI Index ===');

var ndviImage = composite.normalizedDifference(['SR_B5', 'SR_B4'])
    .rename('NDVI');

Export.image.toDrive({
  image: ndviImage,
  description: 'NDVI_2025',
  folder: 'GEE_exports',
  region: roi,
  scale: 30,
  crs: 'EPSG:32647',
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF'
});

print('✓ Export: NDVI_2025');

// ============================================
// 7. Export FeatureCollection as Shapefile
// ============================================
print('\n=== Export 4: Shapefile ===');

Export.table.toDrive({
  collection: forestVectors,
  description: 'forest_polygons_shapefile',
  folder: 'GEE_exports',
  fileFormat: 'SHP'
});

print('✓ Export: forest_polygons_shapefile (Shapefile)');

// ============================================
// 8. Export FeatureCollection as CSV
// ============================================
print('\n=== Export 5: CSV ===');

// เพิ่ม Property เก่กอนส่งออก
var forestWithProperties = forestVectors.map(function(feature) {
  return feature.set({
    'area_pixels': feature.geometry().area().divide(900),  // 30m x 30m = 900 sq meters per pixel
    'perimeter': feature.geometry().perimeter()
  });
});

Export.table.toDrive({
  collection: forestWithProperties,
  description: 'forest_polygons_csv',
  folder: 'GEE_exports',
  fileFormat: 'CSV'
});

print('✓ Export: forest_polygons_csv');

// ============================================
// 9. Export FeatureCollection as GeoJSON
// ============================================
print('\n=== Export 6: GeoJSON ===');

Export.table.toDrive({
  collection: forestVectors,
  description: 'forest_polygons_geojson',
  folder: 'GEE_exports',
  fileFormat: 'GeoJSON'
});

print('✓ Export: forest_polygons_geojson');

// ============================================
// 10. Export FeatureCollection as KML
// ============================================
print('\n=== Export 7: KML ===');

Export.table.toDrive({
  collection: forestVectors,
  description: 'forest_polygons_kml',
  folder: 'GEE_exports',
  fileFormat: 'KML'
});

print('✓ Export: forest_polygons_kml');

// ============================================
// 11. Export to Google Cloud Storage
// ============================================
print('\n=== Export 8: Google Cloud Storage ===');
// หมายเหตุ: ต้องมี GCS bucket สำหรับส่วนนี้
// ถ้าไม่มี ให้ uncomment และเปลี่ยน 'my-gee-bucket' เป็น bucket ของคุณ

/*
Export.image.toCloudStorage({
  image: composite.select(['SR_B4', 'SR_B3', 'SR_B2']),
  description: 'L8_composite_cloud',
  bucket: 'my-gee-bucket',
  region: roi,
  scale: 30,
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF'
});
print('✓ Export: L8_composite_cloud (Google Cloud Storage)');
*/

print('// หมายเหตุ: Google Cloud Storage Export ต้องกำหนด bucket ก่อน');

// ============================================
// 12. Export to Earth Engine Asset
// ============================================
print('\n=== Export 9: Earth Engine Asset ===');
// หมายเหตุ: ต้องเปลี่ยน 'users/yourname' เป็น username ของคุณ

/*
Export.image.toAsset({
  image: composite.select(['SR_B4', 'SR_B3', 'SR_B2']),
  description: 'L8_composite_asset',
  assetId: 'users/yourname/L8_composite_2025',
  region: roi,
  scale: 30,
  maxPixels: 1e10
});
print('✓ Export: L8_composite_asset (EE Asset)');
*/

print('// หมายเหตุ: EE Asset Export ต้องกำหนด assetId ของคุณเอง');

// ============================================
// 13. สรุป Export Options
// ============================================
print('\n=== สรุป Export Options ===');
print('1. Google Drive:      ดีสำหรับไฟล์เล็ก-กลาง');
print('2. Cloud Storage:     ดีสำหรับไฟล์ใหญ่');
print('3. EE Asset:          เก็บไว้ใช้ต่อใน GEE');
print('4. Formats:           GeoTIFF, Shapefile, CSV, GeoJSON, KML');

// ============================================
// 14. ตรวจสอบ Tasks
// ============================================
print('\n=== เตรียมอย่างแล้ว ===');
print('ปล.: ไปที่ Tasks Tab (ด้านขวา) เพื่อเริ่ม Export');
print('คลิก RUN เพื่อเริ่มการส่งออก');
