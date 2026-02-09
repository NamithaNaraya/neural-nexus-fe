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
            <div className="absolute top-0 left-0 right-0 z-40 h-14 px-4 flex items-center justify-between bg-background/90 backdrop-blur-xl border-b border-border/30 shadow-lg shadow-black/5">
                {/* Left Section - View Mode Toggle */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl p-1 border border-border/40 shadow-inner backdrop-blur-sm">
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
                    <div className="flex items-center h-9 px-4 bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-white/10 rounded-full shadow-lg text-sm hidden md:flex backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <Circle className="w-3 h-3 text-cyan-400" fill="#22D3EE" />
                            <span className="font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">{nodeCount}</span>
                            <span className="text-white/40">/{totalNodeCount}</span>
                            <span className="text-white/60">Nodes</span>
                        </div>

                        <div className="w-px h-4 bg-white/10 mx-3" />

                        <div className="flex items-center gap-2">
                            <Link2 className="w-3.5 h-3.5 text-purple-400" />
                            <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{linkCount}</span>
                            <span className="text-white/40">/{totalLinkCount}</span>
                            <span className="text-white/60">Links</span>
                        </div>

                        {isFiltered && (
                            <>
                                <div className="w-px h-4 bg-white/10 mx-3" />
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="font-medium text-xs text-amber-400">Filtered</span>
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
