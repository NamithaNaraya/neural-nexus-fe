/**
 * Dashboard Page
 * 
 * Main dashboard for exploring knowledge graphs.
 * Features:
 * - 3D/2D graph visualization
 * - Quick stats
 * - Recent activity
 * - Quick actions
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useGraphStore } from '@/store/graphStore';
import { docAiApi } from '@/lib/api';

export default function DashboardPage() {
    const router = useRouter();
    const { isAuthenticated, isHydrated, checkAuth } = useAuthStore();
    const { viewMode, setViewMode } = useUIStore();
    const { nodeCount, linkCount, nodeTypes } = useGraphStore();

    const [stats, setStats] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Check authentication
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Fetch dashboard data
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                const [statsData, activityData] = await Promise.all([
                    docAiApi.dashboard.getStats(),
                    docAiApi.dashboard.getActivity(5)
                ]);
                setStats(statsData as any[]);
                setRecentActivity(activityData as any[]);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [isAuthenticated]);

    // Redirect if not authenticated (only after store has hydrated)
    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isHydrated, router]);

    if (!isHydrated || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <DashboardLayout
            breadcrumbs={[
                { label: 'Library', href: '/library' },
                { label: 'Dashboard' },
            ]}
        >
            <div className="p-6 space-y-6 animate-fade-in">
                {/* Welcome Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Neural Nexus Dashboard</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Explore and analyze your knowledge graph
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push('/library')}
                            className="btn-neural"
                        >
                            + Upload File
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoading ? (
                        [1, 2, 3, 4].map((i) => (
                            <div key={i} className="glass rounded-xl p-4 animate-pulse h-24" />
                        ))
                    ) : (
                        stats.map((stat, index) => (
                            <div
                                key={stat.label}
                                className="glass rounded-xl p-4 card-interactive"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                    {stat.label}
                                </div>
                                <div className="mt-2 flex items-end justify-between">
                                    <span className="text-2xl font-bold">{stat.value}</span>
                                    <span className={`text-xs ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {stat.change}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Graph Preview */}
                    <div className="lg:col-span-2 glass rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold">Knowledge Graph</h2>
                            <div className="flex gap-1">
                                {(['3d', '2d', 'charts'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`
                                            px-3 py-1 rounded-lg text-xs font-medium transition-colors
                                            ${viewMode === mode
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        {mode.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Graph Placeholder */}
                        <div className="relative h-[400px] rounded-lg bg-neural-bg/50 overflow-hidden neural-border">
                            <div className="absolute inset-0 flex items-center justify-center">
                                {/* Animated Graph Placeholder */}
                                <div className="relative">
                                    {/* Central Node */}
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-electric animate-pulse-neural flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                        </svg>
                                    </div>

                                    {/* Orbiting Nodes */}
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className="absolute w-6 h-6 rounded-full"
                                            style={{
                                                background: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][i],
                                                top: `${50 + 80 * Math.sin((i * Math.PI) / 3)}%`,
                                                left: `${50 + 80 * Math.cos((i * Math.PI) / 3)}%`,
                                                transform: 'translate(-50%, -50%)',
                                                animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                                                animationDelay: `${i * 0.2}s`,
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* CTA Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => router.push('/library')}
                                        className="btn-neural"
                                    >
                                        Open Graph Library
                                    </button>
                                </div>
                            </div>

                            {/* Graph Stats */}
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-muted-foreground font-mono">
                                <span>SYSTEM_READY</span>
                                <span>HYBRID_RAG_ACTIVE</span>
                                <span>{nodeCount || stats.find(s => s.label === 'Total Nodes')?.value || 0} NODES</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="glass rounded-xl p-6">
                        <h2 className="font-semibold mb-4">Recent Activity</h2>

                        <div className="space-y-3">
                            {isLoading ? (
                                [1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="w-8 h-8 rounded-lg bg-white/5" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-white/5 rounded w-3/4" />
                                            <div className="h-2 bg-white/5 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))
                            ) : recentActivity.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground text-sm">
                                    No recent activity found.
                                </div>
                            ) : (
                                recentActivity.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm">
                                                <span className="font-medium">{activity.action}</span>{' '}
                                                <span className="text-muted-foreground truncate block">{activity.target}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">{activity.time}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => router.push('/dashboard/audit')}
                            className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-t border-white/5 pt-4"
                        >
                            View Audit Log →
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass rounded-xl p-6">
                    <h2 className="font-semibold mb-4">Quick Actions</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: '📁', label: 'Create Topic', action: () => router.push('/library?action=create') },
                            { icon: '📤', label: 'Upload Files', action: () => router.push('/library') },
                            { icon: '🔍', label: 'Search Graph', action: () => router.push('/library') },
                            { icon: '📊', label: 'Run Analysis', action: () => router.push('/library?view=analytics') },
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center group"
                            >
                                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                                    {item.icon}
                                </div>
                                <div className="text-sm font-medium">{item.label}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
