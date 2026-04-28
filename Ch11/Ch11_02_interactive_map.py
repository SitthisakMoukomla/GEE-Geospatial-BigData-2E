#!/usr/bin/env python3
"""
บทที่ 11: การใช้ GEE กับ Python & geemap
==========================================

Ch11_02_interactive_map.py — Interactive Map พร้อม Layer Control

สร้างแผนที่ Interactive โดยใช้ Sentinel-2 และลาง Control
ท่านสามารถเลือก/ปิด Layer, Zoom, Pan, วัดระยะทาง เป็นต้น

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

print("Initializing interactive map with Sentinel-2 layers...")


# ============================================================================
# ส่วนที่ 1: สร้างแผนที่พื้นฐาน
# ============================================================================

# สร้างแผนที่ centered ที่กรุงเทพฯ
Map = geemap.Map(center=[13.75, 100.5], zoom=10)

print("✓ Map created at Bangkok (13.75, 100.5)")


# ============================================================================
# ส่วนที่ 2: โหลด Sentinel-2 ระหว่างวันที่
# ============================================================================

# กำหนดพื้นที่สนใจ (Bangkok area)
roi = ee.Geometry.Point(100.5, 13.75).buffer(30000)

# โหลด Sentinel-2 Collection 2
s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))

# สร้าง cloud-free composite (median)
s2_median = s2_collection.median()

print(f"✓ Loaded {s2_collection.size().getInfo()} Sentinel-2 images")


# ============================================================================
# ส่วนที่ 3: สร้าง Visualization Parameters สำหรับ Layer ต่างๆ
# ============================================================================

# True Color RGB (Red-Green-Blue)
rgb_vis = {
    'bands': ['B4', 'B3', 'B2'],
    'min': 0,
    'max': 3000,
    'gamma': 1.0
}

# False Color (NIR-Red-Green) — ท่าเห็นพืช
false_color_vis = {
    'bands': ['B8', 'B4', 'B3'],
    'min': 0,
    'max': 3000,
    'gamma': 1.0
}

# NDVI (Normalized Difference Vegetation Index)
ndvi = s2_median.normalizedDifference(['B8', 'B4']).rename('NDVI')
ndvi_vis = {
    'min': -1,
    'max': 1,
    'palette': ['red', 'yellow', 'green']
}

# NDBI (Normalized Difference Built-up Index) — เมืองและโครงสร้าง
ndbi = s2_median.normalizedDifference(['B11', 'B8']).rename('NDBI')
ndbi_vis = {
    'min': -0.5,
    'max': 0.5,
    'palette': ['blue', 'white', 'red']
}

# NDWI (Normalized Difference Water Index) — น้ำ
ndwi = s2_median.normalizedDifference(['B3', 'B8']).rename('NDWI')
ndwi_vis = {
    'min': -1,
    'max': 1,
    'palette': ['brown', 'white', 'blue']
}

print("✓ Created visualization parameters for 5 layers")


# ============================================================================
# ส่วนที่ 4: เพิ่ม Layer ลงแผนที่
# ============================================================================

Map.addLayer(s2_median, rgb_vis, 'Sentinel-2 True Color')
print("  Added: True Color (RGB)")

Map.addLayer(s2_median, false_color_vis, 'Sentinel-2 False Color (NIR-R-G)')
print("  Added: False Color (NIR-Red-Green)")

Map.addLayer(ndvi, ndvi_vis, 'NDVI - Vegetation Index')
print("  Added: NDVI")

Map.addLayer(ndbi, ndbi_vis, 'NDBI - Built-up Index')
print("  Added: NDBI")

Map.addLayer(ndwi, ndwi_vis, 'NDWI - Water Index')
print("  Added: NDWI")


# ============================================================================
# ส่วนที่ 5: เพิ่ม Basemap ต่างๆ
# ============================================================================

# geemap มี basemap หลายตัว
Map.add_basemap('SATELLITE')  # Satellite imagery
Map.add_basemap('OpenStreetMap.Mapnik')  # OpenStreetMap
Map.add_basemap('CartoDB positron')  # Simple map

print("✓ Added multiple basemaps")


# ============================================================================
# ส่วนที่ 6: เพิ่ม Layer Control
# ============================================================================

# สามารถเลือก/ปิด/เปิด Layer ผ่าน Layer Control ใน UI
# Basemap Switcher อยู่ที่มุมบนซ้าย
# Layer Control อยู่ที่มุมบนขวา

print("✓ Layer control enabled")


# ============================================================================
# ส่วนที่ 7: สิ่งที่สามารถทำได้ในแผนที่ Interactive
# ============================================================================

"""
Interactive Features ที่ geemap Map มี:
1. Zoom & Pan — ลากเมาส์เพื่อ pan, scroll เพื่อ zoom
2. Layer Toggle — click ที่ checkbox เพื่อ on/off layer
3. Basemap Switcher — dropdown ที่มุมบนซ้าย
4. Measure Tool — วัดระยะทาง/พื้นที่
5. Draw & Edit — วาด geometry (point, line, polygon)
6. Inspect Pixel — click เพื่อดูค่า pixel
7. Search Widget — ค้นหาที่อยู่
8. Full Screen — ดูแผนที่เต็มจอ
9. Export — export แผนที่เป็น PNG/SVG
10. 3D View — ดูแผนที่ 3D (ถ้าติดตั้ง)
"""

print("""
✓ Interactive features available:
  - Zoom & Pan (scroll & drag)
  - Layer Control (checkbox on right)
  - Basemap Switcher (dropdown on left)
  - Measure Tool, Draw, Inspect Pixel
  - Search, Full Screen, Export
""")


# ============================================================================
# ส่วนที่ 8: ทำให้เห็นสิ่งที่อยู่ใต้ Layer ด้วย Opacity
# ============================================================================

"""
สามารถปรับ Opacity ของ Layer เพื่อให้เห็นชั้นข้างล่าง
ใน Colab UI สามารถปรับโดยลากมาเลื่อน slider
"""

# Opacity อยู่ใน Layer Control (right side panel)
print("✓ Layer opacity adjustable via UI")


# ============================================================================
# ส่วนที่ 9: เพิ่ม Text Label (Label for Layers)
# ============================================================================

# Label แสดงไว้ชื่อแต่ละ layer แล้วใน addLayer

print("Layer names (visible in Layer Control):")
print("  1. Sentinel-2 True Color")
print("  2. Sentinel-2 False Color (NIR-R-G)")
print("  3. NDVI - Vegetation Index")
print("  4. NDBI - Built-up Index")
print("  5. NDWI - Water Index")


# ============================================================================
# ส่วนที่ 10: Display แผนที่
# ============================================================================

print("\n" + "="*70)
print("INTERACTIVE MAP READY!")
print("="*70)
print("""
✓ แผนที่ Ready สำหรับใช้งาน

ลองทำสิ่งต่อไปนี้:
1. กด Layer Control (ช่องโครงข่ายที่มุมบนขวา) เลือก/ปิด Layer
2. เปลี่ยน Basemap ด้วย dropdown ที่มุมบนซ้าย
3. Zoom เข้า/ออกด้วย scroll บน Satellite layer
4. ใช้ Measure tool วัดพื้นที่พืช/เมือง
5. Click ที่ pixel เพื่อดูค่า NDVI/NDBI/NDWI

Tips:
- False Color ดีสำหรับการมองพืช (เขียว = พืชเยอะ)
- NDVI ดีสำหรับติดตามสุขภาพพืช
- NDBI ดีสำหรับเห็นการขยายตัวของเมือง
- NDWI ดีสำหรับเห็นน้ำ/ระบายน้ำ
""")

# Display map
Map
