/**
 * Global Relationship Rename Modal
 * 
 * Allows users to rename relationship types across the entire graph or specific scopes.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    GitBranch,
    Globe,
    Folder,
    File,
    Check,
    AlertCircle,
    Search,
    Plus
} from 'lucide-react';
import { graphApi } from '@/lib/api/graph';
import { toast } from 'sonner';
import { useGraphStore } from '@/store/graphStore';
import { Modal } from '@/components/ui/Modal';

interface GlobalRenameModalProps {
    isOpen: boolean;
    onClose: () => void;
    folderId?: string;
    fileId?: string;
    initialOldType?: string;
    onSuccess?: () => void;
}

export function GlobalRenameModal({
    isOpen,
    onClose,
    folderId,
    fileId,
    initialOldType = '',
    onSuccess
}: GlobalRenameModalProps) {
    const { renameRelationshipTypeLocally } = useGraphStore();
    const [availableRelTypes, setAvailableRelTypes] = useState<string[]>([]);
    const [renameOldType, setRenameOldType] = useState(initialOldType);
    const [renameNewType, setRenameNewType] = useState('');
    const [renameScope, setRenameScope] = useState<'global' | 'folder' | 'file'>(folderId ? 'folder' : 'global');
    const [isRenaming, setIsRenaming] = useState(false);
    const [showOldTypeSuggestions, setShowOldTypeSuggestions] = useState(false);
    const [showNewTypeSuggestions, setShowNewTypeSuggestions] = useState(false);
    const [showNormalizationNote, setShowNormalizationNote] = useState(false);

    // Fetch types when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchTypes = async () => {
                try {
                    const res = await graphApi.getRelationshipTypes();
                    if (res.types) {
                        setAvailableRelTypes(res.types);
                    }
                } catch (e) {
                    console.error("Failed to fetch types", e);
                }
            };
            fetchTypes();
        }
    }, [isOpen]);

    // Update old type if initial changes
    useEffect(() => {
        if (initialOldType) {
            setRenameOldType(initialOldType);
        }
    }, [initialOldType]);

    const handleRename = async () => {
        if (!renameOldType || !renameNewType) return;

        setIsRenaming(true);
        try {
            const data = {
                old_type: renameOldType,
                new_type: renameNewType,
                folder_id: renameScope === 'folder' ? folderId : undefined,
                file_id: renameScope === 'file' ? fileId : undefined
            };

            const res = await graphApi.renameRelationshipType(data);

            if (res.success) {
                toast.success(`Successfully renamed ${res.affected_count} relationships`);

                // Update local store immediately for instant UI feedback
                renameRelationshipTypeLocally(renameOldType, renameNewType, {
                    folderId: renameScope === 'folder' ? folderId : undefined,
                    fileId: renameScope === 'file' ? fileId : undefined
                });

                // Dispatch event to refresh graph data
                window.dispatchEvent(new CustomEvent('graph-data-updated'));

                onSuccess?.();
                onClose();
                // Reset form
                setRenameNewType('');
            }
        } catch (e: any) {
            console.error("Rename failed", e);
            toast.error(e.response?.data?.detail || "Failed to rename relationship types");
        } finally {
            setIsRenaming(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal onClose={onClose}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/5">
                            <GitBranch className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground tracking-tight">Global Rename</h2>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em] opacity-70">Ontology Management</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground transition-colors border border-transparent hover:border-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-4 mb-2">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary/80 leading-relaxed font-medium">
                        This operation will update the type name of all matching relationships. This is permanent and affects graph analytics.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 relative">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Current Type</label>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-50 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                                <input
                                    type="text"
                                    value={renameOldType.replace(/_/g, ' ')}
                                    onChange={(e) => {
                                        setRenameOldType(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                                        setShowOldTypeSuggestions(true);
                                    }}
                                    onFocus={() => setShowOldTypeSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowOldTypeSuggestions(false), 200)}
                                    placeholder="SEARCH_TYPE"
                                    className="w-full bg-white dark:bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold tracking-wider uppercase shadow-inner"
                                />
                                <AnimatePresence>
                                    {showOldTypeSuggestions && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto scrollbar-thin"
                                        >
                                            {availableRelTypes
                                                .filter(t => t.toLowerCase().includes(renameOldType.toLowerCase()))
                                                .map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            setRenameOldType(type);
                                                            setShowOldTypeSuggestions(false);
                                                        }}
                                                        className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-primary/10 transition-colors border-b border-border last:border-0 flex items-center justify-between group"
                                                    >
                                                        <span className="text-foreground/80 group-hover:text-primary transition-colors">{type.replace(/_/g, ' ')}</span>
                                                        {renameOldType === type && <Check className="w-3 h-3 text-primary" />}
                                                    </button>
                                                ))}
                                            {availableRelTypes.filter(t => t.toLowerCase().includes(renameOldType.toLowerCase())).length === 0 && (
                                                <div className="p-4 text-xs text-muted-foreground text-center italic">No types found</div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                        <div className="space-y-1.5 relative">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">New Name</label>
                            <div className="relative group">
                                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-50 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                                <input
                                    type="text"
                                    value={renameNewType.replace(/_/g, ' ')}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        setRenameNewType(raw.toUpperCase().replace(/\s+/g, '_'));

                                        // Detect if user is typing lowercase or spaces to show conversion warning
                                        if (/[a-z\s]/.test(raw) && raw.length > 0) {
                                            setShowNormalizationNote(true);
                                        } else {
                                            setShowNormalizationNote(false);
                                        }
                                        setShowNewTypeSuggestions(true);
                                    }}
                                    onFocus={() => setShowNewTypeSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowNewTypeSuggestions(false), 200)}
                                    placeholder="NEW_TYPE_NAME"
                                    className="w-full bg-white dark:bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold tracking-wider uppercase shadow-inner"
                                />
                                <AnimatePresence>
                                    {showNewTypeSuggestions && renameNewType.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-40 overflow-y-auto scrollbar-thin"
                                        >
                                            <div className="px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase border-b border-border opacity-50">Suggestions from existing</div>
                                            {availableRelTypes
                                                .filter(t => t.toLowerCase().includes(renameNewType.toLowerCase()))
                                                .map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            setRenameNewType(type);
                                                            setShowNewTypeSuggestions(false);
                                                            setShowNormalizationNote(false);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-primary/10 transition-colors border-b border-border last:border-0"
                                                    >
                                                        {type.replace(/_/g, ' ')}
                                                    </button>
                                                ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {showNormalizationNote && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="absolute -bottom-6 left-1 flex items-center gap-1.5 text-primary"
                                        >
                                            <AlertCircle className="w-3 h-3" />
                                            <span className="text-[9px] font-bold uppercase">Auto-converted to UPPER_CASE</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Rename Scope</label>
                        <div className="grid grid-cols-3 gap-3">
                            <ScopeOption
                                icon={<Globe className="w-4 h-4" />}
                                label="GLOBAL"
                                active={renameScope === 'global'}
                                onClick={() => setRenameScope('global')}
                            />
                            <ScopeOption
                                icon={<Folder className="w-4 h-4" />}
                                label="FOLDER"
                                active={renameScope === 'folder'}
                                onClick={() => setRenameScope('folder')}
                                disabled={!folderId}
                            />
                            <ScopeOption
                                icon={<File className="w-4 h-4" />}
                                label="FILE"
                                active={renameScope === 'file'}
                                onClick={() => setRenameScope('file')}
                                disabled={!fileId}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-muted-foreground font-bold text-xs uppercase tracking-widest transition-all border border-white/5"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRename}
                        disabled={isRenaming || !renameOldType || !renameNewType}
                        className="flex-[2] py-3 px-6 bg-primary text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {isRenaming ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Commit Global Change
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

interface ScopeOptionProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
}

function ScopeOption({ icon, label, active, onClick, disabled }: ScopeOptionProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all duration-300
                ${disabled ? 'opacity-20 cursor-not-allowed border-transparent' :
                    active ? 'bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/10' :
                        'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10'}
            `}
        >
            {icon}
            <span className="text-[9px] font-bold tracking-widest">{label}</span>
        </button>
    );
}
