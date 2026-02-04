/**
 * useCommandPalette Hook
 * 
 * Global hook to manage Command Palette state and keyboard shortcuts.
 * Provides Ctrl+K / Cmd+K shortcut handling.
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CommandItem } from '@/components/command-palette/CommandPalette';
import { useGraphStore } from '@/store/graphStore';
import { useUIStore } from '@/store/uiStore';

// Icons - imported lazily to prevent circular dependencies
import {
    FolderOpen,
    Network,
    Settings,
    User,
    Eye,
    Maximize2,
    Filter,
    RefreshCw,
    X,
    Zap,
    Share2,
    BarChart3,
    Inbox,
    Download,
    Upload,
    Moon,
    HelpCircle,
    LogOut,
    Search,
} from 'lucide-react';
import React from 'react';

export function useCommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    // Get store methods
    const clearSelection = useGraphStore(state => state.clearSelection);
    const {
        viewMode,
        setViewMode,
        toggleFullscreen,
        toggleTheme,
        openModal,
    } = useUIStore();

    // Open command palette
    const open = useCallback(() => setIsOpen(true), []);

    // Close command palette
    const close = useCallback(() => setIsOpen(false), []);

    // Toggle command palette
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    // Global keyboard shortcut listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggle();
            }

            // Also support Ctrl+/
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                toggle();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggle]);

    // Build commands with actual actions
    const buildCommands = useCallback((): CommandItem[] => {
        return [
            // Navigation
            {
                id: 'nav-library',
                label: 'Go to Library',
                description: 'View all your folders and documents',
                icon: React.createElement(FolderOpen, { className: 'w-4 h-4' }),
                shortcut: 'G L',
                category: 'navigation',
                action: () => router.push('/library'),
                keywords: ['home', 'folders', 'documents'],
            },
            {
                id: 'nav-dashboard',
                label: 'Go to Dashboard',
                description: 'Main knowledge graph dashboard',
                icon: React.createElement(Network, { className: 'w-4 h-4' }),
                shortcut: 'G D',
                category: 'navigation',
                action: () => router.push('/dashboard'),
                keywords: ['graph', 'main', 'overview'],
            },
            {
                id: 'nav-settings',
                label: 'Go to Settings',
                description: 'Account and application settings',
                icon: React.createElement(Settings, { className: 'w-4 h-4' }),
                shortcut: 'G S',
                category: 'navigation',
                action: () => router.push('/settings'),
                keywords: ['preferences', 'config', 'account'],
            },
            {
                id: 'nav-profile',
                label: 'View Profile',
                description: 'Your user profile and stats',
                icon: React.createElement(User, { className: 'w-4 h-4' }),
                shortcut: 'G P',
                category: 'navigation',
                action: () => router.push('/profile'),
                keywords: ['account', 'user', 'me'],
            },

            // Graph Actions
            {
                id: 'graph-toggle-view',
                label: 'Toggle 3D/2D View',
                description: 'Switch between 3D and 2D visualization',
                icon: React.createElement(Eye, { className: 'w-4 h-4' }),
                shortcut: 'V',
                category: 'graph',
                action: () => {
                    setViewMode(viewMode === '3d' ? '2d' : '3d');
                },
                keywords: ['view', 'mode', 'dimension'],
            },
            {
                id: 'graph-fullscreen',
                label: 'Toggle Fullscreen',
                description: 'Enter or exit immersive mode',
                icon: React.createElement(Maximize2, { className: 'w-4 h-4' }),
                shortcut: 'F',
                category: 'graph',
                action: () => toggleFullscreen(),
                keywords: ['immersive', 'expand', 'maximize'],
            },
            {
                id: 'graph-filters',
                label: 'Toggle Filters Panel',
                description: 'Show or hide node filters',
                icon: React.createElement(Filter, { className: 'w-4 h-4' }),
                shortcut: 'Shift F',
                category: 'graph',
                action: () => {
                    openModal('filters', 'GraphFilters');
                },
                keywords: ['type', 'search', 'narrow'],
            },
            {
                id: 'graph-refresh',
                label: 'Refresh Graph Data',
                description: 'Reload graph from server',
                icon: React.createElement(RefreshCw, { className: 'w-4 h-4' }),
                shortcut: 'R',
                category: 'graph',
                action: () => {
                    // Trigger refresh through custom event
                    window.dispatchEvent(new CustomEvent('refresh-graph'));
                },
                keywords: ['reload', 'update', 'sync'],
            },
            {
                id: 'graph-clear-selection',
                label: 'Clear Selection',
                description: 'Deselect all nodes',
                icon: React.createElement(X, { className: 'w-4 h-4' }),
                shortcut: 'Esc',
                category: 'graph',
                action: () => clearSelection(),
                keywords: ['deselect', 'reset'],
            },

            // Analysis Actions
            {
                id: 'analysis-blind-spots',
                label: 'Discover Blind Spots',
                description: 'Find potential missing relationships',
                icon: React.createElement(Zap, { className: 'w-4 h-4' }),
                category: 'analysis',
                action: () => {
                    openModal('blind-spots', 'BlindSpotsPanel');
                },
                keywords: ['missing', 'gaps', 'predict', 'ghost'],
            },
            {
                id: 'analysis-compare',
                label: 'Compare Clusters',
                description: 'Analyze similarities between node groups',
                icon: React.createElement(Share2, { className: 'w-4 h-4' }),
                category: 'analysis',
                action: () => {
                    openModal('cluster-comparison', 'ClusterComparisonPanel');
                },
                keywords: ['diff', 'similarity', 'groups'],
            },
            {
                id: 'analysis-health',
                label: 'Graph Health Check',
                description: 'Assess the quality of your knowledge graph',
                icon: React.createElement(BarChart3, { className: 'w-4 h-4' }),
                category: 'analysis',
                action: () => {
                    openModal('health', 'GraphHealthPanel');
                },
                keywords: ['quality', 'score', 'metrics'],
            },
            {
                id: 'analysis-review-inbox',
                label: 'Review Inbox',
                description: 'Review pending file ingestions',
                icon: React.createElement(Inbox, { className: 'w-4 h-4' }),
                category: 'analysis',
                action: () => {
                    openModal('review-inbox', 'ReviewInboxPanel');
                },
                keywords: ['pending', 'approve', 'files', 'ingestion'],
            },

            // Export Actions
            {
                id: 'export-pdf',
                label: 'Export as PDF',
                description: 'Generate analytics PDF report',
                icon: React.createElement(Download, { className: 'w-4 h-4' }),
                category: 'export',
                action: () => {
                    window.dispatchEvent(new CustomEvent('export-analytics', { detail: { format: 'pdf' } }));
                },
                keywords: ['download', 'report', 'document'],
            },
            {
                id: 'export-json',
                label: 'Export as JSON',
                description: 'Download graph data as JSON',
                icon: React.createElement(Download, { className: 'w-4 h-4' }),
                category: 'export',
                action: () => {
                    window.dispatchEvent(new CustomEvent('export-analytics', { detail: { format: 'json' } }));
                },
                keywords: ['download', 'data', 'api'],
            },
            {
                id: 'export-csv',
                label: 'Export as CSV',
                description: 'Download data for spreadsheet',
                icon: React.createElement(Download, { className: 'w-4 h-4' }),
                category: 'export',
                action: () => {
                    window.dispatchEvent(new CustomEvent('export-analytics', { detail: { format: 'csv' } }));
                },
                keywords: ['download', 'excel', 'spreadsheet'],
            },

            // File Actions
            {
                id: 'action-upload',
                label: 'Upload Document',
                description: 'Add a new document to the graph',
                icon: React.createElement(Upload, { className: 'w-4 h-4' }),
                shortcut: 'U',
                category: 'actions',
                action: () => {
                    openModal('upload', 'UploadModal');
                },
                keywords: ['add', 'file', 'import', 'new'],
            },
            {
                id: 'action-new-folder',
                label: 'Create New Folder',
                description: 'Create a new topic folder',
                icon: React.createElement(FolderOpen, { className: 'w-4 h-4' }),
                shortcut: 'N',
                category: 'actions',
                action: () => {
                    openModal('new-folder', 'NewFolderModal');
                },
                keywords: ['add', 'topic', 'new'],
            },
            {
                id: 'action-search',
                label: 'Search Entities',
                description: 'Search for nodes in the graph',
                icon: React.createElement(Search, { className: 'w-4 h-4' }),
                shortcut: '/',
                category: 'actions',
                action: () => {
                    // Focus search input
                    const searchInput = document.querySelector('[data-graph-search]') as HTMLInputElement;
                    searchInput?.focus();
                },
                keywords: ['find', 'query', 'filter'],
            },

            // Settings
            {
                id: 'settings-theme',
                label: 'Toggle Theme',
                description: 'Switch between dark and light mode',
                icon: React.createElement(Moon, { className: 'w-4 h-4' }),
                shortcut: 'T',
                category: 'settings',
                action: () => toggleTheme(),
                keywords: ['dark', 'light', 'mode', 'appearance'],
            },
            {
                id: 'settings-shortcuts',
                label: 'Keyboard Shortcuts',
                description: 'View all available shortcuts',
                icon: React.createElement(HelpCircle, { className: 'w-4 h-4' }),
                shortcut: '?',
                category: 'settings',
                action: () => {
                    openModal('shortcuts', 'KeyboardShortcutsPanel');
                },
                keywords: ['keys', 'hotkeys', 'help'],
            },
            {
                id: 'settings-logout',
                label: 'Sign Out',
                description: 'Log out of your account',
                icon: React.createElement(LogOut, { className: 'w-4 h-4' }),
                category: 'settings',
                action: () => router.push('/logout'),
                keywords: ['logout', 'exit', 'leave'],
            },
        ];
    }, [router, clearSelection, viewMode, setViewMode, toggleFullscreen, toggleTheme, openModal]);

    // Handle action from command palette
    const handleAction = useCallback((actionId: string) => {
        console.log('Command executed:', actionId);
        // Additional tracking/analytics can go here
    }, []);

    return {
        isOpen,
        open,
        close,
        toggle,
        buildCommands,
        handleAction,
    };
}

export default useCommandPalette;
