/**
 * Command Palette Component
 * 
 * Power-user quick access feature triggered by Ctrl+K / Cmd+K.
 * Features:
 * - Fuzzy search for commands
 * - Keyboard navigation
 * - Categorized actions
 * - Recent commands
 * - Beautiful animations
 */
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Command,
    ArrowRight,
    FolderOpen,
    FileText,
    Settings,
    User,
    LogOut,
    Moon,
    Sun,
    Download,
    Upload,
    Zap,
    Network,
    BarChart3,
    Eye,
    EyeOff,
    Maximize2,
    Minimize2,
    Filter,
    RefreshCw,
    Trash2,
    Share2,
    Copy,
    Bookmark,
    Clock,
    Star,
    ChevronRight,
    X,
    CornerDownLeft,
} from 'lucide-react';

// Command type definition
export interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    shortcut?: string;
    category: CommandCategory;
    action: () => void;
    keywords?: string[];
    disabled?: boolean;
}

export type CommandCategory =
    | 'navigation'
    | 'actions'
    | 'graph'
    | 'analysis'
    | 'export'
    | 'settings'
    | 'recent';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    commands?: CommandItem[];
    onNavigate?: (path: string) => void;
    onAction?: (actionId: string) => void;
}

// Category metadata
const CATEGORY_META: Record<CommandCategory, { label: string; icon: React.ReactNode }> = {
    recent: { label: 'Recent', icon: <Clock className="w-4 h-4" /> },
    navigation: { label: 'Navigation', icon: <ArrowRight className="w-4 h-4" /> },
    actions: { label: 'Actions', icon: <Zap className="w-4 h-4" /> },
    graph: { label: 'Graph', icon: <Network className="w-4 h-4" /> },
    analysis: { label: 'Analysis', icon: <BarChart3 className="w-4 h-4" /> },
    export: { label: 'Export', icon: <Download className="w-4 h-4" /> },
    settings: { label: 'Settings', icon: <Settings className="w-4 h-4" /> },
};

// Default commands
const DEFAULT_COMMANDS: CommandItem[] = [
    // Navigation
    {
        id: 'nav-library',
        label: 'Go to Library',
        description: 'View all your folders and documents',
        icon: <FolderOpen className="w-4 h-4" />,
        shortcut: 'G L',
        category: 'navigation',
        action: () => { },
        keywords: ['home', 'folders', 'documents'],
    },
    {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'Main knowledge graph dashboard',
        icon: <Network className="w-4 h-4" />,
        shortcut: 'G D',
        category: 'navigation',
        action: () => { },
        keywords: ['graph', 'main', 'overview'],
    },
    {
        id: 'nav-settings',
        label: 'Go to Settings',
        description: 'Account and application settings',
        icon: <Settings className="w-4 h-4" />,
        shortcut: 'G S',
        category: 'navigation',
        action: () => { },
        keywords: ['preferences', 'config', 'account'],
    },
    {
        id: 'nav-profile',
        label: 'View Profile',
        description: 'Your user profile and stats',
        icon: <User className="w-4 h-4" />,
        shortcut: 'G P',
        category: 'navigation',
        action: () => { },
        keywords: ['account', 'user', 'me'],
    },

    // Graph Actions
    {
        id: 'graph-toggle-3d',
        label: 'Toggle 3D/2D View',
        description: 'Switch between 3D and 2D visualization',
        icon: <Eye className="w-4 h-4" />,
        shortcut: 'V',
        category: 'graph',
        action: () => { },
        keywords: ['view', 'mode', 'dimension'],
    },
    {
        id: 'graph-fullscreen',
        label: 'Toggle Fullscreen',
        description: 'Enter or exit immersive mode',
        icon: <Maximize2 className="w-4 h-4" />,
        shortcut: 'F',
        category: 'graph',
        action: () => { },
        keywords: ['immersive', 'expand', 'maximize'],
    },
    {
        id: 'graph-filters',
        label: 'Open Filters',
        description: 'Filter nodes by type or properties',
        icon: <Filter className="w-4 h-4" />,
        shortcut: 'Shift F',
        category: 'graph',
        action: () => { },
        keywords: ['type', 'search', 'narrow'],
    },
    {
        id: 'graph-refresh',
        label: 'Refresh Graph',
        description: 'Reload graph data from server',
        icon: <RefreshCw className="w-4 h-4" />,
        shortcut: 'R',
        category: 'graph',
        action: () => { },
        keywords: ['reload', 'update', 'sync'],
    },
    {
        id: 'graph-clear-selection',
        label: 'Clear Selection',
        description: 'Deselect all nodes',
        icon: <X className="w-4 h-4" />,
        shortcut: 'Esc',
        category: 'graph',
        action: () => { },
        keywords: ['deselect', 'reset'],
    },

    // Analysis Actions
    {
        id: 'analysis-blind-spots',
        label: 'Discover Blind Spots',
        description: 'Find potential missing relationships',
        icon: <Zap className="w-4 h-4" />,
        category: 'analysis',
        action: () => { },
        keywords: ['missing', 'gaps', 'predict', 'ghost'],
    },
    {
        id: 'analysis-compare',
        label: 'Compare Clusters',
        description: 'Analyze similarities between node groups',
        icon: <Share2 className="w-4 h-4" />,
        category: 'analysis',
        action: () => { },
        keywords: ['diff', 'similarity', 'groups'],
    },
    {
        id: 'analysis-health',
        label: 'Graph Health Check',
        description: 'Assess the quality of your knowledge graph',
        icon: <BarChart3 className="w-4 h-4" />,
        category: 'analysis',
        action: () => { },
        keywords: ['quality', 'score', 'metrics'],
    },

    // Export Actions
    {
        id: 'export-pdf',
        label: 'Export as PDF',
        description: 'Generate analytics PDF report',
        icon: <Download className="w-4 h-4" />,
        category: 'export',
        action: () => { },
        keywords: ['download', 'report', 'document'],
    },
    {
        id: 'export-json',
        label: 'Export as JSON',
        description: 'Download graph data as JSON',
        icon: <Download className="w-4 h-4" />,
        category: 'export',
        action: () => { },
        keywords: ['download', 'data', 'api'],
    },
    {
        id: 'export-csv',
        label: 'Export as CSV',
        description: 'Download data for spreadsheet',
        icon: <Download className="w-4 h-4" />,
        category: 'export',
        action: () => { },
        keywords: ['download', 'excel', 'spreadsheet'],
    },

    // File Actions
    {
        id: 'action-upload',
        label: 'Upload Document',
        description: 'Add a new document to the graph',
        icon: <Upload className="w-4 h-4" />,
        shortcut: 'U',
        category: 'actions',
        action: () => { },
        keywords: ['add', 'file', 'import', 'new'],
    },
    {
        id: 'action-new-folder',
        label: 'Create New Folder',
        description: 'Create a new topic folder',
        icon: <FolderOpen className="w-4 h-4" />,
        shortcut: 'N',
        category: 'actions',
        action: () => { },
        keywords: ['add', 'topic', 'new'],
    },

    // Settings
    {
        id: 'settings-theme',
        label: 'Toggle Theme',
        description: 'Switch between dark and light mode',
        icon: <Moon className="w-4 h-4" />,
        shortcut: 'T',
        category: 'settings',
        action: () => { },
        keywords: ['dark', 'light', 'mode', 'appearance'],
    },
    {
        id: 'settings-logout',
        label: 'Sign Out',
        description: 'Log out of your account',
        icon: <LogOut className="w-4 h-4" />,
        category: 'settings',
        action: () => { },
        keywords: ['logout', 'exit', 'leave'],
    },
];

// Fuzzy search function
function fuzzySearch(query: string, items: CommandItem[]): CommandItem[] {
    if (!query.trim()) return items;

    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);

    return items
        .map(item => {
            const searchText = [
                item.label,
                item.description || '',
                ...(item.keywords || []),
            ].join(' ').toLowerCase();

            // Calculate match score
            let score = 0;

            // Exact match in label
            if (item.label.toLowerCase().includes(lowerQuery)) {
                score += 100;
            }

            // Word matches
            for (const word of words) {
                if (searchText.includes(word)) {
                    score += 10;
                }
                // Starts with match (higher priority)
                if (item.label.toLowerCase().startsWith(word)) {
                    score += 50;
                }
            }

            return { item, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
}

export function CommandPalette({
    isOpen,
    onClose,
    commands = DEFAULT_COMMANDS,
    onNavigate,
    onAction,
}: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentCommands, setRecentCommands] = useState<string[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Load recent commands from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('recentCommands');
            if (stored) {
                try {
                    setRecentCommands(JSON.parse(stored));
                } catch { }
            }
        }
    }, []);

    // Filter and group commands
    const filteredCommands = useMemo(() => {
        const searched = fuzzySearch(query, commands);

        // If no query, show recent first
        if (!query.trim() && recentCommands.length > 0) {
            const recentItems = recentCommands
                .map(id => commands.find(c => c.id === id))
                .filter((c): c is CommandItem => c !== undefined)
                .slice(0, 3)
                .map(c => ({ ...c, category: 'recent' as CommandCategory }));

            return [...recentItems, ...searched.filter(c => !recentCommands.includes(c.id))];
        }

        return searched;
    }, [query, commands, recentCommands]);

    // Group by category
    const groupedCommands = useMemo(() => {
        const groups: Record<CommandCategory, CommandItem[]> = {
            recent: [],
            navigation: [],
            actions: [],
            graph: [],
            analysis: [],
            export: [],
            settings: [],
        };

        filteredCommands.forEach(cmd => {
            groups[cmd.category].push(cmd);
        });

        return groups;
    }, [filteredCommands]);

    // Flat list for keyboard navigation
    const flatList = useMemo(() => {
        return Object.entries(groupedCommands)
            .filter(([_, items]) => items.length > 0)
            .flatMap(([_, items]) => items);
    }, [groupedCommands]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selectedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedIndex]);

    // Execute command
    const executeCommand = useCallback((command: CommandItem) => {
        // Save to recent
        const newRecent = [command.id, ...recentCommands.filter(id => id !== command.id)].slice(0, 5);
        setRecentCommands(newRecent);
        if (typeof window !== 'undefined') {
            localStorage.setItem('recentCommands', JSON.stringify(newRecent));
        }

        // Execute action
        command.action();
        if (onAction) {
            onAction(command.id);
        }

        onClose();
    }, [recentCommands, onAction, onClose]);

    // Keyboard handling
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, flatList.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (flatList[selectedIndex]) {
                    executeCommand(flatList[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [flatList, selectedIndex, executeCommand, onClose]);

    // Close on backdrop click
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    if (!isOpen) return null;

    let globalIndex = 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
                    onClick={handleBackdropClick}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a command or search..."
                                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                            />
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                                    ⌘K
                                </kbd>
                            </div>
                        </div>

                        {/* Commands List */}
                        <div
                            ref={listRef}
                            className="max-h-[400px] overflow-y-auto py-2"
                        >
                            {flatList.length === 0 ? (
                                <div className="px-4 py-8 text-center text-muted-foreground">
                                    <p className="text-sm">No commands found for "{query}"</p>
                                </div>
                            ) : (
                                Object.entries(groupedCommands)
                                    .filter(([_, items]) => items.length > 0)
                                    .map(([category, items]) => (
                                        <div key={category} className="mb-2">
                                            {/* Category Header */}
                                            <div className="px-4 py-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                {CATEGORY_META[category as CommandCategory]?.icon}
                                                <span>{CATEGORY_META[category as CommandCategory]?.label}</span>
                                            </div>

                                            {/* Category Items */}
                                            {items.map((cmd) => {
                                                const itemIndex = globalIndex++;
                                                const isSelected = itemIndex === selectedIndex;

                                                return (
                                                    <button
                                                        key={cmd.id}
                                                        data-index={itemIndex}
                                                        onClick={() => executeCommand(cmd)}
                                                        disabled={cmd.disabled}
                                                        className={`
                                                            w-full px-4 py-2.5 flex items-center gap-3 text-left
                                                            transition-colors duration-75
                                                            ${isSelected
                                                                ? 'bg-emerald/10 text-emerald'
                                                                : 'hover:bg-muted/50 text-foreground'
                                                            }
                                                            ${cmd.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                                        `}
                                                    >
                                                        {/* Icon */}
                                                        <span className={`
                                                            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                                                            ${isSelected ? 'bg-emerald/20' : 'bg-muted'}
                                                        `}>
                                                            {cmd.icon}
                                                        </span>

                                                        {/* Label & Description */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {cmd.label}
                                                            </p>
                                                            {cmd.description && (
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {cmd.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Shortcut */}
                                                        {cmd.shortcut && (
                                                            <div className="flex items-center gap-1">
                                                                {cmd.shortcut.split(' ').map((key, i) => (
                                                                    <kbd
                                                                        key={i}
                                                                        className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono text-muted-foreground"
                                                                    >
                                                                        {key}
                                                                    </kbd>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Arrow for selected */}
                                                        {isSelected && (
                                                            <ChevronRight className="w-4 h-4 text-emerald flex-shrink-0" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <kbd className="p-0.5 bg-muted rounded text-[10px]">↑</kbd>
                                    <kbd className="p-0.5 bg-muted rounded text-[10px]">↓</kbd>
                                    <span className="ml-1">Navigate</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
                                    <span className="ml-1">Select</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
                                    <span className="ml-1">Close</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Command className="w-3 h-3" />
                                <span>Neural Nexus</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default CommandPalette;
