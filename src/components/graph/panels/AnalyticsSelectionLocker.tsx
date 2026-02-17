'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, BoxSelect, Check, Network } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';

interface AnalyticsSelectionLockerProps {
    isActive: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    isSidebarOpen?: boolean;
}

export function AnalyticsSelectionLocker({
    isActive,
    onCancel,
    onConfirm,
    isSidebarOpen = false,
}: AnalyticsSelectionLockerProps) {
    const selectedNodes = useGraphStore(state => state.selectedNodes);
    const includeNeighbors = useGraphStore(state => state.analyticIncludeNeighbors);
    const setIncludeNeighbors = useGraphStore(state => state.setAnalyticIncludeNeighbors);

    return (
        <AnimatePresence>
            {isActive && (
                <div className={`fixed bottom-12 z-[60] flex justify-center pointer-events-none px-6 transition-all duration-500 ${isSidebarOpen ? 'left-[400px] right-[450px]' : 'left-0 right-0'}`}>
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="bg-white/90 dark:bg-slate-950/80 backdrop-blur-2xl border border-cyan-500/30 rounded-[2.5rem] shadow-[0_32px_128px_rgba(34,211,238,0.15)] p-3 lg:p-4 flex items-center gap-4 lg:gap-6 pointer-events-auto overflow-hidden transition-all duration-500"
                    >
                        {/* Status Icon */}
                        <div className="flex items-center gap-3 lg:gap-4 px-3 lg:px-4 py-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shrink-0">
                            <BoxSelect className="w-5 h-5 text-cyan-500 animate-pulse" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-semibold uppercase text-cyan-600 dark:text-cyan-400 tracking-widest leading-none mb-1">Targeting Logic</span>
                                <span className={`${isSidebarOpen ? 'text-xs' : 'text-sm'} font-bold text-foreground leading-none truncate`}>
                                    {isSidebarOpen ? `Dataset: ${selectedNodes.length}` : `Dataset: ${selectedNodes.length} Selected Entities`}
                                </span>
                            </div>
                        </div>



                        {/* Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={() => useGraphStore.getState().clearSelection()}
                                className={`flex items-center gap-2 px-4 py-3 rounded-2xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all group ${isSidebarOpen ? 'lg:px-3 lg:gap-1.5' : ''}`}
                                title="Clear Selection"
                            >
                                <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                <span className={`${isSidebarOpen ? 'hidden' : 'block'} text-[9px] font-bold uppercase tracking-widest`}>Clear All</span>
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={selectedNodes.length === 0}
                                className={`group flex items-center gap-3 px-8 py-3 rounded-2xl bg-cyan-500 text-white text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed ${isSidebarOpen ? 'lg:px-4 lg:gap-2' : ''}`}
                            >
                                <Zap className="w-4 h-4 fill-current animate-pulse group-hover:rotate-12 transition-transform" />
                                {isSidebarOpen ? 'Source' : 'Source Dataset'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
