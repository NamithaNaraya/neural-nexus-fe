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
import { formatDisplayName } from '@/utils/graphUtils';
import { graphApi, NodeDetails } from '@/lib/api/graph';
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
    AlertCircle,
    Plus,
    Search,
    ArrowRight,
    Save,
    Check,
    BookOpen,
    Layers
} from 'lucide-react';

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
    onCreateNode?: () => void;
}

export function NodeDetailPanel({ node, onClose, onEdit, onDelete, onExpand, onFocus, onInitiateAnalysis, onCreateNode }: NodeDetailPanelProps) {
    const { nodes, links, selectNode, updateNode, zoomToNode, addLink } = useGraphStore();

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(node.name);
    const [editType, setEditType] = useState(node.type);
    const [editDescription, setEditDescription] = useState(node.description || '');
    const [isSaving, setIsSaving] = useState(false);

    // Relationship state
    const [isRelating, setIsRelating] = useState(false);
    const [targetId, setTargetId] = useState('');
    const [relType, setRelType] = useState('RELATED_TO');
    const [relSearch, setRelSearch] = useState('');
    const [isCreatingRel, setIsCreatingRel] = useState(false);
    const [availableRelTypes, setAvailableRelTypes] = useState<string[]>([]);
    const [availableNodeTypes, setAvailableNodeTypes] = useState<string[]>([]);
    const [details, setDetails] = useState<NodeDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Herb specific state
    const [herbProfile, setHerbProfile] = useState<Record<string, string[]> | null>(null);
    const [herbQualities, setHerbQualities] = useState<string[] | null>(null);

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
        setIsEditing(false);
        setIsRelating(false);
        setHerbProfile(null);
        setHerbQualities(null);

        // Fetch detailed metadata
        const fetchNodeDetails = async () => {
            setIsLoadingDetails(true);
            try {
                const response = await graphApi.getNodeDetails(node.id);
                setDetails(response);
            } catch (error) {
                console.error('Failed to fetch node details:', error);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        // Fetch Herb Data
        const fetchHerbData = async () => {
            if (node.type === 'Herb') {
                try {
                    const res = await (graphApi as any).getHerbFullProfile(node.name);
                    setHerbProfile(res.profile);
                } catch (e) {
                    console.error("Failed to fetch herb profile", e);
                }
            } else if (node.type === 'Property') {
                const herbName = node.properties?.herb as string;
                if (herbName) {
                    try {
                        const res = await (graphApi as any).getHerbQualities(herbName, node.name);
                        setHerbQualities(res.qualities);
                    } catch (e) {
                        console.error("Failed to fetch herb qualities", e);
                    }
                }
            }
        };

        fetchNodeDetails();
        fetchHerbData();
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
            });
            // Update local store with the fields we sent
            updateNode(node.id, {
                name: editName,
                type: editType,
                description: editDescription,
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
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-6 top-24 bottom-6 w-[380px] glass-strong z-40 flex flex-col rounded-[2rem] border border-white/10 shadow-[20px_0_60px_rgba(0,0,0,0.3)] overflow-hidden"
        >
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-white/5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-transform duration-500 hover:rotate-6"
                            style={{
                                backgroundColor: `${nodeColor}15`,
                                border: `1px solid ${nodeColor}30`,
                                boxShadow: `0 0 20px ${nodeColor}10`
                            }}
                        >
                            <Circle
                                className="w-6 h-6"
                                fill={nodeColor}
                                stroke={nodeColor}
                            />
                        </div>
                        <div className="min-w-0">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm font-bold mb-2 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
                                />
                            ) : (
                                <>
                                    <p className="text-[10px] text-primary/80 uppercase tracking-[0.2em] font-bold leading-none mb-1.5 opacity-60">System Intelligence</p>
                                    <h3 className="text-lg font-bold text-foreground truncate max-w-[180px] tracking-tight">
                                        {formatDisplayName(node)}
                                    </h3>
                                </>
                            )}

                            {isEditing ? (
                                <select
                                    value={editType}
                                    onChange={(e) => setEditType(e.target.value)}
                                    className="text-xs bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 block w-full appearance-none cursor-pointer shadow-inner"
                                >
                                    {availableNodeTypes.map(type => (
                                        <option key={type} value={type} className="bg-slate-900">{type}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="flex items-center gap-2 mt-1">
                                    <span
                                        className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest border"
                                        style={{
                                            backgroundColor: `${nodeColor}10`,
                                            color: nodeColor,
                                            borderColor: `${nodeColor}30`
                                        }}
                                    >
                                        {node.type}
                                    </span>
                                    {(node as any).confidence && (
                                        <span className="text-[10px] text-muted-foreground font-bold">
                                            {Math.round((node as any).confidence * 100)}% Match
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {onCreateNode && (
                            <button
                                onClick={onCreateNode}
                                className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20"
                                title="Create New Node"
                            >
                                NEW
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-2xl hover:bg-white/10 transition-all duration-300 text-muted-foreground hover:text-foreground border border-transparent hover:border-white/10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2.5 mt-6">
                    {isEditing ? (
                        <>
                            <ActionButton
                                icon={isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                label="COMMIT"
                                onClick={handleSave}
                                disabled={isSaving}
                                primary
                            />
                            <ActionButton
                                icon={<X className="w-4 h-4" />}
                                label="CANCEL"
                                onClick={() => setIsEditing(false)}
                                disabled={isSaving}
                            />
                        </>
                    ) : isRelating ? (
                        <>
                            <ActionButton
                                icon={isCreatingRel ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Link className="w-4 h-4" />}
                                label="EXECUTE"
                                onClick={handleCreateRelationship}
                                disabled={isCreatingRel || !targetId}
                                primary
                            />
                            <ActionButton
                                icon={<X className="w-4 h-4" />}
                                label="CANCEL"
                                onClick={() => setIsRelating(false)}
                                disabled={isCreatingRel}
                            />
                        </>
                    ) : (
                        <>
                            <ActionButton
                                icon={<Edit3 className="w-4 h-4" />}
                                label="EDIT"
                                onClick={() => setIsEditing(true)}
                            />
                            <ActionButton
                                icon={<Plus className="w-4 h-4" />}
                                label="LINK"
                                onClick={() => setIsRelating(true)}
                            />
                            <ActionButton
                                icon={<Trash2 className="w-4 h-4" />}
                                label="DELETE"
                                onClick={() => onDelete?.(node.id)}
                                variant="destructive"
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
                {/* Relate Mode UI */}
                {isRelating && (
                    <div className="p-6 border-b border-white/10 space-y-6 bg-indigo-500/5">
                        <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Link className="w-4 h-4" /> NEURAL CONNECTION BRIDGE
                        </h4>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 block">Target Destination</label>
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Scan for nodes..."
                                        value={relSearch}
                                        onChange={(e) => setRelSearch(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium shadow-inner"
                                    />
                                </div>
                                <div className="mt-3 max-h-40 overflow-y-auto rounded-2xl bg-white/5 border border-white/5 scrollbar-thin scrollbar-thumb-white/5">
                                    {filteredNodes.length > 0 ? (
                                        filteredNodes.map(n => (
                                            <button
                                                key={n.id}
                                                onClick={() => setTargetId(n.id)}
                                                className={`w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 transition-all flex items-center justify-between group ${targetId === n.id ? 'bg-primary/20 text-primary border-l-2 border-primary' : ''}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Circle className="w-2 h-2 opacity-50" fill={n.color || '#fff'} />
                                                    <span className="font-bold">{formatDisplayName(n)}</span>
                                                </div>
                                                {targetId === n.id && <Check className="w-3.5 h-3.5" />}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-6 text-[10px] text-muted-foreground text-center font-bold tracking-widest opacity-40 italic">NO MATCHES FOUND</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 block">Link Protocol</label>
                                <div className="relative">
                                    <select
                                        value={relType}
                                        onChange={(e) => setRelType(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer font-bold tracking-tight shadow-inner"
                                    >
                                        {availableRelTypes.map(type => (
                                            <option key={type} value={type} className="bg-slate-900">{type.replace(/_/g, ' ')}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                        <ChevronRight className="w-4 h-4 rotate-90" />
                                    </div>
                                </div>
                            </div>

                            {targetId && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center gap-4 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                >
                                    <div className="text-center">
                                        <div className="text-[8px] text-primary/60 font-bold uppercase mb-1">SOURCE</div>
                                        <div className="text-[10px] font-bold text-foreground truncate max-w-[80px]">{formatDisplayName(node)}</div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="text-[8px] text-primary font-bold">{relType}</div>
                                        <ArrowRight className="w-4 h-4 text-primary animate-pulse" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[8px] text-primary/60 font-bold uppercase mb-1">TARGET</div>
                                        <div className="text-[10px] font-bold text-foreground truncate max-w-[80px]">
                                            {formatDisplayName(nodes.find(n => n.id === targetId) || { id: targetId })}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                )}

                {/* Herb Profile Section - Specialized UI Layer */}
                {herbProfile && (
                    <div className="p-6 border-b border-white/10 bg-emerald-500/5">
                        <div className="flex items-center gap-2 mb-4 text-emerald-400">
                            <Layers className="w-4 h-4" />
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">
                                AYURVEDIC PROFILE
                            </h4>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(herbProfile).map(([property, qualities]) => (
                                <div key={property} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                    <h5 className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {property}
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {qualities.map((q, i) => (
                                            <span key={i} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                {q}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Herb Property Qualities Section */}
                {herbQualities && (
                    <div className="p-6 border-b border-white/10 bg-emerald-500/5">
                        <div className="flex items-center gap-2 mb-4 text-emerald-400">
                            <BookOpen className="w-4 h-4" />
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">
                                ASSOCIATED QUALITIES
                            </h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {herbQualities.map((q, i) => (
                                <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                                    {q}
                                </span>
                            ))}
                        </div>
                        {node.properties?.herb && (
                            <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-muted-foreground font-medium">
                                Context: <span className="text-emerald-400 font-bold">{String(node.properties.herb)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Description */}
                {(isEditing || node.description) && (
                    <div className="p-6 border-b border-white/10">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 opacity-60">
                            Knowledge Content
                        </h4>
                        {isEditing ? (
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={4}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium leading-relaxed resize-none shadow-inner"
                                placeholder="Input semantic context..."
                            />
                        ) : (
                            <div className="relative group">
                                <p className="text-sm text-foreground/90 font-medium leading-relaxed italic border-l-2 border-primary/30 pl-4 py-1">
                                    "{node.description}"
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Property Conflicts */}
                {!!node.properties?.conflicts && (
                    <div className="p-6 border-b border-white/10 bg-amber-500/5">
                        <div className="flex items-center gap-2 mb-4 text-amber-400">
                            <AlertCircle className="w-4 h-4" />
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">
                                DISCREPANCY DETECTED
                            </h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-4 font-medium opacity-80 uppercase tracking-tight">
                            Conflicting semantic attributes identified across sources:
                        </p>
                        <div className="space-y-3">
                            {Object.entries(node.properties.conflicts as Record<string, any[]>).map(([key, values]) => (
                                <div key={key} className="p-3.5 rounded-2xl bg-white/5 border border-amber-500/20 shadow-inner">
                                    <p className="text-xs font-bold text-amber-200 mb-2 uppercase tracking-wide">{key}</p>
                                    <div className="space-y-2">
                                        {values.map((v, i) => (
                                            <div key={i} className="flex items-center justify-between text-[10px] font-medium bg-white/5 p-2 rounded-lg">
                                                <span className="text-muted-foreground/60 italic truncate max-w-[120px]">
                                                    {v.source || 'Undefined Source'}
                                                </span>
                                                <span className="font-bold text-amber-500 truncate max-w-[100px]">
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
                        {(details?.source_files || []).length > 0 && (
                            <div className="space-y-2 mt-4">
                                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3">
                                    Source Artifacts
                                </h5>
                                {details?.source_files.map((filename, i) => (
                                    <PropertyRow
                                        key={i}
                                        label={`File ${i + 1}`}
                                        value={filename}
                                        icon={<FileText className="w-3 h-3 text-primary" />}
                                    />
                                ))}
                            </div>
                        )}
                        {!details && node.fileId && (
                            <PropertyRow
                                label="Source File"
                                value={node.fileId.slice(0, 8) + '...'}
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
                                properties={links.find(l => (l.source === node.id && l.target === connection.node!.id && l.type === connection.relationship) || (l.target === node.id && l.source === connection.node!.id && l.type === connection.relationship))?.properties}
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
    primary?: boolean;
}

function ActionButton({ icon, label, onClick, variant = 'default', disabled, primary }: ActionButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest
                transition-all duration-300 shadow-sm hover:shadow-lg active:scale-95
                ${disabled ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}
                ${primary
                    ? 'bg-primary text-primary-foreground shadow-primary/20 hover:shadow-primary/40'
                    : variant === 'destructive'
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20'
                        : 'bg-white/5 hover:bg-white/10 text-foreground/80 hover:text-foreground border border-white/5 hover:border-white/20'
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
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300 group">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                {icon}
                {label}
            </span>
            <span className="text-xs text-foreground font-bold tracking-tight bg-white/5 px-2 py-1 rounded-lg border border-white/5">{value}</span>
        </div>
    );
}

// Connection Item Component
interface ConnectionItemProps {
    node: GraphNode;
    relationship: string;
    properties?: Record<string, any>;
    direction: 'incoming' | 'outgoing';
    onClick: () => void;
}

function ConnectionItem({ node, relationship, properties, direction, onClick }: ConnectionItemProps) {
    const color = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;

    // Extract identify properties (like herb)
    const herbName = properties?.herb || properties?.entity || properties?.name;

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 hover:shadow-lg transition-all duration-300 text-left group"
        >
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-500 group-hover:rotate-6"
                style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
            >
                <Circle className="w-4 h-4" fill={color} stroke={color} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate tracking-tight">{formatDisplayName(node)}</p>
                <div className="flex items-center gap-1.5 opacity-60">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
                        {direction === 'outgoing' ? <ArrowRight className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5 rotate-180" />}
                        <span className="truncate">{relationship.replace(/_/g, ' ')}</span>
                    </p>
                    {herbName && (
                        <span className="text-[10px] text-primary font-bold px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                            {herbName}
                        </span>
                    )}
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
    );
}
