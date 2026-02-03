/**
 * Graph Container
 * 
 * Main container component that switches between 3D and 2D visualization modes.
 * Handles:
 * - View mode switching (3D/2D)
 * - Data loading and error states
 * - Responsive layout
 * - Toolbar integration
 */
'use client';

import React, { useState, useCallback, useMemo, Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore, GraphNode, GraphLink } from '@/store/graphStore';
import { GraphToolbar } from './panels/GraphToolbar';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { NodeTooltip } from './panels/NodeTooltip';
import { GraphSearch } from './shared/GraphSearch';
import { GraphFilters } from './shared/GraphFilters';
import { GraphLegend } from './shared/GraphLegend';
import { GraphStats } from './shared/GraphStats';
import { NodeContextMenu, initialContextMenuState } from './shared/NodeContextMenu';
import { FileScopePanel } from './panels/FileScopePanel';
import { GraphViewMode } from './types';
import { useNodeExpansion, useShortestPath } from '@/hooks/useApi';
import { useDevice, useViewModeLock } from '@/hooks/useDevice';
import { Loader2, Maximize2, Minimize2, Zap, FolderTree, AlertTriangle } from 'lucide-react';

// Dynamic imports for heavy visualization components
const NeuralSpace3D = dynamic(() => import('./3d/NeuralSpace3D').then(m => ({ default: m.NeuralSpace3D })), {
    ssr: false,
    loading: () => <GraphLoadingState message="Initializing 3D Engine..." />,
});

const ForceGraph2D = dynamic(() => import('./2d/ForceGraph2D').then(m => ({ default: m.ForceGraph2D })), {
    ssr: false,
    loading: () => <GraphLoadingState message="Initializing 2D Engine..." />,
});

// Props
interface GraphContainerProps {
    folderId?: string;
    fileId?: string;
    initialMode?: GraphViewMode;
    className?: string;
    showToolbar?: boolean;
    showSidebar?: boolean;
    immersiveMode?: boolean;
}

// Loading state component
function GraphLoadingState({ message }: { message: string }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center">
                <Loader2 className="w-8 h-8 text-emerald animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}

// Empty state component
function GraphEmptyState() {
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Graph Data</h3>
                <p className="text-sm text-muted-foreground">
                    Upload documents to start building your knowledge graph, or select a folder with existing data.
                </p>
            </div>
        </div>
    );
}

export function GraphContainer({
    folderId,
    fileId,
    initialMode = '3d',
    className = '',
    showToolbar = true,
    showSidebar = true,
    immersiveMode: initialImmersive = false,
}: GraphContainerProps) {
    // State
    const [viewMode, setViewMode] = useState<GraphViewMode>(initialMode);
    const [isImmersive, setIsImmersive] = useState(initialImmersive);
    const [showFilters, setShowFilters] = useState(false);
    const [showLegend, setShowLegend] = useState(true);
    const [showFileScope, setShowFileScope] = useState(false);
    const [contextMenu, setContextMenu] = useState(initialContextMenuState);

    // Device detection for mobile 2D lock
    const device = useDevice();
    const { lockedMode, isLocked, reason: lockReason } = useViewModeLock(viewMode, setViewMode);

    // Auto-lock to 2D on mobile/tablet
    useEffect(() => {
        if (!device.is3DCapable && viewMode === '3d') {
            setViewMode('2d');
        }
    }, [device.is3DCapable, viewMode]);

    // Graph store
    const {
        nodes,
        links,
        selectedNodes,
        hoveredNode,
        isGraphLoading,
        nodeCount,
        linkCount,
        selectNode,
        setHoveredNode,
        clearSelection,
        filteredNodes,
        filteredLinks,
    } = useGraphStore();

    // Get filtered data
    const visibleNodes = useMemo(() => filteredNodes(), [filteredNodes]);
    const visibleLinks = useMemo(() => filteredLinks(), [filteredLinks]);

    // Check if we have data
    const hasData = nodes.length > 0;

    // Selected node data
    const selectedNode = useMemo(() => {
        if (selectedNodes.length === 1) {
            return nodes.find(n => n.id === selectedNodes[0]) || null;
        }
        return null;
    }, [selectedNodes, nodes]);

    // Hovered node data
    const hoveredNodeData = useMemo(() => {
        if (hoveredNode) {
            return nodes.find(n => n.id === hoveredNode) || null;
        }
        return null;
    }, [hoveredNode, nodes]);

    // API hooks
    const expandMutation = useNodeExpansion();
    const pathMutation = useShortestPath();

    // Handlers
    const handleNodeClick = useCallback(async (nodeId: string, event?: React.MouseEvent) => {
        const isMultiSelect = event?.shiftKey || event?.ctrlKey || event?.metaKey;
        selectNode(nodeId, isMultiSelect);

        // If we now have two nodes selected, offer to find path
        const nextState = useGraphStore.getState();
        if (nextState.selectedNodes.length === 2) {
            console.log('Finding path between:', nextState.selectedNodes);
            try {
                const result = await pathMutation.mutateAsync({
                    sourceId: nextState.selectedNodes[0],
                    targetId: nextState.selectedNodes[1]
                });

                if (result.path_exists) {
                    console.log('Path found:', result.node_ids);
                    // TODO: Highlight path in visualization
                }
            } catch (err) {
                console.error('Path finding failed:', err);
            }
        }
    }, [selectNode, pathMutation]);

    const handleNodeDoubleClick = useCallback(async (nodeId: string) => {
        console.log('Expanding node:', nodeId);
        try {
            const data = await expandMutation.mutateAsync({ nodeId });
            if (data.nodes) {
                // Add new nodes and links to the store
                const { addNode, addLink } = useGraphStore.getState();

                data.nodes.forEach(node => {
                    addNode({
                        id: node.id,
                        name: node.name,
                        type: node.type,
                        description: node.description,
                        properties: node.properties,
                        degree: node.degree
                    });
                });

                const relationships = data.relationships || data.links || [];
                relationships.forEach(link => {
                    addLink({
                        source: link.source,
                        target: link.target,
                        type: link.type,
                        strength: link.strength
                    });
                });
            }
        } catch (err) {
            console.error('Expansion failed:', err);
        }
    }, [expandMutation]);

    const handleNodeHover = useCallback((nodeId: string | null) => {
        setHoveredNode(nodeId);
    }, [setHoveredNode]);

    const handleBackgroundClick = useCallback(() => {
        clearSelection();
        setContextMenu(initialContextMenuState);
    }, [clearSelection]);

    // Context menu handler (right-click)
    const handleNodeContextMenu = useCallback((nodeId: string, x: number, y: number) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setContextMenu({
                isOpen: true,
                x,
                y,
                nodeId,
                nodeName: node.name,
            });
        }
    }, [nodes]);

    const closeContextMenu = useCallback(() => {
        setContextMenu(initialContextMenuState);
    }, []);

    const toggleImmersive = useCallback(() => {
        setIsImmersive(prev => !prev);
    }, []);

    const handleViewModeChange = useCallback((mode: GraphViewMode) => {
        setViewMode(mode);
    }, []);

    // Container classes
    const containerClasses = useMemo(() => {
        const base = 'relative bg-background overflow-hidden';
        const immersive = isImmersive ? 'fixed inset-0 z-50' : 'w-full h-full';
        return `${base} ${immersive} ${className}`;
    }, [isImmersive, className]);

    return (
        <div className={containerClasses}>
            {/* Toolbar */}
            {showToolbar && (
                <GraphToolbar
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    isImmersive={isImmersive}
                    onToggleImmersive={toggleImmersive}
                    onToggleFilters={() => setShowFilters(prev => !prev)}
                    onToggleLegend={() => setShowLegend(prev => !prev)}
                    showFilters={showFilters}
                    showLegend={showLegend}
                />
            )}

            {/* Search Bar */}
            <div className="absolute top-16 left-4 z-30 w-72">
                <GraphSearch />
            </div>

            {/* Stats */}
            <div className="absolute top-16 right-4 z-30">
                <GraphStats
                    nodeCount={visibleNodes.length}
                    linkCount={visibleLinks.length}
                    totalNodes={nodeCount}
                    totalLinks={linkCount}
                />
            </div>

            {/* Main Visualization Area */}
            <div className="absolute inset-0 pt-14">
                {isGraphLoading ? (
                    <GraphLoadingState message="Loading graph data..." />
                ) : !hasData ? (
                    <GraphEmptyState />
                ) : (
                    <AnimatePresence mode="wait">
                        {viewMode === '3d' ? (
                            <motion.div
                                key="3d"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full h-full"
                            >
                                <Suspense fallback={<GraphLoadingState message="Loading 3D view..." />}>
                                    <NeuralSpace3D
                                        nodes={visibleNodes}
                                        links={visibleLinks}
                                        selectedNodes={selectedNodes}
                                        hoveredNode={hoveredNode}
                                        onNodeClick={handleNodeClick}
                                        onNodeDoubleClick={handleNodeDoubleClick}
                                        onNodeHover={handleNodeHover}
                                        onBackgroundClick={handleBackgroundClick}
                                    />
                                </Suspense>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="2d"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full h-full"
                            >
                                <Suspense fallback={<GraphLoadingState message="Loading 2D view..." />}>
                                    <ForceGraph2D
                                        nodes={visibleNodes}
                                        links={visibleLinks}
                                        selectedNodes={selectedNodes}
                                        hoveredNode={hoveredNode}
                                        onNodeClick={handleNodeClick}
                                        onNodeDoubleClick={handleNodeDoubleClick}
                                        onNodeHover={handleNodeHover}
                                        onBackgroundClick={handleBackgroundClick}
                                    />
                                </Suspense>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ x: -320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -320, opacity: 0 }}
                        className="absolute left-4 top-28 bottom-4 w-72 z-20"
                    >
                        <GraphFilters onClose={() => setShowFilters(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend */}
            <AnimatePresence>
                {showLegend && hasData && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className="absolute bottom-4 left-4 z-20"
                    >
                        <GraphLegend />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Node Detail Panel */}
            {showSidebar && selectedNode && (
                <NodeDetailPanel
                    node={selectedNode}
                    onClose={clearSelection}
                />
            )}

            {/* Tooltip */}
            {hoveredNodeData && !selectedNode && (
                <NodeTooltip node={hoveredNodeData} />
            )}

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu.isOpen && contextMenu.nodeId && contextMenu.nodeName && (
                    <NodeContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        nodeId={contextMenu.nodeId}
                        nodeName={contextMenu.nodeName}
                        onClose={closeContextMenu}
                        onExpand={() => handleNodeDoubleClick(contextMenu.nodeId!)}
                        onFindConnected={() => {
                            selectNode(contextMenu.nodeId!);
                            closeContextMenu();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Mobile 2D Lock Warning */}
            {isLocked && lockReason && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg flex items-center gap-2"
                >
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-amber-500">{lockReason}</span>
                </motion.div>
            )}

            {/* Immersive Mode Toggle Button (when in immersive) */}
            {isImmersive && (
                <button
                    onClick={toggleImmersive}
                    className="absolute top-4 right-4 z-50 p-2 bg-background/80 backdrop-blur-sm rounded-lg border border-border hover:bg-muted transition-colors"
                    title="Exit Immersive Mode"
                >
                    <Minimize2 className="w-5 h-5 text-foreground" />
                </button>
            )}
        </div>
    );
}
