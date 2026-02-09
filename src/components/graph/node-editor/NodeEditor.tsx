/**
 * Node Editor Panel
 * 
 * Slide-out panel for editing node properties inline.
 * Features: property editing, relationship management, delete confirmation.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Edit3,
    Save,
    Trash2,
    X,
    Plus,
    Link,
    Tag,
    Type,
    FileText,
    AlertTriangle,
    Check,
    ChevronDown,
    ExternalLink
} from 'lucide-react';

interface NodeProperty {
    key: string;
    value: string | number | boolean;
    type: 'string' | 'number' | 'boolean';
}

interface NodeRelationship {
    id: string;
    type: string;
    direction: 'incoming' | 'outgoing';
    targetId: string;
    targetName: string;
}

interface NodeData {
    id: string;
    name: string;
    type: string;
    description?: string;
    properties: NodeProperty[];
    relationships: NodeRelationship[];
}

interface NodeEditorProps {
    isOpen: boolean;
    node: NodeData | null;
    onClose: () => void;
    onSave: (node: NodeData) => Promise<void>;
    onDelete: (nodeId: string) => Promise<void>;
    onNavigateToNode: (nodeId: string) => void;
}

export function NodeEditor({ isOpen, node, onClose, onSave, onDelete, onNavigateToNode }: NodeEditorProps) {
    const [editedNode, setEditedNode] = useState<NodeData | null>(null);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [newPropertyKey, setNewPropertyKey] = useState('');
    const [newPropertyValue, setNewPropertyValue] = useState('');

    useEffect(() => {
        if (node) {
            setEditedNode({ ...node, properties: [...node.properties] });
        }
    }, [node]);

    const handleSave = async () => {
        if (!editedNode) return;
        setSaving(true);
        try {
            await onSave(editedNode);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editedNode) return;
        await onDelete(editedNode.id);
        setShowDeleteConfirm(false);
        onClose();
    };

    const updateProperty = (key: string, value: string | number | boolean) => {
        if (!editedNode) return;
        setEditedNode({
            ...editedNode,
            properties: editedNode.properties.map(p =>
                p.key === key ? { ...p, value } : p
            )
        });
    };

    const addProperty = () => {
        if (!editedNode || !newPropertyKey.trim()) return;
        setEditedNode({
            ...editedNode,
            properties: [
                ...editedNode.properties,
                { key: newPropertyKey.trim(), value: newPropertyValue, type: 'string' }
            ]
        });
        setNewPropertyKey('');
        setNewPropertyValue('');
    };

    const removeProperty = (key: string) => {
        if (!editedNode) return;
        setEditedNode({
            ...editedNode,
            properties: editedNode.properties.filter(p => p.key !== key)
        });
    };

    if (!editedNode) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/40"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 z-50 h-full w-96 bg-gradient-to-br from-slate-900 to-slate-800 border-l border-white/10 shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20">
                                    <Edit3 className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white">Edit Node</h2>
                                    <p className="text-xs text-white/50">{editedNode.id}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="h-[calc(100%-120px)] overflow-y-auto p-4 space-y-4">
                            {/* Basic Info */}
                            <div className="space-y-3">
                                <div>
                                    <label className="flex items-center gap-2 text-xs text-white/60 mb-1">
                                        <Type className="w-3 h-3" /> Name
                                    </label>
                                    <input
                                        value={editedNode.name}
                                        onChange={e => setEditedNode({ ...editedNode, name: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs text-white/60 mb-1">
                                        <Tag className="w-3 h-3" /> Type
                                    </label>
                                    <input
                                        value={editedNode.type}
                                        onChange={e => setEditedNode({ ...editedNode, type: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs text-white/60 mb-1">
                                        <FileText className="w-3 h-3" /> Description
                                    </label>
                                    <textarea
                                        value={editedNode.description || ''}
                                        onChange={e => setEditedNode({ ...editedNode, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Properties */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-white">Properties</h3>
                                    <span className="text-xs text-white/40">{editedNode.properties.length} props</span>
                                </div>
                                <div className="space-y-2">
                                    {editedNode.properties.map(prop => (
                                        <div key={prop.key} className="flex items-center gap-2">
                                            <span className="text-xs text-white/60 w-20 truncate">{prop.key}</span>
                                            <input
                                                value={String(prop.value)}
                                                onChange={e => updateProperty(prop.key, e.target.value)}
                                                className="flex-1 px-2 py-1 rounded bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                                            />
                                            <button
                                                onClick={() => removeProperty(prop.key)}
                                                className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add new property */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                        <input
                                            placeholder="Key"
                                            value={newPropertyKey}
                                            onChange={e => setNewPropertyKey(e.target.value)}
                                            className="w-20 px-2 py-1 rounded bg-slate-700 border border-white/10 text-white text-xs placeholder:text-white/30"
                                        />
                                        <input
                                            placeholder="Value"
                                            value={newPropertyValue}
                                            onChange={e => setNewPropertyValue(e.target.value)}
                                            className="flex-1 px-2 py-1 rounded bg-slate-700 border border-white/10 text-white text-xs placeholder:text-white/30"
                                        />
                                        <button
                                            onClick={addProperty}
                                            disabled={!newPropertyKey.trim()}
                                            className="p-1 rounded bg-emerald-500/20 text-emerald-400 disabled:opacity-50"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Relationships */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-white">Relationships</h3>
                                    <span className="text-xs text-white/40">{editedNode.relationships.length} links</span>
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {editedNode.relationships.map(rel => (
                                        <button
                                            key={rel.id}
                                            onClick={() => onNavigateToNode(rel.targetId)}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-white/5 hover:border-white/20 transition-colors text-left"
                                        >
                                            <Link className={`w-3 h-3 ${rel.direction === 'outgoing' ? 'text-blue-400' : 'text-orange-400'}`} />
                                            <span className="text-xs text-white/60">{rel.type}</span>
                                            <span className="text-xs text-white flex-1 truncate">{rel.targetName}</span>
                                            <ExternalLink className="w-3 h-3 text-white/30" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-sm">
                            {showDeleteConfirm ? (
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 flex items-center gap-2 text-amber-400">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-xs">Delete this node?</span>
                                    </div>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="px-3 py-1.5 rounded-lg text-xs bg-red-500 text-white hover:bg-red-600"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="flex-1" />
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-lg text-sm text-white/60 hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <>Saving...</>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Save
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default NodeEditor;
