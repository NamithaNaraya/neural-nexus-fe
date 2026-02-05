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
    Info,
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
} from 'lucide-react';
import { AlgorithmDrawer } from './AlgorithmDrawer';

interface GraphToolbarProps {
    viewMode: GraphViewMode;
    onViewModeChange: (mode: GraphViewMode) => void;
    isImmersive: boolean;
    onToggleImmersive: () => void;
    onToggleFilters: () => void;
    onToggleLegend: () => void;
    onToggleReviewInbox: () => void;
    onResetCamera?: () => void;
    onCollapseAll?: () => void;
    onExport?: () => void;
    onStartTour?: () => void;
    showFilters: boolean;
    showLegend: boolean;
    showReviewInbox: boolean;
    hasExpandedNodes?: boolean;
    folderId?: string;
    nodeCount?: number;
    linkCount?: number;
}

export function GraphToolbar({
    viewMode,
    onViewModeChange,
    isImmersive,
    onToggleImmersive,
    onToggleFilters,
    onToggleLegend,
    onToggleReviewInbox,
    onResetCamera,
    onCollapseAll,
    onExport,
    onStartTour,
    showFilters,
    showLegend,
    showReviewInbox,
    hasExpandedNodes = false,
    folderId,
    nodeCount,
    linkCount,
}: GraphToolbarProps) {
    const [showAlgorithmDrawer, setShowAlgorithmDrawer] = useState(false);

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
                    </div>

                    <div className="w-px h-6 bg-border/50 mx-2" />

                    {/* Core Actions */}
                    <ToolbarButton
                        onClick={onToggleReviewInbox}
                        isActive={showReviewInbox}
                        icon={<Inbox className="w-4 h-4" />}
                        title="Review Inbox"
                        data-tour="review-inbox"
                    />
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

                {/* Center Section - Stats */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">Neural Nexus</span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {viewMode.toUpperCase()}
                    </span>
                    {nodeCount !== undefined && (
                        <span className="text-xs text-muted-foreground">
                            {nodeCount} nodes • {linkCount} links
                        </span>
                    )}
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center gap-2">
                    {/* Collapse All - Only visible when nodes are expanded */}
                    {hasExpandedNodes && onCollapseAll && (
                        <ToolbarButton
                            onClick={onCollapseAll}
                            icon={<Shrink className="w-4 h-4" />}
                            title="Collapse All Expanded Nodes"
                            className="text-orange-500"
                        />
                    )}

                    <ToolbarButton
                        onClick={onResetCamera}
                        icon={<RotateCcw className="w-4 h-4" />}
                        title="Reset View"
                    />

                    <ToolbarButton
                        onClick={onToggleLegend}
                        isActive={showLegend}
                        icon={<Info className="w-4 h-4" />}
                        title="Toggle Legend"
                    />

                    <ToolbarButton
                        onClick={onExport}
                        icon={<Download className="w-4 h-4" />}
                        title="Export Graph"
                    />

                    <div className="w-px h-6 bg-border/50 mx-2" />

                    {/* Help / Tour */}
                    <ToolbarButton
                        onClick={onStartTour}
                        icon={<HelpCircle className="w-4 h-4" />}
                        title="Start Tour"
                    />

                    <ToolbarButton
                        onClick={onToggleImmersive}
                        icon={isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        title={isImmersive ? "Exit Fullscreen" : "Fullscreen"}
                    />
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
