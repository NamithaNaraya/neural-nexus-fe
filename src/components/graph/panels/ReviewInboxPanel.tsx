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
    Terminal,
    Code,
    Sparkles,
} from 'lucide-react';
import api, { docAiApi } from '@/lib/api';
import { Database } from 'lucide-react';
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

    // Verify & Ingest file
    const handleVerifyAndIngest = async (fileId: string) => {
        setProcessing(prev => new Set(prev).add(fileId));
        try {
            await docAiApi.files.approveIngestion(fileId);
            setPendingFiles(prev => prev.filter(f => f.id !== fileId));
            onApprove?.(fileId);
        } catch (e) {
            console.error('Ingestion failed:', e);
        } finally {
            setProcessing(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
        }
    };

    // Reject/Discard file
    const handleDiscard = async (fileId: string) => {
        setProcessing(prev => new Set(prev).add(fileId));
        try {
            await api.post(`/files/${fileId}/reject`); // Adjust endpoint if needed
            setPendingFiles(prev => prev.filter(f => f.id !== fileId));
            onReject?.(fileId);
        } catch (e) {
            console.error('Discard failed:', e);
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
                            <h2 className="font-semibold text-foreground">Verification Inbox</h2>
                            <p className="text-xs text-muted-foreground">
                                {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} awaiting ingestion
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
                                onApprove={() => handleVerifyAndIngest(file.id)}
                                onReject={() => handleDiscard(file.id)}
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
                            onClick={() => filteredFiles.forEach(f => handleVerifyAndIngest(f.id))}
                            className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Database className="w-4 h-4" />
                            Verify & Ingest All
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
    const [showCypherConsole, setShowCypherConsole] = useState(false);
    const [cypherQuery, setCypherQuery] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleExecuteCypher = async () => {
        if (!cypherQuery.trim()) return;
        setIsExecuting(true);
        setExecutionResult(null);

        try {
            const data = await api.post('/upload/cypher', {
                query: cypherQuery,
                folder_id: file.folder_id,
                file_id: file.id,
                filename: file.filename
            }) as any;

            setExecutionResult({
                success: true,
                message: data.message || 'Data appended successfully!'
            });
            setCypherQuery('');
            // Optional: trigger refresh of FileExtractionDetails
        } catch (err) {
            console.error('Cypher execution failed:', err);
            setExecutionResult({
                success: false,
                message: (err as any).detail || 'Execution failed'
            });
        } finally {
            setIsExecuting(false);
        }
    };

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

                            {/* Cypher Console Toggle */}
                            <div className="mb-4">
                                <button
                                    onClick={() => setShowCypherConsole(!showCypherConsole)}
                                    className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${showCypherConsole
                                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                        : 'bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <Terminal className="w-3.5 h-3.5" />
                                    {showCypherConsole ? 'Close Cypher Console' : 'Append Knowledge via Cypher'}
                                </button>

                                <AnimatePresence>
                                    {showCypherConsole && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mt-3 space-y-3 overflow-hidden"
                                        >
                                            <div className="relative">
                                                <textarea
                                                    value={cypherQuery}
                                                    onChange={(e) => setCypherQuery(e.target.value)}
                                                    placeholder="CREATE (n:Entity {id: randomUUID(), name: 'New Concept', type: 'Concept', folder_id: $folder_id, file_ids: [$file_id]})"
                                                    className="w-full h-32 px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                                                />
                                                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-background/80 backdrop-blur rounded text-[10px] text-muted-foreground border border-border">
                                                    $file_id, $folder_id available
                                                </div>
                                            </div>

                                            {executionResult && (
                                                <div className={`p-2 rounded flex items-center gap-2 text-[11px] ${executionResult.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {executionResult.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    {executionResult.message}
                                                </div>
                                            )}

                                            <button
                                                onClick={handleExecuteCypher}
                                                disabled={isExecuting || !cypherQuery.trim()}
                                                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                                                Execute & Append
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={onReject}
                                    disabled={isProcessing}
                                    className="flex-1 py-2 px-3 border border-border text-muted-foreground rounded-lg text-sm font-bold hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Discard This File
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
