# GEE Second Edition - JavaScript Code Files

This directory contains complete, runnable Google Earth Engine (GEE) JavaScript code examples extracted from the E-Book Second Edition chapters 1-4.

## Structure

### Chapter 1: GEE Platform & JavaScript Basics

- **Ch01_01_basic_javascript.js** (6.6 KB)
  - Variables, strings, numbers, booleans
  - Arrays and Objects
  - Functions and functional programming
  - Loops and conditional statements
  - String manipulation

- **Ch01_02_first_satellite_image.js** (6.0 KB)
  - Load Landsat 8 Collection 2 (C02)
  - Filter by date and bounds
  - Understand Image metadata
  - Create True Color and False Color composites
  - Calculate NDVI
  - Create histograms
  - Export option

### Chapter 2: GEE Data Catalog

- **Ch02_01_dynamic_world.js** (8.5 KB)
  - Load Dynamic World Land Cover Classification
  - 9 land cover classes with colors
  - Create mode composite
  - Interactive legend
  - Calculate area by class
  - Filter specific land cover types
  - Multi-temporal analysis

- **Ch02_02_image_metadata.js** (8.5 KB)
  - Read Landsat 9 Collection 2 metadata
  - Understand band names (SR_B*, ST_B*)
  - Access image properties
  - Understand QA_PIXEL flags
  - Check cloud coverage
  - Sun geometry information

- **Ch02_03_common_datasets.js** (12 KB)
  - SRTM Digital Elevation Model (DEM)
  - ESA WorldCover Land Cover
  - JRC Global Surface Water
  - FAO GAUL Administrative Boundaries
  - ERA5-Land Climate Data
  - MODIS Land Surface Temperature
  - Global Forest Change (Hansen)
  - NOAA VIIRS Nighttime Lights

### Chapter 3: Remote Sensing & New Satellite Systems

- **Ch03_01_sentinel1_sar_flood.js** (11 KB)
  - Sentinel-1 Synthetic Aperture Radar (SAR)
  - VV/VH polarization
  - Flood detection using threshold method
  - Change detection (pre vs post-flood)
  - Speckle filtering
  - Morphological operations
  - Multi-temporal flood analysis
  - Confidence map generation

- **Ch03_02_sentinel5p_no2.js** (11 KB)
  - Sentinel-5P TROPOMI sensor
  - NO₂ (Nitrogen Dioxide) monitoring
  - Air quality assessment
  - Time series analysis
  - Monthly comparison
  - Trend analysis and anomalies
  - Source detection
  - Other gases (SO₂)

### Chapter 4: Image Collection & Collection 2

- **Ch04_01_scale_factors.js** (9.1 KB)
  - ⚠️ **CRITICAL**: Collection 2 uses NEW scale factors
  - Optical bands: multiply(0.0000275).add(-0.2)
  - Thermal bands: multiply(0.00341802).add(149.0)
  - Comparison with Collection 1
  - Impact on NDVI calculations
  - Visual difference demonstration

- **Ch04_02_cloud_masking.js** (9.7 KB)
  - Collection 2 uses QA_PIXEL (not BQA)
  - Bit flags: Cloud (Bit 3), Shadow (Bit 4)
  - bitwiseAnd operation explanation
  - Complete cloud mask function
  - Optional: Dilated cloud, snow masking
  - Multi-temporal analysis

- **Ch04_03_complete_workflow.js** (12 KB)
  - Complete end-to-end Landsat 8/9 workflow
  - Load + Cloud Mask + Scale Factor
  - Calculate NDVI, NDBI, MNDWI
  - Land Cover Classification
  - Calculate statistics
  - Export results
  - Perfect template for production

- **Ch04_04_modis_c061.js** (12 KB)
  - MODIS Collection 061 (C061)
  - MOD13Q1 Vegetation Indices
  - Scale factor: 0.0001
  - Monthly NDVI time series
  - Trend analysis and anomalies
  - EVI (Enhanced Vegetation Index)
  - Quality assessment (VI_Quality)
  - Comparison with Landsat

- **Ch04_05_sentinel2_harmonized.js** (12 KB)
  - ⚠️ MUST use S2_SR_HARMONIZED (not S2_SR)
  - Cloud filtering and masking
  - 13 spectral bands at 10m resolution
  - Scale factor: 0.0001
  - Resampling to 10m
  - Multiple indices (NDVI, NDBI, NDMI, NDWI, MNDWI)
  - Land Cover Classification
  - Complete analysis workflow

## Key Features

### All Files Include:

✓ **Thai Comments** explaining each step
✓ **Complete Header Block** with chapter/description/author
✓ **Default ROI** = `ee.Geometry.Point(100.5, 13.75)` (Bangkok)
✓ **Collection 2** (C02) for Landsat
✓ **SR_B* Band Names** (not old B* names)
✓ **QA_PIXEL** for cloud masking (not BQA)
✓ **Scale Factor** functions included
✓ **Multiple Visualizations** ready to use
✓ **Export Templates** (commented out)
✓ **Statistics & Analysis** included
✓ **Runnable** - paste directly into GEE Code Editor

## Important Notes

### ⚠️ Collection 2 Changes

1. **Collection ID**: `C02` (not `C01`)
   - Old: `LANDSAT/LC08/C01/T1_SR` ❌
   - New: `LANDSAT/LC08/C02/T1_L2` ✅

2. **Band Names**: `SR_B*` (not `B*`)
   - Old: `B4`, `B5`, `B6` ❌
   - New: `SR_B4`, `SR_B5`, `SR_B6` ✅

3. **Scale Factor**: New formula!
   - Old: `multiply(0.0001)` ❌
   - New: `multiply(0.0000275).add(-0.2)` ✅

4. **Cloud Masking**: `QA_PIXEL` (not `BQA`)
   - Old: `BQA` band ❌
   - New: `QA_PIXEL` with bit flags ✅

5. **Sentinel-2**: MUST be Harmonized
   - Old: `COPERNICUS/S2_SR` ❌
   - New: `COPERNICUS/S2_SR_HARMONIZED` ✅

6. **MODIS**: Collection 061
   - Old: `MODIS/006/*` ❌
   - New: `MODIS/061/*` ✅

## How to Use

1. Open [Google Earth Engine Code Editor](https://code.earthengine.google.com)
2. Create a new script
3. Copy the entire content of desired .js file
4. Paste into Code Editor
5. Click **Run**
6. Explore the map and Console output

## Dependencies

- Google Earth Engine Account (free)
- Web browser (Chrome, Firefox, Safari)
- No additional software needed

## ROI and Study Areas

All scripts use Bangkok as default:
```javascript
var roi = ee.Geometry.Point(100.5, 13.75);
```

To change study area, modify this line and adjust buffer if needed.

## Export Data

Most scripts include export templates (commented out):

```javascript
// Uncomment and click "Run" in Tasks tab
Export.image.toDrive({
  image: composite,
  description: 'filename',
  scale: 30,
  region: roi,
  maxPixels: 1e9
});
```

## Statistics & Charts

Scripts include:
- Mean, Min, Max calculations
- Histograms
- Time series charts
- Multi-temporal analysis

## Classification Examples

Several scripts include simple classifications:
- Water detection
- Forest/Vegetation
- Urban/Built-up
- Bare land

Extendable to more complex ML workflows (Ch08).

## Visualization Parameters

All scripts include ready-to-use `vis` objects:
- True Color (RGB)
- False Color (Vegetation)
- Index layers (NDVI, NDBI, MNDWI)
- Classification maps

## Learning Path

Recommended order:
1. Ch01_01 → Learn JavaScript basics
2. Ch01_02 → Load first satellite image
3. Ch02_01 → Explore Dynamic World
4. Ch02_02 → Understand metadata
5. Ch02_03 → Browse common datasets
6. Ch03_01 → SAR flood detection
7. Ch03_02 → Air quality monitoring
8. Ch04_01 → Learn Collection 2 scale factors
9. Ch04_02 → Master cloud masking
10. Ch04_03 → Complete workflow template
11. Ch04_04 → MODIS time series
12. Ch04_05 → Sentinel-2 analysis

---

**Book**: Google Earth Engine Applications - Second Edition
**Author**: Created from Thai e-book markdown
**Date**: February 2025
**Collection 2 Status**: All scripts updated for C02 + Scale Factors + QA_PIXEL
