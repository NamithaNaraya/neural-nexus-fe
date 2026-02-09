/**
 * Algorithm Picker Modal
 * 
 * Browse and configure graph algorithms (15+ algorithms).
 * Categories: Community Detection, Centrality, Path Finding, Similarity.
 */
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    Network,
    Route,
    Users,
    Target,
    Activity,
    TrendingUp,
    Layers,
    GitBranch,
    Zap,
    Settings,
    Play,
    X,
    ChevronRight,
    Info
} from 'lucide-react';

interface Algorithm {
    id: string;
    name: string;
    description: string;
    category: 'community' | 'centrality' | 'path' | 'similarity';
    parameters: AlgorithmParam[];
    estimatedTime: string;
}

interface AlgorithmParam {
    name: string;
    type: 'number' | 'string' | 'boolean' | 'select';
    default: any;
    options?: string[];
    min?: number;
    max?: number;
    description: string;
}

const ALGORITHMS: Algorithm[] = [
    // Community Detection
    {
        id: 'louvain',
        name: 'Louvain',
        description: 'Detect communities through modularity optimization',
        category: 'community',
        parameters: [
            { name: 'resolution', type: 'number', default: 1.0, min: 0.1, max: 5, description: 'Higher = more communities' },
            { name: 'maxIterations', type: 'number', default: 10, min: 1, max: 100, description: 'Max optimization passes' },
        ],
        estimatedTime: '~2s'
    },
    {
        id: 'labelPropagation',
        name: 'Label Propagation',
        description: 'Fast community detection using label spreading',
        category: 'community',
        parameters: [
            { name: 'maxIterations', type: 'number', default: 10, min: 1, max: 100, description: 'Max iterations' },
        ],
        estimatedTime: '<1s'
    },
    {
        id: 'kCore',
        name: 'K-Core Decomposition',
        description: 'Find dense connected subgraphs',
        category: 'community',
        parameters: [
            { name: 'k', type: 'number', default: 3, min: 1, max: 20, description: 'Minimum degree requirement' },
        ],
        estimatedTime: '<1s'
    },
    // Centrality
    {
        id: 'pageRank',
        name: 'PageRank',
        description: 'Rank nodes by importance based on link structure',
        category: 'centrality',
        parameters: [
            { name: 'dampingFactor', type: 'number', default: 0.85, min: 0.1, max: 0.99, description: 'Random walk probability' },
            { name: 'maxIterations', type: 'number', default: 20, min: 1, max: 100, description: 'Convergence iterations' },
        ],
        estimatedTime: '~1s'
    },
    {
        id: 'betweenness',
        name: 'Betweenness Centrality',
        description: 'Find bridge nodes that connect communities',
        category: 'centrality',
        parameters: [
            { name: 'normalized', type: 'boolean', default: true, description: 'Normalize scores 0-1' },
        ],
        estimatedTime: '~5s'
    },
    {
        id: 'closeness',
        name: 'Closeness Centrality',
        description: 'Find nodes closest to all others',
        category: 'centrality',
        parameters: [
            { name: 'useWasserman', type: 'boolean', default: true, description: 'Handle disconnected graphs' },
        ],
        estimatedTime: '~3s'
    },
    {
        id: 'hits',
        name: 'HITS (Hubs & Authorities)',
        description: 'Find hub and authority nodes',
        category: 'centrality',
        parameters: [
            { name: 'maxIterations', type: 'number', default: 20, min: 1, max: 100, description: 'Convergence iterations' },
        ],
        estimatedTime: '~2s'
    },
    // Path Finding
    {
        id: 'shortestPath',
        name: 'Shortest Path (Dijkstra)',
        description: 'Find shortest path between two nodes',
        category: 'path',
        parameters: [
            { name: 'sourceNode', type: 'string', default: '', description: 'Starting node ID' },
            { name: 'targetNode', type: 'string', default: '', description: 'Ending node ID' },
        ],
        estimatedTime: '<1s'
    },
    {
        id: 'allShortestPaths',
        name: 'All Shortest Paths',
        description: 'Find all shortest paths between nodes',
        category: 'path',
        parameters: [
            { name: 'maxDepth', type: 'number', default: 5, min: 1, max: 20, description: 'Maximum path length' },
        ],
        estimatedTime: '~2s'
    },
    // Similarity
    {
        id: 'nodeSimilarity',
        name: 'Node Similarity (Jaccard)',
        description: 'Find similar nodes based on neighbors',
        category: 'similarity',
        parameters: [
            { name: 'topK', type: 'number', default: 10, min: 1, max: 100, description: 'Top K similar pairs' },
            { name: 'similarityCutoff', type: 'number', default: 0.5, min: 0, max: 1, description: 'Minimum similarity' },
        ],
        estimatedTime: '~3s'
    },
    {
        id: 'cosineSimilarity',
        name: 'Cosine Similarity',
        description: 'Compare nodes using embedding vectors',
        category: 'similarity',
        parameters: [
            { name: 'topK', type: 'number', default: 10, min: 1, max: 100, description: 'Top K similar pairs' },
        ],
        estimatedTime: '~2s'
    },
    {
        id: 'linkPrediction',
        name: 'Link Prediction',
        description: 'Predict missing relationships',
        category: 'similarity',
        parameters: [
            { name: 'topK', type: 'number', default: 20, min: 1, max: 200, description: 'Top K predictions' },
            { name: 'method', type: 'select', default: 'adamic-adar', options: ['adamic-adar', 'common-neighbors', 'preferential-attachment'], description: 'Prediction method' },
        ],
        estimatedTime: '~5s'
    },
];

const CATEGORY_CONFIG = {
    community: { label: 'Community Detection', icon: Users, color: 'from-purple-500 to-pink-500' },
    centrality: { label: 'Centrality', icon: Target, color: 'from-amber-500 to-orange-500' },
    path: { label: 'Path Finding', icon: Route, color: 'from-emerald-500 to-teal-500' },
    similarity: { label: 'Similarity', icon: Layers, color: 'from-blue-500 to-cyan-500' },
};

interface AlgorithmPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onRunAlgorithm: (algorithmId: string, params: Record<string, any>) => Promise<void>;
}

export function AlgorithmPicker({ isOpen, onClose, onRunAlgorithm }: AlgorithmPickerProps) {
    const [selectedCategory, setSelectedCategory] = useState<keyof typeof CATEGORY_CONFIG | null>(null);
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null);
    const [params, setParams] = useState<Record<string, any>>({});
    const [running, setRunning] = useState(false);

    const categories = Object.entries(CATEGORY_CONFIG);
    const filteredAlgorithms = selectedCategory
        ? ALGORITHMS.filter(a => a.category === selectedCategory)
        : ALGORITHMS;

    const handleSelectAlgorithm = (algo: Algorithm) => {
        setSelectedAlgorithm(algo);
        const defaultParams: Record<string, any> = {};
        algo.parameters.forEach(p => {
            defaultParams[p.name] = p.default;
        });
        setParams(defaultParams);
    };

    const handleRun = async () => {
        if (!selectedAlgorithm) return;
        setRunning(true);
        try {
            await onRunAlgorithm(selectedAlgorithm.id, params);
            onClose();
        } finally {
            setRunning(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-4xl mx-4 max-h-[85vh] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                                    <Brain className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Algorithm Picker</h2>
                                    <p className="text-sm text-white/60">Run graph algorithms on your data</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        <div className="flex h-[500px]">
                            {/* Categories Sidebar */}
                            <div className="w-56 border-r border-white/10 p-4 space-y-2">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all ${!selectedCategory ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
                                        }`}
                                >
                                    <Network className="w-4 h-4" />
                                    All Algorithms
                                </button>
                                {categories.map(([key, config]) => {
                                    const Icon = config.icon;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedCategory(key as keyof typeof CATEGORY_CONFIG)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all ${selectedCategory === key ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {config.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Algorithms List */}
                            <div className="flex-1 p-4 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredAlgorithms.map(algo => {
                                        const config = CATEGORY_CONFIG[algo.category];
                                        return (
                                            <button
                                                key={algo.id}
                                                onClick={() => handleSelectAlgorithm(algo)}
                                                className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${selectedAlgorithm?.id === algo.id
                                                        ? 'bg-white/10 border-white/30'
                                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${config.color} text-white`}>
                                                        {config.label}
                                                    </span>
                                                    <span className="text-[10px] text-white/40">{algo.estimatedTime}</span>
                                                </div>
                                                <h3 className="font-medium text-white mb-1">{algo.name}</h3>
                                                <p className="text-xs text-white/50">{algo.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Parameters Panel */}
                            {selectedAlgorithm && (
                                <div className="w-72 border-l border-white/10 p-4 bg-slate-800/50">
                                    <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                                        <Settings className="w-4 h-4" />
                                        Configure {selectedAlgorithm.name}
                                    </h3>

                                    <div className="space-y-4">
                                        {selectedAlgorithm.parameters.map(param => (
                                            <div key={param.name}>
                                                <label className="flex items-center gap-2 text-sm text-white/80 mb-1">
                                                    {param.name}
                                                    <span className="text-white/40" title={param.description}>
                                                        <Info className="w-3 h-3" />
                                                    </span>
                                                </label>
                                                {param.type === 'number' && (
                                                    <input
                                                        type="number"
                                                        min={param.min}
                                                        max={param.max}
                                                        value={params[param.name] ?? param.default}
                                                        onChange={e => setParams({ ...params, [param.name]: parseFloat(e.target.value) })}
                                                        className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                                                    />
                                                )}
                                                {param.type === 'string' && (
                                                    <input
                                                        type="text"
                                                        value={params[param.name] ?? param.default}
                                                        onChange={e => setParams({ ...params, [param.name]: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                                                        placeholder={param.description}
                                                    />
                                                )}
                                                {param.type === 'boolean' && (
                                                    <button
                                                        onClick={() => setParams({ ...params, [param.name]: !params[param.name] })}
                                                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${params[param.name]
                                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                : 'bg-slate-700 text-white/60 border border-white/10'
                                                            }`}
                                                    >
                                                        {params[param.name] ? 'Enabled' : 'Disabled'}
                                                    </button>
                                                )}
                                                {param.type === 'select' && (
                                                    <select
                                                        value={params[param.name] ?? param.default}
                                                        onChange={e => setParams({ ...params, [param.name]: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                                                    >
                                                        {param.options?.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleRun}
                                        disabled={running}
                                        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-orange-500/20 transition-all"
                                    >
                                        {running ? (
                                            <>
                                                <Zap className="w-5 h-5 animate-pulse" />
                                                Running...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-5 h-5" />
                                                Run Algorithm
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default AlgorithmPicker;
