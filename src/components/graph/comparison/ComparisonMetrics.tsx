/**
 * Comparison Metrics Bar
 * 
 * Bottom bar showing comparison statistics:
 * - Common entities count + expandable list
 * - Bridge nodes count + expandable list
 * - Similarity percentages
 */
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Link2,
    Percent,
    ChevronDown,
    ChevronUp,
    Network,
    BarChart3,
} from 'lucide-react';
import { ComparisonResult, CATEGORY_COLORS } from './types';

interface ComparisonMetricsProps {
    result: ComparisonResult | null;
    isLoading?: boolean;
}

export function ComparisonMetrics({ result, isLoading }: ComparisonMetricsProps) {
    const [expandedSection, setExpandedSection] = useState<'common' | 'bridges' | null>(null);

    if (isLoading) {
        return (
            <div className="glass-panel border-t border-white/5 p-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    <span>Analyzing clusters...</span>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="glass-panel border-t border-white/5 p-4">
                <div className="text-center text-muted-foreground text-sm">
                    Select two clusters to compare
                </div>
            </div>
        );
    }

    const toggleSection = (section: 'common' | 'bridges') => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="glass-panel border-t border-white/5">
            {/* Main metrics row */}
            <div className="p-4 grid grid-cols-5 gap-4">
                {/* Common Entities */}
                <button
                    onClick={() => toggleSection('common')}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${CATEGORY_COLORS.common}20` }}
                    >
                        <Users className="w-5 h-5" style={{ color: CATEGORY_COLORS.common }} />
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Common Entities</div>
                        <div className="text-lg font-semibold text-foreground flex items-center gap-1">
                            {result.commonCount}
                            {expandedSection === 'common' ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </div>
                    </div>
                </button>

                {/* Bridge Nodes */}
                <button
                    onClick={() => toggleSection('bridges')}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${CATEGORY_COLORS.bridge}20` }}
                    >
                        <Link2 className="w-5 h-5" style={{ color: CATEGORY_COLORS.bridge }} />
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Bridge Nodes</div>
                        <div className="text-lg font-semibold text-foreground flex items-center gap-1">
                            {result.bridgeCount}
                            {expandedSection === 'bridges' ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </div>
                    </div>
                </button>

                {/* Semantic Similarity */}
                <div className="flex items-center gap-3 p-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Semantic Similarity</div>
                        <div className="text-lg font-semibold text-foreground">
                            {(result.semanticSimilarity * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* Structural Similarity */}
                <div className="flex items-center gap-3 p-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Network className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Structural Similarity</div>
                        <div className="text-lg font-semibold text-foreground">
                            {(result.structuralSimilarity * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* Jaccard Index */}
                <div className="flex items-center gap-3 p-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Percent className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Jaccard Index</div>
                        <div className="text-lg font-semibold text-foreground">
                            {(result.jaccardIndex * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable sections */}
            <AnimatePresence>
                {expandedSection && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5 overflow-hidden"
                    >
                        <div className="p-4 max-h-40 overflow-y-auto">
                            {expandedSection === 'common' && (
                                <div className="flex flex-wrap gap-2">
                                    {result.commonEntities.map((entity) => (
                                        <span
                                            key={entity}
                                            className="px-2 py-1 rounded-md text-xs font-medium"
                                            style={{
                                                backgroundColor: `${CATEGORY_COLORS.common}20`,
                                                color: CATEGORY_COLORS.common,
                                            }}
                                        >
                                            {entity}
                                        </span>
                                    ))}
                                    {result.commonEntities.length === 0 && (
                                        <span className="text-muted-foreground text-sm">
                                            No common entities found
                                        </span>
                                    )}
                                </div>
                            )}
                            {expandedSection === 'bridges' && (
                                <div className="space-y-2">
                                    {result.bridges.map((bridge) => (
                                        <div
                                            key={bridge.id}
                                            className="flex items-center justify-between p-2 rounded-lg"
                                            style={{ backgroundColor: `${CATEGORY_COLORS.bridge}10` }}
                                        >
                                            <div>
                                                <span
                                                    className="font-medium"
                                                    style={{ color: CATEGORY_COLORS.bridge }}
                                                >
                                                    {bridge.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ({bridge.type})
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                ←{bridge.leftConnections} | {bridge.rightConnections}→
                                            </div>
                                        </div>
                                    ))}
                                    {result.bridges.length === 0 && (
                                        <span className="text-muted-foreground text-sm">
                                            No bridge nodes found
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ComparisonMetrics;
