/**
 * Review Inbox Panel
 * 
 * The Quality Gate for AI-extracted data.
 * Shows pending ingestions waiting for user approval.
 * Features:
 * - List of files in 'ready_for_review' status
 * - Preview of extracted entities and relationships
 * - Inline editing for names and types
 * - Approve/Reject actions
 * - Persistent state (survives browser close)
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Inbox,
    FileText,
    Check,
    X as XIcon,
    ChevronDown,
    ChevronRight,
    Edit3,
    Save,
    RotateCcw,
    AlertTriangle,
    Clock,
    Loader2,
    CheckCircle2,
    XCircle,
    Eye,
    Users,
    Link2,
    Search,
} from 'lucide-react';
import { docAiApi } from '@/lib/api';

interface ExtractedEntity {
    id: string;
    name: string;
    type: string;
    description: string;
    confidence: number;
    source_chunk?: string;
}

interface ExtractedRelationship {
    id: string;
    source_name: string;
    target_name: string;
    type: string;
    confidence: number;
}

interface PendingFile {
    id: string;
    filename: string;
    folder_id: string;
    folder_name: string;
    status: 'ready_for_review';
    created_at: string;
    entities_count: number;
    relationships_count: number;
    entities?: ExtractedEntity[];
    relationships?: ExtractedRelationship[];
}

interface ReviewInboxPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onApprove?: (fileId: string) => void;
    onReject?: (fileId: string) => void;
}

export function ReviewInboxPanel({
    isOpen,
    onClose,
    onApprove,
    onReject,
}: ReviewInboxPanelProps) {
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
    const [editingEntity, setEditingEntity] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [processing, setProcessing] = useState<Set<string>>(new Set());

    // Fetch pending files
    const fetchPendingFiles = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await docAiApi.files.listPending() as {
                error?: string;
                files?: PendingFile[];
            };

            if (response.error) {
                setError(response.error);
            } else {
                // Backend returns a List directly, not wrapped in { files: [...] }
                const files = Array.isArray(response) ? response : (response.files || []);
                setPendingFiles(files);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load pending files');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch file details when expanded
    const fetchFileDetails = useCallback(async (fileId: string) => {
        try {
            const response = await docAiApi.files.getExtractionPreview(fileId) as {
                entities?: ExtractedEntity[];
                relationships?: ExtractedRelationship[];
            };

            setPendingFiles(prev =>
                prev.map(f =>
                    f.id === fileId
                        ? { ...f, entities: response.entities, relationships: response.relationships }
                        : f
                )
            );
        } catch (e) {
            console.error('Failed to fetch file details:', e);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        if (isOpen) {
            fetchPendingFiles();
        }
    }, [isOpen, fetchPendingFiles]);

    // Handle file expansion
    const handleExpand = (fileId: string) => {
        if (expandedFileId === fileId) {
            setExpandedFileId(null);
        } else {
            setExpandedFileId(fileId);
            const file = pendingFiles.find(f => f.id === fileId);
            if (file && !file.entities) {
                fetchFileDetails(fileId);
            }
        }
    };

    // Approve file
    const handleApprove = async (fileId: string) => {
        setProcessing(prev => new Set(prev).add(fileId));
        try {
            await docAiApi.files.approveIngestion(fileId);
            setPendingFiles(prev => prev.filter(f => f.id !== fileId));
            onApprove?.(fileId);
        } catch (e) {
            console.error('Approval failed:', e);
        } finally {
            setProcessing(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
        }
    };

    // Reject file
    const handleReject = async (fileId: string) => {
        setProcessing(prev => new Set(prev).add(fileId));
        try {
            await docAiApi.files.rejectIngestion(fileId);
            setPendingFiles(prev => prev.filter(f => f.id !== fileId));
            onReject?.(fileId);
        } catch (e) {
            console.error('Rejection failed:', e);
        } finally {
            setProcessing(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
        }
    };

    // Filter files by search
    const filteredFiles = pendingFiles.filter(f =>
        f.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.folder_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            className="fixed left-0 top-0 bottom-0 w-[420px] bg-card/98 backdrop-blur-xl border-r border-border shadow-2xl z-50 flex flex-col"
        >
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <Inbox className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-foreground">Review Inbox</h2>
                            <p className="text-xs text-muted-foreground">
                                {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} awaiting approval
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-3" />
                        <p className="text-sm">Loading pending files...</p>
                    </div>
                )}

                {error && (
                    <div className="m-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">Error</span>
                        </div>
                        <p className="text-xs text-red-400 mt-1">{error}</p>
                    </div>
                )}

                {!isLoading && !error && filteredFiles.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mb-4" />
                        <p className="text-sm font-medium text-foreground mb-1">All caught up!</p>
                        <p className="text-xs">No files pending review</p>
                    </div>
                )}

                {/* File List */}
                <div className="p-3 space-y-3">
                    <AnimatePresence>
                        {filteredFiles.map((file) => (
                            <FileReviewCard
                                key={file.id}
                                file={file}
                                isExpanded={expandedFileId === file.id}
                                isProcessing={processing.has(file.id)}
                                onToggle={() => handleExpand(file.id)}
                                onApprove={() => handleApprove(file.id)}
                                onReject={() => handleReject(file.id)}
                                editingEntity={editingEntity}
                                onEditEntity={setEditingEntity}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Actions */}
            {pendingFiles.length > 0 && (
                <div className="p-4 border-t border-border bg-muted/30">
                    <div className="flex gap-2">
                        <button
                            onClick={() => pendingFiles.forEach(f => handleApprove(f.id))}
                            className="flex-1 py-2 px-4 bg-emerald-500/10 text-emerald-500 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Approve All
                        </button>
                        <button
                            onClick={fetchPendingFiles}
                            className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                            title="Refresh"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// File Review Card Component
interface FileReviewCardProps {
    file: PendingFile;
    isExpanded: boolean;
    isProcessing: boolean;
    onToggle: () => void;
    onApprove: () => void;
    onReject: () => void;
    editingEntity: string | null;
    onEditEntity: (id: string | null) => void;
}

function FileReviewCard({
    file,
    isExpanded,
    isProcessing,
    onToggle,
    onApprove,
    onReject,
    editingEntity,
    onEditEntity,
}: FileReviewCardProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-background border border-border rounded-xl overflow-hidden"
        >
            {/* Header */}
            <div
                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate text-sm">
                            {file.filename}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            {file.folder_name} • {new Date(file.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Users className="w-3 h-3" />
                                {file.entities_count} entities
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Link2 className="w-3 h-3" />
                                {file.relationships_count} relationships
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border"
                    >
                        <div className="p-3 space-y-3">
                            {/* Entities Preview */}
                            {file.entities && file.entities.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        Extracted Entities
                                    </h5>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {file.entities.slice(0, 10).map((entity) => (
                                            <EntityPreviewRow
                                                key={entity.id}
                                                entity={entity}
                                                isEditing={editingEntity === entity.id}
                                                onEdit={() => onEditEntity(entity.id)}
                                                onSave={() => onEditEntity(null)}
                                            />
                                        ))}
                                        {file.entities.length > 10 && (
                                            <p className="text-[10px] text-muted-foreground text-center py-1">
                                                +{file.entities.length - 10} more entities
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Relationships Preview */}
                            {file.relationships && file.relationships.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        Extracted Relationships
                                    </h5>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {file.relationships.slice(0, 5).map((rel) => (
                                            <div
                                                key={rel.id}
                                                className="flex items-center gap-1.5 text-xs p-1.5 bg-muted/50 rounded"
                                            >
                                                <span className="font-medium text-foreground truncate max-w-[80px]">
                                                    {rel.source_name}
                                                </span>
                                                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[10px]">
                                                    {rel.type}
                                                </span>
                                                <span className="font-medium text-foreground truncate max-w-[80px]">
                                                    {rel.target_name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Loading state for details */}
                            {!file.entities && (
                                <div className="flex items-center justify-center py-4 text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    <span className="text-xs">Loading details...</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={onApprove}
                                    disabled={isProcessing}
                                    className="flex-1 py-1.5 px-3 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Check className="w-3 h-3" />
                                    )}
                                    Approve
                                </button>
                                <button
                                    onClick={onReject}
                                    disabled={isProcessing}
                                    className="flex-1 py-1.5 px-3 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    <XCircle className="w-3 h-3" />
                                    Reject
                                </button>
                                <button
                                    className="p-1.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                                    title="Preview in graph"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Entity Preview Row with inline editing
interface EntityPreviewRowProps {
    entity: ExtractedEntity;
    isEditing: boolean;
    onEdit: () => void;
    onSave: () => void;
}

function EntityPreviewRow({ entity, isEditing, onEdit, onSave }: EntityPreviewRowProps) {
    const [name, setName] = useState(entity.name);
    const [type, setType] = useState(entity.type);

    const typeColors: Record<string, string> = {
        Person: 'text-emerald-500 bg-emerald-500/10',
        Organization: 'text-blue-500 bg-blue-500/10',
        Place: 'text-orange-500 bg-orange-500/10',
        Concept: 'text-purple-500 bg-purple-500/10',
        Event: 'text-pink-500 bg-pink-500/10',
        default: 'text-gray-500 bg-gray-500/10',
    };

    const colorClass = typeColors[type] || typeColors.default;

    if (isEditing) {
        return (
            <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded border border-amber-500/30">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-2 py-1 bg-background border border-border rounded text-xs"
                    autoFocus
                />
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="px-2 py-1 bg-background border border-border rounded text-xs"
                >
                    <option>Person</option>
                    <option>Organization</option>
                    <option>Place</option>
                    <option>Concept</option>
                    <option>Event</option>
                    <option>Document</option>
                </select>
                <button
                    onClick={onSave}
                    className="p-1 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20"
                >
                    <Save className="w-3 h-3" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between gap-2 p-1.5 bg-muted/50 rounded group hover:bg-muted transition-colors">
            <div className="flex items-center gap-2 min-w-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                    {type}
                </span>
                <span className="text-xs text-foreground truncate">{name}</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                    {(entity.confidence * 100).toFixed(0)}%
                </span>
                <button
                    onClick={onEdit}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-background rounded transition-all"
                >
                    <Edit3 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

export default ReviewInboxPanel;
