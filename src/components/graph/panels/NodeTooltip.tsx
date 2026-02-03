/**
 * Node Tooltip
 * 
 * Hover tooltip showing quick node info.
 * Follows mouse position with smart positioning.
 */
'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraphNode } from '@/store/graphStore';
import { NODE_TYPE_COLORS } from '../types';
import { Circle, Link, ExternalLink } from 'lucide-react';

interface NodeTooltipProps {
    node: GraphNode;
}

export function NodeTooltip({ node }: NodeTooltipProps) {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // Track mouse position
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setPosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Get node color
    const color = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;

    // Calculate tooltip position (offset from cursor)
    const tooltipX = position.x + 15;
    const tooltipY = position.y + 15;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none"
            style={{
                left: tooltipX,
                top: tooltipY,
            }}
        >
            <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                    >
                        <Circle className="w-3 h-3" fill={color} stroke={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                            {node.name}
                        </p>
                        <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                                backgroundColor: `${color}20`,
                                color: color,
                            }}
                        >
                            {node.type}
                        </span>
                    </div>
                </div>

                {/* Description */}
                {node.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {node.description}
                    </p>
                )}

                {/* Quick Stats */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {node.degree !== undefined && (
                        <span className="flex items-center gap-1">
                            <Link className="w-3 h-3" />
                            {node.degree} links
                        </span>
                    )}
                </div>

                {/* Hint */}
                <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    Click to select • Double-click to expand
                </div>
            </div>
        </motion.div>
    );
}
