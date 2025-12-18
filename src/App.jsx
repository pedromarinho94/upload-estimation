import React, { useState, useMemo } from 'react';
import mavenLogo from './assets/mavenpet_logo.jpeg';
import {
    Clock, Database, Wifi, Battery, Activity, Heart,
    Dog, Settings, RefreshCw, Shield, Info, Gauge,
    ChevronRight, Zap, Smartphone, ExternalLink, HardDrive
} from 'lucide-react';

/**
 * MAVEN SMART COLLAR - ENGINEERING WORKBENCH
 * 
 * V3 Focus: Utility over Flash.
 * - Restored all granular hardware & battery inputs.
 * - Restored log-based reference data.
 * - Clean "Workbench" aesthetic (Light UI, high readability).
 * - High-density data breakdowns for developers.
 */

export default function App() {
    // --- Configuration Constants ---
    const FILE_SIZE_BYTES = 1024;

    const dataTypeConfigs = {
        activity: { label: 'Activity', icon: <Activity />, bytesPerHour: 380, color: 'text-blue-600', bg: 'bg-blue-100', bar: 'bg-blue-500' },
        respiratory: { label: 'Respiratory', icon: <RefreshCw />, bytesPerHour: 105, color: 'text-emerald-600', bg: 'bg-emerald-100', bar: 'bg-emerald-500' },
        behaviors: { label: 'Behaviors', icon: <Dog />, bytesPerHour: 25, color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500' },
        heartRate: { label: 'Heart Rate', icon: <Heart />, bytesPerHour: 600, color: 'text-rose-600', bg: 'bg-rose-100', bar: 'bg-rose-500' },
        notifications: { label: 'Notifications', icon: <Shield />, bytesPerHour: 5, color: 'text-purple-600', bg: 'bg-purple-100', bar: 'bg-purple-500' }
    };

    const networkLevels = {
        good: { label: 'Strong Signal (2.4GHz)', secondsPerFile: 1.7, icon: <Wifi className="w-4 h-4" /> },
        poor: { label: 'Weak Signal (2.4GHz)', secondsPerFile: 3.4, icon: <Wifi className="w-4 h-4 opacity-50" /> }
    };

    const powerModes = {
        charging: { label: 'USB Power', icon: <Zap className="w-4 h-4" />, desc: 'Continuous Sync' },
        battery: { label: 'Battery', icon: <Battery className="w-4 h-4" />, desc: '15m Periodic Sync' }
    };

    // --- Developer State (Inputs) ---
    const [activeTab, setActiveTab] = useState('upload');
    const [days, setDays] = useState(1);
    const [hours, setHours] = useState(0);
    const [networkLevel, setNetworkLevel] = useState('good');
    const [powerMode, setPowerMode] = useState('charging');
    const [offBodyPercent, setOffBodyPercent] = useState(0);
    const [enabledDataTypes, setEnabledDataTypes] = useState({
        activity: true, respiratory: true, behaviors: false, heartRate: true, notifications: false
    });

    // Detailed Hardware Params (Restored)
    const [batteryCapacity, setBatteryCapacity] = useState(270);
    const [idleCurrent, setIdleCurrent] = useState(1.52);

    const [onlineActiveMa, setOnlineActiveMa] = useState(25.52);
    const [onlineActiveS, setOnlineActiveS] = useState(16.51);
    const [onlineIntervalS, setOnlineIntervalS] = useState(900);

    const [offlineActiveMa, setOfflineActiveMa] = useState(42.26);
    const [offlineActiveS, setOfflineActiveS] = useState(4.07);
    const [offlineIntervalS, setOfflineIntervalS] = useState(300);

    const [hoursOnline, setHoursOnline] = useState(12);

    // --- Sync Logic (Professional useMemo) ---
    const results = useMemo(() => {
        const totalHours = (days * 24) + hours;
        const secondsPerFile = networkLevels[networkLevel].secondsPerFile;
        const onBodyFactor = 1.0 - (offBodyPercent / 100.0);

        let totalBytes = 0;
        let calculatedTotalFiles = 0;
        const breakdown = {};

        const syncCycles = powerMode === 'battery' ? Math.ceil(totalHours / 0.25) : 1;
        const connectionOverhead = powerMode === 'battery' ? syncCycles * 10 : 0;

        Object.entries(dataTypeConfigs).forEach(([type, config]) => {
            if (!enabledDataTypes[type]) {
                breakdown[type] = { files: 0, seconds: 0, bytes: 0 };
                return;
            }

            let typeBytesPerHour = config.bytesPerHour;
            if (['behaviors', 'respiratory', 'heartRate'].includes(type)) {
                typeBytesPerHour *= onBodyFactor;
            }

            const totalTypeBytes = Math.round(typeBytesPerHour * totalHours);
            totalBytes += totalTypeBytes;

            let typeFiles = 0;
            if (totalTypeBytes > 0) {
                const sizeBasedFiles = Math.ceil(totalTypeBytes / FILE_SIZE_BYTES);

                // Active hours for this data type
                let typeActiveHours = totalHours;
                if (['behaviors', 'respiratory', 'heartRate'].includes(type)) {
                    typeActiveHours = totalHours * onBodyFactor;
                }

                // Minimum 1 file per sync cycle that occurs during active hours
                // Sync cycle is 0.25h (15m). 
                // We use the same syncCycles ratio for active time.
                const typeSyncCycles = powerMode === 'battery' ? Math.ceil(typeActiveHours / 0.25) : Math.ceil(typeActiveHours);

                typeFiles = Math.max(sizeBasedFiles, typeSyncCycles);
            }

            calculatedTotalFiles += typeFiles;
            breakdown[type] = {
                bytes: totalTypeBytes,
                files: typeFiles,
                seconds: typeFiles * secondsPerFile
            };
        });

        const baseUploadSeconds = calculatedTotalFiles * secondsPerFile;
        const totalUploadSeconds = baseUploadSeconds + connectionOverhead;

        return {
            totalFiles: calculatedTotalFiles,
            totalBytes,
            totalDuration: totalUploadSeconds,
            storageKB: Math.round(totalBytes / 1024),
            syncCycles,
            breakdown,
            overheadSeconds: connectionOverhead,
            baseUploadSeconds
        };
    }, [days, hours, networkLevel, powerMode, offBodyPercent, enabledDataTypes]);

    const batteryResults = useMemo(() => {
        const hoursOffline = 24 - hoursOnline;
        const avgCurrentOnline = (onlineActiveMa * onlineActiveS + idleCurrent * (onlineIntervalS - onlineActiveS)) / onlineIntervalS;
        const avgCurrentOffline = (offlineActiveMa * offlineActiveS + idleCurrent * (offlineIntervalS - offlineActiveS)) / offlineIntervalS;
        const dailyAvgCurrent = (avgCurrentOnline * hoursOnline + avgCurrentOffline * hoursOffline) / 24;
        const lifeHours = dailyAvgCurrent > 0 ? batteryCapacity / dailyAvgCurrent : 0;

        return {
            lifeDays: Math.round((lifeHours / 24) * 10) / 10,
            lifeHours: Math.round(lifeHours),
            avgCurrentMa: Math.round(dailyAvgCurrent * 100) / 100
        };
    }, [batteryCapacity, idleCurrent, onlineActiveMa, onlineActiveS, onlineIntervalS, offlineActiveMa, offlineActiveS, offlineIntervalS, hoursOnline]);

    const formatTime = (seconds) => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <img src={mavenLogo} alt="Maven Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm border border-slate-100" />
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-900">Wifi Sensor</h1>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Calibration & Estimations</p>
                        </div>
                    </div>

                    <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {[
                            { id: 'upload', label: 'Data Upload', icon: <Wifi className="w-4 h-4" /> },
                            { id: 'battery', label: 'Power Estimate', icon: <Battery className="w-4 h-4" /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === tab.id
                                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </nav>
                </header>

                {/* --- DATA UPLOAD INTERFACE --- */}
                {activeTab === 'upload' && (
                    <div className="grid lg:grid-cols-[1fr_350px] gap-8 animate-in fade-in duration-500">
                        <div className="space-y-6">
                            {/* Reference Context */}
                            <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl text-xs space-y-3 leading-relaxed border border-slate-800 shadow-md">
                                <div className="flex items-center gap-2 text-white font-bold mb-1 uppercase tracking-widest text-[10px]">
                                    <Info className="w-3 h-3 text-emerald-400" /> Reference Log Verification
                                </div>
                                <div className="grid md:grid-cols-2 gap-4 divide-slate-700 md:divide-x">
                                    <div className="pr-4">
                                        <p><strong>Log A (14h Bulk):</strong> 33 files (14 Act, 4 Resp, 4 Beh, 10 HR) @ ~70% Off-Body</p>
                                        <p className="text-emerald-400 mt-1 font-mono">Actual: ~62s (1.88s/file)</p>
                                    </div>
                                    <div className="md:pl-6 leading-6">
                                        <p><strong>Log B (Periodic):</strong> 3 files/sync (1 Act, 1 Resp, 1 HR)</p>
                                        <p className="text-emerald-400 mt-1 font-mono">Actual: ~5s / Simulation: ~5.6s</p>
                                    </div>
                                </div>
                            </div>

                            {/* Main Parameters Card */}
                            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                                <div className="grid md:grid-cols-2 gap-12">
                                    <section className="space-y-10">
                                        <div>
                                            <div className="flex justify-between items-end mb-4 gap-4">
                                                <label className="text-sm font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">Collection Window</label>
                                                <div className="flex items-baseline gap-1 tabular-nums">
                                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{days}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase mr-2 tracking-widest">Days</span>
                                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{hours}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hours</span>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                                                        <span>Days</span>
                                                        <span>{days}</span>
                                                    </div>
                                                    <input type="range" min="0" max="7" step="1" value={days} onChange={e => setDays(parseInt(e.target.value))}
                                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                                                        <span>Hours</span>
                                                        <span>{hours}</span>
                                                    </div>
                                                    <input type="range" min="0" max="23" step="1" value={hours} onChange={e => setHours(parseInt(e.target.value))}
                                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-end mb-4">
                                                <label className="text-sm font-bold text-slate-600 uppercase tracking-widest">Off-Body Factor</label>
                                                <span className="text-3xl font-black text-slate-900 tracking-tighter">{offBodyPercent}%</span>
                                            </div>
                                            <input type="range" min="0" max="95" step="5" value={offBodyPercent} onChange={e => setOffBodyPercent(parseInt(e.target.value))}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                                        </div>
                                    </section>

                                    <section className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Environment & Power</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-bold text-slate-600 mb-2">Network Profile</p>
                                                <div className="flex gap-2">
                                                    {Object.entries(networkLevels).map(([k, v]) => (
                                                        <button key={k} onClick={() => setNetworkLevel(k)}
                                                            className={`flex-1 p-3 rounded-xl border-2 transition-all text-xs font-bold flex flex-col items-center gap-1 ${networkLevel === k ? 'border-emerald-600 bg-white shadow-sm' : 'border-transparent bg-white/50 text-slate-400 grayscale'
                                                                }`}>
                                                            {v.icon} {v.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-600 mb-2">Device Power Source</p>
                                                <div className="flex gap-2">
                                                    {Object.entries(powerModes).map(([mode, conf]) => (
                                                        <button key={mode} onClick={() => setPowerMode(mode)}
                                                            className={`flex-1 p-3 rounded-xl border-2 transition-all text-xs font-bold flex flex-col items-center gap-1 ${powerMode === mode ? 'border-emerald-600 bg-white shadow-sm' : 'border-transparent bg-white/50 text-slate-400 grayscale'
                                                                }`}>
                                                            {conf.icon} {conf.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Per-Type Toggle Tunnels */}
                                <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-3">
                                    {Object.entries(dataTypeConfigs).map(([type, config]) => (
                                        <button
                                            key={type} onClick={() => setEnabledDataTypes(p => ({ ...p, [type]: !p[type] }))}
                                            className={`px-4 py-2.5 rounded-xl border-2 flex items-center gap-3 transition-all ${enabledDataTypes[type]
                                                ? `bg-white ${config.color.replace('text-', 'border-')} shadow-sm`
                                                : 'border-slate-100 bg-slate-50 text-slate-300'
                                                }`}
                                        >
                                            <span className={`${enabledDataTypes[type] ? config.color : 'text-slate-300'}`}>{config.icon}</span>
                                            <span className="text-[10px] uppercase font-black tracking-widest">{config.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Results Sidebar */}
                        <aside className="space-y-6 lg:sticky lg:top-8">
                            <div className="bg-emerald-700 text-white p-8 rounded-[32px] shadow-xl shadow-emerald-200/50">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-6">Total Sync Estimate</p>
                                <div className="text-6xl font-black tracking-tighter mb-1 leading-none">{formatTime(results.totalDuration)}</div>
                                <p className="text-emerald-100/70 text-sm font-bold mb-10">Across {results.totalFiles} data files</p>

                                <div className="space-y-3 pt-6 border-t border-emerald-600/50">
                                    <div className="flex justify-between text-xs font-bold text-emerald-100">
                                        <span>Raw Content:</span>
                                        <span className="font-mono">{formatTime(results.baseUploadSeconds)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-emerald-100">
                                        <span>Connection Overheads:</span>
                                        <span className="font-mono">+{formatTime(results.overheadSeconds)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-emerald-100 pt-2 border-t border-emerald-600/50">
                                        <span>Total Capacity:</span>
                                        <span className="font-mono text-white">{results.storageKB} KB</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Metrics Breakdown</h4>
                                <div className="space-y-5">
                                    {Object.entries(dataTypeConfigs).map(([type, config]) => {
                                        const data = results.breakdown[type];
                                        if (!enabledDataTypes[type]) return null;
                                        // Visualize Time Contribution instead of Bytes
                                        const width = results.totalDuration > 0 ? (data.seconds / results.totalDuration) * 100 : 0;
                                        return (
                                            <div key={type}>
                                                <div className="flex justify-between text-[11px] font-bold mb-2 uppercase tracking-tighter">
                                                    <span className="text-slate-600">{config.label}</span>
                                                    <span className="text-slate-400">{data.files} files • {formatTime(data.seconds)}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div className={`${config.bar} h-full transition-all duration-700`} style={{ width: `${width}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </aside>
                    </div>
                )}

                {/* --- ENDURANCE (BATTERY) INTERFACE --- */}
                {activeTab === 'battery' && (
                    <div className="grid lg:grid-cols-[1fr_350px] gap-8 animate-in fade-in duration-500">
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                                <h2 className="text-lg font-bold mb-8 flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-emerald-600" /> Granular Hardware Parameters
                                </h2>

                                <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
                                    <section className="space-y-6">
                                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Device Defaults</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-2 uppercase">Capacity (mAh)</label>
                                                <input type="number" value={batteryCapacity} onChange={e => setBatteryCapacity(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-2 uppercase">Deep Sleep (mA)</label>
                                                <input type="number" step="0.01" value={idleCurrent} onChange={e => setIdleCurrent(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Typical Daily WiFi Availability</label>
                                                <span className="text-emerald-700 font-black tracking-tight">{hoursOnline} Hours</span>
                                            </div>
                                            <input type="range" min="0" max="24" step="1" value={hoursOnline} onChange={e => setHoursOnline(parseInt(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                                        </div>
                                    </section>

                                    <section className="space-y-10">
                                        <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-[10px] tracking-widest mb-4">
                                                <RefreshCw className="w-3 h-3" /> Online Profile (Sync active)
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-[10px] text-emerald-600 block mb-1 font-bold">mA</label>
                                                    <input type="number" value={onlineActiveMa} onChange={e => setOnlineActiveMa(Number(e.target.value))} className="w-full bg-white border border-emerald-200 p-2 rounded-lg text-sm font-bold" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-emerald-600 block mb-1 font-bold">Seconds</label>
                                                    <input type="number" value={onlineActiveS} onChange={e => setOnlineActiveS(Number(e.target.value))} className="w-full bg-white border border-emerald-200 p-2 rounded-lg text-sm font-bold" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-emerald-600 block mb-1 font-bold">Interval</label>
                                                    <input type="number" value={onlineIntervalS} onChange={e => setOnlineIntervalS(Number(e.target.value))} className="w-full bg-white border border-emerald-200 p-2 rounded-lg text-sm font-bold" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                            <div className="flex items-center gap-2 text-slate-500 font-black uppercase text-[10px] tracking-widest mb-4">
                                                <Battery className="w-3 h-3" /> Offline Profile (Sampling only)
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-[10px] text-slate-500 block mb-1 font-bold">mA</label>
                                                    <input type="number" value={offlineActiveMa} onChange={e => setOfflineActiveMa(Number(e.target.value))} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 block mb-1 font-bold">Seconds</label>
                                                    <input type="number" value={offlineActiveS} onChange={e => setOfflineActiveS(Number(e.target.value))} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 block mb-1 font-bold">Interval</label>
                                                    <input type="number" value={offlineIntervalS} onChange={e => setOfflineIntervalS(Number(e.target.value))} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold" />
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        {/* Battery Sidebar Card */}
                        <aside className="space-y-6 lg:sticky lg:top-8">
                            <div className="bg-slate-900 border border-slate-800 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Battery className="w-12 h-12" /></div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Estimated Battery Life</p>
                                <div className="text-8xl font-black tracking-tighter text-emerald-500 mb-1 leading-none">{batteryResults.lifeDays}</div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-lg mb-12">Cycle Days</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Avg Current</p>
                                        <p className="text-xl font-black text-white">{batteryResults.avgCurrentMa} <span className="text-[10px] text-slate-500">mA</span></p>
                                    </div>
                                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Power</p>
                                        <p className="text-xl font-black text-white">{batteryResults.lifeHours} <span className="text-[10px] text-slate-500">hrs</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 p-6 rounded-3xl text-xs space-y-3">
                                <h4 className="font-bold text-slate-600 mb-2 uppercase tracking-widest text-[10px]">Simulation Notes</h4>
                                <ul className="space-y-2 text-slate-500 font-medium">
                                    <li className="flex gap-2"><span className="text-emerald-500">●</span> Weighted average calculation based on WiFi availability.</li>
                                    <li className="flex gap-2"><span className="text-emerald-500">●</span> Pulse active current included in interval averages.</li>
                                    <li className="flex gap-2"><span className="text-emerald-500">●</span> Assumes ideal temperature conditions.</li>
                                </ul>
                            </div>
                        </aside>
                    </div>
                )}
            </div>

            <footer className="max-w-6xl mx-auto py-12 px-4 text-center">
            </footer>
        </div>
    );
}