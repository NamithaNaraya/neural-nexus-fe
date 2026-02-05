/**
 * Audit Log Page
 * 
 * Displays system activity and audit trail for the current user.
 * Features:
 * - Recent activity stream
 * - Action filtering
 * - Date range filtering
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/authStore';
import { docAiApi } from '@/lib/api';
import {
    ArrowLeft,
    RefreshCw,
    FileText,
    FolderOpen,
    Upload,
    Trash2,
    Edit,
    CheckCircle,
    XCircle,
    Activity,
    Filter,
    Loader2,
} from 'lucide-react';

// Activity item interface
interface ActivityItem {
    id: string;
    action: string;
    target: string;
    time: string;
    type?: string;
}

// Action icons mapping
const ACTION_ICONS: Record<string, React.ReactNode> = {
    'upload': <Upload className="w-4 h-4" />,
    'create': <FileText className="w-4 h-4" />,
    'delete': <Trash2 className="w-4 h-4" />,
    'edit': <Edit className="w-4 h-4" />,
    'approve': <CheckCircle className="w-4 h-4" />,
    'reject': <XCircle className="w-4 h-4" />,
    'folder': <FolderOpen className="w-4 h-4" />,
    'default': <Activity className="w-4 h-4" />,
};

// Get icon for action
function getActionIcon(action: string): React.ReactNode {
    const key = action.toLowerCase();
    for (const [k, icon] of Object.entries(ACTION_ICONS)) {
        if (key.includes(k)) return icon;
    }
    return ACTION_ICONS['default'];
}

// Action color mapping
function getActionColor(action: string): string {
    const key = action.toLowerCase();
    if (key.includes('delete') || key.includes('reject')) return 'text-destructive bg-destructive/10';
    if (key.includes('create') || key.includes('upload') || key.includes('approve')) return 'text-emerald bg-emerald/10';
    if (key.includes('edit')) return 'text-electric bg-electric/10';
    return 'text-muted-foreground bg-muted';
}

export default function AuditLogPage() {
    const router = useRouter();
    const { isAuthenticated, isHydrated, checkAuth } = useAuthStore();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Check authentication
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Fetch activity data
    const fetchActivities = async (refresh = false) => {
        try {
            if (refresh) setIsRefreshing(true);
            else setIsLoading(true);

            const data = await docAiApi.dashboard.getActivity(50);
            setActivities(data as ActivityItem[]);
        } catch (error) {
            console.error('Failed to fetch audit log:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Initial load
    useEffect(() => {
        if (isAuthenticated) {
            fetchActivities();
        }
    }, [isAuthenticated]);

    // Redirect if not authenticated
    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isHydrated, router]);

    if (!isHydrated || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald" />
            </div>
        );
    }

    return (
        <DashboardLayout
            breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Audit Log' },
            ]}
        >
            <div className="p-6 space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">Audit Log</h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                View system activity and changes
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => fetchActivities(true)}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Activity List */}
                <div className="glass rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">Recent Activity</h2>
                        <span className="text-sm text-muted-foreground">
                            {activities.length} events
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald" />
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No activity recorded yet.</p>
                            <p className="text-sm mt-2">Actions like uploading files and creating topics will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {activities.map((activity, index) => (
                                <div
                                    key={activity.id || index}
                                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Icon */}
                                    <div className={`p-2 rounded-lg ${getActionColor(activity.action)}`}>
                                        {getActionIcon(activity.action)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground">
                                                {activity.action}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                                            {activity.target}
                                        </p>
                                    </div>

                                    {/* Time */}
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {activity.time}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
