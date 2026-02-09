/**
 * Split-Screen Comparison View
 * 
 * Allows side-by-side comparison of two files, folders, or clusters.
 * Features: common entities, unique entities, bridge nodes, similarity scores.
 */
'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Split,
    GitCompare,
    Layers,
    Link2,
    Eye,
    Download,
    X,
    ArrowRight,
    Sparkles
} from 'lucide-react';

interface ComparisonItem {
    type: 'file' | 'folder' | 'cluster' | 'selection';
    id: string;
    name: string;
    nodeCount: number;
}

interface ComparisonResult {
    common: string[];
    uniqueLeft: string[];
    uniqueRight: string[];
    bridges: { id: string; leftConnections: number; rightConnections: number }[];
    semanticSimilarity: number;
    structuralSimilarity: number;
}

interface ComparisonViewProps {
    isOpen: boolean;
    onClose: () => void;
    leftItem?: ComparisonItem;
    rightItem?: ComparisonItem;
    onCompare: (left: ComparisonItem, right: ComparisonItem) => Promise<ComparisonResult>;
}

export function ComparisonView({ isOpen, onClose, leftItem, rightItem, onCompare }: ComparisonViewProps) {
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'common' | 'unique' | 'bridges'>('common');

    const handleCompare = async () => {
        if (!leftItem || !rightItem) return;
        setLoading(true);
        try {
            const res = await onCompare(leftItem, rightItem);
            setResult(res);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'common', label: 'Common Entities', icon: <Layers className="w-4 h-4" />, color: 'text-emerald-500' },
        { id: 'unique', label: 'Unique Entities', icon: <Split className="w-4 h-4" />, color: 'text-blue-500' },
        { id: 'bridges', label: 'Bridge Nodes', icon: <Link2 className="w-4 h-4" />, color: 'text-purple-500' },
    ] as const;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20">
                                    <GitCompare className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Split-Screen Comparison</h2>
                                    <p className="text-sm text-white/60">Compare files, folders, or clusters side-by-side</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        {/* Comparison Selection */}
                        <div className="grid grid-cols-2 gap-4 p-6 border-b border-white/10">
                            {/* Left Panel */}
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-sm font-medium text-blue-400">Left Source</span>
                                </div>
                                {leftItem ? (
                                    <div className="p-3 rounded-lg bg-slate-800/50">
                                        <p className="font-medium text-white">{leftItem.name}</p>
                                        <p className="text-sm text-white/60">{leftItem.nodeCount} nodes • {leftItem.type}</p>
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-lg bg-slate-800/50 border-2 border-dashed border-blue-500/30 text-center">
                                        <p className="text-sm text-white/50">Select a file or folder</p>
                                    </div>
                                )}
                            </div>

                            {/* Right Panel */}
                            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                                    <span className="text-sm font-medium text-orange-400">Right Source</span>
                                </div>
                                {rightItem ? (
                                    <div className="p-3 rounded-lg bg-slate-800/50">
                                        <p className="font-medium text-white">{rightItem.name}</p>
                                        <p className="text-sm text-white/60">{rightItem.nodeCount} nodes • {rightItem.type}</p>
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-lg bg-slate-800/50 border-2 border-dashed border-orange-500/30 text-center">
                                        <p className="text-sm text-white/50">Select a file or folder</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Compare Button */}
                        <div className="flex justify-center py-4 border-b border-white/10">
                            <button
                                onClick={handleCompare}
                                disabled={!leftItem || !rightItem || loading}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/20 transition-all"
                            >
                                {loading ? (
                                    <>
                                        <Sparkles className="w-5 h-5 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <GitCompare className="w-5 h-5" />
                                        Compare
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Results */}
                        {result && (
                            <div className="p-6 max-h-[400px] overflow-y-auto">
                                {/* Similarity Scores */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                        <p className="text-sm text-emerald-400 mb-1">Semantic Similarity</p>
                                        <p className="text-2xl font-bold text-white">{(result.semanticSimilarity * 100).toFixed(1)}%</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                        <p className="text-sm text-purple-400 mb-1">Structural Similarity</p>
                                        <p className="text-2xl font-bold text-white">{(result.structuralSimilarity * 100).toFixed(1)}%</p>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-2 mb-4">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                                    ? 'bg-white/10 text-white'
                                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <span className={tab.color}>{tab.icon}</span>
                                            {tab.label}
                                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">
                                                {tab.id === 'common' ? result.common.length :
                                                    tab.id === 'unique' ? result.uniqueLeft.length + result.uniqueRight.length :
                                                        result.bridges.length}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="p-4 rounded-xl bg-slate-800/50">
                                    {activeTab === 'common' && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {result.common.map(id => (
                                                <div key={id} className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
                                                    {id}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {activeTab === 'unique' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-blue-400 mb-2">Only in Left ({result.uniqueLeft.length})</p>
                                                <div className="space-y-1">
                                                    {result.uniqueLeft.slice(0, 10).map(id => (
                                                        <div key={id} className="px-3 py-2 rounded-lg bg-blue-500/10 text-sm text-blue-400">
                                                            {id}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm text-orange-400 mb-2">Only in Right ({result.uniqueRight.length})</p>
                                                <div className="space-y-1">
                                                    {result.uniqueRight.slice(0, 10).map(id => (
                                                        <div key={id} className="px-3 py-2 rounded-lg bg-orange-500/10 text-sm text-orange-400">
                                                            {id}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'bridges' && (
                                        <div className="space-y-2">
                                            {result.bridges.map(bridge => (
                                                <div key={bridge.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                    <span className="font-medium text-purple-400">{bridge.id}</span>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span className="text-blue-400">← {bridge.leftConnections} links</span>
                                                        <Link2 className="w-4 h-4 text-purple-400" />
                                                        <span className="text-orange-400">{bridge.rightConnections} links →</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                Close
                            </button>
                            {result && (
                                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                                    <Download className="w-4 h-4" />
                                    Export Report
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ComparisonView;
