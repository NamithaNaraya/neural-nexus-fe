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
// Unified chat handles reasoning, discovery, and analytics
import { UnifiedChatPanel } from './panels/UnifiedChatPanel';
import { AlgorithmDrawer } from './panels/AlgorithmDrawer';
import { GraphViewMode } from './types';
import { useNodeExpansion, useShortestPath } from '@/hooks/useApi';
import { useDevice, useViewModeLock } from '@/hooks/useDevice';
import { useUIStore } from '@/store/uiStore';
import { Loader2, Maximize2, Minimize2, Zap, FolderTree, AlertTriangle } from 'lucide-react';
import { OnboardingOverlay, useOnboarding } from '@/components/onboarding';
import { NodeEditorModal, RelationshipEditorModal, DeleteConfirmModal } from './modals';
import { MergeNodesModal } from '@/components/shared/MergeNodesModal';
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

const NodeListView = dynamic(() => import('./list/NodeListView').then(m => ({ default: m.NodeListView })), {
    ssr: false,
    loading: () => <GraphLoadingState message="Initializing Registry..." />,
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-xl z-50">
            <div className="text-center group">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/40 transition-all duration-1000" />
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto relative z-10" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/80 animate-pulse">{message}</p>
            </div>
        </div>
    );
}

// Empty state component
function GraphEmptyState() {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent">
            <div className="text-center">
                <p className="text-sm text-muted-foreground/60 font-medium tracking-tight">
                    No graph data found in this scope.
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
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-md">
                    <div className="text-center p-12 glass-strong rounded-[2rem] border border-destructive/20 max-w-md shadow-2xl">
                        <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground uppercase tracking-tight mb-2">Protocol Failure</h3>
                        <p className="text-sm text-muted-foreground mb-6 font-medium italic">
                            {this.state.error?.message || "Dimensional rendering collapsed unexpectedly."}
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="px-8 py-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl hover:bg-destructive/20 transition-all font-bold text-[10px] uppercase tracking-widest"
                        >
                            REBOOT RENDERER
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}




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
    // State
    const [viewMode, setViewMode] = useState<GraphViewMode>(initialMode);
    const { isFullscreen, setFullscreen } = useUIStore();
    const [showFilters, setShowFilters] = useState(true);
    const [resetKey, setResetKey] = useState(0);
    const [lastGraphMode, setLastGraphMode] = useState<GraphViewMode>('2d');

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
    const [showMergeModal, setShowMergeModal] = useState(false);

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
        deselectNode,
        setHoveredNode,
        clearSelection,
        filteredNodes,
        filteredLinks,
        filters,
        zoomToNode,
        resetCamera,
        addToDiscovery,
        focusPruneOnNode,
        prePruneNodes,
        undoPrune,
        analyticSelectionActive,
        analyticIncludeNeighbors,
        nodeTypes,
    } = useGraphStore();

    // Get filtered data
    // 1. Create a stable filtered key for topology-affecting filters
    const filterTopologyKey = useMemo(() => {
        return JSON.stringify({
            nodeTypes: filters.nodeTypes,
            relationshipTypes: filters.relationshipTypes,
            fileIds: filters.fileIds,
            searchQuery: filters.searchQuery,
            minDegree: filters.minDegree,
            showOrphans: filters.showOrphans
        });
    }, [
        filters.nodeTypes,
        filters.relationshipTypes,
        filters.fileIds,
        filters.searchQuery,
        filters.minDegree,
        filters.showOrphans
    ]);

    // 2. Memoize visible nodes/links based on topology key
    const visibleNodes = useMemo(() => filteredNodes(), [filteredNodes, nodes, filterTopologyKey]);
    const visibleLinks = useMemo(() => filteredLinks(), [filteredLinks, links, filterTopologyKey]);

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
    const handleNodeExpand = useCallback(async (nodeId: string) => {
        console.log('Progressive Node Expansion:', nodeId);

        // Select the expanded node (highlight it + neighbors)
        const { selectNodeWithNeighbors } = useGraphStore.getState();
        selectNodeWithNeighbors(nodeId);

        try {
            const data = await expandMutation.mutateAsync({ nodeId });
            console.log('Expansion result:', data);

            if (data.nodes && data.nodes.length > 0) {
                // Prepare new nodes and links
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
                    strength: link.strength,
                    properties: link.properties
                }));

                console.log(`Adding ${newNodes.length} nodes and ${newLinks.length} relations to graph`);

                const { addNodesAndLinks, expandNode, addToDiscovery } = useGraphStore.getState();
                addNodesAndLinks(newNodes, newLinks);

                // Track expansion so we know which nodes were added from this expansion
                expandNode(nodeId, newNodes.map(n => n.id));

                // Add to discovery set so they stay visible
                addToDiscovery(newNodes.map(n => n.id));
                addToDiscovery(nodeId);
            } else {
                console.warn('Expansion returned no new nodes');
            }
        } catch (err) {
            console.error('Expansion failed:', err);
        }
    }, [expandMutation]);

    // Double-click: Focus prune — permanently remove all non-connected nodes
    const handleNodeDoubleClick = useCallback((nodeId: string) => {
        console.log('Focus prune on node:', nodeId);
        focusPruneOnNode(nodeId);
        selectNode(nodeId, false);
    }, [focusPruneOnNode, selectNode]);

    // Unified Click (Left or Right): Show Detail Sidebar
    const handleNodeClick = useCallback((nodeId: string, event?: any) => {
        // Prevent default browser context menu if it's a right click
        if (event?.preventDefault) event.preventDefault();
        if (event?.stopPropagation) event.stopPropagation();

        console.log('Node Click Triggered (Highlight):', nodeId);

        // 1. Select the node (Highlight)
        // Multi-select enabled if analyticSelectionActive is true OR shift/ctrl/meta is held
        const isMulti = analyticSelectionActive || event?.shiftKey || event?.ctrlKey || event?.metaKey;

        // AUTO-NEIGHBOR LOGIC: If in analytics mode
        if (analyticSelectionActive) {
            // ALWAYS select node + neighbors (Chained Expansion)
            // Even if already selected, we want to ensure its neighbors are also included
            const { selectNodeWithNeighbors } = useGraphStore.getState();
            selectNodeWithNeighbors(nodeId);
        } else {
            // Default behavior: just toggle this node
            selectNode(nodeId, isMulti);
        }

        // 2. Open Sidebar Detail
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setSelectedNodeForDetail(node);
            setShowNodeDetail(true);

            // Discovery: Always mark this node as discovered so it stays visible
            addToDiscovery(nodeId);
        }
    }, [selectNode, nodes, addToDiscovery, analyticSelectionActive, selectedNodes, links]);

    const handleNodeRightClick = handleNodeClick;

    const handleNodeHover = useCallback((nodeId: string | null) => {
        setHoveredNode(nodeId);
    }, [setHoveredNode]);

    const handleNodeFocus = useCallback((nodeId: string) => {
        // Switch to last active graph view
        setViewMode(lastGraphMode);

        // Show details
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setSelectedNodeForDetail(node);
            setShowNodeDetail(true);
            selectNode(nodeId, false);

            // Allow state to settle, then zoom
            setTimeout(() => {
                zoomToNode?.(nodeId);
            }, 100);
        }
    }, [lastGraphMode, nodes, zoomToNode, selectNode]);

    const handleViewModeChange = useCallback((mode: GraphViewMode) => {
        // Record graph modes so we can return to them from List/Charts
        if (viewMode === '2d' || viewMode === '3d') {
            setLastGraphMode(viewMode);
        }
        setViewMode(mode);
    }, [viewMode]);

    const handleBackgroundClick = useCallback(() => {
        clearSelection();
        setShowNodeDetail(false);
        setSelectedNodeForDetail(null);
    }, [clearSelection]);

    // CRUD Handlers
    const handleCreateNode = useCallback(() => {
        setEditingNode(null);
        setNodeEditorMode('create');
        setShowNodeEditor(true);
    }, []);

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
        const { addNode, selectNode: storeSelectNode } = useGraphStore.getState();
        const nodeToAdd = {
            id: newNode.id,
            name: newNode.name,
            type: newNode.type,
            description: newNode.description || '',
            properties: newNode.properties || {},
            degree: 0,
        };
        addNode(nodeToAdd);
        // Select and show the new node immediately
        storeSelectNode(newNode.id);
        setSelectedNodeForDetail(nodeToAdd as GraphNode);
        setShowNodeDetail(true);
    }, []);

    const handleNodeUpdated = useCallback((node: any) => {
        const { updateNode } = useGraphStore.getState();
        updateNode(node.id, node);
        setShowNodeEditor(false);
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
        try {
            await api.delete(`/graph/nodes/${deleteTargetNode.id}`);
            const { removeNode } = useGraphStore.getState();
            removeNode(deleteTargetNode.id);
            setShowDeleteConfirm(false);
            setDeleteTargetNode(null);
            setShowNodeDetail(false);
            setSelectedNodeForDetail(null);
        } catch (err) {
            console.error('Delete node failed:', err);
        }
    }, [deleteTargetNode]);

    const toggleImmersive = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setFullscreen(true);
        } else {
            document.exitFullscreen();
            setFullscreen(false);
        }
    }, [setFullscreen]);

    // Listen for escape key or other ways fullscreen exits
    useEffect(() => {
        const handleFullscreenChange = () => {
            setFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [setFullscreen]);

    const handleResetView = useCallback(() => {
        console.log('Resetting view...');
        // 1. Reset store camera
        useGraphStore.getState().resetCamera();
        // 2. Clear selection
        clearSelection();
        // 3. Increment reset key to trigger component-level resets
        setResetKey(prev => prev + 1);
    }, [clearSelection]);


    // Container classes
    const containerClasses = useMemo(() => {
        const base = 'relative bg-background overflow-hidden flex flex-col';
        const immersive = isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-full';
        return `${base} ${immersive} ${className}`;
    }, [isFullscreen, className]);

    // Focus/Neighborhood Statistics Calculation
    const focusData = useMemo(() => {
        if (selectedNodes.length === 0) return { nodes: new Set<string>(), links: new Set<string>() };

        // Logic mirrors ForceGraph2D's Property-Aware BFS to ensure stats match visuals
        const seeds = [...selectedNodes];
        const neighbors = new Set<string>(seeds);
        const focusLinkKeys = new Set<string>();

        // 1. Identify "Origin Herb" context
        let originHerbName = '';
        const getNodeType = (n: GraphNode) => n.type || 'Entity';

        const selectedHerbs = selectedNodes
            .map(id => nodes.find(n => n.id === id))
            .filter(n => n && getNodeType(n) === 'Herb');

        if (selectedHerbs.length === 1 && selectedHerbs[0]) {
            originHerbName = selectedHerbs[0].name;
        }

        // 2. Multi-Hop BFS
        let currentLevel = [...seeds];
        const MAX_HOPS = 3;

        for (let hop = 0; hop < MAX_HOPS; hop++) {
            const nextLevel: string[] = [];

            visibleLinks.forEach(link => {
                const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
                const t = typeof link.target === 'object' ? (link.target as any).id : link.target;

                if (!s || !t) return;

                const linkType = (link.type || '').toUpperCase().replace(/[\s-]/g, '_');

                // Intelligent Filtering (matching ForceGraph2D)
                if (originHerbName) {
                    // Don't follow HAS_PROPERTY outwards from Properties to other Herbs
                    if (hop > 0 && linkType === 'HAS_PROPERTY') {
                        return;
                    }

                    // Strict HAS_QUALITY filtering
                    if (linkType === 'HAS_QUALITY') {
                        const herbProp = (link.properties?.herb as string || '').trim();
                        // If link has specific herb context, it MUST match origin
                        if (herbProp) {
                            const v = herbProp.toLowerCase();
                            const o = originHerbName.toLowerCase();
                            if (!(v === o || o.includes(v) || v.includes(o))) {
                                return;
                            }
                        } else {
                            // If no herb prop on HAS_QUALITY, ForceGraph2D usually skips in strict mode
                            // We'll skip to be safe/conservative
                            return;
                        }
                    }
                }

                // Forward traversal
                if (currentLevel.includes(s)) {
                    focusLinkKeys.add(`${s}-${t}-${link.type}`);
                    if (!neighbors.has(t)) {
                        neighbors.add(t);
                        nextLevel.push(t);
                    }
                }

                // Backwards traversal (only on first hop to catch incoming)
                if (hop === 0 && currentLevel.includes(t)) {
                    focusLinkKeys.add(`${s}-${t}-${link.type}`);
                    if (!neighbors.has(s)) {
                        neighbors.add(s);
                        nextLevel.push(s);
                    }
                }
            });

            currentLevel = nextLevel;
            if (currentLevel.length === 0) break;
        }

        return {
            nodes: neighbors,
            links: focusLinkKeys
        };
    }, [selectedNodes, visibleLinks, nodes]);

    return (
        <div className={containerClasses}>
            {/* Toolbar */}
            {showToolbar && (
                <GraphToolbar
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    isImmersive={isFullscreen}
                    onToggleImmersive={toggleImmersive}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    onResetCamera={handleResetView}
                    showFilters={showFilters}
                    folderId={folderId}
                    nodeCount={visibleNodes.length}
                    linkCount={visibleLinks.length}
                    totalNodeCount={nodes.length}
                    totalLinkCount={links.length}
                    selectedCount={selectedNodes.length}
                    focusNodeIds={focusData.nodes}
                    focusLinkIds={focusData.links}
                    isSidebarOpen={showNodeDetail}
                    onCreateNode={handleCreateNode}
                    onMerge={() => setShowMergeModal(true)}
                />
            )}

            {/* Prune Focus Mode Indicator */}
            {prePruneNodes && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 rounded-full bg-amber-500/90 backdrop-blur-md text-white shadow-lg border border-amber-400/50"
                >
                    <span className="text-xs font-bold uppercase tracking-wider">✄ Focus Prune Active:</span>
                    <span className="text-sm font-semibold">{nodes.length} nodes visible</span>
                    <button
                        onClick={undoPrune}
                        className="ml-2 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors"
                    >
                        Restore Full Graph
                    </button>
                </motion.div>
            )}

            {/* Main Graph Content Area */}
            <div className="flex-1 relative min-h-0 flex flex-col">
                {isGraphLoading ? (
                    <GraphLoadingState message="Processing neural pathways..." />
                ) : !hasData ? (
                    <GraphEmptyState />
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
                                            resetKey={resetKey}
                                            analyticSelectionActive={useGraphStore.getState().analyticSelectionActive}
                                            analyticIncludeNeighbors={useGraphStore.getState().analyticIncludeNeighbors}
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
                                            resetKey={resetKey}
                                            analyticSelectionActive={useGraphStore.getState().analyticSelectionActive}
                                            analyticIncludeNeighbors={useGraphStore.getState().analyticIncludeNeighbors}
                                        />
                                    </Suspense>

                                </motion.div>
                            ) : viewMode === 'charts' ? (
                                <motion.div
                                    key="charts"
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: 1,
                                        paddingLeft: showFilters ? 400 : 0
                                    }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="flex-1 min-h-0 w-full bg-background flex flex-col"
                                >
                                    <DataCanvas />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="list"
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: 1,
                                        paddingLeft: showFilters ? 400 : 0
                                    }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="flex-1 min-h-0 w-full flex flex-col"
                                >
                                    <NodeListView
                                        nodes={visibleNodes}
                                        selectedNodes={selectedNodes}
                                        onNodeClick={handleNodeClick}
                                        onNodeDoubleClick={handleNodeDoubleClick}
                                        onNodeHover={handleNodeHover}
                                        onNodeFocus={handleNodeFocus}
                                        analyticSelectionActive={useGraphStore.getState().analyticSelectionActive}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </GraphErrorBoundary>
                )}
            </div>

            {/* Floating Tools UI Layer - Unified Left Alignment */}
            <div className="absolute inset-0 pointer-events-none z-[100]">
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ x: -400, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -400, opacity: 0 }}
                            className="absolute left-6 top-24 bottom-6 w-[360px] pointer-events-auto flex flex-col gap-4"
                        >
                            {/* Search Bar - Now inside the filter visibility container */}
                            <GraphSearch />

                            {/* Filters Panel */}
                            <div className="flex-1 min-h-0">
                                <GraphFilters onClose={() => setShowFilters(false)} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            {/* Node Detail Sidebar - Primary left panel when active */}
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
                        onExpand={handleNodeExpand}
                        onFocus={(id) => zoomToNode?.(id)}
                        onCreateNode={handleCreateNode}
                        onInitiateAnalysis={(node) => {
                            console.log('Initiating analysis for node:', node.name);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Mobile 2D Lock Warning */}
            {
                isLocked && lockReason && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg flex items-center gap-2"
                    >
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-amber-500">{lockReason}</span>
                    </motion.div>
                )
            }

            {/* Immersive Mode Toggle Button (when in immersive) */}
            {
                isFullscreen && (
                    <button
                        onClick={toggleImmersive}
                        className="absolute top-4 right-4 z-50 p-2 bg-background/80 backdrop-blur-sm rounded-lg border border-border hover:bg-muted transition-colors"
                        title="Exit Immersive Mode"
                    >
                        <Minimize2 className="w-5 h-5 text-foreground" />
                    </button>
                )
            }

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
                graphNodeTypes={nodeTypes}
            />

            {
                relationshipSourceNode && (
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
                )
            }

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

            {
                showMergeModal && (
                    <MergeNodesModal
                        nodes={nodes.filter(n => selectedNodes.includes(n.id))}
                        onClose={() => setShowMergeModal(false)}
                        onSuccess={() => {
                            clearSelection();
                            // Query invalidation handled inside modal
                        }}
                    />
                )
            }

            {/* Unified AI Assistant Overlays */}
            <div className="z-[150] pointer-events-none fixed inset-0">
                <UnifiedChatPanel />
            </div>
        </div >

    );
}
