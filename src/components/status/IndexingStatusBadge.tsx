/**
 * Indexing Status Badge
 * 
 * Compact indicator showing database index population status.
 * Displays warnings when indexes are being built.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Database,
    CheckCircle2,
    Loader2,
    AlertTriangle,
    ChevronDown,
} from 'lucide-react';

interface IndexStatus {
    neo4j: {
        total: number;
        online: number;
        populating: number;
        avg_population_percent: number;
        all_ready: boolean;
    };
    postgresql: {
        total: number;
        online: number;
        all_ready: boolean;
    };
    overall_ready: boolean;
}

interface IndexingStatusBadgeProps {
    className?: string;
    pollInterval?: number;
    showDetails?: boolean;
}

export function IndexingStatusBadge({
    className = '',
    pollInterval = 10000, // 10 seconds
    showDetails = true,
}: IndexingStatusBadgeProps) {
    const [status, setStatus] = useState<IndexStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    // Fetch index status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('/api/v1/health/indexes');
                if (response.ok) {
                    const data = await response.json();
                    setStatus(data);
                }
            } catch (error) {
                console.error('Failed to fetch index status:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();

        // Only poll while indexes are populating
        if (status && !status.overall_ready) {
            const interval = setInterval(fetchStatus, pollInterval);
            return () => clearInterval(interval);
        }
    }, [pollInterval, status?.overall_ready]);

    if (isLoading) {
        return (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted ${className}`}>
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Checking...</span>
            </div>
        );
    }

    if (!status) return null;

    const isReady = status.overall_ready;
    const isPopulating = !isReady && (status.neo4j.populating > 0);

    // Hide when everything is ready and stable
    if (isReady && !showDetails) return null;

    return (
        <div className={`relative ${className}`}>
            {/* Badge */}
            <button
                onClick={() => showDetails && setIsExpanded(!isExpanded)}
                disabled={!showDetails}
                className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all
                    ${isReady
                        ? 'border-emerald/30 bg-emerald/10 text-emerald'
                        : isPopulating
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                            : 'border-red-500/30 bg-red-500/10 text-red-500'
                    }
                    ${showDetails ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                `}
            >
                {isReady ? (
                    <CheckCircle2 className="w-3 h-3" />
                ) : isPopulating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <AlertTriangle className="w-3 h-3" />
                )}
                <span className="text-xs font-medium">
                    {isReady
                        ? 'Indexes Ready'
                        : isPopulating
                            ? `Indexing ${Math.round(status.neo4j.avg_population_percent)}%`
                            : 'Index Error'
                    }
                </span>
                {showDetails && (
                    <ChevronDown
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                )}
            </button>

            {/* Details Dropdown */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -5, height: 0 }}
                        className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50"
                    >
                        <div className="p-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">Index Status</span>
                            </div>
                        </div>

                        <div className="p-3 space-y-3">
                            {/* Neo4j */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Neo4j</span>
                                    <span className="font-medium">
                                        {status.neo4j.online}/{status.neo4j.total}
                                    </span>
                                </div>
                                {status.neo4j.populating > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{status.neo4j.populating} populating</span>
                                            <span>{status.neo4j.avg_population_percent.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: `${status.neo4j.avg_population_percent}%`,
                                                }}
                                                className="h-full bg-amber-500"
                                            />
                                        </div>
                                    </div>
                                )}
                                {status.neo4j.all_ready && (
                                    <div className="flex items-center gap-1 text-xs text-emerald">
                                        <CheckCircle2 className="w-3 h-3" />
                                        All indexes online
                                    </div>
                                )}
                            </div>

                            {/* PostgreSQL */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">PostgreSQL</span>
                                    <span className="font-medium">
                                        {status.postgresql.online}/{status.postgresql.total}
                                    </span>
                                </div>
                                {status.postgresql.all_ready && (
                                    <div className="flex items-center gap-1 text-xs text-emerald">
                                        <CheckCircle2 className="w-3 h-3" />
                                        All indexes online
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Note */}
                        {!isReady && (
                            <div className="px-3 py-2 bg-amber-500/5 border-t border-amber-500/20">
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Query performance may be reduced while indexes are building.
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
