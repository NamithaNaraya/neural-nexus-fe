/**
 * API Client
 * 
 * Centralized API client for backend communication.
 * Features:
 * - Automatic token injection
 * - Error handling
 * - Request/response interceptors
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface RequestConfig extends RequestInit {
    params?: Record<string, string | number | boolean>;
}

interface APIError {
    message: string;
    status: number;
    detail?: string;
}

class APIClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('access_token');
    }

    private async request<T>(
        endpoint: string,
        config: RequestConfig = {}
    ): Promise<T> {
        const { params, ...fetchConfig } = config;

        // Build URL with query params
        let url = `${this.baseUrl}${endpoint}`;
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                searchParams.append(key, String(value));
            });
            url += `?${searchParams.toString()}`;
        }

        // Add auth header
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(config.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...fetchConfig,
                headers,
            });

            if (!response.ok) {
                const error: APIError = {
                    message: 'Request failed',
                    status: response.status,
                };

                try {
                    const errorData = await response.json();
                    error.detail = errorData.detail || errorData.message;
                } catch {
                    // Ignore JSON parse errors
                }

                throw error;
            }

            // Handle empty responses
            const text = await response.text();
            return text ? JSON.parse(text) : {} as T;

        } catch (error) {
            if ((error as APIError).status) {
                throw error;
            }
            throw {
                message: 'Network error',
                status: 0,
                detail: (error as Error).message,
            };
        }
    }

    // HTTP Methods
    async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', params });
    }

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async patch<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    // File upload
    async upload<T>(endpoint: string, formData: FormData): Promise<T> {
        const token = this.getToken();
        const headers: Record<string, string> = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error: APIError = {
                message: 'Upload failed',
                status: response.status,
            };

            try {
                const errorData = await response.json();
                error.detail = errorData.detail;
            } catch {
                // Ignore JSON parse errors
            }

            throw error;
        }

        return response.json();
    }
}

// Create singleton instance
export const api = new APIClient(API_BASE_URL);

// API Endpoints
export const endpoints = {
    // Auth
    auth: {
        login: '/auth/login',
        register: '/auth/register',
        me: '/auth/me',
        changePassword: '/auth/change-password',
    },

    // Folders
    folders: {
        list: '/folders',
        create: '/folders',
        get: (id: string) => `/folders/${id}`,
        update: (id: string) => `/folders/${id}`,
        delete: (id: string) => `/deletion/folder/${id}`,
    },

    // Files
    files: {
        upload: '/upload',
        list: (folderId: string) => `/folders/${folderId}/files`,
        get: (id: string) => `/files/${id}`,
        delete: (id: string) => `/deletion/file/${id}`,
        status: (id: string) => `/files/${id}/status`,
        pending: '/files/pending',
        preview: (id: string) => `/files/${id}/extraction-preview`,
        extraction: (id: string) => `/files/${id}/extraction`,
        approve: (id: string) => `/files/${id}/approve`,
        reject: (id: string) => `/files/${id}/reject`,
    },

    // Graph
    graph: {
        folder: (folderId: string) => `/graph/folder/${folderId}`,
        file: (fileId: string) => `/graph/file/${fileId}`,
        expand: (nodeId: string) => `/graph/expand/${nodeId}`,
        path: (sourceId: string, targetId: string) => `/graph/path/${sourceId}/${targetId}`,
        search: '/graph/search',
        compare: '/graph/compare',
        blindSpots: (folderId: string) => `/graph/blind-spots/${folderId}`,
        crossTopic: '/graph/blind-spots/cross-topic',
        export: (folderId: string) => `/graph/export/${folderId}`,
        layout: (folderId: string) => `/graph/layout/${folderId}`,
    },

    // Query
    query: {
        ask: '/query',
        history: (sessionId: string) => `/query/chat/history/${sessionId}`,
        sessions: '/query/chat/sessions',
    },

    // Analytics
    analytics: {
        centrality: (algorithm: string) => `/analytics/centrality/${algorithm}`,
        community: (algorithm: string) => `/analytics/community/${algorithm}`,
        similarity: (algorithm: string) => `/analytics/similarity/${algorithm}`,
        path: (algorithm: string) => `/analytics/path/${algorithm}`,
        health: '/analytics/health',
        completeness: '/analytics/completeness',
        linkPrediction: '/analytics/link-prediction',
    },

    // Dashboard
    dashboard: {
        stats: '/dashboard/stats',
        activity: '/dashboard/activity',
    },

    // Health
    health: {
        check: '/health',
        detailed: '/health/detailed',
    },
};

// Higher-level API methods
export const docAiApi = {
    // Graph operations
    graph: {
        // Get folder graph data
        getFolder: (folderId: string, options?: { type?: string; limit?: number }) =>
            api.get(endpoints.graph.folder(folderId), options),

        // Expand node connections
        expand: (nodeId: string, depth?: number) =>
            api.get(endpoints.graph.expand(nodeId), { depth: depth || 1 }),

        // Find shortest path
        findPath: (sourceId: string, targetId: string) =>
            api.get(endpoints.graph.path(sourceId, targetId)),

        // Compare two clusters
        compare: (data: {
            left: { type: string; id: string; node_ids?: string[] };
            right: { type: string; id: string; node_ids?: string[] };
            include_bridges?: boolean;
            include_similarity?: boolean;
        }) => api.post(endpoints.graph.compare, data),

        // Discover blind spots
        discoverBlindSpots: (
            folderId: string,
            options?: { method?: string; min_confidence?: number; limit?: number }
        ) => api.get(endpoints.graph.blindSpots(folderId), options),

        // Cross-topic bridges
        findCrossTopicBridges: (folderIds: string[]) =>
            api.get(endpoints.graph.crossTopic, { folder_ids: folderIds.join(',') }),

        // Export analytics
        exportAnalytics: (
            folderId: string,
            options?: {
                format?: string;
                include_centrality?: boolean;
                include_clustering?: boolean;
                include_ghost_lines?: boolean;
                include_health?: boolean;
            }
        ) => api.get(endpoints.graph.export(folderId), options),

        // Get layout
        getLayout: (
            folderId: string,
            options?: { algorithm?: string; iterations?: number; scale?: number }
        ) => api.get(endpoints.graph.layout(folderId), options),
    },

    // Query operations (Hybrid RAG)
    query: {
        // Ask a question
        ask: (data: {
            question: string;
            scope?: { type: string; id: string };
            session_id?: string;
            clear_history?: boolean;
        }) => api.post(endpoints.query.ask, data),

        // Get chat history
        getHistory: (sessionId: string, limit?: number) =>
            api.get(endpoints.query.history(sessionId), { limit: limit || 20 }),

        // List sessions
        getSessions: () => api.get(endpoints.query.sessions),
    },

    // Analytics operations
    analytics: {
        // Run algorithm
        runAlgorithm: (category: string, algorithm: string, options?: Record<string, any>) => {
            const endpoint = (endpoints.analytics as any)[category]?.(algorithm);
            return endpoint ? api.get(endpoint, options) : Promise.reject('Unknown algorithm');
        },

        // Get graph health
        getHealth: (folderId?: string) =>
            api.get(endpoints.analytics.health, folderId ? { folder_id: folderId } : undefined),

        // Get completeness score
        getCompleteness: (folderId?: string) =>
            api.get(endpoints.analytics.completeness, folderId ? { folder_id: folderId } : undefined),

        // Get link predictions
        getLinkPredictions: (folderId?: string, options?: { method?: string; top_k?: number }) => {
            const params: Record<string, string | number | boolean> = {};
            if (folderId) params.folder_id = folderId;
            if (options?.method) params.method = options.method;
            if (options?.top_k) params.top_k = options.top_k;
            return api.get(endpoints.analytics.linkPrediction, params);
        },
    },

    // File operations
    files: {
        // List pending files for review
        listPending: () => api.get(endpoints.files.pending),

        // Get extraction preview for a file
        getExtractionPreview: (fileId: string) => api.get(endpoints.files.preview(fileId)),

        // Update extraction data
        updateExtraction: (fileId: string, data: { entities: any[], relationships: any[] }) =>
            api.put(endpoints.files.extraction(fileId), data),

        // Approve file ingestion
        approveIngestion: (fileId: string) => api.post(endpoints.files.approve(fileId)),

        // Reject file ingestion
        rejectIngestion: (fileId: string) => api.post(endpoints.files.reject(fileId)),

        // Get file status
        getStatus: (fileId: string) => api.get(endpoints.files.status(fileId)),

        // Delete file
        deleteFile: (fileId: string) => api.delete(endpoints.files.delete(fileId)),
    },

    // Folder operations
    folders: {
        // List all folders
        list: () => api.get(endpoints.folders.list),

        // List files in a folder
        getFiles: (folderId: string) => api.get(endpoints.files.list(folderId)),

        // Create folder
        create: (data: { name: string; description?: string; parent_id?: string }) =>
            api.post(endpoints.folders.create, data),

        // Get folder details
        get: (folderId: string) => api.get(endpoints.folders.get(folderId)),

        // Update folder
        update: (folderId: string, data: { name?: string; description?: string }) =>
            api.patch(endpoints.folders.update(folderId), data),

        // Delete folder
        delete: (folderId: string) => api.delete(endpoints.folders.delete(folderId)),

        // Get folder permissions
        getPermissions: (folderId: string) =>
            api.get(`/folders/${folderId}/permissions`),

        // Update folder permissions
        updatePermissions: (folderId: string, data: {
            user_id: string;
            permission: 'read' | 'write' | 'admin'
        }) => api.post(`/folders/${folderId}/permissions`, data),

        // Remove folder permissions
        removePermissions: (folderId: string, userId: string) =>
            api.delete(`/folders/${folderId}/permissions/${userId}`),
    },

    // Dashboard operations
    dashboard: {
        getStats: () => api.get(endpoints.dashboard.stats),
        getActivity: (limit?: number) => api.get(endpoints.dashboard.activity, { limit: limit || 5 }),
    },
};

export default api;

