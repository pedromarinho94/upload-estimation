# Firmware Analysis & Website Discrepancy Report

## Executive Summary
The "Device Estimator" website contains several logic flaws that lead to significant underestimation of upload times and inaccurate data volume predictions. These inaccuracies stem from discrepancies between the website's models and the actual firmware behavior verified in `m-sensor-iot` and `m-sensor-slave` codebases.

## Key Discrepancies

### 1. File Fragmentation & Overhead (Critical)
*   **Website Assumption:** Data from all sources is efficiently packed into 1024-byte files. Total files = `ceil(TotalBytes / 1024)`.
*   **Firmware Reality (`data_saver.c`):** 
    *   Data is saved into separate files **per data type** (Respiratory, Heart Rate, etc. each get their own file).
    *   The device resets every 1 hour when offline (via `connection_manager.c` timer, referencing `CONFIG_CONNECTION_MANAGER_NO_WIFI_INTERVAL_S` implicitly or similar logic).
    *   On reset, file handles in RAM are lost. The firmware always creates a **new file** upon reconnection/restart; it does not append to existing files.
*   **Impact:** Instead of a few large 1024-byte files, the device generates many small files (e.g., ~90-380 bytes).
    *   **Example:** In a 24-hour offline period, instead of ~20 large packed files, you will have at least 24 files *per data type* (e.g., 24 hours * 4-5 types = ~100+ files).
    *   **Result:** The per-file overhead (handshake, MQTT headers, ~0.5s-1.0s latency) applies 5-6x more often than estimated, drastically increasing "Time to Upload".

### 2. Respiratory Data Suppression (Incorrect Model)
*   **Website Assumption:** High activity levels "suppress" respiratory data (factor 0.1), assuming no data is recorded when the dog is moving.
*   **Firmware Reality (`algorithms.c`):** 
    *   The `algorithms_respiratory_callback` is called even when status is Invalid.
    *   `w_preconditions_on` handler unconditionally enqueues this data to `data_bridge`.
    *   `data_bridge` saves these entries to flash.
*   **Impact:** Respiratory data volume remains constant (or follows fixed time epochs) regardless of activity level. The website underestimates storage and upload time for active dogs.

### 3. Off-Body Logic (Missing Implementation)
*   **Website Assumption:** The "Off-Body Percentage" slider exists but is **not connected** to the byte calculation logic in `App.jsx`. Computations use the full duration regardless of this setting.
*   **Firmware Reality (`algorithms.c`):**
    *   When off-body is detected (`algorithms_off_body_status == true`):
        *   **Behaviors:** Algorithm is uninitialized (stops).
        *   **Heart Rate:** Algorithm is uninitialized (stops).
        *   **Respiratory:** Resting checks fail, algorithm is disabled (stops).
*   **Impact:** The website overestimates data volume for "Off-Body" scenarios. For a dog that is off-collar 50% of the time, the website predicts 2x the actual data volume for these metrics.

### 4. Activity Scaling
*   **Website Assumption:** Activity data scales with activity level (multipliers 0.6x - 1.8x).
*   **Firmware Reality:** Activity packets use a fixed-size structure (`ACTIVITY_ENCODED_SAMPLES_TOTAL`). Unless the *frequency* of logging changes (which appears fixed in the timer/epoch logic), the byte volume should be constant per hour.

## Recommended Fixes for `App.jsx`

1.  **Refactor File Count Calculation:**
    *   Calculate files **per data type**.
    *   Enforce a minimum of **1 file per hour** (or per reset interval) for each active data type.
    *   Formula: `TotalFiles = Sum_DetailedTypes( max( Hours, ceil(TypeBytes / 1024) ) )`.
2.  **Correct Respiratory Logic:**
    *   Remove `respiratoryFactor` or set it to 1.0.
3.  **Implement Off-Body Logic:**
    *   Apply `(1 - offBodyPercent)` factor to Behaviors, Heart Rate, and Respiratory bytes.
4.  **Review Activity Scaling:**
    *   Change Activity multiplier to 1.0 (constant) unless frequency scaling is confirmed.
