/**
 * Node Editor Modal
 * 
 * Simplified modal for creating nodes.
 * Steps: Select type → Enter name → Create
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
    graphNodeTypes?: string[];
}

const ICON_MAP: Record<string, any> = {
    Person: User,
    Organization: Building,
    Concept: Lightbulb,
    Event: Calendar,
    Location: MapPin,
    Document: FileText,
    Topic: Tag,
};

export function NodeEditorModal({
    isOpen,
    onClose,
    onSuccess,
    mode,
    initialData,
    folderId,
    fileId,
    graphNodeTypes = [],
}: NodeEditorModalProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [type, setType] = useState(initialData?.type || graphNodeTypes[0] || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name || '');
            setType(initialData.type || graphNodeTypes[0] || '');
        } else if (isOpen && mode === 'create') {
            setName('');
            setType(graphNodeTypes[0] || '');
            setError(null);
        }
    }, [isOpen, initialData, mode, graphNodeTypes]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        if (!type) {
            setError('Please select a type');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (mode === 'create') {
                const result = await graphApi.createNode({
                    name: name.trim(),
                    type,
                    description: '',
                    properties: {},
                    color: '',
                    folder_id: folderId,
                    file_id: fileId,
                });
                onSuccess(result.node);
            } else if (initialData?.id) {
                await graphApi.updateNode(initialData.id, {
                    name: name.trim(),
                    type,
                    description: initialData.description || '',
                    properties: initialData.properties || {},
                    color: initialData.color || '',
                });
                onSuccess({
                    id: initialData.id,
                    name: name.trim(),
                    type,
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

    const Icon = ICON_MAP[type] || Tag;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-gray-800">
                            {mode === 'create' ? 'Create Node' : 'Edit Node'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-5">
                        {/* Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {graphNodeTypes.map((t) => {
                                    const TypeIcon = ICON_MAP[t] || Tag;
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => setType(t)}
                                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${type === t
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-primary/40 hover:bg-gray-100'
                                                }`}
                                        >
                                            <TypeIcon className="w-4 h-4" />
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setError(null); }}
                                placeholder="Enter node name..."
                                autoFocus
                                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !name.trim() || !type}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            {mode === 'create' ? 'Create' : 'Save'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
