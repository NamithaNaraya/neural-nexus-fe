/**
 * Graph Legend
 * 
 * Legend showing node type colors and relationship meanings.
 */
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { NODE_TYPE_COLORS, RELATIONSHIP_COLORS } from '../types';
import { ChevronDown, ChevronUp, Circle, ArrowRight } from 'lucide-react';

export function GraphLegend() {
    const [isExpanded, setIsExpanded] = useState(true);
    const { nodeTypes, linkTypes } = useGraphStore();

    return (
        <div className="bg-card/90 backdrop-blur-md border border-border rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
                <span className="text-xs font-medium text-foreground uppercase tracking-wider">
                    Legend
                </span>
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
            </button>

            {/* Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 pt-0 space-y-3">
                            {/* Node Types */}
                            {nodeTypes.length > 0 && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Nodes</p>
                                    <div className="flex flex-wrap gap-2">
                                        {nodeTypes.slice(0, 6).map(type => (
                                            <LegendItem
                                                key={type}
                                                label={type}
                                                color={NODE_TYPE_COLORS[type] || NODE_TYPE_COLORS.default}
                                            />
                                        ))}
                                        {nodeTypes.length > 6 && (
                                            <span className="text-xs text-muted-foreground">
                                                +{nodeTypes.length - 6} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Relationship Types */}
                            {linkTypes.length > 0 && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Relationships</p>
                                    <div className="flex flex-wrap gap-2">
                                        {linkTypes.slice(0, 4).map(type => (
                                            <LegendItem
                                                key={type}
                                                label={type.replace(/_/g, ' ')}
                                                color={RELATIONSHIP_COLORS[type] || RELATIONSHIP_COLORS.default}
                                                isLink
                                            />
                                        ))}
                                        {linkTypes.length > 4 && (
                                            <span className="text-xs text-muted-foreground">
                                                +{linkTypes.length - 4} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Legend Item Component
interface LegendItemProps {
    label: string;
    color: string;
    isLink?: boolean;
}

function LegendItem({ label, color, isLink = false }: LegendItemProps) {
    return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
            {isLink ? (
                <div className="flex items-center gap-0.5">
                    <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                    <ArrowRight className="w-2 h-2" style={{ color }} />
                </div>
            ) : (
                <Circle className="w-3 h-3" fill={color} stroke={color} />
            )}
            <span className="text-xs text-foreground">{label}</span>
        </div>
    );
}
