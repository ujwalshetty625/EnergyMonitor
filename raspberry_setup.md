# 🍓 Raspberry Pi Setup Guide

This guide explains how to connect your Raspberry Pi (or similar edge hardware) to the `EnergyMonitor` system securely via your local network.

## 📡 Prerequisites
1. Ensure your central Laptop/PC running the `EnergyMonitor` backend and your Raspberry Pi are connected to the **same exact Wi-Fi network** (or Ethernet subnet).
2. Obtain the exact IP Address of the Laptop/PC running the Node backend (e.g. `192.168.31.238`).
3. Ensure port `5001` is allowed on your firewall (Windows Defender / Third-Party Antivirus) if you hit connection issues.

## ⚙️ Running the IoT Data Sender

The script below will generate random energy figures (with an occasional simulated power spike representing theft) and POSTs the payload to your laptop's backend in real-time.

1. SSH into your Raspberry Pi or open its local terminal.
2. Create a new Python file:
   ```bash
   nano iot_sender.py
   ```
3. Copy and paste the script below into the Nano editor. 

**🚨 CRITICAL:** Remember to change `192.168.31.238` to your Laptop's actual current IP address exactly.

```python
import requests
import random
import time

# UPDATE THIS IP ADDRESS to match your computer's local IP connecting to Port 5001
API_URL = "http://192.168.31.238:5001/api/data"

while True:
    # Simulating data payload with a mix of normal consumption and potential theft
    data = {
        "device_id": "RPI_01",
        "value": round(random.uniform(5.0, 20.0), 2),
        "status": random.choice(["normal", "theft"]),
        "timestamp": time.time()
    }

    try:
        r = requests.post(API_URL, json=data)
        print("Sent:", data, "| status_code:", r.status_code)
    except Exception as e:
        print("Error sending data:", e)

    # Wait 5 seconds before sending next reading
    time.sleep(5)
```

4. Save the file in the nano editor by pressing: `Ctrl + O` -> `Enter` -> `Ctrl + X`.
5. Run the IoT script:
   ```bash
   python3 iot_sender.py
   ```

Assuming your backend on your laptop is running properly without firewall obstruction, the terminal on your Raspberry Pi will repeatedly log `status_code: 201`. 

If you view the live React Dashboard, it will immediately pull and visualize this new Raspberry Pi data dynamically!
