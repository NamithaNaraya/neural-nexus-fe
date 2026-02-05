/**
 * Comparison Controls
 * 
 * Action buttons toolbar for comparison view:
 * - Merge View toggle
 * - Highlight Common button
 * - Show Bridges button
 * - Find Missing button
 * - Export Diff dropdown
 */
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Layers,
    Sparkles,
    Link2,
    Search,
    Download,
    ChevronDown,
    FileJson,
    FileText,
    Grid3X3,
    Eye,
    EyeOff,
} from 'lucide-react';
import { ComparisonMode, ComparisonResult } from './types';

interface ComparisonControlsProps {
    mode: ComparisonMode;
    onModeChange: (mode: ComparisonMode) => void;
    showBridges: boolean;
    onToggleBridges: () => void;
    highlightCommon: boolean;
    onToggleHighlight: () => void;
    showMissing: boolean;
    onToggleMissing: () => void;
    onFindMissing: () => void;
    onExport: (format: 'json' | 'pdf') => void;
    result: ComparisonResult | null;
    isLoading?: boolean;
}

export function ComparisonControls({
    mode,
    onModeChange,
    showBridges,
    onToggleBridges,
    highlightCommon,
    onToggleHighlight,
    showMissing,
    onToggleMissing,
    onFindMissing,
    onExport,
    result,
    isLoading,
}: ComparisonControlsProps) {
    const [showExportMenu, setShowExportMenu] = useState(false);

    const modeButtons: { mode: ComparisonMode; icon: React.ReactNode; label: string }[] = [
        { mode: 'split', icon: <Grid3X3 className="w-4 h-4" />, label: 'Split View' },
        { mode: 'merge', icon: <Layers className="w-4 h-4" />, label: 'Merge View' },
        { mode: 'highlight', icon: <Sparkles className="w-4 h-4" />, label: 'Highlight' },
    ];

    return (
        <div className="glass-panel border-b border-white/5 p-3">
            <div className="flex items-center justify-between">
                {/* Left: Mode selector */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
                    {modeButtons.map(({ mode: m, icon, label }) => (
                        <button
                            key={m}
                            onClick={() => onModeChange(m)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                                transition-all duration-200
                                ${mode === m
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                }
                            `}
                        >
                            {icon}
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>

                {/* Center: Toggle buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleBridges}
                        disabled={!result || isLoading}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                            transition-all duration-200 border
                            ${showBridges
                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                : 'border-white/10 text-muted-foreground hover:bg-white/5'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        <Link2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Bridges</span>
                        {showBridges ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>

                    <button
                        onClick={onToggleHighlight}
                        disabled={!result || isLoading}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                            transition-all duration-200 border
                            ${highlightCommon
                                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                : 'border-white/10 text-muted-foreground hover:bg-white/5'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span className="hidden sm:inline">Common</span>
                        {highlightCommon ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>

                    <button
                        onClick={onToggleMissing}
                        disabled={!result || isLoading}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                            transition-all duration-200 border
                            ${showMissing
                                ? 'bg-gray-500/20 border-gray-500/50 text-gray-400'
                                : 'border-white/10 text-muted-foreground hover:bg-white/5'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        <Search className="w-4 h-4" />
                        <span className="hidden sm:inline">Missing</span>
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onFindMissing}
                        disabled={!result || isLoading}
                        className="
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                            bg-primary/10 text-primary hover:bg-primary/20
                            transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed
                        "
                    >
                        <Search className="w-4 h-4" />
                        <span>Find Missing</span>
                    </button>

                    {/* Export dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={!result || isLoading}
                            className="
                                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                                border border-white/10 text-muted-foreground hover:bg-white/5
                                transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed
                            "
                        >
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>

                        {showExportMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute right-0 top-full mt-1 z-50 glass-panel rounded-lg shadow-lg border border-white/10 overflow-hidden"
                            >
                                <button
                                    onClick={() => {
                                        onExport('json');
                                        setShowExportMenu(false);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-white/5 w-full"
                                >
                                    <FileJson className="w-4 h-4 text-blue-400" />
                                    Export as JSON
                                </button>
                                <button
                                    onClick={() => {
                                        onExport('pdf');
                                        setShowExportMenu(false);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-white/5 w-full"
                                >
                                    <FileText className="w-4 h-4 text-red-400" />
                                    Export as PDF
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ComparisonControls;
