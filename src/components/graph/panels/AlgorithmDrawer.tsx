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
    Sparkles,
    Brain,
    Globe,
    BoxSelect,
    MousePointer2,
    Users,
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

    // Externalized Scope State
    runOnSelection?: boolean;
    initialSetupPhase?: boolean;
    includeNeighbors?: boolean;
    onChangeScope?: () => void;
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
        simpleInfo: "Evaluates the relative importance of nodes based on the quality and quantity of their connections.",
        benefit: "Reveals high-authority hubs and primary influence centers in your dataset."
    },
    {
        key: 'betweenness',
        name: 'Betweenness',
        description: 'Find bridge nodes',
        icon: <Share2 className="w-4 h-4" />,
        category: 'centrality',
        endpoint: '/analytics/centrality/betweenness',
        simpleInfo: "Identifies 'bridge' nodes that serve as critical connectors between isolated data clusters.",
        benefit: "Pinpoints bottleneck entities that control the flow of information across your network."
    },
    {
        key: 'closeness',
        name: 'Closeness',
        description: 'Find central nodes',
        icon: <Target className="w-4 h-4" />,
        category: 'centrality',
        endpoint: '/analytics/centrality/closeness',
        simpleInfo: "Measures how quickly a node can access all other pieces of information in the dataset.",
        benefit: "Detects the most efficiently positioned nodes for data distribution or gathering."
    },
    {
        key: 'louvain',
        name: 'Louvain',
        description: 'Find communities',
        icon: <Network className="w-4 h-4" />,
        category: 'community',
        endpoint: '/analytics/community/louvain',
        simpleInfo: "Uncovers deep community structures by grouping nodes into highly cohesive thematic clusters.",
        benefit: "Exposes logical segmentations and hidden organizational patterns in complex data."
    },
    {
        key: 'leiden',
        name: 'Leiden',
        description: 'Precise communities',
        icon: <Layers className="w-4 h-4" />,
        category: 'community',
        endpoint: '/analytics/community/leiden',
        simpleInfo: "Utilizes advanced modularity optimization to find extremely precise and well-defined communities.",
        benefit: "Provides high-resolution clustering for more accurate cross-modality data analysis."
    },
    {
        key: 'node-similarity',
        name: 'Similarity',
        description: 'Find similar pairs',
        icon: <Search className="w-4 h-4" />,
        category: 'prediction',
        endpoint: '/analytics/similarity/nodes',
        simpleInfo: "Compares structural overlap between nodes to find entities with identical connection profiles.",
        benefit: "Ideal for identifying duplicates, related entities, or making data recommendations."
    },
    {
        key: 'link-prediction',
        name: 'Link Prediction',
        description: 'Predict connections',
        icon: <GitBranch className="w-4 h-4" />,
        category: 'prediction',
        endpoint: '/analytics/link-prediction',
        simpleInfo: "Analyzes existing relationship patterns to forecast likely future connections between entities.",
        benefit: "Anticipates growth trends and discovers missing links before they are explicitly documented."
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

export function AlgorithmDrawer({
    isOpen,
    onClose,
    folderId,
    runOnSelection: externalRunOnSelection = false,
    initialSetupPhase = true,
    includeNeighbors: externalIncludeNeighbors = false,
    onChangeScope
}: AlgorithmDrawerProps) {
    const selectedNodes = useGraphStore(state => state.selectedNodes);

    const [activeCategory, setActiveCategory] = useState<AlgorithmCategory>('centrality');
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | null>(null);
    const [result, setResult] = useState<AlgorithmResult | null>(null);
    const [runOnSelection, setRunOnSelection] = useState(selectedNodes.length > 0);

    // Sync external changes and auto-default
    React.useEffect(() => {
        if (selectedNodes.length > 0) {
            setRunOnSelection(true);
        }
    }, [selectedNodes.length]);

    React.useEffect(() => {
        setRunOnSelection(externalRunOnSelection);
    }, [externalRunOnSelection]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Setup Phase State
    const [setupPhase, setSetupPhase] = useState(initialSetupPhase);
    const [includeNeighbors, setIncludeNeighbors] = useState(externalIncludeNeighbors);

    // Sync external changes
    React.useEffect(() => {
        setIncludeNeighbors(externalIncludeNeighbors);
    }, [externalIncludeNeighbors]);

    // Sync setup phase if initial changes
    React.useEffect(() => {
        setSetupPhase(initialSetupPhase);
    }, [initialSetupPhase]);

    const nodes = useGraphStore(state => state.nodes);
    const links = useGraphStore(state => state.links);

    // Calculate effective targeted nodes including neighbors if requested
    const effectiveTargetedIds = React.useMemo(() => {
        if (!runOnSelection) return [];
        if (!includeNeighbors) return selectedNodes;

        const neighborIds = new Set(selectedNodes);
        links.forEach(link => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;

            if (selectedNodes.includes(sourceId)) neighborIds.add(targetId);
            if (selectedNodes.includes(targetId)) neighborIds.add(sourceId);
        });
        return Array.from(neighborIds);
    }, [runOnSelection, includeNeighbors, selectedNodes, links]);

    const runAlgorithm = useCallback(async (config: AlgorithmConfig) => {
        setSelectedAlgorithm(config.key);
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const nodeIds = runOnSelection && effectiveTargetedIds.length > 0 ? effectiveTargetedIds : undefined;
            const data = await fetchAlgorithm(config.endpoint, folderId, nodeIds);
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Algorithm failed');
        } finally {
            setIsLoading(false);
        }
    }, [folderId, runOnSelection, effectiveTargetedIds]);

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
                        className="fixed inset-0 bg-background/60 dark:bg-black/60 backdrop-blur-md z-40"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        data-tour="algorithm-drawer"
                        className="fixed inset-0 bg-white/90 dark:bg-slate-950/80 backdrop-blur-3xl z-50 flex flex-col overflow-hidden text-foreground"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-8 border-b border-black/5 dark:border-white/5 bg-transparent shrink-0">
                            <div className="w-full flex items-center justify-between px-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-primary/20 text-primary shadow-xl shadow-primary/10">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tighter uppercase font-heading">Neural Analytics Engine</h2>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em] opacity-60">System Ready • Advanced Intelligence</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    {selectedNodes.length > 0 && (
                                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                                {selectedNodes.length} Entities Selected
                                            </span>
                                        </div>
                                    )}
                                    {!setupPhase && !selectedAlgorithm && (
                                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                                            <div className={`w-2 h-2 rounded-full ${runOnSelection ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Scope: {runOnSelection ? 'Targeted Set' : 'Global Network'}
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            setSetupPhase(true);
                                            setSelectedAlgorithm(null);
                                            setResult(null);
                                            onClose();
                                        }}
                                        className="p-3 rounded-2xl hover:bg-white/10 transition-all text-muted-foreground hover:text-foreground border border-white/5 hover:border-white/20"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content: Setup, List, or Detail */}
                        <div className="flex-1 flex flex-col overflow-hidden relative bg-transparent">
                            <AnimatePresence mode="wait">
                                {setupPhase ? (
                                    <motion.div
                                        key="setup"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.05 }}
                                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                        className="flex-1 flex flex-col items-center justify-center p-12 overflow-y-auto scrollbar-none"
                                    >
                                        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Option 1: Global */}
                                            <button
                                                onClick={() => {
                                                    setRunOnSelection(false);
                                                    setSetupPhase(false);
                                                }}
                                                className={`group relative flex flex-col p-10 rounded-[3rem] border-2 transition-all duration-500 text-left ${!runOnSelection
                                                    ? 'bg-primary/5 border-primary shadow-2xl shadow-primary/10'
                                                    : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] hover:border-black/10 dark:hover:border-white/10'}`}
                                            >
                                                <div className="mb-8 p-6 rounded-3xl bg-white/5 w-fit group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
                                                    <Globe className={`w-10 h-10 ${!runOnSelection ? 'text-primary' : 'text-muted-foreground'}`} />
                                                </div>
                                                <h3 className="text-3xl font-black tracking-tighter mb-4 uppercase">Global Horizon</h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed font-medium">Map intelligence across the entire active network. Recommended for discovery of high-level patterns and global hubs.</p>

                                                <div className="mt-8 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Full Access Locked</span>
                                                </div>
                                            </button>

                                            {/* Option 2: Targeted */}
                                            <div className={`flex flex-col p-10 rounded-[3rem] border-2 transition-all duration-500 ${runOnSelection
                                                ? 'bg-primary/5 border-primary shadow-2xl shadow-primary/10'
                                                : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] hover:border-black/10 dark:hover:border-white/10'}`}>
                                                <div className="flex-1">
                                                    <div className="mb-8 p-6 rounded-3xl bg-white/5 w-fit">
                                                        <BoxSelect className={`w-10 h-10 ${runOnSelection ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    </div>
                                                    <h3 className="text-3xl font-black tracking-tighter mb-4 uppercase">Targeted Segment</h3>
                                                    <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-8">Execute algorithms on a custom set of entities. Perfect for localized root cause analysis and impact studies.</p>

                                                    {!runOnSelection ? (
                                                        <button
                                                            onClick={() => setRunOnSelection(true)}
                                                            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 text-[11px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                                                        >
                                                            <MousePointer2 className="w-4 h-4" />
                                                            Configure Subset
                                                        </button>
                                                    ) : (
                                                        <div className="space-y-6">

                                                            {/* Selection Summary */}
                                                            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 shadow-inner">
                                                                <div className="flex items-center justify-between mb-6">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-[12px]">
                                                                            {effectiveTargetedIds.length}
                                                                        </div>
                                                                        <span className="text-[11px] font-black text-foreground uppercase tracking-wider">In Analysis Scope</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => useGraphStore.getState().clearSelection()}
                                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive transition-all hover:text-white"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                        <span className="text-[9px] font-black uppercase">Clear</span>
                                                                    </button>
                                                                </div>
                                                                <div className="max-h-32 overflow-y-auto scrollbar-none space-y-2 pr-2">
                                                                    {selectedNodes.length > 0 ? (
                                                                        selectedNodes.slice(0, 5).map(id => {
                                                                            const node = nodes.find(n => n.id === id);
                                                                            return (
                                                                                <div key={id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                                    <span className="text-[10px] font-medium truncate">{node?.name || id}</span>
                                                                                    {includeNeighbors && (
                                                                                        <span className="ml-auto text-[8px] font-black text-muted-foreground uppercase">+ Neighbors</span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <div className="py-4 text-center border-2 border-dashed border-white/5 rounded-xl">
                                                                            <p className="text-[9px] text-muted-foreground italic">Select nodes on the graph to begin</p>
                                                                        </div>
                                                                    )}
                                                                    {selectedNodes.length > 5 && (
                                                                        <div className="text-[9px] text-center text-muted-foreground pt-1">+{selectedNodes.length - 5} more...</div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => setSetupPhase(false)}
                                                                disabled={effectiveTargetedIds.length === 0}
                                                                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                                            >
                                                                Confirm Targeted Set
                                                            </button>
                                                            <button
                                                                onClick={() => setRunOnSelection(false)}
                                                                className="w-full py-2 text-[9px] font-black text-muted-foreground uppercase opacity-60 hover:opacity-100 transition-opacity"
                                                            >
                                                                Switch back to Global
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : !selectedAlgorithm ? (
                                    <motion.div
                                        key="list"
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -30 }}
                                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                        className="flex-1 flex flex-col overflow-hidden w-full p-12"
                                    >
                                        <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
                                            <div className="flex items-center justify-between mb-8">
                                                <button
                                                    onClick={() => {
                                                        if (onChangeScope) {
                                                            onChangeScope();
                                                        } else {
                                                            setSetupPhase(true);
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest group"
                                                >
                                                    <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                                                    Reconfigure Scope
                                                </button>
                                            </div>
                                            {/* Category Tabs */}
                                            <div className="flex gap-2 mb-10 overflow-x-auto scrollbar-none shrink-0 justify-center">
                                                {Object.entries(categoryLabels).map(([key, { label, icon }]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => setActiveCategory(key as AlgorithmCategory)}
                                                        className={`
                                                        flex items-center gap-3 px-8 py-4 text-xs font-black uppercase tracking-widest rounded-3xl transition-all duration-500
                                                        ${activeCategory === key
                                                                ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/40 scale-105 border border-primary/50'
                                                                : 'text-muted-foreground bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground'
                                                            }
                                                    `}
                                                    >
                                                        {icon}
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Algorithm Grid */}
                                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 pr-4">
                                                <div className="px-1 mb-8 flex items-center justify-between">
                                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/80">Select Analytic Strategy</h3>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent ml-8" />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                                    {filteredAlgorithms.map(algo => (
                                                        <button
                                                            key={algo.key}
                                                            onClick={() => {
                                                                setSelectedAlgorithm(algo.key);
                                                                setResult(null);
                                                                setError(null);
                                                            }}
                                                            className="group relative flex flex-col p-10 rounded-[3rem] bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-primary/40 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-all duration-500 hover:-translate-y-1"
                                                        >
                                                            <div className="flex items-center gap-4 mb-6">
                                                                <div className="p-4 rounded-2xl bg-white/5 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-700 group-hover:rotate-12 shadow-inner">
                                                                    {React.cloneElement(algo.icon as React.ReactElement, { className: 'w-6 h-6' })}
                                                                </div>
                                                                <div className="font-black text-lg tracking-tight group-hover:text-primary transition-colors flex items-center gap-3">
                                                                    {algo.name}
                                                                    {runOnSelection && (
                                                                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[8px] font-black border border-amber-500/20 uppercase tracking-widest shrink-0">
                                                                            Targeted
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground/80 font-medium leading-relaxed mb-8 flex-1">{algo.description}</div>
                                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/40 group-hover:text-primary transition-colors">
                                                                <span>Deep Scan</span>
                                                                <Zap className="w-3 h-3 fill-current" />
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="detail"
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 50 }}
                                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                        className="flex-1 flex flex-col overflow-hidden w-full p-12"
                                    >
                                        <div className="flex items-center justify-between mb-8">
                                            {/* Back Button */}
                                            <button
                                                onClick={() => {
                                                    setSelectedAlgorithm(null);
                                                    setResult(null);
                                                    setError(null);
                                                }}
                                                className="w-fit flex items-center gap-3 group px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                                            >
                                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                                <span className="text-[11px] uppercase font-black tracking-widest text-muted-foreground group-hover:text-foreground">Back to selection</span>
                                            </button>

                                            <div className="flex items-center gap-4">
                                                <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                                                    <Brain className="w-4 h-4 text-primary animate-pulse" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Contextual Reasoning Active</span>
                                                </div>
                                            </div>
                                        </div>

                                        {(() => {
                                            const algo = algorithms.find(a => a.key === selectedAlgorithm);
                                            if (!algo) return null;

                                            return (
                                                <div className="flex-1 flex flex-col min-h-0">
                                                    {/* Side-by-Side Content Layout */}
                                                    <div className="flex-1 flex gap-8 min-h-0">
                                                        {/* Left: Info & Insights (Solid Sidebar Style) */}
                                                        <div className="w-[450px] flex flex-col gap-8 shrink-0 py-4 pr-12 border-r border-black/5 dark:border-white/5">
                                                            <div className="relative z-10">
                                                                <div className="flex items-center gap-6 mb-12">
                                                                    <div className="p-5 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
                                                                        {React.cloneElement(algo.icon as React.ReactElement, { className: 'w-8 h-8' })}
                                                                    </div>
                                                                    <div>
                                                                        <h3 className="text-3xl font-black tracking-tighter leading-none mb-1">{algo.name}</h3>
                                                                        <p className="text-[10px] text-primary font-black uppercase tracking-[0.4em]">{algo.category} PROTOCOL</p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-10">
                                                                    <section>
                                                                        <h4 className="text-[10px] font-black text-black/40 dark:text-white/30 uppercase tracking-[0.3em] mb-3">Operational Purpose</h4>
                                                                        <p className="text-sm text-foreground/70 leading-relaxed font-medium">
                                                                            {algo.simpleInfo}
                                                                        </p>
                                                                    </section>

                                                                    <section>
                                                                        <h4 className="text-[10px] font-black text-emerald-600/50 dark:text-emerald-400/30 uppercase tracking-[0.3em] mb-3">Strategic Value</h4>
                                                                        <p className="text-sm font-bold text-foreground leading-relaxed italic border-l-2 border-emerald-500/50 pl-5 py-1.5">
                                                                            {algo.benefit}
                                                                        </p>
                                                                    </section>

                                                                    <div className="h-px bg-black/5 dark:bg-white/5 my-8" />

                                                                    <section className="p-6 rounded-3xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                                                                        <div className="flex items-center gap-3 mb-4">
                                                                            <div className={`w-2 h-2 rounded-full ${runOnSelection ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                                                                            <h4 className="text-[10px] font-black text-black/50 dark:text-white/50 uppercase tracking-[0.3em]">Processing Scope</h4>
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                {runOnSelection ? <BoxSelect className="w-4 h-4 text-primary" /> : <Globe className="w-4 h-4 text-primary" />}
                                                                                <span className="text-sm font-bold">{runOnSelection ? 'Targeted Segment' : 'Global Network'}</span>
                                                                            </div>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (onChangeScope) {
                                                                                        onChangeScope();
                                                                                    } else {
                                                                                        setSetupPhase(true);
                                                                                        setSelectedAlgorithm(null);
                                                                                    }
                                                                                }}
                                                                                className="text-[10px] font-black text-primary hover:text-primary/70 transition-colors uppercase tracking-widest"
                                                                            >
                                                                                Change
                                                                            </button>
                                                                        </div>
                                                                        {runOnSelection && (
                                                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{effectiveTargetedIds.length} Entities Selected</div>
                                                                                {includeNeighbors && (
                                                                                    <div className="text-[9px] text-primary font-bold uppercase tracking-widest">+ First-Degree Neighbors included</div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </section>
                                                                </div>
                                                            </div>

                                                            {result && (
                                                                <div className="flex-1 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                                                    <div className="h-full p-6 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-transparent to-transparent border border-primary/20 shadow-2xl flex flex-col">
                                                                        <div className="flex items-center gap-3 mb-4">
                                                                            <Sparkles className="w-4 h-4 text-primary" />
                                                                            <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-primary">Intelligence Brief</h3>
                                                                        </div>
                                                                        <div className="flex-1 overflow-y-auto scrollbar-none">
                                                                            <p className="text-sm leading-relaxed font-bold text-foreground/90 italic">
                                                                                {result.insight || "Analysis complete. The engine has successfully mapped the underlying influence and structural pathways of your dataset."}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {!result && !isLoading && (
                                                                <div className="mt-auto pt-10">
                                                                    <button
                                                                        onClick={() => runAlgorithm(algo)}
                                                                        disabled={runOnSelection && selectedNodes.length === 0}
                                                                        className={`group relative w-full flex items-center justify-center gap-3 py-6 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1 active:scale-95 outline-none ${runOnSelection && selectedNodes.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                                                    >
                                                                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                                                        <Zap className="w-5 h-5 fill-current animate-pulse" />
                                                                        {runOnSelection ? `Scan ${selectedNodes.length} Selected` : 'Initialize Global Scan'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Right: Results Display (Integrated Page Style) */}
                                                        <div className="flex-1 flex flex-col min-h-0 py-4 pl-8 relative overflow-hidden">
                                                            {error && (
                                                                <div className="p-6 mb-6 rounded-3xl bg-destructive/10 text-destructive text-sm font-black border border-destructive/20 animate-in shake duration-500">
                                                                    {error}
                                                                </div>
                                                            )}

                                                            {isLoading ? (
                                                                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                                                                    <div className="relative">
                                                                        <div className="w-20 h-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                                                        <Activity className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-sm font-black uppercase tracking-[0.4em] text-primary mb-2">Neural Pattern Discovery</p>
                                                                        <p className="text-[10px] text-muted-foreground font-bold italic">Processing complex structural signals...</p>
                                                                    </div>
                                                                </div>
                                                            ) : result ? (
                                                                <div className="flex-1 flex flex-col min-h-0">
                                                                    <div className="flex items-center justify-between mb-8 px-2">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                                                                                <Network className="w-5 h-5 text-primary" />
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Discovery Stream</h4>
                                                                                <p className="text-[10px] text-muted-foreground font-medium">{result.results?.length || 0} Points of Interest Detected</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Signal Locked</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex-1 grid grid-cols-1 gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 pr-4 pb-8">
                                                                        {result.results?.slice(0, 50).map((item, i) => (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, y: 20 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                                                                key={item.id || i}
                                                                                className="flex items-center justify-between p-6 rounded-[2.5rem] bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all group/item shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                                                                            >
                                                                                <div className="flex items-center gap-5 min-w-0 flex-1 mr-6">
                                                                                    <div className="p-4 rounded-2xl bg-white/5 text-muted-foreground group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-all duration-500 shadow-inner">
                                                                                        {item.type?.toLowerCase().includes('person') || item.type?.toLowerCase().includes('user') ? (
                                                                                            <Users className="w-5 h-5" />
                                                                                        ) : item.type?.toLowerCase().includes('org') || item.type?.toLowerCase().includes('group') ? (
                                                                                            <Globe className="w-5 h-5" />
                                                                                        ) : (
                                                                                            <Target className="w-5 h-5" />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <div className="font-black text-base tracking-tight truncate group-hover/item:text-primary transition-colors uppercase leading-none mb-1.5">{item.name}</div>
                                                                                        {item.type && (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover/item:bg-primary" />
                                                                                                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black group-hover/item:text-primary/60 transition-colors">{item.type}</div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                {item.score !== undefined && (
                                                                                    <div className="flex flex-col items-end shrink-0">
                                                                                        <span className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] mb-1.5">Signal Strength</span>
                                                                                        <div className="px-6 py-2.5 rounded-2xl bg-primary/10 text-sm font-mono text-primary font-black border border-primary/20 shadow-inner group-hover/item:scale-110 group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-all duration-500">
                                                                                            {item.score.toFixed(4)}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </motion.div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                                                                    <div className="relative mb-10">
                                                                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                                                                        <div className="relative w-32 h-32 bg-black/5 dark:bg-white/5 rounded-[3.5rem] flex items-center justify-center border border-black/5 dark:border-white/5 shadow-2xl">
                                                                            <Target className="w-16 h-16 text-muted-foreground/20 animate-bounce" />
                                                                        </div>
                                                                    </div>
                                                                    <h4 className="text-3xl font-black text-foreground/40 uppercase tracking-tighter mb-4 leading-none">Awaiting Signal Sync</h4>
                                                                    <p className="text-sm text-muted-foreground/60 font-bold max-w-sm italic leading-relaxed">
                                                                        Target the current graph context to begin mapping neural dependencies and influence pathways.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
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
