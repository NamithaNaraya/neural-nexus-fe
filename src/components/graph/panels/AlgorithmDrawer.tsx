/**
 * Algorithm Drawer
 * 
 * Simplified analytics panel.
 * Uses existing graph filters for scope.
 * Pastel green theme with clean result summaries.
 */
'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Activity,
    Network,
    Share2,
    Target,
    Zap,
    TrendingUp,
    Layers,
    Search,
    BarChart3,
    PieChart,
    GitBranch,
    Lightbulb,
    ChevronRight,
    Play,
    Sparkles,
    Users,
    ArrowLeftRight,
    CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useGraphStore } from '@/store/graphStore';

// ─── Types ──────────────────────────────────────────────────

interface AlgorithmResultItem {
    id?: string;
    name?: string;
    type?: string;
    score?: number;
    hub_score?: number;
    auth_score?: number;
    community?: number;
    community_id?: number | string;
    source_name?: string;
    target_name?: string;
    similarity?: number;
    source_type?: string;
    [key: string]: any;
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
    runOnSelection?: boolean;
    initialSetupPhase?: boolean;
    includeNeighbors?: boolean;
    onChangeScope?: () => void;
}

type AlgorithmCategory = 'centrality' | 'community' | 'prediction' | 'decomposition' | 'pathfinding' | 'topology';

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

// ─── API Helper ─────────────────────────────────────────────

async function fetchAlgorithm(endpoint: string, folderId?: string, nodeIds?: string[], extraParams?: Record<string, any>): Promise<AlgorithmResult> {
    const params: Record<string, any> = { ...extraParams };
    if (folderId) params.folder_id = folderId;
    if (nodeIds && nodeIds.length > 0) params.node_ids = nodeIds;
    return api.get<AlgorithmResult>(endpoint, params);
}

// ─── Algorithm Definitions ──────────────────────────────────

const algorithms: AlgorithmConfig[] = [
    {
        key: 'pagerank', name: 'PageRank', description: 'Most influential nodes',
        icon: <TrendingUp className="w-4 h-4" />, category: 'centrality',
        endpoint: '/analytics/centrality/pagerank',
        simpleInfo: 'Finds the most important nodes based on how many quality connections they have.',
        benefit: 'Reveals the key players and authority hubs in your data.',
    },
    {
        key: 'betweenness', name: 'Betweenness', description: 'Bridge & connector nodes',
        icon: <Share2 className="w-4 h-4" />, category: 'centrality',
        endpoint: '/analytics/centrality/betweenness',
        simpleInfo: 'Finds nodes that act as bridges connecting different groups.',
        benefit: 'Identifies bottleneck entities that control information flow.',
    },
    {
        key: 'closeness', name: 'Closeness', description: 'Centrally located nodes',
        icon: <Target className="w-4 h-4" />, category: 'centrality',
        endpoint: '/analytics/centrality/closeness',
        simpleInfo: 'Finds nodes that are closest to all other nodes in the network.',
        benefit: 'Shows which entities can reach everything most efficiently.',
    },
    {
        key: 'louvain', name: 'Louvain', description: 'Detect communities',
        icon: <Network className="w-4 h-4" />, category: 'community',
        endpoint: '/analytics/community/louvain',
        simpleInfo: 'Groups nodes into communities or clusters based on dense connections.',
        benefit: 'Shows natural groupings and hidden structure in your data.',
    },
    {
        key: 'leiden', name: 'Leiden', description: 'Precise communities',
        icon: <Layers className="w-4 h-4" />, category: 'community',
        endpoint: '/analytics/community/leiden',
        simpleInfo: 'An improved community detection that finds very precise groups.',
        benefit: 'Gives you the most accurate clustering of your data.',
    },
    {
        key: 'node-similarity', name: 'Similarity', description: 'Find similar pairs',
        icon: <Search className="w-4 h-4" />, category: 'prediction',
        endpoint: '/analytics/similarity/nodes',
        simpleInfo: 'Compares nodes to find those with similar connection patterns.',
        benefit: 'Great for finding duplicates or related entities.',
    },
    {
        key: 'link-prediction', name: 'Common Neighbors', description: 'Basic link prediction',
        icon: <GitBranch className="w-4 h-4" />, category: 'prediction',
        endpoint: '/analytics/link-prediction?method=common_neighbors',
        simpleInfo: 'Predicts connections based on the number of shared neighbors.',
        benefit: 'Best for finding logical connections between related entities.',
    },
    {
        key: 'adamic-adar', name: 'Adamic Adar', description: 'Advanced prediction',
        icon: <Sparkles className="w-4 h-4" />, category: 'prediction',
        endpoint: '/analytics/link-prediction?method=adamic_adar',
        simpleInfo: 'A weighted predictor that prioritizes rare shared connections.',
        benefit: 'Highlights unique, non-obvious relationships.',
    },
    {
        key: 'resource-allocation', name: 'Resource Distribution', description: 'Flow-based prediction',
        icon: <ArrowLeftRight className="w-4 h-4" />, category: 'prediction',
        endpoint: '/analytics/link-prediction?method=resource_allocation',
        simpleInfo: 'Predicts links by simulating how information "flows" between nodes.',
        benefit: 'Excellent for finding high-probability hidden links.',
    },
    {
        key: 'hits', name: 'HITS', description: 'Hubs & Authorities',
        icon: <Users className="w-4 h-4" />, category: 'centrality',
        endpoint: '/analytics/centrality/hits',
        simpleInfo: 'Identifies authority sources and hub aggregators of information.',
        benefit: 'Great for finding the most expert/reliable sources in data.',
    },
    {
        key: 'wcc', name: 'Connected Islands', description: 'Find isolated groups',
        icon: <Layers className="w-4 h-4" />, category: 'community',
        endpoint: '/analytics/community/wcc',
        simpleInfo: 'Finds groups of nodes that are completely disconnected from the rest.',
        benefit: 'Helps identify silos or fragmented parts of your knowledge graph.',
    },
    {
        key: 'k-core', name: 'Core Analysis', description: 'Find the graph center',
        icon: <Target className="w-4 h-4" />, category: 'decomposition',
        endpoint: '/analytics/community/kcore',
        simpleInfo: 'Finds the "inner sanctum" of your graph where everything is densly connected.',
        benefit: 'Identifies the most robust and stable heart of your data.',
    },
    {
        key: 'shortest-path', name: 'Shortest Path', description: 'Find Dijkstra path',
        icon: <Share2 className="w-4 h-4" />, category: 'pathfinding',
        endpoint: '/analytics/path/shortest',
        simpleInfo: 'Finds the most efficient route between two specific nodes.',
        benefit: 'Crucial for logic-chain analysis and connection deep-dives.',
    },
    {
        key: 'articlerank', name: 'ArticleRank', description: 'Diverse influence',
        icon: <BarChart3 className="w-4 h-4" />, category: 'centrality',
        endpoint: '/analytics/centrality/articlerank',
        simpleInfo: 'A variant of PageRank that handles heterogenous graphs better.',
        benefit: 'Great for ranking entities with varying connection types.',
    },
    {
        key: 'bfs', name: 'BFS Traversal', description: 'Breadth-first search',
        icon: <Zap className="w-4 h-4" />, category: 'pathfinding',
        endpoint: '/analytics/path/traversal?method=bfs',
        simpleInfo: 'Explores nodes layer by layer from a starting point.',
        benefit: 'Finds the closest "neighbors" within a specific distance.',
    },
    {
        key: 'dfs', name: 'DFS Traversal', description: 'Depth-first search',
        icon: <Activity className="w-4 h-4" />, category: 'pathfinding',
        endpoint: '/analytics/path/traversal?method=dfs',
        simpleInfo: 'Follows a path as far as possible before backtracking.',
        benefit: 'Useful for exploring deep hierarchies or long sequences.',
    },
    {
        key: 'random-walk', name: 'Random Walk', description: 'Simulated exploration',
        icon: <Play className="w-4 h-4" />, category: 'pathfinding',
        endpoint: '/analytics/path/random-walk',
        simpleInfo: 'Simulates a user "wandering" through the graph randomly.',
        benefit: 'Uncovers non-obvious paths and associative links.',
    },
    {
        key: 'topological-sort', name: 'Logical Sequence', description: 'Topo-Sort (DAG)',
        icon: <ChevronRight className="w-4 h-4" />, category: 'topology',
        endpoint: '/analytics/topology/topological-sort',
        simpleInfo: 'Orders nodes in a logical linear sequence (for DAGs).',
        benefit: 'Perfect for understanding process flows or timelines.',
    },
    {
        key: 'triangles', name: 'Triangle Count', description: 'Local density',
        icon: <Activity className="w-4 h-4" />, category: 'community',
        endpoint: '/analytics/community/triangles',
        simpleInfo: 'Counts local triangles to measure how tight-knit groups are.',
        benefit: 'Reveals which parts of the graph have the strongest collaboration.',
    },
];

const CATEGORIES: { key: AlgorithmCategory; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'centrality', label: 'Centrality', icon: <TrendingUp className="w-4 h-4" />, color: '#4ade80' },
    { key: 'community', label: 'Community', icon: <Network className="w-4 h-4" />, color: '#34d399' },
    { key: 'prediction', label: 'Prediction', icon: <Lightbulb className="w-4 h-4" />, color: '#6ee7b7' },
    { key: 'decomposition', label: 'Decomposition', icon: <Layers className="w-4 h-4" />, color: '#10b981' },
    { key: 'pathfinding', label: 'Pathfinding', icon: <Zap className="w-4 h-4" />, color: '#059669' },
    { key: 'topology', label: 'Topology', icon: <Network className="w-4 h-4" />, color: '#047857' },
];

function buildSummary(algo: AlgorithmConfig, result: AlgorithmResult, totalNodes: number): string {
    const resultCount = result.results?.length || 0;
    const top = result.results?.[0];

    switch (algo.category) {
        case 'centrality':
            if (algo.key === 'hits' && top) {
                const topHub = result.results?.reduce((a, b) => (a.hub_score || 0) > (b.hub_score || 0) ? a : b);
                return `Across all ${totalNodes} entities in the graph, HITS analysis identified "${top.name}" as the top authority (score: ${top.auth_score?.toFixed(4) || 'N/A'}), meaning it is the most referenced and trusted source. ${topHub?.name !== top.name ? `Meanwhile, "${topHub?.name}" emerged as the primary hub, actively linking to and aggregating many other entities.` : 'It also acts as a leading hub, both receiving and distributing information.'} ${result.insight || ''}`;
            }
            if (top) {
                const trait = algo.key === 'pagerank' || algo.key === 'articlerank' ? 'influential' : algo.key === 'betweenness' ? 'critical bridge' : 'centrally located';
                const second = result.results?.[1];
                let summary = `After analyzing all ${totalNodes} entities in the graph, "${top.name}" (${top.type || 'Entity'}) emerged as the most ${trait} node with a score of ${top.score?.toFixed(4) || 'N/A'}.`;
                if (second) {
                    summary += ` It is followed closely by "${second.name}" (score: ${second.score?.toFixed(4)}). The top ${resultCount} results are shown below, ranked by significance.`;
                }
                if (result.insight) summary += ` ${result.insight}`;
                return summary;
            }
            return result.insight || `Analysis complete across ${totalNodes} entities. ${resultCount} results ranked.`;

        case 'community': {
            const communities = new Set(result.results?.map(r => r.community ?? r.community_id ?? r.score));
            const commSizes = Array.from(communities).map(c =>
                result.results?.filter(r => (r.community ?? r.community_id ?? r.score) === c).length || 0
            );
            const largest = Math.max(...commSizes, 0);
            const smallest = Math.min(...commSizes, 0);
            let summary = `Analysis of ${totalNodes} entities revealed ${communities.size} distinct communities.`;
            if (communities.size > 1) {
                summary += ` The largest community contains ${largest} members, while the smallest has ${smallest}. Entities within the same community share significantly denser connections with each other than with the rest of the graph.`;
            } else if (communities.size === 1) {
                summary += ` All analyzed entities belong to a single, tightly-knit cluster, indicating a highly cohesive dataset.`;
            }
            if (result.insight) summary += ` ${result.insight}`;
            return summary;
        }

        case 'prediction':
            if (algo.key === 'node-similarity' && top) {
                return `Compared all ${totalNodes} entities and found ${resultCount} significantly similar pairs. The strongest match is "${top.source_name || top.name}" ↔ "${top.target_name}" with ${((top.score || top.similarity || 0) * 100).toFixed(1)}% Jaccard similarity, meaning they share nearly identical connection patterns. ${result.insight || ''}`;
            }
            if (['link-prediction', 'adamic-adar', 'resource-allocation'].includes(algo.key)) {
                return `Scanned ${totalNodes} entities for potential hidden connections and predicted ${resultCount} candidate links. ${top ? `The strongest prediction is "${top.source_name}" ↔ "${top.target_name}" (score: ${top.score?.toFixed(4) || 'N/A'}), suggesting these entities are very likely to be related but not yet connected.` : ''} ${result.insight || ''}`;
            }
            return result.insight || `${resultCount} results found across ${totalNodes} entities.`;

        case 'decomposition':
            if (top && result.results) {
                const maxCore = Math.max(...result.results.map(r => r.score || 0));
                return `K-Core decomposition of ${totalNodes} entities identified ${resultCount} nodes in the stable core (k ≥ ${(result.parameters as any)?.k || 3}). The densest core level reached is ${maxCore}, occupied by the most interconnected entities. ${result.insight || ''}`;
            }
            return result.insight || `Decomposition complete. Grouped ${resultCount} of ${totalNodes} entities into structural layers.`;

        case 'pathfinding':
            if (algo.key === 'shortest-path' && result.results?.length > 0) {
                const source = result.results[0].name;
                const target = result.results[result.results.length - 1].name;
                return `Successfully traced the shortest route from "${source}" to "${target}" through ${resultCount} intermediate entities, with a total traversal cost of ${(result as any).total_cost?.toFixed(2) || 'N/A'}. Each step represents the most efficient hop between related concepts.`;
            }
            return result.insight || `Exploration complete. Traversed ${resultCount} entities out of the ${totalNodes} in the graph.`;

        case 'topology':
            return result.insight || `Topological ordering complete. Arranged ${resultCount} of ${totalNodes} entities into a logical sequence based on their directional dependencies.`;

        default:
            return result.insight || `Processed ${resultCount} results across ${totalNodes} entities.`;
    }
}

// ─── Main Component ─────────────────────────────────────────

export function AlgorithmDrawer({
    isOpen,
    onClose,
    folderId,
}: AlgorithmDrawerProps) {
    const { filteredNodes, filteredLinks, nodes, links, filters, selectedNodes } = useGraphStore();

    // State
    const [scopeMode, setScopeMode] = useState<'filtered' | 'selected'>('filtered');
    const [expandedCategory, setExpandedCategory] = useState<AlgorithmCategory | null>(null);
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmConfig | null>(null);
    const [result, setResult] = useState<AlgorithmResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Derive count based on scope mode
    const visibleNodes = React.useMemo(() => {
        if (scopeMode === 'selected' && selectedNodes.length > 0) {
            return nodes.filter(n => selectedNodes.includes(n.id));
        }
        return filteredNodes();
    }, [filteredNodes, nodes, filters, scopeMode, selectedNodes]);

    const visibleLinks = React.useMemo(() => {
        if (scopeMode === 'selected' && selectedNodes.length > 0) {
            const selectedSet = new Set(selectedNodes);
            return links.filter(l => {
                const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
                const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
                return selectedSet.has(s) && selectedSet.has(t);
            });
        }
        return filteredLinks();
    }, [filteredLinks, links, filters, scopeMode, selectedNodes]);

    const nodeCount = visibleNodes.length;
    const linkCount = visibleLinks.length;
    const nodeIds = React.useMemo(() => visibleNodes.map(n => n.id), [visibleNodes]);

    // Run algorithm on target nodes
    const runAlgorithm = useCallback(async () => {
        if (!selectedAlgorithm) return;

        // Pathfinding validation
        if (selectedAlgorithm.category === 'pathfinding' && selectedNodes.length === 0) {
            setError('Please select a starting node in the graph first.');
            return;
        }

        if (selectedAlgorithm.key === 'shortest-path' && selectedNodes.length < 2) {
            setError('Shortest Path requires exactly 2 selected nodes (Source and Target).');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const ids = nodeIds.length > 0 && nodeIds.length < nodes.length ? nodeIds : undefined;
            const extra: Record<string, any> = {};

            if (selectedAlgorithm.category === 'pathfinding' || selectedAlgorithm.key === 'random-walk') {
                extra.source_id = selectedNodes[0];
                if (selectedAlgorithm.key === 'shortest-path') {
                    extra.target_id = selectedNodes[1];
                }
            }

            const data = await fetchAlgorithm(selectedAlgorithm.endpoint, folderId, ids, extra);
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Algorithm failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedAlgorithm, folderId, nodeIds, nodes.length, selectedNodes]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[190]"
                onClick={onClose}
            />

            {/* Drawer */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="fixed inset-4 md:inset-8 lg:left-[8%] lg:right-[8%] lg:top-[6%] lg:bottom-[6%] z-[201] flex flex-col overflow-hidden rounded-3xl shadow-2xl border"
                style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #ffffff 100%)',
                    borderColor: '#bbf7d0',
                }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-8 py-5 border-b shrink-0"
                    style={{ borderColor: '#d1fae5', background: 'rgba(240, 253, 244, 0.8)' }}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl" style={{ background: '#dcfce7' }}>
                            <Zap className="w-5 h-5" style={{ color: '#16a34a' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 tracking-tight">Graph Analytics</h2>
                            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#16a34a' }}>
                                Neo4j GDS Algorithms
                            </p>
                        </div>
                    </div>

                    {/* Stats Pill & Scope Toggle */}
                    <div className="flex items-center gap-4">
                        {/* Scope Toggle */}
                        <div className="flex items-center gap-1 bg-green-100/40 p-1 rounded-xl border border-green-200/50">
                            <button
                                onClick={() => {
                                    setScopeMode('filtered');
                                    setResult(null);
                                }}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${scopeMode === 'filtered' ? 'bg-white text-green-700 shadow-sm' : 'text-green-600/60 hover:text-green-700'
                                    }`}
                            >
                                Filtered
                            </button>
                            <button
                                onClick={() => {
                                    setScopeMode('selected');
                                    setResult(null);
                                }}
                                disabled={selectedNodes.length === 0}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${scopeMode === 'selected' ? 'bg-white text-green-700 shadow-sm' : 'text-green-600/60 hover:text-green-700'
                                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                                Selected ({selectedNodes.length})
                            </button>
                        </div>

                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold"
                            style={{ background: '#dcfce7', color: '#166534' }}
                        >
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
                                {nodeCount} nodes
                            </span>
                            <span style={{ color: '#bbf7d0' }}>|</span>
                            <span className="flex items-center gap-1.5">
                                <ArrowLeftRight className="w-3 h-3" />
                                {linkCount} links
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-red-50 transition-colors text-gray-400 hover:text-red-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Body: Sidebar + Main ── */}
                <div className="flex-1 flex overflow-hidden">
                    {/* ── Sidebar: Categories + Algorithms ── */}
                    <div className="w-64 flex flex-col border-r overflow-y-auto"
                        style={{ borderColor: '#d1fae5', background: 'rgba(240, 253, 244, 0.4)' }}
                    >
                        <div className="p-5 space-y-1">
                            <span className="block text-[9px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: '#6b7280' }}>
                                Algorithm Categories
                            </span>

                            {CATEGORIES.map(cat => {
                                const isExpanded = expandedCategory === cat.key;
                                const catAlgos = algorithms.filter(a => a.category === cat.key);

                                return (
                                    <div key={cat.key}>
                                        {/* Category button */}
                                        <button
                                            onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                                            style={{
                                                background: isExpanded ? '#dcfce7' : 'transparent',
                                                color: isExpanded ? '#166534' : '#6b7280',
                                            }}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {React.cloneElement(cat.icon as React.ReactElement, { className: 'w-4 h-4' })}
                                                {cat.label}
                                            </div>
                                            <ChevronRight
                                                className="w-3 h-3 transition-transform"
                                                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                                            />
                                        </button>

                                        {/* Sub-algorithms */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pl-5 pr-1 py-1 space-y-0.5">
                                                        {catAlgos.map(algo => {
                                                            const isActive = selectedAlgorithm?.key === algo.key;
                                                            return (
                                                                <button
                                                                    key={algo.key}
                                                                    onClick={() => {
                                                                        setSelectedAlgorithm(algo);
                                                                        setResult(null);
                                                                        setError(null);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
                                                                    style={{
                                                                        background: isActive ? '#bbf7d0' : 'transparent',
                                                                        color: isActive ? '#166534' : '#9ca3af',
                                                                    }}
                                                                >
                                                                    <div className="font-bold">{algo.name}</div>
                                                                    <div className="text-[9px] mt-0.5 opacity-70">{algo.description}</div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Info Footer */}
                        <div className="mt-auto p-5 border-t" style={{ borderColor: '#d1fae5' }}>
                            <div className="p-3 rounded-xl text-[10px] leading-relaxed" style={{ background: '#f0fdf4', color: '#6b7280' }}>
                                <strong className="block mb-1" style={{ color: '#166534' }}>💡 Tip</strong>
                                Use the graph filters (node types, relationships) to narrow your analysis scope before running algorithms.
                            </div>
                        </div>
                    </div>

                    {/* ── Main Content Area ── */}
                    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fefffe' }}>
                        {!selectedAlgorithm ? (
                            /* Empty state */
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                                    style={{ background: '#dcfce7' }}
                                >
                                    <Network className="w-10 h-10" style={{ color: '#86efac' }} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-700 mb-2">Select an Algorithm</h3>
                                <p className="text-sm text-gray-400 max-w-sm">
                                    Pick a category from the sidebar, then choose an algorithm to run on your
                                    <strong className="mx-1" style={{ color: '#16a34a' }}>{nodeCount} {scopeMode} nodes</strong>
                                    and
                                    <strong className="mx-1" style={{ color: '#16a34a' }}>{linkCount} relationships</strong>.
                                </p>
                            </div>
                        ) : (
                            /* Algorithm detail + results */
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Algorithm Info Header */}
                                <div className="px-8 py-6 border-b shrink-0" style={{ borderColor: '#d1fae5' }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl" style={{ background: '#dcfce7' }}>
                                                {React.cloneElement(selectedAlgorithm.icon as React.ReactElement, {
                                                    className: 'w-5 h-5',
                                                    style: { color: '#16a34a' },
                                                })}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">{selectedAlgorithm.name}</h3>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                                    {selectedAlgorithm.category} algorithm
                                                </p>
                                            </div>
                                        </div>

                                        {/* Run Button */}
                                        <button
                                            onClick={runAlgorithm}
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
                                            style={{
                                                background: isLoading
                                                    ? '#86efac'
                                                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                                boxShadow: isLoading ? 'none' : '0 4px 14px rgba(34, 197, 94, 0.3)',
                                            }}
                                        >
                                            {isLoading ? (
                                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Play className="w-4 h-4 fill-current" />
                                            )}
                                            {isLoading ? 'Running...' : 'Run Analysis'}
                                        </button>
                                    </div>

                                    {/* Algorithm description */}
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl border" style={{ background: '#f8fffe', borderColor: '#d1fae5', borderLeft: '3px solid #86efac' }}>
                                            <span className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#6b7280' }}>What it does</span>
                                            <p className="text-xs text-gray-700 leading-relaxed">{selectedAlgorithm.simpleInfo}</p>
                                        </div>
                                        <div className="p-4 rounded-xl border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', borderLeft: '3px solid #22c55e' }}>
                                            <span className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#16a34a' }}>Why it helps</span>
                                            <p className="text-xs text-gray-700 leading-relaxed">{selectedAlgorithm.benefit}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Results Area */}
                                <div className="flex-1 overflow-y-auto p-8">
                                    {error && (
                                        <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                                            ⚠️ {error}
                                        </div>
                                    )}

                                    {isLoading ? (
                                        <div className="flex-1 flex flex-col items-center justify-center py-20">
                                            <div className="relative mb-6">
                                                <div className="w-16 h-16 border-4 rounded-full animate-spin"
                                                    style={{ borderColor: '#dcfce7', borderTopColor: '#22c55e' }}
                                                />
                                                <Activity className="absolute inset-0 m-auto w-6 h-6 animate-pulse" style={{ color: '#22c55e' }} />
                                            </div>
                                            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#22c55e' }}>
                                                Analyzing {nodeCount} {scopeMode} nodes...
                                            </p>
                                        </div>
                                    ) : result ? (
                                        <div className="space-y-6">
                                            {/* Summary Card */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="rounded-2xl border overflow-hidden"
                                                style={{ borderColor: '#86efac', boxShadow: '0 2px 12px rgba(34, 197, 94, 0.08)' }}
                                            >
                                                {/* Accent bar */}
                                                <div style={{ height: 3, background: 'linear-gradient(90deg, #22c55e, #86efac, #bbf7d0)' }} />
                                                <div className="p-5" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f8fffe 100%)' }}>
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg shrink-0" style={{ background: '#dcfce7' }}>
                                                            <Sparkles className="w-4 h-4" style={{ color: '#16a34a' }} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#166534' }}>
                                                                Analysis Summary
                                                            </h4>
                                                            <p className="text-[13px] text-gray-700 leading-[1.7]">
                                                                {buildSummary(selectedAlgorithm, result, nodeCount)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            {/* Results Table */}
                                            {result.results && result.results.length > 0 && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                            Detailed Results ({result.results.length})
                                                        </span>
                                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold"
                                                            style={{ background: '#dcfce7', color: '#166534' }}
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Complete
                                                        </div>
                                                    </div>

                                                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#a7f3d0', boxShadow: '0 1px 6px rgba(16, 185, 129, 0.06)' }}>
                                                        {/* Table Header */}
                                                        <div className="grid grid-cols-12 gap-2 px-5 py-3 text-[9px] font-bold uppercase tracking-wider border-b"
                                                            style={{ background: '#ecfdf5', color: '#374151', borderColor: '#a7f3d0' }}
                                                        >
                                                            <div className="col-span-1">#</div>
                                                            <div className="col-span-5">Name</div>
                                                            <div className="col-span-3">Type</div>
                                                            <div className="col-span-3 text-right">Score</div>
                                                        </div>

                                                        {/* Table Rows */}
                                                        {result.results.slice(0, 50).map((item, i) => {
                                                            const name = item.name || item.source_name || 'Unnamed';
                                                            const secondaryName = item.target_name || null;
                                                            const type = item.type || item.source_type || 'Entity';
                                                            const scoreValue = typeof item.score === 'number' ? item.score : typeof item.similarity === 'number' ? item.similarity : undefined;
                                                            const communityValue = item.community ?? item.community_id;

                                                            return (
                                                                <motion.div
                                                                    key={item.id || `${i}-${name}`}
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    transition={{ delay: i * 0.02 }}
                                                                    className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-t text-xs hover:bg-green-50/60 transition-colors"
                                                                    style={{ borderColor: '#d1fae5', background: i % 2 === 0 ? '#fefffe' : '#f8fdfb' }}
                                                                >
                                                                    <div className="col-span-1 font-bold text-[10px]" style={{ color: '#9ca3af' }}>{i + 1}</div>
                                                                    <div className="col-span-5 font-semibold text-gray-800">
                                                                        {secondaryName ? (
                                                                            <div className="flex items-center gap-2 truncate">
                                                                                <span className="truncate">{name}</span>
                                                                                <ArrowLeftRight className="w-2.5 h-2.5 shrink-0 text-green-400" />
                                                                                <span className="truncate">{secondaryName}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="truncate">{name}</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="col-span-3">
                                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                                                                            style={{ background: '#dcfce7', color: '#166534' }}
                                                                        >
                                                                            {type}
                                                                        </span>
                                                                    </div>
                                                                    <div className="col-span-3 text-right font-mono font-bold text-[11px]" style={{ color: '#16a34a' }}>
                                                                        {scoreValue !== undefined ? scoreValue.toFixed(4) :
                                                                            item.hub_score !== undefined ? (
                                                                                <div className="flex flex-col text-[9px] leading-tight">
                                                                                    <span>A: {item.auth_score?.toFixed(3)}</span>
                                                                                    <span className="text-gray-400">H: {item.hub_score?.toFixed(3)}</span>
                                                                                </div>
                                                                            ) :
                                                                                communityValue !== undefined ? `Group ${communityValue}` : '—'}
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* No results yet */
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <Search className="w-12 h-12 mb-4" style={{ color: '#d1fae5' }} />
                                            <p className="text-sm text-gray-400">
                                                Click <strong style={{ color: '#22c55e' }}>Run Analysis</strong> to start
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
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
