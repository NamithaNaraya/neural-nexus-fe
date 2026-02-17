/**
 * System Health Indicator
 * 
 * Real-time system health status display.
 * Shows connectivity status, index population, and alerts.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Database,
    Server,
    Cpu,
    HardDrive,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    RefreshCw,
    ChevronDown,
    Zap,
    Clock,
} from 'lucide-react';

interface ServiceStatus {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    latency_ms?: number;
    message?: string;
    details?: Record<string, unknown>;
    checked_at: string;
}

interface HealthData {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, ServiceStatus>;
    checked_at: string;
    version: string;
}

interface IndexSummary {
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

interface SystemHealthIndicatorProps {
    className?: string;
    compact?: boolean;
    pollInterval?: number; // ms
}

const STATUS_COLORS = {
    healthy: 'text-emerald bg-emerald/10 border-emerald/30',
    degraded: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    unhealthy: 'text-red-500 bg-red-500/10 border-red-500/30',
    unknown: 'text-muted-foreground bg-muted border-border',
};

const STATUS_ICONS = {
    healthy: CheckCircle2,
    degraded: AlertTriangle,
    unhealthy: AlertCircle,
    unknown: Activity,
};

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    neo4j: Database,
    postgresql: Server,
    redis: Zap,
    ollama: Cpu,
};

export function SystemHealthIndicator({
    className = '',
    compact = false,
    pollInterval = 30000, // 30 seconds
}: SystemHealthIndicatorProps) {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [indexes, setIndexes] = useState<IndexSummary | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Fetch health status
    const fetchHealth = useCallback(async () => {
        try {
            const [healthRes, indexRes] = await Promise.all([
                fetch('/api/v1/health/detailed'),
                fetch('/api/v1/health/indexes'),
            ]);

            if (healthRes.ok) {
                const healthData = await healthRes.json();
                setHealth(healthData);
            }

            if (indexRes.ok) {
                const indexData = await indexRes.json();
                setIndexes(indexData);
            }

            setLastRefresh(new Date());
        } catch (error) {
            console.error('Health check failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch and polling
    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, pollInterval);
        return () => clearInterval(interval);
    }, [fetchHealth, pollInterval]);

    // Manual refresh
    const handleRefresh = () => {
        setIsLoading(true);
        fetchHealth();
    };

    if (!health && isLoading) {
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted ${className}`}>
                <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Checking...</span>
            </div>
        );
    }

    const overallStatus = health?.status || 'unknown';
    const StatusIcon = STATUS_ICONS[overallStatus];
    const statusColor = STATUS_COLORS[overallStatus];

    // Compact mode - just show indicator
    if (compact) {
        return (
            <div
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${statusColor} ${className}`}
                title={`System: ${overallStatus}`}
            >
                <StatusIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium capitalize">{overallStatus}</span>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            {/* Main Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all
                    ${statusColor}
                    hover:shadow-md
                `}
            >
                <StatusIcon className="w-4 h-4" />
                <span className="text-sm font-medium capitalize">{overallStatus}</span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Expanded Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                    >
                        {/* Header */}
                        <div className="p-3 border-b border-border flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-foreground">System Health</h3>
                                <p className="text-xs text-muted-foreground">v{health?.version}</p>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={isLoading}
                                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                            >
                                <RefreshCw
                                    className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                                />
                            </button>
                        </div>

                        {/* Services */}
                        <div className="p-3 space-y-2">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                                Services
                            </div>
                            {health?.services &&
                                Object.entries(health.services).map(([name, service]) => (
                                    <ServiceRow
                                        key={name}
                                        name={name}
                                        service={service}
                                    />
                                ))}
                        </div>

                        {/* Index Status */}
                        {indexes && (
                            <div className="p-3 border-t border-border">
                                <div className="text-xs font-medium text-muted-foreground mb-2">
                                    Index Population
                                </div>
                                <div className="space-y-2">
                                    <IndexRow
                                        name="Neo4j"
                                        online={indexes.neo4j.online}
                                        total={indexes.neo4j.total}
                                        populating={indexes.neo4j.populating}
                                        percent={indexes.neo4j.avg_population_percent}
                                    />
                                    <IndexRow
                                        name="PostgreSQL"
                                        online={indexes.postgresql.online}
                                        total={indexes.postgresql.total}
                                        populating={0}
                                        percent={100}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Last Updated */}
                        <div className="p-3 border-t border-border bg-muted/30">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
                                <Clock className="w-3 h-3" />
                                <span>
                                    Updated{' '}
                                    {lastRefresh
                                        ? formatRelativeTime(lastRefresh)
                                        : 'never'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Service Row Component
function ServiceRow({
    name,
    service,
}: {
    name: string;
    service: ServiceStatus;
}) {
    const Icon = SERVICE_ICONS[name] || Server;
    const statusColor = STATUS_COLORS[service.status];

    return (
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium capitalize">{name}</span>
            </div>
            <div className="flex items-center gap-2">
                {service.latency_ms !== undefined && (
                    <span className="text-xs text-muted-foreground">
                        {service.latency_ms.toFixed(0)}ms
                    </span>
                )}
                <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor}`}
                >
                    {service.status}
                </span>
            </div>
        </div>
    );
}

// Index Row Component
function IndexRow({
    name,
    online,
    total,
    populating,
    percent,
}: {
    name: string;
    online: number;
    total: number;
    populating: number;
    percent: number;
}) {
    const isReady = populating === 0 && percent >= 100;

    return (
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{name}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                    {online}/{total}
                </span>
                {isReady ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald" />
                ) : (
                    <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-500 transition-all"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <span className="text-xs text-amber-500">{percent.toFixed(0)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Utility to format relative time
function formatRelativeTime(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}
