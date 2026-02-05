/**
 * Relationship Editor Modal
 * 
 * Modal for creating relationships between nodes.
 * Features:
 * - Source node display
 * - Target node selection (searchable)
 * - Relationship type selection
 * - Custom properties
 */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Save,
    Link,
    Search,
    ArrowRight,
    Plus,
    Trash2,
} from 'lucide-react';
import { graphApi } from '@/lib/api';

interface RelationshipEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (relationship: any) => void;
    sourceNode: {
        id: string;
        name: string;
        type?: string;
    };
    availableNodes: Array<{
        id: string;
        name: string;
        type?: string;
    }>;
}

const RELATIONSHIP_TYPES = [
    'RELATED_TO',
    'BELONGS_TO',
    'PART_OF',
    'CREATED_BY',
    'WORKS_AT',
    'LOCATED_IN',
    'KNOWS',
    'CONTAINS',
    'DERIVED_FROM',
    'SIMILAR_TO',
    'DEPENDS_ON',
    'REFERENCES',
];

export function RelationshipEditorModal({
    isOpen,
    onClose,
    onSuccess,
    sourceNode,
    availableNodes,
}: RelationshipEditorModalProps) {
    const [targetId, setTargetId] = useState('');
    const [relationshipType, setRelationshipType] = useState('RELATED_TO');
    const [customType, setCustomType] = useState('');
    const [useCustomType, setUseCustomType] = useState(false);
    const [strength, setStrength] = useState(1.0);
    const [searchQuery, setSearchQuery] = useState('');
    const [customProperties, setCustomProperties] = useState<Array<{ key: string; value: string }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter nodes for search (exclude source node)
    const filteredNodes = useMemo(() => {
        return availableNodes
            .filter(n => n.id !== sourceNode.id)
            .filter(n =>
                n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (n.type && n.type.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .slice(0, 20);
    }, [availableNodes, sourceNode.id, searchQuery]);

    // Selected target node
    const selectedTarget = useMemo(() => {
        return availableNodes.find(n => n.id === targetId);
    }, [availableNodes, targetId]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setTargetId('');
            setRelationshipType('RELATED_TO');
            setCustomType('');
            setUseCustomType(false);
            setStrength(1.0);
            setSearchQuery('');
            setCustomProperties([]);
            setError(null);
        }
    }, [isOpen]);

    const addProperty = () => {
        setCustomProperties([...customProperties, { key: '', value: '' }]);
    };

    const removeProperty = (index: number) => {
        setCustomProperties(customProperties.filter((_, i) => i !== index));
    };

    const updateProperty = (index: number, field: 'key' | 'value', value: string) => {
        const updated = [...customProperties];
        updated[index][field] = value;
        setCustomProperties(updated);
    };

    const handleSubmit = async () => {
        if (!targetId) {
            setError('Please select a target node');
            return;
        }

        const finalType = useCustomType ? customType.trim() : relationshipType;
        if (!finalType) {
            setError('Please select or enter a relationship type');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Convert custom properties array to object
            const properties: Record<string, string> = {};
            customProperties.forEach(({ key, value }) => {
                if (key.trim()) {
                    properties[key.trim()] = value;
                }
            });

            const result = await graphApi.createRelationship({
                source_id: sourceNode.id,
                target_id: targetId,
                type: finalType,
                strength,
                properties,
            });

            onSuccess(result.relationship);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create relationship');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Link className="w-5 h-5 text-primary" />
                            Create Relationship
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                        {/* Visual Connection Display */}
                        <div className="flex items-center justify-center gap-4 py-4 px-6 rounded-xl bg-muted/30 border border-border">
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                                    <span className="text-lg font-bold text-primary">
                                        {sourceNode.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate max-w-[80px]">
                                    {sourceNode.name}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="h-0.5 w-8 bg-border" />
                                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                                <div className="h-0.5 w-8 bg-border" />
                            </div>

                            <div className="text-center">
                                {selectedTarget ? (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                                            <span className="text-lg font-bold text-emerald-500">
                                                {selectedTarget.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate max-w-[80px]">
                                            {selectedTarget.name}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-2">
                                            <span className="text-lg text-muted-foreground">?</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Select target</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Target Node Search */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Target Node <span className="text-destructive">*</span>
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search nodes..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            {/* Node List */}
                            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/30">
                                {filteredNodes.length === 0 ? (
                                    <p className="p-3 text-sm text-muted-foreground text-center">
                                        No matching nodes found
                                    </p>
                                ) : (
                                    filteredNodes.map((node) => (
                                        <button
                                            key={node.id}
                                            onClick={() => setTargetId(node.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${targetId === node.id
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'hover:bg-muted'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${targetId === node.id
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted-foreground/20 text-muted-foreground'
                                                }`}>
                                                {node.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{node.name}</p>
                                                {node.type && (
                                                    <p className="text-xs text-muted-foreground">{node.type}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Relationship Type */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Relationship Type <span className="text-destructive">*</span>
                            </label>

                            <div className="flex flex-wrap gap-2 mb-2">
                                {RELATIONSHIP_TYPES.slice(0, 6).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            setRelationshipType(type);
                                            setUseCustomType(false);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!useCustomType && relationshipType === type
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-border'
                                            }`}
                                    >
                                        {type.replace(/_/g, ' ')}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={customType}
                                    onChange={(e) => {
                                        setCustomType(e.target.value);
                                        setUseCustomType(true);
                                    }}
                                    placeholder="Or enter custom type..."
                                    className="flex-1 px-4 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                />
                            </div>
                        </div>

                        {/* Strength */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Relationship Strength: {strength.toFixed(1)}
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="2.0"
                                step="0.1"
                                value={strength}
                                onChange={(e) => setStrength(parseFloat(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none bg-muted cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Weak</span>
                                <span>Strong</span>
                            </div>
                        </div>

                        {/* Custom Properties */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-foreground">
                                    Custom Properties
                                </label>
                                <button
                                    onClick={addProperty}
                                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add Property
                                </button>
                            </div>
                            <div className="space-y-2">
                                {customProperties.map((prop, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={prop.key}
                                            onChange={(e) => updateProperty(index, 'key', e.target.value)}
                                            placeholder="Key"
                                            className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                        />
                                        <input
                                            type="text"
                                            value={prop.value}
                                            onChange={(e) => updateProperty(index, 'value', e.target.value)}
                                            placeholder="Value"
                                            className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                        />
                                        <button
                                            onClick={() => removeProperty(index)}
                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !targetId}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Link className="w-4 h-4" />
                            )}
                            Create Relationship
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
