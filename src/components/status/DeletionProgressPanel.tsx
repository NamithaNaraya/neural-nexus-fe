/**
 * Deletion Progress Panel
 * 
 * Shows progress of background deletion operations.
 * Displays reference counting information and preserved nodes.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trash2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X,
    RefreshCw,
    Users,
    FileX,
    FolderX,
} from 'lucide-react';

interface DeletionJob {
    job_id: string;
    target_type: 'file' | 'folder';
    target_id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    message: string;
    stats: {
        nodes_deleted: number;
        relationships_deleted: number;
        nodes_preserved: number;
    };
}

interface DeletionProgressPanelProps {
    className?: string;
    onJobComplete?: (job: DeletionJob) => void;
}

export function DeletionProgressPanel({
    className = '',
    onJobComplete,
}: DeletionProgressPanelProps) {
    const [jobs, setJobs] = useState<DeletionJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    // Fetch active jobs
    const fetchJobs = useCallback(async () => {
        try {
            const response = await fetch('/api/v1/deletion/jobs');
            if (response.ok) {
                const data = await response.json();
                setJobs(data);

                // Check for completed jobs
                data.forEach((job: DeletionJob) => {
                    if (job.status === 'completed') {
                        onJobComplete?.(job);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to fetch deletion jobs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [onJobComplete]);

    // Poll for updates
    useEffect(() => {
        fetchJobs();

        // Poll every 2 seconds for active jobs
        const hasActiveJobs = jobs.some(
            (j) => j.status === 'pending' || j.status === 'in_progress'
        );

        if (hasActiveJobs) {
            const interval = setInterval(fetchJobs, 2000);
            return () => clearInterval(interval);
        }
    }, [fetchJobs, jobs]);

    // Filter to show only relevant jobs
    const activeJobs = jobs.filter(
        (j) => j.status === 'pending' || j.status === 'in_progress'
    );
    const recentJobs = jobs
        .filter((j) => j.status === 'completed' || j.status === 'failed')
        .slice(0, 5);

    const hasJobs = activeJobs.length > 0 || recentJobs.length > 0;

    if (!hasJobs && !isLoading) {
        return null; // Hide panel when no jobs
    }

    return (
        <div className={`relative ${className}`}>
            {/* Floating Badge */}
            {activeJobs.length > 0 && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card border-amber-500/30 hover:border-amber-500/50 transition-all"
                >
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span className="text-sm font-medium">
                        {activeJobs.length} deletion{activeJobs.length > 1 ? 's' : ''} in progress
                    </span>
                </button>
            )}

            {/* Expanded Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="absolute top-full right-0 mt-2 w-96 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                    >
                        {/* Header */}
                        <div className="p-3 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trash2 className="w-4 h-4 text-amber-500" />
                                <h3 className="font-semibold text-foreground">
                                    Deletion Operations
                                </h3>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={fetchJobs}
                                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <RefreshCw
                                        className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                                    />
                                </button>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Active Jobs */}
                        {activeJobs.length > 0 && (
                            <div className="p-3 space-y-3">
                                <div className="text-xs font-medium text-muted-foreground">
                                    Active
                                </div>
                                {activeJobs.map((job) => (
                                    <JobCard key={job.job_id} job={job} />
                                ))}
                            </div>
                        )}

                        {/* Recent Jobs */}
                        {recentJobs.length > 0 && (
                            <div className="p-3 border-t border-border space-y-2">
                                <div className="text-xs font-medium text-muted-foreground">
                                    Recent
                                </div>
                                {recentJobs.map((job) => (
                                    <JobCard key={job.job_id} job={job} compact />
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Job Card Component
function JobCard({ job, compact = false }: { job: DeletionJob; compact?: boolean }) {
    const isActive = job.status === 'pending' || job.status === 'in_progress';
    const isCompleted = job.status === 'completed';
    const isFailed = job.status === 'failed';

    const Icon = job.target_type === 'folder' ? FolderX : FileX;
    const StatusIcon = isActive
        ? Loader2
        : isCompleted
            ? CheckCircle2
            : AlertCircle;

    return (
        <div
            className={`
                p-3 rounded-lg border transition-all
                ${isActive ? 'border-amber-500/30 bg-amber-500/5' : ''}
                ${isCompleted ? 'border-emerald/30 bg-emerald/5' : ''}
                ${isFailed ? 'border-red-500/30 bg-red-500/5' : ''}
            `}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`
                        p-2 rounded-lg
                        ${isActive ? 'bg-amber-500/10' : ''}
                        ${isCompleted ? 'bg-emerald/10' : ''}
                        ${isFailed ? 'bg-red-500/10' : ''}
                    `}
                >
                    <Icon
                        className={`w-4 h-4
                            ${isActive ? 'text-amber-500' : ''}
                            ${isCompleted ? 'text-emerald' : ''}
                            ${isFailed ? 'text-red-500' : ''}
                        `}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground capitalize">
                            {job.target_type} Deletion
                        </span>
                        <StatusIcon
                            className={`w-4 h-4
                                ${isActive ? 'animate-spin text-amber-500' : ''}
                                ${isCompleted ? 'text-emerald' : ''}
                                ${isFailed ? 'text-red-500' : ''}
                            `}
                        />
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {job.message}
                    </p>

                    {/* Progress Bar */}
                    {isActive && !compact && (
                        <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>Progress</span>
                                <span>{Math.round(job.progress * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 transition-all duration-300"
                                    style={{ width: `${job.progress * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    {!compact && (isCompleted || job.stats.nodes_deleted > 0) && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{job.stats.nodes_deleted} deleted</span>
                            {job.stats.nodes_preserved > 0 && (
                                <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {job.stats.nodes_preserved} preserved
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
