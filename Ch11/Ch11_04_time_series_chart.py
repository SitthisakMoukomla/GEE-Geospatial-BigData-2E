#!/usr/bin/env python3
"""
บทที่ 11: การใช้ GEE กับ Python & geemap
==========================================

Ch11_04_time_series_chart.py — NDVI Time Series Chart

สร้าง Time Series Chart ของ NDVI ระหว่าง 2024-2025
เพื่อติดตามสุขภาพพืชตลอดทั้งปี

ใช้ Sentinel-2 Data ซึ่งมี Temporal Resolution ดี

Author: geemap tutorial
Date: 2025
Language: Thai
"""

import ee
import geemap
import matplotlib.pyplot as plt

# ============================================================================
# Setup
# ============================================================================

PROJECT_ID = 'your-cloud-project-id'  # เปลี่ยนเป็น Project ID ของคุณ
ee.Initialize(project=PROJECT_ID)

print("Initializing NDVI time series analysis...")


# ============================================================================
# ส่วนที่ 1: กำหนดจุดสนใจและช่วงเวลา
# ============================================================================

# ตัวอย่าง: แม่นำ้เจ้าพระยา (Chao Phraya River) กรุงเทพฯ
# เราจะดู NDVI ของพืชข้างแม่น้ำ

roi_point = ee.Geometry.Point(100.5, 14.0)
roi_buffer = roi_point.buffer(500)  # 500 เมตร buffer

print(f"✓ ROI: Chao Phraya River area")
print(f"  Point: ({100.5}, {14.0})")
print(f"  Buffer: 500 meters")


# ============================================================================
# ส่วนที่ 2: โหลด Sentinel-2 Collection ตลอดปี 2024
# ============================================================================

collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate('2024-01-01', '2025-01-01')
    .filterBounds(roi_point)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))

count = collection.size().getInfo()
print(f"✓ Loaded {count} Sentinel-2 images (cloud-free)")


# ============================================================================
# ส่วนที่ 3: สร้าง Function เพื่อคำนวณ NDVI
# ============================================================================

def add_ndvi(image):
    """
    คำนวณ NDVI = (NIR - RED) / (NIR + RED)
    Sentinel-2: NIR = B8, RED = B4
    """
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    return image.addBands(ndvi)

# Apply function ให้ทุก image ใน collection
ndvi_collection = collection.map(add_ndvi)

print("✓ Computed NDVI for all images")


# ============================================================================
# ส่วนที่ 4: สร้าง Time Series Chart
# ============================================================================

print("\nGenerating time series chart...")

# ใช้ geemap.chart.image_series() เพื่อสร้าง chart
chart = geemap.chart.image_series(
    ndvi_collection.select('NDVI'),
    region=roi_buffer,
    reducer=ee.Reducer.mean(),
    scale=10,
    x_property='system:time_start',
    title='NDVI Time Series - Chao Phraya River Area (2024)',
    ylabel='NDVI (Mean Value)',
    xlabel='Date',
    legend_location='upper right'
)

print("✓ Chart created!")


# ============================================================================
# ส่วนที่ 5: Interpretation ของ NDVI Values
# ============================================================================

"""
NDVI Interpretation:
===================

NDVI Range: -1 to +1

Values:
- NDVI < 0:         Water (น้ำ)
- 0 < NDVI < 0.3:   Built-up/Soil (เมือง/ดิน)
- 0.3 < NDVI < 0.6: Low vegetation (พืชไม่สมบูรณ์)
- 0.6 < NDVI < 0.8: Moderate vegetation (พืชปกติ)
- NDVI > 0.8:       Dense vegetation (พืชสูง)

ในตัวอย่างนี้ที่สนาม Chao Phraya:
- ช่วงฤดูเก็บเกี่ยว (11-12): NDVI ต่ำ (พืชเก่า)
- ช่วงปลูก (5-6): NDVI เพิ่มขึ้น (พืชใหม่)
- ช่วงหลังปลูก (7-10): NDVI สูง (พืชโตแล้ว)
"""

print("""
NDVI Time Series Interpretation:
=================================
✓ High NDVI (0.7-1.0): Dense, healthy vegetation
✓ Medium NDVI (0.4-0.7): Moderate vegetation
✓ Low NDVI (<0.4): Sparse vegetation, bare soil, water
✓ Seasonal Patterns: จะเห็น dip ในช่วงเก็บเกี่ยว

กรณี Chao Phraya:
✓ Monitor พืชขึ้น-ลง ตามฤดูการทำนา
✓ Detect crop disease: ลดลงกะทันหัน
✓ Monitor water level: NDVI < 0 หมายถึงน้ำเพิ่ม
""")


# ============================================================================
# ส่วนที่ 6: ตัวอย่าง - Monthly Average
# ============================================================================

"""
ถ้าต้องการ Monthly Average แทน Raw Images:

def get_monthly_ndvi(month):
    monthly = ndvi_collection.filter(
        ee.Filter.calendarRange(month, month, 'month'))
    return monthly.mean().set('month', month)

months = ee.List.sequence(1, 12)
monthly_ndvi = ee.ImageCollection(months.map(get_monthly_ndvi))
"""

print("\nOptional: Create monthly average instead of raw images")


# ============================================================================
# ส่วนที่ 7: Export Data เป็น CSV (Advanced)
# ============================================================================

"""
ถ้าต้องการดึงค่า NDVI ตัวเลขออกมาเป็น DataFrame/CSV:

import pandas as pd

data = []
for i in range(count):
    img = ndvi_collection.toList(count).get(i)
    val = ee.Image(img).reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=roi_buffer,
        scale=10).getInfo()
    timestamp = ee.Image(img).get('system:time_start').getInfo()
    data.append({
        'timestamp': timestamp,
        'ndvi': val.get('NDVI', None)
    })

df = pd.DataFrame(data)
df.to_csv('ndvi_timeseries.csv', index=False)
print(df)
"""

print("✓ Data available for export (see code for CSV export example)")


# ============================================================================
# ส่วนที่ 8: Interactive Map กับ Point Selection
# ============================================================================

print("\nCreating interactive map for visualization...")

Map = geemap.Map(center=[14.0, 100.5], zoom=12)

# เพิ่ม NDVI layer ล่าสุด
latest_ndvi = ndvi_collection.mosaic()
ndvi_vis = {
    'min': 0,
    'max': 1,
    'palette': ['red', 'yellow', 'green']
}

Map.addLayer(latest_ndvi, ndvi_vis, 'NDVI 2024')

# เพิ่ม ROI buffer เพื่อแสดงว่าดู area ไหน
Map.addLayer(
    ee.Image().paint(roi_buffer, 0, 2),
    {'palette': ['blue']},
    'Analysis Area (500m buffer)'
)

print("✓ Interactive map created")


# ============================================================================
# Display
# ============================================================================

print("\n" + "="*70)
print("TIME SERIES CHART READY!")
print("="*70)
print(f"""
✓ NDVI Time Series Chart สร้างเสร็จแล้ว

Data Summary:
- Location: Chao Phraya River, Bangkok
- Period: 2024 (Full Year)
- Images: {count} cloud-free Sentinel-2 scenes
- Resolution: 10 meters
- Reducer: Mean (average)

ลักษณะของกราฟ:
1. X-axis: วันที่ (Date)
2. Y-axis: NDVI value (-1 to +1)
3. Trend: ควรเห็น seasonal pattern
   - ลดลง: ช่วงเก็บเกี่ยว
   - เพิ่มขึ้น: ช่วงปลูก/เจริญเติบโต

Applications:
✓ Crop monitoring - ติดตามสุขภาพพืช
✓ Drought detection - ตรวจจับภัยแล้ง
✓ Flood monitoring - เมื่อ NDVI < 0 = น้ำเพิ่ม
✓ Yield prediction - คาดการณ์ผลผลิต
""")

# แสดง Chart
print("\nChart preview:")
plt.show()

# แสดง Map
print("\nInteractive map:")
Map
