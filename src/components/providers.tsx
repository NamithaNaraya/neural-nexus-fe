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
import { Toaster } from 'sonner';
import { CommandPaletteProvider } from '@/components/command-palette';
import { useAuthStore } from '@/store/authStore';

import { useUIStore } from '@/store/uiStore';

interface ProvidersProps {
    children: React.ReactNode;
}

/**
 * ThemeProvider - Manages dark/light mode using the global UI store
 */
function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { theme, setTheme } = useUIStore();
    const [mounted, setMounted] = useState(false);

    // Initialize theme mounting flag
    useEffect(() => {
        setMounted(true);

        // Initial sync of document class
        if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', theme === 'dark');
            document.documentElement.style.colorScheme = theme;
        }
    }, [theme]);

    // Apply theme class to document on theme change
    useEffect(() => {
        if (!mounted || typeof document === 'undefined') return;

        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.style.colorScheme = theme;
    }, [theme, mounted]);

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#F8FAFC]">
                {/* Light placeholder while loading */}
            </div>
        );
    }

    return (
        <>
            {children}
        </>
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
                    <Toaster richColors closeButton position="top-right" theme="system" />
                    <CommandPaletteProvider>
                        {children}
                    </CommandPaletteProvider>
                </AuthProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}
