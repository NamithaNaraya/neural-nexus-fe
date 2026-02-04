/**
 * Librarian Sidebar Component
 * 
 * The main navigation sidebar for the Neural Nexus dashboard.
 * Features:
 * - Folder/Topic navigation
 * - File list with toggle
 * - Quick search
 * - View mode switching
 * - Inline chat
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUIStore } from '@/store/uiStore';
import { useGraphStore } from '@/store/graphStore';
import { docAiApi } from '@/lib/api';

// Icons (using simple SVG)
const Icons = {
    Home: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    ),
    Folder: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
    ),
    File: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    Search: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    ),
    Graph3D: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
    ),
    Graph2D: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
    ),
    Charts: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    ),
    Chat: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
    ),
    Settings: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    ChevronLeft: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    ),
    ChevronRight: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    ),
    Moon: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    ),
    Sun: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    Eye: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    ),
    EyeOff: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
    ),
};

interface LibrarianSidebarProps {
    onFileToggle?: (fileId: string, visible: boolean) => void;
    onFolderSelect?: (folderId: string) => void;
}

export default function LibrarianSidebar({
    onFileToggle,
    onFolderSelect
}: LibrarianSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();

    // UI Store
    const {
        sidebarOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
        theme,
        toggleTheme,
        viewMode,
        setViewMode,
    } = useUIStore();

    // Graph Store
    const {
        activeFolderId,
        setActiveFolder,
        nodeCount,
        linkCount,
    } = useGraphStore();

    // Local state
    const [searchQuery, setSearchQuery] = useState('');
    const [folders, setFolders] = useState<any[]>([]);
    const [folderFiles, setFolderFiles] = useState<Record<string, any[]>>({});
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [fileVisibility, setFileVisibility] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Initial load of folders
    useEffect(() => {
        const fetchFolders = async () => {
            try {
                const data = await docAiApi.folders.list();
                setFolders(data);

                // If there's an active folder, expand it
                if (activeFolderId) {
                    setExpandedFolders(new Set([activeFolderId]));
                    fetchFiles(activeFolderId);
                }
            } catch (error) {
                console.error('Failed to fetch folders:', error);
            }
        };
        fetchFolders();
    }, [activeFolderId]);

    // Fetch files for a folder
    const fetchFiles = async (folderId: string) => {
        if (folderFiles[folderId]) return; // Already loaded

        try {
            const data = await docAiApi.files.list(folderId);
            setFolderFiles(prev => ({ ...prev, [folderId]: data }));

            // Set initial visibility
            const visibility: Record<string, boolean> = {};
            data.forEach((f: any) => {
                visibility[f.id] = true;
            });
            setFileVisibility(prev => ({ ...prev, ...visibility }));
        } catch (error) {
            console.error(`Failed to fetch files for folder ${folderId}:`, error);
        }
    };

    // Handle folder expansion
    const toggleFolder = async (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
            await fetchFiles(folderId);
        }
        setExpandedFolders(newExpanded);
        setActiveFolder(folderId);
        onFolderSelect?.(folderId);
    };

    // Handle file visibility toggle
    const handleFileToggle = (fileId: string) => {
        const newVisibility = !fileVisibility[fileId];
        setFileVisibility(prev => ({ ...prev, [fileId]: newVisibility }));
        onFileToggle?.(fileId, newVisibility);
    };

    // View mode buttons
    const viewModes = [
        { mode: '3d' as const, icon: Icons.Graph3D, label: '3D Graph' },
        { mode: '2d' as const, icon: Icons.Graph2D, label: '2D Graph' },
        { mode: 'charts' as const, icon: Icons.Charts, label: 'Charts' },
    ];

    if (!sidebarOpen) return null;

    return (
        <aside
            className={`
        glass-strong fixed left-0 top-0 h-full z-40
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
      `}
        >
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-electric flex items-center justify-center">
                                <span className="text-white font-bold text-sm">NN</span>
                            </div>
                            <span className="font-semibold text-sm">Neural Nexus</span>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
                    </button>
                </div>

                {/* Search */}
                {!sidebarCollapsed && (
                    <div className="p-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search nodes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-neural pl-10 text-sm"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <Icons.Search />
                            </span>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-2">
                    {/* Home Link */}
                    <button
                        onClick={() => router.push('/library')}
                        className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-2
              transition-colors hover:bg-white/10
              ${pathname === '/library' ? 'bg-white/10 text-emerald-400' : ''}
            `}
                    >
                        <Icons.Home />
                        {!sidebarCollapsed && <span className="text-sm">Library</span>}
                    </button>

                    {/* Folders Section */}
                    {!sidebarCollapsed && (
                        <div className="mb-4">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
                                Topics
                            </h3>

                            {folders.map((folder) => (
                                <div key={folder.id}>
                                    <button
                                        onClick={() => toggleFolder(folder.id)}
                                        className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg
                      transition-colors hover:bg-white/10
                      ${activeFolderId === folder.id ? 'bg-white/10' : ''}
                    `}
                                    >
                                        <Icons.Folder />
                                        <span className="text-sm flex-1 text-left">{folder.name}</span>
                                        <span className="text-xs text-muted-foreground">{folder.file_count || 0}</span>
                                    </button>

                                    {/* Files under folder */}
                                    {expandedFolders.has(folder.id) && folderFiles[folder.id] && (
                                        <div className="ml-6 mt-1 space-y-1">
                                            {folderFiles[folder.id].map((file) => (
                                                <div
                                                    key={file.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 group"
                                                >
                                                    <Icons.File />
                                                    <span className="text-xs flex-1 truncate">{file.filename}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleFileToggle(file.id);
                                                        }}
                                                        className={`transition-opacity p-1 rounded hover:bg-white/10 ${fileVisibility[file.id] ? 'opacity-100' : 'opacity-40'}`}
                                                        aria-label={fileVisibility[file.id] ? 'Hide file' : 'Show file'}
                                                    >
                                                        {fileVisibility[file.id] ? <Icons.Eye /> : <Icons.EyeOff />}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* View Mode Selector */}
                    {!sidebarCollapsed && (
                        <div className="mb-4">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
                                View Mode
                            </h3>
                            <div className="flex gap-1 px-2">
                                {viewModes.map(({ mode, icon: Icon, label }) => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`
                       flex-1 flex flex-col items-center gap-1 p-2 rounded-lg
                       transition-colors text-xs
                       ${viewMode === mode
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'hover:bg-white/10'
                                            }
                     `}
                                        title={label}
                                    >
                                        <Icon />
                                        <span>{mode.toUpperCase()}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </nav>

                {/* Graph Stats */}
                {!sidebarCollapsed && (
                    <div className="p-3 border-t border-white/10">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{nodeCount} nodes</span>
                            <span>{linkCount} links</span>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-3 border-t border-white/10 flex items-center justify-between">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
                    </button>

                    {!sidebarCollapsed && (
                        <button
                            onClick={() => router.push('/settings')}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            aria-label="Settings"
                        >
                            <Icons.Settings />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
