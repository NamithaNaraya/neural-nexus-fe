/**
 * File Scope Panel
 * 
 * Librarian sidebar for toggling file visibility in the graph.
 * Features:
 * - Folder tree structure
 * - File checkboxes for inclusion/exclusion
 * - Quick scope presets (All, Folder, File)
 */
'use client';

import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Folder,
    File,
    Check,
    ChevronRight,
    ChevronDown,
    Eye,
    EyeOff,
    X,
    Layers,
} from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';

interface FileItem {
    id: string;
    name: string;
    nodeCount?: number;
}

interface FolderItem {
    id: string;
    name: string;
    files: FileItem[];
    isExpanded?: boolean;
}

interface FileScopePanelProps {
    folders: FolderItem[];
    currentFolderId?: string;
    onClose: () => void;
    onScopeChange?: (fileIds: string[]) => void;
}

export function FileScopePanel({
    folders,
    currentFolderId,
    onClose,
    onScopeChange,
}: FileScopePanelProps) {
    const { filters, setFilters } = useGraphStore();
    const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(() => {
        // Auto-expand current folder
        return new Set(currentFolderId ? [currentFolderId] : []);
    });

    // Get currently selected file IDs from filters
    const selectedFileIds = useMemo(() => {
        return new Set(filters.fileIds || []);
    }, [filters.fileIds]);

    // Toggle folder expansion
    const toggleFolder = useCallback((folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    }, []);

    // Toggle file selection
    const toggleFile = useCallback((fileId: string) => {
        const currentIds = filters.fileIds || [];
        const updated = currentIds.includes(fileId)
            ? currentIds.filter(id => id !== fileId)
            : [...currentIds, fileId];

        setFilters({ fileIds: updated });
        onScopeChange?.(updated);
    }, [filters.fileIds, setFilters, onScopeChange]);

    // Select all files in a folder
    const selectAllInFolder = useCallback((folder: FolderItem) => {
        const folderFileIds = folder.files.map(f => f.id);
        const currentIds = filters.fileIds || [];
        const allSelected = folderFileIds.every(id => currentIds.includes(id));

        const updated = allSelected
            ? currentIds.filter(id => !folderFileIds.includes(id))
            : Array.from(new Set([...currentIds, ...folderFileIds]));

        setFilters({ fileIds: updated });
        onScopeChange?.(updated);
    }, [filters.fileIds, setFilters, onScopeChange]);

    // Show all files (clear filter)
    const showAll = useCallback(() => {
        setFilters({ fileIds: [] });
        onScopeChange?.([]);
    }, [setFilters, onScopeChange]);

    // Get total counts
    const totalFiles = useMemo(() => {
        return folders.reduce((sum, f) => sum + f.files.length, 0);
    }, [folders]);

    const isAllShown = selectedFileIds.size === 0;

    return (
        <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden flex flex-col h-full"
        >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald" />
                    <h3 className="font-semibold text-foreground">View Scope</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-b border-border space-y-2">
                <button
                    onClick={showAll}
                    className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                        ${isAllShown
                            ? 'bg-emerald/10 text-emerald border border-emerald/30'
                            : 'bg-muted hover:bg-muted/80 text-foreground'
                        }
                    `}
                >
                    <Eye className="w-4 h-4" />
                    <span>Show All Files</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                        {totalFiles} files
                    </span>
                </button>
            </div>

            {/* Folder Tree */}
            <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-1">
                    {folders.map(folder => (
                        <FolderNode
                            key={folder.id}
                            folder={folder}
                            isExpanded={expandedFolders.has(folder.id)}
                            selectedFileIds={selectedFileIds}
                            isCurrent={folder.id === currentFolderId}
                            onToggleFolder={() => toggleFolder(folder.id)}
                            onToggleFile={toggleFile}
                            onSelectAll={() => selectAllInFolder(folder)}
                        />
                    ))}
                </div>

                {folders.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No folders available
                    </p>
                )}
            </div>

            {/* Footer */}
            {selectedFileIds.size > 0 && (
                <div className="p-3 border-t border-border bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                        Showing nodes from {selectedFileIds.size} selected file(s)
                    </p>
                </div>
            )}
        </motion.div>
    );
}

// Folder Node Component
interface FolderNodeProps {
    folder: FolderItem;
    isExpanded: boolean;
    selectedFileIds: Set<string>;
    isCurrent: boolean;
    onToggleFolder: () => void;
    onToggleFile: (fileId: string) => void;
    onSelectAll: () => void;
}

function FolderNode({
    folder,
    isExpanded,
    selectedFileIds,
    isCurrent,
    onToggleFolder,
    onToggleFile,
    onSelectAll,
}: FolderNodeProps) {
    const fileCount = folder.files.length;
    const selectedCount = folder.files.filter(f => selectedFileIds.has(f.id)).length;
    const allSelected = selectedCount === fileCount && fileCount > 0;
    const someSelected = selectedCount > 0 && selectedCount < fileCount;

    return (
        <div className="space-y-1">
            {/* Folder Header */}
            <div
                className={`
                    flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors
                    ${isCurrent ? 'bg-emerald/10' : 'hover:bg-muted/50'}
                `}
            >
                <button
                    onClick={onToggleFolder}
                    className="p-0.5 hover:bg-muted rounded"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                </button>

                <Folder className={`w-4 h-4 ${isCurrent ? 'text-emerald' : 'text-amber-500'}`} />

                <span
                    className="flex-1 text-sm font-medium text-foreground truncate"
                    onClick={onToggleFolder}
                >
                    {folder.name}
                </span>

                {/* Select all checkbox */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectAll();
                    }}
                    className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                        ${allSelected
                            ? 'bg-emerald border-emerald'
                            : someSelected
                                ? 'bg-emerald/30 border-emerald'
                                : 'border-muted-foreground/30 hover:border-muted-foreground'
                        }
                    `}
                >
                    {(allSelected || someSelected) && (
                        <Check className="w-3 h-3 text-white" />
                    )}
                </button>
            </div>

            {/* Files */}
            {isExpanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-6 space-y-0.5"
                >
                    {folder.files.map(file => (
                        <FileNode
                            key={file.id}
                            file={file}
                            isSelected={selectedFileIds.has(file.id)}
                            onToggle={() => onToggleFile(file.id)}
                        />
                    ))}
                </motion.div>
            )}
        </div>
    );
}

// File Node Component
interface FileNodeProps {
    file: FileItem;
    isSelected: boolean;
    onToggle: () => void;
}

function FileNode({ file, isSelected, onToggle }: FileNodeProps) {
    return (
        <button
            onClick={onToggle}
            className={`
                w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left
                ${isSelected
                    ? 'bg-emerald/10 text-emerald'
                    : 'hover:bg-muted/50 text-foreground'
                }
            `}
        >
            <File className={`w-4 h-4 ${isSelected ? 'text-emerald' : 'text-muted-foreground'}`} />
            <span className="flex-1 text-sm truncate">{file.name}</span>

            {file.nodeCount !== undefined && (
                <span className="text-xs text-muted-foreground">
                    {file.nodeCount} nodes
                </span>
            )}

            <div
                className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                    ${isSelected
                        ? 'bg-emerald border-emerald'
                        : 'border-muted-foreground/30'
                    }
                `}
            >
                {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
        </button>
    );
}
