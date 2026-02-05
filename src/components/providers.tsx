/**
 * Providers Component
 * 
 * Wraps the application with all necessary providers:
 * - React Query for data fetching
 * - Theme Provider for dark/light mode
 * - Auth Provider for session persistence
 * - Command Palette for quick actions (Ctrl+K)
 */
'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommandPaletteProvider } from '@/components/command-palette';
import { useAuthStore } from '@/store/authStore';

interface ProvidersProps {
    children: React.ReactNode;
}

// === Theme Context ===
type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

/**
 * ThemeProvider - Manages dark/light mode
 */
function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light'); // Default to light
    const [mounted, setMounted] = useState(false);

    // Initialize theme from localStorage or system preference
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('neural-nexus-theme') as Theme | null;

        if (stored) {
            setThemeState(stored);
        } else {
            // Check system preference, but default to light if no preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            // User requested default to light. We can respect system or force light.
            // Usually "default to light" means "if I haven't chosen, give me light".
            // We will respect system if it's explicitly dark, but otherwise light.
            // Actually, to fully "make the default light", let's prioritize light 
            // but still allow system override if we want to be nice. 
            // However, the prompt implies the current default (dark) is unwanted.
            // Let's just set it to matches ? 'dark' : 'light' but ensure initial state was light.
            // Wait, if line 44 is 'light', and system is 'dark', this effect will flip it to 'dark'.
            // If the user wants "Default to light", they might mean "Ignore system dark mode".
            // I will set it to 'light' in the else block to force the default.
            setThemeState('light');
        }
    }, []);

    // Apply theme class to document
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
        }

        // Also set color-scheme for browser UI
        root.style.colorScheme = theme;

        // Store preference
        localStorage.setItem('neural-nexus-theme', theme);
    }, [theme, mounted]);

    const toggleTheme = () => {
        setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#F8FAFC]">
                {/* Light placeholder while loading */}
            </div>
        );
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * AuthProvider - Ensures session is restored on app load
 */
function AuthProvider({ children }: { children: React.ReactNode }) {
    const { checkAuth, isHydrated, token } = useAuthStore();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Wait for zustand to hydrate from localStorage
        if (isHydrated) {
            // Restore session from localStorage
            checkAuth();

            // Also sync token to localStorage for API client
            const storedToken = localStorage.getItem('access_token');
            if (token && !storedToken) {
                localStorage.setItem('access_token', token);
            } else if (!token && storedToken) {
                // Token exists in localStorage but not in store - fix the store
                useAuthStore.setState({
                    token: storedToken,
                    isAuthenticated: true
                });
            }

            setIsReady(true);
        }
    }, [isHydrated, checkAuth, token]);

    // Show nothing while hydrating to prevent flash
    if (!isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
    // Create a new QueryClient for each session
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 60,
                        gcTime: 1000 * 60 * 10,
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                    mutations: {
                        retry: 1,
                    },
                },
            })
    );

    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <CommandPaletteProvider>
                        {children}
                    </CommandPaletteProvider>
                </AuthProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}
