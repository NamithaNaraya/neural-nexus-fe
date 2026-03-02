'use client';


import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from "@/components/layout/Header";
import { FolderSettingsModal } from "@/components/folder/FolderSettingsModal";
import { KnowledgeIngestModal } from "@/components/folder/KnowledgeIngestModal";
import api, { docAiApi, endpoints } from '@/lib/api';
import { useFolder, useFiles, useDeleteFile, useBrowseTypes, useBrowseNodes } from "@/hooks/useApi";
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder,
    FileText,
    Settings,
    ChevronLeft,
    Share2,
    Trash2,
    PlayCircle,
    Inbox,
    List,
    Loader2,
    ChevronDown,
    ChevronRight,
    Database,
    Users,
    Link2,
    CheckCircle2,
    AlertTriangle,
    Check,
    X,
    Pencil,
    Network,
    Info,
    Plus,
    Search,
    ArrowUpRight,
    GitMerge
} from 'lucide-react';
import { ReviewInboxPanel } from '@/components/graph/panels/ReviewInboxPanel';
import { FileExtractionDetails } from '@/components/shared/FileExtractionDetails';
import { MergeNodesModal } from "@/components/shared/MergeNodesModal";
import { formatDisplayName } from '@/utils/graphUtils';

interface FolderData {
    id: string;
    name: string;
    description: string;
    file_count: number;
    node_count: number;
    created_at: string;
    updated_at: string;
    permission: 'owner' | 'write' | 'read';
}

interface FileData {
    id: string;
    filename: string;
    file_type: string;
    status: string;
    node_count: number;
    relationship_count: number;
    created_at: string;
}

export default function FolderPage() {
    const params = useParams();
    const router = useRouter();
    const folderId = params.folderId as string;

    const { data: folderDetails, isLoading: isLoadingFolder, error: folderError, refetch: refetchFolder } = useFolder(folderId);
    const { data: files, isLoading: isLoadingFiles, error: filesError, refetch: refetchFiles } = useFiles(folderId);
    const deleteFileMutation = useDeleteFile();

    const [activeTab, setActiveTab] = useState<'files' | 'review' | 'browse'>('files');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Renaming state
    const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    // const fileInputRef = React.useRef<HTMLInputElement>(null); // Removed as per instructions

    // Handle initial tab from URL
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const tab = searchParams.get('tab');
        if (tab === 'review') {
            setActiveTab('review');
        } else if (tab === 'files') {
            setActiveTab('files');
        } else if (tab === 'browse') {
            setActiveTab('browse');
        }
    }, []);
    const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
    // const [committingFileId, setCommittingFileId] = useState<string | null>(null); // Removed as per instructions

    // Fetch Folder Data - Replaced by useFolderDetails and useFolderFiles hooks
    useEffect(() => {
        if (folderError) {
            console.error('Failed to load folder data:', folderError);
            router.push('/library');
        }
    }, [folderError, router]);

    const handleOpenGraph = () => {
        router.push(`/graph?folder=${folderId}`);
    };

    // handleCommit removed as per instructions, now handled by KnowledgeIngestModal
    // const handleCommit = async (fileId: string) => {
    //     setCommittingFileId(fileId);
    //     try {
    //         await api.post(`/ upload / ${fileId}/approve`);
    //         // Refresh data
    //         const filesRes = await api.get(`/folders/${folderId}/files`);
    //         setFiles(filesRes as FileData[]);
    //     } catch (err) {
    //         console.error("Failed to commit:", err);
    //         alert("Failed to commit knowledge. Please try again.");
    //     } finally {
    //         setCommittingFileId(null);
    //     }
    // };

    const handleRename = async (fileId: string) => {
        if (!newName.trim()) {
            setRenamingFileId(null);
            return;
        }

        try {
            await docAiApi.files.updateFile(fileId, { filename: newName });
            refetchFiles(); // Refresh files after rename
        } catch (err) {
            console.error("Failed to rename:", err);
        } finally {
            setRenamingFileId(null);
        }
    };

    // handleFileSelect removed as per instructions, now handled by KnowledgeIngestModal
    // const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    //     const file = e.target.files?.[0];
    //     if (file) {
    //         const formData = new FormData();
    //         formData.append('file', file);
    //         formData.append('folder_id', folderId);

    //         try {
    //             await api.upload(endpoints.files.upload, formData);
    //             // Refresh data
    //             const filesData = await docAiApi.folders.getFiles(folderId) as FileData[];
    //             setFiles(filesData);
    //         } catch (err) {
    //             console.error("Upload failed:", err);
    //         }
    //     }
    //     if (fileInputRef.current) fileInputRef.current.value = '';
    // };

    if (isLoadingFolder || isLoadingFiles) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!folderDetails) return null;

    // Determine permission level
    const permission = (folderDetails as FolderData).permission || 'owner';
    const isReadOnly = permission === 'read';
    const canEdit = permission === 'owner' || permission === 'write';

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
                {/* Breadcrumbs & Header */}
                <div>
                    <button
                        onClick={() => router.push('/library')}
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back to Library
                    </button>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                                <Folder className="w-8 h-8 text-amber-500" />
                                {folderDetails.name}
                                {/* Shared badge */}
                                {permission !== 'owner' && (
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${permission === 'write'
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                        }`}>
                                        {permission === 'write' ? 'Shared · Edit' : 'Shared · View Only'}
                                    </span>
                                )}
                            </h1>
                            <p className="mt-2 text-muted-foreground max-w-2xl">
                                {folderDetails.description || 'No description provided.'}
                            </p>
                            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    {folderDetails.file_count} files
                                </span>
                                <span className="flex items-center gap-1">
                                    <Database className="w-4 h-4 text-emerald-500" />
                                    {folderDetails.node_count} nodes extracted
                                </span>
                                <span className="flex items-center gap-1 select-none">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Last updated {new Date(folderDetails.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {canEdit && (
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all text-sm font-semibold"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Ingest Data</span>
                                </button>
                            )}
                            {permission === 'owner' && (
                                <button
                                    onClick={() => setShowSettingsModal(true)}
                                    className="p-2 bg-muted/50 rounded-xl hover:bg-muted border border-border transition-all group/settings"
                                    title="Topic Settings"
                                >
                                    <Settings className="w-4 h-4 text-muted-foreground group-hover/settings:rotate-90 transition-transform duration-500" />
                                </button>
                            )}
                            <button
                                onClick={handleOpenGraph}
                                className="flex items-center gap-2 px-3.5 py-1.5 bg-purple-500/10 text-purple-600 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-all text-sm font-semibold"
                            >
                                <PlayCircle className="w-4 h-4" />
                                <span>View Graph</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border mb-6">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('files')}
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'files'
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                        >
                            <List className="w-4 h-4" />
                            Files & Data
                        </button>
                        <button
                            onClick={() => setActiveTab('browse')}
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'browse'
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                        >
                            <Database className="w-4 h-4" />
                            Browse Data
                        </button>
                        <button
                            onClick={() => setActiveTab('review')}
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'review'
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                        >
                            <Inbox className="w-4 h-4" />
                            Review Inbox
                        </button>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'files' && (
                            <motion.div
                                key="files"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* File List Header */}
                                <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    <div className="col-span-7">Filename</div>
                                    <div className="col-span-1">Status</div>
                                    <div className="col-span-2 text-right">Date</div>
                                    <div className="col-span-2 text-right px-4">Actions</div>
                                </div>

                                {/* Files */}
                                <div className="space-y-2">
                                    {files && files.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>No files uploaded yet.</p>
                                        </div>
                                    ) : (
                                        files && files.map((file: FileData) => (
                                            <div
                                                key={file.id}
                                                className="border-b border-border transition-all hover:bg-muted/30"
                                            >
                                                <div
                                                    className="grid grid-cols-12 gap-4 px-4 py-4 items-center cursor-pointer"
                                                    onClick={() => setExpandedFileId(expandedFileId === file.id ? null : file.id)}
                                                >
                                                    <div className="col-span-7 flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg ${expandedFileId === file.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                                                            }`}>
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        {renamingFileId === file.id ? (
                                                            <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    value={newName}
                                                                    onChange={(e) => setNewName(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleRename(file.id);
                                                                        if (e.key === 'Escape') setRenamingFileId(null);
                                                                    }}
                                                                    className="flex-1 bg-background border border-primary rounded-md px-2 py-1 text-sm outline-none"
                                                                />
                                                                <button onClick={() => handleRename(file.id)} className="text-emerald-500 hover:scale-110 transition-transform"><Check className="w-4 h-4" /></button>
                                                                <button onClick={() => setRenamingFileId(null)} className="text-red-500 hover:scale-110 transition-transform"><X className="w-4 h-4" /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex-1 flex items-center group/name min-w-0">
                                                                <span className="font-medium truncate text-sm">{file.filename}</span>
                                                                {canEdit && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setNewName(file.filename);
                                                                            setRenamingFileId(file.id);
                                                                        }}
                                                                        className="ml-2 p-1 opacity-0 group-hover/name:opacity-100 hover:bg-muted rounded transition-all"
                                                                        title="Rename"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {expandedFileId === file.id ? (
                                                            <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                    <div className="col-span-1">
                                                        <StatusBadge status={file.status} />
                                                    </div>
                                                    <div className="col-span-2 text-right text-sm text-muted-foreground font-medium">
                                                        {new Date(file.created_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="col-span-2 text-right px-2 flex items-center justify-end gap-2">
                                                        {file.status === 'completed' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/graph?folder=${folderId}&file=${file.id}`);
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-600 border border-purple-500/20 hover:bg-purple-500/20 rounded-md transition-colors text-xs font-semibold"
                                                            >
                                                                <PlayCircle className="w-3.5 h-3.5" />
                                                                View Graph
                                                            </button>
                                                        )}
                                                        {canEdit && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm('Are you sure you want to delete this file?')) {
                                                                        deleteFileMutation.mutate(file.id, {
                                                                            onSuccess: () => {
                                                                                refetchFiles(); // Refresh files after deletion
                                                                            }
                                                                        });
                                                                    }
                                                                }}
                                                                disabled={deleteFileMutation.isPending}
                                                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                                title="Delete File"
                                                            >
                                                                {deleteFileMutation.isPending ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                <AnimatePresence>
                                                    {expandedFileId === file.id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="border-t border-border bg-muted/5"
                                                        >
                                                            <div className="p-6">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <h3 className="font-semibold flex items-center gap-2">
                                                                        <List className="w-4 h-4 text-primary" />
                                                                        Extracted Data Information
                                                                    </h3>
                                                                </div>

                                                                <FileExtractionDetails
                                                                    fileId={file.id}
                                                                    isEditable={canEdit && file.status === 'ready_for_review'}
                                                                    className="bg-transparent"
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'browse' && (
                            <motion.div
                                key="browse"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <BrowseData folderId={folderId} isReadOnly={isReadOnly} />
                            </motion.div>
                        )}

                        {activeTab === 'review' && (
                            <motion.div
                                key="review"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-card border border-border rounded-xl min-h-[500px]"
                            >
                                <ReviewInboxPanel
                                    isOpen={true}
                                    onClose={() => { }}
                                    variant="inline"
                                    folderId={folderId}
                                    className="rounded-xl"
                                    onApprove={() => {
                                        // Refresh file list if anything approved
                                        refetchFiles();
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Settings Modal */}
            {showSettingsModal && folderDetails && (
                <FolderSettingsModal
                    folder={folderDetails}
                    onClose={() => setShowSettingsModal(false)}
                    onUpdate={() => refetchFolder()}
                    onDeleteSuccess={() => router.push('/library')}
                />
            )}

            {/* Ingest Modal */}
            {showUploadModal && (
                <KnowledgeIngestModal
                    folderId={folderId as string}
                    folderName={folderDetails?.name || "Topic"}
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={() => refetchFiles()}
                />
            )}
        </div>
    );
}

function BrowseData({ folderId, isReadOnly = false }: { folderId: string; isReadOnly?: boolean }) {
    const router = useRouter();
    const { data: typeData, isLoading: typesLoading } = useBrowseTypes(folderId);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [isMergeMode, setIsMergeMode] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset page and selection when type or search changes
    useEffect(() => {
        setPage(1);
        setSelectedNodeIds([]);
        setIsMergeMode(false);
    }, [selectedType, debouncedSearch]);

    // Set initial type
    useEffect(() => {
        if (typeData?.types.length && !selectedType) {
            setSelectedType(typeData.types[0].type);
        }
    }, [typeData, selectedType]);

    const { data: nodeData, isLoading: nodesLoading } = useBrowseNodes(selectedType || "", {
        folder_id: folderId,
        q: debouncedSearch || undefined,
        page,
        page_size: 20
    });

    if (typesLoading) return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

    const types = typeData?.types || [];
    const nodes = nodeData?.nodes || [];
    const totalPages = nodeData?.total_pages || 0;

    // Get all possible connection types for columns from the current result set
    const connectionTypes = Array.from(new Set(nodes.flatMap(n => Object.keys(n.connections || {})))).sort();

    return (
        <div className="space-y-6">
            {/* Type Selector Tabs */}
            <div className="flex gap-2 p-1 bg-muted/50 rounded-xl overflow-x-auto no-scrollbar">
                {types.length === 0 ? (
                    <div className="flex-1 text-center py-4 text-muted-foreground text-sm">
                        No entities extracted in this topic yet
                    </div>
                ) : (
                    types.map((t) => (
                        <button
                            key={t.type}
                            onClick={() => setSelectedType(t.type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedType === t.type
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            {t.type}
                            <span className="ml-2 opacity-60 text-xs">{t.count}</span>
                        </button>
                    ))
                )}
            </div>

            {types.length > 0 && (
                <>
                    {/* Filters */}
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${selectedType || 'nodes'}...`}
                                className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>

                        {!isReadOnly && (
                            <button
                                onClick={() => {
                                    setIsMergeMode(!isMergeMode);
                                    setSelectedNodeIds([]);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${isMergeMode
                                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20"
                                    : "bg-muted/30 text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                                    }`}
                                title={isMergeMode ? "Cancel merge operation" : "Enter merge mode to consolidate entities"}
                            >
                                <GitMerge className="w-4 h-4" />
                                {isMergeMode ? "Cancel Merge" : "Merge Entities"}
                            </button>
                        )}

                        {!isReadOnly && isMergeMode && selectedNodeIds.length >= 2 && (
                            <button
                                onClick={() => setShowMergeModal(true)}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 animate-in zoom-in-95 duration-200"
                            >
                                <Check className="w-4 h-4" />
                                Confirm Merge ({selectedNodeIds.length})
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col" style={{ height: '480px' }}>
                        <div className="overflow-x-auto flex-shrink-0">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground/60">
                                        {isMergeMode && (
                                            <th className="px-4 py-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={nodes.length > 0 && selectedNodeIds.length === nodes.length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedNodeIds(nodes.map(n => n.id));
                                                        else setSelectedNodeIds([]);
                                                    }}
                                                    className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                                                />
                                            </th>
                                        )}
                                        <th className="px-6 py-4 font-bold">Name</th>
                                        {connectionTypes.map(ct => (
                                            <th key={ct} className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                                                → {ct}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                            </table>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-hide">
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-border">
                                    {nodesLoading ? (
                                        Array(8).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-2/3" /></td>
                                                {connectionTypes.map(ct => (
                                                    <td key={ct} className="px-6 py-4"><div className="h-4 bg-muted rounded w-8 mx-auto" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : nodes.length === 0 ? (
                                        <tr>
                                            <td colSpan={connectionTypes.length + 1} className="px-6 py-10 text-center text-muted-foreground font-medium">
                                                No {selectedType || 'nodes'} found matching your selection
                                            </td>
                                        </tr>
                                    ) : (
                                        nodes.map((node, idx) => (
                                            <tr
                                                key={node.id}
                                                className={`hover:bg-muted/30 transition-colors group cursor-pointer ${selectedNodeIds.includes(node.id) ? "bg-emerald-500/5 border-l-2 border-l-emerald-500" : ""
                                                    }`}
                                                style={{ animation: `fadeInRow 0.15s ease-out ${idx * 0.03}s both` }}
                                            >
                                                {isMergeMode && (
                                                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedNodeIds.includes(node.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedNodeIds(prev => [...prev, node.id]);
                                                                else setSelectedNodeIds(prev => prev.filter(id => id !== node.id));
                                                            }}
                                                            className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                    </td>
                                                )}
                                                <td
                                                    className="px-6 py-4 font-semibold text-foreground group-hover:text-emerald-500 group-hover:underline transition-colors"
                                                    onClick={() => router.push(`/graph?folder=${folderId}&node=${node.id}`)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {formatDisplayName(node)}
                                                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all text-emerald-500" />
                                                    </div>
                                                </td>
                                                {connectionTypes.map(ct => (
                                                    <td key={ct} className="px-6 py-4 text-center">
                                                        {node.connections[ct] ? (
                                                            <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600">
                                                                {node.connections[ct]}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground opacity-20">-</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 bg-muted/20 border-t border-border flex items-center justify-between">
                                <p className="text-sm text-muted-foreground font-medium">
                                    Page <span className="text-foreground">{page}</span> of <span className="text-foreground">{totalPages}</span>
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {showMergeModal && (
                <MergeNodesModal
                    nodes={nodes.filter(n => selectedNodeIds.includes(n.id))}
                    onClose={() => setShowMergeModal(false)}
                    onSuccess={() => {
                        setSelectedNodeIds([]);
                    }}
                />
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        uploading: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        failed: 'bg-red-500/10 text-red-500 border-red-500/20',
        ready_for_review: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        rejected: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };

    const style = styles[status] || styles.failed;

    // Custom labels
    const labels: Record<string, string> = {
        ready_for_review: 'Awaiting Ingest',
        completed: 'Ingested',
        processing: 'AI Extraction',
    };

    const label = labels[status] || status.replace(/_/g, ' ');

    return (
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border uppercase tracking-wider ${style}`}>
            {label}
        </span>
    );
}
