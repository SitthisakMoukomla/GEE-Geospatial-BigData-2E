#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ch09_07_rest_api.py
GEE REST API Example
เรียกใช้ Google Earth Engine ผ่าน REST API ด้วย Python requests

ผู้เขียน: สิทธิศักดิ์ หมูคำหล้า
วันที่: 2025
"""

import requests
import json
import sys

print("=== GEE REST API Example ===\n")

# ============================================
# 1. Authentication Setup
# ============================================

print("--- 1. Authentication Setup ---")

try:
    import google.auth
    import google.auth.transport.requests
    print("✓ google-auth installed")

    # Authenticate with default credentials
    print("Authenticating with Google Cloud...")
    credentials, project = google.auth.default(
        scopes=['https://www.googleapis.com/auth/earthengine']
    )

    print(f"Project: {project}")
    print(f"Service Account: {credentials.service_account_email if hasattr(credentials, 'service_account_email') else 'User credentials'}")

except ImportError:
    print("! google-auth not installed: pip install google-auth")
    sys.exit(1)

# ============================================
# 2. Refresh Token
# ============================================

print("\n--- 2. Refresh Access Token ---")

try:
    credentials.refresh(google.auth.transport.requests.Request())
    print(f"✓ Token refreshed, expires in: {credentials.expiry}")
except Exception as e:
    print(f"Error refreshing token: {e}")

# ============================================
# 3. Compute NDVI via REST API
# ============================================

print("\n--- 3. Compute NDVI via REST API ---")

# GEE REST API endpoint
api_url = f'https://earthengine.googleapis.com/v1/projects/{project}/image:computePixels'

print(f"API Endpoint: {api_url}")

# สร้าง request body สำหรับคำนวณ NDVI
# This loads a Landsat 8 image and computes NDVI
request_body = {
    'expression': {
        'result': 'ndvi',
        'values': {
            'ndvi': {
                'functionInvocationValue': {
                    'functionName': 'Image.normalizedDifference',
                    'arguments': {
                        'input': {
                            'functionInvocationValue': {
                                'functionName': 'Image.load',
                                'arguments': {
                                    'id': {
                                        'constantValue': 'LANDSAT/LC08/C02/T1_L2/LC08_128049_20250115'
                                    }
                                }
                            }
                        },
                        'bandNames': {
                            'constantValue': ['SR_B5', 'SR_B4']  # NIR, Red
                        }
                    }
                }
            }
        }
    },
    'fileFormat': 'GEO_TIFF',
    'grid': {
        'dimensions': {
            'width': 256,
            'height': 256
        },
        'affineTransform': {
            'scaleX': 0.001,      # 1/1000 degree (≈111m at equator)
            'shearX': 0,
            'translateX': 100.4,  # longitude (Bangkok)
            'shearY': 0,
            'scaleY': -0.001,     # negative for North-up
            'translateY': 13.8    # latitude
        },
        'crsCode': 'EPSG:4326'
    }
}

print("\nRequest body structure:")
print(json.dumps({
    'expression': '(NIR - Red) / (NIR + Red)',
    'grid': 'Bangkok 256x256 pixels at 0.001° resolution',
    'fileFormat': 'GEO_TIFF'
}, indent=2))

# ============================================
# 4. Send REST API Request
# ============================================

print("\n--- 4. Send REST API Request ---")

print("Preparing request headers...")

headers = {
    'Authorization': f'Bearer {credentials.token}',
    'Content-Type': 'application/json'
}

print(f"Headers: Authorization: Bearer {credentials.token[:20]}...")

# NOTE: This example shows the structure but won't actually run
# without valid GEE project and image ID
print("\nExample request (not executed in this demo):")
print(f"""
response = requests.post(
    '{api_url}',
    json=request_body,
    headers=headers
)

if response.status_code == 200:
    with open('ndvi_tile.tif', 'wb') as f:
        f.write(response.content)
    print('NDVI tile saved to ndvi_tile.tif')
else:
    print(f'Error: {response.status_code}')
    print(response.text)
""")

# ============================================
# 5. Alternative: Use GEE Python API (simpler)
# ============================================

print("\n--- 5. Alternative: GEE Python API ---")

try:
    import ee
    print("✓ earthengine-api installed")

    print("""
    import ee

    ee.Initialize(project='your-project')

    # Simpler than REST API - use Python API directly
    roi = ee.Geometry.Point(100.5, 13.75).buffer(50000)

    ndvi = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(roi)
        .filterDate('2025-01-01', '2025-06-30')
        .median()
        .normalizedDifference(['B8', 'B4'])

    # Export to GCS
    task = ee.batch.Export.image.toCloudStorage(
        image=ndvi,
        description='ndvi_rest_api_test',
        bucket='your-bucket',
        region=roi,
        scale=10
    )
    task.start()
    """)

except ImportError:
    print("! earthengine-api not installed: pip install earthengine-api")

# ============================================
# 6. REST API Use Cases
# ============================================

print("\n--- 6. REST API Use Cases ---")

use_cases = {
    'Web Map Application': {
        'Description': 'Serve GEE results as map tiles',
        'Implementation': 'Node.js backend → REST API → GEE → map tiles → frontend',
        'Benefit': 'Real-time satellite data on web maps'
    },
    'Mobile App': {
        'Description': 'Show NDVI in mobile app',
        'Implementation': 'React Native → REST API → GEE → JSON/GeoTIFF → app display',
        'Benefit': 'No GEE account needed on device'
    },
    'Scheduled Pipeline': {
        'Description': 'Daily composite generation',
        'Implementation': 'Cloud Scheduler → Cloud Functions → REST API → GEE → export',
        'Benefit': 'Automated near-realtime updates'
    },
    'Dashboard': {
        'Description': 'Tableau/Power BI dashboard',
        'Implementation': 'BI tool → Python script → REST API → GEE → query results',
        'Benefit': 'Dynamic geospatial insights'
    },
    'Webhook Integration': {
        'Description': 'Alert on fire/flood detection',
        'Implementation': 'FIRMS data → REST API query → webhook notify → SMS',
        'Benefit': 'Emergency response automation'
    }
}

for use_case, details in use_cases.items():
    print(f"\n• {use_case}")
    print(f"  {details['Description']}")
    print(f"  Flow: {details['Implementation']}")
    print(f"  {details['Benefit']}")

# ============================================
# 7. Comparison: REST API vs Python API vs JavaScript
# ============================================

print("\n--- 7. Comparison: When to use REST API ---")

comparison = """
┌─────────────────┬──────────────────────┬───────────────┬─────────────────────┐
│ Interface       │ Best For             │ Pros          │ Cons                │
├─────────────────┼──────────────────────┼───────────────┼─────────────────────┤
│ JavaScript      │ Interactive explorer │ Quick start   │ Limited to browser  │
│                 │ in Code Editor       │ Live feedback │ Not for production  │
├─────────────────┼──────────────────────┼───────────────┼─────────────────────┤
│ Python API      │ Batch processing     │ Easy to use   │ Requires Python env │
│ (ee.*)          │ Research             │ Rich library  │ Authentication      │
├─────────────────┼──────────────────────┼───────────────┼─────────────────────┤
│ REST API        │ Web/mobile apps      │ Language agno │ More complex        │
│ (HTTP POST)     │ Scheduled pipelines   │ Scalable      │ Manual request body │
│                 │ Cloud integration    │ Production    │ Less documented     │
└─────────────────┴──────────────────────┴───────────────┴─────────────────────┘
"""
print(comparison)

# ============================================
# 8. Best Practices
# ============================================

print("\n--- 8. REST API Best Practices ---")

practices = """
1. Authentication:
   - Use service accounts for production
   - Store credentials securely (Cloud Secret Manager)
   - Rotate tokens regularly

2. Request Optimization:
   - Keep image size reasonable (256x256 or 512x512)
   - Use appropriate scale/resolution
   - Cache results when possible

3. Error Handling:
   - Check response status codes
   - Implement retry logic (exponential backoff)
   - Log all requests for debugging

4. Cost Management:
   - Monitor quota usage
   - Cache popular tiles
   - Use batch export for large areas

5. Documentation:
   - Document grid CRS and coordinates
   - Keep request body schemas
   - Version your API endpoints

6. Testing:
   - Test with small areas first
   - Validate output data
   - Monitor performance
"""
print(practices)

# ============================================
# 9. Resources
# ============================================

print("\n--- 9. Resources ---")

resources = """
Documentation:
  - GEE REST API: https://developers.google.com/earth-engine/cloud/highvolume
  - Python API: https://developers.google.com/earth-engine/apidocs
  - Code Editor: https://code.earthengine.google.com

Examples:
  - GEE Python API docs with REST examples
  - GitHub: google/earthengine-api
  - Community forum: https://groups.google.com/g/google-earth-engine-developers

Tools:
  - Google Cloud Console: https://console.cloud.google.com
  - GCS Bucket browser
  - Cloud Logging for debugging
"""
print(resources)

print("\n=== End of REST API Example ===")
