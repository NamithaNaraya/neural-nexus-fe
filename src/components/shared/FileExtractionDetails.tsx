import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, Edit3, Save, Eye, X } from 'lucide-react';
import { docAiApi } from '@/lib/api';
import { formatDisplayName } from '@/utils/graphUtils';

export interface ExtractedEntity {
    id: string;
    name: string;
    type: string;
    description: string;
    confidence: number;
    source_chunk?: string;
}

export interface ExtractedRelationship {
    id: string;
    source_name: string;
    target_name: string;
    type: string;
    confidence: number;
}

interface FileExtractionDetailsProps {
    fileId: string;
    isEditable?: boolean;
    initialEntities?: ExtractedEntity[];
    initialRelationships?: ExtractedRelationship[];
    className?: string;
}

export function FileExtractionDetails({
    fileId,
    isEditable = false,
    initialEntities,
    initialRelationships,
    className = '',
}: FileExtractionDetailsProps) {
    const [entities, setEntities] = useState<ExtractedEntity[] | null>(initialEntities || null);
    const [relationships, setRelationships] = useState<ExtractedRelationship[] | null>(initialRelationships || null);
    const [isLoading, setIsLoading] = useState(!initialEntities);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        if (initialEntities && initialRelationships) {
            setEntities(initialEntities);
            setRelationships(initialRelationships);
            setIsLoading(false);
            return;
        }

        const fetchDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await docAiApi.files.getExtractionPreview(fileId) as {
                    entities?: ExtractedEntity[];
                    relationships?: ExtractedRelationship[];
                };
                setEntities(response.entities || []);
                setRelationships(response.relationships || []);
            } catch (e) {
                console.error('Failed to fetch file details:', e);
                setError('Failed to load extraction details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [fileId, initialEntities, initialRelationships]);

    const handleSaveEntity = (entityId: string, updates: Partial<ExtractedEntity>) => {
        if (!entities) return;

        setEntities(entities.map(e =>
            e.id === entityId ? { ...e, ...updates } : e
        ));
        setEditingEntityId(null);
        setHasUnsavedChanges(true); // Mark as modified
    };

    const handleSaveChanges = async () => {
        if (!entities || !relationships) return;

        setIsSaving(true);
        try {
            await docAiApi.files.updateExtraction(fileId, {
                entities: entities,
                relationships: relationships // Pass relationships as is for now
            });
            setHasUnsavedChanges(false);
            // Optional: Show success toast
        } catch (e) {
            console.error('Failed to save changes:', e);
            setError('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const [activeTab, setActiveTab] = useState<'entities' | 'relationships' | 'properties'>('entities');

    // Group entities by type
    const entitiesByType = React.useMemo(() => {
        if (!entities) return {};
        return entities.reduce((acc, entity) => {
            const type = entity.type || 'Unknown';
            if (!acc[type]) acc[type] = [];
            acc[type].push(entity);
            return acc;
        }, {} as Record<string, ExtractedEntity[]>);
    }, [entities]);

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center py-8 text-muted-foreground ${className}`}>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading extracted data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-4 bg-red-500/10 border border-red-500/30 rounded-lg ${className}`}>
                <div className="flex items-center gap-2 text-red-500 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Error</span>
                </div>
                <p className="text-xs text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header / Save Actions */}
            {isEditable && hasUnsavedChanges && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                >
                    <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Unsaved changes
                    </span>
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save Changes
                    </button>
                </motion.div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border pl-1">
                <button
                    onClick={() => setActiveTab('entities')}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'entities'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Entities ({entities?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('relationships')}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'relationships'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Relationships ({relationships?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('properties')}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'properties'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Properties
                </button>
            </div>

            {/* Content Groups */}
            <div className="min-h-[300px]">
                {/* Entities Tab (Grouped by Type) */}
                {activeTab === 'entities' && (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                        {Object.entries(entitiesByType).length > 0 ? (
                            Object.entries(entitiesByType).map(([type, typeEntities]) => (
                                <div key={type} className="space-y-2">
                                    <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        {type}
                                        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-foreground">
                                            {typeEntities.length}
                                        </span>
                                    </h6>
                                    <div className="space-y-1 pl-2 border-l border-border/50">
                                        {typeEntities.map((entity) => (
                                            <EntityPreviewRow
                                                key={entity.id}
                                                entity={entity}
                                                isEditing={editingEntityId === entity.id}
                                                onEdit={() => isEditable && setEditingEntityId(entity.id)}
                                                onSave={(updates) => handleSaveEntity(entity.id, updates)}
                                                onCancel={() => setEditingEntityId(null)}
                                                readOnly={!isEditable}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground italic p-4">No entities found.</p>
                        )}
                    </div>
                )}

                {/* Relationships Tab */}
                {activeTab === 'relationships' && (
                    <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                        {relationships && relationships.length > 0 ? (
                            relationships.map((rel, idx) => (
                                <div
                                    key={rel.id || idx}
                                    className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
                                >
                                    <span className="font-medium text-foreground truncate max-w-[150px]" title={rel.source_name}>
                                        {rel.source_name}
                                    </span>
                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs">
                                        {rel.type}
                                    </span>
                                    <span className="font-medium text-foreground truncate max-w-[150px]" title={rel.target_name}>
                                        {rel.target_name}
                                    </span>
                                    {/* Confidence score removed */}
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground italic p-4">No relationships found.</p>
                        )}
                    </div>
                )}

                {/* Properties Tab */}
                {activeTab === 'properties' && (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {entities && entities.length > 0 ? (
                            entities.map((entity) => (
                                <div key={entity.id} className="p-3 bg-muted/30 rounded border border-border/50 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-foreground">{formatDisplayName(entity)}</span>
                                            <span className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border">
                                                {entity.type}
                                            </span>
                                        </div>
                                        {/* Confidence score removed */}
                                    </div>
                                    {entity.description ? (
                                        <div className="text-xs text-muted-foreground bg-background p-2 rounded border border-border/50">
                                            <span className="font-semibold text-foreground/70 uppercase tracking-tighter text-[10px] block mb-1">
                                                Description / Properties
                                            </span>
                                            {entity.description}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">No extracted properties available.</p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground italic p-4">No entities found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Entity Preview Row with inline editing
interface EntityPreviewRowProps {
    entity: ExtractedEntity;
    isEditing: boolean;
    onEdit: () => void;
    onSave: (updates: Partial<ExtractedEntity>) => void;
    onCancel: () => void;
    readOnly?: boolean;
}

function EntityPreviewRow({ entity, isEditing, onEdit, onSave, onCancel, readOnly }: EntityPreviewRowProps) {
    const [name, setName] = useState(entity.name);
    const [type, setType] = useState(entity.type);

    const typeColors: Record<string, string> = {
        Person: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        Organization: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        Place: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        Concept: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        Event: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
        Document: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
        default: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
    };

    const colorClass = typeColors[type] || typeColors.default;

    if (isEditing && !readOnly) {
        return (
            <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded border border-amber-500/30">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm"
                    autoFocus
                />
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="px-2 py-1 bg-background border border-border rounded text-sm"
                >
                    <option>Person</option>
                    <option>Organization</option>
                    <option>Place</option>
                    <option>Concept</option>
                    <option>Event</option>
                    <option>Document</option>
                </select>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onSave({ name, type })}
                        className="p-1 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20"
                        title="Save"
                    >
                        <Save className="w-3 h-3" />
                    </button>
                    <button
                        onClick={onCancel}
                        className="p-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"
                        title="Cancel"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between gap-2 p-1.5 rounded transition-colors group">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
                    {type}
                </span>
                <span className="text-sm text-foreground truncate" title={name}>{formatDisplayName(entity)}</span>
            </div>
            <div className="flex items-center gap-1">
                {/* Confidence score removed */}
                {!readOnly && (
                    <button
                        onClick={onEdit}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-background rounded transition-all text-muted-foreground hover:text-foreground"
                    >
                        <Edit3 className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
}
