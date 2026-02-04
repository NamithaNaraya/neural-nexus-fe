/**
 * Graph Visualization Page
 * 
 * Full-page graph exploration with folder context.
 * Features:
 * - 3D/2D view toggle
 * - Progressive exploration
 * - Node selection and details
 * - Search and filter
 */
/**
 * Graph Visualization Page
 * 
 * Full-page graph exploration with folder context.
 * Features:
 * - 3D/2D view toggle
 * - Progressive exploration
 * - Node selection and details
 * - Search and filter
 */
'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useGraphStore } from '@/store/graphStore';
import { useFolderGraph } from '@/hooks/useApi';
import { GraphContainer } from '@/components/graph/GraphContainer';
import {
    Loader2,
    ArrowLeft,
    AlertCircle,
} from 'lucide-react';

function GraphContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const folderId = searchParams.get('folder');

    const { isAuthenticated } = useAuthStore();
    const { setGraphData, setGraphLoading, setActiveFolder, clearGraph } = useGraphStore();

    // Fetch graph data
    const { data: graphData, isLoading, error } = useFolderGraph(folderId || '');

    // Auth check
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, router]);

    // Set active folder
    useEffect(() => {
        if (folderId) {
            setActiveFolder(folderId);
        }
        return () => {
            clearGraph();
        };
    }, [folderId, setActiveFolder, clearGraph]);

    // Lifecycle logging
    useEffect(() => {
        console.log("GraphContent Mounted", { folderId });
    }, [folderId]);

    // Graph store data logging
    useEffect(() => {
        if (graphData) {
            console.log("Graph Data Received", {
                nodes: graphData.nodes?.length,
                links: graphData.links?.length
            });
        }
    }, [graphData]);

    // Graph store actions
    useEffect(() => {
        setGraphLoading(isLoading);

        if (graphData && !isLoading) {
            // Transform API response to graph format
            const nodes = (graphData.nodes || []).map((n: any) => ({
                id: n.id || n.entity_id,
                name: n.name || n.label,
                type: n.type || n.entity_type || 'default',
                description: n.description,
                properties: n.properties || {},
                x: n.x,
                y: n.y,
                z: n.z,
                degree: n.degree,
            }));

            const links = (graphData.relationships || graphData.links || []).map((l: any) => ({
                source: l.source || l.source_id,
                target: l.target || l.target_id,
                type: l.type || l.relationship_type || 'RELATED_TO',
                strength: l.strength || l.weight || 1,
            }));

            setGraphData(nodes, links);
        }
    }, [graphData, isLoading, setGraphData, setGraphLoading]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-emerald animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading knowledge graph...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Graph</h2>
                    <p className="text-muted-foreground mb-4">
                        {(error as Error).message || 'Unable to fetch graph data'}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go Back
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-emerald text-white rounded-lg hover:bg-emerald-dark transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // No folder selected
    if (!folderId) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">No Folder Selected</h2>
                    <p className="text-muted-foreground mb-4">
                        Select a topic folder to view its knowledge graph
                    </p>
                    <button
                        onClick={() => router.push('/library')}
                        className="px-4 py-2 bg-emerald text-white rounded-lg hover:bg-emerald-dark transition-colors"
                    >
                        Browse Library
                    </button>
                </div>
            </div>
        );
    }



    return (
        <GraphContainer
            folderId={folderId}
            initialMode="3d"
            showToolbar
            showSidebar
            initialShowInbox={searchParams.get('view') === 'inbox'}
            className="flex-1"
        />
    );
}

// Error Boundary for Graph Page
class PageErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Graph Page Crash:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-6">
                    <div className="max-w-2xl w-full bg-card border border-destructive/50 rounded-xl p-8 shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <AlertCircle className="w-12 h-12 text-destructive" />
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
                                <p className="text-muted-foreground">The graph visualization page encountered a critical error.</p>
                            </div>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4 mb-6 overflow-auto max-h-60 font-mono text-sm">
                            <p className="text-destructive font-semibold mb-2">{this.state.error?.name}: {this.state.error?.message}</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{this.state.error?.stack}</p>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                            >
                                Go to Dashboard
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-emerald text-white rounded-lg hover:bg-emerald-dark transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default function GraphPage() {
    return (
        <div className="h-screen w-full bg-background flex flex-col">
            <PageErrorBoundary>
                <Suspense fallback={
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-emerald animate-spin" />
                    </div>
                }>
                    <GraphContent />
                </Suspense>
            </PageErrorBoundary>
        </div>
    );
}
