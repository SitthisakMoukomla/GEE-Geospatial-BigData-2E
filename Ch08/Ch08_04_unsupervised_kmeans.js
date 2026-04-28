/*====================================================================
 * บทที่ 8.6 Unsupervised Classification — K-Means Clustering
 * Ch08_04_unsupervised_kmeans.js
 *
 * วัตถุประสงค์:
 *   - ทำ K-Means clustering โดยไม่ต้องมี training data
 *   - ค้นพบ natural clusters ในข้อมูล
 *   - ใช้ wekaKMeans clusterer
 *
 * ข้อดี Unsupervised:
 *  - ไม่ต้อง digitize training areas
 *  - ค้นพบ clusters ที่ไม่คาด
 *  - ข้อเสีย: ต้อง interpret clusters ด้วยตัวเอง
 *
 * ข้อมูล: LANDSAT/LC08/C02/T1_L2
 * ROI: Bangkok metropolitan area
 *
 * Author: GEE Second Edition
 * License: CC BY 4.0
 ====================================================================*/

// ====== ROI Definition ======
var roi = ee.Geometry.Rectangle([
  100.3, 13.5,
  100.9, 14.2
]);

// ====== Helper Functions ======

function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 4;
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
    .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}

function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image
    .addBands(opticalBands, null, true)
    .addBands(thermalBands, null, true);
}

// ====== 1. Data Preparation ======

var composite = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterDate('2024-01-01', '2024-12-31')
  .filterBounds(roi)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(maskClouds)
  .map(applyScaleFactors)
  .median()
  .clip(roi);

// Add spectral indices
var ndvi = composite.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
var ndwi = composite.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI');
var ndbi = composite.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');

var input = composite
  .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
  .addBands([ndvi, ndwi, ndbi]);

print('Input bands:', input.bandNames());

// ====== 2. Sampling ======

/**
 * K-Means ต้องการ sample points
 * numPixels: ต้องมากพอเพื่อให้ representative
 *            แต่ไม่มากเกินไป (computation overhead)
 * scale: pixel size สำหรับ sampling
 */

var sample = input.sample({
  region: roi,
  scale: 30,
  numPixels: 5000,
  seed: 0
});

print('Sample size:', sample.size());
print('Sample features:', sample.first());

// ====== 3. K-Means Clustering ======

/**
 * wekaKMeans parameters:
 *  - numClusters: K (number of clusters)
 *  - maxIterations: default 20
 *
 * ทดลองกับ K = 4 (เทียบเท่า 4 land cover classes)
 * สามารถ experiment กับค่า K อื่นๆ
 */

var numClusters = 4;

var clusterer = ee.Clusterer.wekaKMeans(numClusters)
  .train(sample);

print('K-Means clusterer trained (K=' + numClusters + ')');

// ====== 4. Apply Clustering ======

var clustered = input.cluster(clusterer);

print('Image clustered');

// ====== 5. Visualization ======

/**
 * random visualizer จะเลือก random colors สำหรับแต่ละ cluster
 */
Map.addLayer(clustered.randomVisualizer(), {}, 'K-Means Clusters (K=' + numClusters + ')');

// Reference layer
var visRGB = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 0.3,
  gamma: 1.4
};

Map.addLayer(composite, visRGB, 'Landsat Composite (RGB)', false);

// ====== 6. Post-Processing: Smoothing ======

var clustered_smooth = clustered.focal_mode(1, 'circle', 'pixels', 1);
Map.addLayer(clustered_smooth.randomVisualizer(), {}, 'K-Means Clusters (Smoothed)');

// ====== 7. Cluster Characteristics ======

/**
 * วิเคราะห์ mean spectral signature ของแต่ละ cluster
 * เพื่อ interpret ว่า cluster แต่ละอันคืออะไร
 */

for (var k = 0; k < numClusters; k++) {
  var clusterMask = clustered.eq(k);
  var clusterPixels = input.updateMask(clusterMask);

  var clusterStats = clusterPixels.reduce(ee.Reducer.mean());

  var statsDict = clusterStats.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e10
  });

  print('========== Cluster ' + k + ' Mean Values ==========');
  print('B2 (Blue):', statsDict.get('SR_B2'));
  print('B3 (Green):', statsDict.get('SR_B3'));
  print('B4 (Red):', statsDict.get('SR_B4'));
  print('B5 (NIR):', statsDict.get('SR_B5'));
  print('B6 (SWIR1):', statsDict.get('SR_B6'));
  print('B7 (SWIR2):', statsDict.get('SR_B7'));
  print('NDVI:', statsDict.get('NDVI'));
  print('NDWI:', statsDict.get('NDWI'));
  print('NDBI:', statsDict.get('NDBI'));
}

// ====== 8. Area Calculation ======

var areaImage = clustered_smooth.multiply(ee.Image.pixelArea())
  .divide(1e6);

var areas = areaImage.reduceRegion({
  reducer: ee.Reducer.sum().unweighted(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e10
});

var clusterAreas = areas.getInfo();

print('========== Cluster Areas ==========');
for (var i = 0; i < numClusters; i++) {
  var area = clusterAreas['cluster_' + i];
  if (area !== undefined) {
    print('Cluster ' + i + ': ' + area.toFixed(2) + ' km²');
  }
}

// ====== 9. Multi-K Comparison (Optional) ======

/**
 * ทดลองกับค่า K ต่างๆ เพื่อดูผลลัพธ์
 */

function tryKMeans(k) {
  var clustererK = ee.Clusterer.wekaKMeans(k).train(sample);
  var clusteredK = input.cluster(clustererK);
  return clusteredK;
}

// K = 5
var clustered5 = tryKMeans(5);
Map.addLayer(clustered5.randomVisualizer(), {}, 'K-Means (K=5)', false);

// K = 6
var clustered6 = tryKMeans(6);
Map.addLayer(clustered6.randomVisualizer(), {}, 'K-Means (K=6)', false);

// ====== 10. Interpretation Tips ======

print('========== Interpretation Guidelines ==========');
print('ให้ดู spectral signatures ของแต่ละ cluster:');
print('- High NDVI + Low NDBI = Forest/Vegetation');
print('- High NDWI = Water');
print('- Low NDVI + High NDBI = Urban/Built-up');
print('- Moderate NDVI + Medium values = Cropland');
print('\nRecommendation: ทดลอง K=4,5,6 และเลือก K ที่ให้ผล sensible');

// ====== Export Results (Optional) ======

/*
Export.image.toDrive({
  image: clustered_smooth,
  description: 'KMeans_Clustering_Bangkok_2024',
  region: roi,
  scale: 30,
  crs: 'EPSG:4326'
});
*/

// ====== Map Setup ======

Map.setCenter(100.6, 13.85, 11);
Map.setOptions('SATELLITE');

print('K-Means clustering complete!');
