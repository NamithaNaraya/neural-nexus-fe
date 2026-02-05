/**
 * Cluster Comparison Panel
 * 
 * Side-by-side comparison of two node clusters.
 * Shows common entities, unique nodes, and bridges.
 */
'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitCompare,
    Layers,
    Link2,
    Users,
    ArrowRight,
    X,
    Loader2,
    CheckCircle2,
    FileText,
    Folder,
    Grid3X3,
    Maximize2,
} from 'lucide-react';
import { docAiApi } from '@/lib/api';
import { ComparisonView } from '../comparison';


interface ClusterConfig {
    type: 'file' | 'folder' | 'cluster' | 'selection';
    id: string;
    name: string;
    node_ids?: string[];
}

interface ComparisonResult {
    common_entities: string[];
    common_count: number;
    unique_left: string[];
    unique_left_count: number;
    unique_right: string[];
    unique_right_count: number;
    bridges: Array<{
        id: string;
        name: string;
        type: string;
        left_connections: number;
        right_connections: number;
        bridge_strength: number;
    }>;
    bridge_count: number;
    semantic_similarity: number;
    structural_similarity: number;
    jaccard_index: number;
}

interface ClusterComparisonPanelProps {
    isOpen: boolean;
    onClose: () => void;
    folders: Array<{ id: string; name: string }>;
    files: Array<{ id: string; name: string; folder_id: string }>;
    selectedNodes?: string[];
}

export function ClusterComparisonPanel({
    isOpen,
    onClose,
    folders,
    files,
    selectedNodes = [],
}: ClusterComparisonPanelProps) {
    const [leftCluster, setLeftCluster] = useState<ClusterConfig | null>(null);
    const [rightCluster, setRightCluster] = useState<ClusterConfig | null>(null);
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showVisualComparison, setShowVisualComparison] = useState(false);


    // Run comparison
    const runComparison = useCallback(async () => {
        if (!leftCluster || !rightCluster) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await docAiApi.graph.compare({
                left: {
                    type: leftCluster.type,
                    id: leftCluster.id,
                    node_ids: leftCluster.node_ids,
                },
                right: {
                    type: rightCluster.type,
                    id: rightCluster.id,
                    node_ids: rightCluster.node_ids,
                },
                include_bridges: true,
                include_similarity: true,
            }) as ComparisonResult & { error?: string };

            if (response.error) {
                setError(response.error);
            } else {
                setResult(response);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Comparison failed');
        } finally {
            setIsLoading(false);
        }
    }, [leftCluster, rightCluster]);


    // Cluster selector component
    const ClusterSelector = ({
        label,
        value,
        onChange,
        side,
    }: {
        label: string;
        value: ClusterConfig | null;
        onChange: (config: ClusterConfig | null) => void;
        side: 'left' | 'right';
    }) => (
        <div className="flex-1 p-4 bg-muted/30 rounded-xl border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                {side === 'left' ? (
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                ) : (
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                )}
                {label}
            </h4>

            {value ? (
                <div className="flex items-center gap-2 p-2 bg-background rounded-lg border border-border">
                    {value.type === 'folder' ? (
                        <Folder className="w-4 h-4 text-amber-500" />
                    ) : value.type === 'file' ? (
                        <FileText className="w-4 h-4 text-blue-500" />
                    ) : (
                        <Grid3X3 className="w-4 h-4 text-purple-500" />
                    )}
                    <span className="flex-1 text-sm truncate">{value.name}</span>
                    <button
                        onClick={() => onChange(null)}
                        className="p-1 hover:bg-muted rounded"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {selectedNodes.length > 0 && (
                        <button
                            onClick={() =>
                                onChange({
                                    type: 'selection',
                                    id: 'current',
                                    name: `${selectedNodes.length} Selected Nodes`,
                                    node_ids: selectedNodes,
                                })
                            }
                            className="w-full flex items-center gap-2 p-2 bg-background hover:bg-muted rounded-lg border border-border transition-colors text-sm"
                        >
                            <Grid3X3 className="w-4 h-4 text-purple-500" />
                            <span>Current Selection ({selectedNodes.length})</span>
                        </button>
                    )}

                    <select
                        className="w-full p-2 bg-background rounded-lg border border-border text-sm"
                        onChange={(e) => {
                            const [type, id] = e.target.value.split(':');
                            if (type && id) {
                                const name =
                                    type === 'folder'
                                        ? folders.find((f) => f.id === id)?.name || id
                                        : files.find((f) => f.id === id)?.name || id;
                                onChange({
                                    type: type as 'file' | 'folder',
                                    id,
                                    name,
                                });
                            }
                        }}
                        defaultValue=""
                    >
                        <option value="">Select a folder or file...</option>
                        <optgroup label="Folders">
                            {folders.map((folder) => (
                                <option key={folder.id} value={`folder:${folder.id}`}>
                                    📁 {folder.name}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Files">
                            {files.map((file) => (
                                <option key={file.id} value={`file:${file.id}`}>
                                    📄 {file.name}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>
            )}
        </div>
    );

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-4 z-50 bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald/10 rounded-lg">
                        <GitCompare className="w-5 h-5 text-emerald" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            Cluster Comparison
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Compare two groups of nodes side-by-side
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Cluster Selection */}
                <div className="flex gap-4 items-stretch">
                    <ClusterSelector
                        label="Left Cluster"
                        value={leftCluster}
                        onChange={setLeftCluster}
                        side="left"
                    />
                    <div className="flex items-center">
                        <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <ClusterSelector
                        label="Right Cluster"
                        value={rightCluster}
                        onChange={setRightCluster}
                        side="right"
                    />
                </div>

                {/* Compare Button */}
                <button
                    onClick={runComparison}
                    disabled={!leftCluster || !rightCluster || isLoading}
                    className={`
                        w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                        ${leftCluster && rightCluster && !isLoading
                            ? 'bg-emerald text-white hover:bg-emerald/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }
                    `}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Comparing...
                        </>
                    ) : (
                        <>
                            <GitCompare className="w-4 h-4" />
                            Compare Clusters
                        </>
                    )}
                </button>

                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                        {error}
                    </div>
                )}

                {/* Results */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            {/* Open Visual Comparison Button */}
                            <button
                                onClick={() => setShowVisualComparison(true)}
                                className="w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                            >
                                <Maximize2 className="w-4 h-4" />
                                Open Visual Comparison (Split-Screen)
                            </button>

                            {/* Similarity Metrics */}
                            <div className="grid grid-cols-3 gap-4">

                                <MetricCard
                                    label="Jaccard Index"
                                    value={`${(result.jaccard_index * 100).toFixed(1)}%`}
                                    color="emerald"
                                />
                                <MetricCard
                                    label="Semantic Similarity"
                                    value={`${(result.semantic_similarity * 100).toFixed(1)}%`}
                                    color="blue"
                                />
                                <MetricCard
                                    label="Structural Similarity"
                                    value={`${(result.structural_similarity * 100).toFixed(1)}%`}
                                    color="purple"
                                />
                            </div>

                            {/* Entity Lists */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Common Entities */}
                                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                                    <h4 className="text-sm font-medium text-green-500 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Common Entities ({result.common_count})
                                    </h4>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {result.common_entities.map((name, i) => (
                                            <div key={i} className="text-sm text-foreground truncate">
                                                🟢 {name}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Unique Left */}
                                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                    <h4 className="text-sm font-medium text-blue-500 mb-2 flex items-center gap-2">
                                        <Layers className="w-4 h-4" />
                                        Unique to Left ({result.unique_left_count})
                                    </h4>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {result.unique_left.slice(0, 20).map((name, i) => (
                                            <div key={i} className="text-sm text-foreground truncate">
                                                🔵 {name}
                                            </div>
                                        ))}
                                        {result.unique_left_count > 20 && (
                                            <div className="text-xs text-muted-foreground">
                                                +{result.unique_left_count - 20} more
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Unique Right */}
                                <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                                    <h4 className="text-sm font-medium text-orange-500 mb-2 flex items-center gap-2">
                                        <Layers className="w-4 h-4" />
                                        Unique to Right ({result.unique_right_count})
                                    </h4>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {result.unique_right.slice(0, 20).map((name, i) => (
                                            <div key={i} className="text-sm text-foreground truncate">
                                                🟠 {name}
                                            </div>
                                        ))}
                                        {result.unique_right_count > 20 && (
                                            <div className="text-xs text-muted-foreground">
                                                +{result.unique_right_count - 20} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bridge Nodes */}
                            {result.bridges.length > 0 && (
                                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                                    <h4 className="text-sm font-medium text-purple-500 mb-3 flex items-center gap-2">
                                        <Link2 className="w-4 h-4" />
                                        Bridge Nodes ({result.bridge_count})
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {result.bridges.map((bridge) => (
                                            <div
                                                key={bridge.id}
                                                className="flex items-center gap-2 p-2 bg-background rounded-lg"
                                            >
                                                <Users className="w-4 h-4 text-purple-500" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">
                                                        {bridge.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        L:{bridge.left_connections} R:{bridge.right_connections}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Visual Comparison View */}
            {showVisualComparison && leftCluster && rightCluster && (
                <ComparisonView
                    isOpen={showVisualComparison}
                    onClose={() => setShowVisualComparison(false)}
                    leftCluster={leftCluster}
                    rightCluster={rightCluster}
                />
            )}
        </motion.div>
    );
}


// Metric Card Component
function MetricCard({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color: 'emerald' | 'blue' | 'purple';
}) {
    const colorClasses = {
        emerald: 'bg-emerald/10 text-emerald border-emerald/30',
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    };

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm opacity-80">{label}</div>
        </div>
    );
}
