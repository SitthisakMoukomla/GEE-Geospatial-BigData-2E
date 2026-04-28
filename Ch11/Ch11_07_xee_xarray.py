#!/usr/bin/env python3
"""
บทที่ 11: การใช้ GEE กับ Python & geemap
==========================================

Ch11_07_xee_xarray.py — Xee: Earth Engine + Xarray Integration

Xee เป็น library ใหม่ที่ทำให้เปิด Earth Engine dataset ผ่าน Xarray ได้เลย
เหมาะสำหรับ Data Scientist ที่คุ้นเคยกับ Xarray/pandas อยู่แล้ว

ข้อดี: ตัดขั้นตอน export ออก ใช้ lazy loading
ข้อเสีย: ช้ากว่า geemap สำหรับ visualization แบบ interactive

Author: geemap tutorial
Date: 2025
Language: Thai
"""

import ee
import xarray as xr
import numpy as np
import matplotlib.pyplot as plt

# ============================================================================
# Setup
# ============================================================================

PROJECT_ID = 'your-cloud-project-id'  # เปลี่ยนเป็น Project ID ของคุณ
ee.Initialize(project=PROJECT_ID)

print("Initializing Xee/Xarray integration...")
print("Note: pip install xee (if not installed)\n")


# ============================================================================
# ส่วนที่ 1: ความแตกต่างระหว่างวิธี Traditional vs Xee
# ============================================================================

comparison = """
Traditional GEE Workflow:
=========================
1. Write GEE code (JavaScript/Python API)
2. Export image to Google Drive / GCS
3. Download file to local
4. Open with rasterio/xarray
5. Analyze with pandas/numpy

Xee Workflow (New):
===================
1. Write GEE code (Python API)
2. Open directly with xr.open_dataset(engine='ee')
3. Analyze with xarray (lazy loading)
4. No download needed!

Benefits of Xee:
================
✓ No export step (faster iteration)
✓ Lazy loading (ใช้เมื่อต้องการ)
✓ Native xarray operations (groupby, resample, rolling, etc.)
✓ Memory efficient (don't load whole dataset)
✓ Seamless integration with dask/pandas/numpy
"""

print(comparison)


# ============================================================================
# ส่วนที่ 2: ติดตั้ง Xee (if needed)
# ============================================================================

print("Installation (uncomment if needed):")
print("# pip install xee")
print()


# ============================================================================
# ส่วนที่ 3: Load Data ด้วย Xee
# ============================================================================

print("="*70)
print("Example 1: Load Landsat 9 with Xee")
print("="*70)

# กำหนด ROI
roi = ee.Geometry.Rectangle([100.0, 13.5, 101.0, 14.5])

# Create Landsat 9 ImageCollection
landsat_collection = (ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterDate('2025-01-01', '2025-06-30')
    .filterBounds(roi)
    .filter(ee.Filter.lt('QA_PIXEL', 600)))

print(f"✓ Loaded Landsat 9 collection: {landsat_collection.size().getInfo()} images")

# Open with Xarray using Xee engine
print("\nOpening with Xarray (Lazy Loading)...")

try:
    ds = xr.open_dataset(
        landsat_collection,
        engine='ee',
        scale=30,  # 30m resolution
        geometry=roi,
        crs='EPSG:4326'
    )

    print("✓ Dataset opened successfully!")
    print(f"\nDataset info:")
    print(ds)
    print(f"\nVariables: {list(ds.data_vars)}")
    print(f"Dimensions: {dict(ds.dims)}")

except Exception as e:
    print(f"⚠️ Error opening dataset: {e}")
    print("Tips: ตรวจสอบ xee installation และ ROI")


# ============================================================================
# ส่วนที่ 4: Compute NDVI ด้วย Xarray Syntax
# ============================================================================

print("\n" + "="*70)
print("Example 2: NDVI Calculation with Xarray")
print("="*70)

try:
    # NDVI = (NIR - RED) / (NIR + RED)
    # Landsat: NIR = SR_B5, RED = SR_B4

    print("Computing NDVI: (B5 - B4) / (B5 + B4)")

    ndvi = (ds['SR_B5'] - ds['SR_B4']) / (ds['SR_B5'] + ds['SR_B4'])

    print("✓ NDVI computed!")
    print(f"  Shape: {ndvi.shape}")
    print(f"  Type: {type(ndvi)}")

    # ข้อมูล Lazy Loading — ยังไม่คำนวณจริง
    print("  (Data is still lazy — not computed until needed)")

except Exception as e:
    print(f"Error: {e}")


# ============================================================================
# ส่วนที่ 5: Temporal Resampling
# ============================================================================

print("\n" + "="*70)
print("Example 3: Monthly NDVI Average")
print("="*70)

try:
    # Resample ให้เป็น monthly mean
    monthly_ndvi = ndvi.resample(time='1M').mean()

    print("✓ Resampled to monthly averages")
    print(f"  Original shape: {ndvi.shape}")
    print(f"  Monthly shape: {monthly_ndvi.shape}")

except Exception as e:
    print(f"Error: {e}")


# ============================================================================
# ส่วนที่ 6: Spatial Operations
# ============================================================================

print("\n" + "="*70)
print("Example 4: Spatial Operations (Mean within ROI)")
print("="*70)

try:
    # Compute mean NDVI across space (for each time step)
    ndvi_mean = ndvi.mean(dim=['x', 'y'])

    print("✓ Computed spatial mean (averaged over x, y)")
    print(f"  Result shape: {ndvi_mean.shape}")
    print(f"  Type: {type(ndvi_mean)}")

    # ยังต้องเรียก .compute() เพื่อเห็นผลจริง
    print("\nNote: To see actual values, call .compute():")
    print("  values = ndvi_mean.compute()")

except Exception as e:
    print(f"Error: {e}")


# ============================================================================
# ส่วนที่ 7: Advanced Xarray Operations
# ============================================================================

advanced_ops = """
Advanced Xarray Operations you can do:
======================================

1. GroupBy (Grouped operations):
   >>> monthly = ndvi.groupby('time.month').mean()
   >>> quarterly = ndvi.groupby('time.quarter').mean()

2. Rolling (Moving average):
   >>> rolling_mean = ndvi.rolling(time=3, center=True).mean()

3. Where (Conditional selection):
   >>> ndvi_healthy = ndvi.where(ndvi > 0.5)

4. Interpolate (Fill gaps):
   >>> filled = ndvi.interpolate_na(dim='time')

5. Normalize (Standardize):
   >>> normalized = (ndvi - ndvi.mean()) / ndvi.std()

6. Resample (Change frequency):
   >>> yearly = ndvi.resample(time='1Y').mean()
   >>> quarterly = ndvi.resample(time='3M').mean()

7. Assign (Add new variable):
   >>> ds = ds.assign(ndvi=ndvi)

8. Stacking/Unstacking:
   >>> stacked = ndvi.stack(space=('x', 'y'))
   >>> unstacked = stacked.unstack('space')

Key: All operations are lazy until .compute()!
"""

print(advanced_ops)


# ============================================================================
# ส่วนที่ 8: Export to NetCDF/CSV
# ============================================================================

export_example = """
Export Results:
===============

1. Export to NetCDF (for HDF5-like format):
   >>> ds.to_netcdf('output.nc')

2. Export to CSV (time series):
   >>> values = ndvi_mean.compute()
   >>> df = values.to_pandas()
   >>> df.to_csv('ndvi_timeseries.csv')

3. Export to GeoTIFF (for GIS):
   >>> ndvi_computed = ndvi.compute()
   >>> rasterio.open('ndvi.tif', 'w', ...).write(ndvi_computed.values)
"""

print(export_example)


# ============================================================================
# ส่วนที่ 9: Visualization
# ============================================================================

print("\n" + "="*70)
print("Example 5: Visualization")
print("="*70)

viz_example = """
Plotting with Matplotlib:
=========================

1. Single timestep:
   >>> ndvi_first = ndvi.isel(time=0).compute()
   >>> plt.imshow(ndvi_first, cmap='RdYlGn')
   >>> plt.show()

2. Time series:
   >>> ndvi_mean = ndvi.mean(dim=['x','y']).compute()
   >>> ndvi_mean.plot()
   >>> plt.show()

3. Faceted plot (multiple timesteps):
   >>> ndvi.isel(time=slice(0,12)).compute().plot(col='time', col_wrap=3)
   >>> plt.show()

Note: Xarray visualization is static (not interactive like geemap)
      For interactive maps, still use geemap!
"""

print(viz_example)


# ============================================================================
# ส่วนที่ 10: Performance Considerations
# ============================================================================

performance = """
Performance Tips:
=================

1. Lazy Loading:
   - Operations are not computed until .compute()
   - Good for memory (don't load whole array)
   - Can chain operations before computing

2. Scale/Resolution:
   - Use appropriate scale parameter (30, 100, 1000 meters)
   - Don't use too fine resolution for large areas
   - Affects both speed and data size

3. Chunking:
   - Xarray can chunk data for parallel processing
   - Use with dask for large computations

4. Spatial Subset:
   - Filter spatially before opening (via ROI parameter)
   - Smaller ROI = faster processing

5. Temporal Subset:
   - Filter by date before opening collection
   - Fewer time steps = faster

Example (Optimized):
```python
# GOOD: Filter first, then open
roi_small = ee.Geometry.Rectangle([100.2, 13.6, 100.3, 13.7])
collection_filtered = (
    ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterDate('2025-01-01', '2025-03-31')  # 3 months only
    .filterBounds(roi_small)
)
ds = xr.open_dataset(collection_filtered, engine='ee', scale=100)

# BAD: Open everything, then filter
ds_all = xr.open_dataset(collection_unfiltered, engine='ee')
ds = ds_all.sel(time=slice('2025-01-01', '2025-03-31'))
```
"""

print(performance)


# ============================================================================
# ส่วนที่ 11: When to Use Xee vs geemap
# ============================================================================

comparison_full = """
Xee vs geemap — When to Use Which?
===================================

Use Xee when:
✓ You need xarray-style operations (groupby, resample, rolling)
✓ You want to export to NetCDF/HDF5
✓ You're familiar with xarray/dask
✓ You need reproducible data processing pipeline
✓ You want lazy loading (memory efficient)

Use geemap when:
✓ You need interactive visualization
✓ You want quick prototyping with UI
✓ You need layer control and basemaps
✓ You want to export to GeoJSON/Shapefile
✓ You need split-panel comparisons

Combination Workflow (Recommended):
===================================
1. Explore & visualize with geemap (interactive)
2. Process & analyze with Xee (xarray operations)
3. Export results for GIS with geemap or rasterio
"""

print(comparison_full)


# ============================================================================
# ส่วนที่ 12: Complete Example - NDVI Time Series Analysis
# ============================================================================

complete_example = """
Complete Example: Monthly NDVI Analysis (Xee Workflow)
======================================================

import ee
import xarray as xr
import pandas as pd

# Setup
ee.Initialize(project='your-project')

# Define ROI
roi = ee.Geometry.Rectangle([100.0, 13.5, 101.0, 14.5])

# Load Landsat
collection = (ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterDate('2025-01-01', '2025-12-31')
    .filterBounds(roi))

# Open with Xee
ds = xr.open_dataset(collection, engine='ee', scale=30, geometry=roi)

# Compute NDVI
ndvi = (ds['SR_B5'] - ds['SR_B4']) / (ds['SR_B5'] + ds['SR_B4'])

# Monthly average
monthly_ndvi = ndvi.resample(time='1M').mean()

# Spatial mean
monthly_mean = monthly_ndvi.mean(dim=['x','y']).compute()

# Export to pandas
df = monthly_mean.to_pandas()
df.to_csv('monthly_ndvi.csv')

# Plot
df.plot()
plt.show()

# Done! No GCS download needed!
"""

print(complete_example)


# ============================================================================
# Display Summary
# ============================================================================

print("\n" + "="*70)
print("XEE/XARRAY INTEGRATION READY!")
print("="*70)
print("""
✓ Xee library อยู่ในระบบ

ข้อดี Xee:
- ไม่ต้อง export → download cycle
- Native xarray operations
- Lazy loading (memory efficient)
- Seamless with pandas/dask/numpy

ข้อเสีย Xee:
- ช้ากว่า geemap สำหรับ visualization
- ต้องรู้ xarray syntax
- ยังอยู่ในระหว่าง development

Recommendation:
===============
ใช้ Xee สำหรับ:
- Data science / statistical analysis
- Time series processing
- Exporting to NetCDF/HDF5
- Batch processing scripts

ใช้ geemap สำหรับ:
- Interactive exploration
- Quick visualization
- Map creation
- GIS operations

Resources:
- Xee Docs: https://xee.readthedocs.io
- Xarray Docs: https://docs.xarray.dev
- GEE Python API: https://developers.google.com/earth-engine/apidocs
""")
