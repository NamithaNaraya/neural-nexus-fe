"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useFolders, useCreateFolder, useDeleteFolder, useUpdateFolder, useShareFolder, useUploadFile } from "@/hooks/useApi";
import { Header } from "@/components/layout/Header";
import {
    Plus,
    Folder,
    Search,
    MoreHorizontal,
    FileText,
    Loader2,
    X,
    AlertCircle,
    Upload,
    Trash2,
    Edit,
    Share2,
    AlertTriangle,
    Check,
    ChevronRight,
    FileUp,
    Brain,
    Database,
    Network,
    Sparkles,
    CheckCircle2,
    Clock,
    XCircle,
    Inbox,
} from "lucide-react";
import api from "@/lib/api";

// Types
interface FolderData {
    id: string;
    name: string;
    description?: string;
    file_count: number;
    node_count: number;
    created_at: string;
    updated_at: string;
}

interface UploadingFile {
    id: string;
    file: File;
    status: 'uploading' | 'processing' | 'completed' | 'failed' | 'ready_for_review';
    fileId?: string;
    progress: number;
    currentStage: number;
    error?: string;
    extractionPreview?: any;
    folder_id?: string;
}

// Pipeline stages
const PIPELINE_STAGES = [
    { id: 'upload', label: 'Uploading', icon: FileUp, description: 'Sending file to server' },
    { id: 'parsing', label: 'Parsing', icon: FileText, description: 'Extracting content' },
    { id: 'extraction', label: 'Extraction', icon: Brain, description: 'AI processing' },
    { id: 'review', label: 'Verify', icon: Database, description: 'Review & Ingest' },
];

// Format relative time
function formatRelativeTime(dateString: string): string {
    if (!dateString) return "Never";

    let date = new Date(dateString);
    // Handle naive UTC strings from backend
    if (dateString && !dateString.endsWith("Z") && !dateString.includes("+")) {
        date = new Date(dateString + "Z");
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

function LibraryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, isHydrated } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderDesc, setNewFolderDesc] = useState("");

    // Modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<FolderData | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Rename state
    const [renameValue, setRenameValue] = useState("");

    // Share state
    const [shareEmail, setShareEmail] = useState("");
    const [sharePermission, setSharePermission] = useState("read");

    // Upload state
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Past Text state
    const [uploadType, setUploadType] = useState<'file' | 'text'>('file');
    const [pastedText, setPastedText] = useState('');
    const [pastedFilename, setPastedFilename] = useState('');
    const [committingFileId, setCommittingFileId] = useState<string | null>(null);

    // API hooks
    const { data: folders, isLoading, error, refetch } = useFolders();
    const createFolderMutation = useCreateFolder();
    const deleteFolderMutation = useDeleteFolder();
    const updateFolderMutation = useUpdateFolder();
    const shareFolderMutation = useShareFolder();
    const uploadFileMutation = useUploadFile();

    // Auto-open create modal if action=create param is present
    useEffect(() => {
        if (searchParams.get('action') === 'create') {
            setShowCreateModal(true);
            window.history.replaceState({}, '', '/library');
        }
    }, [searchParams]);

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, isHydrated, router]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-menu-button]')) return;
            setOpenMenuId(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Poll for file status updates
    useEffect(() => {
        const processingFiles = uploadingFiles.filter(f => f.status === 'processing' && f.fileId);
        if (processingFiles.length === 0) return;

        const interval = setInterval(async () => {
            for (const file of processingFiles) {
                if (!file.fileId) continue;
                try {
                    const data = await api.get(`/files/${file.fileId}/status`) as any;

                    setUploadingFiles(prev => prev.map(f => {
                        if (f.id !== file.id) return f;

                        let currentStage = f.currentStage;
                        let status = data.status;

                        // Map backend progress to UI stages (0, 1, 2, 3)
                        // Backend progress 0-25: Uploading (Stage 0)
                        // Backend progress 26-50: Parsing (Stage 1)
                        // Backend progress 51-75: Extraction (Stage 2)
                        // Status 'ready_for_review': Ingest (Stage 3)
                        // Status 'completed': Done (Progress 100)

                        if (data.status === 'completed' || (data.progress && data.progress === 100)) {
                            currentStage = 4; // Beyond stages
                        } else if (data.status === 'ready_for_review') {
                            currentStage = 3;
                        } else if (data.progress && data.progress > 50) {
                            currentStage = 2;
                        } else if (data.progress && data.progress > 25) {
                            currentStage = 1;
                        } else {
                            currentStage = 0;
                        }

                        if (data.status === 'failed') {
                            return { ...f, status: 'failed', error: data.error_message || 'Processing failed' };
                        }

                        return {
                            ...f,
                            status: status as any,
                            currentStage,
                            progress: data.progress || (currentStage / 3) * 100,
                        };
                    }));

                    // If status just became ready_for_review, fetch preview data
                    if (data.status === 'ready_for_review' && file.status !== 'ready_for_review') {
                        try {
                            const preview = await api.get(`/files/${file.fileId}/extraction-preview`);
                            setUploadingFiles(prev => prev.map(f =>
                                f.id === file.id ? { ...f, extractionPreview: preview } : f
                            ));
                        } catch (err) {
                            console.error('Failed to fetch preview:', err);
                        }
                    }
                } catch (err) {
                    console.error('Failed to poll file status:', err);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [uploadingFiles]);

    if (!isHydrated || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald animate-spin" />
            </div>
        );
    }

    const handleFolderClick = (folderId: string) => {
        router.push(`/folders/${folderId}`);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            await createFolderMutation.mutateAsync({
                name: newFolderName.trim(),
                description: newFolderDesc.trim() || undefined,
            });
            setShowCreateModal(false);
            setNewFolderName("");
            setNewFolderDesc("");
            refetch();
        } catch (err) {
            console.error("Failed to create folder:", err);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, folder: FolderData) => {
        e.stopPropagation();
        setSelectedFolder(folder);
        setShowDeleteModal(true);
        setOpenMenuId(null);
    };

    const handleConfirmDelete = async () => {
        if (!selectedFolder) return;

        try {
            await deleteFolderMutation.mutateAsync(selectedFolder.id);
            setShowDeleteModal(false);
            setSelectedFolder(null);
            refetch();
        } catch (err) {
            console.error("Failed to delete folder:", err);
        }
    };

    const handleRenameClick = (e: React.MouseEvent, folder: FolderData) => {
        e.stopPropagation();
        setSelectedFolder(folder);
        setRenameValue(folder.name);
        setShowRenameModal(true);
        setOpenMenuId(null);
    };

    const handleConfirmRename = async () => {
        if (!selectedFolder || !renameValue.trim()) return;

        try {
            await updateFolderMutation.mutateAsync({
                folderId: selectedFolder.id,
                data: { name: renameValue.trim() }
            });
            setShowRenameModal(false);
            setSelectedFolder(null);
            setRenameValue("");
            refetch();
        } catch (err) {
            console.error("Failed to rename folder:", err);
        }
    };

    const handleShareClick = (e: React.MouseEvent, folder: FolderData) => {
        e.stopPropagation();
        setSelectedFolder(folder);
        setShareEmail("");
        setSharePermission("read");
        setShowShareModal(true);
        setOpenMenuId(null);
    };

    const handleConfirmShare = async () => {
        if (!selectedFolder || !shareEmail.trim()) return;

        try {
            await shareFolderMutation.mutateAsync({
                folderId: selectedFolder.id,
                userEmail: shareEmail.trim(),
                permission: sharePermission,
            });
            setShowShareModal(false);
            setSelectedFolder(null);
            setShareEmail("");
        } catch (err) {
            console.error("Failed to share folder:", err);
        }
    };

    const handleUploadClick = (e: React.MouseEvent, folder: FolderData) => {
        e.stopPropagation();
        setSelectedFolder(folder);
        setUploadingFiles([]);
        setShowUploadModal(true);
        setOpenMenuId(null);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement> | File[]) => {
        const files = Array.isArray(e) ? e : e.target.files;
        if (!files || !selectedFolder) return;

        const newFiles: UploadingFile[] = Array.from(files).map(file => ({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            file,
            status: 'uploading',
            progress: 0,
            currentStage: 0,
            folder_id: selectedFolder?.id,
        }));

        setUploadingFiles(prev => [...prev, ...newFiles]);

        // Upload each file
        for (const uploadFile of newFiles) {
            try {
                // Stage 0: Uploading
                setUploadingFiles(prev => prev.map(f =>
                    f.id === uploadFile.id ? { ...f, currentStage: 0, progress: 0 } : f
                ));

                const result = await uploadFileMutation.mutateAsync({
                    folderId: selectedFolder.id,
                    file: uploadFile.file
                });

                // Stage 1: Parsing started
                setUploadingFiles(prev => prev.map(f =>
                    f.id === uploadFile.id
                        ? { ...f, status: 'processing', fileId: result.file_id, currentStage: 1, progress: 33 }
                        : f
                ));

            } catch (err) {
                setUploadingFiles(prev => prev.map(f =>
                    f.id === uploadFile.id
                        ? { ...f, status: 'failed', error: (err as Error).message }
                        : f
                ));
            }
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Handle text ingestion
    const handleTextIngest = async () => {
        if (!pastedText.trim() || !pastedFilename.trim() || !selectedFolder) return;

        const textFileId = `text-${Date.now()}`;
        const newFile: UploadingFile = {
            id: textFileId,
            file: new File([pastedText], pastedFilename, { type: 'text/plain' }),
            status: 'uploading',
            progress: 0,
            currentStage: 0,
            folder_id: selectedFolder.id,
        };

        setUploadingFiles(prev => [...prev, newFile]);
        setUploadType('file'); // Switch back to see progress
        setPastedText('');
        setPastedFilename('');

        try {
            const result = await api.post<any>('/upload/text', {
                filename: pastedFilename,
                content: pastedText,
                folder_id: selectedFolder.id
            });

            const fileId = result.file_id;

            setUploadingFiles(prev => prev.map(f =>
                f.id === textFileId
                    ? { ...f, status: 'processing', fileId, currentStage: 1, progress: 33 }
                    : f
            ));

        } catch (error: any) {
            console.error("Text ingestion failed:", error);
            setUploadingFiles(prev => prev.map(f =>
                f.id === textFileId ? { ...f, status: 'failed', error: error.detail || 'Failed to ingest text' } : f
            ));
        }
    };

    const handleCommit = async (file: UploadingFile) => {
        if (!file.fileId) return;
        setCommittingFileId(file.id);
        try {
            await api.post(`/upload/${file.fileId}/approve`);
            setUploadingFiles(prev => prev.map(f =>
                f.id === file.id ? { ...f, status: 'completed', currentStage: 4, progress: 100 } : f
            ));
            refetch(); // Update library counts
        } catch (err) {
            console.error("Failed to commit:", err);
        } finally {
            setCommittingFileId(null);
        }
    };

    const handleMenuToggle = (e: React.MouseEvent, folderId: string) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === folderId ? null : folderId);
    };

    // Filter folders by search
    const filteredFolders = (folders as FolderData[] || []).filter((folder) =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background">
            <Header />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-2">Your Library</h2>
                    <p className="text-muted-foreground">Select a topic to explore its knowledge graph</p>
                </div>

                {/* Search and Create */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search topics..."
                            className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:border-emerald/50 transition-all"
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald hover:bg-emerald-dark text-white font-medium rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Topic</span>
                    </motion.button>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-emerald animate-spin" />
                        <span className="ml-3 text-muted-foreground">Loading your library...</span>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="flex items-center justify-center py-20 text-center">
                        <div>
                            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                            <p className="text-destructive mb-2">Failed to load folders</p>
                            <p className="text-muted-foreground text-sm mb-4">{(error as Error).message || "Please check your connection"}</p>
                            <button onClick={() => refetch()} className="px-4 py-2 bg-emerald text-white rounded-lg hover:bg-emerald-dark transition-colors">
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {/* Folder Grid */}
                {!isLoading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFolders.map((folder, index) => (
                            <motion.div
                                key={folder.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => handleFolderClick(folder.id)}
                                className="group cursor-pointer"
                            >
                                <div className="p-6 rounded-xl border border-border bg-card hover:border-emerald/50 hover:shadow-lg hover:shadow-emerald/5 transition-all duration-300">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-lg bg-emerald/10 group-hover:bg-emerald/20 transition-colors">
                                            <Folder className="w-6 h-6 text-emerald" />
                                        </div>

                                        {/* Dropdown Menu */}
                                        <div className="relative">
                                            <button
                                                data-menu-button
                                                onClick={(e) => handleMenuToggle(e, folder.id)}
                                                className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                                            >
                                                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                                            </button>

                                            <AnimatePresence>
                                                {openMenuId === folder.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            onClick={(e) => handleUploadClick(e, folder)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                                                        >
                                                            <Upload className="w-4 h-4 text-emerald" />
                                                            Upload Files
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleRenameClick(e, folder)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4 text-blue-500" />
                                                            Rename
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleShareClick(e, folder)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                                                        >
                                                            <Share2 className="w-4 h-4 text-purple-500" />
                                                            Share
                                                        </button>
                                                        <div className="border-t border-border" />
                                                        <button
                                                            onClick={(e) => handleDeleteClick(e, folder)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete Topic
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-emerald transition-colors">
                                        {folder.name}
                                    </h3>

                                    {folder.description && (
                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{folder.description}</p>
                                    )}

                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <FileText className="w-4 h-4" />
                                            <span>{folder.file_count} files</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald" />
                                            <span>{folder.node_count.toLocaleString()} nodes</span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground mt-3">Updated {formatRelativeTime(folder.updated_at)}</p>


                                </div>
                            </motion.div>
                        ))}

                        {filteredFolders.length === 0 && (
                            <div className="col-span-full text-center py-12">
                                <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                    {searchQuery ? "No topics match your search" : "No topics yet. Create your first one!"}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* === MODALS === */}

            {/* Create Folder Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <Modal onClose={() => setShowCreateModal(false)}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-foreground">Create New Topic</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Topic Name *</label>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="e.g., Medical Research"
                                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Description (optional)</label>
                                <textarea
                                    value={newFolderDesc}
                                    onChange={(e) => setNewFolderDesc(e.target.value)}
                                    placeholder="Brief description..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50 resize-none"
                                />
                            </div>
                        </div>

                        {createFolderMutation.isError && (
                            <p className="mt-4 text-sm text-destructive">{(createFolderMutation.error as Error)?.message || "Failed to create folder"}</p>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                                className="flex-1 px-4 py-3 bg-emerald hover:bg-emerald-dark text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {createFolderMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating...</span></> : <span>Create Topic</span>}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Rename Modal */}
            <AnimatePresence>
                {showRenameModal && selectedFolder && (
                    <Modal onClose={() => setShowRenameModal(false)}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-foreground">Rename Topic</h3>
                            <button onClick={() => setShowRenameModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">New Name</label>
                            <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                placeholder="Enter new name..."
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50"
                                autoFocus
                            />
                        </div>

                        {updateFolderMutation.isError && (
                            <p className="mt-4 text-sm text-destructive">{(updateFolderMutation.error as Error)?.message || "Failed to rename"}</p>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowRenameModal(false)} className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRename}
                                disabled={!renameValue.trim() || updateFolderMutation.isPending}
                                className="flex-1 px-4 py-3 bg-emerald hover:bg-emerald-dark text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {updateFolderMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></> : <span>Save</span>}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Share Modal */}
            <AnimatePresence>
                {showShareModal && selectedFolder && (
                    <Modal onClose={() => setShowShareModal(false)}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-foreground">Share "{selectedFolder.name}"</h3>
                            <button onClick={() => setShowShareModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">User Email</label>
                                <input
                                    type="email"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    placeholder="colleague@example.com"
                                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Permission Level</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'read', label: 'View Only', color: 'text-blue-500' },
                                        { value: 'write', label: 'Can Edit', color: 'text-emerald' },
                                        { value: 'admin', label: 'Admin', color: 'text-purple-500' },
                                    ].map(perm => (
                                        <button
                                            key={perm.value}
                                            onClick={() => setSharePermission(perm.value)}
                                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${sharePermission === perm.value
                                                ? 'border-emerald bg-emerald/10 text-emerald'
                                                : 'border-border text-muted-foreground hover:bg-muted'
                                                }`}
                                        >
                                            {perm.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {shareFolderMutation.isError && (
                            <p className="mt-4 text-sm text-destructive">{(shareFolderMutation.error as Error)?.message || "Failed to share"}</p>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowShareModal(false)} className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmShare}
                                disabled={!shareEmail.trim() || shareFolderMutation.isPending}
                                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {shareFolderMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Sharing...</span></> : <><Share2 className="w-4 h-4" /><span>Share</span></>}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && selectedFolder && (
                    <Modal onClose={() => setShowDeleteModal(false)}>
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-destructive" />
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <h3 className="text-xl font-semibold text-foreground mb-2">Delete "{selectedFolder.name}"?</h3>
                            <p className="text-muted-foreground text-sm">This will permanently delete:</p>
                        </div>

                        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-6">
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2 text-foreground">
                                    <FileText className="w-4 h-4 text-destructive" />
                                    <span><strong>{selectedFolder.file_count}</strong> files</span>
                                </li>
                                <li className="flex items-center gap-2 text-foreground">
                                    <Network className="w-4 h-4 text-destructive" />
                                    <span><strong>{selectedFolder.node_count.toLocaleString()}</strong> nodes & relationships</span>
                                </li>
                            </ul>
                        </div>

                        <p className="text-xs text-muted-foreground text-center mb-6">⚠️ This action cannot be undone</p>

                        {deleteFolderMutation.isError && (
                            <p className="mb-4 text-sm text-destructive text-center">{(deleteFolderMutation.error as Error)?.message || "Failed to delete"}</p>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={deleteFolderMutation.isPending}
                                className="flex-1 px-4 py-3 bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleteFolderMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Deleting...</span></> : <><Trash2 className="w-4 h-4" /><span>Delete Forever</span></>}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Upload Modal with Live Pipeline */}
            <AnimatePresence>
                {showUploadModal && selectedFolder && (
                    <Modal onClose={() => setShowUploadModal(false)} wide>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">Ingest Knowledge</h3>
                                <p className="text-sm text-muted-foreground mt-1">Upload files or paste text to extract knowledge</p>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex bg-muted/50 p-1 rounded-lg mb-6">
                            <button
                                onClick={() => setUploadType('file')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${uploadType === 'file' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                File Upload
                            </button>
                            <button
                                onClick={() => setUploadType('text')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${uploadType === 'text' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Paste Text
                            </button>
                        </div>

                        {uploadType === 'file' ? (
                            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center transition-colors hover:border-emerald/50 group bg-muted/20">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    multiple
                                    accept=".pdf,.txt,.docx,.doc,.md,.csv,.xlsx"
                                    onChange={(e) => {
                                        if (e.target.files) handleFileSelect(Array.from(e.target.files));
                                    }}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <div className="w-12 h-12 bg-emerald/10 text-emerald rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <p className="text-foreground font-medium">Click to upload or drag and drop</p>
                                    <p className="text-muted-foreground text-sm mt-1">PDF, CSV, TXT, Excel, Markdown (up to 50MB)</p>
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Document Title</label>
                                    <input
                                        type="text"
                                        placeholder="Enter a name for this content..."
                                        className="w-full px-4 py-3 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50 transition-all font-medium"
                                        value={pastedFilename}
                                        onChange={(e) => setPastedFilename(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Content</label>
                                    <textarea
                                        placeholder="Paste or type your content here..."
                                        className="w-full h-48 px-4 py-3 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50 transition-all resize-none font-sans"
                                        value={pastedText}
                                        onChange={(e) => setPastedText(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleTextIngest}
                                    disabled={!pastedText.trim() || !pastedFilename.trim()}
                                    className="w-full py-3 bg-emerald hover:bg-emerald-dark text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    <Brain className="w-4 h-4" />
                                    <span>Extract Knowledge</span>
                                </button>
                            </div>
                        )}

                        {/* Pipeline Stages Legend */}
                        <div className="mt-6 mb-4">
                            <p className="text-sm font-medium text-foreground mb-3">Processing Pipeline</p>
                            <div className="flex items-center gap-1 overflow-x-auto pb-2">
                                {PIPELINE_STAGES.map((stage, i) => (
                                    <div key={stage.id} className="flex items-center">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs whitespace-nowrap">
                                            <stage.icon className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">{stage.label}</span>
                                        </div>
                                        {i < PIPELINE_STAGES.length - 1 && (
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 mx-1" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Uploading Files List */}
                        {uploadingFiles.length > 0 && (
                            <div className="space-y-3 mt-4 max-h-64 overflow-y-auto">
                                {uploadingFiles.map(file => (
                                    <div key={file.id} className="border border-border rounded-lg p-4 bg-muted/20">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-emerald" />
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{file.file.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(file.file.size / 1024).toFixed(1)} KB
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {file.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald" />}
                                                {file.status === 'ready_for_review' && <Inbox className="w-4 h-4 text-purple-500" />}
                                                {file.status === 'failed' && <XCircle className="w-4 h-4 text-destructive" />}
                                            </div>
                                        </div>

                                        {/* Progress Pipeline */}
                                        <div className="flex items-center gap-1">
                                            {PIPELINE_STAGES.map((stage, i) => {
                                                const isComplete = i < file.currentStage;
                                                const isCurrent = i === file.currentStage;
                                                const Icon = stage.icon;

                                                return (
                                                    <div key={stage.id} className="flex items-center flex-1">
                                                        <div
                                                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs transition-all ${isComplete
                                                                ? 'bg-emerald/20 text-emerald'
                                                                : isCurrent
                                                                    ? 'bg-blue-500/20 text-blue-500'
                                                                    : 'bg-muted/50 text-muted-foreground/50'
                                                                }`}
                                                        >
                                                            {isComplete ? (
                                                                <Check className="w-3 h-3" />
                                                            ) : isCurrent ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Icon className="w-3 h-3" />
                                                            )}
                                                        </div>
                                                        {i < PIPELINE_STAGES.length - 1 && (
                                                            <div className={`w-2 h-0.5 ${isComplete ? 'bg-emerald' : 'bg-muted'}`} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Inline Extraction Preview */}
                                        {file.status === 'ready_for_review' && file.extractionPreview && (
                                            <div className="mt-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-sm font-semibold text-purple-600 flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4" />
                                                        Knowledge Preview
                                                    </h4>
                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">
                                                        Awaiting Ingestion
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 mb-1">
                                                    <div className="bg-background/50 p-2 rounded border border-purple-500/10 text-center">
                                                        <p className="text-xl font-bold text-foreground">{file.extractionPreview.summary.total_entities}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase">Entities</p>
                                                    </div>
                                                    <div className="bg-background/50 p-2 rounded border border-purple-500/10 text-center">
                                                        <p className="text-xl font-bold text-foreground">{file.extractionPreview.summary.total_relationships}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase">Relationships</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Current Stage Label */}
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {file.status === 'failed'
                                                ? <span className="text-destructive">{file.error}</span>
                                                : file.status === 'completed'
                                                    ? <span className="text-emerald font-medium flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Knowledge added to library!
                                                    </span>
                                                    : file.status === 'ready_for_review'
                                                        ? <span className="text-purple-500 font-medium">Ready to be ingested into your database!</span>
                                                        : PIPELINE_STAGES[file.currentStage]?.description
                                            }
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-6">
                            <button onClick={() => { setShowUploadModal(false); refetch(); }} className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                                {uploadingFiles.some(f => f.status === 'completed' || f.status === 'ready_for_review') ? 'Close' : 'Cancel'}
                            </button>

                            {uploadingFiles.some(f => f.status === 'ready_for_review') && (
                                <button
                                    onClick={() => {
                                        setShowUploadModal(false);
                                        // Find first folder with pending files or use current selection
                                        const pendingFile = uploadingFiles.find(f => f.status === 'ready_for_review');
                                        const targetFolderId = pendingFile?.folder_id || selectedFolder?.id;
                                        router.push(`/folders/${targetFolderId}?tab=review`);
                                    }}
                                    className="flex-[2] px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-bold shadow-lg shadow-purple-600/20"
                                >
                                    <Inbox className="w-5 h-5" />
                                    <span>Verify & Ingest ({uploadingFiles.filter(f => f.status === 'ready_for_review').length})</span>
                                </button>
                            )}

                            {uploadingFiles.every(f => f.status === 'completed' || f.status === 'failed') && uploadingFiles.some(f => f.status === 'completed') && !uploadingFiles.some(f => f.status === 'ready_for_review') && (
                                <button
                                    onClick={() => { setShowUploadModal(false); router.push(`/folders/${selectedFolder?.id}`); }}
                                    className="flex-[2] px-4 py-3 bg-emerald hover:bg-emerald-dark text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-bold"
                                >
                                    <Network className="w-5 h-5" />
                                    <span>View Ingested Knowledge</span>
                                </button>
                            )}
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
}

// Reusable Modal Component
function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`bg-card border border-border rounded-xl p-6 w-full ${wide ? 'max-w-5xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

export default function LibraryPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald animate-spin" />
            </div>
        }>
            <LibraryContent />
        </Suspense>
    );
}
