#!/usr/bin/env python3
"""
บทที่ 11: การใช้ GEE กับ Python & geemap
==========================================

Ch11_03_split_panel.py — Split-Panel Map Comparison

สร้างแผนที่ที่ใช้ Split-Panel เพื่อเปรียบเทียบภาพ 2 ช่วงเวลา
ลากตรงกลางเพื่อเปรียบเทียบการเปลี่ยนแปลง (before-after comparison)

ตัวอย่าง: Landsat 2015 vs 2025

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

print("Initializing split-panel map for before-after comparison...")


# ============================================================================
# ส่วนที่ 1: กำหนดพื้นที่ (ROI)
# ============================================================================

# ตัวอย่าง: สนามบินสวรรณภูมิ (Suvarnabhumi Airport) กรุงเทพฯ
# ใช้ Landsat เพราะมีข้อมูลตั้งแต่ปี 2015 มากพอ

roi = ee.Geometry.Rectangle([100.7, 13.65, 100.85, 13.85])

print(f"✓ ROI: Suvarnabhumi Airport area")
print(f"  Coordinates: {roi.getInfo()['coordinates']}")


# ============================================================================
# ส่วนที่ 2: โหลด Landsat 8 ปี 2015
# ============================================================================

# Landsat 8 C2 SR (Surface Reflectance)
landsat_2015 = (ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2015-01-01', '2015-12-31')
    .filterBounds(roi)
    .filter(ee.Filter.lt('QA_PIXEL', 600))  # ตัวกรอง Cloud/Shadow
    .median())

print("✓ Loaded Landsat 8 2015")


# ============================================================================
# ส่วนที่ 3: โหลด Landsat 9 ปี 2025
# ============================================================================

# Landsat 9 C2 SR (ใช้เดียวกับ Landsat 8 เกือบหมด)
landsat_2025 = (ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('QA_PIXEL', 600))
    .median())

print("✓ Loaded Landsat 9 2025")


# ============================================================================
# ส่วนที่ 4: สร้าง Visualization Parameters
# ============================================================================

# Landsat C2 ใช้ SR_B4, SR_B3, SR_B2 สำหรับ RGB
vis_params = {
    'bands': ['SR_B4', 'SR_B3', 'SR_B2'],
    'min': 0,
    'max': 20000,
    'gamma': 1.2
}

print("✓ Created visualization parameters (True Color RGB)")


# ============================================================================
# ส่วนที่ 5: สร้าง Split-Panel Map
# ============================================================================

# สร้าง geemap Map object
Map = geemap.Map()

# ใช้ split_map() method สำหรับ split-panel view
Map.split_map(
    left_layer=landsat_2015,
    right_layer=landsat_2025,
    left_vis=vis_params,
    right_vis=vis_params,
    left_label='Landsat 8 - 2015',
    right_label='Landsat 9 - 2025',
    zoom=10,
    center=[13.75, 100.775]
)

print("✓ Split-panel map created")


# ============================================================================
# ส่วนที่ 6: เพิ่ม Basemap
# ============================================================================

# Basemap จะแสดงด้านหลังข้อมูล Landsat
Map.add_basemap('SATELLITE')

print("✓ Added satellite basemap")


# ============================================================================
# ส่วนที่ 7: Explanation ของสิ่งที่เห็น
# ============================================================================

"""
Split-Panel Features:
========================

ลากตรงกลาง (divider line) เพื่อเปรียบเทียบ 2 ภาพ

ในตัวอย่างนี้คุณจะเห็น:
- ซ้าย (2015): สนามบินเก่าๆ มี runway, terminal, parking area
- ขวา (2025): สนามบินขยายตัว มี runway ใหม่, terminal ใหม่

Things to look for:
1. ตำแหน่ง Runway เปลี่ยนไหม?
2. Terminal expansion ไปทางไหน?
3. Parking lot ขยายตัวไปไหน?
4. การขยายตัวของเมืองรอบๆ สนามบิน?

False Color (NIR-R-G):
If you want to add false color instead, use:
  bands: ['SR_B5', 'SR_B4', 'SR_B3']
จะเห็นพืชได้ชัดขึ้น
"""

print("""
Split-Panel Comparison Tips:
============================
✓ ลากตรงกลาง (divider) เพื่อเปรียบเทียบ
✓ Zoom เข้า/ออกเพื่อดูรายละเอียดต่างๆ
✓ ลองดูการขยายตัวของ runway/terminal/parking
✓ สังเกตการเปลี่ยนแปลงรอบๆ สนามบิน

สิ่งที่น่าสังเกต (Observable Changes):
✓ Runway orientation และจำนวน
✓ Terminal building expansion
✓ Parking lot growth
✓ Road network expansion
✓ Urban development around airport
""")


# ============================================================================
# ส่วนที่ 8: ตัวอย่าง Advanced - 3 Dates Comparison
# ============================================================================

"""
ถ้าต้องการเปรียบเทียบ 3 ช่วงเวลา สามารถสร้าง Map หลายตัว

Example:
--------
# 2010
landsat_2010 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')...

# สร้าง 2 Map สำหรับเปรียบเทียบ
Map1 = geemap.Map()
Map1.split_map(landsat_2010, landsat_2015, ...)

Map2 = geemap.Map()
Map2.split_map(landsat_2015, landsat_2025, ...)
"""


# ============================================================================
# ส่วนที่ 9: ทำให้โปร่งใส (Opacity Adjustment)
# ============================================================================

"""
ใน geemap UI สามารถปรับ opacity ของแต่ละ layer
ใน split-panel view โดยใช้ Layer Control
"""

print("✓ Opacity adjustable via Layer Control (right panel)")


# ============================================================================
# Display Map
# ============================================================================

print("\n" + "="*70)
print("SPLIT-PANEL MAP READY!")
print("="*70)
print("""
✓ แผนที่เปรียบเทียบ Split-Panel Ready

สิ่งที่ควรลอง:
1. ลากเส้นแบ่งตรงกลางไปมา เพื่อเปรียบเทียบ
2. Zoom เข้าดูรายละเอียดเล็กๆ (runway, terminal)
3. Pan ไปรอบๆ สนามบิน ดูการขยายตัว
4. สังเกตถนนใหม่ที่สร้าง
5. เปรียบเทียบ parking area ว่าขยายตัวไปไหน

Data:
- Left: Landsat 8 2015 (10 ปีที่แล้ว)
- Right: Landsat 9 2025 (ปัจจุบัน)
- Resolution: 30 meters
- Area: Suvarnabhumi Airport, Bangkok
""")

Map
