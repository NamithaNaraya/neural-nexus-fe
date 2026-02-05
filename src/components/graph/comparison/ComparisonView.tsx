/**
 * Comparison View
 * 
 * Main split-screen container for cluster comparison.
 * Shows two graphs side-by-side with controls and metrics.
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { docAiApi } from '@/lib/api';

import { ComparisonGraph } from './ComparisonGraph';
import { ComparisonControls } from './ComparisonControls';
import { ComparisonMetrics } from './ComparisonMetrics';
import { ComparisonLegend } from './ComparisonLegend';
import {
    ComparisonMode,
    ComparisonResult,
    ComparisonNode,
    ComparisonLink,
    ClusterConfig,
    CATEGORY_COLORS,
} from './types';

interface ComparisonViewProps {
    isOpen: boolean;
    onClose: () => void;
    leftCluster: ClusterConfig;
    rightCluster: ClusterConfig;
}

export function ComparisonView({
    isOpen,
    onClose,
    leftCluster,
    rightCluster,
}: ComparisonViewProps) {
    // State
    const [mode, setMode] = useState<ComparisonMode>('split');
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Visual state
    const [showBridges, setShowBridges] = useState(false);
    const [highlightCommon, setHighlightCommon] = useState(false);
    const [showMissing, setShowMissing] = useState(false);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

    // Graph data
    const [leftNodes, setLeftNodes] = useState<ComparisonNode[]>([]);
    const [rightNodes, setRightNodes] = useState<ComparisonNode[]>([]);
    const [leftLinks, setLeftLinks] = useState<ComparisonLink[]>([]);
    const [rightLinks, setRightLinks] = useState<ComparisonLink[]>([]);

    // Fetch comparison data
    const fetchComparison = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await docAiApi.analytics.compare({
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
            });

            const data = response.data;

            // Transform nodes with categories
            const commonSet = new Set(data.common_entities || []);
            const bridgeSet = new Set((data.bridges || []).map((b: any) => b.name));

            const transformNodes = (nodes: any[], side: 'left' | 'right'): ComparisonNode[] => {
                return nodes.map(n => ({
                    ...n,
                    category: bridgeSet.has(n.name)
                        ? 'bridge'
                        : commonSet.has(n.name)
                            ? 'common'
                            : side === 'left' ? 'unique-left' : 'unique-right',
                }));
            };

            setLeftNodes(transformNodes(data.left_nodes || [], 'left'));
            setRightNodes(transformNodes(data.right_nodes || [], 'right'));
            setLeftLinks(data.left_links || []);
            setRightLinks(data.right_links || []);

            setResult({
                leftNodes: data.left_nodes || [],
                rightNodes: data.right_nodes || [],
                leftLinks: data.left_links || [],
                rightLinks: data.right_links || [],
                commonEntities: data.common_entities || [],
                commonCount: data.common_count || 0,
                uniqueLeft: data.unique_left || [],
                uniqueLeftCount: data.unique_left_count || 0,
                uniqueRight: data.unique_right || [],
                uniqueRightCount: data.unique_right_count || 0,
                bridges: (data.bridges || []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    type: b.type,
                    leftConnections: b.left_connections || 0,
                    rightConnections: b.right_connections || 0,
                    bridgeStrength: b.bridge_strength || 0,
                })),
                bridgeCount: data.bridge_count || 0,
                semanticSimilarity: data.semantic_similarity || 0,
                structuralSimilarity: data.structural_similarity || 0,
                jaccardIndex: data.jaccard_index || 0,
            });
        } catch (err: any) {
            console.error('Comparison failed:', err);
            setError(err.response?.data?.detail || 'Failed to compare clusters');
        } finally {
            setIsLoading(false);
        }
    }, [leftCluster, rightCluster]);

    // Fetch on mount
    useEffect(() => {
        if (isOpen && leftCluster && rightCluster) {
            fetchComparison();
        }
    }, [isOpen, leftCluster, rightCluster, fetchComparison]);

    // Find missing entities
    const handleFindMissing = async () => {
        if (!result) return;

        try {
            const response = await docAiApi.analytics.findMissing({
                left_nodes: result.leftNodes,
                right_nodes: result.rightNodes,
            });

            // Add missing nodes as ghost nodes
            const missingInRight = response.data.missing_in_right || [];
            const ghostNodes: ComparisonNode[] = missingInRight.map((name: string) => ({
                id: `ghost-${name}`,
                name,
                type: 'Predicted',
                category: 'missing' as const,
            }));

            setRightNodes(prev => [...prev, ...ghostNodes]);
            setShowMissing(true);
        } catch (err) {
            console.error('Find missing failed:', err);
        }
    };

    // Export comparison
    const handleExport = async (format: 'json' | 'pdf') => {
        if (!result) return;

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `comparison_${leftCluster.name}_vs_${rightCluster.name}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            // PDF export would call backend
            try {
                const response = await docAiApi.analytics.exportComparison({
                    format: 'pdf',
                    left_name: leftCluster.name,
                    right_name: rightCluster.name,
                    result,
                });

                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comparison_${leftCluster.name}_vs_${rightCluster.name}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error('PDF export failed:', err);
                // Fallback to JSON
                handleExport('json');
            }
        }
    };

    // Merge view - combine both node sets
    const mergedNodes = mode === 'merge'
        ? [...leftNodes, ...rightNodes.filter(n => !leftNodes.find(l => l.name === n.name))]
        : [];
    const mergedLinks = mode === 'merge'
        ? [...leftLinks, ...rightLinks]
        : [];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="glass-panel flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-foreground">
                                Cluster Comparison
                            </h2>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span
                                    className="px-2 py-0.5 rounded-md"
                                    style={{ backgroundColor: `${CATEGORY_COLORS['unique-left']}20`, color: CATEGORY_COLORS['unique-left'] }}
                                >
                                    {leftCluster.name}
                                </span>
                                <span>vs</span>
                                <span
                                    className="px-2 py-0.5 rounded-md"
                                    style={{ backgroundColor: `${CATEGORY_COLORS['unique-right']}20`, color: CATEGORY_COLORS['unique-right'] }}
                                >
                                    {rightCluster.name}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <ComparisonLegend showMissing={showMissing} compact />
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Controls */}
                    <ComparisonControls
                        mode={mode}
                        onModeChange={setMode}
                        showBridges={showBridges}
                        onToggleBridges={() => setShowBridges(!showBridges)}
                        highlightCommon={highlightCommon}
                        onToggleHighlight={() => setHighlightCommon(!highlightCommon)}
                        showMissing={showMissing}
                        onToggleMissing={() => setShowMissing(!showMissing)}
                        onFindMissing={handleFindMissing}
                        onExport={handleExport}
                        result={result}
                        isLoading={isLoading}
                    />

                    {/* Main content */}
                    <div className="flex-1 overflow-hidden">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <span className="text-muted-foreground">Analyzing clusters...</span>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                    <span className="text-red-400">{error}</span>
                                    <button
                                        onClick={fetchComparison}
                                        className="px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        ) : mode === 'merge' ? (
                            // Merged view - single graph
                            <div className="h-full p-4">
                                <div className="h-full glass-panel rounded-xl overflow-hidden">
                                    <ComparisonGraph
                                        nodes={mergedNodes}
                                        links={mergedLinks}
                                        title="Merged View"
                                        nodeCount={mergedNodes.length}
                                        linkCount={mergedLinks.length}
                                        side="left"
                                        mode={mode}
                                        highlightCommon={highlightCommon}
                                        showBridges={showBridges}
                                        commonEntities={result?.commonEntities || []}
                                        selectedNodes={selectedNodes}
                                        onNodeClick={(id) => setSelectedNodes(prev =>
                                            prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
                                        )}
                                    />
                                </div>
                            </div>
                        ) : (
                            // Split view - two graphs
                            <div className="h-full grid grid-cols-2 gap-1 p-4">
                                {/* Left graph */}
                                <div className="glass-panel rounded-xl overflow-hidden">
                                    <ComparisonGraph
                                        nodes={leftNodes}
                                        links={leftLinks}
                                        title={leftCluster.name}
                                        nodeCount={leftNodes.length}
                                        linkCount={leftLinks.length}
                                        side="left"
                                        mode={mode}
                                        highlightCommon={highlightCommon}
                                        showBridges={showBridges}
                                        commonEntities={result?.commonEntities || []}
                                        selectedNodes={selectedNodes}
                                        onNodeClick={(id) => setSelectedNodes(prev =>
                                            prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
                                        )}
                                    />
                                </div>

                                {/* Right graph */}
                                <div className="glass-panel rounded-xl overflow-hidden">
                                    <ComparisonGraph
                                        nodes={rightNodes}
                                        links={rightLinks}
                                        title={rightCluster.name}
                                        nodeCount={rightNodes.length}
                                        linkCount={rightLinks.length}
                                        side="right"
                                        mode={mode}
                                        highlightCommon={highlightCommon}
                                        showBridges={showBridges}
                                        commonEntities={result?.commonEntities || []}
                                        selectedNodes={selectedNodes}
                                        onNodeClick={(id) => setSelectedNodes(prev =>
                                            prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom metrics */}
                    <ComparisonMetrics result={result} isLoading={isLoading} />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

export default ComparisonView;
