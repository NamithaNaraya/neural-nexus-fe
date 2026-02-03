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

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });

                try {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                            body: new URLSearchParams({
                                username: email,
                                password: password,
                            }),
                        }
                    );

                    if (!response.ok) {
                        throw new Error("Invalid credentials");
                    }

                    const data = await response.json();

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
                set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    error: null,
                });
            },

            checkAuth: () => {
                const { token } = get();
                if (token) {
                    // Token exists, consider authenticated
                    // In production, validate token with backend
                    set({ isAuthenticated: true });
                } else {
                    set({ isAuthenticated: false });
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
        }
    )
);
