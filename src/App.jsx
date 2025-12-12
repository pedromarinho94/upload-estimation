import React, { useState, useEffect } from 'react';
import { Clock, Database, Wifi, Calendar, Battery, Zap, Activity, Heart, Dog, Cat } from 'lucide-react';

export default function App() {
    // File size from Kconfig: DATA_SAVER_MAX_FILE_SIZE = 1024 bytes
    const FILE_SIZE_BYTES = 1024;

    // Per-data-type file rates (files per hour) - derived from real device logs
    // Reference: 14 hours offline produced 33 files (14 activity, 4 respiratory, 4 behaviors, 10 HR, 1 notification)
    const dataTypeConfigs = {
        activity: {
            label: 'Activity',
            icon: '🏃',
            baseRate: 1.0,           // 14 files / 14 hours = 1.0 files/hour (from logs)
            activityScales: true,    // More activity = more files
            color: 'bg-blue-500'
        },
        respiratory: {
            label: 'Respiratory',
            icon: '🫁',
            baseRate: 0.29,          // 4 files / 14 hours = 0.29 files/hour (from logs)
            sleepBoost: 1.5,         // More readings during rest
            color: 'bg-green-500'
        },
        behaviors: {
            label: 'Behaviors',
            icon: '🐕',
            baseRate: 0.29,          // 4 files / 14 hours = 0.29 files/hour (from logs)
            activityScales: true,    // More shaking/drinking when active
            color: 'bg-yellow-500'
        },
        heartRate: {
            label: 'Heart Rate',
            icon: '❤️',
            baseRate: 0.71,          // 10 files / 14 hours = 0.71 files/hour (from logs)
            sleepBoost: 1.5,         // More HR readings during rest
            color: 'bg-red-500'
        },
        notifications: {
            label: 'Notifications',
            icon: '🔔',
            baseRate: 0.07,          // 1 file / 14 hours = 0.07 files/hour (from logs)
            color: 'bg-purple-500'
        }
    };

    // Network upload speeds (seconds per file)
    const networkLevels = {
        excellent: { label: 'Excellent', secondsPerFile: 1.5, icon: '🚀' },
        good: { label: 'Good', secondsPerFile: 1.88, icon: '✅' },
        fair: { label: 'Fair', secondsPerFile: 2.8, icon: '⚠️' },
        poor: { label: 'Poor', secondsPerFile: 4.7, icon: '🐌' }
    };

    const activityLevels = {
        low: { label: 'Low', multiplier: 0.6, icon: '😴' },
        normal: { label: 'Normal', multiplier: 1.0, icon: '🐕' },
        active: { label: 'Active', multiplier: 1.4, icon: '🏃' },
        veryActive: { label: 'Very Active', multiplier: 1.8, icon: '⚡' }
    };

    const petTypes = {
        dog: { label: 'Dog', activityMultiplier: 1.0, icon: '🐕' },
        cat: { label: 'Cat', activityMultiplier: 0.7, icon: '🐱' }
    };

    const powerModes = {
        charging: { label: 'Charging', syncIntervalHours: 0, icon: '🔌', description: 'Continuous sync' },
        battery: { label: 'Battery', syncIntervalHours: 0.25, icon: '🔋', description: '15 min intervals' }
    };

    // State
    const [days, setDays] = useState(2);
    const [networkLevel, setNetworkLevel] = useState('good');
    const [activityLevel, setActivityLevel] = useState('normal');
    const [petType, setPetType] = useState('dog');
    const [powerMode, setPowerMode] = useState('charging');
    const [offBodyPercent, setOffBodyPercent] = useState(10);
    const [enabledDataTypes, setEnabledDataTypes] = useState({
        activity: true,
        respiratory: true,
        behaviors: true,
        heartRate: true,
        notifications: true
    });

    const [results, setResults] = useState({
        totalFiles: 0,
        uploadSeconds: 0,
        dataHours: 0,
        storageKB: 0,
        syncCycles: 0,
        breakdown: {}
    });

    // Toggle data type
    const toggleDataType = (type) => {
        setEnabledDataTypes(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    // Calculate results
    useEffect(() => {
        const hours = days * 24;
        const activityMult = activityLevels[activityLevel].multiplier;
        const petMult = petTypes[petType].activityMultiplier;
        const onBodyPercent = (100 - offBodyPercent) / 100;
        const secondsPerFile = networkLevels[networkLevel].secondsPerFile;

        // Calculate files per data type
        const breakdown = {};
        let totalFiles = 0;

        Object.entries(dataTypeConfigs).forEach(([type, config]) => {
            if (!enabledDataTypes[type]) {
                breakdown[type] = { files: 0, seconds: 0 };
                return;
            }

            let rate = config.baseRate;

            // Apply activity multiplier for activity-dependent types
            if (config.activityScales) {
                rate *= activityMult * petMult;
            }

            // Apply sleep boost (assume ~33% of day is sleep-like rest)
            if (config.sleepBoost) {
                rate = rate * 0.67 + (rate * config.sleepBoost) * 0.33;
            }

            // Calculate files for this type
            let files = Math.round(rate * hours * onBodyPercent);

            // Activity type generates empty files when off-body, so it's always generated
            if (type === 'activity') {
                files = Math.round(rate * hours);
            }

            const uploadTime = Math.round(files * secondsPerFile);

            breakdown[type] = { files, seconds: uploadTime };
            totalFiles += files;
        });

        const baseUploadSeconds = Math.round(totalFiles * secondsPerFile);
        const storageKB = Math.round((totalFiles * FILE_SIZE_BYTES) / 1024);

        // Sync cycles in battery mode (every 15 min = 0.25 hours)
        const syncCycles = powerMode === 'battery'
            ? Math.ceil(hours / 0.25)
            : 1;

        // Connection overhead per sync cycle (WiFi connect, MQTT handshake, auth)
        // Based on CONNECTION_MANAGER configs: ~5 seconds per connection establishment
        const CONNECTION_OVERHEAD_SECONDS = 5;
        const overheadSeconds = syncCycles * CONNECTION_OVERHEAD_SECONDS;
        const uploadSeconds = baseUploadSeconds + overheadSeconds;

        // Round all values to avoid floating-point precision display issues
        setResults({
            totalFiles: Math.round(totalFiles),
            uploadSeconds: Math.round(uploadSeconds),
            baseUploadSeconds: Math.round(baseUploadSeconds),
            overheadSeconds: Math.round(overheadSeconds),
            dataHours: Math.round(hours * 100) / 100,  // 2 decimal places
            storageKB: Math.round(storageKB * 100) / 100,
            syncCycles: Math.round(syncCycles),
            breakdown
        });
    }, [days, networkLevel, activityLevel, petType, powerMode, offBodyPercent, enabledDataTypes]);

    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins < 60) return `${mins}m ${secs}s`;
        const hours = Math.floor(mins / 60);
        const remainMins = mins % 60;
        return `${hours}h ${remainMins}m ${secs}s`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Database className="w-8 h-8 text-indigo-600" />
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Smart Collar Upload Calculator</h1>
                    </div>

                    {/* Reference Data */}
                    <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                        <h2 className="text-sm font-semibold text-indigo-900 mb-2">Based on Real Device Logs</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-indigo-700">
                            <div>📅 14 hours offline</div>
                            <div>📊 33 files total</div>
                            <div>⏱️ 62s upload time</div>
                            <div>📶 ~1.88s per file</div>
                        </div>
                    </div>

                    {/* Data Types Section */}
                    <div className="mb-6">
                        <label className="flex items-center gap-2 text-gray-700 font-medium mb-3">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            Data Types to Sync
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {Object.entries(dataTypeConfigs).map(([type, config]) => (
                                <button
                                    key={type}
                                    onClick={() => toggleDataType(type)}
                                    className={`p-3 rounded-lg border-2 transition-all ${enabledDataTypes[type]
                                        ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                        : 'border-gray-200 bg-gray-50 opacity-60'
                                        }`}
                                >
                                    <div className="text-xl mb-1">{config.icon}</div>
                                    <div className="text-xs font-medium">{config.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Settings Row */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Pet Type */}
                        <div>
                            <label className="text-sm text-gray-600 font-medium mb-2 block">Pet Type</label>
                            <div className="flex gap-2">
                                {Object.entries(petTypes).map(([type, config]) => (
                                    <button
                                        key={type}
                                        onClick={() => setPetType(type)}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${petType === type
                                            ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-indigo-300'
                                            }`}
                                    >
                                        <div className="text-2xl">{config.icon}</div>
                                        <div className="text-xs font-medium">{config.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Power Mode */}
                        <div>
                            <label className="text-sm text-gray-600 font-medium mb-2 block">Power Mode</label>
                            <div className="flex gap-2">
                                {Object.entries(powerModes).map(([mode, config]) => (
                                    <button
                                        key={mode}
                                        onClick={() => setPowerMode(mode)}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${powerMode === mode
                                            ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-indigo-300'
                                            }`}
                                    >
                                        <div className="text-2xl">{config.icon}</div>
                                        <div className="text-xs font-medium">{config.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 mb-8">
                        {/* Days slider */}
                        <div>
                            <label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                Days of Data to Upload
                            </label>
                            <input
                                type="range"
                                min="0.2"
                                max="7"
                                step="0.2"
                                value={days}
                                onChange={(e) => setDays(parseFloat(e.target.value))}
                                className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-sm text-gray-600 mt-1">
                                <span>0.2 days</span>
                                <span className="text-lg font-bold text-indigo-600">{days} days</span>
                                <span>7 days</span>
                            </div>
                        </div>

                        {/* Off-body percentage */}
                        <div>
                            <label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                                <span className="text-indigo-600">📍</span>
                                Off-Body Time
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="90"
                                step="5"
                                value={offBodyPercent}
                                onChange={(e) => setOffBodyPercent(parseInt(e.target.value))}
                                className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-sm text-gray-600 mt-1">
                                <span>0%</span>
                                <span className="font-medium text-indigo-600">{offBodyPercent}% off-body</span>
                                <span>90%</span>
                            </div>
                        </div>

                        {/* Network Conditions */}
                        <div>
                            <label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                                <Wifi className="w-5 h-5 text-indigo-600" />
                                Network Conditions
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.entries(networkLevels).map(([key, { label, icon }]) => (
                                    <button
                                        key={key}
                                        onClick={() => setNetworkLevel(key)}
                                        className={`p-3 rounded-lg border-2 transition-all ${networkLevel === key
                                            ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-indigo-300'
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{icon}</div>
                                        <div className="text-sm font-medium">{label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pet Activity Level */}
                        <div>
                            <label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                                <Clock className="w-5 h-5 text-indigo-600" />
                                Pet Activity Level
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.entries(activityLevels).map(([key, { label, icon }]) => (
                                    <button
                                        key={key}
                                        onClick={() => setActivityLevel(key)}
                                        className={`p-3 rounded-lg border-2 transition-all ${activityLevel === key
                                            ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-indigo-300'
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{icon}</div>
                                        <div className="text-sm font-medium">{label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-6">
                        <h2 className="text-2xl font-bold mb-4">Estimated Upload Time</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                <div className="text-sm opacity-90 mb-1">Total Files</div>
                                <div className="text-2xl font-bold">{results.totalFiles}</div>
                            </div>
                            <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                <div className="text-sm opacity-90 mb-1">Data Period</div>
                                <div className="text-2xl font-bold">{results.dataHours}h</div>
                            </div>
                            <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                <div className="text-sm opacity-90 mb-1">Storage Used</div>
                                <div className="text-2xl font-bold">{results.storageKB} KB</div>
                            </div>
                            <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                <div className="text-sm opacity-90 mb-1">Sync Cycles</div>
                                <div className="text-2xl font-bold">{results.syncCycles}</div>
                            </div>
                            <div className="col-span-2 md:col-span-4 bg-white bg-opacity-20 rounded-lg p-6 text-center">
                                <div className="text-sm opacity-90 mb-2">Total Upload Duration</div>
                                <div className="text-4xl md:text-5xl font-bold">{formatTime(results.uploadSeconds)}</div>
                                {results.overheadSeconds > 0 && (
                                    <div className="text-sm mt-2 opacity-80">
                                        ({formatTime(results.baseUploadSeconds || 0)} data + {formatTime(results.overheadSeconds || 0)} connection overhead)
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Breakdown by Data Type */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-gray-700 mb-3">Breakdown by Data Type</h3>
                        <div className="space-y-2">
                            {Object.entries(dataTypeConfigs).map(([type, config]) => {
                                const data = results.breakdown[type] || { files: 0, seconds: 0 };
                                const widthPercent = results.totalFiles > 0
                                    ? (data.files / results.totalFiles) * 100
                                    : 0;

                                return (
                                    <div key={type} className={`${!enabledDataTypes[type] ? 'opacity-40' : ''}`}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{config.icon} {config.label}</span>
                                            <span className="text-gray-600">
                                                {data.files} files ({formatTime(data.seconds)})
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`${config.color} h-2 rounded-full transition-all`}
                                                style={{ width: `${widthPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Calculation Details */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-2">Calculation Details</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• File size: {FILE_SIZE_BYTES} bytes (from firmware config)</li>
                            <li>• Upload speed: ~{networkLevels[networkLevel].secondsPerFile}s per file ({networkLevels[networkLevel].label})</li>
                            <li>• Pet type: {petTypes[petType].label} ({petTypes[petType].activityMultiplier}x activity)</li>
                            <li>• Activity level: {activityLevels[activityLevel].label} ({activityLevels[activityLevel].multiplier}x)</li>
                            <li>• Power mode: {powerModes[powerMode].label} - {powerModes[powerMode].description}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}