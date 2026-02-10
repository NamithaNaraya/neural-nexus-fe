/**
 * Node Editor Modal
 * 
 * Modal for creating and editing nodes with full property support.
 * Features:
 * - Name, Type, Description fields
 * - Custom properties (key-value pairs)
 * - Color picker for styling
 * - Create/Update modes
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Save,
    Plus,
    Trash2,
    Palette,
    Circle,
    User,
    Building,
    Lightbulb,
    Calendar,
    MapPin,
    FileText,
    Tag,
} from 'lucide-react';
import { graphApi } from '@/lib/api';

interface NodeEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (node: any) => void;
    mode: 'create' | 'edit';
    initialData?: {
        id?: string;
        name?: string;
        type?: string;
        description?: string;
        properties?: Record<string, string>;
        color?: string;
    };
    folderId?: string;
    fileId?: string;
}

// Fallback node types with icons
const DEFAULT_NODE_TYPES = [
    { value: 'Person', label: 'Person', icon: User },
    { value: 'Organization', label: 'Organization', icon: Building },
    { value: 'Concept', label: 'Concept', icon: Lightbulb },
    { value: 'Event', label: 'Event', icon: Calendar },
    { value: 'Location', label: 'Location', icon: MapPin },
    { value: 'Document', label: 'Document', icon: FileText },
    { value: 'Topic', label: 'Topic', icon: Tag },
];

const ICON_MAP: Record<string, any> = {
    Person: User,
    Organization: Building,
    Concept: Lightbulb,
    Event: Calendar,
    Location: MapPin,
    Document: FileText,
    Topic: Tag,
};

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

export function NodeEditorModal({
    isOpen,
    onClose,
    onSuccess,
    mode,
    initialData,
    folderId,
    fileId,
}: NodeEditorModalProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [type, setType] = useState(initialData?.type || 'Concept');
    const [description, setDescription] = useState(initialData?.description || '');
    const [color, setColor] = useState(initialData?.color || '#6366F1');
    const [customProperties, setCustomProperties] = useState<Array<{ key: string; value: string }>>(
        Object.entries(initialData?.properties || {}).map(([key, value]) => ({ key, value }))
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableTypes, setAvailableTypes] = useState<any[]>(DEFAULT_NODE_TYPES);

    // Entity lookup state
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Load dynamic node types
    useEffect(() => {
        const loadTypes = async () => {
            try {
                const result = await graphApi.getNodeTypes();
                if (result.types && result.types.length > 0) {
                    const mapped = result.types.map(t => ({
                        value: t,
                        label: t,
                        icon: ICON_MAP[t] || Tag
                    }));
                    setAvailableTypes(mapped);
                }
            } catch (err) {
                console.error('Failed to load node types:', err);
            }
        };
        loadTypes();
    }, []);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name || '');
            setType(initialData.type || 'Concept');
            setDescription(initialData.description || '');
            setColor(initialData.color || '#6366F1');
            setCustomProperties(
                Object.entries(initialData.properties || {}).map(([key, value]) => ({ key, value }))
            );
        } else if (isOpen && mode === 'create') {
            setName('');
            setType('Concept');
            setDescription('');
            setColor('#6366F1');
            setCustomProperties([]);
        }
    }, [isOpen, initialData, mode]);

    // Handle entity lookup
    useEffect(() => {
        if (mode === 'create' && name.length >= 2) {
            const timer = setTimeout(async () => {
                setIsSearching(true);
                try {
                    const result = await graphApi.searchForCrud(name, folderId);
                    setSuggestions(result.nodes || []);
                    setShowSuggestions(result.nodes.length > 0);
                } catch (err) {
                    console.error('Search failed:', err);
                } finally {
                    setIsSearching(false);
                }
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [name, mode, folderId]);

    const selectSuggestion = (suggestion: any) => {
        setName(suggestion.name);
        setType(suggestion.type);
        setDescription(suggestion.description || '');
        setShowSuggestions(false);
    };

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
        if (!name.trim()) {
            setError('Name is required');
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

            if (mode === 'create') {
                const result = await graphApi.createNode({
                    name: name.trim(),
                    type,
                    description: description.trim(),
                    properties,
                    color,
                    folder_id: folderId,
                    file_id: fileId,
                });
                onSuccess(result.node);
            } else if (initialData?.id) {
                const result = await graphApi.updateNode(initialData.id, {
                    name: name.trim(),
                    type,
                    description: description.trim(),
                    properties,
                    color,
                });
                onSuccess({
                    id: initialData.id,
                    name: name.trim(),
                    type,
                    description: description.trim(),
                    properties,
                    color,
                });
            }

            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save node');
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
                        <h2 className="text-lg font-semibold text-foreground">
                            {mode === 'create' ? 'Create New Entity' : 'Edit Entity'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Name <span className="text-destructive">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onFocus={() => name.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                                    placeholder="Enter entity name..."
                                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    </div>
                                )}

                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-[60] left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden">
                                        <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-primary/5">
                                            Existing Entities Found
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {suggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion.id}
                                                    onClick={() => selectSuggestion(suggestion)}
                                                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                                                >
                                                    <div className="mt-0.5 p-1 rounded bg-primary/10 text-primary">
                                                        {ICON_MAP[suggestion.type] ?
                                                            React.createElement(ICON_MAP[suggestion.type], { className: "w-3 h-3" }) :
                                                            <Tag className="w-3 h-3" />
                                                        }
                                                    </div>
                                                    <div className="text-left overflow-hidden">
                                                        <div className="text-sm font-medium text-foreground truncate">{suggestion.name}</div>
                                                        <div className="text-xs text-muted-foreground truncate">{suggestion.type}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Type
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {availableTypes.slice(0, 8).map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => setType(value)}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${type === value
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="text-xs truncate w-full text-center">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description..."
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                            />
                        </div>

                        {/* Color */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                <Palette className="w-4 h-4 inline mr-2" />
                                Color
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {COLOR_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setColor(preset)}
                                        className={`w-8 h-8 rounded-full transition-all ${color === preset
                                            ? 'ring-2 ring-offset-2 ring-offset-card ring-white scale-110'
                                            : 'hover:scale-110'
                                            }`}
                                        style={{ backgroundColor: preset }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-8 h-8 rounded-full cursor-pointer"
                                />
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
                            disabled={isLoading || !name.trim()}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {mode === 'create' ? 'Create Entity' : 'Save Changes'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
