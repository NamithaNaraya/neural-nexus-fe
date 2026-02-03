"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import {
    Plus,
    Folder,
    Search,
    Sun,
    Moon,
    LogOut,
    MoreHorizontal,
    FileText,
} from "lucide-react";

// Mock data for folders/topics
const mockFolders = [
    {
        id: "1",
        name: "Medical Research",
        fileCount: 12,
        nodeCount: 1547,
        lastUpdated: "2 hours ago",
    },
    {
        id: "2",
        name: "Legal Documents",
        fileCount: 8,
        nodeCount: 892,
        lastUpdated: "Yesterday",
    },
    {
        id: "3",
        name: "Financial Reports",
        fileCount: 15,
        nodeCount: 2341,
        lastUpdated: "3 days ago",
    },
];

export default function LibraryPage() {
    const router = useRouter();
    const { user, logout, isAuthenticated } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, router]);

    const handleFolderClick = (folderId: string) => {
        router.push(`/dashboard/${folderId}`);
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle("dark");
    };

    const filteredFolders = mockFolders.filter((folder) =>
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
                        className="flex items-center gap-2 px-6 py-3 bg-emerald hover:bg-emerald-dark text-white font-medium rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Topic</span>
                    </motion.button>
                </div>

                {/* Folder Grid */}
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

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <FileText className="w-4 h-4" />
                                        <span>{folder.fileCount} files</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald" />
                                        <span>{folder.nodeCount.toLocaleString()} nodes</span>
                                    </div>
                                </div>

                                {/* Last Updated */}
                                <p className="text-xs text-muted-foreground mt-3">
                                    Updated {folder.lastUpdated}
                                </p>
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
            </main>
        </div>
    );
}
