/**
 * Algorithm Drawer
 * 
 * Slide-out drawer containing algorithm panels.
 * Reduces clutter on the main graph view.
 */
'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Activity,
    Network,
    Share2,
    Lightbulb,
    TrendingUp,
    Layers,
    Target,
    Zap,
    PieChart,
    GitBranch,
    Search,
    BarChart3,
    Info,
    ChevronLeft,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/shared';
import { api } from '@/lib/api';
import { useGraphStore } from '@/store/graphStore';

// Result types
interface AlgorithmResultItem {
    id: string;
    name: string;
    type?: string;
    score?: number;
    [key: string]: unknown;
}

interface AlgorithmResult {
    algorithm: string;
    folder_id?: string;
    parameters?: Record<string, unknown>;
    results: AlgorithmResultItem[];
    insight: string;
}

interface AlgorithmDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    folderId?: string;
}

type AlgorithmCategory = 'centrality' | 'community' | 'prediction' | 'analysis';

interface AlgorithmConfig {
    key: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: AlgorithmCategory;
    endpoint: string;
    simpleInfo: string;
    benefit: string;
}

// Helper to fetch algorithm results
async function fetchAlgorithm(endpoint: string, folderId?: string, nodeIds?: string[]): Promise<AlgorithmResult> {
    const params: Record<string, any> = {};
    if (folderId) params.folder_id = folderId;
    if (nodeIds && nodeIds.length > 0) params.node_ids = nodeIds;

    return api.get<AlgorithmResult>(endpoint, params);
}


const algorithms: AlgorithmConfig[] = [
    {
        key: 'pagerank',
        name: 'PageRank',
        description: 'Find influential nodes',
        icon: <TrendingUp className="w-4 h-4" />,
        category: 'centrality',
        endpoint: '/analytics/centrality/pagerank',
        simpleInfo: "Finds the most important and influential nodes by looking at how many other nodes connect to them.",
        benefit: "Identifies key players and authoritative sources in your network."
    },
    {
        key: 'betweenness',
        name: 'Betweenness',
        description: 'Find bridge nodes',
        icon: <Share2 className="w-4 h-4" />,
        category: 'centrality',
        endpoint: '/analytics/centrality/betweenness',
        simpleInfo: "Finds the 'bridge' nodes that connect different parts of your network together.",
        benefit: "Identifies critical hubs that control the flow of information."
    },
    {
        key: 'closeness',
        name: 'Closeness',
        description: 'Find central nodes',
        icon: <Target className="w-4 h-4" />,
        category: 'centrality',
        endpoint: '/analytics/centrality/closeness',
        simpleInfo: "Finds nodes that can quickly reach every other node in the network.",
        benefit: "Identifies the best nodes for spreading information effectively."
    },
    {
        key: 'louvain',
        name: 'Louvain',
        description: 'Find communities',
        icon: <Network className="w-4 h-4" />,
        category: 'community',
        endpoint: '/analytics/community/louvain',
        simpleInfo: "Groups nodes into communities based on how closely they are related to each other.",
        benefit: "Uncovers natural clusters and hidden groups in your data."
    },
    {
        key: 'leiden',
        name: 'Leiden',
        description: 'Precise communities',
        icon: <Layers className="w-4 h-4" />,
        category: 'community',
        endpoint: '/analytics/community/leiden',
        simpleInfo: "An advanced way to find communities that ensures group members are very well connected.",
        benefit: "Provides highly accurate and meaningful community segmentation."
    },
    {
        key: 'node-similarity',
        name: 'Similarity',
        description: 'Find similar pairs',
        icon: <Search className="w-4 h-4" />,
        category: 'prediction',
        endpoint: '/analytics/similarity/nodes',
        simpleInfo: "Compares nodes to see how similar they are based on their connections.",
        benefit: "Great for finding related entities or making recommendations."
    },
    {
        key: 'link-prediction',
        name: 'Link Prediction',
        description: 'Predict connections',
        icon: <GitBranch className="w-4 h-4" />,
        category: 'prediction',
        endpoint: '/analytics/link-prediction',
        simpleInfo: "Predicts which nodes are likely to connect in the future based on existing patterns.",
        benefit: "Helps you discover potential relationships before they happen."
    },
    {
        key: 'health',
        name: 'Graph Health',
        description: 'Overall quality score',
        icon: <Activity className="w-4 h-4" />,
        category: 'analysis',
        endpoint: '/analytics/health',
        simpleInfo: "Checks how well-connected and structured your entire network is.",
        benefit: "Gives you a high-level view of your data's integrity and quality."
    },
    {
        key: 'completeness',
        name: 'Completeness',
        description: 'Knowledge coverage',
        icon: <PieChart className="w-4 h-4" />,
        category: 'analysis',
        endpoint: '/analytics/completeness',
        simpleInfo: "Analyzes how much information is missing from your nodes and relationships.",
        benefit: "Highlights gaps in your data where you need more information."
    },
    {
        key: 'degree-distribution',
        name: 'Connectivity',
        description: 'Connection patterns',
        icon: <BarChart3 className="w-4 h-4" />,
        category: 'analysis',
        endpoint: '/analytics/degree-distribution',
        simpleInfo: "Shows the general patterns of how nodes are connecting to each other.",
        benefit: "Reveals the underlying structural logic of your entire network."
    },
];

const categoryLabels: Record<AlgorithmCategory, { label: string; icon: React.ReactNode }> = {
    centrality: { label: 'Centrality', icon: <TrendingUp className="w-4 h-4" /> },
    community: { label: 'Community', icon: <Network className="w-4 h-4" /> },
    prediction: { label: 'Prediction', icon: <Lightbulb className="w-4 h-4" /> },
    analysis: { label: 'Analysis', icon: <Activity className="w-4 h-4" /> },
};

export function AlgorithmDrawer({ isOpen, onClose, folderId }: AlgorithmDrawerProps) {
    const selectedNodes = useGraphStore(state => state.selectedNodes);

    const [activeCategory, setActiveCategory] = useState<AlgorithmCategory>('centrality');
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | null>(null);
    const [result, setResult] = useState<AlgorithmResult | null>(null);
    const [runOnSelection, setRunOnSelection] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runAlgorithm = useCallback(async (config: AlgorithmConfig) => {
        setSelectedAlgorithm(config.key);
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const nodeIds = runOnSelection && selectedNodes.length > 0 ? selectedNodes : undefined;
            const data = await fetchAlgorithm(config.endpoint, folderId, nodeIds);
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Algorithm failed');
        } finally {
            setIsLoading(false);
        }
    }, [folderId, runOnSelection, selectedNodes]);

    const filteredAlgorithms = algorithms.filter(a => a.category === activeCategory);

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ translateX: '100%' }}
                        animate={{ translateX: 0 }}
                        exit={{ translateX: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        data-tour="algorithm-drawer"
                        className="fixed top-0 right-0 h-full w-[400px] glass-strong z-50 border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.3)] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight">Graph Intelligence</h2>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Advanced Analytics</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Main Content: List or Detail */}
                        <div className="flex-1 flex flex-col overflow-hidden relative">
                            <AnimatePresence mode="wait">
                                {!selectedAlgorithm ? (
                                    <motion.div
                                        key="list"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="flex-1 flex flex-col overflow-hidden"
                                    >
                                        {/* Category Tabs */}
                                        <div className="flex px-4 pt-4 gap-1 overflow-x-auto scrollbar-none shrink-0">
                                            {Object.entries(categoryLabels).map(([key, { label, icon }]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setActiveCategory(key as AlgorithmCategory)}
                                                    className={`
                                                        flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all duration-300
                                                        ${activeCategory === key
                                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                                            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                                        }
                                                    `}
                                                >
                                                    {icon}
                                                    {label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Algorithm List */}
                                        <div className="px-4 py-6 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
                                            <div className="px-1 mb-2">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Available Strategies</h3>
                                            </div>
                                            {filteredAlgorithms.map(algo => (
                                                <button
                                                    key={algo.key}
                                                    onClick={() => {
                                                        setSelectedAlgorithm(algo.key);
                                                        setResult(null);
                                                        setError(null);
                                                    }}
                                                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group text-left"
                                                >
                                                    <div className="p-3 rounded-xl bg-white/5 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 group-hover:rotate-6 shadow-lg">
                                                        {algo.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-sm tracking-tight mb-0.5">{algo.name}</div>
                                                        <div className="text-[10px] text-muted-foreground/80 font-medium truncate">{algo.description}</div>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Zap className="w-3.5 h-3.5 text-primary" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Footer / Scope */}
                                        <div className="mt-auto m-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Target className="w-4 h-4 text-primary/80" />
                                                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Scope</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {selectedNodes.length > 0 && (
                                                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary/20 text-primary font-black border border-primary/20">
                                                            {selectedNodes.length} SELECTED
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => setRunOnSelection(!runOnSelection)}
                                                        disabled={selectedNodes.length === 0}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 focus:outline-none ${runOnSelection && selectedNodes.length > 0 ? 'bg-primary shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'bg-white/10'
                                                            } ${selectedNodes.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${runOnSelection && selectedNodes.length > 0 ? 'translate-x-6' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="detail"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="flex-1 flex flex-col overflow-hidden p-6"
                                    >
                                        {/* Back Button */}
                                        <button
                                            onClick={() => {
                                                setSelectedAlgorithm(null);
                                                setResult(null);
                                                setError(null);
                                            }}
                                            className="w-fit flex items-center gap-2 mb-8 group p-2 -ml-2 rounded-xl hover:bg-white/5 transition-all"
                                        >
                                            <div className="p-1.5 rounded-lg border border-white/10 text-muted-foreground group-hover:text-primary group-hover:border-primary/50 transition-all">
                                                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                            </div>
                                            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground group-hover:text-foreground">Back to selection</span>
                                        </button>

                                        {(() => {
                                            const algo = algorithms.find(a => a.key === selectedAlgorithm);
                                            if (!algo) return null;

                                            return (
                                                <div className="flex-1 flex flex-col overflow-hidden space-y-6">
                                                    {/* Header Info */}
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="p-4 rounded-3xl bg-primary shadow-2xl shadow-primary/20 text-primary-foreground transform rotate-3">
                                                            {algo.icon}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-black tracking-tight">{algo.name}</h3>
                                                            <p className="text-xs text-muted-foreground font-medium">{algo.category.toUpperCase()} ANALYSIS</p>
                                                        </div>
                                                    </div>

                                                    {/* Simple Info Section */}
                                                    <div className="space-y-6 bg-white/2 p-6 rounded-3xl border border-white/5">
                                                        <section>
                                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 font-black">What it does</h4>
                                                            <p className="text-sm text-foreground/80 leading-relaxed font-medium">{algo.simpleInfo}</p>
                                                        </section>

                                                        <section className="pt-4 border-t border-white/5">
                                                            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2 font-black">Why use it</h4>
                                                            <p className="text-sm font-bold text-foreground leading-snug">{algo.benefit}</p>
                                                        </section>
                                                    </div>

                                                    {/* Results or Action Area */}
                                                    <div className="flex-1 flex flex-col overflow-hidden relative mt-4">
                                                        {error && (
                                                            <div className="p-4 mb-4 rounded-2xl bg-destructive/10 text-destructive text-xs font-bold border border-destructive/20">
                                                                {error}
                                                            </div>
                                                        )}

                                                        {isLoading ? (
                                                            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                                                <div className="relative">
                                                                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                                    <Zap className="absolute inset-0 m-auto w-5 h-5 text-primary animate-pulse" />
                                                                </div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Discovering Patterns...</p>
                                                            </div>
                                                        ) : result ? (
                                                            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                                                                <div className="flex items-center justify-between mb-4 px-1">
                                                                    <h3 className="font-black text-[10px] uppercase tracking-widest text-primary">{algo.name} RESULTS</h3>
                                                                    <div className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-muted-foreground">
                                                                        {result.results?.length || 0} TOTAL
                                                                    </div>
                                                                </div>

                                                                {result.insight && (
                                                                    <div className="mb-4 p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
                                                                        <p className="text-xs leading-relaxed font-medium text-foreground italic">"{result.insight}"</p>
                                                                    </div>
                                                                )}

                                                                <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2 pb-4">
                                                                    {result.results?.slice(0, 15).map((item, i) => (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, x: 10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: i * 0.05 }}
                                                                            key={item.id || i}
                                                                            className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group/item"
                                                                        >
                                                                            <div className="min-w-0 flex-1 mr-4">
                                                                                <div className="font-bold text-xs truncate group-hover/item:text-primary transition-colors">{item.name}</div>
                                                                                {item.type && (
                                                                                    <div className="text-[9px] uppercase tracking-tighter text-muted-foreground font-black mt-0.5">{item.type}</div>
                                                                                )}
                                                                            </div>
                                                                            {item.score !== undefined && (
                                                                                <div className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-mono text-cyan-400 font-bold border border-cyan-400/10">
                                                                                    {item.score.toFixed(4)}
                                                                                </div>
                                                                            )}
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex-1 flex flex-col justify-end">
                                                                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 mb-4 text-center">
                                                                    <p className="text-[10px] font-bold text-muted-foreground italic leading-relaxed">
                                                                        Deep-scan will analyze nodes based on the current graph context. Large graphs may take a few seconds.
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => runAlgorithm(algo)}
                                                                    className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:scale-[1.02] active:scale-95 transition-all"
                                                                >
                                                                    <Zap className="w-5 h-5 fill-current" />
                                                                    Execute Analysis
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// Toggle button for navbar/toolbar
export function AlgorithmDrawerToggle({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
        >
            <Zap className="w-4 h-4" />
            <span className="text-sm">Algorithms</span>
        </button>
    );
}
