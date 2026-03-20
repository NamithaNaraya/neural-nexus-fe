/**
 * Graph Store
 * 
 * Manages graph visualization state including:
 * - Nodes and links data
 * - Selection state
 * - Filtering and search
 * - Camera position
 * - Layout settings
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { graphApi } from '@/lib/api';

// === Type Definitions ===

export interface GraphNode {
    id: string;
    name: string;
    type: string;
    description?: string;
    properties?: Record<string, unknown> & {
        conflicts?: Record<string, Array<{ value: unknown; source: string }>>;
    };
    fileId?: string;
    folderId?: string;

    // Visual properties (computed by layout)
    x?: number;
    y?: number;
    z?: number;
    color?: string;
    size?: number;

    // Metadata
    degree?: number;
    centrality?: number;
    cluster?: number;
}

export interface GraphLink {
    id?: string; // Neo4j internal ID or UUID
    source: string;
    target: string;
    type: string;
    strength?: number;
    description?: string;
    properties?: Record<string, unknown>;

    // Visual properties
    color?: string;
    width?: number;
}

export interface CameraPosition {
    x: number;
    y: number;
    z: number;
    lookAt?: { x: number; y: number; z: number };
}

export interface FilterConfig {
    nodeTypes: string[];
    relationshipTypes: string[];
    minDegree: number;
    searchQuery: string;
    fileIds: string[];
    showOrphans: boolean;
    customNodeTypeColors: Record<string, string>;
    customRelationshipColors: Record<string, string>;
}

// === Store State ===

interface GraphState {
    // Data
    nodes: GraphNode[];
    links: GraphLink[];
    setGraphData: (nodes: GraphNode[], links: GraphLink[]) => void;
    clearGraph: () => void;

    // Selection
    selectedNodes: string[];
    hoveredNode: string | null;
    selectNode: (id: string, multi?: boolean) => void;
    deselectNode: (id: string) => void;
    clearSelection: () => void;
    setSelectedNodes: (ids: string[]) => void;
    setHoveredNode: (id: string | null) => void;
    selectNodeWithNeighbors: (id: string) => void;

    // Expanded Nodes (Double-click expansion tracking)
    expandedNodes: Set<string>;
    expandNode: (id: string, childIds: string[]) => void;
    collapseNode: (id: string) => void;
    isNodeExpanded: (id: string) => boolean;
    getExpandedChildIds: (id: string) => string[];
    expandedChildren: Map<string, string[]>;

    // Visual Anchoring (Camera zoom to node)
    targetNode: string | null;
    zoomToNode: (nodeId: string) => void;
    setCameraFocus: (nodeId: string) => void;
    clearZoomTarget: () => void;

    // Filtering
    filters: FilterConfig;
    setFilters: (filters: Partial<FilterConfig>) => void;
    resetFilters: () => void;
    removePredictedLinks: () => void;
    filteredNodes: () => GraphNode[];
    filteredLinks: () => GraphLink[];

    // Search
    searchResults: GraphNode[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;

    // Camera
    cameraPosition: CameraPosition;
    setCameraPosition: (position: CameraPosition) => void;
    resetCamera: () => void;

    // Active Context (current folder/file)
    activeFolderId: string | null;
    activeFileId: string | null;
    setActiveFolder: (folderId: string | null) => void;
    setActiveFile: (fileId: string | null) => void;

    // Graph Statistics
    nodeCount: number;
    linkCount: number;
    nodeTypes: string[];
    linkTypes: string[];

    // CRUD Operations
    addNode: (node: GraphNode) => void;
    updateNode: (id: string, updates: Partial<GraphNode>) => void;
    removeNode: (id: string) => void;
    addLink: (link: GraphLink) => void;
    updateLink: (id: string, updates: Partial<GraphLink>) => void;
    addNodesAndLinks: (nodes: GraphNode[], links: GraphLink[]) => void;
    removeLink: (source: string, target: string) => void;
    renameRelationshipTypeLocally: (oldType: string, newType: string, scope?: { folderId?: string, fileId?: string }) => void;

    // Layout
    layoutComplete: boolean;
    setLayoutComplete: (complete: boolean) => void;

    // Loading
    isGraphLoading: boolean;
    setGraphLoading: (loading: boolean) => void;

    // Discovery Mode (Incremental exploration)
    discoveredNodeIds: Set<string>;
    addToDiscovery: (ids: string | string[]) => void;
    removeFromDiscovery: (id: string) => void;
    clearDiscovery: () => void;

    // Isolation / Prune Focus
    prePruneNodes: GraphNode[] | null;
    prePruneLinks: GraphLink[] | null;
    focusPruneOnNode: (nodeId: string) => void;
    undoPrune: () => void;

    // Analytics Selection Flow
    analyticSelectionActive: boolean;
    setAnalyticSelectionActive: (active: boolean) => void;
    analyticIncludeNeighbors: boolean;
    setAnalyticIncludeNeighbors: (include: boolean) => void;

    // Traversal (Path) Mode
    traversalModeActive: boolean;
    setTraversalModeActive: (active: boolean) => void;
    traversalPath: string[];
    traverseToNode: (nodeId: string) => void;
    traverseBack: () => void;       // go one step back in the path
    resetTraversal: () => void;     // clear memory, stay in traversal mode

    // Custom Coloring
    setNodeTypeColor: (type: string, color: string) => void;
    setRelationshipTypeColor: (type: string, color: string) => void;
    getNodeColor: (type: string) => string;
    getRelationshipColor: (type: string) => string;

    // Smart loading for large graphs
    loadAllNodes: boolean;
    setLoadAllNodes: (loadAll: boolean) => void;
    totalNodesOnServer: number;
    totalLinksOnServer: number;

    fetchGraph: (folderId?: string | null, fileId?: string | null) => Promise<void>;
}

// Default filter configuration
const defaultFilters: FilterConfig = {
    nodeTypes: [],
    relationshipTypes: [],
    minDegree: 0,
    searchQuery: '',
    fileIds: [],
    showOrphans: true,
    customNodeTypeColors: {},
    customRelationshipColors: {},
};

// Default camera position
const defaultCameraPosition: CameraPosition = {
    x: 0,
    y: 0,
    z: 500,
    lookAt: { x: 0, y: 0, z: 0 },
};

export const useGraphStore = create<GraphState>()(
    subscribeWithSelector((set, get) => ({
        // Data
        nodes: [],
        links: [],
        setGraphData: (nodes, links) => {
            const nodeTypes = Array.from(new Set(nodes.map((n) => n.type)));
            const linkTypes = Array.from(new Set(links.map((l) => l.type)));

            set({
                nodes,
                links,
                nodeCount: nodes.length,
                linkCount: links.length,
                nodeTypes,
                linkTypes,
                layoutComplete: false,
            });
        },
        clearGraph: () => set({
            nodes: [],
            links: [],
            selectedNodes: [],
            hoveredNode: null,
            nodeCount: 0,
            linkCount: 0,
            nodeTypes: [],
            linkTypes: [],
            layoutComplete: false,
            discoveredNodeIds: new Set(),
            expandedNodes: new Set(),
            expandedChildren: new Map(),
            targetNode: null,
            traversalModeActive: false,
            traversalPath: [],
        }),

        // Selection
        selectedNodes: [],
        hoveredNode: null,
        selectNode: (id, multi = false) => {
            set((state) => {
                if (multi) {
                    // Toggle selection in multi-select mode
                    const isSelected = state.selectedNodes.includes(id);
                    return {
                        selectedNodes: isSelected
                            ? state.selectedNodes.filter((n) => n !== id)
                            : [...state.selectedNodes, id],
                    };
                }
                // Single select mode
                return { selectedNodes: [id] };
            });
        },
        deselectNode: (id) => set((state) => ({
            selectedNodes: state.selectedNodes.filter((n) => n !== id),
        })),
        clearSelection: () => set({ selectedNodes: [] }),
        setSelectedNodes: (ids) => set({ selectedNodes: ids }),
        setHoveredNode: (id) => set({ hoveredNode: id }),
        selectNodeWithNeighbors: (id) => {
            set((state) => {
                const neighborIds = new Set<string>();
                neighborIds.add(id);

                // Find immediate neighbors from the links array
                state.links.forEach(link => {
                    const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const t = typeof link.target === 'object' ? (link.target as any).id : link.target;

                    if (s === id) neighborIds.add(t);
                    if (t === id) neighborIds.add(s);
                });

                const currentSelection = new Set(state.selectedNodes);
                neighborIds.forEach(nid => currentSelection.add(nid));

                return { selectedNodes: Array.from(currentSelection) };
            });
        },

        // Isolation / Prune Focus
        prePruneNodes: null,
        prePruneLinks: null,
        undoPrune: () => set((state) => {
            if (!state.prePruneNodes || !state.prePruneLinks) return state; // Nothing to restore

            return {
                nodes: state.prePruneNodes,
                links: state.prePruneLinks,
                nodeCount: state.prePruneNodes.length,
                linkCount: state.prePruneLinks.length,
                nodeTypes: Array.from(new Set(state.prePruneNodes.map(n => n.type))),
                linkTypes: Array.from(new Set(state.prePruneLinks.map(l => l.type))),
                prePruneNodes: null, // Clear backup
                prePruneLinks: null
            };
        }),

        // Focus Prune: permanently remove non-connected nodes from graph
        focusPruneOnNode: (nodeId) => set((state) => {
            const neighbors = new Set<string>();
            neighbors.add(nodeId);

            // Find all immediate neighbors
            state.links.forEach(link => {
                const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                if (sourceId === nodeId) neighbors.add(targetId);
                if (targetId === nodeId) neighbors.add(sourceId);
            });

            const prunedNodes = state.nodes.filter(n => neighbors.has(n.id));
            const prunedLinks = state.links.filter(l => {
                const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
                const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
                return neighbors.has(s) && neighbors.has(t);
            });

            return {
                nodes: prunedNodes,
                links: prunedLinks,
                nodeCount: prunedNodes.length,
                linkCount: prunedLinks.length,
                nodeTypes: Array.from(new Set(prunedNodes.map(n => n.type))),
                linkTypes: Array.from(new Set(prunedLinks.map(l => l.type))),
                selectedNodes: state.selectedNodes.filter(id => neighbors.has(id)),

                // Back up the original state if we haven't already (allows consecutive prunes without losing original graph)
                prePruneNodes: state.prePruneNodes || state.nodes,
                prePruneLinks: state.prePruneLinks || state.links,
            };
        }),

        // Expanded Nodes (Double-click expansion tracking)
        expandedNodes: new Set<string>(),
        expandedChildren: new Map<string, string[]>(),
        expandNode: (id, childIds) => set((state) => {
            const newExpanded = new Set(state.expandedNodes);
            newExpanded.add(id);
            const newChildren = new Map(state.expandedChildren);
            newChildren.set(id, childIds);
            return {
                expandedNodes: newExpanded,
                expandedChildren: newChildren,
            };
        }),
        collapseNode: (id) => set((state) => {
            const newExpanded = new Set(state.expandedNodes);
            newExpanded.delete(id);
            const childIds = state.expandedChildren.get(id) || [];
            const newChildren = new Map(state.expandedChildren);
            newChildren.delete(id);
            // Remove the child nodes from the graph
            const childIdsSet = new Set(childIds);
            return {
                expandedNodes: newExpanded,
                expandedChildren: newChildren,
                nodes: state.nodes.filter(n => !childIdsSet.has(n.id)),
                links: state.links.filter(l => !childIdsSet.has(l.source) && !childIdsSet.has(l.target)),
            };
        }),
        isNodeExpanded: (id) => get().expandedNodes.has(id),
        getExpandedChildIds: (id) => get().expandedChildren.get(id) || [],

        // Visual Anchoring (Camera zoom to node)
        targetNode: null,
        zoomToNode: (nodeId) => {
            const { nodes, links } = get();
            const node = nodes.find(n => n.id === nodeId);

            if (node && node.x !== undefined && node.y !== undefined) {
                // Find immediate neighbors (1st layer)
                const neighborIds = new Set<string>();
                neighborIds.add(nodeId);

                links.forEach(link => {
                    const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const t = typeof link.target === 'object' ? (link.target as any).id : link.target;

                    if (s === nodeId) neighborIds.add(t);
                    if (t === nodeId) neighborIds.add(s);
                });

                // Set target node for camera animation and select neighbors
                set({
                    targetNode: nodeId,
                    selectedNodes: Array.from(neighborIds),
                    cameraPosition: {
                        x: node.x,
                        y: node.y,
                        z: (node.z ?? 0) + 150, // Zoom in close
                        lookAt: { x: node.x, y: node.y, z: node.z ?? 0 },
                    },
                });
            }
        },
        setCameraFocus: (nodeId) => {
            get().zoomToNode(nodeId);
        },
        clearZoomTarget: () => set({ targetNode: null }),

        // Filtering
        filters: defaultFilters,
        setFilters: (newFilters) => set((state) => ({
            filters: { ...state.filters, ...newFilters },
        })),
        resetFilters: () => {
            // Also remove predicted links when resetting filters
            const state = get();
            const cleanLinks = state.links.filter(l => !l.properties?.isPredicted);
            set({
                filters: defaultFilters,
                links: cleanLinks,
                linkCount: cleanLinks.length,
                linkTypes: Array.from(new Set(cleanLinks.map(l => l.type))),
            });
        },

        removePredictedLinks: () => set((state) => {
            const cleanLinks = state.links.filter(l => !l.properties?.isPredicted);
            return {
                links: cleanLinks,
                linkCount: cleanLinks.length,
                linkTypes: Array.from(new Set(cleanLinks.map(l => l.type))),
            };
        }),

        // Computed filtered data
        filteredNodes: () => {
            const { nodes, links, filters, discoveredNodeIds } = get();

            // 1. Identify Candidate Nodes (Attribute Filters)
            const candidateNodes = nodes.filter((node) => {
                // Filter by node type
                if (filters.nodeTypes.length > 0 && !filters.nodeTypes.includes(node.type)) {
                    return false;
                }

                // Filter by file IDs
                if (filters.fileIds.length > 0 && node.fileId && !filters.fileIds.includes(node.fileId)) {
                    return false;
                }

                // Filter by search query (if exists)
                if (filters.searchQuery) {
                    const query = filters.searchQuery.toLowerCase();
                    const matchesName = node.name.toLowerCase().includes(query);
                    const matchesType = node.type.toLowerCase().includes(query);
                    const matchesDesc = node.description?.toLowerCase().includes(query);
                    if (!matchesName && !matchesType && !matchesDesc) {
                        return false;
                    }
                }

                return true;
            });

            // 2. Identify Candidate Links (to calculate dynamic degree)
            // We need to know which links are "active" to determine if a node is an orphan in the current view
            const candidateNodeIds = new Set(candidateNodes.map(n => n.id));

            // Calculate dynamic degrees based on filtered links
            const dynamicDegrees = new Map<string, number>();
            candidateNodes.forEach(n => dynamicDegrees.set(n.id, 0));

            links.forEach(link => {
                const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;

                // Check Link Type Filter
                if (filters.relationshipTypes.length > 0 && !filters.relationshipTypes.includes(link.type)) {
                    return;
                }

                // Check endpoints existence in candidate nodes
                if (candidateNodeIds.has(sourceId) && candidateNodeIds.has(targetId)) {
                    dynamicDegrees.set(sourceId, (dynamicDegrees.get(sourceId) || 0) + 1);
                    dynamicDegrees.set(targetId, (dynamicDegrees.get(targetId) || 0) + 1);
                }
            });

            // 3. Apply Topological Filters (Orphans, Min Degree) using Dynamic Degree
            return candidateNodes.filter(node => {
                const degree = dynamicDegrees.get(node.id) || 0;

                // --- TRAVERSAL MODE LOGIC ---
                // If Traversal Mode is active and we have started traversing (discoveredNodeIds > 0),
                // THEN ONLY show nodes that have been discovered/traversed.
                if (get().traversalModeActive && discoveredNodeIds.size > 0) {
                    if (!discoveredNodeIds.has(node.id)) {
                        return false;
                    }
                }

                // Filter by orphan status (Hide Isolated Nodes)
                // If "Hide Isolated Nodes" is ON (!showOrphans), remove nodes with 0 visible connections
                // This takes precedence over discovery to ensure the user's filter is respected
                if (!filters.showOrphans && degree === 0 && !get().traversalModeActive) { // don't hide orphans in traversal mode if they are discovered
                    return false;
                }

                // DISCOVERY OVERRIDE: Keep discovered nodes visible regardless of minDegree
                if (discoveredNodeIds.has(node.id)) {
                    return true;
                }

                // Filter by minimum degree
                if (filters.minDegree > 0 && degree < filters.minDegree) {
                    return false;
                }

                return true;
            });
        },

        filteredLinks: () => {
            const { links, filters } = get();
            const filteredNodesList = get().filteredNodes();
            const filteredNodeIds = new Set(filteredNodesList.map((n) => n.id));

            return links.filter((link) => {
                const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;

                // Both source and target must be in filtered nodes
                if (!filteredNodeIds.has(sourceId) || !filteredNodeIds.has(targetId)) {
                    return false;
                }

                // Filter by relationship type
                if (filters.relationshipTypes.length > 0 && !filters.relationshipTypes.includes(link.type)) {
                    return false;
                }

                return true;
            });
        },

        // Search
        searchResults: [],
        searchQuery: '',
        setSearchQuery: (query) => {
            const nodes = get().nodes;
            const lowerQuery = query.toLowerCase();

            const results = query
                ? nodes.filter((node) =>
                    node.name.toLowerCase().includes(lowerQuery) ||
                    node.type.toLowerCase().includes(lowerQuery) ||
                    node.description?.toLowerCase().includes(lowerQuery)
                ).slice(0, 20)
                : [];

            set({ searchQuery: query, searchResults: results });
        },

        // Camera
        cameraPosition: defaultCameraPosition,
        setCameraPosition: (position) => set({ cameraPosition: position }),
        resetCamera: () => set({ cameraPosition: defaultCameraPosition }),

        // Active Context
        activeFolderId: null,
        activeFileId: null,
        setActiveFolder: (folderId) => set({
            activeFolderId: folderId,
            activeFileId: null, // Clear file when folder changes
        }),
        setActiveFile: (fileId) => set({ activeFileId: fileId }),

        // Statistics
        nodeCount: 0,
        linkCount: 0,
        nodeTypes: [],
        linkTypes: [],

        // CRUD Operations
        addNode: (node) => set((state) => {
            const exists = state.nodes.some((n) => n.id === node.id);
            if (exists) return state;

            return {
                nodes: [...state.nodes, node],
                nodeCount: state.nodeCount + 1,
                nodeTypes: Array.from(new Set([...state.nodeTypes, node.type])),
            };
        }),

        // Atomic addition of multiple nodes and links
        addNodesAndLinks: (newNodes, newLinks) => set((state) => {
            const existingNodeIds = new Set(state.nodes.map(n => n.id));
            const existingLinkKeys = new Set(state.links.map(l => `${l.source}-${l.target}-${l.type}`));

            const nodesToAdd = newNodes.filter(n => !existingNodeIds.has(n.id));
            const linksToAdd = newLinks.filter(l => !existingLinkKeys.has(`${l.source}-${l.target}-${l.type}`));

            if (nodesToAdd.length === 0 && linksToAdd.length === 0) return state;

            const updatedNodes = [...state.nodes, ...nodesToAdd];
            const updatedLinks = [...state.links, ...linksToAdd];

            return {
                nodes: updatedNodes,
                links: updatedLinks,
                nodeCount: updatedNodes.length,
                linkCount: updatedLinks.length,
                nodeTypes: Array.from(new Set(updatedNodes.map(n => n.type))),
                linkTypes: Array.from(new Set(updatedLinks.map(l => l.type))),
            };
        }),

        updateNode: (id, updates) => set((state) => ({
            nodes: state.nodes.map((n) =>
                n.id === id ? { ...n, ...updates } : n
            ),
        })),

        removeNode: (id) => set((state) => ({
            nodes: state.nodes.filter((n) => n.id !== id),
            links: state.links.filter((l) => l.source !== id && l.target !== id),
            selectedNodes: state.selectedNodes.filter((n) => n !== id),
            nodeCount: state.nodeCount - 1,
        })),

        addLink: (link) => set((state) => {
            const exists = state.links.some(
                (l) => l.source === link.source && l.target === link.target
            );
            if (exists) return state;

            return {
                links: [...state.links, link],
                linkCount: state.linkCount + 1,
                linkTypes: Array.from(new Set([...state.linkTypes, link.type])),
            };
        }),
        updateLink: (id, updates) => set((state) => ({
            links: state.links.map((l) =>
                l.id === id ? { ...l, ...updates } : l
            ),
        })),
        renameRelationshipTypeLocally: (oldType, newType, scope) => set((state) => {
            const updatedLinks = state.links.map(link => {
                const matchesOldType = link.type === oldType;
                if (!matchesOldType) return link;

                // Apply scope filtering if provided
                if (scope?.folderId) {
                    const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const sourceNode = state.nodes.find(n => n.id === sId);
                    if (sourceNode?.folderId !== scope.folderId) return link;
                }
                if (scope?.fileId) {
                    const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const sourceNode = state.nodes.find(n => n.id === sId);
                    if (sourceNode?.fileId !== scope.fileId) return link;
                }

                return { ...link, type: newType };
            });

            return {
                links: updatedLinks,
                linkTypes: Array.from(new Set(updatedLinks.map(l => l.type)))
            };
        }),

        removeLink: (source, target) => set((state) => ({
            links: state.links.filter(
                (l) => !(l.source === source && l.target === target)
            ),
            linkCount: state.linkCount - 1,
        })),

        // Layout
        layoutComplete: false,
        setLayoutComplete: (complete) => set({ layoutComplete: complete }),

        // Loading
        isGraphLoading: false,
        setGraphLoading: (loading) => set({ isGraphLoading: loading }),

        // Discovery Mode
        discoveredNodeIds: new Set<string>(),
        addToDiscovery: (ids) => set((state) => {
            const newDiscovered = new Set(state.discoveredNodeIds);
            if (Array.isArray(ids)) {
                ids.forEach(id => newDiscovered.add(id));
            } else {
                newDiscovered.add(ids);
            }
            return { discoveredNodeIds: newDiscovered };
        }),
        removeFromDiscovery: (id) => set((state) => {
            const newDiscovered = new Set(state.discoveredNodeIds);
            newDiscovered.delete(id);
            return { discoveredNodeIds: newDiscovered };
        }),
        clearDiscovery: () => set({ discoveredNodeIds: new Set() }),

        // Navigation / Path Traversal Mode
        traversalModeActive: false,
        traversalPath: [],
        setTraversalModeActive: (active) => set({ 
            traversalModeActive: active,
            // When toggling on, reset discovery so next click sets the root path
            traversalPath: [],
            discoveredNodeIds: active ? new Set() : get().discoveredNodeIds
        }),
        traverseToNode: (nodeId) => set((state) => {
            let newPath = [...state.traversalPath];
            const pathIndex = newPath.indexOf(nodeId);

            if (pathIndex !== -1) {
                // ── Reverse traversal: clicked a node already on the path ──
                // Truncate path back to that node, drop everything after it
                newPath = newPath.slice(0, pathIndex + 1);
            } else {
                const lastNode = newPath.length > 0 ? newPath[newPath.length - 1] : null;

                // Is the clicked node a direct neighbor of the current tip?
                let isNeighborOfTip = false;
                if (lastNode) {
                    state.links.forEach((link: any) => {
                        const s = typeof link.source === 'object' ? link.source.id : link.source;
                        const t = typeof link.target === 'object' ? link.target.id : link.target;
                        if ((s === lastNode && t === nodeId) || (t === lastNode && s === nodeId)) {
                            isNeighborOfTip = true;
                        }
                    });
                }

                if (isNeighborOfTip) {
                    // ── Forward traversal: extend the path ──
                    // The user chose this neighbor — all sibling neighbors of the PREVIOUS tip
                    // will be dropped because they are no longer in the path or the frontier.
                    newPath.push(nodeId);
                } else {
                    // ── New root: start a fresh path ──
                    newPath = [nodeId];
                }
            }

            // ── Build discoveredNodeIds ──
            // Rule: only the path nodes + the CURRENT TIP's direct neighbors are visible.
            // Siblings from previous steps (e.g. A1, A3 when you chose A2) are NOT included.
            const newDiscovered = new Set<string>(newPath);  // path is always shown
            const tipNode = newPath[newPath.length - 1];     // frontier = the latest chosen node

            if (tipNode) {
                const rootNode = state.nodes.find(n => n.id === newPath[0]);
                // Generic: detect origin "context" node for optional link filtering
                const originContextName = rootNode?.name || null;
                const originContextType = rootNode?.type?.toLowerCase() || '';

                state.links.forEach((link: any) => {
                    const s = typeof link.source === 'object' ? link.source.id : link.source;
                    const t = typeof link.target === 'object' ? link.target.id : link.target;

                    // Only expand neighbors of the TIP (current frontier)
                    const isTipNeighbor = s === tipNode || t === tipNode;
                    if (!isTipNeighbor) return;

                    const neighborId = s === tipNode ? t : s;

                    // Optional: if root is a "Herb" type, filter contextual links by herb name
                    // This prevents cross-talk between different herb subtrees
                    if (originContextName && originContextType === 'herb') {
                        const lt = (link.type || '').toUpperCase().replace(/[\s-]/g, '_');
                        const contextualTypes = ['HAS_QUALITY', 'HAS_USE', 'CONTAINS'];
                        if (contextualTypes.includes(lt)) {
                            const props = link.properties || {};
                            const herbProp = ((props.herb || props.herb_name || props.source_herb || '') as string).trim().toLowerCase();
                            if (herbProp) {
                                const o = originContextName.toLowerCase();
                                if (!(herbProp === o || o.includes(herbProp) || herbProp.includes(o))) {
                                    return; // Skip neighbors from a different herb context
                                }
                            }
                        }
                    }

                    newDiscovered.add(neighborId);
                });
            }

            return {
                traversalPath: newPath,
                // ← KEY FIX: only path + tip's neighbors survive. All previous siblings gone.
                discoveredNodeIds: newDiscovered,
            };
        }),

        // Go one step back: remove the last node from the path and re-expand the new tip's neighbors
        traverseBack: () => set((state) => {
            const path = state.traversalPath;
            if (path.length <= 1) {
                // At root or empty — reset fully (stay in traversal mode)
                return { traversalPath: [], discoveredNodeIds: new Set<string>() };
            }

            // Pop last node
            const newPath = path.slice(0, -1);
            const newTip = newPath[newPath.length - 1];

            // Re-discover: path nodes + new tip's neighbors
            const newDiscovered = new Set<string>(newPath);
            state.links.forEach((link: any) => {
                const s = typeof link.source === 'object' ? link.source.id : link.source;
                const t = typeof link.target === 'object' ? link.target.id : link.target;
                if (s === newTip) newDiscovered.add(t);
                if (t === newTip) newDiscovered.add(s);
            });

            return { traversalPath: newPath, discoveredNodeIds: newDiscovered };
        }),

        // Reset traversal memory — clear path and discoveries, stay in traversal mode
        resetTraversal: () => set({
            traversalPath: [],
            discoveredNodeIds: new Set<string>(),
        }),

        // Analytics Selection Flow
        analyticSelectionActive: false,
        setAnalyticSelectionActive: (active) => set({ analyticSelectionActive: active }),
        analyticIncludeNeighbors: false,
        setAnalyticIncludeNeighbors: (include) => set({ analyticIncludeNeighbors: include }),


        // Custom Coloring Actions
        setNodeTypeColor: (type, color) => set((state) => ({
            filters: {
                ...state.filters,
                customNodeTypeColors: {
                    ...state.filters.customNodeTypeColors,
                    [type]: color
                }
            }
        })),
        setRelationshipTypeColor: (type, color) => set((state) => ({
            filters: {
                ...state.filters,
                customRelationshipColors: {
                    ...state.filters.customRelationshipColors,
                    [type]: color
                }
            }
        })),
        getNodeColor: (type) => {
            const { filters } = get();
            if (filters.customNodeTypeColors[type]) {
                return filters.customNodeTypeColors[type];
            }
            // Fallback to the dynamic proxy logic (not imported here to avoid cycles, 
            // but we can import the generator or move it here)
            return ''; // We'll handle the fallback in the visualizer for now or move the logic here.
        },
        getRelationshipColor: (type) => {
            const { filters } = get();
            return filters.customRelationshipColors[type] || '';
        },

        // Async Actions
        // Smart loading: Initially load top 200 nodes by degree for large graphs
        loadAllNodes: false,
        setLoadAllNodes: (loadAll: boolean) => set({ loadAllNodes: loadAll }),
        totalNodesOnServer: 0,
        totalLinksOnServer: 0,
        fetchGraph: async (folderId, fileId) => {
            const { setGraphLoading, setGraphData, loadAllNodes } = get();
            setGraphLoading(true);
            try {
                let response;
                if (fileId) {
                    response = await graphApi.getFile(fileId);
                } else if (folderId) {
                    // Smart limit: load top 200 most-connected nodes initially
                    // to prevent browser freezing with large datasets (900+ nodes)
                    const initialLimit = loadAllNodes ? 10000 : 200;
                    response = await graphApi.getFolder(folderId, initialLimit);
                } else {
                    response = await graphApi.getAll(500);
                }

                if (response && response.nodes) {
                    setGraphData(response.nodes, response.links || []);
                    set({
                        totalNodesOnServer: response.total_nodes ?? response.nodes.length,
                        totalLinksOnServer: response.total_links ?? response.links?.length ?? 0,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch graph:', error);
            } finally {
                setGraphLoading(false);
            }
        },
    }))
);

// Selector hooks for performance
export const useSelectedNodes = () => useGraphStore((state) => state.selectedNodes);
export const useHoveredNode = () => useGraphStore((state) => state.hoveredNode);
export const useNodeCount = () => useGraphStore((state) => state.nodeCount);
export const useLinkCount = () => useGraphStore((state) => state.linkCount);
