"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useFolders, useUploadFile, useFileStatus } from "@/hooks/useApi";
import {
    Upload,
    File,
    FileText,
    CheckCircle,
    XCircle,
    Loader2,
    ArrowLeft,
    FolderOpen,
    AlertCircle,
    ChevronDown,
} from "lucide-react";

// Types
interface FolderOption {
    id: string;
    name: string;
}

interface UploadedFile {
    id: string;
    file: File;
    status: "pending" | "uploading" | "processing" | "completed" | "failed";
    progress: number;
    fileId?: string;
    error?: string;
    nodeCount?: number;
    relationshipCount?: number;
}

export default function UploadPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated } = useAuthStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Folder selection
    const [selectedFolderId, setSelectedFolderId] = useState<string>(
        searchParams.get("folder") || ""
    );
    const [showFolderDropdown, setShowFolderDropdown] = useState(false);

    // File management
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    // API hooks
    const { data: folders } = useFolders();
    const uploadMutation = useUploadFile();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, router]);

    // Get selected folder name
    const selectedFolder = (folders as FolderOption[] || []).find(
        (f) => f.id === selectedFolderId
    );

    // Handle file selection
    const handleFileSelect = useCallback(
        async (files: FileList | null) => {
            if (!files || !selectedFolderId) return;

            const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
                id: crypto.randomUUID(),
                file,
                status: "pending" as const,
                progress: 0,
            }));

            setUploadedFiles((prev) => [...prev, ...newFiles]);

            // Upload each file
            for (const uploadFile of newFiles) {
                try {
                    // Update status to uploading
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadFile.id ? { ...f, status: "uploading", progress: 30 } : f
                        )
                    );

                    // Upload the file
                    const result = await uploadMutation.mutateAsync({
                        folderId: selectedFolderId,
                        file: uploadFile.file,
                    });

                    // Update to processing
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadFile.id
                                ? { ...f, status: "processing", progress: 60, fileId: result.file_id }
                                : f
                        )
                    );

                    // Poll for completion
                    pollFileStatus(uploadFile.id, result.file_id);
                } catch (error) {
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadFile.id
                                ? { ...f, status: "failed", error: (error as Error).message }
                                : f
                        )
                    );
                }
            }
        },
        [selectedFolderId, uploadMutation]
    );

    // Poll for file processing status
    const pollFileStatus = async (uploadId: string, fileId: string) => {
        const maxAttempts = 60; // 2 minutes max
        let attempts = 0;

        const poll = async () => {
            attempts++;
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/files/${fileId}/status`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                        },
                    }
                );

                if (!response.ok) throw new Error("Failed to get status");

                const data = await response.json();

                if (data.status === "completed") {
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadId
                                ? {
                                    ...f,
                                    status: "completed",
                                    progress: 100,
                                    nodeCount: data.node_count,
                                    relationshipCount: data.relationship_count,
                                }
                                : f
                        )
                    );
                } else if (data.status === "failed") {
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadId
                                ? { ...f, status: "failed", error: data.error_message || "Processing failed" }
                                : f
                        )
                    );
                } else if (data.status === "ready_for_review") {
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadId
                                ? {
                                    ...f,
                                    status: "completed",
                                    progress: 100,
                                    nodeCount: data.node_count,
                                    relationshipCount: data.relationship_count,
                                }
                                : f
                        )
                    );
                } else if (attempts < maxAttempts) {
                    // Still processing, poll again
                    setTimeout(poll, 2000);
                }
            } catch (error) {
                if (attempts < maxAttempts) {
                    setTimeout(poll, 2000);
                }
            }
        };

        poll();
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const allowedExtensions = [".pdf", ".csv", ".tsv", ".txt", ".md", ".docx", ".xlsx"];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">
                            Upload Files
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Extract knowledge from your documents
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Folder Selection */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Select Destination Topic
                    </label>
                    <div className="relative">
                        <button
                            onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 border border-border rounded-lg text-left"
                        >
                            <div className="flex items-center gap-3">
                                <FolderOpen className="w-5 h-5 text-emerald" />
                                <span className={selectedFolder ? "text-foreground" : "text-muted-foreground"}>
                                    {selectedFolder?.name || "Choose a topic folder..."}
                                </span>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showFolderDropdown ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                            {showFolderDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-10 max-h-60 overflow-auto"
                                >
                                    {(folders as FolderOption[] || []).length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground">
                                            No folders yet.{" "}
                                            <button
                                                onClick={() => router.push("/library")}
                                                className="text-emerald hover:underline"
                                            >
                                                Create one first
                                            </button>
                                        </div>
                                    ) : (
                                        (folders as FolderOption[] || []).map((folder) => (
                                            <button
                                                key={folder.id}
                                                onClick={() => {
                                                    setSelectedFolderId(folder.id);
                                                    setShowFolderDropdown(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors ${selectedFolderId === folder.id ? "bg-emerald/10" : ""
                                                    }`}
                                            >
                                                <FolderOpen className="w-5 h-5 text-emerald" />
                                                <span className="text-foreground">{folder.name}</span>
                                            </button>
                                        ))
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => selectedFolderId && fileInputRef.current?.click()}
                    className={`
                        relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                        transition-all duration-300
                        ${!selectedFolderId ? "opacity-50 cursor-not-allowed" : ""}
                        ${isDragging
                            ? "border-emerald bg-emerald/5"
                            : "border-border hover:border-emerald/50 hover:bg-muted/50"
                        }
                    `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={allowedExtensions.join(",")}
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                        disabled={!selectedFolderId}
                    />

                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-emerald" : "text-muted-foreground"}`} />

                    <p className="text-lg font-medium text-foreground mb-2">
                        {isDragging ? "Drop files here" : "Drag & drop files here"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                        or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Supported: {allowedExtensions.join(", ")}
                    </p>

                    {!selectedFolderId && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <AlertCircle className="w-5 h-5" />
                                <span>Please select a topic folder first</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Upload Progress */}
                {uploadedFiles.length > 0 && (
                    <div className="mt-8 space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">
                            Uploads ({uploadedFiles.length})
                        </h3>

                        <div className="space-y-3">
                            {uploadedFiles.map((upload) => (
                                <motion.div
                                    key={upload.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-card border border-border rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* File Icon */}
                                        <div className={`p-2 rounded-lg ${upload.status === "completed"
                                            ? "bg-emerald/10"
                                            : upload.status === "failed"
                                                ? "bg-destructive/10"
                                                : "bg-muted"
                                            }`}>
                                            {upload.status === "completed" ? (
                                                <CheckCircle className="w-5 h-5 text-emerald" />
                                            ) : upload.status === "failed" ? (
                                                <XCircle className="w-5 h-5 text-destructive" />
                                            ) : upload.status === "uploading" || upload.status === "processing" ? (
                                                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                                            ) : (
                                                <FileText className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>

                                        {/* File Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {upload.file.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {upload.status === "completed" && upload.nodeCount !== undefined
                                                    ? `✓ ${upload.nodeCount} entities, ${upload.relationshipCount} relationships`
                                                    : upload.status === "failed"
                                                        ? `Error: ${upload.error}`
                                                        : upload.status === "processing"
                                                            ? "Processing with AI..."
                                                            : upload.status === "uploading"
                                                                ? "Uploading..."
                                                                : "Pending"
                                                }
                                            </p>
                                        </div>

                                        {/* Status Badge */}
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${upload.status === "completed"
                                            ? "bg-emerald/20 text-emerald"
                                            : upload.status === "failed"
                                                ? "bg-destructive/20 text-destructive"
                                                : "bg-muted text-muted-foreground"
                                            }`}>
                                            {upload.status}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {(upload.status === "uploading" || upload.status === "processing") && (
                                        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${upload.progress}%` }}
                                                className="h-full bg-emerald"
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* View in Graph Button */}
                {uploadedFiles.some((f) => f.status === "completed") && selectedFolderId && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 text-center"
                    >
                        <button
                            onClick={() => router.push(`/dashboard?folder=${selectedFolderId}`)}
                            className="px-6 py-3 bg-emerald hover:bg-emerald-dark text-white font-medium rounded-lg transition-colors"
                        >
                            View in Knowledge Graph →
                        </button>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
