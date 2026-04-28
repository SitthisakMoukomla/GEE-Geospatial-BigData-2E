# Google Earth Engine for Geospatial Big Data — Second Edition
# โค้ดประกอบหนังสือ Google Earth Engine สำหรับ Geospatial Big Data — ฉบับปรับปรุง

> **ผู้เขียน:** อ.สิทธิศักดิ์ หมูคำหล้า
> **ภาษา:** โค้ดภาษาอังกฤษ / คอมเมนต์ภาษาไทย
> **จำนวนไฟล์:** 64 ไฟล์ | **17,482 บรรทัด**

---

## สารบัญโค้ด (Code Index)

| บท | หัวข้อ | ไฟล์ | ภาษา |
|----|--------|------|------|
| Ch01 | แพลตฟอร์ม GEE | 2 | JS |
| Ch02 | Data Catalog | 3 | JS |
| Ch03 | การรับรู้ระยะไกล | 2 | JS |
| Ch04 | Image Collection | 5 | JS |
| Ch05 | การจัดการข้อมูล | 5 | JS |
| Ch06 | การวิเคราะห์เชิงพื้นที่ | 6 | JS |
| Ch07 | แอปพลิเคชัน | 7 | JS |
| Ch08 | Machine Learning | 7 | JS |
| Ch09 | เทรนด์และเทคโนโลยี | 10 | JS + Python |
| Ch10 | AI & Generative AI | 6 | JS + Python |
| Ch11 | Python & geemap | 9 | Python |
| Ch12 | Quick Reference | 2 | JS + Python |

---

## วิธีใช้งาน (How to Use)

### JavaScript (Ch01–Ch10, Ch12)

1. เปิด [GEE Code Editor](https://code.earthengine.google.com)
2. สร้าง Script ใหม่
3. Copy โค้ดจากไฟล์ `.js` ที่ต้องการ แล้ววาง
4. กด **Run**

### Python (Ch09, Ch10, Ch11, Ch12)

**Google Colab (แนะนำสำหรับผู้เริ่มต้น):**
```python
!pip install geemap
import ee
ee.Authenticate()
ee.Initialize(project='your-cloud-project-id')
```

**Local Environment:**
```bash
conda create -n gee python=3.12
conda activate gee
pip install geemap streamlit xee
```

---

## โครงสร้างโฟลเดอร์ (Folder Structure)

```
Code/
├── Ch01/  แพลตฟอร์ม GEE
│   ├── Ch01_01_basic_javascript.js
│   └── Ch01_02_first_satellite_image.js
├── Ch02/  Data Catalog
│   ├── Ch02_01_dynamic_world.js
│   ├── Ch02_02_image_metadata.js
│   └── Ch02_03_common_datasets.js
├── Ch03/  การรับรู้ระยะไกล
│   ├── Ch03_01_sentinel1_sar_flood.js
│   └── Ch03_02_sentinel5p_no2.js
├── Ch04/  Image Collection
│   ├── Ch04_01_scale_factors.js
│   ├── Ch04_02_cloud_masking.js
│   ├── Ch04_03_complete_workflow.js
│   ├── Ch04_04_modis_c061.js
│   └── Ch04_05_sentinel2_harmonized.js
├── Ch05/  การจัดการข้อมูล
│   ├── Ch05_01_filtering.js
│   ├── Ch05_02_visualization.js
│   ├── Ch05_03_raster_vector.js
│   ├── Ch05_04_export.js
│   └── Ch05_05_band_math.js
├── Ch06/  การวิเคราะห์เชิงพื้นที่
│   ├── Ch06_01_dem_terrain.js
│   ├── Ch06_02_cloud_free_composite.js
│   ├── Ch06_03_spectral_signature.js
│   ├── Ch06_04_land_surface_temp.js
│   ├── Ch06_05_dynamic_world.js
│   └── Ch06_06_esa_worldcover.js
├── Ch07/  แอปพลิเคชัน
│   ├── Ch07_01_air_quality_no2.js
│   ├── Ch07_02_aerosol_index.js
│   ├── Ch07_03_flood_detection_sar.js
│   ├── Ch07_04_smart_farming_ndvi.js
│   ├── Ch07_05_rice_paddy_sar.js
│   ├── Ch07_06_deforestation.js
│   └── Ch07_07_fire_detection.js
├── Ch08/  Machine Learning
│   ├── Ch08_01_training_data.js
│   ├── Ch08_02_random_forest.js
│   ├── Ch08_03_gradient_tree_boost.js
│   ├── Ch08_04_unsupervised_kmeans.js
│   ├── Ch08_05_accuracy_assessment.js
│   ├── Ch08_06_alpha_earth.js
│   └── Ch08_07_vertex_ai.js
├── Ch09/  เทรนด์และเทคโนโลยี
│   ├── Ch09_01_ard_dashboard.js
│   ├── Ch09_02_cloud_native.js
│   ├── Ch09_03_near_realtime.js
│   ├── Ch09_04_quota_optimization.js
│   ├── Ch09_05_stac_search.py
│   ├── Ch09_06_cloud_native_python.py
│   ├── Ch09_07_rest_api.py
│   ├── Ch09_08_commercial_crop_insurance.js
│   ├── Ch09_09_commercial_esg.js
│   └── Ch09_10_commercial_carbon.js
├── Ch10/  AI & Generative AI
│   ├── Ch10_01_alpha_earth_embeddings.js
│   ├── Ch10_02_dynamic_world_analysis.js
│   ├── Ch10_03_vertex_ai_export.py
│   ├── Ch10_04_vertex_ai_train.py
│   ├── Ch10_05_vertex_ai_deploy.py
│   └── Ch10_06_vertex_ai_predict.js
├── Ch11/  Python & geemap
│   ├── Ch11_01_setup_colab.py
│   ├── Ch11_02_interactive_map.py
│   ├── Ch11_03_split_panel.py
│   ├── Ch11_04_time_series_chart.py
│   ├── Ch11_05_timelapse.py
│   ├── Ch11_06_js_to_python.py
│   ├── Ch11_07_xee_xarray.py
│   ├── Ch11_08_streamlit_app.py
│   └── Ch11_09_case_study_no2.py
├── Ch12/  Quick Reference
│   ├── Ch12_01_gee_cheatsheet.js
│   └── Ch12_02_gee_cheatsheet.py
└── README.md
```

---

## ข้อมูลดาวเทียมที่ใช้ (Datasets)

| ข้อมูล | ผู้ให้บริการ | ความละเอียด | Collection ID |
|--------|-------------|-------------|---------------|
| Sentinel-2 SR | ESA/Copernicus | 10m | `COPERNICUS/S2_SR_HARMONIZED` |
| Landsat 8/9 C2 | USGS | 30m | `LANDSAT/LC08(09)/C02/T1_L2` |
| Sentinel-1 SAR | ESA | 10m | `COPERNICUS/S1_GRD` |
| Sentinel-5P | ESA | 7km | `COPERNICUS/S5P/OFFL/L3_NO2` |
| SRTM DEM | USGS | 30m | `USGS/SRTMGL1_003` |
| MODIS LST | NASA | 1km | `MODIS/061/MOD11A2` |
| Dynamic World | Google | 10m | `GOOGLE/DYNAMICWORLD/V1` |
| ESA WorldCover | ESA | 10m | `ESA/WorldCover/v200` |
| Hansen Forest | U of Maryland | 30m | `UMD/hansen/global_forest_change_2023_v1_11` |
| CHIRPS Rainfall | UCSB | 5km | `UCSB-CHG/CHIRPS/DAILY` |

---

## ก่อนเริ่มใช้งาน (Prerequisites)

1. สมัคร Google Earth Engine: https://earthengine.google.com
2. สร้าง Google Cloud Project: https://console.cloud.google.com
3. เปิดใช้งาน Earth Engine API
4. แทนที่ `'your-cloud-project-id'` ในโค้ดทุกไฟล์ด้วย Project ID ของคุณ

---

## ปัญหาที่พบบ่อย (Troubleshooting)

| ปัญหา | วิธีแก้ |
|-------|--------|
| `ee.Initialize()` ไม่ทำงาน | เพิ่ม `project='your-cloud-project-id'` |
| ไม่พบภาพจากการ filter | ขยายช่วงวันที่หรือพื้นที่ |
| Export timeout | ลดความละเอียด (เพิ่มค่า scale) หรือลดขนาดพื้นที่ |
| `ModuleNotFoundError: geemap` | `pip install geemap` |

---

## ลิขสิทธิ์ (License)

โค้ดทั้งหมดในนี้เป็นส่วนประกอบของหนังสือ **Google Earth Engine for Geospatial Big Data — ฉบับปรับปรุง**
สามารถใช้เพื่อการเรียนรู้และวิจัยได้อย่างอิสระ
หากนำไปใช้ต่อ กรุณาอ้างอิงแหล่งที่มา

---

**Google Earth Engine for Geospatial Big Data — Second Edition**
**64 ไฟล์ | 17,482 บรรทัด | JavaScript + Python**
