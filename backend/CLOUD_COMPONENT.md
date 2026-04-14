# Energy Monitor - Cloud Component & ML Integration

## Architecture Overview

The Energy Monitor system now includes a **cloud component** with:
- **Database Storage**: MongoDB for persistent data storage
- **Data Processing**: Statistical anomaly detection & aggregation
- **ML Integration**: Endpoints for DL model training and inference
- **Device Management**: Raspberry Pi device registration and monitoring
- **Analytics**: Real-time insights and statistics

## Project Structure

```
backend/
├── models/                      # Database schemas
│   ├── Device.js              # Raspberry Pi device registry
│   ├── Reading.js             # Energy consumption readings
│   └── Prediction.js          # ML model predictions
├── services/
│   └── dataProcessor.js       # Data processing & anomaly detection
├── routes/
│   └── api.js                 # Cloud API endpoints
├── server.js                  # Main server (Express + MongoDB)
└── .env                       # Configuration
```

## Database Schema

### Device Collection
```javascript
{
  deviceId: String,           // Unique device identifier
  name: String,               // Device name (e.g., "Raspberry Pi - Apt 201")
  location: String,           // Physical location
  status: String,             // "active", "inactive", "error"
  lastHeartbeat: Date,        // Last communication timestamp
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Reading Collection
```javascript
{
  deviceId: String,           // Links to Device
  current: Number,            // kW consumption
  voltage: Number,            // Voltage (default: 230V)
  power: Number,              // Calculated power (current × voltage)
  timestamp: Date,            // When reading was taken
  isAnomaly: Boolean,         // Flagged by statistical analysis
  anomalyScore: Number,       // 0-1 confidence (0.6+ = anomaly)
  processed: Boolean,         // ML processing status
  processedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Prediction Collection
```javascript
{
  deviceId: String,
  readingId: ObjectId,        // References Reading
  isPredictedTheft: Boolean,  // ML model output
  confidenceScore: Number,    // 0-1 model confidence
  predictionDetails: {
    features: {
      current: Number,
      rollingMean: Number,
      rollingStd: Number,
      timeOfDay: Number
    },
    modelVersion: String,
    modelType: String         // "lstm", "random_forest", etc.
  },
  flaggedAs: String,          // "normal", "suspicious", "high_risk", "theft_detected"
  timestamp: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Device Management

#### Register/Update Device
```http
POST /api/devices
Content-Type: application/json

{
  "deviceId": "rpi-apt-201",
  "name": "Raspberry Pi - Apartment 201",
  "location": "New York, NY"
}

Response:
{
  "success": true,
  "message": "Device registered successfully",
  "device": { ... }
}
```

#### Get All Devices
```http
GET /api/devices

Response:
{
  "success": true,
  "count": 5,
  "devices": [ ... ]
}
```

#### Get Single Device
```http
GET /api/devices/:deviceId

Response:
{
  "success": true,
  "device": { ... }
}
```

### Data Ingestion (Raspberry Pi → Cloud)

#### Send Energy Reading
```http
POST /api/readings
Content-Type: application/json

{
  "deviceId": "rpi-apt-201",
  "current": 3.2,           // kW
  "voltage": 230            // Optional, default 230V
}

Response:
{
  "success": true,
  "reading": {
    "_id": "...",
    "current": 3.2,
    "isAnomaly": false,
    "anomalyScore": 0.15,
    "timestamp": "2024-04-14T10:30:00.000Z"
  },
  "anomalyDetected": false,
  "anomalyScore": 0.15
}
```

#### Get Device Readings
```http
GET /api/readings/:deviceId?hours=24&limit=50

Response:
{
  "success": true,
  "deviceId": "rpi-apt-201",
  "count": 50,
  "timeRange": "24 hours",
  "readings": [ ... ]
}
```

### ML Model Integration

#### Get Training Data (for DL Model)
```http
GET /api/ml/training-data/:deviceId?hours=24&interval=hourly

Response:
{
  "success": true,
  "deviceId": "rpi-apt-201",
  "period": "24 hours",
  "interval": "hourly",
  "dataPoints": 24,
  "data": [
    {
      "bucket": "2024-04-14T00",
      "count": 12,
      "mean": 2.5,
      "max": 4.1,
      "min": 1.3,
      "stdDev": 0.8,
      "anomalyCount": 0,
      "avgAnomalyScore": 0.0
    },
    ...
  ],
  "statistics": {
    "totalReadings": 288,
    "mean": 2.4,
    "stdDev": 0.9,
    "max": 9.2,
    "min": 0.8,
    "anomalyCount": 3,
    "anomalyPercentage": 1.04
  }
}
```

#### Get Anomaly Samples (for supervised learning)
```http
GET /api/ml/anomaly-samples/:deviceId?limit=100

Response:
{
  "success": true,
  "deviceId": "rpi-apt-201",
  "anomalySampleCount": 15,
  "samples": [
    {
      "_id": "...",
      "current": 7.8,
      "isAnomaly": true,
      "anomalyScore": 0.92,
      "timestamp": "2024-04-14T09:15:00.000Z"
    },
    ...
  ]
}
```

#### Store ML Model Prediction
```http
POST /api/ml/predictions
Content-Type: application/json

{
  "deviceId": "rpi-apt-201",
  "readingId": "ObjectId of Reading",
  "isPredictedTheft": true,
  "confidenceScore": 0.89,
  "modelVersion": "v1.2.0",
  "modelType": "lstm"
}

Response:
{
  "success": true,
  "prediction": {
    "_id": "...",
    "deviceId": "rpi-apt-201",
    "isPredictedTheft": true,
    "confidenceScore": 0.89,
    "flaggedAs": "high_risk",
    "timestamp": "2024-04-14T09:15:02.000Z"
  }
}
```

#### Get Recent Predictions
```http
GET /api/ml/predictions/:deviceId?limit=20

Response:
{
  "success": true,
  "deviceId": "rpi-apt-201",
  "recentPredictions": [ ... ],
  "highRiskCount": 3
}
```

### Analytics

#### Get Device Statistics
```http
GET /api/analytics/device-stats/:deviceId

Response:
{
  "success": true,
  "deviceId": "rpi-apt-201",
  "stats": {
    "totalReadings": 288,
    "mean": 2.4,
    "stdDev": 0.9,
    "max": 9.2,
    "min": 0.8,
    "anomalyCount": 3,
    "anomalyPercentage": 1.04
  }
}
```

#### Get System Health
```http
GET /api/analytics/system-health

Response:
{
  "success": true,
  "systemHealth": {
    "totalDevices": 5,
    "activeDevices": 4,
    "totalReadings": 1500,
    "readingsLastHour": 250,
    "anomaliesDetected": 15,
    "anomalyRate": 1.0
  }
}
```

## Anomaly Detection Algorithm

The system uses an **ensemble approach** with three detection methods:

### 1. Absolute Threshold (50% weight)
- Flags readings above 5.0 kW as anomalies
- Simple and interpretable

### 2. Statistical Z-Score (30% weight)
- Compares current reading to rolling 20-reading mean/std
- Z-score > 2.5 indicates anomaly
- Adapts to device's baseline consumption pattern

### 3. Spike Detection (20% weight)
- Detects sudden consumption jumps
- >50% change from previous reading triggers flag
- Useful for catch sudden theft events

**Combined Score** = 0.5 × threshold + 0.3 × z_score + 0.2 × spike
- Score > 0.6 = flagged as anomaly
- Provides confidence 0-1.0

## Data Flow for ML Model

```
Raspberry Pi
    ↓
POST /api/readings
    ↓
[DataProcessor]
├─ Anomaly Detection
├─ Store in MongoDB
└─ Calculate Statistics
    ↓
GET /api/ml/training-data/:deviceId
    ↓
[Deep Learning Model]
├─ LSTM / Random Forest / Ensemble
└─ Generate Prediction
    ↓
POST /api/ml/predictions
    ↓
[Store Prediction in MongoDB]
    ↓
GET /api/ml/predictions/:deviceId
    ↓
[Frontend Dashboard]
Display Theft Alerts
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start MongoDB
```bash
# On Windows with MongoDB installed:
mongod

# Or use MongoDB Atlas (cloud):
# Update MONGODB_URI in .env to your Atlas connection string
```

### 3. Run Backend
```bash
npm start      # Production mode
# OR
npm run dev    # Development with nodemon
```

### 4. Verify Cloud Component
```bash
# Test device registration
curl -X POST http://localhost:5001/api/devices \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-01","name":"Test Device","location":"Lab"}'

# Test data ingestion
curl -X POST http://localhost:5001/api/readings \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-01","current":3.5,"voltage":230}'

# Get training data for ML
curl http://localhost:5001/api/ml/training-data/test-01?hours=24&interval=hourly

# Check system health
curl http://localhost:5001/api/health
```

## Raspberry Pi Integration Example

### Python Script for Raspberry Pi
```python
import requests
import time
from datetime import datetime

CLOUD_API = "http://your-cloud-server:5001/api"
DEVICE_ID = "rpi-apt-201"

# Register device
requests.post(
    f"{CLOUD_API}/devices",
    json={
        "deviceId": DEVICE_ID,
        "name": "Raspberry Pi - Apartment 201",
        "location": "NYC"
    }
)

# Send readings every 5 seconds
while True:
    try:
        # Read from your energy meter sensor
        current_kw = read_energy_sensor()  # Your sensor code
        
        # Send to cloud
        response = requests.post(
            f"{CLOUD_API}/readings",
            json={
                "deviceId": DEVICE_ID,
                "current": current_kw,
                "voltage": 230
            }
        )
        
        print(f"[{datetime.now()}] Sent: {current_kw} kW")
        
    except Exception as e:
        print(f"Error: {e}")
    
    time.sleep(5)
```

## Deep Learning Model Integration

Your ML model should:

1. **Fetch Training Data**
   ```
   GET /api/ml/training-data/:deviceId?hours=168&interval=hourly
   ```
   Returns: Aggregated readings with statistics

2. **Train Model**
   - Use aggregated data for supervised learning
   - Learn normal vs. theft patterns
   - Models: LSTM, Random Forest, Isolation Forest, Ensemble

3. **Run Inference**
   ```
   For each new Reading:
   - Get last 20 readings
   - Extract features (mean, std, current, time-of-day)
   - Pass through trained model
   - Get confidence score
   ```

4. **Store Predictions**
   ```
   POST /api/ml/predictions
   {
     "deviceId": "...",
     "readingId": "ObjectId from Reading",
     "isPredictedTheft": boolean,
     "confidenceScore": 0.0-1.0,
     "modelVersion": "v1.2.0",
     "modelType": "lstm"
   }
   ```

5. **Query Results**
   ```
   GET /api/ml/predictions/:deviceId?limit=100
   ```

## Configuration (.env)

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/energy-monitor
# For MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Server Configuration
PORT=5001
NODE_ENV=development

# ML Model Thresholds
THEFT_THRESHOLD=5.0           # kW absolute threshold
ANOMALY_CONFIDENCE_THRESHOLD=0.75  # Minimum ML confidence to flag
```

## Performance Considerations

- **Indexes**: Automatic on deviceId and timestamp for fast queries
- **Data Retention**: Keep last 50 readings in memory for backward compatibility
- **Aggregation**: Pre-computed hourly/daily buckets for ML model
- **Scalability**: MongoDB can handle millions of readings; consider sharding for very large deployments

## Security Notes

- Add authentication (JWT/OAuth) for production
- Validate deviceId ownership before processing
- Rate limit API endpoints
- Encrypt sensitive data (voltages, locations)
- Use HTTPS for all communications

## Troubleshooting

### MongoDB Connection Error
```
Error: MongoDB connection failed
Solution: Ensure MongoDB is running
  mongod                    # Start MongoDB
  # OR use MongoDB Atlas cloud database
```

### Device Not Found
```
Error: Device not found
Solution: Register device first
  POST /api/devices with valid deviceId
```

### No Data Retrieved
```
Solution: Check if readings exist in database
  GET /api/readings/:deviceId
  GET /api/analytics/system-health
```

---

**Last Updated**: April 2024  
**Version**: 1.0.0  
**Status**: Production Ready with ML Integration
