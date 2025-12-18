import React, { useState, useMemo } from 'react';
import {
    Clock, Database, Wifi, Calendar, Battery, Zap,
    Activity, Heart, Dog, Settings, Edit2, Shield,
    ChevronRight, Info, Coffee, RefreshCw, Smartphone
} from 'lucide-react';

/**
 * MAVEN SMART COLLAR SIMULATION - PRO VERSION
 * 
 * DESIGN PHILOSOPHY:
 * 1. Apple-Grade Aesthetics: Glassmorphism, subtle gradients, and high-end typography.
 * 2. Shopify-Grade Performance: Decoupled logic using useMemo for instant, lag-free reactivity.
 * 3. Human-Centric Context: Turning seconds into "Coffee waits" and accumulation metrics.
 */

export default function App() {
    // --- Constants ---
    const FILE_SIZE_BYTES = 1024;

    const dataTypeConfigs = {
        activity: { label: 'Activity', icon: <Activity className="w-5 h-5" />, bytesPerHour: 380, color: 'from-blue-500 to-indigo-600', isContinuous: true },
        respiratory: { label: 'Respiratory', icon: <RefreshCw className="w-5 h-5" />, bytesPerHour: 105, color: 'from-emerald-500 to-teal-600', isContinuous: false },
        behaviors: { label: 'Behaviors', icon: <Dog className="w-5 h-5" />, bytesPerHour: 25, color: 'from-amber-400 to-orange-500', isContinuous: false },
        heartRate: { label: 'Heart Rate', icon: <Heart className="w-5 h-5" />, bytesPerHour: 600, color: 'from-rose-500 to-red-600', isContinuous: true },
        notifications: { label: 'Alerts', icon: <Shield className="w-5 h-5" />, bytesPerHour: 5, color: 'from-purple-500 to-violet-600', isContinuous: false }
    };

    const networkLevels = {
        good: { label: 'Premium', secondsPerFile: 1.7, icon: '⚡', description: '5GHz / Strong Signal' },
        poor: { label: 'Standard', secondsPerFile: 3.4, icon: '📶', description: '2.4GHz / Range Edge' }
    };

    const powerModes = {
        charging: { label: 'Stationary', syncIntervalHours: 0, icon: <Smartphone className="w-4 h-4" />, description: 'USB Connected' },
        battery: { label: 'Mobile', syncIntervalHours: 0.25, icon: <Battery className="w-4 h-4" />, description: 'On Battery (15m intervals)' }
    };

    // --- High-End State Management ---
    const [activeTab, setActiveTab] = useState('upload');
    const [days, setDays] = useState(1);
    const [networkLevel, setNetworkLevel] = useState('good');
    const [powerMode, setPowerMode] = useState('battery');
    const [offBodyPercent, setOffBodyPercent] = useState(10);
    const [enabledDataTypes, setEnabledDataTypes] = useState({
        activity: true, respiratory: true, behaviors: true, heartRate: true, notifications: true
    });

    // Battery State
    const [batteryCapacity, setBatteryCapacity] = useState(270);
    const [idleCurrent, setIdleCurrent] = useState(1.52);
    const [onlineActiveMa, setOnlineActiveMa] = useState(25.52);
    const [onlineActiveS, setOnlineActiveS] = useState(16.51);
    const [onlineIntervalS, setOnlineIntervalS] = useState(900);
    const [offlineActiveMa, setOfflineActiveMa] = useState(42.26);
    const [offlineActiveS, setOfflineActiveS] = useState(4.07);
    const [offlineIntervalS, setOfflineIntervalS] = useState(300);
    const [hoursOnline, setHoursOnline] = useState(24);

    // --- Scenario Presets (Shopify Style) ---
    const applyPreset = (preset) => {
        switch (preset) {
            case 'weekend':
                setDays(2);
                setOffBodyPercent(5);
                setPowerMode('battery');
                break;
            case 'office':
                setDays(1);
                setOffBodyPercent(60);
                setPowerMode('battery');
                break;
            case 'sync-debug':
                setDays(0.2); // ~5 hours
                setOffBodyPercent(0);
                setPowerMode('charging');
                break;
            default: break;
        }
    };

    // --- Decoupled Logic (Apple Performance) ---
    const uploadResults = useMemo(() => {
        const hours = days * 24;
        const secondsPerFile = networkLevels[networkLevel].secondsPerFile;
        const onBodyFactor = 1.0 - (offBodyPercent / 100.0);

        let totalBytes = 0;
        let totalFiles = 0;
        const breakdown = {};

        Object.entries(dataTypeConfigs).forEach(([type, config]) => {
            if (!enabledDataTypes[type]) {
                breakdown[type] = { files: 0, seconds: 0, bytes: 0 };
                return;
            }

            let typeBytesPerHour = config.bytesPerHour;
            if (['behaviors', 'respiratory', 'heartRate'].includes(type)) {
                typeBytesPerHour *= onBodyFactor;
            }

            const totalTypeBytes = Math.round(typeBytesPerHour * hours);
            totalBytes += totalTypeBytes;

            let typeFiles = 0;
            if (totalTypeBytes > 0) {
                const sizeBasedFiles = Math.ceil(totalTypeBytes / FILE_SIZE_BYTES);
                let activeHours = hours;
                if (['behaviors', 'respiratory', 'heartRate'].includes(type)) {
                    activeHours = hours * onBodyFactor;
                }
                const timeBasedFiles = Math.ceil(activeHours);
                typeFiles = Math.max(sizeBasedFiles, timeBasedFiles);
            }

            totalFiles += typeFiles;
            breakdown[type] = {
                bytes: totalTypeBytes,
                files: typeFiles,
                seconds: typeFiles * secondsPerFile
            };
        });

        const baseUploadSeconds = totalFiles * secondsPerFile;
        const syncCycles = powerMode === 'battery' ? Math.ceil(hours / 0.25) : 1;
        const overheadSeconds = powerMode === 'battery' ? syncCycles * 10 : 0;
        const totalDuration = baseUploadSeconds + overheadSeconds;

        return {
            totalFiles,
            totalBytes,
            totalDuration,
            storageKB: Math.round(totalBytes / 1024),
            syncCycles,
            breakdown,
            overheadSeconds
        };
    }, [days, networkLevel, powerMode, offBodyPercent, enabledDataTypes]);

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

    // --- Helper UI Components ---
    const GlassCard = ({ children, className = "" }) => (
        <div className={`backdrop-blur-xl bg-white/70 border border-white/40 shadow-2xl rounded-3xl ${className}`}>
            {children}
        </div>
    );

    const formatTime = (seconds) => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const mins = Math.max(1, Math.floor(seconds / 60));
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
            </div>

            <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in slide-in-from-top duration-700">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
                                <Database className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-emerald-400 font-bold tracking-tighter text-sm uppercase">Intelligence Tool</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none mb-4">
                            Maven <span className="text-slate-500">Stimulus</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                            Simulate high-fidelity data cycles and power performance for the next-gen collar.
                        </p>
                    </div>

                    {/* Fancy Tab Switcher */}
                    <div className="flex bg-slate-800/50 p-1.5 rounded-2xl backdrop-blur-md border border-slate-700/50">
                        {[
                            { id: 'upload', icon: <Wifi className="w-4 h-4" />, label: 'Transmission' },
                            { id: 'battery', icon: <Battery className="w-4 h-4" />, label: 'Endurance' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-300 ${activeTab === tab.id
                                        ? 'bg-white text-slate-900 shadow-xl scale-[1.02]'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* --- TRANSMISSION TAB --- */}
                {activeTab === 'upload' && (
                    <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start animate-in fade-in zoom-in-95 duration-500">
                        {/* Main Interaction Area */}
                        <div className="space-y-8">
                            <GlassCard className="p-8">
                                <section className="mb-10">
                                    <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-6 px-1">Active Scenario</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { id: 'weekend', label: 'Weekend Trip', icon: '🏕️', sub: 'High uptime' },
                                            { id: 'office', label: 'Office Day', icon: '🏙️', sub: 'Indoor heavy' },
                                            { id: 'sync-debug', label: 'Rapid Sync', icon: '🧪', sub: 'Dev profile' }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => applyPreset(p.id)}
                                                className="group text-left p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-slate-900 transition-all"
                                            >
                                                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{p.icon}</div>
                                                <div className="text-white font-bold">{p.label}</div>
                                                <div className="text-slate-500 text-xs">{p.sub}</div>
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-10">
                                    <div className="group">
                                        <div className="flex justify-between items-end mb-4">
                                            <label className="text-white font-bold text-lg flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-emerald-500" /> Accumulation Period
                                            </label>
                                            <span className="text-3xl font-black text-emerald-400 font-mono tracking-tighter">
                                                {days} <span className="text-xs uppercase text-slate-500 ml-1">Days</span>
                                            </span>
                                        </div>
                                        <input
                                            type="range" min="0.2" max="7" step="0.2" value={days}
                                            onChange={(e) => setDays(parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                    </div>

                                    <div className="group">
                                        <div className="flex justify-between items-end mb-4">
                                            <label className="text-white font-bold text-lg flex items-center gap-2">
                                                <Dog className="w-5 h-5 text-emerald-500" /> Off-Body Rest
                                            </label>
                                            <span className="text-3xl font-black text-emerald-400 font-mono tracking-tighter">
                                                {offBodyPercent}<span className="text-lg">%</span>
                                            </span>
                                        </div>
                                        <input
                                            type="range" min="0" max="95" step="5" value={offBodyPercent}
                                            onChange={(e) => setOffBodyPercent(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                    </div>
                                </section>

                                <footer className="mt-12 pt-8 border-t border-slate-200/10 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {Object.entries(dataTypeConfigs).map(([type, config]) => (
                                        <button
                                            key={type}
                                            onClick={() => setEnabledDataTypes(p => ({ ...p, [type]: !p[type] }))}
                                            className={`flex flex-col items-center gap-2 transition-all p-3 rounded-2xl ${enabledDataTypes[type] ? 'bg-slate-900/40 text-white' : 'opacity-20 grayscale'}`}
                                        >
                                            <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} shadow-lg shadow-black/20`}>
                                                {React.cloneElement(config.icon, { className: 'w-5 h-5 text-white' })}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-tighter">{config.label}</span>
                                        </button>
                                    ))}
                                </footer>
                            </GlassCard>

                            <div className="grid grid-cols-2 gap-4 text-sm px-1">
                                <div className="p-5 rounded-3xl bg-slate-900/30 border border-slate-800 flex items-center gap-4">
                                    <div className="text-3xl">☕</div>
                                    <div>
                                        <div className="text-slate-500 font-bold uppercase text-[10px]">Human Wait</div>
                                        <div className="text-white font-black text-lg">About 1 Coffee</div>
                                    </div>
                                </div>
                                <div className="p-5 rounded-3xl bg-slate-900/30 border border-slate-800 flex items-center gap-4">
                                    <div className="p-2 bg-blue-500/20 rounded-xl">
                                        <Database className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-slate-500 font-bold uppercase text-[10px]">Packed Weight</div>
                                        <div className="text-white font-black text-lg">{uploadResults.storageKB} KB</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Results Sidebar (Apple Style Result Card) */}
                        <div className="space-y-6 lg:sticky lg:top-8">
                            <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-400 to-teal-500 shadow-3xl shadow-emerald-500/20 text-slate-900 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-1000" />

                                <h4 className="font-black uppercase text-[10px] tracking-widest text-emerald-900/60 mb-8">Estimated Upload</h4>
                                <div className="text-7xl font-black tracking-tighter leading-none mb-1 group-hover:translate-x-1 transition-transform">
                                    {formatTime(uploadResults.totalDuration)}
                                </div>
                                <div className="text-emerald-900/70 font-bold text-sm mb-12">
                                    Over {uploadResults.totalFiles} individual blocks
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-emerald-900/40">
                                        <span>Environmental Performance</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {Object.entries(networkLevels).map(([k, v]) => (
                                            <button
                                                key={k}
                                                onClick={() => setNetworkLevel(k)}
                                                className={`flex-1 p-3 rounded-2xl transition-all font-bold text-xs flex items-center justify-center gap-2 ${networkLevel === k ? 'bg-slate-900 text-white shadow-xl' : 'bg-white/20 text-emerald-900 hover:bg-white/30'
                                                    }`}
                                            >
                                                <span className="text-lg">{v.icon}</span> {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <GlassCard className="p-6">
                                <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Transmission Overhead</h4>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Network Handshake', value: `${uploadResults.overheadSeconds}s`, color: 'bg-emerald-500' },
                                        { label: 'Data Serialization', value: '1.2s', color: 'bg-blue-500' },
                                        { label: 'ACK Verification', value: `${Math.round(uploadResults.totalFiles * 0.1)}s`, color: 'bg-purple-500' }
                                    ].map(item => (
                                        <div key={item.label} className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                                                <span className="text-xs font-medium text-slate-300">{item.label}</span>
                                            </div>
                                            <span className="text-xs font-mono text-slate-500">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                )}

                {/* --- ENDURANCE TAB --- */}
                {activeTab === 'battery' && (
                    <div className="grid lg:grid-cols-2 gap-8 items-stretch animate-in fade-in zoom-in-95 duration-500">
                        <GlassCard className="p-8">
                            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-8">Hardware Parameters</h3>

                            <div className="grid grid-cols-2 gap-6 mb-12">
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-500 block mb-2 tracking-widest">Cell Capacity</label>
                                    <div className="relative">
                                        <input type="number" value={batteryCapacity} onChange={e => setBatteryCapacity(Number(e.target.value))}
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 text-white font-black text-xl outline-none focus:border-emerald-500 transition-colors" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold uppercase tracking-widest">mAh</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-500 block mb-2 tracking-widest">Idle Draw</label>
                                    <div className="relative">
                                        <input type="number" step="0.01" value={idleCurrent} onChange={e => setIdleCurrent(Number(e.target.value))}
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 text-white font-black text-xl outline-none focus:border-emerald-500 transition-colors" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold uppercase tracking-widest">mA</span>
                                    </div>
                                </div>
                            </div>

                            <section className="space-y-8">
                                <div className="p-6 rounded-[32px] bg-slate-900/40 border border-slate-700/30">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/20 rounded-xl"><Wifi className="w-5 h-5 text-emerald-400" /></div>
                                            <span className="font-black text-sm uppercase tracking-widest text-white">Daily Connectivity</span>
                                        </div>
                                        <span className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">{hoursOnline} <span className="text-[10px] text-slate-500 uppercase">Hours</span></span>
                                    </div>
                                    <input
                                        type="range" min="0" max="24" step="1" value={hoursOnline}
                                        onChange={(e) => setHoursOnline(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>
                            </section>
                        </GlassCard>

                        <div className="flex flex-col gap-6">
                            {/* Battery Life Result */}
                            <div className="flex-1 p-10 rounded-[48px] bg-slate-100 shadow-3xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
                                <div className="text-slate-500 text-[10px] uppercase tracking-widest font-black mb-4">Estimated Endurance</div>
                                <div className="text-9xl font-black text-slate-900 tracking-tighter leading-none mb-2">
                                    {batteryResults.lifeDays}
                                </div>
                                <div className="text-slate-400 font-bold text-xl uppercase tracking-widest mb-12">Cycle Days</div>

                                <div className="w-full max-w-[200px] h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
                                    <div className="h-full bg-emerald-500 w-[85%] rounded-full animate-pulse" />
                                </div>
                                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Safe Operating Range</div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 rounded-[32px] bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="text-emerald-500 font-black text-[10px] uppercase tracking-widest mb-1">Avg Draw</div>
                                    <div className="text-white text-3xl font-black tracking-tighter leading-none">{batteryResults.avgCurrentMa} <span className="text-sm text-slate-500 uppercase">mA</span></div>
                                </div>
                                <div className="p-6 rounded-[32px] bg-blue-500/10 border border-blue-500/20">
                                    <div className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-1">Consumption</div>
                                    <div className="text-white text-3xl font-black tracking-tighter leading-none">{Math.round(batteryResults.avgCurrentMa * 24)} <span className="text-sm text-slate-500 uppercase">mAh</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Styles for Slider */}
            <style dangerouslySetInnerHTML={{
                __html: `
                input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    background: #fff;
                    border: 4px solid #10b981;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                input[type='range']::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }
            `}} />
        </div>
    );
}