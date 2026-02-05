'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { docAiApi } from '@/lib/api';
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
    Users,
    Link2,
    CheckCircle2,
    AlertTriangle
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

    const [folder, setFolder] = useState<FolderData | null>(null);
    const [files, setFiles] = useState<FileData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'files' | 'review'>('files');
    const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

    // Fetch Folder Data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [folderData, filesData] = await Promise.all([
                    docAiApi.folders.get(folderId),
                    docAiApi.folders.getFiles(folderId) as Promise<FileData[]>
                ]);
                setFolder(folderData);
                setFiles(filesData);
            } catch (error) {
                console.error('Failed to load folder data:', error);
                // Handle 404 or other errors
                router.push('/library');
            } finally {
                setIsLoading(false);
            }
        };

        if (folderId) {
            loadData();
        }
    }, [folderId, router]);

    const handleOpenGraph = () => {
        router.push(`/graph?folder=${folderId}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!folder) return null;

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
                                {folder.name}
                            </h1>
                            <p className="mt-2 text-muted-foreground max-w-2xl">
                                {folder.description || 'No description provided.'}
                            </p>
                            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    {folder.file_count} files
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {folder.node_count} nodes extracted
                                </span>
                                <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Last updated {new Date(folder.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                                <Settings className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleOpenGraph}
                                className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Open Graph View
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

                {/* Content */}
                <div className="min-h-[500px]">
                    {activeTab === 'files' ? (
                        <div className="space-y-4">
                            {/* File List Header */}
                            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/30 rounded-lg text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <div className="col-span-4">Filename</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2">Entities</div>
                                <div className="col-span-2">Relationships</div>
                                <div className="col-span-2 text-right">Date</div>
                            </div>

                            {/* Files */}
                            <div className="space-y-2">
                                {files.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No files uploaded yet.</p>
                                    </div>
                                ) : (
                                    files.map((file) => (
                                        <div
                                            key={file.id}
                                            className="bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-primary/20"
                                        >
                                            <div
                                                className="grid grid-cols-12 gap-4 px-4 py-4 items-center cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => setExpandedFileId(expandedFileId === file.id ? null : file.id)}
                                            >
                                                <div className="col-span-4 flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${expandedFileId === file.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                                        }`}>
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium truncate">{file.filename}</span>
                                                    {expandedFileId === file.id ? (
                                                        <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 opacity-0 group-hover:opacity-100" />
                                                    )}
                                                </div>
                                                <div className="col-span-2">
                                                    <StatusBadge status={file.status} />
                                                </div>
                                                <div className="col-span-2 text-sm text-muted-foreground tabular-nums">
                                                    {file.node_count}
                                                </div>
                                                <div className="col-span-2 text-sm text-muted-foreground tabular-nums">
                                                    {file.relationship_count}
                                                </div>
                                                <div className="col-span-2 text-right text-sm text-muted-foreground">
                                                    {new Date(file.created_at).toLocaleDateString()}
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
                                                                    Extracted Data Preview
                                                                </h3>
                                                                <span className="text-xs text-muted-foreground">
                                                                    ID: {file.id}
                                                                </span>
                                                            </div>

                                                            <FileExtractionDetails
                                                                fileId={file.id}
                                                                isEditable={false} // Completed files are read-only
                                                                className="bg-background rounded-lg border border-border p-4"
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
                            />
                        </div>
                    )}
                </div>
            </div>
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
    const label = status.replace(/_/g, ' ');

    return (
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border uppercase tracking-wider ${style}`}>
            {label}
        </span>
    );
}
