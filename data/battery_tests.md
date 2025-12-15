# WiFi Sensor Battery-Life Estimates

## Calculations (01/09/2025 — firmware v0.5.2-0)

- **Battery:** 270 mAh
- **Sync active window (5-min case):** 15.81 s @ 30.44 mA
- **Idle window (5-min case, Wi-Fi off):** 1.69 mA

---

## Battery-Life Formula

```math
I_\text{avg} = \frac{I_\text{on} \cdot t_\text{on} + I_\text{off} \cdot (T - t_\text{on})}{T}
```

with $T$ in seconds.

Battery life (hours):

```math
\text{Battery life} = \frac{270\ \text{mAh}}{I_\text{avg}}
```

---

## Comparison (Estimates)

### Battery-life Estimates

| Mode | Idle Current | Sync Window | Battery Life (hours) | Battery Life (days) | Gains vs Baseline |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Always online | 5.28 mA | 5.28 mA | 51.13 h | 2.13 d | −39% |
| **5 min** (baseline) | 1.69 mA | 15.81 s @ 30.44 mA | 84.24 h | 3.51 d | baseline |
| 15 min | 1.69 mA | 23.13 s @ 34.62 mA | 106.45 h | 4.44 d | +26% |
| 30 min | 1.69 mA | 32.74 s @ 37.98 mA | 114.89 h | 4.79 d | +36% |

---

## Observations

- With the measured behavior, the device runs **~3.5 days** at 5-minute sync intervals on a 270 mAh cell.
- These are worst-case scenarios (all algorithms on and always in Wi-Fi range).
- For bigger battery savings, **idle current reductions** are required because idle dominates as intervals grow (e.g., shut down BLE when not charging).
- The active sync window can be shortened (e.g., remove “get shadow” on every connection).
- Increasing the sync interval to **1 hour or more** provides further savings.

---

## Real-Life Benchmark (5-min baseline, v0.5.2-0)

| Pet | Battery Life (hours) | Battery Life (days) |
| :--- | :--- | :--- |
| Maven | >100 h | >4 d |
| Zesty | >100 h | >4 d |
| Chihiro | 91.28 h | 3.80 d |
| Luffy | 77.38 h | 3.22 d |

---

### Notes

- **02/09/2025** — changed BLE advertising, new idle average: **1.61 mA**

---

## Real-Life Benchmark (15-min baseline, v0.5.3-0)

| Pet | Battery Life (hours) | Battery Life (days) |
| :--- | :--- | :--- |
| Maven | >144 h | >6 d |
| Zesty | >144 h | >6 d |

---

## Real-Life Benchmark (15-min baseline, Master: 0.10.0-86 Slave: 0.8.0-17)

| Pet | Battery Life (hours) | Battery Life (days) |
| :--- | :--- | :--- |
| Maven | 184 h | >7 d |

---

## Real-Life Benchmark (15-min baseline, Master: 0.10.1-90 Slave: 0.8.0-17)

| Pet | Battery Life (hours) | Battery Life (days) |
| :--- | :--- | :--- |
| Zesty | >168 h | >7 d |

---

# 05/12/2025 Tests

*(Master FW: Multiple Wi-Fis branch, Slave FW: v0.8.0)*

### Notes

- **02/09/2025** — changed BLE advertising, new idle average: 1.61 mA
- **20/10/2025** — protobuf improvements led to faster sync window (23 s → ~15 s)

### New Calculations (multi_wifi_fw)

**15-min interval**

- Idle: 1.54 mA
- Sync: 15.88 s @ 30.41 mA

---

# 09/12/2025 Tests

*(Master FW: Multiple Wi-Fis V2 branch, Slave FW: v0.8.0)*

### New Calculations (multi_wifi_fw)

| Interval | Idle Current | WiFi driver on window | Notes |
| :--- | :--- | :--- | :--- |
| 15 min | 1.55 mA | 15.88 s @ 26.00 mA | Window when we are in range of our wifi network and we are able to sync the sensor data every 15 minutes |
| 5 min | 1.55 mA | 4.214 s @ 42.13 mA | Window where we are out of range of our wifi network and we try to find it on our 3 scan attempts, without success, every 5 minutes |

---

# 16/12/2025 Tests

*(Master FW: dfc03f16, Slave FW: c67df4b1)*

### New Calculations

| Interval | Idle Current | WiFi driver on window | Notes |
| :--- | :--- | :--- | :--- |
| 15 min | 1.52 mA | 16.51 s @ 25.52 mA | Window when we are in range of our wifi network and we are able to sync the sensor data every 15 minutes |
| 5 min | 1.52 mA | 4.071 s @ 42.26 mA | Window where we are out of range of our wifi network and we try to find it on our 3 scan attempts, without success, every 5 minutes |