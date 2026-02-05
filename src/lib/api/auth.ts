/**
 * Auth API
 * 
 * API calls for authentication.
 */
import { api, API_BASE_URL } from './client';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: {
        id: string;
        email: string;
        role: 'admin' | 'user';
    };
}

export interface User {
    id: string;
    email: string;
    role: 'admin' | 'user';
    created_at: string;
}

export const authApi = {
    // Login with email/password
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        const formData = new URLSearchParams();
        formData.append('username', credentials.email);
        formData.append('password', credentials.password);

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Login failed' }));
            throw new Error(error.detail);
        }

        return response.json();
    },

    // Register new user
    register: (data: { email: string; password: string }) =>
        api.post<LoginResponse>('/auth/register', data),

    // Get current user
    me: () => api.get<User>('/auth/me'),

    // Logout (client-side only)
    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
        }
    },

    // Save token
    saveToken: (token: string) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', token);
        }
    },

    // Check if logged in
    isLoggedIn: (): boolean => {
        if (typeof window === 'undefined') return false;
        return !!localStorage.getItem('access_token');
    },
};
