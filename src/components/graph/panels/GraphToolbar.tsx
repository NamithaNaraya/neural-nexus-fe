/**
 * Graph Toolbar
 * 
 * Top toolbar with view mode toggle, zoom controls, algorithm drawer, and utility buttons.
 * Clean, focused design with only essential actions.
 */
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { AlgorithmDrawer } from './AlgorithmDrawer';

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
    showFilters: boolean;
    hasExpandedNodes?: boolean;
    folderId?: string;
    nodeCount?: number;
    linkCount?: number;
    totalNodeCount?: number;
    totalLinkCount?: number;
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
    showFilters,

    hasExpandedNodes = false,
    folderId,
    nodeCount = 0,
    linkCount = 0,
    totalNodeCount = 0,
    totalLinkCount = 0,
}: GraphToolbarProps) {
    const [showAlgorithmDrawer, setShowAlgorithmDrawer] = useState(false);

    // Calculate if filtering is active
    const isFiltered = nodeCount !== totalNodeCount || linkCount !== totalLinkCount;

    return (
        <>
            <div className="absolute top-0 left-0 right-0 z-40 h-14 px-4 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border/40">
                {/* Left Section - View Mode Toggle */}
                <div className="flex items-center gap-2">
                    <div className="flex bg-muted/50 rounded-lg p-1">
                        <ViewModeButton
                            mode="3d"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('3d')}
                            icon={<Box className="w-4 h-4" />}
                            label="3D"
                        />
                        <ViewModeButton
                            mode="2d"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('2d')}
                            icon={<Grid3X3 className="w-4 h-4" />}
                            label="2D"
                        />
                        <ViewModeButton
                            mode="charts"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('charts')}
                            icon={<PieChart className="w-4 h-4" />}
                            label="Charts"
                        />
                    </div>

                    <div className="w-px h-6 bg-border/50 mx-2" />

                    {/* Core Actions */}

                    <ToolbarButton
                        onClick={onToggleFilters}
                        isActive={showFilters}
                        icon={<Filter className="w-4 h-4" />}
                        title="Toggle Filters"
                    />

                    {/* Algorithm Drawer Toggle */}
                    <ToolbarButton
                        onClick={() => setShowAlgorithmDrawer(true)}
                        icon={<Zap className="w-4 h-4" />}
                        title="Graph Algorithms"
                        data-tour="algorithm-drawer"
                        className="text-amber-500"
                    />
                </div>



                {/* Right Section - Stats & Actions */}
                <div className="flex items-center gap-4">
                    {/* Stats Pill */}
                    <div className="flex items-center h-9 px-3 bg-background border border-border rounded-full shadow-sm text-sm hidden md:flex">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="w-2 h-2 rounded-full border border-current" />
                            <span className="font-medium text-foreground">{nodeCount}</span>
                            <span className="text-muted-foreground/60">/{totalNodeCount} Nodes</span>
                        </div>

                        <div className="w-px h-4 bg-border mx-3" />

                        <div className="flex items-center gap-2 text-muted-foreground">
                            {/* Link Icon */}
                            <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span className="font-medium text-foreground">{linkCount}</span>
                            <span className="text-muted-foreground/60">/{totalLinkCount} Links</span>
                        </div>

                        {isFiltered && (
                            <>
                                <div className="w-px h-4 bg-border mx-3" />
                                <div className="flex items-center gap-1.5 text-amber-500">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span className="font-medium text-xs">Filtered</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Collapse All - Only visible when nodes are expanded */}
                    {hasExpandedNodes && onCollapseAll && (
                        <ToolbarButton
                            onClick={onCollapseAll}
                            icon={<Shrink className="w-4 h-4" />}
                            title="Collapse All Expanded Nodes"
                            className="text-orange-500"
                        />
                    )}
                </div>
            </div>

            {/* Algorithm Drawer */}
            <AlgorithmDrawer
                isOpen={showAlgorithmDrawer}
                onClose={() => setShowAlgorithmDrawer(false)}
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
}

function ViewModeButton({ mode, currentMode, onClick, icon, label }: ViewModeButtonProps) {
    const isActive = mode === currentMode;

    return (
        <button
            onClick={onClick}
            className={`
                relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                transition-colors duration-200
                ${isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }
            `}
        >
            {isActive && (
                <motion.div
                    layoutId="viewModeIndicator"
                    className="absolute inset-0 bg-background rounded-md shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            )}
            <span className="relative z-10">{icon}</span>
            <span className="relative z-10">{label}</span>
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
                p-2 rounded-lg transition-colors duration-200
                ${isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
                ${className}
            `}
            {...props}
        >
            {icon}
        </button>
    );
}
