/**
 * Providers Component
 * 
 * Wraps the application with all necessary providers:
 * - React Query for data fetching
 */
'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    // Create a new QueryClient for each session
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Stale time: how long data is considered fresh
                        staleTime: 1000 * 60, // 1 minute
                        // Cache time: how long inactive data stays in cache
                        gcTime: 1000 * 60 * 10, // 10 minutes
                        // Retry failed requests
                        retry: 1,
                        // Refetch on window focus (good for real-time data)
                        refetchOnWindowFocus: false,
                    },
                    mutations: {
                        // Retry mutations once on failure
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
