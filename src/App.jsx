import React, { useState, useEffect } from 'react';
import { Clock, Database, Wifi, Calendar, Battery, Zap, Activity, Heart, Dog, Settings, Edit2 } from 'lucide-react';

export default function App() {
    // File size from Kconfig: DATA_SAVER_MAX_FILE_SIZE = 1024 bytes
    const FILE_SIZE_BYTES = 1024;

    // Per-data-type file rates (only used in Upload Calculator)
    const dataTypeConfigs = {
        activity: { label: 'Activity', icon: '🏃', baseRate: 1.0, activityScales: true, color: 'bg-blue-500' },
        respiratory: { label: 'Respiratory', icon: '🫁', baseRate: 0.29, sleepBoost: 1.5, color: 'bg-green-500' },
        behaviors: { label: 'Behaviors', icon: '🐕', baseRate: 0.29, activityScales: true, color: 'bg-yellow-500' },
        heartRate: { label: 'Heart Rate', icon: '❤️', baseRate: 0.71, sleepBoost: 1.5, color: 'bg-red-500' },
        notifications: { label: 'Notifications', icon: '🔔', baseRate: 0.07, color: 'bg-purple-500' }
    };

    // Simplified Network Levels (Good & Poor only)
    const networkLevels = {
        good: { label: 'Good', secondsPerFile: 1.88, icon: '✅' },
        poor: { label: 'Poor', secondsPerFile: 4.7, icon: '🐌' }
    };

    const activityLevels = {
        low: { label: 'Low', multiplier: 0.6, icon: '😴' },
        normal: { label: 'Normal', multiplier: 1.0, icon: '🐕' },
        active: { label: 'Active', multiplier: 1.4, icon: '🏃' },
        veryActive: { label: 'Very Active', multiplier: 1.8, icon: '⚡' }
    };

    const powerModes = {
        charging: { label: 'Charging', syncIntervalHours: 0, icon: '🔌', description: 'Continuous sync' },
        battery: { label: 'Battery', syncIntervalHours: 0.25, icon: '🔋', description: '15 min intervals' }
    };

    // --- State Management ---
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'battery'

    // Upload Calculator State
    const [days, setDays] = useState(2);
    const [networkLevel, setNetworkLevel] = useState('good');
    const [activityLevel, setActivityLevel] = useState('normal');
    // Removed petType state, defaulting to Dog logic (multiplier 1.0)
    const [powerMode, setPowerMode] = useState('charging');
    const [offBodyPercent, setOffBodyPercent] = useState(10);
    const [enabledDataTypes, setEnabledDataTypes] = useState({
        activity: true, respiratory: true, behaviors: true, heartRate: true, notifications: true
    });

    // Battery Estimator State (Configurable Inputs)
    const [batteryCapacity, setBatteryCapacity] = useState(270);
    const [idleCurrent, setIdleCurrent] = useState(1.55);

    const [onlineActiveMa, setOnlineActiveMa] = useState(26.00);
    const [onlineActiveS, setOnlineActiveS] = useState(15.88);
    const [onlineIntervalS, setOnlineIntervalS] = useState(900); // 15 min

    const [offlineActiveMa, setOfflineActiveMa] = useState(42.13);
    const [offlineActiveS, setOfflineActiveS] = useState(4.21);
    const [offlineIntervalS, setOfflineIntervalS] = useState(300); // 5 min

    const [hoursOnline, setHoursOnline] = useState(24);

    const [results, setResults] = useState({
        totalFiles: 0, uploadSeconds: 0, dataHours: 0, storageKB: 0, syncCycles: 0, breakdown: {}
    });

    const [batteryResults, setBatteryResults] = useState({
        lifeDays: 0, lifeHours: 0, avgCurrentMa: 0
    });

    // Toggle data type helper
    const toggleDataType = (type) => {
        setEnabledDataTypes(prev => ({ ...prev, [type]: !prev[type] }));
    };

    // --- Effects ---

    // 1. Calculate Upload Stats
    useEffect(() => {
        const hours = days * 24;
        const activityMult = activityLevels[activityLevel].multiplier;
        // const petMult = petTypes[petType].activityMultiplier; // Removed, always 1.0 for Dog
        const onBodyPercent = (100 - offBodyPercent) / 100;
        const secondsPerFile = networkLevels[networkLevel].secondsPerFile;

        const breakdown = {};
        let totalFiles = 0;

        Object.entries(dataTypeConfigs).forEach(([type, config]) => {
            if (!enabledDataTypes[type]) {
                breakdown[type] = { files: 0, seconds: 0 };
                return;
            }
            let rate = config.baseRate;
            if (config.activityScales) rate *= activityMult; // Removed petMult
            if (config.sleepBoost) rate = rate * 0.67 + (rate * config.sleepBoost) * 0.33;

            let files = Math.round(rate * hours * (type === 'activity' ? 1 : onBodyPercent));
            const uploadTime = Math.round(files * secondsPerFile);
            breakdown[type] = { files, seconds: uploadTime };
            totalFiles += files;
        });

        const baseUploadSeconds = Math.round(totalFiles * secondsPerFile);
        const storageKB = Math.round((totalFiles * FILE_SIZE_BYTES) / 1024);
        const syncCycles = powerMode === 'battery' ? Math.ceil(hours / 0.25) : 1;
        const overheadSeconds = syncCycles * 5; // 5s connection overhead

        setResults({
            totalFiles,
            uploadSeconds: baseUploadSeconds + overheadSeconds,
            baseUploadSeconds,
            overheadSeconds,
            dataHours: hours,
            storageKB,
            syncCycles,
            breakdown
        });
    }, [days, networkLevel, activityLevel, powerMode, offBodyPercent, enabledDataTypes]);

    // 2. Calculate Battery Life
    useEffect(() => {
        const hoursOffline = 24 - hoursOnline;

        // Ensure no division by zero
        const safeOnlineInterval = onlineIntervalS || 1;
        const safeOfflineInterval = offlineIntervalS || 1;

        // Online Avg Current: (Active + Idle) / Total Time
        const avgCurrentOnline = (onlineActiveMa * onlineActiveS + idleCurrent * (safeOnlineInterval - onlineActiveS)) / safeOnlineInterval;

        // Offline Avg Current
        const avgCurrentOffline = (offlineActiveMa * offlineActiveS + idleCurrent * (safeOfflineInterval - offlineActiveS)) / safeOfflineInterval;

        // Daily Weighted Average
        const dailyAvgCurrent = (avgCurrentOnline * hoursOnline + avgCurrentOffline * hoursOffline) / 24;

        // Life = Capacity / AvgCurrent
        const lifeHours = dailyAvgCurrent > 0 ? batteryCapacity / dailyAvgCurrent : 0;
        const lifeDays = lifeHours / 24;

        setBatteryResults({
            lifeDays: Math.round(lifeDays * 10) / 10,
            lifeHours: Math.round(lifeHours),
            avgCurrentMa: Math.round(dailyAvgCurrent * 100) / 100
        });
    }, [batteryCapacity, idleCurrent, onlineActiveMa, onlineActiveS, onlineIntervalS, offlineActiveMa, offlineActiveS, offlineIntervalS, hoursOnline]);


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
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
            <div className="max-w-5xl mx-auto">

                {/* Header & Tabs */}
                <div className="bg-white rounded-t-2xl shadow-sm border-b p-6 pb-0">
                    <div className="flex items-center gap-3 mb-6">
                        <Database className="w-8 h-8 text-indigo-600" />
                        <h1 className="text-2xl font-bold text-gray-900">Device Estimator</h1>
                    </div>

                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('upload')}
                            className={`pb-4 px-2 font-medium border-b-2 transition-colors ${activeTab === 'upload'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="flex items-center gap-2"><Wifi className="w-4 h-4" /> Upload Calculator</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('battery')}
                            className={`pb-4 px-2 font-medium border-b-2 transition-colors ${activeTab === 'battery'
                                    ? 'border-green-600 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="flex items-center gap-2"><Battery className="w-4 h-4" /> Battery Life</span>
                        </button>
                    </div>
                </div>

                {/* --- TAB CONTENT: UPLOAD CALCULATOR --- */}
                {activeTab === 'upload' && (
                    <div className="bg-white rounded-b-2xl shadow-xl p-6 md:p-8 animate-in fade-in zoom-in duration-300">
                        {/* Reference Data */}
                        <div className="bg-indigo-50 rounded-lg p-4 mb-6 text-sm text-indigo-800 flex gap-6">
                            <span><strong>Reference Log (14h offline):</strong> 33 files total (14 Act, 4 Resp, 4 Beh, 10 HR, 1 Notif)</span>
                            <span><strong>Avg Upload:</strong> 1.88s/file (Good Network)</span>
                        </div>

                        {/* Top Controls Grid */}
                        <div className="grid md:grid-cols-2 gap-8 mb-8">
                            {/* Left Column: Data Types */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Data Sources</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(dataTypeConfigs).map(([type, config]) => (
                                        <button
                                            key={type}
                                            onClick={() => toggleDataType(type)}
                                            className={`p-2 rounded-lg border text-left transition-all ${enabledDataTypes[type]
                                                ? 'border-indigo-600 bg-indigo-50'
                                                : 'border-gray-200 opacity-60'}`}
                                        >
                                            <div className="text-xl mb-1">{config.icon}</div>
                                            <div className="text-xs font-medium truncate">{config.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column: Key Settings */}
                            <div className="space-y-4">
                                {/* Pet Profile Removed */}

                                <div>
                                    <label className="text-sm font-medium text-gray-700">Network Speed</label>
                                    <div className="flex gap-2 mt-1">
                                        {Object.entries(networkLevels).map(([k, v]) => (
                                            <button
                                                key={k}
                                                onClick={() => setNetworkLevel(k)}
                                                className={`flex-1 p-2 border rounded-md text-sm transition-all ${networkLevel === k
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="text-lg">{v.icon}</div>
                                                <div className="text-xs">{v.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Power Mode</label>
                                    <div className="flex gap-2 mt-1">
                                        {Object.entries(powerModes).map(([mode, config]) => (
                                            <button
                                                key={mode}
                                                onClick={() => setPowerMode(mode)}
                                                className={`flex-1 p-2 border rounded-md text-sm transition-all ${powerMode === mode
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="text-lg">{config.icon}</div>
                                                <div className="text-xs">{config.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-6 mb-8 p-6 bg-gray-50 rounded-xl">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="font-medium text-gray-700">Days of Data</label>
                                    <span className="text-indigo-600 font-bold">{days} days</span>
                                </div>
                                <input type="range" min="0.2" max="7" step="0.2" value={days}
                                    onChange={(e) => setDays(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="font-medium text-gray-700">Off-Body Percentage</label>
                                    <span className="text-indigo-600 font-bold">{offBodyPercent}%</span>
                                </div>
                                <input type="range" min="0" max="90" step="5" value={offBodyPercent}
                                    onChange={(e) => setOffBodyPercent(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="font-medium text-gray-700">Activity Level</label>
                                    <span className="text-indigo-600 font-bold">{activityLevels[activityLevel].label} ({activityLevels[activityLevel].multiplier}x)</span>
                                </div>
                                <div className="flex gap-2">
                                    {Object.entries(activityLevels).map(([key, { label, icon }]) => (
                                        <button
                                            key={key}
                                            onClick={() => setActivityLevel(key)}
                                            className={`flex-1 p-2 border rounded-md text-sm transition-all ${activityLevel === key
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="text-lg">{icon}</div>
                                            <div className="text-xs">{label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="bg-indigo-600 text-white rounded-xl p-6 shadow-lg mb-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                                <div>
                                    <div className="text-indigo-200 text-xs uppercase font-bold tracking-wider">Total Files</div>
                                    <div className="text-3xl font-bold mt-1">{results.totalFiles}</div>
                                </div>
                                <div>
                                    <div className="text-indigo-200 text-xs uppercase font-bold tracking-wider">Data Size</div>
                                    <div className="text-3xl font-bold mt-1">{results.storageKB} KB</div>
                                </div>
                                <div>
                                    <div className="text-indigo-200 text-xs uppercase font-bold tracking-wider">Sync Cycles</div>
                                    <div className="text-3xl font-bold mt-1">{results.syncCycles}</div>
                                </div>
                                <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-indigo-500 pt-4 md:pt-0 pl-0 md:pl-6 text-left flex flex-col justify-center">
                                    <div className="text-indigo-200 text-xs uppercase font-bold tracking-wider mb-1">Time to Upload</div>
                                    <div className="text-4xl font-black text-white leading-none">
                                        {formatTime(results.uploadSeconds)}
                                    </div>
                                    {results.overheadSeconds > 0 && (
                                        <div className="text-xs text-indigo-300 mt-2">
                                            (+{formatTime(results.overheadSeconds)} overhead)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Breakdown and Details */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Breakdown by Data Type */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-700 mb-3 text-sm">Breakdown by Data Type</h3>
                                <div className="space-y-3">
                                    {Object.entries(dataTypeConfigs).map(([type, config]) => {
                                        const data = results.breakdown[type] || { files: 0, seconds: 0 };
                                        const widthPercent = results.totalFiles > 0
                                            ? (data.files / results.totalFiles) * 100
                                            : 0;

                                        return (
                                            <div key={type} className={`${!enabledDataTypes[type] ? 'opacity-40' : ''}`}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-medium text-gray-600">{config.icon} {config.label}</span>
                                                    <span className="text-gray-500">
                                                        {data.files} files ({formatTime(data.seconds)})
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                        className={`${config.color} h-1.5 rounded-full transition-all`}
                                                        style={{ width: `${widthPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Calculation Details */}
                            <div className="p-4 bg-gray-50 rounded-lg text-sm">
                                <h3 className="font-semibold text-gray-700 mb-3 text-sm">Calculation Details</h3>
                                <ul className="text-gray-600 space-y-2">
                                    <li className="flex justify-between">
                                        <span>File Size Limit:</span>
                                        <span className="font-mono">{FILE_SIZE_BYTES} bytes</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Network Speed:</span>
                                        <span className="font-mono">{networkLevels[networkLevel].secondsPerFile}s / file</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Activity Multiplier:</span>
                                        <span className="font-mono">{activityLevels[activityLevel].multiplier}x</span>
                                    </li>
                                    {/* Removed Pet Multiplier from details */}
                                    <li className="flex justify-between pt-2 border-t border-gray-200">
                                        <span>Connection Overhead:</span>
                                        <span className="font-mono">5s / cycle</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                    </div>
                )}


                {/* --- TAB CONTENT: BATTERY ESTIMATOR --- */}
                {activeTab === 'battery' && (
                    <div className="bg-white rounded-b-2xl shadow-xl p-6 md:p-8 animate-in fade-in zoom-in duration-300">

                        <div className="flex flex-col md:flex-row gap-8">

                            {/* Left: Configuration Panel */}
                            <div className="md:w-1/3 space-y-6 border-r pr-6">
                                <div className="flex items-center gap-2 text-gray-800 font-bold border-b pb-2">
                                    <Settings className="w-5 h-5" /> Configuration
                                </div>

                                {/* General */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Device Power</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-600 block mb-1">Capacity (mAh)</label>
                                            <input type="number" value={batteryCapacity} onChange={e => setBatteryCapacity(Number(e.target.value))} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-600 block mb-1">Idle (mA)</label>
                                            <input type="number" step="0.01" value={idleCurrent} onChange={e => setIdleCurrent(Number(e.target.value))} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                    </div>
                                </div>

                                {/* Online Profile */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-green-600 uppercase flex items-center gap-1"><Wifi className="w-3 h-3" /> Online Profile</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-600 block mb-1">Active (mA)</label>
                                                <input type="number" step="0.1" value={onlineActiveMa} onChange={e => setOnlineActiveMa(Number(e.target.value))} className="w-full p-2 border rounded text-sm" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-600 block mb-1">Duration (s)</label>
                                                <input type="number" step="0.1" value={onlineActiveS} onChange={e => setOnlineActiveS(Number(e.target.value))} className="w-full p-2 border rounded text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-600 block mb-1">Interval (s)</label>
                                            <input type="number" value={onlineIntervalS} onChange={e => setOnlineIntervalS(Number(e.target.value))} className="w-full p-2 border rounded text-sm" />
                                            <div className="text-xs text-gray-400 text-right mt-1">{onlineIntervalS / 60} mins</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Offline Profile */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Wifi className="w-3 h-3 opacity-50" /> Offline Profile</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-600 block mb-1">Active (mA)</label>
                                                <input type="number" step="0.1" value={offlineActiveMa} onChange={e => setOfflineActiveMa(Number(e.target.value))} className="w-full p-2 border rounded text-sm" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-600 block mb-1">Duration (s)</label>
                                                <input type="number" step="0.1" value={offlineActiveS} onChange={e => setOfflineActiveS(Number(e.target.value))} className="w-full p-2 border rounded text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-600 block mb-1">Interval (s)</label>
                                            <input type="number" value={offlineIntervalS} onChange={e => setOfflineIntervalS(Number(e.target.value))} className="w-full p-2 border rounded text-sm" />
                                            <div className="text-xs text-gray-400 text-right mt-1">{offlineIntervalS / 60} mins</div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Right: Calculator & Result */}
                            <div className="md:w-2/3 flex flex-col justify-center">

                                <div className="bg-green-50 rounded-2xl p-8 mb-8">
                                    <div className="text-center mb-8">
                                        <label className="text-lg font-medium text-green-900 block mb-4">Daily WiFi Availability</label>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-500 w-16 text-right">0 hr</span>
                                            <input
                                                type="range" min="0" max="24" step="1"
                                                value={hoursOnline}
                                                onChange={(e) => setHoursOnline(parseInt(e.target.value))}
                                                className="flex-1 h-4 bg-green-200 rounded-full appearance-none cursor-pointer accent-green-600"
                                            />
                                            <span className="text-sm font-bold text-green-600 w-16 text-left">24 hr</span>
                                        </div>
                                        <div className="mt-2 text-green-800 font-bold text-lg">
                                            {hoursOnline} hours Online <span className="font-normal text-gray-500 text-sm">/ {24 - hoursOnline} hours Offline</span>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center justify-center border border-green-100">
                                        <div className="text-gray-500 text-sm uppercase tracking-widest font-semibold mb-2">Estimated Battery Life</div>
                                        <div className="text-6xl font-black text-green-600 mb-2">
                                            {batteryResults.lifeDays} <span className="text-2xl font-bold text-gray-400">Days</span>
                                        </div>
                                        <div className="text-gray-400 font-medium">
                                            ~{batteryResults.lifeHours} Total Hours
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="text-gray-500 mb-1">Average Current</div>
                                        <div className="font-bold text-xl">{batteryResults.avgCurrentMa} mA</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="text-gray-500 mb-1">Power Consumption</div>
                                        <div className="font-bold text-xl">{Math.round(batteryResults.avgCurrentMa * 24)} mAh/day</div>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}