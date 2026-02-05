/**
 * Algorithm Drawer
 * 
 * Slide-out drawer containing algorithm panels.
 * Reduces clutter on the main graph view.
 */
'use client';

import React, { useState, useCallback } from 'react';
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
async function fetchAlgorithm(endpoint: string, folderId?: string): Promise<AlgorithmResult> {
    // Determine delimiter based on whether endpoint already has query params
    const delimiter = endpoint.includes('?') ? '&' : '?';

    // Construct URL path relative to API base
    const url = folderId
        ? `${endpoint}${delimiter}folder_id=${folderId}`
        : endpoint;

    return api.get<AlgorithmResult>(url);
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
    const [activeCategory, setActiveCategory] = useState<AlgorithmCategory>('centrality');
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | null>(null);
    const [result, setResult] = useState<AlgorithmResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runAlgorithm = useCallback(async (config: AlgorithmConfig) => {
        setSelectedAlgorithm(config.key);
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await fetchAlgorithm(config.endpoint, folderId);
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Algorithm failed');
        } finally {
            setIsLoading(false);
        }
    }, [folderId]);

    const filteredAlgorithms = algorithms.filter(a => a.category === activeCategory);

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                data-tour="algorithm-drawer"
                className={`fixed top-0 right-0 h-full w-96 bg-card border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold">Graph Algorithms</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Category Tabs */}
                <div className="flex border-b border-border overflow-x-auto">
                    {Object.entries(categoryLabels).map(([key, { label, icon }]) => (
                        <button
                            key={key}
                            onClick={() => setActiveCategory(key as AlgorithmCategory)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${activeCategory === key
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {icon}
                            {label}
                        </button>
                    ))}
                </div>

                {/* Algorithm List */}
                <div className="p-4 space-y-2 max-h-[40vh] overflow-y-auto">
                    {filteredAlgorithms.map(algo => (
                        <button
                            key={algo.key}
                            onClick={() => runAlgorithm(algo)}
                            disabled={isLoading}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedAlgorithm === algo.key
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }`}
                        >
                            <div className={`p-2 rounded-lg ${selectedAlgorithm === algo.key
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                                }`}>
                                {algo.icon}
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-medium text-sm">{algo.name}</div>
                                <div className="text-xs text-muted-foreground">{algo.description}</div>
                            </div>
                            {isLoading && selectedAlgorithm === algo.key && (
                                <LoadingSpinner size="sm" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Results Panel */}
                <div className="flex-1 p-4 border-t border-border overflow-y-auto">
                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {result && !isLoading && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium capitalize">{result.algorithm}</h3>
                                <span className="text-xs text-muted-foreground">
                                    {result.results?.length || 0} results
                                </span>
                            </div>

                            {/* Insight */}
                            {result.insight && (
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                    <p className="text-sm leading-relaxed">{result.insight}</p>
                                </div>
                            )}

                            {/* Results List */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {result.results?.slice(0, 10).map((item: AlgorithmResultItem, i: number) => (
                                    <div
                                        key={item.id || i}
                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                    >
                                        <div>
                                            <div className="font-medium text-sm">{item.name}</div>
                                            {item.type && (
                                                <div className="text-xs text-muted-foreground">{item.type}</div>
                                            )}
                                        </div>
                                        {item.score !== undefined && (
                                            <span className="text-sm font-mono">
                                                {item.score.toFixed(4)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!result && !isLoading && !error && (
                        <div className="text-center text-muted-foreground py-8">
                            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Select an algorithm to run</p>
                        </div>
                    )}
                </div>
            </div>
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
