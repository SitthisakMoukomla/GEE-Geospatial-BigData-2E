#!/usr/bin/env python3
"""
บทที่ 11: การใช้ GEE กับ Python & geemap
==========================================

Ch11_08_streamlit_app.py — Streamlit Web App: NDVI Explorer

สร้าง Web App ให้คนอื่นใช้งาน ผ่าน Streamlit (no coding needed!)
ไม่ต้องใช้ GEE Code Editor หรือ Jupyter Notebook

Run: streamlit run app.py

Deploy: ขึ้น Streamlit Cloud (Free!)
- https://share.streamlit.io

Author: geemap tutorial
Date: 2025
Language: Thai
"""

import streamlit as st
import ee
import geemap.foliumap as geemap
from datetime import date

# ============================================================================
# Page Configuration
# ============================================================================

st.set_page_config(
    page_title="NDVI Explorer - Thailand",
    page_icon="🗺️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================================
# Title & Description
# ============================================================================

st.title("🗺️ NDVI Explorer - Thailand")

st.markdown("""
### Vegetation Index Monitoring for Precision Agriculture

Monitor vegetation health across Thailand using satellite imagery.
Select date range and location to visualize NDVI (Normalized Difference Vegetation Index).

**NDVI Range:**
- **Red (< 0.3):** Bare soil, water, or built-up areas
- **Yellow (0.3-0.6):** Sparse vegetation
- **Green (> 0.6):** Dense, healthy vegetation

*Powered by Google Earth Engine & geemap*
""")

# ============================================================================
# Sidebar: User Input
# ============================================================================

st.sidebar.header("⚙️ Configuration")

# Date range selection
col1, col2 = st.sidebar.columns(2)
with col1:
    start_date = st.date_input(
        "Start Date",
        value=date(2025, 1, 1),
        min_value=date(2015, 1, 1),
        max_value=date(2025, 6, 30)
    )

with col2:
    end_date = st.date_input(
        "End Date",
        value=date(2025, 6, 30),
        min_value=date(2015, 1, 1),
        max_value=date(2025, 6, 30)
    )

# Location selection (preset locations)
location = st.sidebar.selectbox(
    "Select Location",
    options=[
        "Bangkok (Chao Phraya)",
        "Chiang Mai (Northern Plains)",
        "Northeastern Region (Isan)",
        "Central Region",
        "Southern Region"
    ],
    index=0
)

# Map location coordinates
locations = {
    "Bangkok (Chao Phraya)": {
        "center": [13.75, 100.5],
        "zoom": 10,
        "roi": ee.Geometry.Rectangle([100.3, 13.5, 100.9, 14.0])
    },
    "Chiang Mai (Northern Plains)": {
        "center": [18.8, 98.9],
        "zoom": 9,
        "roi": ee.Geometry.Rectangle([98.2, 18.2, 99.5, 19.5])
    },
    "Northeastern Region (Isan)": {
        "center": [16.5, 103.5],
        "zoom": 8,
        "roi": ee.Geometry.Rectangle([101.0, 14.0, 106.0, 18.0])
    },
    "Central Region": {
        "center": [14.5, 101.0],
        "zoom": 8,
        "roi": ee.Geometry.Rectangle([99.5, 13.5, 102.5, 15.5])
    },
    "Southern Region": {
        "center": [8.0, 100.5],
        "zoom": 8,
        "roi": ee.Geometry.Rectangle([99.0, 6.5, 102.0, 9.5])
    }
}

loc_config = locations[location]

# Cloud cover filter
cloud_cover = st.sidebar.slider(
    "Max Cloud Cover (%)",
    min_value=0,
    max_value=100,
    value=20,
    step=5
)

# Data source selection
data_source = st.sidebar.radio(
    "Data Source",
    options=["Sentinel-2 (10m)", "Landsat 8/9 (30m)"],
    index=0
)

st.sidebar.markdown("---")

# ============================================================================
# Setup Earth Engine
# ============================================================================

PROJECT_ID = 'your-cloud-project-id'  # เปลี่ยนเป็น Project ID ของคุณ

# Initialize EE (one-time per session)
if 'ee_initialized' not in st.session_state:
    try:
        ee.Initialize(project=PROJECT_ID)
        st.session_state.ee_initialized = True
    except Exception as e:
        st.error(f"❌ Error initializing Earth Engine: {e}")
        st.stop()

# ============================================================================
# Load and Process Data
# ============================================================================

@st.cache_data
def load_data(data_source, start_date, end_date, roi, cloud_cover):
    """Load satellite data from GEE"""

    if data_source == "Sentinel-2 (10m)":
        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterDate(start_date.isoformat(), end_date.isoformat())
            .filterBounds(roi)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloud_cover)))

        image = collection.median()

        # NDVI = (B8 - B4) / (B8 + B4)
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        true_color = image.select(['B4', 'B3', 'B2'])

    else:  # Landsat 8/9
        collection = (ee.ImageCollection('LANDSAT/LC08_C02_T1_L2')
            .merge(ee.ImageCollection('LANDSAT/LC09_C02_T1_L2'))
            .filterDate(start_date.isoformat(), end_date.isoformat())
            .filterBounds(roi)
            .filter(ee.Filter.lt('QA_PIXEL', 600)))

        image = collection.median()

        # NDVI = (B5 - B4) / (B5 + B4) for Landsat
        ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
        true_color = image.select(['SR_B4', 'SR_B3', 'SR_B2'])

    return image, ndvi, true_color, collection.size().getInfo()

# ============================================================================
# Main Content
# ============================================================================

with st.spinner('Loading satellite data...'):
    image, ndvi, true_color, image_count = load_data(
        data_source,
        start_date,
        end_date,
        loc_config['roi'],
        cloud_cover
    )

# Display metrics
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Images Found", image_count, "scenes")
with col2:
    st.metric("Date Range", f"{start_date.strftime('%d %b')} - {end_date.strftime('%d %b')}")
with col3:
    st.metric("Cloud Filter", f"< {cloud_cover}%", "coverage")

st.markdown("---")

# ============================================================================
# Create Interactive Map
# ============================================================================

st.subheader("🌱 NDVI Map")

Map = geemap.Map(
    center=loc_config['center'],
    zoom=loc_config['zoom'],
    height=600
)

# Visualization parameters for NDVI
ndvi_vis = {
    'min': -1,
    'max': 1,
    'palette': ['red', 'yellow', 'green']
}

# Visualization for True Color
true_color_vis = {
    'bands': ['SR_B4', 'SR_B3', 'SR_B2'] if data_source == "Landsat 8/9 (30m)" else ['B4', 'B3', 'B2'],
    'min': 0,
    'max': 3000,
    'gamma': 1.2
}

# Add layers
Map.addLayer(true_color, true_color_vis, 'True Color RGB')
Map.addLayer(ndvi, ndvi_vis, 'NDVI Index')

# Add layer control
Map.add_basemap('CartoDB positron')
Map.add_basemap('SATELLITE')

# Display map
Map.to_streamlit(height=600)

# ============================================================================
# Statistics & Analysis
# ============================================================================

st.subheader("📊 NDVI Statistics")

# Reduce NDVI to get mean value
stats = ndvi.reduceRegion(
    reducer=ee.Reducer.mean(),
    geometry=loc_config['roi'],
    scale=10 if data_source == "Sentinel-2 (10m)" else 30
).getInfo()

ndvi_mean = stats.get('NDVI', None)

if ndvi_mean is not None:
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Mean NDVI", f"{ndvi_mean:.3f}", "-1 to +1 scale")

    # Add percentile analysis
    stats_advanced = ndvi.reduceRegion(
        reducer=ee.Reducer.percentile([25, 50, 75]),
        geometry=loc_config['roi'],
        scale=10 if data_source == "Sentinel-2 (10m)" else 30
    ).getInfo()

    with col2:
        st.metric("Median NDVI", f"{stats_advanced.get('NDVI_p50', 0):.3f}", "50th percentile")

    with col3:
        st.metric("75th Percentile", f"{stats_advanced.get('NDVI_p75', 0):.3f}", "High vegetation")

# ============================================================================
# Interpretation
# ============================================================================

st.subheader("📖 How to Read NDVI")

col1, col2 = st.columns(2)

with col1:
    st.markdown("""
    **NDVI Values & Meanings:**

    | NDVI Range | Interpretation |
    |---|---|
    | < 0.0 | Water bodies |
    | 0.0 - 0.3 | Built-up, bare soil |
    | 0.3 - 0.5 | Sparse vegetation |
    | 0.5 - 0.7 | Moderate vegetation |
    | > 0.7 | Dense, healthy vegetation |
    """)

with col2:
    st.markdown("""
    **Use Cases:**

    ✓ **Precision Agriculture**
      Monitor crop health weekly

    ✓ **Drought Detection**
      Track vegetation stress

    ✓ **Forest Monitoring**
      Detect deforestation

    ✓ **Urban Planning**
      Green space mapping
    """)

# ============================================================================
# About & Help
# ============================================================================

st.sidebar.markdown("---")

st.sidebar.subheader("ℹ️ About")

st.sidebar.markdown("""
**NDVI Explorer**

Vegetation monitoring tool for Thailand using Google Earth Engine.

**Data Sources:**
- Sentinel-2: 10m resolution, 5-day revisit
- Landsat 8/9: 30m resolution, 8-day revisit

**Technology:**
- Google Earth Engine
- geemap (Python)
- Streamlit

**Learn More:**
- [GEE Docs](https://developers.google.com/earth-engine)
- [geemap Docs](https://geemap.org)
- [Streamlit Docs](https://docs.streamlit.io)
""")

# ============================================================================
# Footer
# ============================================================================

st.markdown("""
---
*Powered by [Google Earth Engine](https://earthengine.google.com) & [geemap](https://geemap.org)*

*Deploy this app on [Streamlit Cloud](https://share.streamlit.io) for free!*
""")

# ============================================================================
# Notes for Deployment
# ============================================================================

"""
Deployment Instructions:
========================

1. Prepare Files:
   - Save this file as app.py
   - Create requirements.txt:
     ee
     geemap
     streamlit
     folium

2. Push to GitHub:
   - Create GitHub repo
   - Push app.py and requirements.txt

3. Deploy on Streamlit Cloud:
   - Go to https://share.streamlit.io
   - Connect your GitHub repo
   - Select this app.py
   - Click Deploy!
   - Get a free URL like: https://your-app.streamlit.app

4. For Authentication:
   - Use Service Account JSON (recommended for production)
   - Set as environment variable: GOOGLE_APPLICATION_CREDENTIALS
   - Or use secrets.toml in .streamlit/ folder

Important: สำหรับ deployment จริง ควรใช้ Service Account
           แทน browser-based authentication
"""
