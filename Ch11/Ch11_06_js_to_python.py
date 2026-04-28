#!/usr/bin/env python3
"""
บทที่ 11: การใช้ GEE กับ Python & geemap
==========================================

Ch11_06_js_to_python.py — JavaScript to Python Converter

geemap มี converter ที่แปลง GEE JavaScript เป็น Python ได้อัตโนมัติ
ทำให้ผู้ที่อ่านบทที่ 1-9 (JavaScript) สามารถแปลงมาเป็น Python ได้ทันที

Author: geemap tutorial
Date: 2025
Language: Thai
"""

import ee
import geemap

# ============================================================================
# Setup
# ============================================================================

PROJECT_ID = 'your-cloud-project-id'  # เปลี่ยนเป็น Project ID ของคุณ
ee.Initialize(project=PROJECT_ID)

print("JavaScript to Python Converter Demo\n")


# ============================================================================
# ส่วนที่ 1: Converter Method 1 - String Input
# ============================================================================

print("="*70)
print("Method 1: js_snippet_to_py() - String Input")
print("="*70)

# ตัวอย่าง JavaScript code จากบทที่ 1-9
js_code_1 = """
var image = ee.Image('USGS/SRTMGL1_003');
var vis = {min: 0, max: 5000, palette: ['green','yellow','brown']};
Map.addLayer(image, vis, 'SRTM DEM');
Map.centerObject(image, 5);
"""

print("Input JavaScript:")
print(js_code_1)

# แปลง JS → Python
python_code_1 = geemap.js_snippet_to_py(js_code_1)

print("\nConverted Python:")
print(python_code_1)


# ============================================================================
# ส่วนที่ 2: ตัวอย่าง JavaScript Code from Chapters 1-9
# ============================================================================

print("\n" + "="*70)
print("ตัวอย่าง JavaScript Code ต่างๆ")
print("="*70)

# ตัวอย่าง 1: NDVI from Chapter 6
js_ndvi = """
var image = ee.Image('COPERNICUS/S2_SR_HARMONIZED/20250101T030631_20250101T033718_T49SGD');
var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
var vis = {min: -1, max: 1, palette: ['red', 'yellow', 'green']};
Map.addLayer(ndvi, vis, 'NDVI');
"""

print("\n\nExample 1: NDVI Calculation (From Chapter 6)")
print("-" * 70)
print("JavaScript:")
print(js_ndvi)
python_ndvi = geemap.js_snippet_to_py(js_ndvi)
print("\nPython:")
print(python_ndvi)


# ตัวอย่าง 2: Image Collection Filter from Chapter 4
js_collection = """
var collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(ee.Geometry.Point(100.5, 13.75))
    .filter(ee.Filter.lt('CLOUD_COVER', 20));
var image = collection.median();
var vis = {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0, max: 20000};
Map.addLayer(image, vis, 'Landsat 2025');
"""

print("\n\nExample 2: Image Collection (From Chapter 4)")
print("-" * 70)
print("JavaScript:")
print(js_collection)
python_collection = geemap.js_snippet_to_py(js_collection)
print("\nPython:")
print(python_collection)


# ตัวอย่าง 3: Machine Learning Classification from Chapter 8
js_classifier = """
var feature = ee.FeatureCollection('training_data');
var classifier = ee.Classifier.smileRandomForest(100).train(feature, 'class', ['B4', 'B3', 'B2']);
var image = ee.Image('COPERNICUS/S2_SR_HARMONIZED/20250101T030631_20250101T033718_T49SGD');
var classified = image.classify(classifier);
var vis = {min: 0, max: 3, palette: ['red', 'green', 'blue']};
Map.addLayer(classified, vis, 'Classification');
"""

print("\n\nExample 3: Machine Learning (From Chapter 8)")
print("-" * 70)
print("JavaScript:")
print(js_classifier)
python_classifier = geemap.js_snippet_to_py(js_classifier)
print("\nPython:")
print(python_classifier)


# ============================================================================
# ส่วนที่ 4: Conversion Rules Reference
# ============================================================================

conversion_rules = """
JavaScript to Python Conversion Rules
======================================

1. Variable Declaration:
   JS:  var x = ...;
   Py:  x = ...

2. Object/Dictionary:
   JS:  {bands: ['B4','B3','B2'], min: 0}
   Py:  {'bands': ['B4','B3','B2'], 'min': 0}

3. Function Definition:
   JS:  function(img) { return img.mean(); }
   Py:  lambda img: img.mean() หรือ def func(img): return img.mean()

4. Method Chaining:
   JS:  collection
        .filterDate(...)
        .filterBounds(...)
   Py:  (collection
        .filterDate(...)
        .filterBounds(...))

5. Print/Console:
   JS:  print(image);
   Py:  print(image.getInfo())

6. Mapping (apply function to each item):
   JS:  collection.map(function(img) { ... })
   Py:  collection.map(lambda img: ...)

7. Comments:
   JS:  // comment
   Py:  # comment

8. Geometry:
   JS:  ee.Geometry.Point(100, 14)
   Py:  ee.Geometry.Point(100, 14)  # เหมือนกัน!

9. Class Names:
   JS:  ee.Image, ee.ImageCollection, ee.Classifier
   Py:  ee.Image, ee.ImageCollection, ee.Classifier  # เหมือนกัน!

Key Insight:
============
API structure เหมือนกัน! แค่เปลี่ยนรูปแบบ JavaScript ไป Python
หลังจากแปลงแล้ว สามารถรัน ปรับแต่ง ได้โดยไม่ต้อง GEE Code Editor
"""

print("\n" + "="*70)
print(conversion_rules)


# ============================================================================
# ส่วนที่ 5: Live Conversion - ทดลองแปลงเอง
# ============================================================================

print("\n" + "="*70)
print("Live Conversion Example")
print("="*70)

# คุณสามารถใส่ JavaScript code แล้วแปลงได้เอง
user_js = """
var image = ee.Image('USGS/NED/1m');
print(image);
"""

print("Your JavaScript Input:")
print(user_js)

print("\nConverted to Python:")
try:
    user_python = geemap.js_snippet_to_py(user_js)
    print(user_python)
except Exception as e:
    print(f"Error: {e}")


# ============================================================================
# ส่วนที่ 6: Tips สำหรับการใช้ Converter
# ============================================================================

tips = """
Tips for using JavaScript to Python Converter
==============================================

1. ❌ Don't use:
   - Direct Map.addLayer() from JS code
   - Browser-specific functions
   - DOM manipulation

2. ✅ Do use:
   - Image/ImageCollection processing
   - Geometry operations
   - Feature Collection filtering
   - Math operations

3. Common Issues:
   - Multi-line strings: ใช้ triple quotes ('''...''')
   - Complex functions: อาจต้องทำมือ
   - Callbacks: อาจไม่แปลงสมบูรณ์

4. Post-Conversion:
   - ตรวจสอบ syntax
   - ทดสอบรัน code
   - อาจต้องปรับแต่งเล็กน้อย

5. Limitations:
   - Code Editor features (ปุ่ม, console) ไม่สามารถแปลง
   - UI elements ต้องสร้างเอง (Streamlit, ipywidgets)

Recommendation:
===============
ใช้ converter สำหรับ:
✓ Image processing logic
✓ Filtering/mapping operations
✓ Mathematical formulas
✓ Data export scripts

อย่าใช้ converter สำหรับ:
✗ UI code (buttons, panels, etc.)
✗ Browser-dependent code
✗ GEE Code Editor features
"""

print(tips)


# ============================================================================
# ส่วนที่ 7: ตัวอย่าง Complete Workflow
# ============================================================================

print("\n" + "="*70)
print("Complete Example: NDVI Analysis (Converted from JS)")
print("="*70)

complete_js = """
// โหลด Sentinel-2
var image = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(ee.Geometry.Point(100.5, 13.75))
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .median();

// คำนวณ NDVI
var ndvi = image.normalizedDifference(['B8', 'B4']);

// Visualization
var vis = {min: -1, max: 1, palette: ['red', 'yellow', 'green']};
Map.addLayer(ndvi, vis, 'NDVI');

// Export
Export.image.toDrive({
    image: ndvi,
    description: 'bangkok_ndvi',
    scale: 10,
    region: ee.Geometry.Point(100.5, 13.75).buffer(30000)
});
"""

print("Original JavaScript (From Chapter 6):")
print(complete_js)

print("\n" + "-"*70)
print("Converted Python:")
converted = geemap.js_snippet_to_py(complete_js)
print(converted)


# ============================================================================
# Display Result
# ============================================================================

print("\n" + "="*70)
print("CONVERTER READY!")
print("="*70)
print("""
✓ JavaScript to Python Converter เพื่อใช้งาน

วิธีใช้:
1. Copy JavaScript code จากบทที่ 1-9 (GEE Code Editor)
2. ใช้ geemap.js_snippet_to_py(js_code)
3. ได้ Python code กลับมา
4. ปรับแต่งและรัน

ตัวอย่าง:
  js_code = '''
  var image = ee.Image(...);
  ...
  '''

  python = geemap.js_snippet_to_py(js_code)
  print(python)

Benefit:
✓ Reuse code จาก JavaScript (Chapters 1-9)
✓ รวดเร็ว ไม่ต้องแปลงมือ
✓ Consistent กับ GEE API
✓ ไม่ต้องสอบไปมา IDE

Limitation:
✓ บางครั้งต้องปรับแต่งเล็กน้อย
✓ UI code ต้องทำเอง
✓ Browser functions ไม่ support
""")
