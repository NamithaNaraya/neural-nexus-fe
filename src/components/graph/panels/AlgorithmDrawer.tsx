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
    ChevronRight,
    Check,
    ArrowRight,
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
    initialSetupPhase = false, // Default to false now as we unify
    includeNeighbors: externalIncludeNeighbors = false,
}: AlgorithmDrawerProps) {
    const { nodes, nodeTypes, selectedNodes, setSelectedNodes, links } = useGraphStore();

    // UI state
    const [activeTab, setActiveTab] = useState<'scope' | 'types' | 'nodes' | 'algorithms'>('algorithms');
    const [activeCategory, setActiveCategory] = useState<AlgorithmCategory>('centrality');
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | null>(null);
    const [result, setResult] = useState<AlgorithmResult | null>(null);

    // Selection state (internal to drawer until "Applied")
    const [selectedScope, setSelectedScope] = useState<'global' | 'targeted'>(externalRunOnSelection ? 'targeted' : 'global');
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(selectedNodes);
    const [nodeSearchQuery, setNodeSearchQuery] = useState('');
    const [includeNeighbors, setIncludeNeighbors] = useState(externalIncludeNeighbors);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync from store when opened or store changes
    React.useEffect(() => {
        if (isOpen) {
            setInternalSelectedIds(selectedNodes);
            if (selectedNodes.length > 0) setSelectedScope('targeted');
        }
    }, [isOpen, selectedNodes]);

    // Derived Data for entity selection
    const filteredNodes = React.useMemo(() => {
        if (!nodeSearchQuery) return nodes.slice(0, 50);
        const q = nodeSearchQuery.toLowerCase();
        return nodes.filter(n =>
            n.name.toLowerCase().includes(q) ||
            n.type.toLowerCase().includes(q)
        ).slice(0, 100);
    }, [nodes, nodeSearchQuery]);

    // Calculate effective targeted nodes for algorithm execution
    const effectiveTargetedIds = React.useMemo(() => {
        if (selectedScope === 'global' && selectedTypes.length === 0 && internalSelectedIds.length === 0) return [];

        // Base selection from types + individual nodes
        const typeNodeIds = nodes
            .filter(n => selectedTypes.includes(n.type))
            .map(n => n.id);

        const baseSet = new Set([...typeNodeIds, ...internalSelectedIds]);

        if (!includeNeighbors) return Array.from(baseSet);

        const neighborIds = new Set(baseSet);
        links.forEach(link => {
            const s = typeof link.source === 'string' ? link.source : (link.source as any).id;
            const t = typeof link.target === 'string' ? link.target : (link.target as any).id;

            if (baseSet.has(s)) neighborIds.add(t);
            if (baseSet.has(t)) neighborIds.add(s);
        });
        return Array.from(neighborIds);
    }, [selectedScope, selectedTypes, internalSelectedIds, includeNeighbors, nodes, links]);

    const runAlgorithm = useCallback(async (config: AlgorithmConfig) => {
        setSelectedAlgorithm(config.key);
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const nodeIds = effectiveTargetedIds.length > 0 ? effectiveTargetedIds : undefined;
            const data = await fetchAlgorithm(config.endpoint, folderId, nodeIds);
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Algorithm failed');
        } finally {
            setIsLoading(false);
        }
    }, [folderId, effectiveTargetedIds]);

    const handleApplySelection = () => {
        setSelectedNodes(effectiveTargetedIds);
        setActiveTab('algorithms');
    };

    const navItems = [
        { id: 'scope', label: 'Domain', icon: <Globe className="w-4 h-4" /> },
        { id: 'types', label: 'Categories', icon: <Layers className="w-4 h-4" /> },
        { id: 'nodes', label: 'Entities', icon: <Target className="w-4 h-4" /> },
        { id: 'algorithms', label: 'Processors', icon: <Zap className="w-4 h-4" /> },
    ];

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/40 dark:bg-black/40 backdrop-blur-xl z-[190]"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-4 md:inset-8 lg:left-[10%] lg:right-[10%] lg:top-[10%] lg:bottom-[10%] bg-white/95 dark:bg-slate-950/90 backdrop-blur-3xl z-[201] flex flex-col overflow-hidden text-foreground rounded-[2.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.4)] border border-white/10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-10 py-6 border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight font-heading">Neural Analytics Engine</h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Automated Intelligence Pipeline • Ready</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Active Scope</span>
                                    <span className="text-xs font-bold text-primary">
                                        {effectiveTargetedIds.length > 0 ? `${effectiveTargetedIds.length} Nodes Target` : 'Global Network Scan'}
                                    </span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground border border-black/5 dark:border-white/10 shadow-sm"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Unified Layout */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Unified Sidebar */}
                            <div className="w-72 flex flex-col border-r border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
                                {/* Navigation Tabs */}
                                <div className="p-6 space-y-1">
                                    <span className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-4 px-1">Pipeline Configuration</span>
                                    {navItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setActiveTab(item.id as any);
                                                if (item.id === 'algorithms' && selectedAlgorithm) {
                                                    // Keep current algorithm
                                                }
                                            }}
                                            className={`
                                                w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all
                                                ${activeTab === item.id
                                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                {React.cloneElement(item.icon as React.ReactElement, { className: 'w-4 h-4' })}
                                                {item.label}
                                            </div>
                                            <ChevronRight className={`w-3 h-3 opacity-30 ${activeTab === item.id ? 'opacity-100' : ''}`} />
                                        </button>
                                    ))}
                                </div>

                                {/* Contextual Sidebar Content */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 border-t border-black/5 dark:border-white/5">
                                    {activeTab === 'algorithms' ? (
                                        <>
                                            <span className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Processing Modules</span>
                                            {Object.entries(categoryLabels).map(([key, { label, icon }]) => (
                                                <div key={key} className="space-y-1">
                                                    <button
                                                        onClick={() => setActiveCategory(key as AlgorithmCategory)}
                                                        className={`
                                                            w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold transition-all
                                                            ${activeCategory === key ? 'text-primary bg-primary/5' : 'text-muted-foreground/60 hover:text-foreground'}
                                                        `}
                                                    >
                                                        {React.cloneElement(icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                                                        {label}
                                                    </button>

                                                    {activeCategory === key && (
                                                        <div className="pl-6 space-y-1 py-1">
                                                            {algorithms.filter(a => a.category === key).map(algo => (
                                                                <button
                                                                    key={algo.key}
                                                                    onClick={() => {
                                                                        setSelectedAlgorithm(algo.key);
                                                                        setResult(null);
                                                                        setError(null);
                                                                    }}
                                                                    className={`
                                                                        w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all
                                                                        ${selectedAlgorithm === algo.key ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}
                                                                    `}
                                                                >
                                                                    {algo.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="h-full flex flex-col justify-end pb-4">
                                            <p className="text-[10px] text-muted-foreground italic leading-relaxed px-1">
                                                Adjust your selection to focus the engine on specific network segments.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Main Display Area */}
                            <div className="flex-1 flex flex-col bg-white/50 dark:bg-slate-900/30 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'scope' && (
                                        <motion.div
                                            key="scope-view"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="p-12 h-full flex flex-col max-w-3xl"
                                        >
                                            <div className="mb-12">
                                                <h3 className="text-3xl font-bold mb-3 tracking-tight">Analysis Domain</h3>
                                                <p className="text-muted-foreground font-medium italic">Define how broadly the engine should traverse connections.</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <button
                                                    onClick={() => setSelectedScope('global')}
                                                    className={`
                                                        p-8 rounded-[2.5rem] border text-left transition-all relative group
                                                        ${selectedScope === 'global'
                                                            ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                                                            : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10'}
                                                    `}
                                                >
                                                    <div className={`mb-6 p-4 rounded-2xl w-fit ${selectedScope === 'global' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
                                                        <Globe className="w-8 h-8" />
                                                    </div>
                                                    <h4 className="text-xl font-bold mb-2">Global Network Scan</h4>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">Map intelligence across the entire active dataset. Best for cross-context insights.</p>
                                                    {selectedScope === 'global' && <Check className="absolute top-6 right-6 w-5 h-5 text-primary" />}
                                                </button>

                                                <button
                                                    onClick={() => setSelectedScope('targeted')}
                                                    className={`
                                                        p-8 rounded-[2.5rem] border text-left transition-all relative group
                                                        ${selectedScope === 'targeted'
                                                            ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                                                            : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10'}
                                                    `}
                                                >
                                                    <div className={`mb-6 p-4 rounded-2xl w-fit ${selectedScope === 'targeted' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
                                                        <BoxSelect className="w-8 h-8" />
                                                    </div>
                                                    <h4 className="text-xl font-bold mb-2">Targeted Intersection</h4>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">Focus discovery on specific entity types or manually selected data points.</p>
                                                    {selectedScope === 'targeted' && <Check className="absolute top-6 right-6 w-5 h-5 text-primary" />}
                                                </button>
                                            </div>

                                            <div className="mt-12 p-8 rounded-[2rem] bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                                            <Network className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-sm">Neighborhood Expansion</h5>
                                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Include immediate connections</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setIncludeNeighbors(!includeNeighbors)}
                                                        className={`
                                                            w-12 h-6 rounded-full transition-all relative flex items-center px-1
                                                            ${includeNeighbors ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}
                                                        `}
                                                    >
                                                        <motion.div
                                                            animate={{ x: includeNeighbors ? 24 : 0 }}
                                                            className="w-4 h-4 rounded-full bg-white shadow-md"
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === 'types' && (
                                        <motion.div
                                            key="types-view"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="p-12 h-full flex flex-col max-w-3xl"
                                        >
                                            <div className="mb-10 flex items-end justify-between">
                                                <div>
                                                    <h3 className="text-3xl font-bold mb-2 tracking-tight">Category Filters</h3>
                                                    <p className="text-sm text-muted-foreground italic">Select node classes to isolate for processing.</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedTypes([]);
                                                        setSelectedScope('global');
                                                    }}
                                                    className="text-[10px] font-extrabold text-primary hover:text-primary/70 uppercase tracking-[0.2em] pb-1 transition-colors"
                                                >
                                                    Clear All
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                                                {nodeTypes.map(type => {
                                                    const isSelected = selectedTypes.includes(type);
                                                    return (
                                                        <button
                                                            key={type}
                                                            onClick={() => {
                                                                setSelectedTypes(prev =>
                                                                    prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                                                                );
                                                                setSelectedScope('targeted');
                                                            }}
                                                            className={`
                                                                flex items-center justify-between px-5 py-4 rounded-[1.5rem] border transition-all text-sm font-bold
                                                                ${isSelected
                                                                    ? 'bg-primary/5 border-primary/30 text-primary ring-1 ring-primary/20'
                                                                    : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                                                                }
                                                            `}
                                                        >
                                                            {type}
                                                            {isSelected && <Check className="w-4 h-4" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === 'nodes' && (
                                        <motion.div
                                            key="nodes-view"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="p-12 h-full flex flex-col max-w-3xl"
                                        >
                                            <div className="mb-8">
                                                <h3 className="text-3xl font-bold mb-2 tracking-tight">Specific Entities</h3>
                                                <p className="text-sm text-muted-foreground italic mb-6">Individually pick data points for granular interrogation.</p>

                                                <div className="relative group">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={nodeSearchQuery}
                                                        onChange={(e) => setNodeSearchQuery(e.target.value)}
                                                        placeholder="Search the neural network for specific entities..."
                                                        className="w-full pl-12 pr-6 py-4 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-transparent transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-y-auto pr-3 space-y-2 custom-scrollbar">
                                                {filteredNodes.map(node => {
                                                    const isSelected = internalSelectedIds.includes(node.id);
                                                    return (
                                                        <button
                                                            key={node.id}
                                                            onClick={() => {
                                                                setInternalSelectedIds(prev =>
                                                                    prev.includes(node.id) ? prev.filter(i => i !== node.id) : [...prev, node.id]
                                                                );
                                                                setSelectedScope('targeted');
                                                            }}
                                                            className={`
                                                                w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group
                                                                ${isSelected
                                                                    ? 'bg-primary/5 border-primary/30 shadow-sm'
                                                                    : 'bg-transparent border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                                                                }
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-4 min-w-0 pr-4">
                                                                <div className={`p-2 rounded-xl text-muted-foreground group-hover:text-primary transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-black/5 dark:bg-white/5'}`}>
                                                                    <Target className="w-4 h-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className={`text-sm font-bold leading-tight truncate ${isSelected ? 'text-primary' : ''}`}>{node.name}</div>
                                                                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{node.type}</div>
                                                                </div>
                                                            </div>
                                                            {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === 'algorithms' && (
                                        <motion.div
                                            key="algorithms-view"
                                            initial={{ opacity: 0, scale: 0.99 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.99 }}
                                            className="h-full flex flex-col"
                                        >
                                            {!selectedAlgorithm ? (
                                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                                    <div className="w-24 h-24 rounded-[2.5rem] bg-black/5 dark:bg-white/5 flex items-center justify-center mb-8 border border-black/5 dark:border-white/5 rotate-12 group-hover:rotate-0 transition-transform">
                                                        <Network className="w-12 h-12 text-muted-foreground/20" />
                                                    </div>
                                                    <h3 className="text-2xl font-bold mb-3 tracking-tight">System Ready for Protocol Selection</h3>
                                                    <p className="text-sm text-muted-foreground max-w-sm font-medium italic">
                                                        The intelligence pipeline is active. Please select a processing module from the left to begin discovery.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex overflow-hidden">
                                                    {/* Algorithm Overview */}
                                                    <div className="w-[440px] flex flex-col border-r border-black/5 dark:border-white/5 p-12 shrink-0">
                                                        {(() => {
                                                            const algo = algorithms.find(a => a.key === selectedAlgorithm);
                                                            if (!algo) return null;
                                                            return (
                                                                <>
                                                                    <div className="flex items-center gap-6 mb-10">
                                                                        <div className="p-5 rounded-3xl bg-primary text-primary-foreground shadow-2xl shadow-primary/30">
                                                                            {React.cloneElement(algo.icon as React.ReactElement, { className: 'w-8 h-8' })}
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-3xl font-extrabold tracking-tighter">{algo.name}</h3>
                                                                            <p className="text-[11px] text-primary font-black uppercase tracking-[0.25em]">{algo.category} PROTOCOL</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-10 flex-1">
                                                                        <section>
                                                                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Mechanism Overview</h4>
                                                                            <p className="text-[13px] text-foreground/80 leading-relaxed font-medium">
                                                                                {algo.simpleInfo}
                                                                            </p>
                                                                        </section>

                                                                        <section>
                                                                            <h4 className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mb-4">Discovery Benefit</h4>
                                                                            <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-sm">
                                                                                <p className="text-xs font-bold text-foreground/90 leading-relaxed italic">
                                                                                    "{algo.benefit}"
                                                                                </p>
                                                                            </div>
                                                                        </section>

                                                                        {result && (
                                                                            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                                                                                <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-transparent to-transparent border border-primary/20 shadow-xl shadow-primary/5">
                                                                                    <div className="flex items-center gap-3 mb-4">
                                                                                        <Sparkles className="w-5 h-5 text-primary" />
                                                                                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-primary">Intelligence Insight</h3>
                                                                                    </div>
                                                                                    <p className="text-xs leading-relaxed font-bold italic text-foreground/90">
                                                                                        {result.insight || "Pipeline analysis concluded. Structural data successfully re-indexed."}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="pt-8">
                                                                        <button
                                                                            onClick={() => runAlgorithm(algo)}
                                                                            disabled={isLoading || (selectedScope === 'targeted' && effectiveTargetedIds.length === 0)}
                                                                            className={`
                                                                                w-full flex items-center justify-center gap-4 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all
                                                                                ${isLoading
                                                                                    ? 'bg-primary/50 text-white cursor-wait'
                                                                                    : 'bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0'
                                                                                }
                                                                                ${selectedScope === 'targeted' && effectiveTargetedIds.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                                                                            `}
                                                                        >
                                                                            {isLoading ? (
                                                                                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                                                            ) : (
                                                                                <Zap className="w-5 h-5 fill-current" />
                                                                            )}
                                                                            {selectedScope === 'global' ? 'Execute Global Scan' : `Initialize Set Scan `}
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Results Stream */}
                                                    <div className="flex-1 flex flex-col p-12 min-h-0 bg-black/[0.012] dark:bg-white/[0.012]">
                                                        {error && (
                                                            <div className="p-5 mb-8 rounded-2xl bg-destructive/10 text-destructive text-[11px] font-black border border-destructive/20 animate-in shake uppercase tracking-widest">
                                                                System Alert: {error}
                                                            </div>
                                                        )}

                                                        {isLoading ? (
                                                            <div className="flex-1 flex flex-col items-center justify-center">
                                                                <div className="relative mb-8 scale-150">
                                                                    <div className="w-20 h-20 border-[6px] border-primary/10 border-t-primary rounded-full animate-spin" />
                                                                    <Activity className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                                                                </div>
                                                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Deciphering Neural Signals...</p>
                                                            </div>
                                                        ) : result ? (
                                                            <div className="flex-1 flex flex-col min-h-0">
                                                                <div className="flex items-center justify-between mb-8">
                                                                    <div className="flex items-center gap-4">
                                                                        <Network className="w-5 h-5 text-primary" />
                                                                        <span className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                                                                            {result.results?.length || 0} Entities Computed
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
                                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                        <span className="text-[10px] font-black uppercase tracking-[0.15em]">Pattern Locked</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex-1 overflow-y-auto pr-4 space-y-3 custom-scrollbar">
                                                                    {result.results?.slice(0, 50).map((item, i) => (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: 15 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            transition={{ delay: i * 0.04 }}
                                                                            key={item.id || i}
                                                                            className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-primary/40 transition-all group/item shadow-sm hover:shadow-xl hover:shadow-primary/5"
                                                                        >
                                                                            <div className="flex items-center gap-6 min-w-0">
                                                                                <div className="p-3.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] text-muted-foreground group-hover/item:text-primary transition-colors group-hover/item:bg-primary/5">
                                                                                    {item.type?.toLowerCase().includes('person') ? <Users className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <div className="font-extrabold text-[15px] truncate tracking-tight">{item.name}</div>
                                                                                    <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">{item.type || 'Entity'}</div>
                                                                                </div>
                                                                            </div>
                                                                            {item.score !== undefined && (
                                                                                <div className="text-right ml-4">
                                                                                    <div className="text-[9px] text-muted-foreground font-black uppercase mb-1.5 opacity-40">Salience Score</div>
                                                                                    <div className="px-4 py-1.5 rounded-xl bg-primary/5 text-xs font-mono font-black text-primary border border-primary/10 shadow-inner">
                                                                                        {item.score.toFixed(4)}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 grayscale saturate-0 scale-110">
                                                                <Search className="w-16 h-16 mb-6 text-muted-foreground/40" />
                                                                <p className="text-xs font-black uppercase tracking-[0.4em]">Signal Inactive</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Unified Action Bar (Selection only) */}
                        {activeTab !== 'algorithms' && (
                            <div className="px-10 py-6 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none mb-1.5">Entity Coverage</span>
                                        <span className="text-xs font-black">
                                            {selectedScope === 'global' ? 'Entire Active Network' : `${effectiveTargetedIds.length} Targeted Points`}
                                        </span>
                                    </div>
                                    <div className="h-8 w-px bg-black/5 dark:bg-white/5" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none mb-1.5">Expansion</span>
                                        <span className="text-xs font-black">{includeNeighbors ? 'Active (Neighbors Included)' : 'Direct Only'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            setActiveTab('algorithms');
                                            setSelectedAlgorithm(null);
                                        }}
                                        className="px-8 py-3 rounded-xl text-[10px] font-black hover:bg-black/5 dark:hover:bg-white/5 transition-all uppercase tracking-[0.25em]"
                                    >
                                        Back to Modules
                                    </button>
                                    <button
                                        onClick={handleApplySelection}
                                        className="px-10 py-4 rounded-2xl bg-foreground text-background shadow-2xl hover:scale-[1.02] active:scale-100 transition-all font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-4"
                                    >
                                        Lock Scope
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
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
