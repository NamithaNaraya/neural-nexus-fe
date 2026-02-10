'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, BarChart3, PieChart, Activity, X, Grid, Layers } from 'lucide-react';

export type ChartType = 'bar' | 'donut' | 'sunburst' | 'list' | 'heatmap' | 'treemap';

interface ChartCardProps {
    title: string;
    subtitle: string;
    availableTypes: ChartType[];
    defaultType?: ChartType;
    renderChart: (type: ChartType, isMaximized: boolean) => React.ReactNode;
}

export function ChartCard({
    title,
    subtitle,
    availableTypes,
    defaultType = 'bar',
    renderChart
}: ChartCardProps) {
    const [isMaximized, setIsMaximized] = useState(false);
    const [currentType, setCurrentType] = useState<ChartType>(defaultType);

    // Common Header Controls
    const Controls = () => (
        <div className="flex items-center gap-2">
            {/* Type Selector */}
            {availableTypes.length > 1 && (
                <div className="flex bg-muted/50 rounded-lg p-1 mr-2">
                    {availableTypes.map(type => (
                        <button
                            key={type}
                            onClick={(e) => { e.stopPropagation(); setCurrentType(type); }}
                            className={`p-1.5 rounded-md transition-all ${currentType === type
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                            title={`Switch to ${type} chart`}
                        >
                            {type === 'bar' && <BarChart3 className="w-4 h-4" />}
                            {type === 'donut' && <PieChart className="w-4 h-4" />}
                            {type === 'sunburst' && <Activity className="w-4 h-4" />}

                            {type === 'heatmap' && <Grid className="w-4 h-4" />}
                            {type === 'treemap' && <Layers className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
            )}

            {/* Maximize/Minimize */}
            <button
                onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                title={isMaximized ? "Minimize" : "Maximize"}
            >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
        </div>
    );

    return (
        <>
            {/* Regular Card */}
            <motion.div
                layoutId={`card-${title}`}
                className={`bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col ${isMaximized ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
            >
                <div className="p-6 border-b border-border/50 flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                    </div>
                    <Controls />
                </div>
                <div className="p-6 flex-1 flex items-center justify-center min-h-[300px] overflow-hidden">
                    {renderChart(currentType, false)}
                </div>
            </motion.div>

            {/* Maximized Overlay */}
            <AnimatePresence>
                {isMaximized && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-8"
                        onClick={() => setIsMaximized(false)}
                    >
                        <motion.div
                            layoutId={`chart-container-${title}`}
                            className="bg-card w-full h-full max-w-6xl max-h-[90vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-border flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                                    <p className="text-muted-foreground">{subtitle}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Controls />
                                    <button
                                        onClick={() => setIsMaximized(false)}
                                        className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 p-8 overflow-auto flex items-center justify-center bg-muted/5">
                                {renderChart(currentType, true)}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
