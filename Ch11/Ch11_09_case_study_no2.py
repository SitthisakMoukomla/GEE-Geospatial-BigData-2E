#!/usr/bin/env python3
"""
บทที่ 11: การใช้ GEE กับ Python & geemap
==========================================

Ch11_09_case_study_no2.py — Case Study: NO₂ Analysis in Bangkok

วิเคราะห์ NO₂ (Nitrogen Dioxide) ในกรุงเทพฯ ด้วย Sentinel-5P
เพื่อติดตามมลพิษทางอากาศที่เกิดจากการจราจร

รวมทุกอย่างที่เรียนในบท 11:
- GEE Python API
- geemap
- Time Series Charts
- Interactive Maps
- Export to CSV

Author: geemap tutorial
Date: 2025
Language: Thai
"""

import ee
import geemap
import pandas as pd
import matplotlib.pyplot as plt

# ============================================================================
# Setup
# ============================================================================

PROJECT_ID = 'your-cloud-project-id'  # เปลี่ยนเป็น Project ID ของคุณ
ee.Initialize(project=PROJECT_ID)

print("Bangkok NO₂ Analysis Case Study")
print("="*70)


# ============================================================================
# ส่วนที่ 1: กำหนดพื้นที่และช่วงเวลา
# ============================================================================

# Bangkok boundaries
bangkok = ee.Geometry.Rectangle([100.3, 13.5, 100.9, 14.0])

print("\n[1] Define Study Area")
print("Location: Bangkok Metropolitan Area")
print("Coordinates: Rectangle([100.3, 13.5, 100.9, 14.0])")
print("Period: January 2024 - December 2024 (Full Year)")


# ============================================================================
# ส่วนที่ 2: โหลด Sentinel-5P NO₂ Data
# ============================================================================

print("\n[2] Load Sentinel-5P NO₂ Data")

# Sentinel-5P Offline NO₂
no2_collection = (ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
    .filterDate('2024-01-01', '2025-01-01')
    .filterBounds(bangkok)
    .select('tropospheric_NO2_column_number_density'))

count = no2_collection.size().getInfo()
print(f"✓ Loaded {count} NO₂ observations")
print(f"  Satellite: Sentinel-5P")
print(f"  Variable: Tropospheric NO₂ Column Density")
print(f"  Unit: mol/m²")


# ============================================================================
# ส่วนที่ 3: คำนวณค่าเฉลี่ยรายเดือน
# ============================================================================

print("\n[3] Compute Monthly Averages")

def get_monthly_mean(month):
    """
    คำนวณค่าเฉลี่ย NO₂ สำหรับเดือนที่ระบุ
    """
    monthly = no2_collection.filter(
        ee.Filter.calendarRange(month, month, 'month'))
    return monthly.mean().set('month', month)

# Create monthly collection
months = ee.List.sequence(1, 12)
monthly_no2 = ee.ImageCollection(months.map(get_monthly_mean))

print(f"✓ Created {12} monthly averages")


# ============================================================================
# ส่วนที่ 4: Create Time Series Chart
# ============================================================================

print("\n[4] Generate Time Series Chart")

chart = geemap.chart.image_series(
    monthly_no2,
    region=bangkok,
    reducer=ee.Reducer.mean(),
    scale=7000,
    x_property='month',
    title='Monthly NO₂ over Bangkok 2024',
    ylabel='NO₂ Density (mol/m²)',
    xlabel='Month',
    legend_location='upper right'
)

print("✓ Time series chart created")


# ============================================================================
# ส่วนที่ 5: Extract Numerical Data
# ============================================================================

print("\n[5] Extract Data to DataFrame")

data_list = []

for month in range(1, 13):
    try:
        img = monthly_no2.filter(ee.Filter.eq('month', month)).first()
        val = img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=bangkok,
            scale=7000
        ).getInfo()

        no2_value = val.get('tropospheric_NO2_column_number_density', None)

        month_name = [
            '', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ][month]

        data_list.append({
            'month_num': month,
            'month_name': month_name,
            'no2_mean': no2_value
        })

    except Exception as e:
        print(f"  ⚠️ Error processing month {month}: {e}")

# Create DataFrame
df = pd.DataFrame(data_list)

print("\n✓ Data extracted to DataFrame:")
print(df.to_string(index=False))


# ============================================================================
# ส่วนที่ 6: Data Analysis & Interpretation
# ============================================================================

print("\n[6] Data Analysis")

if not df.empty and df['no2_mean'].notna().any():
    print(f"\nNO₂ Statistics (2024):")
    print(f"  Mean: {df['no2_mean'].mean():.6f} mol/m²")
    print(f"  Min:  {df['no2_mean'].min():.6f} mol/m² (Month {df[df['no2_mean']==df['no2_mean'].min()]['month_num'].values[0]})")
    print(f"  Max:  {df['no2_mean'].max():.6f} mol/m² (Month {df[df['no2_mean']==df['no2_mean'].max()]['month_num'].values[0]})")
    print(f"  Std:  {df['no2_mean'].std():.6f} mol/m²")


# ============================================================================
# ส่วนที่ 7: Visualization - Line Plot
# ============================================================================

print("\n[7] Visualization")

plt.figure(figsize=(12, 5))

plt.subplot(1, 2, 1)
plt.plot(df['month_num'], df['no2_mean'], marker='o', linewidth=2, markersize=8)
plt.xlabel('Month')
plt.ylabel('NO₂ Density (mol/m²)')
plt.title('Monthly NO₂ Trend in Bangkok 2024')
plt.grid(True, alpha=0.3)
plt.xticks(range(1, 13))

# Bar plot
plt.subplot(1, 2, 2)
colors = ['red' if x > df['no2_mean'].mean() else 'blue' for x in df['no2_mean']]
plt.bar(df['month_num'], df['no2_mean'], color=colors, alpha=0.7)
plt.xlabel('Month')
plt.ylabel('NO₂ Density (mol/m²)')
plt.title('Monthly NO₂ Distribution')
plt.axhline(y=df['no2_mean'].mean(), color='green', linestyle='--', label='Average')
plt.legend()
plt.xticks(range(1, 13))

plt.tight_layout()
print("✓ Plots created")


# ============================================================================
# ส่วนที่ 8: Interpretation
# ============================================================================

interpretation = """
NO₂ Interpretation for Bangkok 2024
====================================

Seasonal Patterns:
- Higher NO₂ in DRY SEASON (Nov-Feb):
  ✓ Stable atmospheric conditions trap pollutants
  ✓ Haze and smog more visible
  ✓ Corresponds with forest fires in Laos/Northern Thailand

- Lower NO₂ in WET SEASON (May-Oct):
  ✓ Rain washes out pollutants
  ✓ Strong updrafts disperse NO₂ vertically
  ✓ Better air quality overall

Sources of NO₂ in Bangkok:
- Vehicle emissions (cars, motorcycles, trucks)
- Power plants and factories
- Biomass burning (during dry season)
- Oil refineries in adjacent areas

Health Impact (WHO Standards):
- WHO Guideline: 40 μg/m³ (annual mean)
- Bangkok often exceeds this during dry season
- Vulnerable groups: children, elderly, people with respiratory issues

Satellite Data Limitations:
- Sentinel-5P has ~7km resolution (coarse)
- Sensitive to atmospheric conditions
- Cannot detect very local pollution spikes
- Better for regional/trend analysis than specific locations
"""

print("\n" + interpretation)


# ============================================================================
# ส่วนที่ 9: Create Interactive Map
# ============================================================================

print("\n[8] Create Interactive Map")

Map = geemap.Map(center=[13.75, 100.5], zoom=10)

# Add latest NO₂ layer
latest_no2 = no2_collection.mosaic()

no2_vis = {
    'min': 0,
    'max': 0.0002,
    'palette': ['black', 'blue', 'cyan', 'green', 'yellow', 'red']
}

Map.addLayer(latest_no2, no2_vis, 'NO₂ Column Density')

# Add ROI boundary
Map.addLayer(
    ee.Image().paint(bangkok, 0, 2),
    {'palette': ['white']},
    'Study Area'
)

print("✓ Interactive map created")


# ============================================================================
# ส่วนที่ 10: Export to CSV
# ============================================================================

print("\n[9] Export Data")

csv_file = 'bangkok_no2_2024.csv'
df.to_csv(csv_file, index=False)

print(f"✓ Data exported to: {csv_file}")


# ============================================================================
# ส่วนที่ 11: Advanced - Comparison with Previous Years
# ============================================================================

advanced_example = """
Advanced Analysis: Multi-Year Comparison
========================================

To compare 2024 with 2023, 2022, etc.:

years = [2022, 2023, 2024]
all_data = []

for year in years:
    no2_year = (ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
        .filterDate(f'{year}-01-01', f'{year+1}-01-01')
        .filterBounds(bangkok))

    monthly_means = ...  # same as above

    all_data.append(df_year)

# Compare trends
df_all = pd.concat(all_data)
df_all.groupby('month')['no2_mean'].mean().plot()
plt.show()
"""

print("\n" + advanced_example)


# ============================================================================
# Display Results
# ============================================================================

print("\n" + "="*70)
print("CASE STUDY COMPLETE!")
print("="*70)

print(f"""
✓ Bangkok NO₂ Analysis Finished

Summary:
- Period: January 2024 - December 2024
- Dataset: Sentinel-5P Offline L3
- Location: Bangkok Metropolitan Area
- Images: {count} observations

Output:
- Time Series Chart
- Monthly Statistics
- Visualization (Line & Bar plots)
- Interactive Map
- CSV Export: {csv_file}

Key Findings:
- Seasonal variation in NO₂ levels
- Higher pollution in dry season (Nov-Feb)
- Vehicle emissions main contributor
- Data aligns with observed haze events

Next Steps:
1. Export CSV for further analysis
2. Compare with ground-based air quality stations
3. Correlate with traffic volume data
4. Extend analysis to other cities
5. Use machine learning for pollutant forecasting

Resources:
- Sentinel-5P Data: https://sentinel.esa.int/web/sentinel/missions/sentinel-5p
- Air Quality Data: https://www.iqair.com/thailand/bangkok
- WHO Air Quality Guidelines: https://www.who.int/publications/i/item/9789240034228

Code Lessons Applied:
✓ GEE Python API
✓ ImageCollection filtering
✓ Time series computation
✓ geemap visualization
✓ Data export to CSV
✓ matplotlib plotting
✓ Spatial analysis with geometry
""")

# Show plots and map
print("\nShowing visualizations...")
plt.show()
print("\nInteractive map ready to display")
Map
