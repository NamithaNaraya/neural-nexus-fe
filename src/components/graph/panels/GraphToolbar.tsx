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
    Link2,
    Eye,
    Circle,
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
            <div className="absolute top-6 left-6 right-6 z-40 h-16 px-6 flex items-center glass-strong rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/20 transition-all duration-500 hover:shadow-[0_12px_48px_rgba(168,85,247,0.15)] group/toolbar">
                {/* Left Section: View Modes & Filters */}
                <div className="flex items-center gap-4">
                    {/* View Mode Toggle - Horizontal */}
                    <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-full border border-white/5">
                        <ViewModeButton
                            mode="3d"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('3d')}
                            icon={<Box className="w-5 h-5" />}
                            label="3D"
                        />
                        <ViewModeButton
                            mode="2d"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('2d')}
                            icon={<Grid3X3 className="w-5 h-5" />}
                            label="2D"
                        />
                        <ViewModeButton
                            mode="charts"
                            currentMode={viewMode}
                            onClick={() => onViewModeChange('charts')}
                            icon={<PieChart className="w-5 h-5" />}
                            label="Charts"
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

                        <ToolbarButton
                            onClick={() => setShowAlgorithmDrawer(true)}
                            icon={<Zap className="w-4 h-4" />}
                            title="Graph Algorithms"
                            className="text-amber-500 hover:bg-amber-500/10"
                        />
                    </div>
                </div>

                {/* Spacer to push everything else to the right */}
                <div className="flex-1" />

                {/* Right Section: Utilities & Stats */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
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

                    {/* Horizontal Statistics Indicator */}
                    <div className="flex items-center gap-6 px-2">
                        <div className="flex items-center gap-2 group/stats">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse" />
                            <div className="flex flex-col -gap-1">
                                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none">nodes</span>
                                <span className="text-sm font-bold text-white leading-none">{nodeCount}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 group/stats">
                            <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-pulse" />
                            <div className="flex flex-col -gap-1">
                                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none">links</span>
                                <span className="text-sm font-bold text-white leading-none">{linkCount}</span>
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
                relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                transition-all duration-300 ease-out
                ${isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
            `}
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
