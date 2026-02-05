/**
 * Analytics API
 * 
 * API calls for graph algorithms and analytics.
 */
import { api } from './client';

export interface AlgorithmResult {
    algorithm: string;
    folder_id?: string;
    parameters?: Record<string, unknown>;
    results: Array<{
        id: string;
        name: string;
        type?: string;
        score?: number;
        [key: string]: unknown;
    }>;
    insight: string;
}

export interface AlgorithmInfo {
    name: string;
    category: string;
    description: string;
}

export interface AvailableAlgorithms {
    implemented: AlgorithmInfo[];
    coming_soon: AlgorithmInfo[];
}

export const analyticsApi = {
    // Get available algorithms
    getAvailable: () =>
        api.get<AvailableAlgorithms>('/analytics/available'),

    // Centrality algorithms
    pageRank: (folderId?: string, topK?: number) =>
        api.get<AlgorithmResult>(`/analytics/centrality/pagerank${buildParams({ folder_id: folderId, top_k: topK })}`),

    betweenness: (folderId?: string, topK?: number) =>
        api.get<AlgorithmResult>(`/analytics/centrality/betweenness${buildParams({ folder_id: folderId, top_k: topK })}`),

    // Community detection
    louvain: (folderId?: string) =>
        api.get<AlgorithmResult>(`/analytics/community/louvain${buildParams({ folder_id: folderId })}`),

    leiden: (folderId?: string) =>
        api.get<AlgorithmResult>(`/analytics/community/leiden${buildParams({ folder_id: folderId })}`),

    // Similarity
    knn: (nodeId: string, topK?: number) =>
        api.get<AlgorithmResult>(`/analytics/similarity/knn?node_id=${nodeId}${topK ? `&top_k=${topK}` : ''}`),

    // Analysis
    graphHealth: (folderId?: string) =>
        api.get<AlgorithmResult>(`/analytics/health${buildParams({ folder_id: folderId })}`),

    completeness: (folderId?: string) =>
        api.get<AlgorithmResult>(`/analytics/completeness${buildParams({ folder_id: folderId })}`),

    degreeDistribution: (folderId?: string) =>
        api.get<AlgorithmResult>(`/analytics/degree-distribution${buildParams({ folder_id: folderId })}`),

    // Predictions
    linkPrediction: (folderId?: string, method?: string, topK?: number) =>
        api.get<AlgorithmResult>(`/analytics/link-prediction${buildParams({ folder_id: folderId, method, top_k: topK })}`),

    missingRelationships: (folderId?: string, minConfidence?: number) =>
        api.get<AlgorithmResult>(`/analytics/missing-relationships${buildParams({ folder_id: folderId, min_confidence: minConfidence })}`),

    incompleteEntities: (folderId?: string, threshold?: number) =>
        api.get<AlgorithmResult>(`/analytics/incomplete-entities${buildParams({ folder_id: folderId, threshold })}`),

    // Structural analysis
    structuralHoles: (folderId?: string) =>
        api.get<AlgorithmResult>(`/analytics/structural-holes${buildParams({ folder_id: folderId })}`),

    hits: (folderId?: string, iterations?: number) =>
        api.get<AlgorithmResult>(`/analytics/hits${buildParams({ folder_id: folderId, iterations })}`),

    kCore: (folderId?: string) =>
        api.get<AlgorithmResult>(`/analytics/k-core${buildParams({ folder_id: folderId })}`),
};

// Helper to build query params
function buildParams(params: Record<string, unknown>): string {
    const filtered = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
    return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}
