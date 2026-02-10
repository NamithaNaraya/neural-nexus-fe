/**
 * Node List View
 * 
 * Professional table-based view for graph nodes.
 * Supports sorting, selection, and global filtering.
 */
'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { NODE_TYPE_COLORS } from '../types';
import { GraphNode } from '@/store/graphStore';
import {
    Search,
    ArrowUpDown,
    MoreHorizontal,
    ChevronRight,
    Box,
    ExternalLink
} from 'lucide-react';

interface NodeListViewProps {
    nodes: GraphNode[];
    selectedNodes: string[];
    onNodeClick: (nodeId: string, event?: any) => void;
    onNodeDoubleClick: (nodeId: string) => void;
    onNodeHover: (nodeId: string | null) => void;
    onNodeFocus?: (nodeId: string) => void;
}

type SortField = 'name' | 'type' | 'degree';
type SortOrder = 'asc' | 'desc';

export function NodeListView({
    nodes,
    selectedNodes,
    onNodeClick,
    onNodeDoubleClick,
    onNodeHover,
    onNodeFocus,
}: NodeListViewProps) {
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // Handle Sorting
    const sortedNodes = useMemo(() => {
        return [...nodes].sort((a, b) => {
            let valA: any = a[sortField] || '';
            let valB: any = b[sortField] || '';

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [nodes, sortField, sortOrder]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    return (
        <div className="w-full h-full flex flex-col p-8 pt-24 bg-background/50 backdrop-blur-sm overflow-hidden">
            {/* Header / Search Area (Global Search is already in Container, but we can add local context if needed) */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter flex items-center gap-3">
                        <Box className="w-6 h-6 text-primary" />
                        Entity Registry
                    </h2>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-[0.2em]">
                        Structured database view of current neural subgraph
                    </p>
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto glass-strong rounded-[2rem] border border-white/10 shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/10">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <button
                                    onClick={() => toggleSort('name')}
                                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                                >
                                    Entity Name
                                    <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <button
                                    onClick={() => toggleSort('type')}
                                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                                >
                                    Type
                                    <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Description
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <button
                                    onClick={() => toggleSort('degree')}
                                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                                >
                                    Connections
                                    <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedNodes.map((node) => {
                            const isSelected = selectedNodes.includes(node.id);
                            const typeColor = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;

                            return (
                                <motion.tr
                                    key={node.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => onNodeClick(node.id)}
                                    onDoubleClick={() => onNodeDoubleClick(node.id)}
                                    onMouseEnter={() => onNodeHover(node.id)}
                                    onMouseLeave={() => onNodeHover(null)}
                                    className={`
                                        group cursor-pointer transition-all duration-200
                                        ${isSelected ? 'bg-primary/10' : 'hover:bg-white/5'}
                                    `}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                                style={{ backgroundColor: typeColor, boxShadow: `0 0 12px ${typeColor}66` }}
                                            />
                                            <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                {node.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border"
                                            style={{
                                                color: typeColor,
                                                borderColor: `${typeColor}44`,
                                                backgroundColor: `${typeColor}11`
                                            }}
                                        >
                                            {node.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-muted-foreground line-clamp-1 italic max-w-md">
                                            {node.description || 'No description available'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary/40"
                                                    style={{ width: `${Math.min((node.degree || 0) * 10, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                                {node.degree || 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground group-hover:text-primary transition-all scale-90 hover:scale-110 active:scale-95"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onNodeFocus?.(node.id);
                                            }}
                                            title="View in Graph"
                                        >
                                            <Box className="w-4 h-4" />
                                        </button>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>

                {sortedNodes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-muted/20 rounded-2xl flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-muted-foreground opaity-20" />
                        </div>
                        <h4 className="text-sm font-bold text-foreground">No entities found</h4>
                        <p className="text-xs text-muted-foreground mt-1 tracking-tight">Try adjusting your active filters or search query.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
