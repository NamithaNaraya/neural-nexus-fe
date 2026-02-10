'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, BoxSelect, Zap, ArrowRight } from 'lucide-react';

interface AnalyticsScopeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectGlobal: () => void;
    onSelectTargeted: () => void;
}

export function AnalyticsScopeModal({ isOpen, onClose, onSelectGlobal, onSelectTargeted }: AnalyticsScopeModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-background/80 backdrop-blur-xl"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-white/90 dark:bg-slate-950/80 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-[3rem] shadow-[0_32px_128px_rgba(0,0,0,0.4)] overflow-hidden p-12"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-white/5 text-muted-foreground transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="text-center mb-12">
                        <div className="inline-flex p-4 rounded-2xl bg-primary/10 text-primary mb-6">
                            <Zap className="w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">Analysis Scope</h2>
                        <p className="text-muted-foreground font-medium italic">Define the horizon of your intelligence discovery</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Option 1: Global */}
                        <button
                            onClick={() => {
                                onSelectGlobal();
                                onClose();
                            }}
                            className="group relative flex flex-col p-8 rounded-[2.5rem] bg-slate-500/5 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-primary/40 hover:bg-slate-500/10 dark:hover:bg-white/[0.04] transition-all duration-500 text-left"
                        >
                            <div className="mb-6 p-4 rounded-2xl bg-slate-500/10 dark:bg-white/5 w-fit group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
                                <Globe className="w-8 h-8 text-slate-500 dark:text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <h3 className="text-xl font-black uppercase mb-3">Global View</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-8 flex-1">Map intelligence across the entire active network. Best for high-level patterns.</p>

                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all">
                                <span>Execute Global</span>
                                <ArrowRight className="w-3 h-3" />
                            </div>
                        </button>

                        {/* Option 2: Targeted */}
                        <button
                            onClick={() => {
                                onSelectTargeted();
                                onClose();
                            }}
                            className="group relative flex flex-col p-8 rounded-[2.5rem] bg-slate-500/5 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-primary/40 hover:bg-slate-500/10 dark:hover:bg-white/[0.04] transition-all duration-500 text-left"
                        >
                            <div className="mb-6 p-4 rounded-2xl bg-slate-500/10 dark:bg-white/5 w-fit group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
                                <BoxSelect className="w-8 h-8 text-slate-500 dark:text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <h3 className="text-xl font-black uppercase mb-3">Targeted Scan</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-8 flex-1">Manually select nodes and paths for deep-dive segmented analysis.</p>

                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all">
                                <span>Choose on Graph</span>
                                <ArrowRight className="w-3 h-3" />
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
