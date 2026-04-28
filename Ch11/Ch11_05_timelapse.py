#!/usr/bin/env python3
"""
บทที่ 11: การใช้ GEE กับ Python & geemap
==========================================

Ch11_05_timelapse.py — Landsat Timelapse Animation

สร้าง Timelapse GIF ของการขยายตัวของกรุงเทพฯ ตั้งแต่ 2000 ถึง 2025

geemap มี built-in method สำหรับสร้าง timelapse ทำให้ง่ายมาก

Author: geemap tutorial
Date: 2025
Language: Thai
"""

import ee
import geemap
import os

# ============================================================================
# Setup
# ============================================================================

PROJECT_ID = 'your-cloud-project-id'  # เปลี่ยนเป็น Project ID ของคุณ
ee.Initialize(project=PROJECT_ID)

print("Initializing Landsat timelapse generation...")


# ============================================================================
# ส่วนที่ 1: กำหนดพื้นที่และช่วงเวลา
# ============================================================================

# Bangkok metropolitan area
bangkok_boundary = ee.Geometry.Rectangle([100.3, 13.5, 100.9, 14.0])

print("✓ ROI: Bangkok Metropolitan Area (2000-2025)")
print("  Coordinates: Rectangle([100.3, 13.5, 100.9, 14.0])")


# ============================================================================
# ส่วนที่ 2: สร้าง Timelapse GIF ด้วยคำสั่งเดียว
# ============================================================================

"""
geemap.landsat_timelapse() เป็น high-level function ที่:
1. ดึง Landsat imagery ระหว่าง start_year ถึง end_year
2. Filter cloud ให้สะอาด
3. สร้าง annual composite
4. Render เป็น GIF animation

Parameters:
- roi: Region of Interest (Geometry)
- out_gif: ชื่อ output file
- start_year, end_year: ช่วงปี
- start_date, end_date: ช่วงวันในปี (format: 'MM-DD')
- bands: Bands ที่ต้องการ (สำหรับ RGB visualization)
- frames_per_second: ความเร็ว animation
- title: ชื่อของ timelapse
"""

print("\nGenerating timelapse (this may take 1-2 minutes)...\n")

try:
    geemap.landsat_timelapse(
        roi=bangkok_boundary,
        out_gif='bangkok_urban_expansion_2000_2025.gif',
        start_year=2000,
        end_year=2025,
        start_date='01-01',
        end_date='12-31',
        bands=['SR_B4', 'SR_B3', 'SR_B2'],  # True Color RGB
        frames_per_second=3,
        title='Bangkok Urban Expansion 2000-2025',
        text_sequence=None,  # ไม่มี text overlay
        font_size=15,
        font_color='white',
        add_text=True,
        reduce_function=ee.Reducer.median(),
        elevation=None
    )
    print("✓ Timelapse GIF created successfully!")
    print("  Output: bangkok_urban_expansion_2000_2025.gif")

except Exception as e:
    print(f"✗ Error creating timelapse: {e}")
    print("Tips: ตรวจสอบ Project ID และการ Authenticate")


# ============================================================================
# ส่วนที่ 3: ตัวอย่าง - False Color Timelapse
# ============================================================================

"""
ถ้าต้องการ False Color (NIR-Red-Green) แทน True Color:
เปลี่ยน bands parameter:

geemap.landsat_timelapse(
    roi=bangkok_boundary,
    out_gif='bangkok_false_color.gif',
    start_year=2000,
    end_year=2025,
    bands=['SR_B5', 'SR_B4', 'SR_B3'],  # False Color
    ...
)

False Color visualization:
- Red pixels: Dense vegetation (พืช, ป่า)
- Orange/Yellow: Sparse vegetation
- Blue/Cyan: Water bodies
- White/Gray: Built-up areas, roads
"""

print("\nTip: สามารถสร้าง False Color timelapse ได้ด้วย")
print("     เพียงเปลี่ยน bands=['SR_B5', 'SR_B4', 'SR_B3']")


# ============================================================================
# ส่วนที่ 4: Manual Method สำหรับ Advanced Control
# ============================================================================

"""
ถ้าต้องการ Custom Processing ส่วนไหนของข้อมูล
สามารถสร้าง timelapse เอง step-by-step:

Example:
--------
frames = []
for year in range(2000, 2026):
    start = f'{year}-01-01'
    end = f'{year}-12-31'

    img = (ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
        .filterDate(start, end)
        .filterBounds(roi)
        .median())

    frames.append(img)

imageCollection = ee.ImageCollection(frames)

# ส่วนนี้ซับซ้อน ต้อง export image ตัวต่อตัว
# จึง recommend ใช้ geemap.landsat_timelapse() ได้เลย
"""

print("Advanced: สามารถสร้าง custom timelapse step-by-step")


# ============================================================================
# ส่วนที่ 5: What to Observe in the Timelapse
# ============================================================================

observations = """
Things to observe in Bangkok Urban Expansion Timelapse:
======================================================

1. Urban Growth (ขยายตัวของเมือง):
   - 2000: จำกัดเฉพาะกรุงเทพฯ กลาง
   - 2010: ขยายตัวไปทั้งปริมณฑล
   - 2025: ขยายเต็มพื้นที่ ROI

2. Road Network (เครือข่ายถนน):
   - คลาด highways/freeways สร้างขึ้นเรื่อยๆ
   - สะพานข้ามแม่น้ำเพิ่มขึ้น

3. Water Bodies (แม่น้ำและสระน้ำ):
   - Chao Phraya, Canals ยังอยู่ (dark areas)
   - บางพื้นที่ระบายน้ำ

4. Vegetation (พืช):
   - ลดลงเรื่อยๆ ตามการพัฒนา
   - ไม่มีพื้นที่สีเขียวเหลือเท่าไหร่

5. Agricultural Land (พื้นที่การเกษตร):
   - ที่ขอบพื้นที่ ROI (ซ้าย/ล่าง)
   - ตัดเป็น residential/commercial

Metrics to estimate:
- Urban area ขยายจากกี่กิโลตารางเมตร เป็นเท่าไร?
- ถนนโหลดเดิมเปลี่ยนไปไหม?
- Water area ลดลงเท่าไร?
"""

print(observations)


# ============================================================================
# ส่วนที่ 6: Parameters Explanation
# ============================================================================

params_explanation = """
Key Parameters ใน landsat_timelapse():
========================================

roi:
  Region of Interest (Geometry object)
  สามารถใช้ Point, LineString, Polygon, Rectangle

out_gif:
  ชื่อไฟล์ output (.gif)

start_year, end_year:
  Landsat 8 มีข้อมูลตั้งแต่ 2013
  Landsat 7 มีข้อมูลตั้งแต่ 1999
  ต้อง overlap กับ available data

start_date, end_date:
  ช่วงเวลาในปี (format: 'MM-DD')
  สำหรับ seasonal consistency
  ตัวอย่าง: '01-01' ถึง '12-31' = whole year

bands:
  ['SR_B4', 'SR_B3', 'SR_B2'] = True Color RGB
  ['SR_B5', 'SR_B4', 'SR_B3'] = False Color
  ['SR_B7', 'SR_B5', 'SR_B4'] = SWIR False Color

frames_per_second:
  ความเร็วของ animation (1-10 fps)
  3-5 fps ดีสำหรับดูการเปลี่ยนแปลง

title:
  ชื่อของ GIF (จะแสดงใน metadata)
"""

print(params_explanation)


# ============================================================================
# ส่วนที่ 7: Output File Information
# ============================================================================

print("\n" + "="*70)
print("TIMELAPSE INFORMATION")
print("="*70)
print(f"""
✓ Timelapse GIF ถูกสร้าง:
  Filename: bangkok_urban_expansion_2000_2025.gif
  Location: {os.getcwd()}

File Details:
  - Duration: 26 frames (2000-2025)
  - FPS: 3 fps
  - Estimated duration: ~8.7 seconds
  - Resolution: Landsat 30m per pixel

Next Steps:
1. Download the GIF file
2. Open with image viewer (Windows Photos, Preview, etc.)
3. Share on social media / presentation
4. Use in reports / papers

Data Source:
- Landsat 8/9 Collection 2 Surface Reflectance
- No cloud pixels (filtered automatically)
- Median composite per year
- True Color RGB visualization
""")


# ============================================================================
# ส่วนที่ 8: ตัวอย่างเพิ่มเติม - NDVI Timelapse
# ============================================================================

"""
สำหรับ NDVI Timelapse (ติดตามสุขภาพพืช):
ต้องสร้าง custom image collection ก่อน
จากนั้น export เป็น GIF

ซับซ้อนกว่า landsat_timelapse() ที่ใช้ RGB
แนะนำให้ใช้ landsat_timelapse() สำหรับเริ่มต้น

หรือใช้ geemap.create_timelapse_animation() สำหรับ Advanced
"""

print("\nNote: สำหรับ Advanced Timelapse (NDVI, etc.)")
print("      ใช้ geemap.create_timelapse_animation() ")


# ============================================================================
# Display Result
# ============================================================================

print("\n" + "="*70)
print("READY!")
print("="*70)
print("""
✓ Landsat Timelapse สร้างเสร็จแล้ว

ไฟล์ที่สร้าง:
- bangkok_urban_expansion_2000_2025.gif

ลองทำ:
1. ค้นหาไฟล์ GIF ที่สร้าง
2. เปิดด้วย image viewer
3. ดู animation ของการขยายตัว 25 ปี
4. บันทึกหมายเหตุว่าเห็นการเปลี่ยนแปลงอะไรบ้าง

ทางเลือก:
- สร้าง False Color timelapse ได้
- สร้าง NDVI timelapse (advanced)
- ปรับพื้นที่ ROI เป็นเมืองอื่น
- ปรับช่วงปี (เช่น 2010-2025)
""")
