#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ch09_06_cloud_native_python.py
Cloud-Native Geospatial: COG, GeoParquet, Zarr Examples
Python examples สำหรับ cloud-native formats

ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
วันที่: 2025
"""

import os
import sys
import numpy as np
import pandas as pd

print("=== Cloud-Native Geospatial (Python) ===\n")

# ============================================
# 1. COG (Cloud-Optimized GeoTIFF)
# ============================================

print("--- 1. COG (Cloud-Optimized GeoTIFF) ---")

try:
    import rasterio
    from rasterio.windows import from_bounds
    print("✓ rasterio installed")

    # อ่าน COG ผ่าน URL โดยไม่ต้องดาวน์โหลดทั้งไฟล์
    # HTTP Range Requests เดือก data บางส่วนจากเซิร์ฟเวอร์

    url = 'https://example.com/sentinel2/B04.tif'
    print(f"Example: Reading COG from {url}")
    print("Code example (don't run without valid URL):")
    print("""
    with rasterio.open(url) as src:
        # อ่านเฉพาะ window ที่ต้องการ
        from rasterio.windows import from_bounds
        window = from_bounds(100.4, 13.6, 100.6, 13.8, src.transform)
        data = src.read(1, window=window)
        print(f'Shape: {data.shape}, Downloaded: {data.nbytes / 1024:.0f} KB')
    """)

except ImportError:
    print("! rasterio not installed: pip install rasterio")

# ============================================
# 2. GeoParquet (Vector Data)
# ============================================

print("\n--- 2. GeoParquet (Vector Data) ---")

try:
    import geopandas as gpd
    print("✓ geopandas installed")

    # สร้างตัวอย่าง GeoParquet
    print("\nExample: Reading GeoParquet file")
    print("""
    # GeoParquet เร็วกว่า Shapefile 10-50 เท่า สำหรับ big data
    gdf = gpd.read_parquet('buildings_thailand.parquet')
    print(f'Buildings: {len(gdf):,} records')
    print(f'CRS: {gdf.crs}')

    # Filter สมาชิก
    urban_buildings = gdf[gdf['building_type'] == 'residential']
    print(f'Residential: {len(urban_buildings):,}')

    # Save เป็น GeoParquet
    gdf.to_parquet('output.parquet')
    """)

    # ============================================
    # สร้างตัวอย่าง GeoParquet
    # ============================================

    from shapely.geometry import Point, box
    import geopandas as gpd
    from shapely.geometry import Polygon

    # สร้าง sample data
    print("\nCreating sample GeoParquet...")

    buildings = {
        'name': ['Building A', 'Building B', 'Building C'],
        'type': ['residential', 'commercial', 'residential'],
        'floors': [5, 10, 3],
        'geometry': [
            Point(100.5, 13.7).buffer(100),
            Point(100.51, 13.71).buffer(150),
            Point(100.52, 13.72).buffer(80)
        ]
    }

    gdf = gpd.GeoDataFrame(buildings, crs='EPSG:4326')
    print(f"Sample GeoDataFrame: {len(gdf)} features")
    print(gdf[['name', 'type', 'floors']])

    # Save เป็น GeoParquet
    parquet_file = '/tmp/buildings_sample.parquet'
    gdf.to_parquet(parquet_file)
    print(f"Saved to: {parquet_file}")

    # Read back
    gdf_read = gpd.read_parquet(parquet_file)
    print(f"Read back: {len(gdf_read)} features")

except ImportError:
    print("! geopandas not installed: pip install geopandas pyarrow")

# ============================================
# 3. Zarr (Array Data / Time Series)
# ============================================

print("\n--- 3. Zarr (Array Data) ---")

try:
    import xarray as xr
    import zarr
    print("✓ xarray and zarr installed")

    print("\nExample: Reading Zarr time series")
    print("""
    # Zarr = chunked array storage ใน cloud (GCS, S3)
    # อ่านเฉพาะ chunk ที่ต้องการ ไม่ต้องดาวน์โหลดทั้ง dataset

    ds = xr.open_zarr('gs://bucket/era5_hourly.zarr')

    # Select location and time
    bangkok = ds['temperature_2m'].sel(
        longitude=100.5,
        latitude=13.75,
        method='nearest'
    )

    # Resample to monthly
    monthly = bangkok.resample(time='1M').mean() - 273.15  # K to C
    monthly.plot()
    """)

    # ============================================
    # สร้าง sample Zarr
    # ============================================

    print("\nCreating sample Zarr array...")

    # Create time series data
    times = pd.date_range('2025-01-01', '2025-06-30', freq='D')
    temps = 20 + 10 * np.sin(np.arange(len(times)) * 2 * np.pi / 365)  # Seasonal variation
    temps += np.random.normal(0, 2, len(times))  # Add noise

    ds = xr.Dataset({
        'temperature': (['time'], temps),
        'humidity': (['time'], 60 + 20 * np.sin(np.arange(len(times)) * 2 * np.pi / 365))
    }, coords={'time': times})

    zarr_file = '/tmp/weather_sample.zarr'
    ds.to_zarr(zarr_file, mode='w')
    print(f"Saved to: {zarr_file}")

    # Read back
    ds_read = xr.open_zarr(zarr_file)
    print(f"Dataset variables: {list(ds_read.data_vars)}")
    print(f"Time range: {ds_read.time.min().values} to {ds_read.time.max().values}")

    # Monthly resample
    monthly = ds_read['temperature'].resample(time='M').mean()
    print(f"Monthly average temperatures:\n{monthly.values}")

except ImportError:
    print("! xarray or zarr not installed: pip install xarray zarr")

# ============================================
# 4. STAC Catalog Metadata
# ============================================

print("\n--- 4. STAC Catalog (Metadata) ---")

try:
    from pystac_client import Client
    print("✓ pystac_client installed")

    print("\nExample: Discover datasets via STAC")
    print("""
    from pystac_client import Client

    catalog = Client.open('https://planetarycomputer.microsoft.com/api/stac/v1')
    search = catalog.search(
        collections=['sentinel-2-l2a'],
        bbox=[100.0, 13.5, 101.0, 14.5],
        datetime='2025-01-01/2025-06-30',
        query={'eo:cloud_cover': {'lt': 20}}
    )

    items = list(search.items())
    print(f'Found {len(items)} images')

    # Access asset URLs
    for item in items[:3]:
        url = item.assets['B04'].href  # Red band
        print(f'{item.datetime.date()}: {url}')
    """)

except ImportError:
    print("! pystac_client not installed: pip install pystac-client")

# ============================================
# 5. Format Comparison Table
# ============================================

print("\n--- 5. Format Comparison ---")

comparison_data = {
    'Format': ['GeoTIFF', 'COG', 'NetCDF/HDF5', 'Zarr', 'Shapefile', 'GeoParquet'],
    'Type': ['Raster', 'Raster', 'Array', 'Array', 'Vector', 'Vector'],
    'Cloud-Native': ['No', 'Yes', 'No', 'Yes', 'No', 'Yes'],
    'HTTP Range Req': ['No', 'Yes', 'No', 'Yes', 'No', 'No'],
    'Compression': ['Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes'],
    'Size Efficiency': ['Medium', 'High', 'Medium', 'High', 'Low', 'Very High'],
    'Use Case': [
        'Local analysis',
        'Cloud storage',
        'Climate data',
        'Time series',
        'GIS files',
        'Big tabular data'
    ]
}

df_comparison = pd.DataFrame(comparison_data)
print("\n" + df_comparison.to_string(index=False))

# ============================================
# 6. Workflow: GEE → Cloud-Native → Analysis
# ============================================

print("\n--- 6. Recommended Workflow ---")

print("""
1. EXPORT from GEE:
   Export.image.toCloudStorage({
     formatOptions: {cloudOptimized: true}
   }) → COG file (gs://bucket/output.tif)

2. READ with Python:
   import rasterio
   with rasterio.open('gs://bucket/output.tif') as src:
       data = src.read()

3. CONVERT to Cloud-Native:
   - COG: Already cloud-native
   - Vector → GeoParquet: gdf.to_parquet()
   - TimeSeries → Zarr: ds.to_zarr()

4. ANALYZE in Python:
   - Use pandas, xarray, rasterio
   - Direct cloud storage access
   - No need to download

5. PUBLISH:
   - Serve COG via Cloud CDN
   - Query GeoParquet via BigQuery
   - Stream Zarr via Cloud Functions
""")

# ============================================
# 7. Cost-Benefit Analysis
# ============================================

print("\n--- 7. Cost-Benefit Analysis ---")

print("""
Traditional Workflow (GeoTIFF + Shapefile):
  ❌ Download to local (network I/O)
  ❌ Store locally (disk space)
  ❌ Process locally (CPU time)
  ❌ Re-analyze = re-download
  Cost: High (bandwidth + storage + compute)

Cloud-Native Workflow (COG + GeoParquet + Zarr):
  ✓ Data stays in cloud
  ✓ Read only needed chunks (HTTP Range)
  ✓ Compute in cloud (Cloud Run, Vertex AI)
  ✓ Reuse from cache
  Cost: Low (cloud storage + compute only)

Cloud-Native Format Benefits:
  • 10-100x faster access
  • Reduced bandwidth (range requests)
  • Parallel access (tiling)
  • Standardized metadata (STAC)
  • Ecosystem compatibility
""")

print("\n=== End of Cloud-Native Examples ===")
