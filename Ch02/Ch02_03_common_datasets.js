/*
 * =========================================
 * บทที่ 2: โหลด Common Datasets ใน GEE
 * =========================================
 * ไฟล์: Ch02_03_common_datasets.js
 *
 * คำอธิบาย: ตัวอย่างการโหลด Datasets ที่ใช้บ่อยใน GEE
 *          - SRTM Digital Elevation Model (DEM)
 *          - ESA WorldCover Land Cover
 *          - JRC Global Surface Water
 *          - FAO GAUL Admin Boundaries
 *          - Era5-Land Climate Data
 *
 * ผู้เขียน: Earth Engine Community
 * ปรับปรุง: 2025
 * =========================================
 */

// ======== 1. กำหนด ROI ========

var roi = ee.Geometry.Point(100.5, 13.75);  // กรุงเทพมหานคร

// เพิ่ม Buffer เพื่อให้ได้พื้นที่ใหญ่ขึ้น
var roiBuffered = roi.buffer(100000);  // 100 กม.

print('ROI (Buffered):', roiBuffered);


// ======== 2. SRTM Digital Elevation Model (DEM) ========

print('\n=== SRTM DEM ===');

// SRTM = Shuttle Radar Topography Mission
// ความละเอียด: 30 เมตร ทั่วโลก
var srtm = ee.Image('USGS/SRTMGL1_003');

print('SRTM DEM:', srtm);
print('SRTM Bands:', srtm.bandNames());

// เลือก Elevation band
var elevation = srtm.select('elevation');

// Visualization parameters สำหรับ DEM
var demVis = {
  min: 0,
  max: 2000,
  palette: ['000080', '0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000']
};

Map.addLayer(elevation.clip(roiBuffered), demVis, 'SRTM DEM (30m)', false);

// คำนวณ Slope (ความชัน)
var slope = ee.Terrain.slope(elevation);
var slopeVis = {
  min: 0,
  max: 45,
  palette: ['000000', 'ffffff']
};

Map.addLayer(slope.clip(roiBuffered), slopeVis, 'Slope', false);

// คำนวณ Aspect (ทิศทาง)
var aspect = ee.Terrain.aspect(elevation);
var aspectVis = {
  min: 0,
  max: 360,
  palette: ['000000', 'ffffff']
};

Map.addLayer(aspect.clip(roiBuffered), aspectVis, 'Aspect', false);

// ดึงค่า Elevation ที่ ROI
var elevationSample = elevation.sample(roi, 30).first();
print('Elevation at ROI (m):', elevationSample.get('elevation'));


// ======== 3. ESA WorldCover Land Cover ========

print('\n=== ESA WorldCover ===');

// ESA WorldCover = 10 ประเภท land cover ที่ 10m resolution ทั่วโลก
// ข้อมูลปี 2020 และ 2021
var worldCover = ee.Image('ESA/WorldCover/v200');

print('WorldCover Image:', worldCover);
print('WorldCover Bands:', worldCover.bandNames());

// ค่า Classification ของ WorldCover
var classificationWC = worldCover.select('classification');

// Visualization
var wcVis = {
  min: 10,
  max: 95,
  palette: [
    '006400',  // 10: Trees
    'ffff00',  // 20: Shrubland
    'ffccff',  // 30: Herbaceous vegetation
    'e6cccc',  // 40: Cultivated
    'cc0013',  // 50: Urban/built-up
    'cccccc',  // 60: Bare/sparse vegetation
    '4d4dff',  // 70: Snow and ice
    '0066ff'   // 80: Permanent water bodies
  ]
};

Map.addLayer(classificationWC.clip(roiBuffered), wcVis, 'ESA WorldCover', false);

// ดึงค่า Classification ที่ ROI
var wcSample = classificationWC.sample(roi, 30).first();
print('WorldCover class at ROI:', wcSample.get('classification'));


// ======== 4. JRC Global Surface Water ========

print('\n=== JRC Global Surface Water ===');

// JRC GSW = Water Detection ที่ 30m resolution ตั้งแต่ 1984-2021
var jrcGsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater');

print('JRC GSW Image:', jrcGsw);
print('JRC GSW Bands:', jrcGsw.bandNames());

// Bands:
// - 'occurrence': Water occurrence frequency (0-100%)
// - 'change_abs': Absolute change 1984-2021
// - 'change_norm': Normalized change
// - 'seasonality': Seasonality index
// - 'max_extent': Maximum water extent

var waterOccurrence = jrcGsw.select('occurrence');

var waterVis = {
  min: 0,
  max: 100,
  palette: ['ffffff', 'ffcccc', 'ff6666', 'cc0000', '000099']
};

Map.addLayer(waterOccurrence.clip(roiBuffered), waterVis, 'JRC Water Occurrence', false);

// ดึงค่า Water Occurrence ที่ ROI
var waterSample = waterOccurrence.sample(roi, 30).first();
print('Water occurrence at ROI (%):', waterSample.get('occurrence'));


// ======== 5. FAO GAUL Global Admin Boundaries ========

print('\n=== FAO GAUL Admin Boundaries ===');

// GAUL = Global Administrative Unit Layers
// ใช้สำหรับ Administrative Boundaries (ประเทศ จังหวัด เขต)
var gadm = ee.FeatureCollection('FAO/GAUL/2015/level1');

print('GAUL level1 (Provinces):', gadm.first());

// กรอง Thailand
var thailand = gadm.filter(ee.Filter.eq('ADM0_NAME', 'Thailand'));

print('Thailand provinces:', thailand.size().getInfo());
print('Thailand feature:', thailand.first());

// แสดง Thailand boundary
Map.addLayer(thailand, {color: 'ff0000'}, 'Thailand Boundary', false);

// กรอง Bangkok
var bangkok = gadm.filter(ee.Filter.eq('ADM1_NAME', 'Bangkok'));
print('Bangkok:', bangkok.first());
Map.addLayer(bangkok, {color: '0000ff'}, 'Bangkok', false);


// ======== 6. ERA5-Land Climate Data ========

print('\n=== ERA5-Land Climate Data ===');

// ERA5-Land = Reanalysis data ความละเอียด 9 กม. รายชั่วโมง
// Variables: Temperature, Precipitation, Wind, Pressure, etc.
var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY');

print('ERA5-Land Collection:', era5);

// กรอง Temperature สำหรับเดือนมกราคม 2025
var tempJan = era5
    .filterDate('2025-01-01', '2025-02-01')
    .select('temperature_2m');

print('Temperature images in Jan 2025:', tempJan.size().getInfo());

// แปลงจาก Kelvin เป็น Celsius
var tempC = tempJan.map(function(img) {
  return img.subtract(273.15)
      .copyProperties(img, img.propertyNames());
});

// สร้าง Mean composite
var meanTempJan = tempC.mean();

var tempVis = {
  min: 10,
  max: 35,
  palette: ['blue', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(meanTempJan.clip(roiBuffered), tempVis, 'Mean Temperature Jan 2025 (°C)', false);

// ดึงค่า Temperature ที่ ROI
var tempSample = meanTempJan.sample(roi, 10000).first();
print('Mean Temperature at ROI (°C):', tempSample.get('temperature_2m'));

// ดึง Precipitation จาก ERA5-Land
var precipitation = era5
    .filterDate('2025-01-01', '2025-02-01')
    .select('total_precipitation');

var precipSum = precipitation.sum();

var precipVis = {
  min: 0,
  max: 50,
  palette: ['ffffff', '99ffff', '00ff00', 'ffff00', 'ff0000']
};

Map.addLayer(precipSum.clip(roiBuffered), precipVis, 'Precipitation Jan 2025 (mm)', false);


// ======== 7. MODIS Land Surface Temperature ========

print('\n=== MODIS Land Surface Temperature ===');

// MODIS LST = Land Surface Temperature ความละเอียด 1 กม.
var modisLST = ee.ImageCollection('MODIS/061/MOD11A2');

print('MODIS LST Collection:', modisLST);

// กรองข้อมูล
var lstFiltered = modisLST
    .filterDate('2025-01-01', '2025-02-28')
    .filterBounds(roiBuffered);

print('LST images found:', lstFiltered.size().getInfo());

// เลือก Day LST (Daytime)
var lstDay = lstFiltered.select('LST_Day_1km');

// แปลงจาก 0.02 K scale เป็น Celsius
var lstDayC = lstDay
    .map(function(img) {
      return img.multiply(0.02).subtract(273.15)
          .copyProperties(img, img.propertyNames());
    });

var lstMean = lstDayC.mean();

var lstVis = {
  min: 20,
  max: 40,
  palette: ['blue', 'cyan', 'green', 'yellow', 'orange', 'red']
};

Map.addLayer(lstMean.clip(roiBuffered), lstVis, 'MODIS LST Day (°C)', false);

// ดึงค่า LST
var lstSample = lstMean.sample(roi, 1000).first();
print('Mean LST at ROI (°C):', lstSample.get('LST_Day_1km'));


// ======== 8. Global Forest Change (Hansen) ========

print('\n=== Global Forest Change ===');

// Global Forest Change = Forest Loss/Gain Data
var gfc = ee.Image('UMD/hansen/global_forest_change_2023_v1_11');

print('GFC Image:', gfc);
print('GFC Bands:', gfc.bandNames());

// Bands: loss (year of loss), treecover2000, gain, datamask, lossyear
var treecover = gfc.select('treecover2000');
var loss = gfc.select('loss');
var gain = gfc.select('gain');

var treecoverVis = {
  min: 0,
  max: 100,
  palette: ['ffffff', '0066ff', '00cc00', '004d00']
};

Map.addLayer(treecover.clip(roiBuffered), treecoverVis, 'Tree Cover 2000', false);

var lossVis = {
  min: 1,
  max: 1,
  palette: ['ff0000']
};

Map.addLayer(loss.clip(roiBuffered), lossVis, 'Forest Loss', false);

var gainVis = {
  min: 1,
  max: 1,
  palette: ['0000ff']
};

Map.addLayer(gain.clip(roiBuffered), gainVis, 'Forest Gain', false);


// ======== 9. NOAA VIIRS Nighttime Lights ========

print('\n=== NOAA VIIRS Nighttime Lights ===');

// VIIRS = Visible Infrared Imaging Radiometer Suite
// ใช้สำหรับวัดแสงกลางคืน (สำหรับติดตาม Economic Activity)
var viirs = ee.ImageCollection('NOAA/VIIRS/001/VNP46A2');

print('VIIRS Collection:', viirs);

// กรองข้อมูล
var viirsFiltered = viirs
    .filterDate('2025-01-01', '2025-02-28')
    .filterBounds(roiBuffered);

print('VIIRS images found:', viirsFiltered.size().getInfo());

// เลือก Radiance band
var radiance = viirsFiltered.select('DNB');
var radianceMean = radiance.mean();

var radianceVis = {
  min: 0,
  max: 60,
  palette: ['000000', '000033', '000055', '0000ff', '00ffff', 'ffff00', 'ff0000']
};

Map.addLayer(radianceMean.clip(roiBuffered), radianceVis, 'VIIRS Nighttime Lights', false);


// ======== 10. สรุป All Datasets ========

print('\n=== SUMMARY: Common Datasets in GEE ===');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

var datasetInfo = [
  ['SRTM DEM', '30m', 'Elevation & Terrain'],
  ['ESA WorldCover', '10m', 'Land Cover Classification'],
  ['JRC Global Water', '30m', 'Water Detection & Dynamics'],
  ['FAO GAUL', 'Vector', 'Administrative Boundaries'],
  ['ERA5-Land', '9km hourly', 'Climate & Weather'],
  ['MODIS LST', '1km', 'Land Surface Temperature'],
  ['Global Forest Change', '30m', 'Forest Loss/Gain'],
  ['VIIRS Nighttime', '500m', 'Nighttime Lights']
];

for (var i = 0; i < datasetInfo.length; i++) {
  var info = datasetInfo[i];
  print(info[0] + ' | ' + info[1] + ' | ' + info[2]);
}

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');


// ======== 11. Center Map ========

Map.centerObject(roiBuffered, 10);


// ======== สรุป ========

print('\n=== สรุปบทนี้ ===');
print('✓ SRTM DEM - ความสูง ความชัน ทิศทาง');
print('✓ ESA WorldCover - Land Cover Classification');
print('✓ JRC Global Surface Water - Water Detection');
print('✓ FAO GAUL - Administrative Boundaries');
print('✓ ERA5-Land - Climate & Weather Data');
print('✓ MODIS LST - Land Surface Temperature');
print('✓ Global Forest Change - Deforestation Monitoring');
print('✓ VIIRS Nighttime Lights - Socioeconomic Data');
print('\nลำดับถัดไป: บทที่ 3 - Remote Sensing Basics');
