/*
 * =========================================
 * บทที่ 4: Scale Factor ของ Landsat C02
 * =========================================
 * ไฟล์: Ch04_01_scale_factors.js
 *
 * คำอธิบาย: สำคัญที่สุด! Collection 2 ใช้ Scale Factor ใหม่
 *          - Optical bands: multiply(0.0000275).add(-0.2)
 *          - Thermal bands: multiply(0.00341802).add(149.0)
 *          - ถ้าไม่ apply: NDVI จะผิด!
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. กำหนด ROI ========

var roi = ee.Geometry.Point(100.5, 13.75);  // กรุงเทพมหานคร

print('ROI:', roi);


// ======== 2. โหลด Landsat 8 Collection 2 (WITHOUT Scale Factor) ========

var l8Raw = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .first();

print('Landsat 8 C02 (Raw - ยังไม่ apply Scale Factor):', l8Raw);

// ดู DN value ของ Optical Band ตัวแรก (SR_B2 - Blue)
var b2Raw = l8Raw.select('SR_B2');
var b2Sample = b2Raw.sample(roi, 30).first();

print('\n=== Raw DN Values (ยังไม่ scaled) ===');
print('SR_B2 (Blue) raw DN:', b2Sample.get('SR_B2'));
print('ค่า DN ส่วนใหญ่จะเป็นตัวเลขใหญ่ เช่น 10000-20000');


// ======== 3. ความแตกต่างระหว่าง Collection 1 กับ Collection 2 ========

print('\n=== Comparison: Collection 1 vs Collection 2 ===');
print('Collection 1:');
print('  - Optical Scale Factor: 0.0001 (DN × 0.0001 = Reflectance 0-1)');
print('  - DN range: 0-10000');
print('  - Example: DN=5000 → Reflectance = 0.5');
print('');
print('Collection 2:');
print('  - Optical Scale Factor: 0.0000275 + (-0.2)');
print('  - DN range: 0-65535');
print('  - Formula: (DN × 0.0000275) - 0.2 = Reflectance');
print('  - Example: DN=10000 → (10000 × 0.0000275) - 0.2 = 0.075');
print('  - Example: DN=18000 → (18000 × 0.0000275) - 0.2 = 0.295');


// ======== 4. Scale Factor Function ========

// ฟังก์ชัน MUST สำหรับ Collection 2!
function applyScaleFactors(image) {
  // สำหรับ Optical bands (SR_B1 ถึง SR_B7)
  var opticalBands = image.select('SR_B.')
      .multiply(0.0000275)
      .add(-0.2);

  // สำหรับ Thermal band (ST_B10)
  var thermalBands = image.select('ST_B.*')
      .multiply(0.00341802)
      .add(149.0);

  // ส่งกลับ image โดยแทนที่ bands เดิมด้วยค่า scaled
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

print('\n=== Scale Factor Function Defined ===');
print('function applyScaleFactors(image) → ตรวจสอบได้');


// ======== 5. Apply Scale Factor ========

var l8Scaled = l8Raw.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5'])
    .multiply(0.0000275)
    .add(-0.2);

print('\n=== After Scale Factor Applied ===');

var scaledSample = l8Scaled.sample(roi, 30).first();
print('SR_B2 (Blue) scaled:', scaledSample.get('SR_B2'));
print('ค่าตอนนี้ควรจะอยู่ระหว่าง -0.2 ถึง 1.0 (Reflectance)');


// ======== 6. แสดงความสำคัญผ่าน NDVI ========

print('\n=== ความสำคัญของ Scale Factor: NDVI Case ===');

// NDVI = (NIR - Red) / (NIR + Red)
// Bands: NIR = SR_B5, Red = SR_B4

// ❌ ถ้า ไม่ apply Scale Factor
var ndviWrong = l8Raw.normalizedDifference(['SR_B5', 'SR_B4']);
var ndviWrongSample = ndviWrong.sample(roi, 30).first();

print('\nNDVI WITHOUT Scale Factor (❌ WRONG):');
print('Value:', ndviWrongSample.get('nd'));
print('↳ ค่าจะผิด! อาจได้ค่าระหว่าง -1 ถึง 1 แต่ inconsistent');

// ✓ ถ้า apply Scale Factor
var l8ScaledFull = applyScaleFactors(l8Raw);
var ndviCorrect = l8ScaledFull.normalizedDifference(['SR_B5', 'SR_B4']);
var ndviCorrectSample = ndviCorrect.sample(roi, 30).first();

print('\nNDVI WITH Scale Factor (✓ CORRECT):');
print('Value:', ndviCorrectSample.get('nd'));
print('↳ ค่า NDVI ที่ถูก! ประมาณ 0.4-0.8 สำหรับพื้นที่เขียว');


// ======== 7. Visual Comparison ========

// โหลด Composite ไม่ scaled
var composite_raw = l8Raw.select(['SR_B4', 'SR_B3', 'SR_B2']);

var vis_raw = {
  min: 0,
  max: 50000  // Raw DN range
};

Map.addLayer(composite_raw, vis_raw, 'True Color (Raw DN - ผิด)', false);

// โหลด Composite ที่ scaled
var composite_scaled = l8ScaledFull.select(['SR_B4', 'SR_B3', 'SR_B2']);

var vis_scaled = {
  min: 0,
  max: 0.3  // Reflectance range
};

Map.addLayer(composite_scaled, vis_scaled, 'True Color (Scaled - ถูก)');


// ======== 8. Thermal Band Scale Factor ========

print('\n=== Thermal Band Scale Factor ===');

var thermalRaw = l8Raw.select('ST_B10');
var thermalSample = thermalRaw.sample(roi, 30).first();

print('ST_B10 (Thermal) Raw DN:', thermalSample.get('ST_B10'));
print('Raw DN range: 0-65535');

// Apply thermal scale factor: DN × 0.00341802 + 149.0
// ผลลัพธ์: Kelvin (K)
var thermalScaled = l8Raw.select('ST_B10')
    .multiply(0.00341802)
    .add(149.0);

var thermalScaledSample = thermalScaled.sample(roi, 30).first();
print('ST_B10 (Thermal) Scaled (K):', thermalScaledSample.get('ST_B10'));
print('↳ ค่า Kelvin ประมาณ 273-313 K (0-40°C)');

// แปลง Kelvin เป็น Celsius
var thermalCelsius = thermalScaled.subtract(273.15);
var thermalCSample = thermalCelsius.sample(roi, 30).first();

print('ST_B10 (Thermal) as Celsius (°C):', thermalCSample.get('ST_B10'));

// Visualization
var thermalVis = {
  min: 0,
  max: 40,
  palette: ['blue', 'cyan', 'yellow', 'red']
};

Map.addLayer(thermalCelsius, thermalVis, 'Land Surface Temperature (°C)', false);


// ======== 9. Complete Processing Pipeline ========

print('\n=== Complete Processing Pipeline ===');

// Step 1: Load Collection 2
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi);

// Step 2: Apply Scale Factor
var l8processed = l8.map(applyScaleFactors);

// Step 3: Create composite
var composite = l8processed.median();

// Step 4: Calculate indices
var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
var ndbi = composite.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');  // Built index
var mndwi = composite.normalizedDifference(['SR_B3', 'SR_B6']).rename('MNDWI'); // Water index

print('NDVI:', ndvi);
print('NDBI:', ndbi);
print('MNDWI:', mndwi);

// Step 5: Visualize
var ndviVis = {
  min: 0,
  max: 0.8,
  palette: ['red', 'yellow', 'green']
};

Map.addLayer(ndvi.clip(roi.buffer(50000)), ndviVis, 'NDVI (with Scale Factor)');


// ======== 10. Checklist สำหรับ Scale Factor ========

print('\n=== Checklist: Scale Factor ===');
print('☐ 1. ตรวจสอบ Collection ID: LANDSAT/LC08/C02/T1_L2 (ไม่ใช่ C01)');
print('☐ 2. ตรวจสอบ Band Names: SR_B* (ไม่ใช่ B*)');
print('☐ 3. สร้างฟังก์ชัน applyScaleFactors()');
print('☐ 4. เรียกใช้ .map(applyScaleFactors) หลัง filterDate/filterBounds');
print('☐ 5. ก่อนคำนวณ Index เสมอ!');
print('☐ 6. ตรวจสอบ Visualization Parameters (min/max: 0-0.3)');
print('☐ 7. ดึง Thermal → convert K to °C');


// ======== 11. Common Mistakes ========

print('\n=== Common Mistakes (❌ AVOID) ===');
print('❌ Mistake 1: ไม่ apply Scale Factor');
print('   ↳ NDVI จะผิด, Reflectance จะผิด');
print('');
print('❌ Mistake 2: ใช้ Band names เดิม (B4, B5, B6)');
print('   ↳ Error: Band not found!');
print('');
print('❌ Mistake 3: ใช้ Visualization min/max แบบ C01 (0-10000)');
print('   ↳ ภาพจะมืดมาก เพราะ scale ต่างกัน');
print('');
print('❌ Mistake 4: Apply Scale Factor 2 ครั้ง');
print('   ↳ Reflectance จะเป็นตัวเลขลบหรือ > 1');
print('');
print('❌ Mistake 5: ลืม Scale Thermal band');
print('   ↳ LST จะผิด');


// ======== 12. Center Map ========

Map.centerObject(roi, 10);


// ======== สรุป ========

print('\n=== สรุปบทนี้ ===');
print('✓ Collection 2 ใช้ Scale Factor ใหม่');
print('✓ Optical: multiply(0.0000275).add(-0.2)');
print('✓ Thermal: multiply(0.00341802).add(149.0)');
print('✓ MUST apply ก่อนคำนวณ Index!');
print('✓ Visualization parameters เปลี่ยน (0-0.3 แทน 0-1)');
print('✓ Thermal band แปลง K → °C');
print('\n⚠️ ถ้าไม่ apply Scale Factor จะได้ผลลัพธ์ที่ผิดทั้งหมด!');
print('\nลำดับถัดไป: Ch04_02 - Cloud Masking (QA_PIXEL)');
