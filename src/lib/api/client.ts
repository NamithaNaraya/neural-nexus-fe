/**
 * API Client
 * 
 * Centralized API client with authentication, error handling, and typed responses.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ApiError {
    detail: string;
    status_code: number;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    status_code: number;
}

// Get auth token from localStorage
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
}

// Base fetch with auth headers
async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getAuthToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
            detail: 'An unexpected error occurred',
            status_code: response.status,
        }));
        throw new Error(error.detail);
    }

    return response.json();
}

// HTTP Methods
export const api = {
    get: <T>(endpoint: string) => fetchWithAuth<T>(endpoint, { method: 'GET' }),

    post: <T>(endpoint: string, data?: unknown) => fetchWithAuth<T>(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    }),

    put: <T>(endpoint: string, data?: unknown) => fetchWithAuth<T>(endpoint, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
    }),

    patch: <T>(endpoint: string, data?: unknown) => fetchWithAuth<T>(endpoint, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
    }),

    delete: <T>(endpoint: string) => fetchWithAuth<T>(endpoint, { method: 'DELETE' }),
};

export { API_BASE_URL };
