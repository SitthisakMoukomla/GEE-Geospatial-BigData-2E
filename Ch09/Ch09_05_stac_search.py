#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ch09_05_stac_search.py
STAC API Search with pystac_client
ค้นหาข้อมูล Sentinel-2 ผ่าน STAC API (Planetary Computer)

ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
วันที่: 2025
"""

import os
import sys
from datetime import datetime
import pandas as pd

try:
    from pystac_client import Client
except ImportError:
    print("ต้องติดตั้ง: pip install pystac-client")
    sys.exit(1)

# ============================================
# 1. เชื่อมต่อ STAC Catalog (Planetary Computer)
# ============================================
print("=== STAC API Search Example ===")
print("Connecting to Planetary Computer STAC Catalog...")

catalog = Client.open('https://planetarycomputer.microsoft.com/api/stac/v1')
print(f"Connected to: {catalog.description}")

# ============================================
# 2. กำหนดพารามิเตอร์การค้นหา
# ============================================

# พื้นที่: กรุงเทพฯ (bbox: west, south, east, north)
bbox = [100.0, 13.5, 101.0, 14.5]

# ช่วงเวลา: 2025 January - June
datetime_range = '2025-01-01/2025-06-30'

# เลือก Collection: Sentinel-2 Level 2A
collections = ['sentinel-2-l2a']

print(f"Search parameters:")
print(f"  Area: Bangkok bbox {bbox}")
print(f"  Date: {datetime_range}")
print(f"  Collections: {collections}")

# ============================================
# 3. ค้นหาข้อมูลผ่าน STAC API
# ============================================

print("\nSearching STAC API...")

search = catalog.search(
    collections=collections,
    bbox=bbox,
    datetime=datetime_range,
    query={
        'eo:cloud_cover': {'lt': 20}  # Cloud cover น้อยกว่า 20%
    }
)

# ดึง items (ข้อมูลที่ match)
items = list(search.items())
print(f"พบ {len(items)} ภาพ Sentinel-2")

# ============================================
# 4. แสดงข้อมูล Items
# ============================================

if len(items) > 0:
    print("\n=== First 10 Items ===")
    data_list = []

    for i, item in enumerate(items[:10]):
        print(f"\n[{i+1}] {item.id}")
        print(f"  Date: {item.datetime.date()}")
        print(f"  Cloud Cover: {item.properties.get('eo:cloud_cover', 'N/A'):.1f}%")
        print(f"  Instrument: {item.properties.get('platform', 'N/A')}")

        # เก็บข้อมูลไว้สำหรับ DataFrame
        data_list.append({
            'id': item.id,
            'date': item.datetime.date(),
            'cloud_cover': item.properties.get('eo:cloud_cover', None),
            'platform': item.properties.get('platform', None),
            'processing_level': item.properties.get('processing:level', None)
        })

    # ============================================
    # 5. สร้าง DataFrame จาก Items
    # ============================================

    df = pd.DataFrame(data_list)
    print("\n=== Statistics ===")
    print(f"Total images: {len(items)}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"Mean cloud cover: {df['cloud_cover'].mean():.1f}%")
    print(f"Min cloud cover: {df['cloud_cover'].min():.1f}%")
    print(f"Max cloud cover: {df['cloud_cover'].max():.1f}%")

    # ============================================
    # 6. ใช้งาน Asset URLs
    # ============================================

    print("\n=== Assets Example (First Image) ===")
    first_item = items[0]

    for asset_key, asset_obj in first_item.assets.items():
        print(f"  {asset_key}: {asset_obj.title}")
        # ตัวอย่าง asset keys: TCI, B02, B03, B04, B05, B08, B11, B12, etc.

    # ============================================
    # 7. ดึง Asset URLs
    # ============================================

    print(f"\n=== Asset URLs (First Image) ===")
    first_url = first_item.assets['TCI'].href  # True Color Image
    print(f"TCI (True Color) URL: {first_url}")

    # ตัวอย่าง: สามารถใช้ URL นี้กับ rasterio, GDAL, หรือ GEE
    print("URLs can be used with:")
    print("  - rasterio.open(url)")
    print("  - ee.Image.loadGeoTIFF(url) in GEE")
    print("  - GDAL virtual filesystem /vsicurl/")

    # ============================================
    # 8. Save as CSV for further processing
    # ============================================

    csv_file = '/tmp/sentinel2_stac_search.csv'
    df.to_csv(csv_file, index=False)
    print(f"\nSaved to: {csv_file}")
    print(df.to_string())

else:
    print("ไม่พบข้อมูลที่ตรงกับเงื่อนไข")

# ============================================
# 9. Advanced: Filter by additional properties
# ============================================

print("\n=== Advanced Query Example ===")

# ค้นหาเฉพาะ images ที่ดี (cloud cover < 10%)
advanced_search = catalog.search(
    collections=['sentinel-2-l2a'],
    bbox=bbox,
    datetime=datetime_range,
    query={
        'eo:cloud_cover': {'lt': 10},  # Very low cloud cover
        'platform': {'eq': 'sentinel-2a'}  # Only Sentinel-2A
    }
)

advanced_items = list(advanced_search.items())
print(f"Found {len(advanced_items)} high-quality images (cloud < 10%, S2A only)")

# ============================================
# 10. STAC Collections Available
# ============================================

print("\n=== Popular STAC Collections ===")
print("Available at Planetary Computer:")
print("  - sentinel-1-rtc: Sentinel-1 SAR")
print("  - sentinel-2-l2a: Sentinel-2 Level 2A")
print("  - landsat-c2-l2: Landsat Collection 2")
print("  - naip: National Agriculture Imagery Program (USA)")
print("  - dem: Digital Elevation Models")
print("  - alos-dem: ALOS DEM")
print("  - gebco: GEBCO Bathymetry")
print("  - mcd43a4: MODIS BRDF")
print("\nFor full list, visit: https://planetarycomputer.microsoft.com")

# ============================================
# 11. Tips for Using STAC with GEE
# ============================================

print("\n=== Using STAC URLs in GEE ===")
print("Workflow:")
print("1. Use pystac_client to search STAC catalog (Python)")
print("2. Get asset URLs from items")
print("3. In GEE JavaScript, use:")
print("   var image = ee.Image.loadGeoTIFF(url);")
print("4. Process as normal GEE image")
print("\nBenefit: Access to cloud-native formats (COG) without downloading")

print("\n=== End of STAC Search Example ===")
