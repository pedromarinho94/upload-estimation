import React, { useState, useEffect } from 'react';
import { Clock, Database, Wifi, Calendar } from 'lucide-react';

export default function App() {
    // From your logs: 14.83 hours of data uploaded in 62 seconds
    const baseDataHours = 14.83;
    const baseUploadSeconds = 62;
    const baseFilesUploaded = 33;

    // Calculate rates from logs
    const filesPerHour = baseFilesUploaded / baseDataHours; // ~2.23 files/hour
    const secondsPerFile = baseUploadSeconds / baseFilesUploaded; // ~1.88 seconds/file

    const [days, setDays] = useState(2);
    const [networkLevel, setNetworkLevel] = useState('good');
    const [activityLevel, setActivityLevel] = useState('normal');

    const networkLevels = {
        excellent: { label: 'Excellent', multiplier: 0.7, icon: '🚀' },
        good: { label: 'Good', multiplier: 1.0, icon: '✅' },
        fair: { label: 'Fair', multiplier: 1.5, icon: '⚠️' },
        poor: { label: 'Poor', multiplier: 2.5, icon: '🐌' }
    };

    const activityLevels = {
        low: { label: 'Low', multiplier: 0.6, icon: '😴' },
        normal: { label: 'Normal', multiplier: 1.0, icon: '🐕' },
        active: { label: 'Active', multiplier: 1.4, icon: '🏃' },
        veryActive: { label: 'Very Active', multiplier: 1.8, icon: '⚡' }
    };

    const [results, setResults] = useState({
        totalFiles: 0,
        uploadSeconds: 0,
        uploadMinutes: 0,
        dataHours: 0
    });

    useEffect(() => {
        const hours = days * 24;
        const activityMult = activityLevels[activityLevel].multiplier;
        const networkMult = networkLevels[networkLevel].multiplier;

        const totalFiles = Math.round(filesPerHour * hours * activityMult);
        const uploadSeconds = Math.round(secondsPerFile * totalFiles * networkMult);
        const uploadMinutes = (uploadSeconds / 60).toFixed(1);

        setResults({
            totalFiles,
            uploadSeconds,
            uploadMinutes,
            dataHours: hours
        });
    }, [days, networkLevel, activityLevel]);

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Database className="w-8 h-8 text-indigo-600" />
                        <h1 className="text-3xl font-bold text-gray-800">Smart Collar Upload Calculator</h1>
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                        <h2 className="text-sm font-semibold text-indigo-900 mb-2">Reference Data (from logs)</h2>
                        <div className="grid grid-cols-3 gap-4 text-sm text-indigo-700">
                            <div>📊 {baseFilesUploaded} files</div>
                            <div>⏱️ {baseUploadSeconds}s upload</div>
                            <div>📅 {baseDataHours.toFixed(1)}h of data</div>
                        </div>
                    </div>

                    <div className="space-y-6 mb-8">
                        <div>
                            <label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                Days of Data to Upload
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="7"
                                step="0.5"
                                value={days}
                                onChange={(e) => setDays(parseFloat(e.target.value))}
                                className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-sm text-gray-600 mt-1">
                                <span>0.5 days</span>
                                <span className="text-lg font-bold text-indigo-600">{days} days</span>
                                <span>7 days</span>
                            </div>
                        </div>

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

                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
                        <h2 className="text-2xl font-bold mb-4">Estimated Upload Time</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                <div className="text-sm opacity-90 mb-1">Total Files</div>
                                <div className="text-3xl font-bold">{results.totalFiles}</div>
                            </div>
                            <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                <div className="text-sm opacity-90 mb-1">Data Period</div>
                                <div className="text-3xl font-bold">{results.dataHours}h</div>
                            </div>
                            <div className="col-span-2 bg-white bg-opacity-20 rounded-lg p-6 text-center">
                                <div className="text-sm opacity-90 mb-2">Upload Duration</div>
                                <div className="text-5xl font-bold">{formatTime(results.uploadSeconds)}</div>
                                <div className="text-lg mt-2 opacity-90">({results.uploadMinutes} minutes)</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-2">Calculation Details</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Base rate: ~{filesPerHour.toFixed(2)} files per hour</li>
                            <li>• Upload speed: ~{secondsPerFile.toFixed(2)} seconds per file</li>
                            <li>• Activity: {activityLevels[activityLevel].label} ({activityLevels[activityLevel].multiplier}x files)</li>
                            <li>• Network: {networkLevels[networkLevel].label} ({networkLevels[networkLevel].multiplier}x time)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}