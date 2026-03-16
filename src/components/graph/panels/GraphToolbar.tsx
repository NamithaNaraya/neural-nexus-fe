/**
 * Graph Toolbar
 * 
 * Top toolbar with view mode toggle, zoom controls, algorithm drawer, and utility buttons.
 * Clean, focused design with only essential actions.
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GraphViewMode } from '../types';
import {
    Box,
    Grid3X3,
    Filter,
    RotateCcw,
    Maximize2,
    Minimize2,
    Download,
    Inbox,
    Zap,
    HelpCircle,
    Search,
    ChevronDown,
    Shrink,
    PieChart,
    Link2,
    Eye,
    Circle,
    List,
    ArrowLeft,
    Plus,
    GitMerge,
    GitBranch,
    Waypoints,
    Network,
} from 'lucide-react';
import { GlobalRenameModal } from './GlobalRenameModal';
import { AlgorithmDrawer } from './AlgorithmDrawer';
import { AnalyticsSelectionLocker } from './AnalyticsSelectionLocker';
import { MachineLearningDrawer } from './ml/MachineLearningDrawer';
import { useGraphStore } from '@/store/graphStore';

interface GraphToolbarProps {
    viewMode: GraphViewMode;
    onViewModeChange: (mode: GraphViewMode) => void;
    isImmersive: boolean;
    onToggleImmersive: () => void;
    onToggleFilters: () => void;

    onResetCamera?: () => void;
    onCollapseAll?: () => void;
    onExport?: () => void;
    onStartTour?: () => void;
    onCreateNode?: () => void;
    showFilters: boolean;
    hasExpandedNodes?: boolean;
    folderId?: string;
    nodeCount?: number;
    linkCount?: number;
    totalNodeCount?: number;
    totalLinkCount?: number;
    selectedCount?: number;
    isSidebarOpen?: boolean;
    focusNodeIds?: Set<string>;
    focusLinkIds?: Set<string>;
    onMerge?: () => void;
}

export function GraphToolbar({
    viewMode,
    onViewModeChange,
    isImmersive,
    onToggleImmersive,
    onToggleFilters,
    onResetCamera,
    onCollapseAll,
    onExport,
    onStartTour,
    onCreateNode,
    showFilters,

    hasExpandedNodes = false,
    folderId,
    nodeCount = 0,
    linkCount = 0,
    totalNodeCount = 0,
    totalLinkCount = 0,
    selectedCount = 0,
    focusNodeIds,
    focusLinkIds,
    isSidebarOpen = false,
    onMerge,
}: GraphToolbarProps) {
    const router = useRouter();
    const [showAlgorithmDrawer, setShowAlgorithmDrawer] = useState(false);
    const [showMlDrawer, setShowMlDrawer] = useState(false);
    const [showGlobalRenameModal, setShowGlobalRenameModal] = useState(false);
    const [showHierarchyMenu, setShowHierarchyMenu] = useState(false);

    const {
        setFilters,
        clearDiscovery,
        analyticSelectionActive,
        setAnalyticSelectionActive,
        clearSelection,
        traversalModeActive,
        setTraversalModeActive
    } = useGraphStore();

    // Calculate if filtering is active
    const isFiltered = nodeCount !== totalNodeCount || linkCount !== totalLinkCount;

    return (
        <>
            <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 z-[60] min-h-16 py-3 px-4 md:px-6 flex flex-wrap items-center gap-3 glass-strong rounded-2xl md:rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/20 transition-all duration-500 hover:shadow-[0_12px_48px_rgba(168,85,247,0.15)] group/toolbar">
                {/* Left Section: Back, View Modes & Filters */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => folderId ? router.push(`/folders/${folderId}?tab=browse`) : router.push('/library')}
                        className="p-2.5 rounded-full bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all border border-white/5 group/back"
                        title={folderId ? "Back to Topic" : "Back to Library"}
                    >
                        <ArrowLeft className="w-5 h-5 transition-transform group-hover/back:-translate-x-1" />
                    </button>

                    <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-full border border-white/5">
                        <ViewModeButton
                            mode="2d"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('2d')}
                            icon={<Grid3X3 className="w-5 h-5" />}
                            label="2D"
                            showLabel={false}
                        />
                        <ViewModeButton
                            mode="charts"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('charts')}
                            icon={<PieChart className="w-5 h-5" />}
                            label="Charts"
                            showLabel={false}
                        />
                        <ViewModeButton
                            mode="list"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('list')}
                            icon={<List className="w-5 h-5" />}
                            label="List"
                            showLabel={false}
                        />

                        {/* <ViewModeButton
                            mode="tree"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('tree')}
                            icon={<GitBranch className="w-5 h-5" />}
                            label="Tree Map"
                            showLabel={false}
                        /> */}
                        <ViewModeButton
                            mode="sunburst"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('sunburst')}
                            icon={<Circle className="w-5 h-5" />}
                            label="Sunburst"
                            showLabel={false}
                        />
                    </div>

                    <div className="w-px h-8 bg-border/20" />

                    <div className="flex items-center gap-2">
                        <ToolbarButton
                            onClick={onToggleFilters}
                            isActive={showFilters}
                            icon={<Filter className="w-4 h-4" />}
                            title="Toggle Filters"
                        />

                    </div>
                </div>

                {/* Spacer - hidden on small screens to allow wrapping items to center */}
                <div className="hidden lg:block lg:flex-1" />

                {/* Right Section: Utilities & Stats */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {onCreateNode && (
                            <ToolbarButton
                                onClick={onCreateNode}
                                icon={<Plus className="w-4 h-4" />}
                                title="Create New Node"
                                className="text-primary hover:bg-primary/10 border-primary/20"
                            />
                        )}

                        <ToolbarButton
                            onClick={() => setShowGlobalRenameModal(true)}
                            icon={<GitBranch className="w-4 h-4" />}
                            title="Global Relationship Rename"
                            className="text-purple-400"
                        />

                        {selectedCount >= 2 && onMerge && (
                            <ToolbarButton
                                onClick={onMerge}
                                icon={<GitMerge className="w-4 h-4" />}
                                title="Merge Selected Nodes"
                                className="text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20"
                            />
                        )}

                        <ToolbarButton
                            onClick={() => setShowAlgorithmDrawer(true)}
                            icon={<Zap className="w-4 h-4" />}
                            title="Graph Analytics"
                            className="text-amber-500 hover:bg-amber-500/10 border-amber-500/20"
                        />
                        <ToolbarButton
                            onClick={() => setShowMlDrawer(true)}
                            icon={<Box className="w-4 h-4" />}
                            title="Machine Learning"
                            className="text-pink-500 hover:bg-pink-500/10 border-pink-500/20"
                        />
                        <ToolbarButton
                            onClick={() => setTraversalModeActive(!traversalModeActive)}
                            icon={<Waypoints className="w-4 h-4" />}
                            isActive={traversalModeActive}
                            title={traversalModeActive ? "Path Traversal (Active)" : "Path Traversal"}
                            className="text-blue-400 hover:bg-blue-400/10 border-blue-400/20"
                        />
                        {onResetCamera && (
                            <ToolbarButton
                                onClick={onResetCamera}
                                icon={<RotateCcw className="w-4 h-4" />}
                                title="Reset Camera"
                            />
                        )}

                        {hasExpandedNodes && onCollapseAll && (
                            <ToolbarButton
                                onClick={onCollapseAll}
                                icon={<Shrink className="w-4 h-4" />}
                                title="Collapse All"
                                className="text-orange-500 hover:bg-orange-500/10"
                            />
                        )}

                        <ToolbarButton
                            onClick={onToggleImmersive}
                            icon={isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            title={isImmersive ? "Exit Immersive" : "Go Immersive"}
                        />
                    </div>

                    <div className="w-px h-8 bg-border/20" />

                    {/* Horizontal Statistics Indicator - Collapsible on small screens */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-6 px-4 py-1.5 glass-strong rounded-full border border-white/5 bg-white/5 mx-2 overflow-hidden">
                        <div className="flex items-center gap-2.5 group/stats shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)] animate-pulse" />
                            <div className="flex flex-col">
                                <span className="hidden xl:inline text-[9px] text-muted-foreground font-semibold uppercase tracking-widest leading-none">Nodes</span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-xs lg:text-sm font-bold text-foreground leading-none">
                                        {selectedCount > 0 && focusNodeIds ? focusNodeIds.size : nodeCount} <span className="text-[10px] text-muted-foreground/60 font-medium">/</span> {totalNodeCount}
                                    </span>
                                    {selectedCount > 0 && (
                                        <span className="hidden xl:inline text-[10px] font-bold text-cyan-400/90 leading-none">
                                            (FOCUSED)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 group/stats shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.6)] animate-pulse" />
                            <div className="flex flex-col">
                                <span className="hidden xl:inline text-[9px] text-muted-foreground font-semibold uppercase tracking-widest leading-none">Links</span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-xs lg:text-sm font-bold text-foreground leading-none">
                                        {selectedCount > 0 && focusLinkIds ? focusLinkIds.size : linkCount} <span className="text-[10px] text-muted-foreground/60 font-medium">/</span> {totalLinkCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Algorithm Drawer */}
            <AlgorithmDrawer
                isOpen={showAlgorithmDrawer}
                onClose={() => setShowAlgorithmDrawer(false)}
                folderId={folderId}
                focusNodeIds={focusNodeIds ? Array.from(focusNodeIds) : undefined}
                focusLinkIds={focusLinkIds ? Array.from(focusLinkIds) : undefined}
            />

            {/* Machine Learning Drawer */}
            <MachineLearningDrawer
                isOpen={showMlDrawer}
                onClose={() => setShowMlDrawer(false)}
                currentFolderId={folderId}
            />

            {/* Selection Locker */}
            <AnalyticsSelectionLocker
                isActive={analyticSelectionActive}
                isSidebarOpen={isSidebarOpen}
                onCancel={() => {
                    setAnalyticSelectionActive(false);
                    clearSelection();
                }}
                onConfirm={() => {
                    setAnalyticSelectionActive(false);
                    setShowAlgorithmDrawer(true);
                }}
            />
            {/* Global Rename Modal */}
            <GlobalRenameModal
                isOpen={showGlobalRenameModal}
                onClose={() => setShowGlobalRenameModal(false)}
                folderId={folderId}
            />
        </>
    );
}

// View Mode Button Component
interface ViewModeButtonProps {
    mode: GraphViewMode;
    currentMode: GraphViewMode;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    showLabel?: boolean;
}

function ViewModeButton({ mode, currentMode, onClick, icon, label, showLabel = true }: ViewModeButtonProps) {
    const isActive = mode === currentMode;

    return (
        <button
            onClick={onClick}
            className={`
                relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-bold
                transition-all duration-300 ease-out
                ${isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
            `}
            title={label}
        >
            {isActive && (
                <motion.div
                    layoutId="viewModeIndicator"
                    className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg shadow-lg border border-primary/30"
                    style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.15)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            )}
            <span className="relative z-10">{icon}</span>
            {showLabel && <span className="relative z-10 hidden sm:inline">{label}</span>}
        </button>
    );
}

// Generic Toolbar Button
interface ToolbarButtonProps {
    onClick?: () => void;
    icon: React.ReactNode;
    title: string;
    isActive?: boolean;
    className?: string;
    'data-tour'?: string;
}

function ToolbarButton({ onClick, icon, title, isActive = false, className = '', ...props }: ToolbarButtonProps) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`
                p-2.5 rounded-xl transition-all duration-300 ease-out
                border border-transparent
                ${isActive
                    ? 'bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-border/50 hover:shadow-md'
                }
                ${className}
            `}
            {...props}
        >
            {icon}
        </button>
    );
}
