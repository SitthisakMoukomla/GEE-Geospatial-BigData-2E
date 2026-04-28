#!/usr/bin/env python3
"""
บทที่ 11: การใช้ GEE กับ Python & geemap
==========================================

Ch11_01_setup_colab.py — Setup และ Authentication
ตั้งแต่ติดตั้ง geemap ไปจนถึง Authenticate และ Initialize GEE ใน Colab และ Local

Colab: https://colab.research.google.com
Local: conda create -n gee python=3.12 && conda activate gee && pip install geemap

Author: geemap tutorial
Date: 2025
Language: Thai
"""

# ============================================================================
# ส่วนที่ 1: ติดตั้ง geemap ใน Google Colab (ถ้าไม่มีติดตั้งมา)
# ============================================================================

# ทำในเซลล์แรกของ Colab (uncomment ถ้า geemap ยังไม่ติดตั้ง):
# !pip install geemap


# ============================================================================
# ส่วนที่ 2: Import libraries
# ============================================================================

import ee
import geemap
import sys

print("Python version:", sys.version)
print("Earth Engine version:", ee.__version__)
print("geemap version:", geemap.__version__)


# ============================================================================
# ส่วนที่ 3: Authenticate กับ Google Account
# ============================================================================

"""
วิธีที่ 1: Browser-Based Authentication (สำหรับ Colab และ Interactive use)
========================================================================
เปิด browser ให้ login ด้วย Google account แล้วได้ token กลับมา
"""

print("\n[1] Authenticating with Google Account...")
try:
    ee.Authenticate()
    print("✓ Authentication successful!")
except Exception as e:
    print(f"✗ Authentication failed: {e}")


# ============================================================================
# ส่วนที่ 4: Initialize GEE ด้วย Cloud Project ID
# ============================================================================

"""
ตั้งแต่ปี 2025 ต้องระบุ Cloud Project ID เมื่อ Initialize
ไม่สามารถใช้ ee.Initialize() เปล่าๆ ได้อีกต่อไป

โปรแกรมหา Project ID ของคุณได้ที่:
- Google Cloud Console: https://console.cloud.google.com
- โครงการเริ่มต้น: "earthengine-legacy"
"""

PROJECT_ID = 'your-cloud-project-id'  # ⚠️ เปลี่ยนเป็น Project ID ของคุณ

print(f"\n[2] Initializing Earth Engine with project: {PROJECT_ID}")
try:
    ee.Initialize(project=PROJECT_ID)
    print("✓ Earth Engine initialized successfully!")
except Exception as e:
    print(f"✗ Initialization failed: {e}")
    print("Tips: ตรวจสอบ Project ID ที่ https://console.cloud.google.com")


# ============================================================================
# ส่วนที่ 5: ทดสอบว่า GEE ทำงานได้
# ============================================================================

print("\n[3] Testing Earth Engine connection...")
try:
    # ทดสอบโหลด dataset เล็กน้อย
    image = ee.Image('USGS/SRTMGL1_003')
    info = image.getInfo()
    print("✓ Earth Engine is working!")
    print(f"  Loaded image: {info['id']}")
except Exception as e:
    print(f"✗ Test failed: {e}")


# ============================================================================
# ส่วนที่ 6: สร้างแผนที่ Interactive ครั้งแรก
# ============================================================================

print("\n[4] Creating interactive map...")

# สร้างแผนที่ centered ที่กรุงเทพฯ
Map = geemap.Map(center=[13.75, 100.5], zoom=8)

# โหลด Sentinel-2 True Color
sentinel2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(ee.Geometry.Point(100.5, 13.75))
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .median())

vis_params = {
    'bands': ['B4', 'B3', 'B2'],
    'min': 0,
    'max': 3000
}

Map.addLayer(sentinel2, vis_params, 'Sentinel-2 True Color')

# Display แผนที่ (ใน Colab จะแสดงออกมาเอง)
print("✓ Map created successfully!")
print("  Center: [13.75, 100.5] (Bangkok)")
print("  Zoom: 8")
print("  Layer: Sentinel-2 True Color 2025")

# แสดงแผนที่ใน Colab
Map


# ============================================================================
# ส่วนที่ 7: ทางเลือก - Service Account Authentication (สำหรับ Automation)
# ============================================================================

"""
ใช้สำหรับ automation/scheduled tasks ที่รันโดยไม่มีคนดูแล
ต้องมี Service Account key file (.json)

ขั้นตอน:
1. ไปที่ Google Cloud Console: https://console.cloud.google.com
2. สร้าง Service Account
3. สร้าง Key (JSON format)
4. Download key file
5. ใช้ code ด้านล่าง
"""

# การใช้ Service Account (commented out):
# credentials = ee.ServiceAccountCredentials(
#     'your-sa@your-project.iam.gserviceaccount.com',
#     'path/to/key.json')
# ee.Initialize(credentials, project='your-project-id')


# ============================================================================
# สรุป (Summary)
# ============================================================================

print("\n" + "="*70)
print("SETUP COMPLETE!")
print("="*70)
print("""
✓ เรียบร้อยแล้ว! คุณพร้อมใช้ GEE ด้วย Python

ขั้นตอนต่อไป:
1. เปลี่ยน 'your-cloud-project-id' เป็น Project ID จริงของคุณ
2. รัน code นี้ใน Colab ให้ Authenticate
3. ไปทำ Ch11_02 สำหรับแผนที่ Interactive ขั้นสูง

Resources:
- GEE Python API Docs: https://developers.google.com/earth-engine/apidocs
- geemap Documentation: https://geemap.org
- GEE Developer Guide: https://developers.google.com/earth-engine/guides
""")
