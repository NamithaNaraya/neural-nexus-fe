'use client';


import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from "@/components/layout/Header";
import { FolderSettingsModal } from "@/components/folder/FolderSettingsModal";
import { KnowledgeIngestModal } from "@/components/folder/KnowledgeIngestModal";
import api, { docAiApi, endpoints } from '@/lib/api';
import { useFolder, useFiles, useDeleteFile } from "@/hooks/useApi";
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
    Plus
} from 'lucide-react';
import { ReviewInboxPanel } from '@/components/graph/panels/ReviewInboxPanel';
import { FileExtractionDetails } from '@/components/shared/FileExtractionDetails';

interface FolderData {
    id: string;
    name: string;
    description: string;
    file_count: number;
    node_count: number;
    created_at: string;
    updated_at: string;
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

    const [activeTab, setActiveTab] = useState<'files' | 'review'>('files');
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
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!folderDetails) return null;

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
                                    <Users className="w-4 h-4" />
                                    {folderDetails.node_count} nodes extracted
                                </span>
                                <span className="flex items-center gap-1 select-none">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Last updated {new Date(folderDetails.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="h-11 w-11 hover:w-44 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all duration-500 shadow-xl shadow-emerald-600/20 flex items-center group overflow-hidden relative"
                            >
                                <div className="absolute left-[13px] flex items-center gap-3">
                                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                                    <span className="opacity-0 group-hover:opacity-100 transition-all duration-500 whitespace-nowrap font-bold text-sm tracking-tight">
                                        Ingest Knowledge
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={() => setShowSettingsModal(true)}
                                className="p-3 bg-muted rounded-2xl hover:bg-muted-foreground/10 transition-all duration-300 border border-border group/settings"
                                title="Topic Settings"
                            >
                                <Settings className="w-5 h-5 text-muted-foreground group-hover/settings:rotate-90 transition-transform duration-500" />
                            </button>
                            <button
                                onClick={handleOpenGraph}
                                className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Open Full Graph
                            </button>
                        </div>
                    </div>
                </div>

                {/* Removed file input as per instructions */}
                {/* <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                /> */}


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
                    {activeTab === 'files' ? (
                        <div className="space-y-4">
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
                                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors text-xs font-semibold"
                                                        >
                                                            <PlayCircle className="w-3.5 h-3.5" />
                                                            View Graph
                                                        </button>
                                                    )}
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
                                                                {/* Removed Verify & Ingest button as per instructions */}
                                                                {/* {file.status === 'ready_for_review' && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCommit(file.id);
                                                                        }}
                                                                        disabled={committingFileId === file.id}
                                                                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                                                                    >
                                                                        {committingFileId === file.id ? (
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Database className="w-3.5 h-3.5" />
                                                                        )}
                                                                        Verify & Ingest
                                                                    </button>
                                                                )} */}
                                                            </div>

                                                            <FileExtractionDetails
                                                                fileId={file.id}
                                                                isEditable={file.status === 'ready_for_review'}
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
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-xl min-h-[500px]">
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
                        </div>
                    )}
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
