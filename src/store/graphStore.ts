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
    source: string;
    target: string;
    type: string;
    strength?: number;
    description?: string;

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
    addNodesAndLinks: (nodes: GraphNode[], links: GraphLink[]) => void;
    removeLink: (source: string, target: string) => void;

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
            const node = get().nodes.find(n => n.id === nodeId);
            if (node && node.x !== undefined && node.y !== undefined) {
                // Set target node for camera animation
                set({
                    targetNode: nodeId,
                    selectedNodes: [nodeId],
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
        resetFilters: () => set({ filters: defaultFilters }),

        // Computed filtered data
        filteredNodes: () => {
            const { nodes, filters } = get();

            return nodes.filter((node) => {
                // DISCOVERY OVERRIDE: If the node was explicitly discovered/clicked, it's always visible
                if (get().discoveredNodeIds.has(node.id)) {
                    return true;
                }

                // Filter by node type
                if (filters.nodeTypes.length > 0 && !filters.nodeTypes.includes(node.type)) {
                    return false;
                }

                // Filter by minimum degree
                if (filters.minDegree > 0 && (node.degree || 0) < filters.minDegree) {
                    return false;
                }

                // Filter by file IDs
                if (filters.fileIds.length > 0 && node.fileId && !filters.fileIds.includes(node.fileId)) {
                    return false;
                }

                // Filter by search query
                if (filters.searchQuery) {
                    const query = filters.searchQuery.toLowerCase();
                    const matchesName = node.name.toLowerCase().includes(query);
                    const matchesType = node.type.toLowerCase().includes(query);
                    const matchesDesc = node.description?.toLowerCase().includes(query);
                    if (!matchesName && !matchesType && !matchesDesc) {
                        return false;
                    }
                }

                // Filter by orphan status (Apply LAST so other filters run first)
                if (!filters.showOrphans && (node.degree || 0) === 0) {
                    return false;
                }

                return true;
            });
        },

        filteredLinks: () => {
            const { links, filters } = get();
            const filteredNodeIds = new Set(get().filteredNodes().map((n) => n.id));

            return links.filter((link) => {
                // Both source and target must be in filtered nodes
                if (!filteredNodeIds.has(link.source) || !filteredNodeIds.has(link.target)) {
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

        // Async Actions
        fetchGraph: async (folderId, fileId) => {
            const { setGraphLoading, setGraphData } = get();
            setGraphLoading(true);
            try {
                let response;
                if (fileId) {
                    response = await graphApi.getFile(fileId);
                } else if (folderId) {
                    response = await graphApi.getFolder(folderId);
                } else {
                    response = await graphApi.getAll();
                }

                if (response && response.nodes) {
                    setGraphData(response.nodes, response.links || []);
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
