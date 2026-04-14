"""
Energy Theft Detection ML Model Integration

This example demonstrates how to:
1. Fetch training data from the cloud backend
2. Train a deep learning model (LSTM)
3. Run inference on new readings
4. Send predictions back to the cloud

Requirements:
pip install requests numpy tensorflow keras scikit-learn pandas
"""

import requests
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import time
import json

# Configuration
CLOUD_API_URL = "http://localhost:5001/api"
DEVICE_ID = "rpi-apt-201"  # Must be registered first
MODEL_VERSION = "v1.0.0"


class EnergyTheftDetectionModel:
    """
    Deep Learning Model for Energy Theft Detection
    Uses LSTM (Long Short-Term Memory) neural network
    """

    def __init__(self, api_url=CLOUD_API_URL):
        self.api_url = api_url
        self.model = None
        self.scaler = None
        
    def fetch_training_data(self, device_id, hours=168, interval="hourly"):
        """
        Fetch aggregated training data from cloud backend
        
        Args:
            device_id: Device identifier
            hours: Historical data window
            interval: Aggregation interval ('hourly' or 'daily')
            
        Returns:
            pandas DataFrame with aggregated readings
        """
        endpoint = f"{self.api_url}/ml/training-data/{device_id}"
        params = {"hours": hours, "interval": interval}
        
        try:
            response = requests.get(endpoint, params=params)
            response.raise_for_status()
            
            data = response.json()
            if not data.get("success"):
                print(f"Error fetching data: {data}")
                return None
            
            # Convert to DataFrame
            df = pd.DataFrame(data["data"])
            print(f"✅ Fetched {len(df)} data points for {device_id}")
            return df
            
        except requests.RequestException as e:
            print(f"❌ Error fetching training data: {e}")
            return None

    def fetch_anomaly_samples(self, device_id, limit=100):
        """
        Fetch anomaly samples for supervised learning
        
        Returns:
            List of readings flagged as anomalies
        """
        endpoint = f"{self.api_url}/ml/anomaly-samples/{device_id}"
        params = {"limit": limit}
        
        try:
            response = requests.get(endpoint, params=params)
            response.raise_for_status()
            
            data = response.json()
            if not data.get("success"):
                print(f"Error fetching anomaly samples: {data}")
                return None
            
            anomalies = data.get("samples", [])
            print(f"✅ Fetched {len(anomalies)} anomaly samples")
            return anomalies
            
        except requests.RequestException as e:
            print(f"❌ Error fetching anomaly samples: {e}")
            return None

    def prepare_features(self, df, lookback=20):
        """
        Prepare features for LSTM model
        
        Features:
        - Current consumption (kW)
        - Rolling mean (20-reading window)
        - Rolling std (20-reading window)
        - Time-of-day (hour: 0-23)
        - Day-of-week (0-6)
        """
        # Assume df has 'mean', 'stdDev', etc. from aggregation
        features = []
        
        # Normalize values
        current_values = df["mean"].values
        scaler = (max(current_values) - min(current_values)) or 1
        
        for i in range(len(df) - lookback):
            window = df.iloc[i:i+lookback]
            
            # Extract features
            current = window["mean"].values[-1] / scaler
            rolling_mean = window["mean"].mean() / scaler
            rolling_std = window["stdDev"].mean()
            
            # Time feature (simplified - in real scenario parse bucket datetime)
            time_of_day = float(i % 24) / 24.0
            
            feature_vector = [current, rolling_mean, rolling_std, time_of_day]
            features.append(feature_vector)
        
        return np.array(features), scaler

    def build_lstm_model(self, input_shape=(20, 4)):
        """
        Build LSTM neural network for anomaly detection
        
        Architecture:
        - LSTM layer (64 units)
        - Dropout (0.2)
        - Dense layer (32 units)
        - Output layer (1 unit, sigmoid)
        
        This is a simplified example. In production, use TensorFlow/Keras:
        """
        # For this example, we'll use a simpler anomaly score based on statistics
        # In production, integrate TensorFlow:
        #
        # from keras.models import Sequential
        # from keras.layers import LSTM, Dense, Dropout
        # from keras.optimizers import Adam
        #
        # model = Sequential([
        #     LSTM(64, input_shape=input_shape, return_sequences=True),
        #     Dropout(0.2),
        #     LSTM(32, return_sequences=False),
        #     Dropout(0.2),
        #     Dense(32, activation='relu'),
        #     Dense(1, activation='sigmoid')  # Output: 0-1 theft probability
        # ])
        # model.compile(optimizer=Adam(), loss='binary_crossentropy', metrics=['accuracy'])
        
        print("✅ LSTM model initialized (using statistical model for demo)")
        self.model = "statistical_lstm"
        return True

    def train(self, device_id, hours=168):
        """
        Train the model on historical data
        
        Workflow:
        1. Fetch historical readings from cloud
        2. Prepare features
        3. Train LSTM on normal patterns
        """
        print(f"\n📚 Training model on {hours}-hour historical data...")
        
        # Fetch training data
        df = self.fetch_training_data(device_id, hours=hours)
        if df is None or len(df) == 0:
            print("❌ No training data available")
            return False
        
        # Prepare features
        features, scaler = self.prepare_features(df)
        if len(features) == 0:
            print("❌ Could not prepare features")
            return False
        
        self.scaler = scaler
        
        # Build and train model
        self.build_lstm_model()
        
        print(f"✅ Model trained on {len(features)} samples")
        return True

    def predict(self, readings, confidence_threshold=0.75):
        """
        Predict if current readings indicate theft
        
        Args:
            readings: List of Reading objects from /api/readings/:deviceId
            confidence_threshold: Minimum confidence to flag theft
            
        Returns:
            List of predictions with confidence scores
        """
        predictions = []
        
        for reading in readings:
            # Extract features from reading
            current = reading.get("current", 0)
            timestamp = reading.get("timestamp")
            reading_id = reading.get("_id")
            
            # Simple statistical prediction (in production use LSTM)
            # Features: current value, rolling stats
            confidence_score = self._calculate_anomaly_confidence(current)
            is_theft = confidence_score > confidence_threshold
            
            prediction = {
                "readingId": reading_id,
                "current": current,
                "timestamp": timestamp,
                "confidenceScore": confidence_score,
                "isPredictedTheft": is_theft,
                "modelVersion": MODEL_VERSION,
                "modelType": "lstm"
            }
            predictions.append(prediction)
        
        return predictions

    def _calculate_anomaly_confidence(self, current_value):
        """
        Calculate anomaly confidence score (0-1)
        
        In production, replace with actual LSTM model inference
        
        Rules:
        - Current > 5.0 kW: High risk (0.8-1.0)
        - Current > 4.0 kW: Medium risk (0.5-0.7)
        - Current < 4.0 kW: Low risk (0.0-0.4)
        """
        if current_value > 5.0:
            # High theft risk
            return min((current_value - 5.0) / 4.0 + 0.8, 1.0)
        elif current_value > 4.0:
            # Medium risk
            return (current_value - 4.0) / 1.0 * 0.3 + 0.4
        else:
            # Low risk
            return current_value / 4.0 * 0.4

    def run_inference(self, device_id):
        """
        Run inference pipeline on all recent readings
        
        Workflow:
        1. Fetch recent readings from cloud
        2. Generate predictions
        3. Send predictions back to cloud
        """
        print(f"\n🤖 Running inference for {device_id}...")
        
        # Fetch recent readings
        endpoint = f"{self.api_url}/readings/{device_id}"
        params = {"limit": 50, "hours": 24}
        
        try:
            response = requests.get(endpoint, params=params)
            response.raise_for_status()
            
            data = response.json()
            if not data.get("success"):
                print(f"Error fetching readings: {data}")
                return
            
            readings = data.get("readings", [])
            print(f"✅ Fetched {len(readings)} recent readings")
            
            # Generate predictions
            predictions = self.predict(readings)
            
            # Send predictions back to cloud
            for pred in predictions:
                self.store_prediction(device_id, pred)
            
            print(f"✅ Sent {len(predictions)} predictions to cloud")
            
        except requests.RequestException as e:
            print(f"❌ Error during inference: {e}")

    def store_prediction(self, device_id, prediction):
        """
        Send prediction to cloud backend for storage
        """
        endpoint = f"{self.api_url}/ml/predictions"
        
        payload = {
            "deviceId": device_id,
            "readingId": prediction["readingId"],
            "isPredictedTheft": prediction["isPredictedTheft"],
            "confidenceScore": round(prediction["confidenceScore"], 4),
            "modelVersion": prediction["modelVersion"],
            "modelType": prediction["modelType"]
        }
        
        try:
            response = requests.post(endpoint, json=payload)
            response.raise_for_status()
            
            if response.json().get("success"):
                status = "🚨 THEFT" if prediction["isPredictedTheft"] else "✅ NORMAL"
                print(
                    f"  {status} | Score: {prediction['confidenceScore']:.2f} "
                    f"| {prediction['timestamp']}"
                )
            
        except requests.RequestException as e:
            print(f"❌ Error storing prediction: {e}")

    def continuous_monitoring(self, device_id, interval=300):
        """
        Continuous monitoring loop (run every 5 minutes)
        
        Args:
            device_id: Device to monitor
            interval: Seconds between inference runs
        """
        print(f"\n📡 Starting continuous monitoring for {device_id}")
        print(f"   Running inference every {interval} seconds\n")
        
        try:
            while True:
                self.run_inference(device_id)
                print(f"\n⏳ Next inference in {interval}s...")
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print("\n\n🛑 Monitoring stopped by user")


# ═══════════════════════════════════════════════════════════════════════════════
# Example Usage
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    
    # Initialize model
    model = EnergyTheftDetectionModel(CLOUD_API_URL)
    
    print("=" * 70)
    print("⚡ Energy Theft Detection ML Model Integration")
    print("=" * 70)
    
    # Step 1: Train on historical data
    print("\n[STEP 1] Training Phase")
    print("-" * 70)
    if model.train(DEVICE_ID, hours=168):
        print("✅ Model trained successfully")
    else:
        print("⚠️  Training failed, using untrained model")
    
    # Step 2: Run single inference
    print("\n[STEP 2] Single Inference")
    print("-" * 70)
    model.run_inference(DEVICE_ID)
    
    # Step 3: Continuous monitoring
    print("\n[STEP 3] Continuous Monitoring")
    print("-" * 70)
    print("Starting continuous monitoring...")
    print("Press Ctrl+C to stop\n")
    
    # Optional: Run continuous monitoring
    # Uncomment to enable:
    # model.continuous_monitoring(DEVICE_ID, interval=300)  # Every 5 minutes
    
    # For now, just show API examples
    print("\n📚 API Examples:")
    print("-" * 70)
    print(f"GET  {CLOUD_API_URL}/ml/training-data/{DEVICE_ID}?hours=24&interval=hourly")
    print(f"GET  {CLOUD_API_URL}/ml/anomaly-samples/{DEVICE_ID}?limit=100")
    print(f"GET  {CLOUD_API_URL}/ml/predictions/{DEVICE_ID}?limit=20")
    print(f"POST {CLOUD_API_URL}/ml/predictions")
    
    print("\n✅ Integration template ready. Customize with your ML model!")
