#!/usr/bin/env python3
"""
EnergyMonitor – LSTM Anomaly Detection
---------------------------------------
Usage:
  python model.py '{"data": [1.2, 1.4, 1.3, 1.5, 1.4], "new_value": 4.9}'
  python model.py --train        # force a fresh training run
  python model.py --retrain      # same as --train (alias)

Output (stdout) – always valid JSON:
  {
    "predicted":  1.42,
    "actual":     4.90,
    "error":      3.48,
    "threshold":  0.21,
    "is_anomaly": true,
    "confidence": 1.0,
    "severity":   "high"
  }
"""

import json
import os
import sys
from pathlib import Path

# ── Silence GPU / TF noise ────────────────────────────────────────────────────
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import numpy as np
import tensorflow as tf
from tensorflow import keras

# ── Config ────────────────────────────────────────────────────────────────────
WINDOW        = 5       # number of past readings fed to the model
EPOCHS        = 15      # sweet spot: fast enough, accurate enough
BATCH_SIZE    = 32
LSTM_UNITS    = 32      # larger than before → better pattern capture
THRESHOLD_PCT = 95      # percentile of training errors → anomaly threshold

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH    = ARTIFACTS_DIR / "lstm_model.keras"
META_PATH     = ARTIFACTS_DIR / "meta.json"


# ── Synthetic training data ───────────────────────────────────────────────────
def synthetic_series(length: int = 2000, seed: int = 42) -> np.ndarray:
    """
    Realistic household load curve:
      base daily cycle + 3rd/5th harmonics (appliance cycling) + noise
    Values stay in a [0.3, 6.0] kW-like range.
    """
    rng = np.random.default_rng(seed)
    x   = np.linspace(0, 8 * np.pi, length, dtype=np.float32)

    base     = 2.0 + 1.5 * np.sin(x)
    harmonic = 0.4 * np.sin(3 * x + 0.5) + 0.2 * np.sin(5 * x + 1.0)
    noise    = rng.normal(0.0, 0.12, size=length).astype(np.float32)

    series = base + harmonic + noise
    return np.clip(series, 0.3, 6.0).astype(np.float32)


# ── Helpers ───────────────────────────────────────────────────────────────────
def make_sequences(series: np.ndarray, window: int = WINDOW):
    xs, ys = [], []
    for i in range(len(series) - window):
        xs.append(series[i : i + window])
        ys.append(series[i + window])
    X = np.array(xs, dtype=np.float32).reshape(-1, window, 1)
    y = np.array(ys, dtype=np.float32)
    return X, y


def normalise(series: np.ndarray, mu: float, sigma: float) -> np.ndarray:
    return (series - mu) / (sigma + 1e-8)


# ── Model definition ──────────────────────────────────────────────────────────
def build_model(window: int = WINDOW) -> keras.Model:
    model = keras.Sequential(
        [
            keras.layers.Input(shape=(window, 1)),
            keras.layers.LSTM(LSTM_UNITS),
            keras.layers.Dropout(0.1),          # prevents overfitting to synthetic data
            keras.layers.Dense(16, activation="relu"),
            keras.layers.Dense(1),
        ],
        name="EnergyLSTM",
    )
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.005),
        loss="mse",
    )
    return model


# ── Training ──────────────────────────────────────────────────────────────────
def train_and_save() -> tuple:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    tf.keras.utils.set_random_seed(42)

    raw = synthetic_series()

    # Compute normalisation stats from training data
    mu    = float(raw.mean())
    sigma = float(raw.std())

    # Normalise → model sees zero-mean unit-variance data
    norm         = normalise(raw, mu, sigma)
    X_train, y_train = make_sequences(norm)

    model = build_model()
    model.fit(
        X_train, y_train,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        validation_split=0.1,
        verbose=0,
    )

    # Threshold = 95th percentile of training reconstruction errors
    train_preds = model.predict(X_train, verbose=0).reshape(-1)
    errors      = np.abs(train_preds - y_train)
    threshold   = float(np.percentile(errors, THRESHOLD_PCT))

    model.save(MODEL_PATH)
    META_PATH.write_text(
        json.dumps({
            "threshold": threshold,
            "mu":        mu,
            "sigma":     sigma,
            "window":    WINDOW,
        }),
        encoding="utf-8",
    )

    return model, threshold, mu, sigma


# ── Load cached or retrain ────────────────────────────────────────────────────
def load_or_train() -> tuple:
    if MODEL_PATH.exists() and META_PATH.exists():
        model = keras.models.load_model(MODEL_PATH)
        meta  = json.loads(META_PATH.read_text(encoding="utf-8"))

        # Backward-compatible: older meta files may not have mu/sigma
        mu    = float(meta.get("mu",    0.0))
        sigma = float(meta.get("sigma", 1.0))
        return model, float(meta["threshold"]), mu, sigma

    return train_and_save()


# ── Input parsing ─────────────────────────────────────────────────────────────
def parse_input() -> tuple:
    if len(sys.argv) < 2:
        raise ValueError(
            "Provide JSON payload as first argument: "
            "'{\"data\":[...], \"new_value\": number}'"
        )

    payload   = json.loads(sys.argv[1])
    data      = payload.get("data")
    new_value = payload.get("new_value")

    if not isinstance(data, list) or len(data) != WINDOW:
        raise ValueError(f"'data' must be a list of exactly {WINDOW} numbers.")

    try:
        data_arr  = np.array(data, dtype=np.float32)
        new_value = float(new_value)
    except Exception:
        raise ValueError("All values in 'data' and 'new_value' must be numeric.")

    return data_arr, new_value


# ── Severity helper ───────────────────────────────────────────────────────────
def get_severity(error: float, threshold: float) -> str:
    if error <= threshold:
        return "normal"
    ratio = error / (threshold + 1e-8)
    if ratio < 1.5:
        return "low"
    if ratio < 2.5:
        return "medium"
    return "high"


# ── Inference ─────────────────────────────────────────────────────────────────
def infer(data: np.ndarray, new_value: float) -> dict:
    model, threshold, mu, sigma = load_or_train()

    # Normalise inputs the same way training data was normalised
    norm_data      = normalise(data, mu, sigma)
    norm_new_value = float((new_value - mu) / (sigma + 1e-8))

    x             = norm_data.reshape(1, WINDOW, 1)
    norm_predicted = float(model.predict(x, verbose=0)[0][0])

    # For Energy Theft, we only flag unexpected *increases* in load (spikes).
    # We ignore random drops by using directional error instead of absolute variance.
    directional_error = float(norm_new_value - norm_predicted)
    norm_error = max(0.0, directional_error)
    is_anomaly = norm_error > threshold

    # Denormalise prediction for human-readable output
    predicted_kw = float(norm_predicted * (sigma + 1e-8) + mu)
    error_kw     = max(0.0, float(new_value - predicted_kw))

    # Confidence: 0.0 = definitely normal, 1.0 = definitely anomaly
    confidence = round(min(1.0, norm_error / (threshold + 1e-8)), 4)

    return {
        "predicted":  round(predicted_kw, 4),
        "actual":     round(new_value,    4),
        "error":      round(error_kw,     4),
        "threshold":  round(threshold * (sigma + 1e-8), 4),   # threshold in kW for display
        "is_anomaly": bool(is_anomaly),
        "confidence": confidence,
        "severity":   get_severity(norm_error, threshold),
    }


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    try:
        if "--train" in sys.argv or "--retrain" in sys.argv:
            _, threshold, mu, sigma = train_and_save()
            print(json.dumps({
                "status":    "trained",
                "threshold": round(threshold, 4),
                "mu":        round(mu, 4),
                "sigma":     round(sigma, 4),
            }))
            return

        data, new_value = parse_input()
        result          = infer(data, new_value)
        print(json.dumps(result))

    except Exception as exc:
        # Always output valid JSON so Node.js never crashes on parse
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()