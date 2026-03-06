/**
 * Graph Stats
 * 
 * Quick stats display showing node and link counts.
 * Shows "Load All" button when viewing a partial graph.
 */
'use client';

import React from 'react';
import { Circle, Link, Eye, Download, Loader2 } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';

interface GraphStatsProps {
    nodeCount: number;
    linkCount: number;
    totalNodes: number;
    totalLinks: number;
}

export function GraphStats({ nodeCount, linkCount, totalNodes, totalLinks }: GraphStatsProps) {
    const isFiltered = nodeCount !== totalNodes || linkCount !== totalLinks;
    const totalNodesOnServer = useGraphStore((s) => s.totalNodesOnServer);
    const totalLinksOnServer = useGraphStore((s) => s.totalLinksOnServer);
    const loadAllNodes = useGraphStore((s) => s.loadAllNodes);
    const setLoadAllNodes = useGraphStore((s) => s.setLoadAllNodes);
    const fetchGraph = useGraphStore((s) => s.fetchGraph);
    const activeFolderId = useGraphStore((s) => s.activeFolderId);
    const activeFileId = useGraphStore((s) => s.activeFileId);
    const isGraphLoading = useGraphStore((s) => s.isGraphLoading);

    // Determine if we're showing a partial view (server has more nodes than we loaded)
    const isPartialLoad = totalNodesOnServer > totalNodes && !loadAllNodes;

    const handleLoadAll = async () => {
        setLoadAllNodes(true);
        // Re-fetch with full data
        await fetchGraph(activeFolderId, activeFileId);
    };

    return (
        <div className="flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border rounded-lg px-3 py-2">
            <StatItem
                icon={<Circle className="w-3 h-3" />}
                label="Nodes"
                value={nodeCount}
                total={isFiltered ? totalNodes : undefined}
            />
            <div className="w-px h-4 bg-border" />
            <StatItem
                icon={<Link className="w-3 h-3" />}
                label="Links"
                value={linkCount}
                total={isFiltered ? totalLinks : undefined}
            />
            {isFiltered && (
                <>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                        <Eye className="w-3 h-3" />
                        <span>Filtered</span>
                    </div>
                </>
            )}
            {isPartialLoad && (
                <>
                    <div className="w-px h-4 bg-border" />
                    <button
                        onClick={handleLoadAll}
                        disabled={isGraphLoading}
                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                        title={`Showing top ${totalNodes} nodes. Click to load all ${totalNodesOnServer.toLocaleString()} nodes.`}
                    >
                        {isGraphLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Download className="w-3 h-3" />
                        )}
                        <span>
                            Load All ({totalNodesOnServer.toLocaleString()})
                        </span>
                    </button>
                </>
            )}
        </div>
    );
}

// Stat Item Component
interface StatItemProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    total?: number;
}

function StatItem({ icon, label, value, total }: StatItemProps) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <div className="text-xs">
                <span className="font-semibold text-foreground">{value.toLocaleString()}</span>
                {total !== undefined && (
                    <span className="text-muted-foreground">/{total.toLocaleString()}</span>
                )}
                <span className="text-muted-foreground ml-1">{label}</span>
            </div>
        </div>
    );
}
