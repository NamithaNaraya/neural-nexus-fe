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
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute left-6 top-6 bottom-6 w-[400px] glass-strong z-30 flex flex-col rounded-[2rem] border border-white/10 shadow-[20px_0_60px_rgba(0,0,0,0.3)] overflow-hidden"
        >
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10 border border-emerald-500/30">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight text-foreground">Discovery Scope</h3>
                            <p className="text-[10px] text-emerald-500/60 font-black uppercase tracking-[0.2em]">Librarian Protocol</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-2xl hover:bg-white/10 transition-all duration-300 text-muted-foreground hover:text-foreground border border-transparent hover:border-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <button
                    onClick={showAll}
                    className={`
                        w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 relative overflow-hidden group
                        ${isAllShown
                            ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                            : 'bg-white/5 hover:bg-white/10 text-foreground/80 hover:text-foreground border border-white/5 hover:border-white/20'
                        }
                    `}
                >
                    <Eye className={`w-4 h-4 ${isAllShown ? 'animate-pulse' : ''}`} />
                    <span className="relative z-10">Global Synchronization</span>
                    <span className={`ml-auto px-2 py-0.5 rounded-lg text-[9px] font-black ${isAllShown ? 'bg-black/20 text-white' : 'bg-white/5 text-muted-foreground'}`}>
                        {totalFiles} OBJECTS
                    </span>
                    {isAllShown && (
                        <motion.div
                            layoutId="active-bg"
                            className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500"
                        />
                    )}
                </button>
            </div>

            {/* Folder Tree */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/5 space-y-2">
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

                {folders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <Folder className="w-12 h-12 mb-4" />
                        <p className="text-[10px] font-black tracking-[0.3em] uppercase">NO DATA STREAMS FOUND</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            {selectedFileIds.size > 0 && (
                <div className="p-5 border-t border-white/10 bg-white/5">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                            Active Focal Point
                        </p>
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            {selectedFileIds.size} FILES
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// Properties Interfaces
interface FolderNodeProps {
    folder: FolderItem;
    isExpanded: boolean;
    selectedFileIds: Set<string>;
    isCurrent: boolean;
    onToggleFolder: () => void;
    onToggleFile: (fileId: string) => void;
    onSelectAll: () => void;
}

interface FileNodeProps {
    file: FileItem;
    isSelected: boolean;
    onToggle: () => void;
}

// Folder Node Component
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
    const selectedCount = folder.files.filter((f: FileItem) => selectedFileIds.has(f.id)).length;
    const allSelected = selectedCount === fileCount && fileCount > 0;
    const someSelected = selectedCount > 0 && selectedCount < fileCount;

    return (
        <div className="space-y-1.5 p-1">
            {/* Folder Header */}
            <div
                className={`
                    flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 border
                    ${isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                        : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10'
                    }
                `}
                onClick={onToggleFolder}
            >
                <div className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-primary" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                </div>

                <div className={`p-2 rounded-xl ${isCurrent ? 'bg-emerald-500/20' : 'bg-black/20'}`}>
                    <Folder className={`w-4 h-4 ${isCurrent ? 'text-emerald-400' : 'text-amber-400'}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-foreground truncate block">
                        {folder.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60 font-black uppercase tracking-widest">
                        {fileCount} DOCUMENTS
                    </span>
                </div>

                {/* Select all checkbox */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectAll();
                    }}
                    className={`
                        w-6 h-6 rounded-xl border flex items-center justify-center transition-all duration-300
                        ${allSelected
                            ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                            : someSelected
                                ? 'bg-emerald-500/20 border-emerald-500/40'
                                : 'border-white/10 hover:border-white/30 bg-black/20'
                        }
                    `}
                >
                    {allSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    {someSelected && <div className="w-2 h-0.5 bg-emerald-500 rounded-full" />}
                </button>
            </div>

            {/* Files */}
            {isExpanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="ml-8 space-y-1.5 py-1"
                >
                    {folder.files.map((file: FileItem) => (
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
function FileNode({ file, isSelected, onToggle }: FileNodeProps) {
    return (
        <button
            onClick={onToggle}
            className={`
                w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 text-left border group
                ${isSelected
                    ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
                    : 'bg-transparent border-transparent hover:bg-white/5 text-foreground/70 hover:text-foreground'
                }
            `}
        >
            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-500/20' : 'bg-black/20 group-hover:bg-white/5'}`}>
                <File className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-muted-foreground/60'}`} />
            </div>

            <div className="flex-1 min-w-0">
                <span className="text-xs font-bold truncate block tracking-tight">{file.name}</span>
                {file.nodeCount !== undefined && (
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-40">
                        {file.nodeCount} FRAGMENTS
                    </span>
                )}
            </div>

            <div
                className={`
                    w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-300
                    ${isSelected
                        ? 'bg-emerald-500 border-emerald-500 shadow-sm'
                        : 'border-white/5 bg-black/20 group-hover:border-white/20'
                    }
                `}
            >
                {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
        </button>
    );
}
