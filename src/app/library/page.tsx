"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useFolders, useCreateFolder } from "@/hooks/useApi";
import {
    Plus,
    Folder,
    Search,
    Sun,
    Moon,
    LogOut,
    MoreHorizontal,
    FileText,
    Loader2,
    X,
    AlertCircle,
    Upload,
} from "lucide-react";

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

// Format relative time
function formatRelativeTime(dateString: string): string {
    if (!dateString) return "Never";

    const date = new Date(dateString);
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
    const { user, logout, isAuthenticated, isHydrated } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderDesc, setNewFolderDesc] = useState("");

    // API hooks
    const { data: folders, isLoading, error, refetch } = useFolders();
    const createFolderMutation = useCreateFolder();

    // Auto-open create modal if action=create param is present
    useEffect(() => {
        if (searchParams.get('action') === 'create') {
            setShowCreateModal(true);
            // Clear the URL param without reloading
            window.history.replaceState({}, '', '/library');
        }
    }, [searchParams]);

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, isHydrated, router]);

    if (!isHydrated || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald animate-spin" />
            </div>
        );
    }

    const handleFolderClick = (folderId: string) => {
        console.log("Navigating to graph for folder:", folderId);
        router.push(`/graph?folder=${folderId}`);
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle("dark");
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

    // Filter folders by search
    const filteredFolders = (folders as FolderData[] || []).filter((folder) =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    {/* Logo */}
                    <h1 className="text-xl font-bold text-foreground">
                        <span className="text-emerald">Neural</span> Nexus
                    </h1>

                    {/* User Menu */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            {isDarkMode ? (
                                <Sun className="w-5 h-5 text-muted-foreground" />
                            ) : (
                                <Moon className="w-5 h-5 text-muted-foreground" />
                            )}
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald/20 flex items-center justify-center">
                                <span className="text-emerald text-sm font-medium">
                                    {user?.email?.[0]?.toUpperCase() || "U"}
                                </span>
                            </div>
                            <span className="text-sm text-muted-foreground hidden sm:block">
                                {user?.email || "user@example.com"}
                            </span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                        Your Library
                    </h2>
                    <p className="text-muted-foreground">
                        Select a topic to explore its knowledge graph
                    </p>
                </div>

                {/* Search and Create */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    {/* Search */}
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

                    {/* Create New Topic */}
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
                            <p className="text-muted-foreground text-sm mb-4">
                                {(error as Error).message || "Please check your connection"}
                            </p>
                            <button
                                onClick={() => refetch()}
                                className="px-4 py-2 bg-emerald text-white rounded-lg hover:bg-emerald-dark transition-colors"
                            >
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
                                    {/* Folder Icon and Menu */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-lg bg-emerald/10 group-hover:bg-emerald/20 transition-colors">
                                            <Folder className="w-6 h-6 text-emerald" />
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // TODO: Open context menu
                                            }}
                                            className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                                        >
                                            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                    </div>

                                    {/* Folder Name */}
                                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-emerald transition-colors">
                                        {folder.name}
                                    </h3>

                                    {/* Description */}
                                    {folder.description && (
                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                            {folder.description}
                                        </p>
                                    )}

                                    {/* Stats */}
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

                                    {/* Last Updated */}
                                    <p className="text-xs text-muted-foreground mt-3">
                                        Updated {formatRelativeTime(folder.updated_at)}
                                    </p>

                                    {/* Upload Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/upload?folder=${folder.id}`);
                                        }}
                                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald/10 hover:bg-emerald/20 text-emerald rounded-lg transition-colors text-sm font-medium"
                                    >
                                        <Upload className="w-4 h-4" />
                                        <span>Upload Files</span>
                                    </button>
                                </div>
                            </motion.div>
                        ))}

                        {/* Empty State */}
                        {filteredFolders.length === 0 && (
                            <div className="col-span-full text-center py-12">
                                <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                    {searchQuery
                                        ? "No topics match your search"
                                        : "No topics yet. Create your first one!"}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Create Folder Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card border border-border rounded-xl p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-foreground">
                                    Create New Topic
                                </h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Topic Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="e.g., Medical Research"
                                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:border-emerald/50 transition-all"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={newFolderDesc}
                                        onChange={(e) => setNewFolderDesc(e.target.value)}
                                        placeholder="Brief description of this topic..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:border-emerald/50 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            {/* Error */}
                            {createFolderMutation.isError && (
                                <p className="mt-4 text-sm text-destructive">
                                    {(createFolderMutation.error as Error)?.message || "Failed to create folder"}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateFolder}
                                    disabled={!newFolderName.trim() || createFolderMutation.isPending}
                                    className="flex-1 px-4 py-3 bg-emerald hover:bg-emerald-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {createFolderMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <span>Create Topic</span>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
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
