/**
 * API Client
 * 
 * Centralized API client for backend communication.
 * Features:
 * - Automatic token injection
 * - Error handling
 * - Request/response interceptors
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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
        delete: (id: string) => `/folders/${id}`,
    },

    // Files
    files: {
        upload: '/upload',
        list: (folderId: string) => `/folders/${folderId}/files`,
        get: (id: string) => `/files/${id}`,
        delete: (id: string) => `/files/${id}`,
        status: (id: string) => `/files/${id}/status`,
    },

    // Graph
    graph: {
        folder: (folderId: string) => `/graph/folder/${folderId}`,
        file: (fileId: string) => `/graph/file/${fileId}`,
        expand: (nodeId: string) => `/graph/expand/${nodeId}`,
        path: (sourceId: string, targetId: string) => `/graph/path/${sourceId}/${targetId}`,
        search: '/graph/search',
    },

    // Query
    query: {
        ask: '/query',
        history: '/query/history',
    },

    // Analytics
    analytics: {
        centrality: (algorithm: string) => `/analytics/centrality/${algorithm}`,
        community: (algorithm: string) => `/analytics/community/${algorithm}`,
        similarity: (algorithm: string) => `/analytics/similarity/${algorithm}`,
        path: (algorithm: string) => `/analytics/path/${algorithm}`,
    },

    // Health
    health: {
        check: '/health',
        detailed: '/health/detailed',
    },
};

export default api;
