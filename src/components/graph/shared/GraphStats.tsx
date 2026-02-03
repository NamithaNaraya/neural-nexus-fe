/**
 * Graph Stats
 * 
 * Quick stats display showing node and link counts.
 */
'use client';

import React from 'react';
import { Circle, Link, Eye } from 'lucide-react';

interface GraphStatsProps {
    nodeCount: number;
    linkCount: number;
    totalNodes: number;
    totalLinks: number;
}

export function GraphStats({ nodeCount, linkCount, totalNodes, totalLinks }: GraphStatsProps) {
    const isFiltered = nodeCount !== totalNodes || linkCount !== totalLinks;

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
