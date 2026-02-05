/**
 * Comparison Legend
 * 
 * Color legend explaining the visual coding in comparison view.
 */
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CATEGORY_COLORS, CATEGORY_LABELS, NodeCategory } from './types';

interface ComparisonLegendProps {
    showMissing?: boolean;
    compact?: boolean;
}

export function ComparisonLegend({ showMissing = false, compact = false }: ComparisonLegendProps) {
    const categories: NodeCategory[] = showMissing
        ? ['unique-left', 'unique-right', 'common', 'bridge', 'missing']
        : ['unique-left', 'unique-right', 'common', 'bridge'];

    if (compact) {
        return (
            <div className="flex items-center gap-3 text-xs">
                {categories.map((category) => (
                    <div key={category} className="flex items-center gap-1">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[category] }}
                        />
                        <span className="text-muted-foreground">
                            {CATEGORY_LABELS[category].replace('to ', '').replace('Predicted ', '')}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-lg p-3"
        >
            <div className="text-xs font-medium text-muted-foreground mb-2">
                Color Legend
            </div>
            <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                    <div key={category} className="flex items-center gap-2">
                        <div
                            className={`w-3 h-3 rounded-full ${category === 'missing' ? 'border-2 border-dashed' : ''}`}
                            style={{
                                backgroundColor: category === 'missing' ? 'transparent' : CATEGORY_COLORS[category],
                                borderColor: category === 'missing' ? CATEGORY_COLORS[category] : undefined,
                            }}
                        />
                        <span className="text-xs text-foreground">
                            {CATEGORY_LABELS[category]}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

export default ComparisonLegend;
