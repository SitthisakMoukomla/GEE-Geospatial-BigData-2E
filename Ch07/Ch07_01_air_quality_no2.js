/*====================================================================
 * บทที่ 7.2 ติดตามคุณภาพอากาศด้วย Sentinel-5P: NO₂ ก่อน-หลังล็อกดาวน์
 * Ch07_01_air_quality_no2.js
 *
 * วัตถุประสงค์:
 *   - วิเคราะห์ NO₂ (Nitrogen Dioxide) ก่อนและหลังล็อกดาวน์ COVID-19
 *   - เปรียบเทียบระดับมลพิษอากาศ
 *   - คำนวณ % การเปลี่ยนแปลง
 *
 * ข้อมูล: COPERNICUS/S5P/OFFL/L3_NO2
 * ROI: Bangkok metropolitan area
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
// กรุงเทพมหานคร
var roi = ee.Geometry.Rectangle([
  100.3, 13.5,   // ตะวันตกเฉียงใต้
  100.9, 14.2    // ตะวันออกเฉียงเหนือ
]);

// ====== Function: Visualize NO2 ======
/**
 * ฟังก์ชันสำหรับเลือก band NO₂ จาก Sentinel-5P
 */
function selectNO2(imageCollection) {
  return imageCollection
    .select('tropospheric_NO2_column_number_density')
    .mean();
}

// ====== Data Loading & Processing ======
// ภาพก่อนล็อกดาวน์ (ม.ค.-มี.ค. 2020)
var no2Before = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
  .filterDate('2020-01-01', '2020-03-15')
  .filterBounds(roi)
  .select('tropospheric_NO2_column_number_density')
  .mean()
  .clip(roi);

// ภาพหลังล็อกดาวน์ (เม.ย.-มิ.ย. 2020)
var no2After = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
  .filterDate('2020-04-01', '2020-06-30')
  .filterBounds(roi)
  .select('tropospheric_NO2_column_number_density')
  .mean()
  .clip(roi);

// ====== Visualization ======
var visNO2 = {
  min: 0,
  max: 0.0002,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(no2Before, visNO2, 'NO₂ ก่อนล็อกดาวน์ (ม.ค.-มี.ค. 2020)');
Map.addLayer(no2After, visNO2, 'NO₂ หลังล็อกดาวน์ (เม.ย.-มิ.ย. 2020)');

// ====== Change Detection ======
// คำนวณ % การเปลี่ยนแปลง
// ให้ความสำคัญ: ถ้า no2Before เป็น 0 จะเกิด division by zero
var change = no2After
  .subtract(no2Before)
  .divide(no2Before.add(1e-7))  // หลีกเลี่ยง division by zero
  .multiply(100)
  .rename('NO2_Change_Percent');

var visChange = {
  min: -50,
  max: 50,
  palette: ['green', 'white', 'red']
};

Map.addLayer(change, visChange, 'NO₂ การเปลี่ยนแปลง (%)');

// ====== Statistics ======
// คำนวณค่าสถิติ
var statsBefore = no2Before.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 5000,
  maxPixels: 1e8
});

var statsAfter = no2After.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 5000,
  maxPixels: 1e8
});

var statsChange = change.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: roi,
  scale: 5000,
  maxPixels: 1e8
});

print('========== NO₂ Analysis (Bangkok) ==========');
print('Mean NO₂ ก่อนล็อกดาวน์:', statsBefore.get('tropospheric_NO2_column_number_density'));
print('Mean NO₂ หลังล็อกดาวน์:', statsAfter.get('tropospheric_NO2_column_number_density'));
print('% Change in NO₂:', statsChange.get('NO2_Change_Percent'));

// ====== Map Setup ======
Map.setCenter(100.6, 13.85, 10);
Map.setOptions('SATELLITE');
