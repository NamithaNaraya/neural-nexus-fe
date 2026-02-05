/**
 * Review Inbox Panel
 * 
 * The Quality Gate for AI-extracted data.
 * Features:
 * - List of files in 'ready_for_review' status
 * - Preview of extracted entities and relationships (via FileExtractionDetails)
 * - Approve/Reject actions
 */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Inbox,
    FileText,
    Check,
    X as XIcon,
    ChevronDown,
    ChevronRight,
    Loader2,
    CheckCircle2,
    XCircle,
    RotateCcw,
    AlertTriangle,
    Search,
    Users,
    Link2,
} from 'lucide-react';
import { docAiApi } from '@/lib/api';
import { FileExtractionDetails } from '@/components/shared/FileExtractionDetails';

// Re-exporting from shared component might be cleaner, but for now we just use the shared ones
// import { ExtractedEntity, ExtractedRelationship } from '@/components/shared/FileExtractionDetails';

interface PendingFile {
    id: string;
    filename: string;
    folder_id: string;
    folder_name: string;
    status: 'ready_for_review';
    created_at: string;
    entities_count: number;
    relationships_count: number;
}

interface ReviewInboxPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onApprove?: (fileId: string) => void;
    onReject?: (fileId: string) => void;
    folderId?: string; // Optional: Filter by folder
    variant?: 'overlay' | 'inline'; // Display mode
    className?: string;
}

export function ReviewInboxPanel({
    isOpen,
    onClose,
    onApprove,
    onReject,
    folderId,
    variant = 'overlay',
    className = '',
}: ReviewInboxPanelProps) {
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
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
                // Backend returns a List directly or wrapped
                const files = Array.isArray(response) ? response : (response.files || []);
                setPendingFiles(files);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load pending files');
        } finally {
            setIsLoading(false);
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
        setExpandedFileId(prev => prev === fileId ? null : fileId);
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

    // Filter files
    const filteredFiles = useMemo(() => {
        return pendingFiles.filter(f => {
            // Filter by folder if prop is present
            if (folderId && f.folder_id !== folderId) return false;

            // Search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return f.filename.toLowerCase().includes(query) ||
                    f.folder_name.toLowerCase().includes(query);
            }
            return true;
        });
    }, [pendingFiles, folderId, searchQuery]);

    if (!isOpen) return null;

    // Overlay styles vs Inline styles
    const containerClasses = variant === 'overlay'
        ? `fixed left-0 top-0 bottom-0 w-[420px] bg-card/98 backdrop-blur-xl border-r border-border shadow-2xl z-50 flex flex-col ${className}`
        : `w-full h-full flex flex-col bg-background ${className}`;

    const ContentWrapper = variant === 'overlay' ? motion.div : 'div';
    const contentProps = variant === 'overlay' ? {
        initial: { x: -400, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: -400, opacity: 0 },
        className: containerClasses
    } : {
        className: containerClasses
    };

    return (
        <ContentWrapper {...contentProps}>
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
                                {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} awaiting approval
                            </p>
                        </div>
                    </div>
                    {variant === 'overlay' && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    )}
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
                        <p className="text-sm font-medium text-foreground mb-1">
                            {searchQuery ? 'No matching files' : 'All caught up!'}
                        </p>
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
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Actions */}
            {filteredFiles.length > 0 && (
                <div className="p-4 border-t border-border bg-muted/30">
                    <div className="flex gap-2">
                        <button
                            onClick={() => filteredFiles.forEach(f => handleApprove(f.id))}
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
        </ContentWrapper>
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
}

function FileReviewCard({
    file,
    isExpanded,
    isProcessing,
    onToggle,
    onApprove,
    onReject,
}: FileReviewCardProps) {
    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
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
                        <div className="p-3">
                            <FileExtractionDetails
                                fileId={file.id}
                                isEditable={true}
                                className="mb-4"
                            />

                            {/* Actions */}
                            <div className="flex gap-2">
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
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ReviewInboxPanel;
