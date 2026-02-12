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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {isLoading ? (
                        [1, 2, 3, 4].map((i) => (
                            <div key={i} className="glass rounded-2xl p-6 animate-pulse h-28" />
                        ))
                    ) : (
                        stats.map((stat, index) => (
                            <div
                                key={stat.label}
                                className="glass-strong rounded-2xl p-6 card-interactive border border-white/5 bg-gradient-to-br from-white/5 to-transparent shadow-xl"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-black">
                                    {stat.label}
                                </div>
                                <div className="mt-3 flex items-baseline justify-between">
                                    <span className="text-3xl font-black tracking-tight text-foreground drop-shadow-sm">{stat.value}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                        {stat.trend === 'up' ? '↑' : '↓'} {stat.change}
                                    </span>
                                </div>
                                <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${stat.trend === 'up' ? 'bg-emerald-500' : 'bg-purple-500'}`}
                                        style={{ width: '65%', opacity: 0.5 }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Graph Preview */}
                    <div className="lg:col-span-2 glass-strong rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full" />

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h2 className="text-lg font-black tracking-tight uppercase">Knowledge Universe</h2>
                                <p className="text-xs text-muted-foreground mt-1">Real-time graph distribution</p>
                            </div>
                            <div className="flex gap-1.5 bg-black/20 p-1.5 rounded-xl border border-white/5">
                                {(['3d', '2d', 'charts'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`
                                            px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                            ${viewMode === mode
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Enhanced Graph Visual */}
                        <div className="relative h-[450px] rounded-2xl bg-black/20 overflow-hidden border border-white/5 flex items-center justify-center group/workspace">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]" />

                            {/* Neural Orb Visualization */}
                            <div className="relative flex items-center justify-center">
                                {/* Orbit Rings */}
                                <div className="absolute w-64 h-64 rounded-full border border-primary/10 animate-[spin_10s_linear_infinite]" />
                                <div className="absolute w-96 h-96 rounded-full border border-cyan-500/5 animate-[spin_15s_linear_infinite_reverse]" />

                                {/* Central Core */}
                                <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.4)] animate-pulse-neural">
                                    <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                                    </div>
                                </div>

                                {/* Floating Data Points */}
                                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                                    <div
                                        key={i}
                                        className="absolute w-3 h-3 rounded-full blur-[1px]"
                                        style={{
                                            background: i % 2 === 0 ? '#A855F7' : '#22D3EE',
                                            top: `${50 + 120 * Math.sin((i * Math.PI) / 4)}%`,
                                            left: `${50 + 120 * Math.cos((i * Math.PI) / 4)}%`,
                                            transform: 'translate(-50%, -50%)',
                                            animation: `float ${4 + i}s ease-in-out infinite`,
                                            boxShadow: `0 0 15px ${i % 2 === 0 ? '#A855F7' : '#22D3EE'}80`,
                                        }}
                                    />
                                ))}
                            </div>

                            {/* CTA Overlay - CLEANER */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/workspace:opacity-100 transition-all duration-500 backdrop-blur-sm">
                                <button
                                    onClick={() => router.push('/library')}
                                    className="px-8 py-3 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-full hover:scale-110 active:scale-95 transition-all shadow-2xl"
                                >
                                    Explore Graph
                                </button>
                            </div>

                            {/* Bottom Labels */}
                            <div className="absolute bottom-6 left-8 right-8 flex justify-between items-center text-[10px] text-muted-foreground/40 font-black tracking-[0.3em] uppercase">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Neural Core Active
                                </div>
                                <div>v2.0.4 // Cluster Stable</div>
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
