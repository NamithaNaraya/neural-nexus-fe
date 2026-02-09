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

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraphNode, useGraphStore } from '@/store/graphStore';
import { graphApi } from '@/lib/api/graph';
import { NODE_TYPE_COLORS } from '../types';
import {
    X,
    Edit3,
    Trash2,
    Share2,
    ChevronRight,
    Circle,
    Link,
    FileText,
    Calendar,
    AlertCircle,
    Plus,
    Box,
    Search,
    ArrowRight,
    Save,
    Check,
    Palette,
} from 'lucide-react';

const COLOR_PRESETS = [
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#EF4444', // Red
    '#F97316', // Orange
    '#FBBF24', // Amber
    '#22C55E', // Green
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
];

// Static presets removed - now fetched dynamically from API
const RELATIONSHIP_TYPES = []; // Placeholder, will be populated via state

const HIDDEN_PROPERTIES = [
    'conflicts',
    'embedding',
    'fastrp_embedding',
    'user_id',
    'file_ids',
    'id',
    'folder_id',
    'created_at',
    'updated_at',
    'properties',
    'source_text',
    'source_count',
    'confidence'
];

interface NodeDetailPanelProps {
    node: GraphNode;
    onClose: () => void;
    onEdit?: (node: GraphNode) => void;
    onDelete?: (nodeId: string) => void;
    onExpand?: (nodeId: string) => void;
    onFocus?: (nodeId: string) => void;
    onInitiateAnalysis?: (node: GraphNode) => void;
}

export function NodeDetailPanel({ node, onClose, onEdit, onDelete, onExpand, onFocus, onInitiateAnalysis }: NodeDetailPanelProps) {
    const { nodes, links, selectNode, updateNode, zoomToNode, addLink } = useGraphStore();

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(node.name);
    const [editType, setEditType] = useState(node.type);
    const [editDescription, setEditDescription] = useState(node.description || '');
    const [editColor, setEditColor] = useState(node.color || '#6366F1');
    const [editSize, setEditSize] = useState(node.size || 10);
    const [isSaving, setIsSaving] = useState(false);

    // Relationship state
    const [isRelating, setIsRelating] = useState(false);
    const [targetId, setTargetId] = useState('');
    const [relType, setRelType] = useState('RELATED_TO');
    const [relSearch, setRelSearch] = useState('');
    const [isCreatingRel, setIsCreatingRel] = useState(false);
    const [availableRelTypes, setAvailableRelTypes] = useState<string[]>([]);
    const [availableNodeTypes, setAvailableNodeTypes] = useState<string[]>([]);

    // Filter nodes for relationship search
    const filteredNodes = useMemo(() => {
        return nodes
            .filter(n => n.id !== node.id)
            .filter(n =>
                n.name.toLowerCase().includes(relSearch.toLowerCase()) ||
                (n.type && n.type.toLowerCase().includes(relSearch.toLowerCase()))
            )
            .slice(0, 10);
    }, [nodes, node.id, relSearch]);

    // Sync state when node changes
    useEffect(() => {
        setEditName(node.name);
        setEditType(node.type);
        setEditDescription(node.description || '');
        setEditColor(node.color || '#6366F1');
        setEditSize(node.size || 10);
        setIsEditing(false);
        setIsRelating(false);
    }, [node]);

    // Fetch dynamic types
    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const [relResponse, nodeResponse] = await Promise.all([
                    graphApi.getRelationshipTypes(),
                    graphApi.getNodeTypes()
                ]);

                if (relResponse.types) {
                    setAvailableRelTypes(relResponse.types);
                    if (relResponse.types.length > 0) {
                        setRelType(relResponse.types[0]);
                    }
                }

                if (nodeResponse.types) {
                    setAvailableNodeTypes(nodeResponse.types);
                }
            } catch (error) {
                console.error('Failed to fetch types:', error);
                // Fallback to basic types if API fails
                setAvailableRelTypes(['RELATED_TO', 'MENTIONS', 'LOCATED_IN']);
                setAvailableNodeTypes(['Entity', 'Person', 'Location', 'Organization']);
            }
        };

        fetchTypes();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await graphApi.updateNode(node.id, {
                name: editName,
                type: editType,
                description: editDescription,
                color: editColor,
                size: editSize,
            });
            // Update local store with the fields we sent
            updateNode(node.id, {
                name: editName,
                type: editType,
                description: editDescription,
                color: editColor,
                size: editSize,
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update node:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateRelationship = async () => {
        if (!targetId) return;
        setIsCreatingRel(true);
        try {
            await graphApi.createRelationship({
                source_id: node.id,
                target_id: targetId,
                type: relType,
            });
            // Update local store
            addLink({
                source: node.id,
                target: targetId,
                type: relType,
                strength: 1.0,
            });
            setIsRelating(false);
            setTargetId('');
        } catch (error) {
            console.error('Failed to create relationship:', error);
        } finally {
            setIsCreatingRel(false);
        }
    };

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
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute right-0 top-14 bottom-0 w-[400px] bg-card/95 backdrop-blur-md border-l border-border z-30 flex flex-col"
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
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-muted border border-border rounded px-2 py-1 text-sm font-semibold mb-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            ) : (
                                <>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium leading-none mb-1">Node Detail</p>
                                    <h3 className="font-semibold text-foreground truncate max-w-[180px]">
                                        {node.name}
                                    </h3>
                                </>
                            )}

                            {isEditing ? (
                                <select
                                    value={editType}
                                    onChange={(e) => setEditType(e.target.value)}
                                    className="text-xs bg-muted border border-border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary block w-full"
                                >
                                    {availableNodeTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            ) : (
                                <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                        backgroundColor: `${nodeColor}20`,
                                        color: nodeColor,
                                    }}
                                >
                                    {node.type}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mt-4">
                    {isEditing ? (
                        <>
                            <ActionButton
                                icon={isSaving ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                label="Save"
                                onClick={handleSave}
                                disabled={isSaving}
                            />
                            <ActionButton
                                icon={<X className="w-4 h-4" />}
                                label="Cancel"
                                onClick={() => setIsEditing(false)}
                                disabled={isSaving}
                            />
                        </>
                    ) : isRelating ? (
                        <>
                            <ActionButton
                                icon={isCreatingRel ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Link className="w-4 h-4" />}
                                label="Create"
                                onClick={handleCreateRelationship}
                                disabled={isCreatingRel || !targetId}
                            />
                            <ActionButton
                                icon={<X className="w-4 h-4" />}
                                label="Cancel"
                                onClick={() => setIsRelating(false)}
                                disabled={isCreatingRel}
                            />
                        </>
                    ) : (
                        <>
                            <ActionButton
                                icon={<Edit3 className="w-4 h-4" />}
                                label="Edit"
                                onClick={() => setIsEditing(true)}
                            />
                            <ActionButton
                                icon={<Plus className="w-4 h-4" />}
                                label="Relate"
                                onClick={() => setIsRelating(true)}
                            />
                            <ActionButton
                                icon={<Trash2 className="w-4 h-4" />}
                                label="Delete"
                                onClick={() => onDelete?.(node.id)}
                                variant="destructive"
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Styling (Edit Mode Only) */}
                {isEditing && (
                    <div className="p-4 border-b border-border space-y-4">
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Palette className="w-3 h-3" /> Color
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {COLOR_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setEditColor(preset)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${editColor === preset ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-transparent hover:scale-110'
                                            }`}
                                        style={{ backgroundColor: preset }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Box className="w-3 h-3" /> Size: {editSize}
                            </h4>
                            <input
                                type="range"
                                min="5"
                                max="30"
                                step="1"
                                value={editSize}
                                onChange={(e) => setEditSize(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                )}
                {/* Relate Mode UI */}
                {isRelating && (
                    <div className="p-4 border-b border-border space-y-4">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Link className="w-3 h-3" /> Create Relationship
                        </h4>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Target Node</label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search nodes..."
                                        value={relSearch}
                                        onChange={(e) => setRelSearch(e.target.value)}
                                        className="w-full bg-muted border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <div className="mt-2 max-h-32 overflow-y-auto border border-border rounded-lg bg-muted/50">
                                    {filteredNodes.length > 0 ? (
                                        filteredNodes.map(n => (
                                            <button
                                                key={n.id}
                                                onClick={() => setTargetId(n.id)}
                                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center justify-between ${targetId === n.id ? 'bg-primary/20 text-primary' : ''}`}
                                            >
                                                <span>{n.name}</span>
                                                {targetId === n.id && <Check className="w-3 h-3" />}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="p-2 text-[10px] text-muted-foreground text-center">No nodes found</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Relationship Type</label>
                                <select
                                    value={relType}
                                    onChange={(e) => setRelType(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {availableRelTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {targetId && (
                                <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-center gap-3">
                                    <span className="text-[10px] font-medium text-primary uppercase truncate max-w-[80px]">{node.name}</span>
                                    <ArrowRight className="w-3 h-3 text-primary" />
                                    <span className="text-[10px] font-medium text-primary uppercase truncate max-w-[80px]">
                                        {nodes.find(n => n.id === targetId)?.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Description */}
                {(isEditing || node.description) && (
                    <div className="p-4 border-b border-border">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Description
                        </h4>
                        {isEditing ? (
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={4}
                                className="w-full bg-muted border border-border rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                placeholder="Add description..."
                            />
                        ) : (
                            <p className="text-sm text-foreground shrink-0 overflow-hidden text-ellipsis line-clamp-6">
                                {node.description}
                            </p>
                        )}
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
                {node.properties && Object.keys(node.properties).filter(k => !HIDDEN_PROPERTIES.includes(k)).length > 0 && (
                    <div className="p-4 border-b border-border">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            Properties
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(node.properties)
                                .filter(([key]) => !HIDDEN_PROPERTIES.includes(key))
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
    disabled?: boolean;
}

function ActionButton({ icon, label, onClick, variant = 'default', disabled }: ActionButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
                transition-colors duration-200
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
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
