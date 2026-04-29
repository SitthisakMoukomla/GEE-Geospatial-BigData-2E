# คู่มือ Google Earth Engine สำหรับงานภูมิสารสนเทศและ Big Data

> โค้ดประกอบหนังสือ **ฉบับปรับปรุง (Second Edition)** — อัปเดตครบ Landsat Collection 2, ระบบ Quota Tiers ใหม่ปี 2026, AI/ML และ Python ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)
![Code](https://img.shields.io/badge/code-17%2C482%20lines-green)
![Files](https://img.shields.io/badge/files-64-orange)
![Languages](https://img.shields.io/badge/languages-JavaScript%20%2B%20Python-yellow)

---

## 📘 หนังสือฉบับเต็มกำลังจะเปิด pre-order

repo นี้คือโค้ดประกอบหนังสือ **คู่มือ Google Earth Engine สำหรับงานภูมิสารสนเทศและ Big Data — ฉบับปรับปรุง** (พ.ศ. 2569) เนื้อหา 12 บท + ภาพประกอบ 41 ภาพ + แบบฝึกหัด พร้อมคำอธิบายภาษาไทย

โค้ดในนี้ใช้ทดลองรันได้เลย — แต่ **คำอธิบายว่าทำไม** ต้อง mask cloud แบบนี้, ทำไม scale 30m, ทำไมเลือก reducer ตัวนี้, รวมถึงทฤษฎี Remote Sensing และ Thai context อยู่ในหนังสือ

**👉 [แจ้งเตือนตอนเปิด pre-order (ใส่ link form ตรงนี้)](https://forms.gle/your-form-id)**

ติดตามข่าว: [Facebook Page: Geography Lounge](https://www.facebook.com/GeographyLounge)

---

## ทำอะไรได้บ้างกับ repo นี้

```javascript
// ตรวจจับน้ำท่วมจาก Sentinel-1 SAR ในพื้นที่ที่ไม่มีเมฆ — Ch03_01_sentinel1_sar_flood.js
var preFlood = sentinel1.filterDate('2025-06-01', '2025-06-15').median();
var postFlood = sentinel1.filterDate('2025-06-20', '2025-07-05').median();
var floodMask = postFlood.subtract(preFlood).lt(-3);  // dB threshold
```

```python
# วิเคราะห์ NDVI time-series ภาคอีสาน 5 ปี ด้วย geemap + xarray — Ch11_07_xee_xarray.py
import xee, ee, geemap
ds = xee.open_dataset(s2_collection, projection=...)
ndvi_monthly = (ds.B8 - ds.B4) / (ds.B8 + ds.B4)
ndvi_monthly.resample(time='1ME').mean().plot()
```

ทั้งหมดนี้รันได้ทันทีใน [GEE Code Editor](https://code.earthengine.google.com) หรือ Google Colab โดยไม่ต้องลง software อะไรเพิ่ม

---

## สารบัญโค้ด

| บท | หัวข้อ | ไฟล์ | ภาษา |
|----|--------|------|------|
| Ch01 | แพลตฟอร์ม GEE | 2 | JS |
| Ch02 | Data Catalog | 3 | JS |
| Ch03 | การรับรู้ระยะไกล (SAR + Optical) | 2 | JS |
| Ch04 | Image Collection (Collection 2) | 5 | JS |
| Ch05 | การจัดการข้อมูล | 5 | JS |
| Ch06 | การวิเคราะห์เชิงพื้นที่ | 6 | JS |
| Ch07 | การประยุกต์ใช้ (Flood, Fire, UHI) | 7 | JS |
| Ch08 | Machine Learning | 7 | JS |
| Ch09 | เทรนด์ ARD + Cloud-Native | 10 | JS + Python |
| Ch10 | AI ใน GEE (Dynamic World, Vertex AI) | 6 | JS + Python |
| Ch11 | Python + geemap | 9 | Python |
| Ch12 | Quick Reference / Cheatsheet | 2 | JS + Python |

ทั้งหมด **64 ไฟล์, 17,482 บรรทัด** ดู [INDEX.md](./INDEX.md) สำหรับรายละเอียดทุกไฟล์

---

## เริ่มต้นใน 3 นาที

### 1. JavaScript (สำหรับเริ่มต้น)

```
1. เปิด https://code.earthengine.google.com
2. New → Script → ตั้งชื่อตามต้องการ
3. Copy โค้ดจากไฟล์ที่สนใจ → วาง → กด Run
```

### 2. Python + geemap (สำหรับ research workflow)

**Google Colab** (แนะนำ — ไม่ต้องลงอะไร):
```python
!pip install geemap
import ee, geemap
ee.Authenticate()
ee.Initialize(project='your-cloud-project-id')
```

**Local Environment:**
```bash
conda create -n gee python=3.12
conda activate gee
pip install geemap streamlit xee
```

### 3. ก่อนรัน

1. สมัคร GEE: https://earthengine.google.com
2. สร้าง Google Cloud Project: https://console.cloud.google.com
3. เปิดใช้งาน Earth Engine API
4. แทนที่ `'your-cloud-project-id'` ในโค้ดด้วย Project ID ของคุณ

> 💡 หนังสือฉบับปรับปรุงครอบคลุม **ระบบ Noncommercial Quota Tiers ใหม่** (Community / Research / Enterprise) ที่เริ่มใช้ 27 เมษายน 2026 — สำคัญสำหรับนักศึกษาและนักวิจัย

---

## ข้อมูลดาวเทียมที่ใช้

| ข้อมูล | ผู้ให้บริการ | ความละเอียด | Collection ID |
|--------|-------------|-------------|---------------|
| Sentinel-2 SR | ESA/Copernicus | 10m | `COPERNICUS/S2_SR_HARMONIZED` |
| Landsat 8/9 C2 | USGS | 30m | `LANDSAT/LC0{8,9}/C02/T1_L2` |
| Sentinel-1 SAR | ESA | 10m | `COPERNICUS/S1_GRD` |
| Sentinel-5P NO₂ | ESA | 7km | `COPERNICUS/S5P/OFFL/L3_NO2` |
| SRTM DEM | USGS | 30m | `USGS/SRTMGL1_003` |
| MODIS LST | NASA | 1km | `MODIS/061/MOD11A2` |
| Dynamic World | Google | 10m | `GOOGLE/DYNAMICWORLD/V1` |
| ESA WorldCover | ESA | 10m | `ESA/WorldCover/v200` |
| Hansen Forest | UMD | 30m | `UMD/hansen/global_forest_change_2023_v1_11` |
| CHIRPS Rainfall | UCSB | 5km | `UCSB-CHG/CHIRPS/DAILY` |

---

## โครงสร้างโฟลเดอร์

```
Code/
├── Ch01/  แพลตฟอร์ม GEE              (2 ไฟล์)
├── Ch02/  Data Catalog               (3 ไฟล์)
├── Ch03/  การรับรู้ระยะไกล             (2 ไฟล์)
├── Ch04/  Image Collection (C02)     (5 ไฟล์)
├── Ch05/  การจัดการข้อมูล             (5 ไฟล์)
├── Ch06/  การวิเคราะห์เชิงพื้นที่       (6 ไฟล์)
├── Ch07/  การประยุกต์ใช้               (7 ไฟล์)
├── Ch08/  Machine Learning           (7 ไฟล์)
├── Ch09/  เทรนด์ Cloud-Native         (10 ไฟล์)
├── Ch10/  AI ใน GEE                  (6 ไฟล์)
├── Ch11/  Python + geemap            (9 ไฟล์)
└── Ch12/  Quick Reference            (2 ไฟล์)
```

---

## ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|--------|
| `ee.Initialize()` error | เพิ่ม `project='your-cloud-project-id'` |
| ไม่พบภาพจาก filter | ขยายช่วงวันที่ ตรวจสอบ ROI ทับ tile |
| Export timeout | เพิ่ม `scale` หรือลด ROI |
| `ModuleNotFoundError: geemap` | `pip install geemap` |
| Quota exceeded | เลือก scale ใหญ่ขึ้น, ใช้ `setDefaultProjection`, หรือพิจารณา Tier ที่เหมาะสม |

ดู Troubleshooting FAQ ฉบับเต็ม (10 ปัญหาพร้อมวิธีแก้) ในหนังสือ

---

## ใครควรอ่านหนังสือนี้

- **นักศึกษาปริญญาตรี-โท** ที่ทำ thesis ด้าน Remote Sensing / GIS / Environmental Science
- **นักวิจัย** ที่ต้องการเริ่มใช้ cloud-based geospatial analysis แทน desktop GIS
- **อาจารย์** ที่ต้องการใช้ประกอบการสอน — ทุกบทมีแบบฝึกหัด + Challenge Exercise
- **GIS Professionals** ที่ทำงานในองค์กรและต้องการ scale up workflow

---

- 📘 หนังสือ: เปิด pre-order เร็ว ๆ นี้ 
- 🌍 Facebook: [Geography Lounge](https://www.facebook.com/GeographyLounge)
- 💻 GitHub: [@SitthisakMoukomla](https://github.com/SitthisakMoukomla)
- 📧 Email: sitthisak.mou@gmail.com

---

## License

โค้ดในนี้เป็นส่วนประกอบของหนังสือ ใช้เพื่อการเรียนรู้และวิจัยได้อย่างอิสระภายใต้ MIT License — หากนำไปใช้ต่อในงานเผยแพร่ กรุณาอ้างอิงแหล่งที่มา

```bibtex
@book{moukomla2026gee,
  author    = {Moukomla, Sitthisak},
  title     = {คู่มือ Google Earth Engine สำหรับงานภูมิสารสนเทศและ Big Data},
  edition   = {2},
  publisher = {Geography Lounge},
  year      = {2026},
  url       = {https://github.com/SitthisakMoukomla/GEE-Geospatial-BigData-2E}
}
```

---

## ⭐ ถ้า repo นี้มีประโยชน์

- กดดาว ⭐ ที่มุมขวาบน — ช่วยให้ repo ถูกค้นเจอมากขึ้น
- เปิด **Issue** ถ้าโค้ดมีปัญหา หรือเสนอแนะ
- Share repo ให้เพื่อนที่ทำงาน GIS / RS

ถ้าใช้ใน thesis หรืองานวิจัย — บอกได้เลยครับ ผมยินดีช่วย review code หรือแนะนำ workflow

---

**คู่มือ Google Earth Engine สำหรับงานภูมิสารสนเทศและ Big Data — Second Edition**
**64 ไฟล์ · 17,482 บรรทัด · JavaScript + Python · พ.ศ. 2569**
