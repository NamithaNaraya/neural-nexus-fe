"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Upload,
    FileText,
    Brain,
    Database,
    X,
    Check,
    Loader2,
    Sparkles,
    ChevronRight,
    CheckCircle2,
    Inbox,
    XCircle,
    Network,
    FileUp
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import api, { docAiApi, endpoints } from "@/lib/api";
import { useUploadFile } from "@/hooks/useApi";

interface FileData {
    id: string;
    filename: string;
    status: string;
    created_at: string;
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
    folder_id: string;
}

const PIPELINE_STAGES = [
    { id: 'upload', label: 'Uploading', icon: FileUp, description: 'Sending file to server' },
    { id: 'parsing', label: 'Parsing', icon: FileText, description: 'Extracting content' },
    { id: 'extraction', label: 'Extraction', icon: Brain, description: 'AI processing' },
    { id: 'review', label: 'Verify', icon: Database, description: 'Review & Ingest' },
];

interface KnowledgeIngestModalProps {
    folderId: string;
    folderName: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export function KnowledgeIngestModal({ folderId, folderName, onClose, onSuccess }: KnowledgeIngestModalProps) {
    const router = useRouter();
    const [uploadType, setUploadType] = useState<'file' | 'text' | 'cypher'>('file');
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [existingFiles, setExistingFiles] = useState<FileData[]>([]);
    const [isLoadingExisting, setIsLoadingExisting] = useState(true);

    const [pastedText, setPastedText] = useState('');
    const [pastedCypher, setPastedCypher] = useState('');
    const [pastedFilename, setPastedFilename] = useState('');
    const [committingFileId, setCommittingFileId] = useState<string | null>(null);

    const uploadFileMutation = useUploadFile();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch existing files
    useEffect(() => {
        const fetchExisting = async () => {
            try {
                const data = await docAiApi.folders.getFiles(folderId) as FileData[];
                setExistingFiles(data);
            } catch (err) {
                console.error("Failed to fetch existing files:", err);
            } finally {
                setIsLoadingExisting(false);
            }
        };
        fetchExisting();
    }, [folderId]);

    // Polling logic
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

                        if (data.status === 'completed' || (data.progress && data.progress === 100)) {
                            currentStage = 4;
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

    const handleFileSelect = async (files: File[]) => {
        const newFiles: UploadingFile[] = Array.from(files).map(file => ({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            file,
            status: 'uploading',
            progress: 0,
            currentStage: 0,
            folder_id: folderId,
        }));

        setUploadingFiles(prev => [...prev, ...newFiles]);

        for (const uploadFile of newFiles) {
            try {
                const result = await uploadFileMutation.mutateAsync({
                    folderId: folderId,
                    file: uploadFile.file
                });

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
    };

    const handleTextIngest = async () => {
        if (!pastedText.trim() || !pastedFilename.trim()) return;

        const textFileId = `text-${Date.now()}`;
        const newFile: UploadingFile = {
            id: textFileId,
            file: new File([pastedText], pastedFilename, { type: 'text/plain' }),
            status: 'uploading',
            progress: 0,
            currentStage: 0,
            folder_id: folderId,
        };

        setUploadingFiles(prev => [...prev, newFile]);
        setUploadType('file');
        setPastedText('');
        setPastedFilename('');

        try {
            const result = await api.post<any>('/upload/text', {
                filename: pastedFilename,
                content: pastedText,
                folder_id: folderId
            });

            setUploadingFiles(prev => prev.map(f =>
                f.id === textFileId
                    ? { ...f, status: 'processing', fileId: result.file_id, currentStage: 1, progress: 33 }
                    : f
            ));
        } catch (error: any) {
            setUploadingFiles(prev => prev.map(f =>
                f.id === textFileId ? { ...f, status: 'failed', error: error.detail || 'Failed to ingest text' } : f
            ));
        }
    };

    const handleCypherIngest = async () => {
        if (!pastedCypher.trim()) return;

        const tempId = Math.random().toString(36).substring(7);
        const newFile: UploadingFile = {
            id: tempId,
            file: new File([], pastedFilename || 'Direct Cypher Ingestion'),
            status: 'processing',
            progress: 10,
            currentStage: 2,
            folder_id: folderId
        };

        setUploadingFiles(prev => [...prev, newFile]);

        try {
            const data = await api.post('/upload/cypher', {
                query: pastedCypher,
                folder_id: folderId,
                filename: pastedFilename || 'Direct Cypher Ingestion'
            }) as any;

            setUploadingFiles(prev => prev.map(f =>
                f.id === tempId ? { ...f, fileId: data.file_id, status: 'completed', progress: 100, currentStage: 4 } : f
            ));
            setPastedCypher('');
            setPastedFilename('');
        } catch (err) {
            setUploadingFiles(prev => prev.map(f =>
                f.id === tempId ? { ...f, status: 'failed', error: (err as any).detail || 'Ingestion failed' } : f
            ));
        }
    };

    return (
        <Modal onClose={onClose} wide>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-semibold text-foreground">Ingest Knowledge: {folderName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Files in this folder: {existingFiles.length}</p>
                </div>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            <div className="flex bg-muted/50 p-1.5 rounded-xl mb-6">
                {['file', 'text', 'cypher'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setUploadType(type as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${uploadType === type
                            ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                    >
                        {type === 'file' && <Upload className="w-4 h-4" />}
                        {type === 'text' && <FileText className="w-4 h-4" />}
                        {type === 'cypher' && <Database className="w-4 h-4" />}
                        {type.charAt(0).toUpperCase() + type.slice(1)} {type === 'file' ? 'Upload' : type === 'text' ? 'Text' : 'Injections'}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
                {/* Left Side: Upload Section */}
                <div className="flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto pr-2">
                        {uploadType === 'file' ? (
                            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center transition-colors hover:border-emerald-500/50 group bg-muted/20 h-full flex flex-col items-center justify-center">
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
                                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <p className="text-foreground font-semibold text-lg">Click to upload or drag & drop</p>
                                    <p className="text-muted-foreground text-xs mt-2">Support for PDF, CSV, TXT, Excel, MD</p>
                                </label>
                            </div>
                        ) : uploadType === 'text' ? (
                            <div className="space-y-4 h-full flex flex-col">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Title</label>
                                    <input
                                        type="text"
                                        placeholder="Name for this content..."
                                        className="w-full px-4 py-2 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                                        value={pastedFilename}
                                        onChange={(e) => setPastedFilename(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 min-h-0">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Content</label>
                                    <textarea
                                        placeholder="Paste content here..."
                                        className="w-full h-[calc(100%-25px)] px-4 py-3 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none text-sm leading-relaxed"
                                        value={pastedText}
                                        onChange={(e) => setPastedText(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleTextIngest}
                                    disabled={!pastedText.trim() || !pastedFilename.trim()}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-bold shadow-lg shadow-blue-600/20"
                                >
                                    <Brain className="w-4 h-4" />
                                    <span>Extract Knowledge</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 h-full flex flex-col">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Name</label>
                                    <input
                                        type="text"
                                        placeholder="Cypher transaction name..."
                                        className="w-full px-4 py-2 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-sm"
                                        value={pastedFilename}
                                        onChange={(e) => setPastedFilename(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 min-h-0">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Query</label>
                                    <textarea
                                        placeholder="CREATE (n:Entity {id: randomUUID(), ...})"
                                        className="w-full h-[calc(100%-25px)] px-4 py-3 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all resize-none font-mono text-xs leading-relaxed"
                                        value={pastedCypher}
                                        onChange={(e) => setPastedCypher(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleCypherIngest}
                                    disabled={!pastedCypher.trim()}
                                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-bold shadow-lg shadow-amber-600/20"
                                >
                                    <Database className="w-4 h-4" />
                                    <span>Run Ingestion</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Status & Existing Files */}
                <div className="flex flex-col min-h-0 border-l border-border pl-8">
                    <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                        {/* Current Queue */}
                        {uploadingFiles.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ongoing Pipeline</h4>
                                {uploadingFiles.map(file => (
                                    <div key={file.id} className="border border-border rounded-lg p-3 bg-muted/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileUp className="w-4 h-4 text-emerald" />
                                                <span className="text-xs font-medium truncate">{file.file.name}</span>
                                            </div>
                                            {file.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald" /> :
                                                file.status === 'ready_for_review' ? <Inbox className="w-4 h-4 text-purple-500" /> :
                                                    file.status === 'failed' ? <XCircle className="w-4 h-4 text-destructive" /> :
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {PIPELINE_STAGES.map((stage, i) => (
                                                <div key={stage.id} className={`h-1.5 flex-1 rounded-full ${i < file.currentStage ? 'bg-emerald' : i === file.currentStage ? 'bg-primary' : 'bg-muted'}`} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Existing Files */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Existing Files</h4>
                            {isLoadingExisting ? (
                                <div className="flex items-center gap-2 py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Loading folder contents...</span>
                                </div>
                            ) : existingFiles.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-2">No files in this topic yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {existingFiles.map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-xs truncate">{file.filename}</span>
                                            </div>
                                            <span className="text-[10px] uppercase font-bold text-emerald tracking-tighter">Existing</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 mt-8">
                <button onClick={() => { onClose(); onSuccess?.(); }} className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors text-sm font-medium">
                    {uploadingFiles.length > 0 ? 'Finish' : 'Close'}
                </button>
                {uploadingFiles.some(f => f.status === 'ready_for_review') && (
                    <button
                        onClick={() => {
                            onClose();
                            router.push(`/folders/${folderId}?tab=review`);
                        }}
                        className="flex-[2] px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-bold shadow-lg shadow-purple-600/20 text-sm"
                    >
                        <Inbox className="w-5 h-5" />
                        <span>Verify & Ingest ({uploadingFiles.filter(f => f.status === 'ready_for_review').length})</span>
                    </button>
                )}
            </div>
        </Modal>
    );
}
