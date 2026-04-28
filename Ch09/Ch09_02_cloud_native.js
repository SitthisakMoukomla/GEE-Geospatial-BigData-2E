/*
 * Ch09_02_cloud_native.js
 * Cloud-Native Geospatial: COG Import/Export in GEE
 * รองรับ Cloud-Optimized GeoTIFF และ HTTP Range Requests
 *
 * ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
 * วันที่: 2025
 */

// === 1. Import COG จาก Cloud Storage ===
// Cloud-Optimized GeoTIFF สามารถ read เฉพาะส่วนที่ต้องการผ่าน HTTP Range Requests
// ไม่ต้องดาวน์โหลดทั้งไฟล์

// ตัวอย่าง: Import COG จาก GCS
var cog = ee.Image.loadGeoTIFF(
  'gs://your-bucket/cloud-optimized-data.tif'
);

Map.addLayer(cog, {min: 0, max: 3000}, 'COG from Cloud Storage');

// === 2. STAC API Search ===
// ค้นหาข้อมูล Sentinel-2 ผ่าน STAC API (Planetary Computer)
// STAC = SpatioTemporal Asset Catalog มาตรฐาน metadata

print('=== STAC API Search Info ===');
print('STAC API ต้องดำเนินการใน Python (ดู Ch09_05_stac_search.py)');
print('ใน JavaScript สามารถเข้าถึง STAC endpoint ผ่าน HTTP request');

// === 3. Export เป็น COG ===
// เมื่อ export รูป ให้กำหนด cloudOptimized: true

var roi = ee.Geometry.Point(100.5, 13.75).buffer(50000);
var year = 2025;

// สร้าง NDVI
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(year + '-01-01', year + '-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

var ndvi = s2.median()
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI');

// Export เป็น COG (Cloud-Optimized GeoTIFF)
Export.image.toCloudStorage({
  image: ndvi,
  description: 'ndvi_cog_export',
  bucket: 'your-bucket',
  fileNamePrefix: 'outputs/ndvi_2025_cog',
  region: roi,
  scale: 10,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true  // สร้าง COG format พร้อม internal tiling
  }
});

print('COG Export task submitted. Check Exports panel.');

// === 4. Format Comparison ===
// ไฟล์ที่ export ด้วย cloudOptimized: true จะมี:
// - Internal tiling (default 512x512)
// - Overviews (pyramid)
// - HTTP Range Request optimized structure
// - Size: slightly larger (10-15%) แต่เร็วกว่าในการเข้าถึง

// === 5. Multi-band COG Export ===
// Export หลายแบนด์ในไฟล์เดียว
var multiband = ndvi
    .addBands(s2.median().select(['B4', 'B8']))  // เพิ่ม Red, NIR
    .rename(['NDVI', 'Red', 'NIR']);

Export.image.toCloudStorage({
  image: multiband,
  description: 'multiband_cog',
  bucket: 'your-bucket',
  fileNamePrefix: 'outputs/multiband_2025',
  region: roi,
  scale: 10,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true,
    patchDimensions: [512, 512]  // tile size
  }
});

// === 6. GeoParquet Export (Vector Data) ===
// ส่วนนี้ต้องใช้ Python สำหรับ GeoParquet
// ใน JavaScript ทำได้โดยผ่าน Feature Export

var aoi = ee.Geometry.Point(100.5, 13.75).buffer(50000);

// สร้าง training points เป็น FeatureCollection
var points = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point(100.4, 13.7), {class: 'water'}),
  ee.Feature(ee.Geometry.Point(100.5, 13.8), {class: 'forest'}),
  ee.Feature(ee.Geometry.Point(100.6, 13.75), {class: 'urban'})
]);

// Export เป็น CSV (จะ convert เป็น GeoParquet ใน Python)
Export.table.toDrive({
  collection: points,
  description: 'training_points_csv',
  fileFormat: 'CSV'
});

// === 7. Zarr Array Storage Info ===
// Zarr ใช้สำหรับ time series array data
// ต้องใช้ Python กับ xarray
print('=== Zarr Storage (Cloud-Native) ===');
print('Zarr = Chunked array storage ใน Cloud (GCS, S3)');
print('เหมาะสำหรับ Time series ขนาดใหญ่');
print('ดู Python section: Ch09_06_cloud_native_python.py');

// === 8. Best Practices สำหรับ Cloud-Native ===
print('=== Cloud-Native Best Practices ===');
print('1. ใช้ COG สำหรับ raster data');
print('2. ใช้ GeoParquet สำหรับ vector data ที่มีเยอะ');
print('3. ใช้ Zarr สำหรับ time series');
print('4. ใช้ STAC catalog สำหรับ metadata');
print('5. ใช้ Cloud Storage แทน Google Drive (เร็วกว่า)');
print('6. ลด file size ด้วย compression');
