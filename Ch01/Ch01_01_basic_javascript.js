/*
 * =========================================
 * บทที่ 1: JavaScript เบื้องต้นสำหรับ GEE
 * =========================================
 * ไฟล์: Ch01_01_basic_javascript.js
 *
 * คำอธิบาย: สัดที่ JavaScript พื้นฐาน
 *          - ตัวแปรและประเภทข้อมูล
 *          - Array (List)
 *          - Object (Dictionary)
 *          - ฟังก์ชัน
 *          - การคำนวณทางคณิตศาสตร์
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. ตัวแปรและประเภทข้อมูล ========

// ประกาศตัวแปร String
var countryName = 'ประเทศไทย';
var sensorName = 'Landsat 8';

// ประกาศตัวแปร Number
var year = 2025;
var cloudThreshold = 20;

// ประกาศตัวแปร Boolean
var useCloudMask = true;
var exportToDrive = false;

// พิมพ์ค่าตัวแปร
print('ชื่อประเทศ:', countryName);
print('ปีที่ทำการวิเคราะห์:', year);
print('ใช้ Cloud Mask:', useCloudMask);


// ======== 2. Array (List) ========

// สร้าง Array ของชื่อ Band
var bandNames = ['SR_B4', 'SR_B3', 'SR_B2'];
print('Band Names:', bandNames);

// เข้าถึง Element ใน Array (index เริ่มต้นจาก 0)
var firstBand = bandNames[0];  // 'SR_B4'
var secondBand = bandNames[1]; // 'SR_B3'
print('Band ที่ 1:', firstBand);
print('Band ที่ 2:', secondBand);

// ความยาว Array
var numberOfBands = bandNames.length;
print('จำนวน Band:', numberOfBands);

// เพิ่ม Element เข้า Array
bandNames.push('SR_B8');
print('Array หลังเพิ่ม Band:', bandNames);


// ======== 3. Object (Dictionary) ========

// สร้าง Object สำหรับ Visualization Parameters
var visParams = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 0.3,
  gamma: 1.2
};

// เข้าถึง Property ใน Object
print('Min value:', visParams.min);
print('Max value:', visParams.max);
print('Visualization Parameters:', visParams);

// สร้าง Object อื่น
var filterOptions = {
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  cloudPercentage: 20,
  roi: null
};

print('ตัวเลือกการกรองข้อมูล:', filterOptions);


// ======== 4. ฟังก์ชัน (Function) ========

// ฟังก์ชันง่ายๆ: คำนวณ NDVI
function calculateNDVI(nir, red) {
  // สูตร NDVI = (NIR - Red) / (NIR + Red)
  var ndvi = (nir - red) / (nir + red);
  return ndvi;
}

// เรียกใช้ฟังก์ชัน
var nirValue = 0.4;
var redValue = 0.2;
var ndviResult = calculateNDVI(nirValue, redValue);
print('NDVI result:', ndviResult);

// ฟังก์ชันที่รับ Object เป็น parameter
function printImageInfo(info) {
  print('Sensor:', info.sensor);
  print('Collection:', info.collection);
  print('Spatial Resolution:', info.resolution);
}

var landsatInfo = {
  sensor: 'OLI-2',
  collection: 'LANDSAT/LC08/C02/T1_L2',
  resolution: '30 meters'
};

printImageInfo(landsatInfo);


// ======== 5. ฟังก์ชัน Map (for loop in functional style) ========

// สร้าง Array ของตัวเลข
var numbers = [1, 2, 3, 4, 5];

// ใช้ map เพื่อแปลงค่า
var squared = numbers.map(function(x) {
  return x * x;
});

print('ตัวเลขเดิม:', numbers);
print('ตัวเลขยกกำลังสอง:', squared);

// ใช้ filter เพื่อเลือก Element
var evenNumbers = numbers.filter(function(x) {
  return x % 2 == 0;  // เลือกตัวเลขคู่
});

print('ตัวเลขคู่:', evenNumbers);


// ======== 6. ลูป (Loop) ========

// Simple for loop
print('\n--- For Loop Example ---');
for (var i = 0; i < 3; i++) {
  print('รอบที่ ' + (i + 1));
}

// Loop ผ่าน Array
print('\n--- Loop ผ่าน Array ---');
var months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม'];
for (var i = 0; i < months.length; i++) {
  print('เดือน ' + (i + 1) + ': ' + months[i]);
}


// ======== 7. Conditional Statement (if-else) ========

print('\n--- Conditional Statement ---');

var cloudPercentage = 15;

if (cloudPercentage < 10) {
  print('ทีดี: เมฆน้อยมากคำขอเอง');
} else if (cloudPercentage < 30) {
  print('ยอมรับได้: เมฆปานกลาง');
} else {
  print('ไม่เหมาะสม: เมฆมากเกินไป');
}


// ======== 8. การต่อสตริง (String Concatenation) ========

print('\n--- String Operations ---');

var satellite = 'Landsat';
var sensorType = 'OLI';
var version = 9;

// วิธีที่ 1: ใช้ +
var fullName1 = satellite + ' ' + version + ' (' + sensorType + ')';
print('ชื่อเต็มวิธี 1:', fullName1);

// วิธีที่ 2: ใช้ template string (backtick)
var fullName2 = satellite + ' ' + version + ' (' + sensorType + ')';
print('ชื่อเต็มวิธี 2:', fullName2);


// ======== 9. ค่า null และ undefined ========

print('\n--- Null and Undefined ---');

var undefinedVar;  // ไม่ได้กำหนดค่า
var nullVar = null;  // กำหนดเป็น null อย่างชัดแจ้ง

print('Undefined variable:', undefinedVar);
print('Null variable:', nullVar);


// ======== 10. เปรียบเทียบค่า ========

print('\n--- Comparison Operations ---');

var a = 10;
var b = 20;

print('a > b:', a > b);
print('a < b:', a < b);
print('a == 10:', a == 10);
print('a != b:', a != b);


// ======== Summary ========

print('\n=== สรุปบทนี้ ===');
print('✓ ตัวแปร String, Number, Boolean');
print('✓ Array (List) - บันทึกข้อมูลหลายตัว');
print('✓ Object (Dictionary) - บันทึกข้อมูลแบบ key-value');
print('✓ ฟังก์ชัน - ชุดคำสั่งที่นำกลับมาใช้ได้');
print('✓ ลูป และ Conditional');
print('\nไปต่อบทถัดไป: Loading และแสดง Satellite Image');
