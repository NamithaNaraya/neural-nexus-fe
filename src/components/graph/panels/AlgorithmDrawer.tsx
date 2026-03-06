/**
 * Algorithm Drawer
 * 
 * Simplified analytics panel.
 * Uses existing graph filters for scope.
 * Pastel green theme with clean result summaries.
 */
'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
    Plus,
    Check,
    MousePointer2,
    CheckCircle2,
    Scale,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useGraphStore } from '@/store/graphStore';
import { WeightConfigPanel } from './WeightConfigPanel';
import { useWeightConfigStore } from '@/store/weightConfigStore';

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
    focusNodeIds?: string[];
    focusLinkIds?: string[];
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
    usesWeights: boolean;
}

// ─── API Helper ─────────────────────────────────────────────

async function fetchAlgorithm(endpoint: string, folderId?: string, nodeIds?: string[], extraParams?: Record<string, any>, weightFormula?: Record<string, any> | null): Promise<AlgorithmResult> {
    const params: Record<string, any> = { ...extraParams };
    if (folderId) params.folder_id = folderId;
    if (nodeIds && nodeIds.length > 0) params.node_ids = nodeIds;
    if (weightFormula) params.weight_formula = JSON.stringify(weightFormula);
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
        usesWeights: true,
    },
    {
        key: 'betweenness', name: 'Betweenness', description: 'Bridge & connector nodes',
        icon: <Share2 className="w-4 h-4" />, category: 'centrality',
        endpoint: '/analytics/centrality/betweenness',
        simpleInfo: 'Finds nodes that act as bridges connecting different groups.',
        benefit: 'Identifies bottleneck entities that control information flow.',
        usesWeights: true,
    },
    {
        key: 'closeness', name: 'Closeness', description: 'Centrally located nodes',
        icon: <Target className="w-4 h-4" />, category: 'centrality',
        endpoint: '/analytics/centrality/closeness',
        simpleInfo: 'Finds nodes that are closest to all other nodes in the network.',
        benefit: 'Shows which entities can reach everything most efficiently.',
        usesWeights: true,
    },
    {
        key: 'degree', name: 'Degree', description: 'Most connected nodes',
        icon: <BarChart3 className="w-4 h-4" />, category: 'centrality',
        endpoint: '/analytics/centrality/degree',
        simpleInfo: 'Counts how many direct connections each node has.',
        benefit: 'Instantly shows the most active and connected entities.',
        usesWeights: true,
    },
    {
        key: 'louvain', name: 'Louvain', description: 'Detect communities',
        icon: <Network className="w-4 h-4" />, category: 'community',
        endpoint: '/analytics/community/louvain',
        simpleInfo: 'Groups nodes into communities or clusters based on dense connections.',
        benefit: 'Shows natural groupings and hidden structure in your data.',
        usesWeights: false,
    },
    {
        key: 'leiden', name: 'Leiden', description: 'Precise communities',
        icon: <Layers className="w-4 h-4" />, category: 'community',
        endpoint: '/analytics/community/leiden',
        simpleInfo: 'An improved community detection that finds very precise groups.',
        benefit: 'Gives you the most accurate clustering of your data.',
        usesWeights: false,
    },
    {
        key: 'node-similarity', name: 'Similarity', description: 'Find similar pairs',
        icon: <Search className="w-4 h-4" />, category: 'prediction',
        endpoint: '/analytics/similarity/nodes',
        simpleInfo: 'Compares nodes to find those with similar connection patterns.',
        benefit: 'Great for finding duplicates or related entities.',
        usesWeights: false,
    },
    {
        key: 'link-prediction', name: 'Common Neighbors', description: 'Basic link prediction',
        icon: <GitBranch className="w-4 h-4" />, category: 'prediction',
        endpoint: '/analytics/link-prediction?method=common_neighbors',
        simpleInfo: 'Predicts connections based on the number of shared neighbors.',
        benefit: 'Best for finding logical connections between related entities.',
        usesWeights: false,
    },
    {
        key: 'adamic-adar', name: 'Adamic Adar', description: 'Advanced prediction',
        icon: <Sparkles className="w-4 h-4" />, category: 'prediction',
        endpoint: '/analytics/link-prediction?method=adamic_adar',
        simpleInfo: 'A weighted predictor that prioritizes rare shared connections.',
        benefit: 'Highlights unique, non-obvious relationships.',
        usesWeights: false,
    },
    {
        key: 'resource-allocation', name: 'Resource Distribution', description: 'Flow-based prediction',
        icon: <ArrowLeftRight className="w-4 h-4" />, category: 'prediction',
        endpoint: '/analytics/link-prediction?method=resource_allocation',
        simpleInfo: 'Predicts links by simulating how information "flows" between nodes.',
        benefit: 'Excellent for finding high-probability hidden links.',
        usesWeights: false,
    },
    {
        key: 'hits', name: 'HITS', description: 'Hubs & Authorities',
        icon: <Users className="w-4 h-4" />, category: 'centrality',
        endpoint: '/analytics/centrality/hits',
        simpleInfo: 'Identifies authority sources and hub aggregators of information.',
        benefit: 'Great for finding the most expert/reliable sources in data.',
        usesWeights: true,
    },
    {
        key: 'wcc', name: 'Connected Islands', description: 'Find isolated groups',
        icon: <Layers className="w-4 h-4" />, category: 'community',
        endpoint: '/analytics/community/wcc',
        simpleInfo: 'Finds groups of nodes that are completely disconnected from the rest.',
        benefit: 'Helps identify silos or fragmented parts of your knowledge graph.',
        usesWeights: false,
    },
    {
        key: 'k-core', name: 'Core Analysis', description: 'Find the graph center',
        icon: <Target className="w-4 h-4" />, category: 'decomposition',
        endpoint: '/analytics/community/kcore',
        simpleInfo: 'Finds the "inner sanctum" of your graph where everything is densly connected.',
        benefit: 'Identifies the most robust and stable heart of your data.',
        usesWeights: false,
    },
    {
        key: 'shortest-path', name: 'Shortest Path', description: 'Find Dijkstra path',
        icon: <Share2 className="w-4 h-4" />, category: 'pathfinding',
        endpoint: '/analytics/path/shortest',
        simpleInfo: 'Finds the most efficient route between two specific nodes.',
        benefit: 'Crucial for logic-chain analysis and connection deep-dives.',
        usesWeights: false,
    },
    {
        key: 'articlerank', name: 'ArticleRank', description: 'Diverse influence',
        icon: <BarChart3 className="w-4 h-4" />, category: 'centrality',
        endpoint: '/analytics/centrality/articlerank',
        simpleInfo: 'A variant of PageRank that handles heterogenous graphs better.',
        benefit: 'Great for ranking entities with varying connection types.',
        usesWeights: true,
    },
    {
        key: 'bfs', name: 'BFS Traversal', description: 'Breadth-first search',
        icon: <Zap className="w-4 h-4" />, category: 'pathfinding',
        endpoint: '/analytics/path/traversal?method=bfs',
        simpleInfo: 'Explores nodes layer by layer from a starting point.',
        benefit: 'Finds the closest "neighbors" within a specific distance.',
        usesWeights: false,
    },
    {
        key: 'dfs', name: 'DFS Traversal', description: 'Depth-first search',
        icon: <Activity className="w-4 h-4" />, category: 'pathfinding',
        endpoint: '/analytics/path/traversal?method=dfs',
        simpleInfo: 'Follows a path as far as possible before backtracking.',
        benefit: 'Useful for exploring deep hierarchies or long sequences.',
        usesWeights: false,
    },
    {
        key: 'random-walk', name: 'Random Walk', description: 'Simulated exploration',
        icon: <Play className="w-4 h-4" />, category: 'pathfinding',
        endpoint: '/analytics/path/random-walk',
        simpleInfo: 'Simulates a user "wandering" through the graph randomly.',
        benefit: 'Uncovers non-obvious paths and associative links.',
        usesWeights: false,
    },
    {
        key: 'topological-sort', name: 'Logical Sequence', description: 'Topo-Sort (DAG)',
        icon: <ChevronRight className="w-4 h-4" />, category: 'topology',
        endpoint: '/analytics/topology/topological-sort',
        simpleInfo: 'Orders nodes in a logical linear sequence (for DAGs).',
        benefit: 'Perfect for understanding process flows or timelines.',
        usesWeights: false,
    },
    {
        key: 'triangles', name: 'Triangle Count', description: 'Local density',
        icon: <Activity className="w-4 h-4" />, category: 'community',
        endpoint: '/analytics/community/triangles',
        simpleInfo: 'Counts local triangles to measure how tight-knit groups are.',
        benefit: 'Reveals which parts of the graph have the strongest collaboration.',
        usesWeights: false,
    },
];

// ─── Helpers ────────────────────────────────────────────────
const getDisplayName = (item: any) => {
    // If it has a primary name and it's not a UUID, use it
    if (item.name && !/^[0-9a-f-]{30,}$/i.test(item.name)) return item.name;
    if (item.source_name && !/^[0-9a-f-]{30,}$/i.test(item.source_name)) return item.source_name;

    // Search through all properties for something name-like
    const priorityKeys = ['title', 'content', 'question_text', 'questionId', 'studentId', 'label', 'val', 'value', 'text', 'code'];
    for (const key of priorityKeys) {
        if (item[key] && typeof item[key] === 'string' && item[key].length > 0) {
            return item[key];
        }
    }

    // Fallback to name or ID if nothing else found
    return item.name || item.source_name || item.id || 'Unnamed';
};

const formatTypeName = (type: string | undefined): string => {
    if (!type) return 'Entity';
    // Rip out the internal F_... suffixes (e.g., Question_F_123 -> Question)
    return type.split('_F_')[0].split('_')[0] || type;
};

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

    // ── Weight context suffix ──
    const weightsEnabled = useWeightConfigStore.getState().weightsEnabled;
    const activeConfig = useWeightConfigStore.getState().activeConfig;
    let weightSuffix = '';
    if (algo.usesWeights && weightsEnabled && activeConfig) {
        weightSuffix = ` ⚖️ These results were influenced by your quantitative weight "${activeConfig.name}" — connections with higher weight values contributed more to the scores.`;
    } else if (algo.usesWeights && !weightsEnabled) {
        weightSuffix = ` ℹ️ This algorithm supports quantitative weights. Enable the weight toggle to factor in numeric properties (e.g., marks, scores) for more meaningful results.`;
    } else if (!algo.usesWeights && weightsEnabled) {
        weightSuffix = ` ℹ️ Note: Your weight toggle is on, but this algorithm analyzes purely structural patterns (connections) and does not use quantitative weights.`;
    }

    let baseSummary = '';

    switch (algo.category) {
        case 'centrality':
            if (algo.key === 'hits' && top) {
                const topHub = result.results?.reduce((a, b) => (a.hub_score || 0) > (b.hub_score || 0) ? a : b);
                const authName = getDisplayName(top);
                const hubName = getDisplayName(topHub);
                baseSummary = `Across all ${totalNodes} entities in the graph, HITS analysis identified "${authName}" as the top authority (score: ${top.auth_score?.toFixed(4) || 'N/A'}), meaning it is the most referenced and trusted source. ${topHub?.id !== top.id ? `Meanwhile, "${hubName}" emerged as the primary hub, actively linking to and aggregating many other entities.` : 'It also acts as a leading hub, both receiving and distributing information.'} ${result.insight || ''}`;
                return baseSummary + weightSuffix;
            }
            if (top) {
                const trait = algo.key === 'pagerank' || algo.key === 'articlerank' ? 'influential' : algo.key === 'betweenness' ? 'critical bridge' : algo.key === 'degree' ? 'connected' : 'centrally located';
                const second = result.results?.[1];
                const topName = getDisplayName(top);
                const topType = formatTypeName(top.type);
                baseSummary = `After analyzing all ${totalNodes} entities in the graph, "${topName}" (${topType}) emerged as the most ${trait} node with a score of ${top.score?.toFixed(4) || 'N/A'}.`;
                if (second) {
                    const secondName = getDisplayName(second);
                    baseSummary += ` It is followed closely by "${secondName}" (score: ${second.score?.toFixed(4)}). The top ${resultCount} results are shown below, ranked by significance.`;
                }
                if (result.insight) baseSummary += ` ${result.insight}`;
                return baseSummary + weightSuffix;
            }
            return (result.insight || `Analysis complete across ${totalNodes} entities. ${resultCount} results ranked.`) + weightSuffix;

        case 'community': {
            const communities = new Set(result.results?.map(r => r.community ?? r.community_id ?? r.score));
            const commSizes = Array.from(communities).map(c =>
                result.results?.filter(r => (r.community ?? r.community_id ?? r.score) === c).length || 0
            );
            const largest = Math.max(...commSizes, 0);
            const smallest = Math.min(...commSizes, 0);
            baseSummary = `Analysis of ${totalNodes} entities revealed ${communities.size} distinct communities.`;
            if (communities.size > 1) {
                baseSummary += ` The largest community contains ${largest} members, while the smallest has ${smallest}. Entities within the same community share significantly denser connections with each other than with the rest of the graph.`;
            } else if (communities.size === 1) {
                baseSummary += ` All analyzed entities belong to a single, tightly-knit cluster, indicating a highly cohesive dataset.`;
            }
            if (result.insight) baseSummary += ` ${result.insight}`;
            return baseSummary + weightSuffix;
        }

        case 'prediction':
            if (algo.key === 'node-similarity' && top) {
                const sourceName = getDisplayName(top);
                const targetName = top.target_name || 'N/A';
                return `Compared ${totalNodes} active nodes and found ${resultCount} significantly similar pairs. The strongest match is "${sourceName}" ↔ "${targetName}" with ${((top.score || top.similarity || 0) * 100).toFixed(1)}% Jaccard similarity, meaning they share nearly identical connection patterns. ${result.insight || ''}` + weightSuffix;
            }
            if (['link-prediction', 'adamic-adar', 'resource-allocation'].includes(algo.key)) {
                const sourceName = top ? getDisplayName(top) : '';
                const targetName = top?.target_name || '';
                return `Analyzed ${totalNodes} active nodes to find hidden connections and predicted ${resultCount} new potential links. ${top ? `The strongest prediction is "${sourceName}" ↔ "${targetName}" (score: ${top.score?.toFixed(4) || 'N/A'}), suggesting these entities are likely related but not yet connected in the graph.` : ''} ${result.insight || ''}` + weightSuffix;
            }
            return (result.insight || `${resultCount} results found across ${totalNodes} entities.`) + weightSuffix;

        case 'decomposition':
            if (top && result.results) {
                const maxCore = Math.max(...result.results.map(r => r.score || 0));
                return `K-Core decomposition of ${totalNodes} entities identified ${resultCount} nodes in the stable core (k ≥ ${(result.parameters as any)?.k || 3}). The densest core level reached is ${maxCore}, occupied by the most interconnected entities. ${result.insight || ''}` + weightSuffix;
            }
            return (result.insight || `Decomposition complete. Grouped ${resultCount} of ${totalNodes} entities into structural layers.`) + weightSuffix;

        case 'pathfinding':
            if (algo.key === 'shortest-path' && result.results?.length > 0) {
                const source = result.results[0].name;
                const target = result.results[result.results.length - 1].name;
                return `Successfully traced the shortest route from "${source}" to "${target}" through ${resultCount} hop(s). Each step represents the most efficient path between these two specific concepts.` + weightSuffix;
            }
            if (algo.key === 'bfs' && top) {
                return `Starting from "${top.name}", a Breadth-First search discovered ${resultCount} entities by exploring layer by layer. This reveals the immediate neighborhood and close-range context surrounding the starting node.` + weightSuffix;
            }
            if (algo.key === 'dfs' && top) {
                return `Starting from "${top.name}", a Depth-First search explored a path ${resultCount} nodes deep before returning. This highlights deep logic chains and long-distance associations originating from the starting entity.` + weightSuffix;
            }
            if (algo.key === 'random-walk' && top) {
                return `A simulated random walk starting from "${top.name}" wandered across ${resultCount} distinct entities. This process uncovers serendipitous connections and associations that might not be visible through traditional direct paths.` + weightSuffix;
            }
            return (result.insight || `Exploration complete. Traversed ${resultCount} entities out of the ${totalNodes} in the current view.`) + weightSuffix;

        case 'topology':
            return (result.insight || `Topological ordering complete. Arranged ${resultCount} of ${totalNodes} entities into a logical sequence based on their directional dependencies.`) + weightSuffix;

        default:
            return (result.insight || `Processed ${resultCount} results across ${totalNodes} entities.`) + weightSuffix;
    }
}

// ─── Main Component ─────────────────────────────────────────

// ─── Cache Types ────────────────────────────────────────────

interface CachedResult {
    result: AlgorithmResult;
    fingerprint: string; // dataset fingerprint when result was computed
}

export function AlgorithmDrawer({
    isOpen,
    onClose,
    folderId,
    focusNodeIds,
    focusLinkIds,
}: AlgorithmDrawerProps) {
    const { filteredNodes, filteredLinks, nodes, links, filters, selectedNodes } = useGraphStore();
    const { weightsEnabled, activeConfig } = useWeightConfigStore();

    // State
    const [expandedCategory, setExpandedCategory] = useState<AlgorithmCategory | null>(null);
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmConfig | null>(null);
    const [result, setResult] = useState<AlgorithmResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nodeSearchTerm, setNodeSearchTerm] = useState('');
    const { selectNode, clearSelection, setSelectedNodes } = useGraphStore();

    // ─── Result Cache ───────────────────────────────────────
    // Persists results per algorithm so switching tabs doesn't lose data.
    // Automatically invalidates when the dataset fingerprint changes.
    const resultsCacheRef = useRef<Map<string, CachedResult>>(new Map());

    // Automatic Scope Detection:
    // If user has selected nodes, we analyze that specific "Focus Set" (neighbors).
    // Otherwise, we analyze the entire currently filtered graph.
    const isSelectionMode = selectedNodes.length > 0;

    const visibleNodes = React.useMemo(() => {
        if (isSelectionMode) {
            // Intelligent Scope: Use the highlighted focus set (neighbors)
            if (focusNodeIds && focusNodeIds.length > 0) {
                return nodes.filter(n => focusNodeIds.includes(n.id));
            }
            // Fallback to just the raw selected nodes if no focus set calculated yet
            return nodes.filter(n => selectedNodes.includes(n.id));
        }
        return filteredNodes();
    }, [filteredNodes, nodes, filters, isSelectionMode, selectedNodes, focusNodeIds]);

    const visibleLinks = React.useMemo(() => {
        if (isSelectionMode) {
            if (focusNodeIds && focusNodeIds.length > 0) {
                const nodeSet = new Set(focusNodeIds);
                return links.filter(l => {
                    const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
                    const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
                    return nodeSet.has(s) && nodeSet.has(t);
                });
            }

            const selectedSet = new Set(selectedNodes);
            return links.filter(l => {
                const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
                const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
                return selectedSet.has(s) && selectedSet.has(t);
            });
        }
        return filteredLinks();
    }, [filteredLinks, links, filters, isSelectionMode, selectedNodes, focusNodeIds]);

    const nodeCount = visibleNodes.length;
    const linkCount = visibleLinks.length;
    const nodeIds = React.useMemo(() => visibleNodes.map(n => n.id), [visibleNodes]);

    // Dataset fingerprint: changes when visible node count or selected nodes change
    const datasetFingerprint = useMemo(() => {
        const sortedSelected = [...selectedNodes].sort().join(',');
        return `${nodeCount}:${linkCount}:${sortedSelected}`;
    }, [nodeCount, linkCount, selectedNodes]);

    // Auto-invalidate entire cache when the dataset fingerprint changes
    const prevFingerprintRef = useRef(datasetFingerprint);
    useEffect(() => {
        if (prevFingerprintRef.current !== datasetFingerprint) {
            // Dataset changed — clear all cached results
            resultsCacheRef.current.clear();
            setResult(null);
            prevFingerprintRef.current = datasetFingerprint;
        }
    }, [datasetFingerprint]);

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
            // ── Scoping Logic ──────────────────────────────────────
            // Priority: selected nodes > filtered/focus view > folder
            //
            // 1. If user selected specific nodes → run on those IDs
            // 2. If viewing a subset (filtered/file view) → run on visible IDs
            // 3. If viewing a folder → folderId scopes it (no node_ids needed)
            // 4. No scope → runs on entire graph

            let ids: string[] | undefined;

            if (isSelectionMode) {
                // User explicitly selected nodes — always scope to those
                const uniqueIds = new Set(selectedNodes);

                // If we also have focus neighbors (BFS highlight), include them
                // so algorithms can analyze the local subgraph
                if (focusNodeIds && focusNodeIds.length > 0) {
                    focusNodeIds.forEach(id => uniqueIds.add(id));
                }

                ids = uniqueIds.size > 0 ? Array.from(uniqueIds) : undefined;
            } else if (nodeIds.length > 0 && nodeIds.length < nodes.length) {
                // Filtered view shows a subset of nodes (e.g., type filter, file filter)
                ids = nodeIds;
            }
            // else: folderId alone will scope it on the backend

            const extra: Record<string, any> = {};

            if (selectedAlgorithm.category === 'pathfinding' || selectedAlgorithm.key === 'random-walk') {
                extra.source_id = selectedNodes[0];
                if (selectedAlgorithm.key === 'shortest-path') {
                    extra.target_id = selectedNodes[1];
                }
            }

            // Get active weight formula from weight config store
            const activeFormula = useWeightConfigStore.getState().getActiveFormula();

            const data = await fetchAlgorithm(selectedAlgorithm.endpoint, folderId, ids, extra, activeFormula);
            setResult(data);

            // Cache the result with the current dataset fingerprint
            resultsCacheRef.current.set(selectedAlgorithm.key, {
                result: data,
                fingerprint: datasetFingerprint,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Algorithm failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedAlgorithm, folderId, nodeIds, nodes.length, selectedNodes, focusNodeIds, isSelectionMode, datasetFingerprint]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[190]"
                onClick={onClose}
            />

            {/* Drawer */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="fixed inset-2 md:inset-8 lg:left-[5%] lg:right-[5%] xl:left-[8%] xl:right-[8%] lg:top-[6%] lg:bottom-[6%] z-[201] flex flex-col overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900"
            >
                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-4 md:px-8 py-4 md:py-5 border-b border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900 gap-4">
                    <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                            <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">Graph Analytics</h2>
                            <p className="text-[9px] md:text-[10px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 truncate">
                                Neo4j GDS Algorithms
                            </p>
                        </div>
                    </div>

                    {/* Stats Pill */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 w-full sm:w-auto">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-full text-[10px] md:text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <span className="flex items-center gap-1.5 border-r border-slate-300/50 dark:border-slate-600/50 pr-2 md:pr-3 mr-1">
                                <span className={`w-2 h-2 rounded-full ${isSelectionMode ? 'animate-pulse bg-emerald-500' : folderId ? 'bg-indigo-400' : 'bg-amber-400'}`}
                                />
                                <span className="truncate max-w-[80px] md:max-w-none">
                                    {isSelectionMode
                                        ? `${selectedNodes.length} Selected`
                                        : folderId ? 'Folder Scope' : 'All Data'}
                                </span>
                            </span>
                            <span className="flex items-center gap-1">
                                {nodeCount} <span className="hidden md:inline">nodes</span>
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <span className="flex items-center gap-1">
                                <ArrowLeftRight className="w-3 h-3" />
                                {linkCount} <span className="hidden md:inline">links</span>
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-slate-400 dark:text-slate-500 hover:text-red-400 shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Body: Sidebar + Main ── */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* ── Sidebar: Categories + Algorithms ── */}
                    <div className="w-full md:w-56 lg:w-64 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
                        <div className="p-5 space-y-1">
                            <span className="block text-[9px] font-bold uppercase tracking-widest mb-3 px-1 text-slate-400 dark:text-slate-500">
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
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isExpanded
                                                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent'
                                                }`}
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
                                                            const hasCachedResult = resultsCacheRef.current.has(algo.key) &&
                                                                resultsCacheRef.current.get(algo.key)?.fingerprint === datasetFingerprint;
                                                            return (
                                                                <button
                                                                    key={algo.key}
                                                                    onClick={() => {
                                                                        setSelectedAlgorithm(algo);
                                                                        setError(null);

                                                                        // Restore cached result if it exists and dataset hasn't changed
                                                                        const cached = resultsCacheRef.current.get(algo.key);
                                                                        if (cached && cached.fingerprint === datasetFingerprint) {
                                                                            setResult(cached.result);
                                                                        } else {
                                                                            setResult(null);
                                                                        }
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${isActive
                                                                        ? 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                                                                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-bold">{algo.name}</span>
                                                                        {algo.usesWeights && (
                                                                            <span title="Affected by quantitative weights">
                                                                                <Scale className="w-2.5 h-2.5 shrink-0 text-amber-500 dark:text-amber-400" />
                                                                            </span>
                                                                        )}
                                                                        {hasCachedResult && (
                                                                            <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" />
                                                                        )}
                                                                    </div>
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

                        {/* Weight Configuration Panel */}
                        {folderId && (
                            <div className="px-5 pt-2 pb-1">
                                <WeightConfigPanel folderId={folderId} />
                            </div>
                        )}

                        {/* Info Footer */}
                        <div className="mt-auto p-5 border-t border-slate-200 dark:border-slate-700">
                            <div className="p-3 rounded-xl text-[10px] leading-relaxed bg-amber-50 dark:bg-amber-500/10 text-slate-500 dark:text-slate-400 border border-amber-100 dark:border-amber-500/20">
                                <strong className="block mb-1 text-amber-700 dark:text-amber-400">💡 Tip</strong>
                                Use the graph filters (node types, relationships) to narrow your analysis scope before running algorithms.
                            </div>
                        </div>
                    </div>

                    {/* ── Main Content Area ── */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                        {!selectedAlgorithm ? (
                            /* Empty state */
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <Network className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Select an Algorithm</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm">
                                    Pick a category from the sidebar, then choose an algorithm to run on your
                                    <strong className="mx-1 text-indigo-600 dark:text-indigo-400">{nodeCount} {isSelectionMode ? 'selected' : 'visible'} nodes</strong>
                                    and
                                    <strong className="mx-1 text-indigo-600 dark:text-indigo-400">{linkCount} relationships</strong>.
                                </p>
                            </div>
                        ) : (
                            /* Algorithm detail + results */
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Algorithm Info Header */}
                                <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="p-2 md:p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                                                {React.cloneElement(selectedAlgorithm.icon as React.ReactElement, {
                                                    className: 'w-4 md:w-5 h-4 md:h-5',
                                                    style: { color: '#4f46e5' },
                                                })}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{selectedAlgorithm.name}</h3>
                                                <p className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                                                    {selectedAlgorithm.category} algorithm
                                                </p>
                                            </div>
                                        </div>

                                        {/* Run Button — Stays Green (Action) */}
                                        <button
                                            onClick={runAlgorithm}
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 shrink-0"
                                            style={{
                                                background: isLoading
                                                    ? '#86efac'
                                                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                                boxShadow: isLoading ? 'none' : '0 4px 14px rgba(34, 197, 94, 0.3)',
                                            }}
                                        >
                                            {isLoading ? (
                                                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                            )}
                                            {isLoading ? <span className="hidden sm:inline">Running...</span> : <span className="hidden sm:inline">Run Analysis</span>}
                                            <span className="sm:hidden">{isLoading ? '...' : <Play className="w-3 h-3 fill-current" />}</span>
                                        </button>
                                    </div>

                                    {/* Algorithm description — Two-tone cards */}
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                        <div className="p-3 md:p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5" style={{ borderLeft: '3px solid #818cf8' }}>
                                            <span className="text-[9px] font-bold uppercase tracking-wider block mb-1 text-indigo-400">What it does</span>
                                            <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{selectedAlgorithm.simpleInfo}</p>
                                        </div>
                                        <div className="p-3 md:p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5" style={{ borderLeft: '3px solid #fbbf24' }}>
                                            <span className="text-[9px] font-bold uppercase tracking-wider block mb-1 text-amber-600 dark:text-amber-400">Why it helps</span>
                                            <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{selectedAlgorithm.benefit}</p>
                                        </div>
                                    </div>

                                    {/* Weight Context Card */}
                                    {(() => {
                                        const usesW = selectedAlgorithm.usesWeights;

                                        if (usesW && weightsEnabled && activeConfig) {
                                            // Algorithm USES weights and toggle is ON
                                            return (
                                                <div className="mt-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 flex items-start gap-2.5">
                                                    <Scale className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider block mb-0.5 text-emerald-700 dark:text-emerald-400">Weighted Mode Active</span>
                                                        <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                                            This algorithm <strong className="text-emerald-700 dark:text-emerald-300">uses your quantitative weights</strong> ({activeConfig.name}) to influence the ranking. Connections with higher weight values will have more impact on the results.
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        } else if (usesW && !weightsEnabled) {
                                            // Algorithm USES weights but toggle is OFF
                                            return (
                                                <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-600/40 bg-slate-50/80 dark:bg-slate-800/50 flex items-start gap-2.5">
                                                    <Scale className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                                                    <div>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider block mb-0.5 text-slate-500 dark:text-slate-400">Supports Weights</span>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                            This algorithm <strong>can use quantitative weights</strong> (e.g., marks, scores) to influence rankings. Turn on the weight toggle below to activate.
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        } else if (!usesW && weightsEnabled) {
                                            // Algorithm does NOT use weights but toggle is ON
                                            return (
                                                <div className="mt-3 p-3 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5 flex items-start gap-2.5">
                                                    <Scale className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider block mb-0.5 text-amber-600 dark:text-amber-400">Weights Not Applicable</span>
                                                        <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                                            This algorithm <strong>does not use quantitative weights</strong>. It purely analyzes structural patterns (connections), so the weight toggle has no effect on these results.
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        // !usesW && !weightsEnabled — no need to show anything
                                        return null;
                                    })()}
                                </div>

                                {/* Traversal/Pathfinding Node Selection — Interactive UI */}
                                {(selectedAlgorithm.category === 'pathfinding' || selectedAlgorithm.key === 'random-walk') && (
                                    <div className="px-8 pb-4">
                                        <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-white dark:bg-slate-900 shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <MousePointer2 className="w-4 h-4 text-indigo-500" />
                                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                        Select {selectedAlgorithm.key === 'shortest-path' ? 'Source & Target' : 'Starting Node'}
                                                    </h4>
                                                </div>
                                                {selectedNodes.length > 0 && (
                                                    <button
                                                        onClick={() => clearSelection()}
                                                        className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
                                                    >
                                                        Clear Selection
                                                    </button>
                                                )}
                                            </div>

                                            {/* Search box for nodes */}
                                            <div className="relative mb-4">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search nodes by name..."
                                                    value={nodeSearchTerm}
                                                    onChange={(e) => setNodeSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 transition-all"
                                                />
                                            </div>

                                            {/* Selected Pills */}
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {selectedNodes.length === 0 && (
                                                    <div className="text-[10px] italic text-slate-400 py-1">
                                                        No nodes selected yet. Pick from the list below or click on the graph.
                                                    </div>
                                                )}
                                                {selectedNodes.map((id, index) => {
                                                    const node = nodes.find(n => n.id === id);
                                                    return (
                                                        <div key={id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm transition-all ${index === 0 ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-amber-50 border-amber-100 text-amber-700'
                                                            }`}>
                                                            <span className="text-[9px] font-black uppercase opacity-60">
                                                                {selectedAlgorithm.key === 'shortest-path' ? (index === 0 ? 'SOURCE' : 'TARGET') : 'START'}
                                                            </span>
                                                            <span className="text-xs font-bold truncate max-w-[120px]">{node?.name || id}</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); selectNode(id, true); }}
                                                                className="hover:scale-110 transition-transform"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Search Results (Node List) */}
                                            {nodeSearchTerm && (
                                                <div className="max-h-[160px] overflow-y-auto overflow-x-hidden pr-2 space-y-1 custom-scrollbar">
                                                    {nodes
                                                        .filter(n => n.name.toLowerCase().includes(nodeSearchTerm.toLowerCase()))
                                                        .slice(0, 10)
                                                        .map(node => {
                                                            const isSelected = selectedNodes.includes(node.id);
                                                            return (
                                                                <button
                                                                    key={node.id}
                                                                    onClick={() => {
                                                                        if (selectedAlgorithm.key === 'shortest-path') {
                                                                            if (isSelected) selectNode(node.id, true);
                                                                            else if (selectedNodes.length < 2) selectNode(node.id, true);
                                                                        } else {
                                                                            setSelectedNodes([node.id]);
                                                                        }
                                                                        setNodeSearchTerm(''); // Close dropdown after selection
                                                                    }}
                                                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${isSelected
                                                                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-sm scale-[1.01]'
                                                                        : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-500' : 'bg-indigo-400 opacity-40'}`} />
                                                                        <div className="flex flex-col items-start min-w-0">
                                                                            <span className="text-xs font-bold truncate w-full">{node.name}</span>
                                                                            <span className={`text-[9px] uppercase font-bold opacity-60 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                                                                                {node.type}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {isSelected ? <Check className="w-3.5 h-3.5 text-indigo-500" /> : <Plus className="w-3.5 h-3.5 opacity-40" />}
                                                                </button>
                                                            );
                                                        })
                                                    }
                                                </div>
                                            )}
                                            {!nodeSearchTerm && (
                                                <p className="text-[10px] text-center text-slate-400 py-2">
                                                    Type in the search box to find and select specific nodes.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Results Area */}
                                <div className="flex-1 overflow-y-auto p-8 pt-0">
                                    {error && (
                                        <div className="p-4 mb-6 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold leading-relaxed">
                                            💡 {error}
                                        </div>
                                    )}

                                    {isLoading ? (
                                        <div className="flex-1 flex flex-col items-center justify-center py-20">
                                            <div className="relative mb-6">
                                                <div className="w-16 h-16 border-4 rounded-full animate-spin"
                                                    style={{ borderColor: '#e0e7ff', borderTopColor: '#6366f1' }}
                                                />
                                                <Activity className="absolute inset-0 m-auto w-6 h-6 animate-pulse text-indigo-500" />
                                            </div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                                                Analyzing {nodeCount} {isSelectionMode ? 'selected' : 'visible'} nodes...
                                            </p>
                                        </div>
                                    ) : result ? (
                                        <div className="space-y-6">
                                            {/* Summary Card — Purple/Indigo Gradient */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="rounded-2xl border border-indigo-200/60 dark:border-indigo-500/20 overflow-hidden"
                                                style={{ boxShadow: '0 2px 16px rgba(99, 102, 241, 0.08)' }}
                                            >
                                                {/* Accent bar */}
                                                <div style={{ height: 3, background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #c084fc)' }} />
                                                <div className="p-5 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-white dark:from-indigo-500/10 dark:via-purple-500/5 dark:to-slate-900">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg shrink-0 bg-indigo-100 dark:bg-indigo-500/20">
                                                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-indigo-700 dark:text-indigo-400">
                                                                Analysis Summary
                                                            </h4>
                                                            <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-[1.7]">
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
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                            Detailed Results ({result.results.length})
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            {useWeightConfigStore.getState().weightsEnabled && useWeightConfigStore.getState().activeConfig && (
                                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm animate-pulse">
                                                                    <Zap className="w-3 h-3" />
                                                                    Weighted: {useWeightConfigStore.getState().activeConfig?.name}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Complete
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                                                        {/* Table Header */}
                                                        <div className="grid grid-cols-12 gap-1 md:gap-2 px-3 md:px-5 py-3 text-[9px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                            <div className="col-span-1">#</div>
                                                            <div className="col-span-6 md:col-span-5">Name</div>
                                                            <div className="col-span-5 md:col-span-3">Type</div>
                                                            <div className="hidden md:block md:col-span-3 text-right">Score</div>
                                                        </div>

                                                        {/* Table Rows */}
                                                        {result.results.slice(0, 50).map((item, i) => {
                                                            const name = getDisplayName(item);
                                                            const secondaryName = item.target_name || null;
                                                            const type = formatTypeName(item.type || item.source_type);
                                                            const scoreValue = typeof item.score === 'number' ? item.score : typeof item.similarity === 'number' ? item.similarity : undefined;
                                                            const communityValue = item.community ?? item.community_id;

                                                            // Color-code type badges
                                                            const typeLower = type.toLowerCase();
                                                            const typeBadge = typeLower.includes('property')
                                                                ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20'
                                                                : typeLower.includes('quality')
                                                                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                                                                    : typeLower.includes('entity')
                                                                        ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20'
                                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';

                                                            return (
                                                                <motion.div
                                                                    key={item.id || `${i}-${name}`}
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    transition={{ delay: i * 0.02 }}
                                                                    className={`grid grid-cols-12 gap-1 md:gap-2 px-3 md:px-5 py-2.5 items-center border-t border-slate-100 dark:border-slate-800 text-xs hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}
                                                                >
                                                                    <div className="col-span-1 font-bold text-[10px] text-slate-400 dark:text-slate-500">{i + 1}</div>
                                                                    <div className="col-span-6 md:col-span-5 font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                                                                        {secondaryName ? (
                                                                            <div className="flex items-center gap-2 truncate">
                                                                                <span className="truncate">{name}</span>
                                                                                <ArrowLeftRight className="w-2.5 h-2.5 shrink-0 text-indigo-400" />
                                                                                <span className="truncate">{secondaryName}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="truncate">{name}</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="col-span-3">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${typeBadge}`}>
                                                                            {type}
                                                                        </span>
                                                                    </div>
                                                                    <div className="col-span-3 text-right font-mono font-bold text-[11px] text-indigo-600 dark:text-indigo-400">
                                                                        {scoreValue !== undefined ? scoreValue.toFixed(4) :
                                                                            item.hub_score !== undefined ? (
                                                                                <div className="flex flex-col text-[9px] leading-tight">
                                                                                    <span>A: {item.auth_score?.toFixed(3)}</span>
                                                                                    <span className="text-slate-400 dark:text-slate-500">H: {item.hub_score?.toFixed(3)}</span>
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
                                            <Search className="w-12 h-12 mb-4 text-slate-200 dark:text-slate-700" />
                                            <p className="text-sm text-slate-400 dark:text-slate-500">
                                                Click <strong className="text-emerald-600 dark:text-emerald-400">Run Analysis</strong> to start
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
