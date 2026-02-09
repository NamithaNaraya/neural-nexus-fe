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
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore, GraphNode, GraphLink } from '@/store/graphStore';
import { GraphToolbar } from './panels/GraphToolbar';
import { GraphSearch } from './shared/GraphSearch';
import { GraphFilters } from './shared/GraphFilters';
import { GraphStats } from './shared/GraphStats';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { DataCanvas } from '../../visualizations/DataCanvas';
import { FileScopePanel } from './panels/FileScopePanel';
import { ChatAssistant } from './panels/ChatAssistant';
import { GraphViewMode } from './types';
import { useNodeExpansion, useShortestPath } from '@/hooks/useApi';
import { useDevice, useViewModeLock } from '@/hooks/useDevice';
import { Loader2, Maximize2, Minimize2, Zap, FolderTree, AlertTriangle } from 'lucide-react';
import { OnboardingOverlay, useOnboarding } from '@/components/onboarding';
import { NodeEditorModal, RelationshipEditorModal, DeleteConfirmModal } from './modals';
import { api } from '@/lib/api';

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
    initialShowInbox?: boolean;
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
function GraphEmptyState({ folderId }: { folderId?: string }) {
    const router = useRouter();

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center max-w-md px-6">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald/20 to-cyan-500/20 flex items-center justify-center">
                    <svg className="w-10 h-10 text-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">No Knowledge Graph Yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Upload documents to this folder to automatically extract entities and relationships.
                    Your knowledge graph will appear here once processing is complete.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => router.push('/library')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald text-white rounded-lg hover:bg-emerald-dark transition-colors font-medium"
                    >
                        <Zap className="w-4 h-4" />
                        Upload Documents
                    </button>
                    <button
                        onClick={() => router.push('/library')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                        <FolderTree className="w-4 h-4" />
                        Browse Library
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-6">
                    Supported formats: PDF, CSV, TXT, MD, DOCX
                </p>
            </div>
        </div>
    );
}

// Error Boundary Component
class GraphErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Graph Rendering Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">Visualization Error</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                        {this.state.error?.message || "An unexpected error occurred while rendering the graph."}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="px-4 py-2 bg-emerald text-white rounded-lg hover:bg-emerald-dark"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}



// ... other imports

export function GraphContainer({
    folderId,
    fileId,
    initialMode = '2d',
    className = '',
    showToolbar = true,
    showSidebar = true,
    immersiveMode: initialImmersive = false,
    initialShowInbox = false,
}: GraphContainerProps) {
    console.log("GraphContainer MOUNTING", { folderId });

    // State
    const [viewMode, setViewMode] = useState<GraphViewMode>(initialMode);
    const [isImmersive, setIsImmersive] = useState(initialImmersive);
    const [showFilters, setShowFilters] = useState(true);

    const [showFileScope, setShowFileScope] = useState(false);
    const [showNodeDetail, setShowNodeDetail] = useState(false);
    const [selectedNodeForDetail, setSelectedNodeForDetail] = useState<GraphNode | null>(null);

    // CRUD Modal states
    const [showNodeEditor, setShowNodeEditor] = useState(false);
    const [nodeEditorMode, setNodeEditorMode] = useState<'create' | 'edit'>('create');
    const [editingNode, setEditingNode] = useState<GraphNode | null>(null);
    const [showRelationshipEditor, setShowRelationshipEditor] = useState(false);
    const [relationshipSourceNode, setRelationshipSourceNode] = useState<GraphNode | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTargetNode, setDeleteTargetNode] = useState<GraphNode | null>(null);

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
        filters,
        zoomToNode,
        resetCamera,
    } = useGraphStore();

    // Get filtered data
    // Use useMemo with proper dependencies to ensure updates when data/filters change
    const visibleNodes = useMemo(() => filteredNodes(), [filteredNodes, nodes, filters]);
    const visibleLinks = useMemo(() => filteredLinks(), [filteredLinks, links, filters, nodes]); // Links depend on nodes filtering too

    // Debug Data
    useEffect(() => {
        if (visibleNodes.length > 0) {
            console.log("Graph Data Ready:", {
                nodeCount: visibleNodes.length,
                linkCount: visibleLinks.length,
                sampleNode: visibleNodes[0],
                sampleLink: visibleLinks[0]
            });
        } else {
            console.log("Graph Data Empty or Loading:", {
                hasNodes: nodes.length > 0,
                hasLinks: links.length > 0,
                filters
            });
        }
    }, [visibleNodes, visibleLinks, nodes.length, links.length, filters]);

    // ... (rest of render)

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
    const handleNodeDoubleClick = useCallback(async (nodeId: string) => {
        console.log('Expanding node:', nodeId);
        try {
            const data = await expandMutation.mutateAsync({ nodeId });
            console.log('Expansion result:', data);

            if (data.nodes && data.nodes.length > 0) {
                // Prepare nodes and links for atomic store update
                const newNodes: GraphNode[] = data.nodes.map(node => ({
                    id: node.id,
                    name: node.name,
                    type: node.type,
                    description: node.description,
                    properties: node.properties,
                    degree: node.degree
                }));

                const relationships = data.relationships || data.links || [];
                const newLinks: GraphLink[] = relationships.map(link => ({
                    source: link.source,
                    target: link.target,
                    type: link.type,
                    strength: link.strength
                }));

                console.log(`Adding ${newNodes.length} nodes and ${newLinks.length} relations to graph`);

                const { addNodesAndLinks } = useGraphStore.getState();
                addNodesAndLinks(newNodes, newLinks);
            } else {
                console.warn('Expansion returned no new nodes');
            }
        } catch (err) {
            console.error('Expansion failed:', err);
        }
    }, [expandMutation]);

    // Unified Click (Left or Right): Expand + Show Detail Sidebar
    const handleNodeAction = useCallback(async (nodeId: string, event?: any) => {
        // Prevent default browser context menu if it's a right click
        if (event?.preventDefault) event.preventDefault();
        if (event?.stopPropagation) event.stopPropagation();

        console.log('Node Action Triggered:', nodeId);

        // 1. Select the node
        selectNode(nodeId, false);

        // 2. Open Sidebar Detail
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setSelectedNodeForDetail(node);
            setShowNodeDetail(true);
        }

        // 3. Trigger Expansion (First layer)
        handleNodeDoubleClick(nodeId);
    }, [selectNode, nodes, handleNodeDoubleClick]);

    // Keep handleNodeClick for API compatibility with visualization components
    const handleNodeClick = handleNodeAction;
    const handleNodeRightClick = handleNodeAction;

    const handleNodeHover = useCallback((nodeId: string | null) => {
        setHoveredNode(nodeId);
    }, [setHoveredNode]);

    const handleBackgroundClick = useCallback(() => {
        clearSelection();
        setShowNodeDetail(false);
        setSelectedNodeForDetail(null);
    }, [clearSelection]);

    // CRUD Handlers
    const handleEditNode = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setEditingNode(node);
            setNodeEditorMode('edit');
            setShowNodeEditor(true);
        }
    }, [nodes]);

    const handleAddRelationship = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setRelationshipSourceNode(node);
            setShowRelationshipEditor(true);
        }
    }, [nodes]);

    const handleDeleteNode = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setDeleteTargetNode(node);
            setShowDeleteConfirm(true);
        }
    }, [nodes]);

    const handleNodeCreated = useCallback((newNode: any) => {
        const { addNode } = useGraphStore.getState();
        addNode({
            id: newNode.id,
            name: newNode.name,
            type: newNode.type,
            description: newNode.description,
            properties: newNode.properties || {},
            degree: 0,
        });
    }, []);

    const handleNodeUpdated = useCallback(() => {
        // Refresh graph data - could trigger a refetch
        console.log('Node updated, graph will refresh on next load');
    }, []);

    const handleRelationshipCreated = useCallback((relationship: any) => {
        const { addLink } = useGraphStore.getState();
        addLink({
            source: relationship.source_id,
            target: relationship.target_id,
            type: relationship.type,
            strength: relationship.strength,
        });
    }, []);

    const confirmDeleteNode = useCallback(async () => {
        if (!deleteTargetNode) return;
        // Use the base api client for node deletion
        await api.delete(`/graph/node/${deleteTargetNode.id}`);
        const { removeNode } = useGraphStore.getState();
        removeNode(deleteTargetNode.id);
    }, [deleteTargetNode]);

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
                    onStartTour={() => console.log('Tour started')}
                    onResetCamera={useGraphStore.getState().resetCamera}
                    onExport={() => {
                        const data = {
                            nodes: visibleNodes,
                            links: visibleLinks,
                            timestamp: new Date().toISOString()
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `neural-nexus-graph-${new Date().toISOString().slice(0, 10)}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }}
                    showFilters={showFilters}

                    hasExpandedNodes={useGraphStore.getState().expandedNodes.size > 0}
                    folderId={folderId}
                    nodeCount={visibleNodes.length}
                    linkCount={visibleLinks.length}
                    totalNodeCount={nodeCount}
                    totalLinkCount={linkCount}
                />
            )}

            {/* Search Bar */}
            <div className="absolute top-16 left-4 z-30 w-[360px]">
                <GraphSearch />
            </div>

            {/* Main Visualization Area */}
            <div className={`absolute inset-0 pt-14 transition-all duration-300 ease-in-out ${showFilters ? 'pl-[380px]' : 'pl-0'}`}>
                {isGraphLoading ? (
                    <GraphLoadingState message="Loading graph data..." />
                ) : !hasData ? (
                    <GraphEmptyState folderId={folderId} />
                ) : (
                    <GraphErrorBoundary>
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
                                            folderId={folderId}
                                            selectedNodes={selectedNodes}
                                            hoveredNode={hoveredNode}
                                            onNodeClick={handleNodeClick}
                                            onNodeDoubleClick={handleNodeDoubleClick}
                                            onNodeHover={handleNodeHover}
                                            onBackgroundClick={handleBackgroundClick}
                                            onNodeContextMenu={handleNodeRightClick}
                                        />
                                    </Suspense>
                                </motion.div>
                            ) : viewMode === '2d' ? (
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
                                            folderId={folderId}
                                            selectedNodes={selectedNodes}
                                            hoveredNode={hoveredNode}
                                            onNodeClick={handleNodeClick}
                                            onNodeDoubleClick={handleNodeDoubleClick}
                                            onNodeHover={handleNodeHover}
                                            onBackgroundClick={handleBackgroundClick}
                                            onNodeContextMenu={handleNodeRightClick}
                                        />
                                    </Suspense>

                                </motion.div>
                            ) : (
                                <motion.div
                                    key="charts"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="w-full h-full bg-background"
                                >
                                    <DataCanvas />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </GraphErrorBoundary>
                )}
            </div>



            {/* Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ x: -360, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -360, opacity: 0 }}
                        className="absolute left-4 top-32 bottom-4 w-[360px] z-20"
                    >
                        <GraphFilters onClose={() => setShowFilters(false)} />
                    </motion.div>
                )}
            </AnimatePresence>



            {/* Node Detail Panel removed - user prefers clean interface */}

            {/* Tooltip removed - user prefers clean interface without description box */}

            {/* Node Detail Sidebar */}
            <AnimatePresence>
                {showNodeDetail && selectedNodeForDetail && (
                    <NodeDetailPanel
                        node={selectedNodeForDetail}
                        onClose={() => {
                            setShowNodeDetail(false);
                            setSelectedNodeForDetail(null);
                        }}
                        onEdit={() => handleEditNode(selectedNodeForDetail.id)}
                        onDelete={() => handleDeleteNode(selectedNodeForDetail.id)}
                        onExpand={handleNodeDoubleClick}
                        onFocus={(id) => zoomToNode?.(id)}
                        onInitiateAnalysis={(node) => {
                            // Trigger deep analysis logic - this could open the analysis panel
                            console.log('Initiating analysis for node:', node.name);
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

            {/* CRUD Modals */}
            <NodeEditorModal
                isOpen={showNodeEditor}
                onClose={() => {
                    setShowNodeEditor(false);
                    setEditingNode(null);
                }}
                onSuccess={nodeEditorMode === 'create' ? handleNodeCreated : handleNodeUpdated}
                mode={nodeEditorMode}
                initialData={editingNode ? {
                    id: editingNode.id,
                    name: editingNode.name,
                    type: editingNode.type,
                    description: editingNode.description,
                    properties: editingNode.properties as Record<string, string>,
                } : undefined}
                folderId={folderId}
                fileId={fileId}
            />

            {relationshipSourceNode && (
                <RelationshipEditorModal
                    isOpen={showRelationshipEditor}
                    onClose={() => {
                        setShowRelationshipEditor(false);
                        setRelationshipSourceNode(null);
                    }}
                    onSuccess={handleRelationshipCreated}
                    sourceNode={relationshipSourceNode}
                    availableNodes={nodes}
                />
            )}

            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setDeleteTargetNode(null);
                }}
                onConfirm={confirmDeleteNode}
                title="Delete Entity"
                message={`Are you sure you want to delete "${deleteTargetNode?.name}"? This will also remove all relationships connected to this entity.`}
                itemName={deleteTargetNode?.name}
            />

            {/* AI Assistant Overlay */}
            <ChatAssistant />
        </div>

    );
}
