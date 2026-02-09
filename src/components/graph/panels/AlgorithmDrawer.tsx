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
        description: 'Find influential nodes (GDS)',
        icon: <TrendingUp className="w-4 h-4" />,
        category: 'centrality',
        endpoint: '/analytics/centrality/pagerank',
    },
    {
        key: 'betweenness',
        name: 'Betweenness',
        description: 'Find bridge nodes (GDS)',
        icon: <Share2 className="w-4 h-4" />,
        category: 'centrality',
        endpoint: '/analytics/centrality/betweenness',
    },
    {
        key: 'closeness',
        name: 'Closeness',
        description: 'Find central nodes by distance (GDS)',
        icon: <Target className="w-4 h-4" />,
        category: 'centrality',
        endpoint: '/analytics/centrality/closeness',
    },
    {
        key: 'louvain',
        name: 'Louvain',
        description: 'Community detection (GDS)',
        icon: <Network className="w-4 h-4" />,
        category: 'community',
        endpoint: '/analytics/community/louvain',
    },
    {
        key: 'leiden',
        name: 'Leiden',
        description: 'Improved communities (GDS)',
        icon: <Layers className="w-4 h-4" />,
        category: 'community',
        endpoint: '/analytics/community/leiden',
    },
    {
        key: 'node-similarity',
        name: 'Node Similarity',
        description: 'Find similar node pairs (GDS)',
        icon: <Search className="w-4 h-4" />,
        category: 'prediction',
        endpoint: '/analytics/similarity/nodes',
    },
    {
        key: 'link-prediction',
        name: 'Link Prediction',
        description: 'Predict missing links (GDS)',
        icon: <GitBranch className="w-4 h-4" />,
        category: 'prediction',
        endpoint: '/analytics/link-prediction',
    },
    {
        key: 'health',
        name: 'Graph Health',
        description: 'Overall graph quality score',
        icon: <Activity className="w-4 h-4" />,
        category: 'analysis',
        endpoint: '/analytics/health',
    },
    {
        key: 'completeness',
        name: 'Completeness',
        description: 'Knowledge coverage analysis',
        icon: <PieChart className="w-4 h-4" />,
        category: 'analysis',
        endpoint: '/analytics/completeness',
    },
    {
        key: 'degree-distribution',
        name: 'Degree Distribution',
        description: 'Node connectivity patterns',
        icon: <BarChart3 className="w-4 h-4" />,
        category: 'analysis',
        endpoint: '/analytics/degree-distribution',
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
                        initial={{ translateX: '-100%' }}
                        animate={{ translateX: 0 }}
                        exit={{ translateX: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        data-tour="algorithm-drawer"
                        className="fixed top-0 left-0 h-full w-[400px] glass-strong z-50 border-r border-white/10 shadow-[20px_0_60px_rgba(0,0,0,0.3)] flex flex-col"
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

                        {/* Category Tabs */}
                        <div className="flex px-4 pt-4 gap-1 overflow-x-auto scrollbar-none">
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

                        {/* Algorithm Selection Filtering */}
                        <div className="m-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-primary/80" />
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Execution Scope</span>
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
                            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed italic opacity-80">
                                {selectedNodes.length === 0
                                    ? "Select nodes in the graph to enable targeted subset analysis."
                                    : (runOnSelection ? "Running on selected nodes only for precise insights." : "Running on full graph context.")}
                            </p>
                        </div>

                        {/* Algorithm List */}
                        <div className="px-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 max-h-[30vh]">
                            {filteredAlgorithms.map(algo => (
                                <button
                                    key={algo.key}
                                    onClick={() => runAlgorithm(algo)}
                                    disabled={isLoading}
                                    className={`
                                        w-full flex items-center gap-4 p-3.5 rounded-2xl border transition-all duration-300 group
                                        ${selectedAlgorithm === algo.key
                                            ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                                            : 'border-white/5 bg-white/2 hover:border-white/20 hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <div className={`
                                        p-3 rounded-xl shadow-lg transition-all duration-500 group-hover:scale-110
                                        ${selectedAlgorithm === algo.key
                                            ? 'bg-primary text-primary-foreground rotate-6'
                                            : 'bg-white/5 text-muted-foreground'
                                        }
                                    `}>
                                        {algo.icon}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-bold text-sm tracking-tight mb-0.5">{algo.name}</div>
                                        <div className="text-[10px] text-muted-foreground/80 font-medium">{algo.description}</div>
                                    </div>
                                    {isLoading && selectedAlgorithm === algo.key ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                    ) : (
                                        <Zap className={`w-3.5 h-3.5 transition-all duration-500 ${selectedAlgorithm === algo.key ? 'opacity-100 text-primary scale-125' : 'opacity-0'}`} />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Results Panel */}
                        <div className="flex-1 m-4 p-5 rounded-3xl bg-black/20 border border-white/5 overflow-hidden flex flex-col">
                            {error && (
                                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold border border-destructive/20 animate-in fade-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}

                            {result && !isLoading && (
                                <div className="space-y-4 flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-xs uppercase tracking-widest text-primary/80">{result.algorithm} RESULTS</h3>
                                        <div className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-muted-foreground">
                                            {result.results?.length || 0} TOTAL
                                        </div>
                                    </div>

                                    {/* Insight - Flowy Glass Container */}
                                    {result.insight && (
                                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner">
                                            <p className="text-[13px] leading-relaxed font-medium text-foreground/90 italic">"{result.insight}"</p>
                                        </div>
                                    )}

                                    {/* Results List */}
                                    <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2">
                                        {result.results?.slice(0, 15).map((item: AlgorithmResultItem, i: number) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                key={item.id || i}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/8 transition-all duration-300"
                                            >
                                                <div className="min-w-0 flex-1 mr-4">
                                                    <div className="font-bold text-xs truncate">{item.name}</div>
                                                    {item.type && (
                                                        <div className="text-[9px] uppercase tracking-tighter text-muted-foreground font-black mt-0.5">{item.type}</div>
                                                    )}
                                                </div>
                                                {item.score !== undefined && (
                                                    <div className="px-2 py-1 rounded-md bg-black/40 text-[11px] font-mono text-cyan-400 font-bold border border-cyan-400/20">
                                                        {item.score.toFixed(4)}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!result && !isLoading && !error && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 group-hover:scale-110 transition-transform duration-700">
                                        <Zap className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h4 className="text-sm font-bold mb-1 tracking-tight">Ready for Discovery</h4>
                                    <p className="text-[10px] font-medium max-w-[180px]">Select an algorithm above to reveal hidden patterns in your graph engine.</p>
                                </div>
                            )}
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
