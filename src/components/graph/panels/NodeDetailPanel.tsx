/**
 * Node Detail Panel
 * 
 * Sidebar panel showing detailed information about a selected node.
 * Features:
 * - Node properties display
 * - Connected nodes list
 * - Edit capabilities
 * - Actions (expand, delete, etc.)
 */
'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GraphNode, useGraphStore } from '@/store/graphStore';
import { NODE_TYPE_COLORS } from '../types';
import {
    X,
    Edit3,
    Trash2,
    ExternalLink,
    Share2,
    ChevronRight,
    Circle,
    Link,
    FileText,
    Calendar,
    AlertCircle,
} from 'lucide-react';

interface NodeDetailPanelProps {
    node: GraphNode;
    onClose: () => void;
    onEdit?: (node: GraphNode) => void;
    onDelete?: (nodeId: string) => void;
}

export function NodeDetailPanel({ node, onClose, onEdit, onDelete }: NodeDetailPanelProps) {
    const { nodes, links, selectNode } = useGraphStore();

    // Get connected nodes
    const connections = useMemo(() => {
        const connectedLinks = links.filter(
            l => l.source === node.id || l.target === node.id
        );

        return connectedLinks.map(link => {
            const isSource = link.source === node.id;
            const connectedNodeId = isSource ? link.target : link.source;
            const connectedNode = nodes.find(n => n.id === connectedNodeId);

            return {
                node: connectedNode,
                relationship: link.type,
                direction: isSource ? 'outgoing' : 'incoming',
            };
        }).filter(c => c.node);
    }, [node.id, links, nodes]);

    // Get node color
    const nodeColor = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;

    return (
        <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute right-0 top-14 bottom-0 w-80 bg-card/95 backdrop-blur-md border-l border-border z-30 flex flex-col"
        >
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${nodeColor}20` }}
                        >
                            <Circle
                                className="w-5 h-5"
                                fill={nodeColor}
                                stroke={nodeColor}
                            />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground truncate max-w-[180px]">
                                {node.name}
                            </h3>
                            <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                    backgroundColor: `${nodeColor}20`,
                                    color: nodeColor,
                                }}
                            >
                                {node.type}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mt-4">
                    <ActionButton
                        icon={<Edit3 className="w-4 h-4" />}
                        label="Edit"
                        onClick={() => onEdit?.(node)}
                    />
                    <ActionButton
                        icon={<Share2 className="w-4 h-4" />}
                        label="Expand"
                        onClick={() => {/* TODO: Expand node */ }}
                    />
                    <ActionButton
                        icon={<Trash2 className="w-4 h-4" />}
                        label="Delete"
                        onClick={() => onDelete?.(node.id)}
                        variant="destructive"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Description */}
                {node.description && (
                    <div className="p-4 border-b border-border">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Description
                        </h4>
                        <p className="text-sm text-foreground">{String(node.description)}</p>
                    </div>
                )}


                {/* Property Conflicts */}
                {!!node.properties?.conflicts && (
                    <div className="p-4 border-b border-border bg-amber-500/10">
                        <div className="flex items-center gap-2 mb-2 text-amber-500">
                            <AlertCircle className="w-4 h-4" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider">
                                Property Conflicts
                            </h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            This node has conflicting values for the following properties:
                        </p>
                        <div className="space-y-2">
                            {Object.entries(node.properties.conflicts as Record<string, any[]>).map(([key, values]) => (
                                <div key={key} className="p-2 rounded bg-background/50 border border-amber-500/20">
                                    <p className="text-xs font-medium text-foreground mb-1">{key}</p>
                                    <div className="space-y-1">
                                        {values.map((v, i) => (
                                            <div key={i} className="flex items-center justify-between text-[10px]">
                                                <span className="text-muted-foreground italic truncate max-w-[120px]">
                                                    {v.source || 'Unknown Source'}
                                                </span>
                                                <span className="font-medium text-amber-600 truncate max-w-[100px]">
                                                    {String(v.value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Properties */}
                {node.properties && Object.keys(node.properties).filter(k => k !== 'conflicts').length > 0 && (
                    <div className="p-4 border-b border-border">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            Properties
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(node.properties)
                                .filter(([key]) => key !== 'conflicts')
                                .map(([key, value]) => (
                                    <PropertyRow key={key} label={key} value={String(value)} />
                                ))}
                        </div>
                    </div>
                )}


                {/* Metadata */}
                <div className="p-4 border-b border-border">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Metadata
                    </h4>
                    <div className="space-y-2">
                        <PropertyRow
                            label="Connections"
                            value={String(connections.length)}
                            icon={<Link className="w-3 h-3" />}
                        />
                        {node.degree !== undefined && (
                            <PropertyRow
                                label="Degree"
                                value={String(node.degree)}
                                icon={<Share2 className="w-3 h-3" />}
                            />
                        )}
                        {node.fileId && (
                            <PropertyRow
                                label="Source File"
                                value={node.fileId ? (node.fileId.slice(0, 8) + '...') : 'Unknown'}
                                icon={<FileText className="w-3 h-3" />}
                            />
                        )}

                    </div>
                </div>

                {/* Connections */}
                <div className="p-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Connections ({connections.length})
                    </h4>
                    <div className="space-y-2">
                        {connections.slice(0, 10).map((connection, index) => (
                            <ConnectionItem
                                key={index}
                                node={connection.node!}
                                relationship={connection.relationship}
                                direction={connection.direction as 'incoming' | 'outgoing'}
                                onClick={() => selectNode(connection.node!.id)}
                            />
                        ))}
                        {connections.length > 10 && (
                            <button className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                + {connections.length - 10} more connections
                            </button>
                        )}
                        {connections.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No connections found
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Action Button Component
interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    variant?: 'default' | 'destructive';
}

function ActionButton({ icon, label, onClick, variant = 'default' }: ActionButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`
                flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
                transition-colors duration-200
                ${variant === 'destructive'
                    ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }
            `}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

// Property Row Component
interface PropertyRowProps {
    label: string;
    value: string;
    icon?: React.ReactNode;
}

function PropertyRow({ label, value, icon }: PropertyRowProps) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                {icon}
                {label}
            </span>
            <span className="text-sm text-foreground font-medium">{value}</span>
        </div>
    );
}

// Connection Item Component
interface ConnectionItemProps {
    node: GraphNode;
    relationship: string;
    direction: 'incoming' | 'outgoing';
    onClick: () => void;
}

function ConnectionItem({ node, relationship, direction, onClick }: ConnectionItemProps) {
    const color = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
        >
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}20` }}
            >
                <Circle className="w-3 h-3" fill={color} stroke={color} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {direction === 'outgoing' ? '→' : '←'}
                    <span className="truncate">{relationship.replace(/_/g, ' ')}</span>
                </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
}
