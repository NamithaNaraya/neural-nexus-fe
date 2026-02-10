/**
 * Graph API
 * 
 * API calls for graph data operations.
 */
import { api } from './client';
import { GraphNode, GraphLink } from '@/store/graphStore';

export interface GraphResponse {
    nodes: GraphNode[];
    links: GraphLink[];
    total_nodes: number;
    total_links: number;
}

export interface NodeDetails {
    id: string;
    name: string;
    type: string;
    description?: string;
    properties?: Record<string, unknown>;
    relationships?: Array<{
        type: string;
        target: string;
        targetName: string;
    }>;
}

export const graphApi = {
    // Get all graph data
    getAll: (limit?: number) =>
        api.get<GraphResponse>(`/graph/all${limit ? `?limit=${limit}` : ''}`),

    // Get folder graph
    getFolder: (folderId: string, limit?: number) =>
        api.get<GraphResponse>(`/graph/folder/${folderId}${limit ? `?limit=${limit}` : ''}`),

    // Get file graph
    getFile: (fileId: string) =>
        api.get<GraphResponse>(`/graph/file/${fileId}`),

    // Get node details (lazy load)
    getNodeDetails: (nodeId: string) =>
        api.get<NodeDetails>(`/graph/node/${nodeId}/details`),

    // Get node neighbors (for expansion)
    getNodeNeighbors: (nodeId: string) =>
        api.get<{ nodes: GraphNode[]; links: GraphLink[] }>(`/graph/node/${nodeId}/neighbors`),

    // Search nodes
    search: (query: string, limit?: number) =>
        api.get<GraphNode[]>(`/graph/search?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ''}`),

    // Search nodes for CRUD (identity lookup)
    searchForCrud: (q: string, folderId?: string, limit?: number) => {
        let url = `/graph/nodes/search?q=${encodeURIComponent(q)}`;
        if (folderId) url += `&folder_id=${folderId}`;
        if (limit) url += `&limit=${limit}`;
        return api.get<{ nodes: any[]; count: number }>(url);
    },

    // Path finding
    findPath: (sourceId: string, targetId: string) =>
        api.get<{ path: string[]; links: GraphLink[] }>(`/graph/path?source=${sourceId}&target=${targetId}`),

    // Get layout positions
    getLayout: (folderId: string, algorithm?: string) =>
        api.get<Record<string, { x: number; y: number; z?: number }>>(`/graph/layout/${folderId}${algorithm ? `?algorithm=${algorithm}` : ''}`),

    // === CRUD Operations ===

    // Create a new node
    createNode: (data: {
        name: string;
        type: string;
        description?: string;
        properties?: Record<string, string>;
        folder_id?: string;
        file_id?: string;
        color?: string;
        size?: number;
    }) => api.post<{ success: boolean; node: any }>('/graph/nodes', data),

    // Update an existing node
    updateNode: (nodeId: string, data: {
        name?: string;
        type?: string;
        description?: string;
        properties?: Record<string, string>;
        color?: string;
        size?: number;
    }) => api.put<{ success: boolean; node_id: string; updated_fields: string[] }>(`/graph/nodes/${nodeId}`, data),

    // Delete a node
    deleteNode: (nodeId: string) =>
        api.delete<{ success: boolean; node_id: string; message: string }>(`/graph/nodes/${nodeId}`),

    // Create a relationship
    createRelationship: (data: {
        source_id: string;
        target_id: string;
        type: string;
        strength?: number;
        properties?: Record<string, string>;
    }) => api.post<{ success: boolean; relationship: any }>('/graph/relationships', data),

    // Delete a relationship
    deleteRelationship: (relationshipId: string) =>
        api.delete<{ success: boolean; relationship_id: string; message: string }>(`/graph/relationships/${relationshipId}`),

    // Get available node types
    getNodeTypes: () =>
        api.get<{ types: string[] }>('/graph/node-types'),

    // Get available relationship types
    getRelationshipTypes: () =>
        api.get<{ types: string[] }>('/graph/relationship-types'),
};

