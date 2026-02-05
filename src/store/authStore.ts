/**
 * Authentication Store
 * 
 * Manages user authentication state using Zustand.
 * Handles JWT tokens, login, logout, and session persistence.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
    id: string;
    email: string;
    role: "admin" | "user";
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    isHydrated: boolean;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => void;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null,
            isHydrated: false,

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });

                try {
                    // Use a raw fetch with the correct URL logic or update the API client to handle form data
                    // For now, let's fix the duplication by using the correct base URL logic
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

                    // Remove double /api/v1 if it exists
                    const cleanUrl = baseUrl.endsWith('/api/v1')
                        ? `${baseUrl}/auth/login`
                        : `${baseUrl}/api/v1/auth/login`;

                    const response = await fetch(cleanUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: new URLSearchParams({
                            username: email,
                            password: password,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error("Invalid credentials");
                    }

                    const data = await response.json();

                    // Store token in localStorage for API client
                    localStorage.setItem('access_token', data.access_token);

                    set({
                        isAuthenticated: true,
                        user: {
                            id: data.user.id,
                            email: data.user.email,
                            role: data.user.role,
                        },
                        token: data.access_token,
                        isLoading: false,
                    });
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : "Login failed",
                    });
                    throw error;
                }
            },

            logout: () => {
                // Clear token from localStorage
                localStorage.removeItem('access_token');

                set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    error: null,
                });
            },

            checkAuth: () => {
                const state = get();
                // Check if we have a token in the store OR in localStorage directly
                const localToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
                const effectiveToken = state.token || localToken;

                if (effectiveToken) {
                    // Ensure localStorage is synced
                    if (localToken !== effectiveToken && effectiveToken) {
                        localStorage.setItem('access_token', effectiveToken);
                    }

                    // Restore full auth state
                    set({
                        isAuthenticated: true,
                        token: effectiveToken,
                        // Keep existing user if available
                        user: state.user || null,
                    });
                } else {
                    set({ isAuthenticated: false, user: null, token: null });
                }
            },

            clearError: () => {
                set({ error: null });
            },
        }),
        {
            name: "neural-nexus-auth",
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isHydrated = true;
                    // Sync token to localStorage for the API client
                    if (state.token) {
                        localStorage.setItem('access_token', state.token);
                    }
                }
            },
        }
    )
);
