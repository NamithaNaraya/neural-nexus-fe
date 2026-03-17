/**
 * Graph Processing Worker
 * 
 * Handles heavy computation for:
 * - Filtering node/link lists
 * - BFS neighborhood calculations for highlighting
 * - Graph traversal logic
 * 
 * This keeps the main UI thread responsive even with 2000+ nodes.
 */

// Helper: Strip folder isolation suffixes like _F_uuid
const cleanLabel = (label: string | undefined | null): string => {
    if (!label) return 'Unknown';
    if (label.includes('_F_')) {
        return label.split('_F_')[0];
    }
    return label;
};

// Internal state
let nodes: any[] = [];
let links: any[] = [];
let nodesMap = new Map<string, any>();

// Message handler
self.onmessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'SET_DATA':
            nodes = payload.nodes || [];
            links = payload.links || [];
            nodesMap = new Map();
            nodes.forEach(n => nodesMap.set(n.id, n));
            break;

        case 'PROCESS_GRAPH':
            const { filters, selectedNodes, hoveredNode, traversalModeActive, discoveredNodeIdsSet, analyticSelectionActive, analyticIncludeNeighbors } = payload;
            
            // 1. Run Filtering Logic
            const filteredResult = computeFiltering(filters, traversalModeActive, discoveredNodeIdsSet);
            
            // 2. Run BFS / Neighborhood Logic (for highlighting)
            const focusResult = computeFocusNeighborhood(
                selectedNodes, 
                hoveredNode, 
                analyticSelectionActive, 
                analyticIncludeNeighbors,
                filteredResult.nodeIds, // Only search within visible links for focus
                filteredResult.linkList
            );

            // Return everything in one go to minimize postMessage overhead
            self.postMessage({
                type: 'GRAPH_PROCESSED_RESULT',
                payload: {
                    filteredNodeIds: filteredResult.nodeIds,
                    filteredLinkIds: filteredResult.linkIds,
                    focusNodeIds: focusResult.focusNodeIds,
                    focusLinkIds: focusResult.focusLinkIds,
                    analyticsNeighbors: focusResult.analyticsNeighbors
                }
            });
            break;

        case 'SEARCH':
            const results = computeSearch(payload.query);
            self.postMessage({
                type: 'SEARCH_RESULT',
                payload: results
            });
            break;
    }
};

/**
 * Filter logic - exact mirror of graphStore.ts filteredNodes/Links
 */
function computeFiltering(filters: any, traversalModeActive: boolean, discoveredNodeIdsSet: Set<string> | string[]) {
    const discoveredSet = Array.isArray(discoveredNodeIdsSet) ? new Set(discoveredNodeIdsSet) : (discoveredNodeIdsSet || new Set());
    
    // 1. Identify Candidate Nodes (Attribute Filters)
    const candidateNodes = nodes.filter((node) => {
        if (filters.nodeTypes.length > 0 && !filters.nodeTypes.includes(node.type)) return false;
        if (filters.fileIds.length > 0 && node.fileId && !filters.fileIds.includes(node.fileId)) return false;
        
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const matchesName = node.name.toLowerCase().includes(query);
            const matchesType = node.type.toLowerCase().includes(query);
            const matchesDesc = (node.description || '').toLowerCase().includes(query);
            if (!matchesName && !matchesType && !matchesDesc) return false;
        }
        return true;
    });

    const candidateNodeIds = new Set(candidateNodes.map(n => n.id));

    // 2. Calculate dynamic degrees based on filtered links
    const dynamicDegrees = new Map<string, number>();
    candidateNodes.forEach(n => dynamicDegrees.set(n.id, 0));

    const candidateLinks = links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;

        if (filters.relationshipTypes.length > 0 && !filters.relationshipTypes.includes(link.type)) return false;
        
        if (candidateNodeIds.has(sourceId) && candidateNodeIds.has(targetId)) {
            dynamicDegrees.set(sourceId, (dynamicDegrees.get(sourceId) || 0) + 1);
            dynamicDegrees.set(targetId, (dynamicDegrees.get(targetId) || 0) + 1);
            return true;
        }
        return false;
    });

    // 3. Final topological pass
    const filteredNodes = candidateNodes.filter(node => {
        const degree = dynamicDegrees.get(node.id) || 0;

        if (traversalModeActive && discoveredSet.size > 0) {
            if (!discoveredSet.has(node.id)) return false;
        }

        if (!filters.showOrphans && degree === 0 && !traversalModeActive) return false;
        
        if (discoveredSet.has(node.id)) return true;
        
        if (filters.minDegree > 0 && degree < filters.minDegree) return false;

        return true;
    });

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = candidateLinks.filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return filteredNodeIds.has(s) && filteredNodeIds.has(t);
    });

    return {
        nodeIds: Array.from(filteredNodeIds),
        linkIds: filteredLinks.map(l => l.id),
        linkList: filteredLinks
    };
}

/**
 * BFS / Neighborhood logic - exact mirror of ForceGraph2D and GraphContainer
 */
function computeFocusNeighborhood(
    selectedNodes: string[], 
    hoveredNode: string | null, 
    analyticSelectionActive: boolean, 
    analyticIncludeNeighbors: boolean,
    visibleNodeIdsArr: string[],
    visibleLinksList: any[]
) {
    const visibleNodeIds = new Set(visibleNodeIdsArr);
    const focusNodeId = hoveredNode || (selectedNodes.length === 1 ? selectedNodes[0] : null);
    const focusNodeIds = new Set<string>();
    const focusLinkIds = new Set<string>();
    const analyticsNeighbors = new Set<string>();

    if (analyticSelectionActive && analyticIncludeNeighbors && selectedNodes.length > 0) {
        visibleLinksList.forEach(link => {
            const s = typeof link.source === 'object' ? link.source.id : link.source;
            const t = typeof link.target === 'object' ? link.target.id : link.target;
            if (selectedNodes.includes(s)) analyticsNeighbors.add(t);
            if (selectedNodes.includes(t)) analyticsNeighbors.add(s);
        });
    }

    if (focusNodeId) {
        const seeds = [focusNodeId, ...selectedNodes];
        seeds.forEach(id => {
            if (visibleNodeIds.has(id)) focusNodeIds.add(id);
        });

        // "Origin Herb" context logic
        let originHerbName = '';
        const focusNode = nodesMap.get(focusNodeId);
        
        if (focusNode) {
            const focusType = cleanLabel(focusNode.type);
            if (focusType === 'Herb') {
                originHerbName = focusNode.name;
            } else {
                const selectedHerbs = selectedNodes
                    .map(id => nodesMap.get(id))
                    .filter(n => n && cleanLabel(n.type) === 'Herb');

                if (selectedHerbs.length === 1) {
                    originHerbName = selectedHerbs[0].name;
                }
            }
        }

        let currentLevel = Array.from(focusNodeIds);
        const MAX_HOPS = 3;

        for (let hop = 0; hop < MAX_HOPS; hop++) {
            const nextLevel: string[] = [];

            visibleLinksList.forEach(link => {
                const s = typeof link.source === 'object' ? link.source.id : link.source;
                const t = typeof link.target === 'object' ? link.target.id : link.target;
                if (!s || !t) return;

                const linkType = (link.type || '').toUpperCase().replace(/[\s-]/g, '_');

                if (originHerbName) {
                    if (hop > 0 && linkType === 'HAS_PROPERTY') return;

                    if (linkType === 'HAS_QUALITY') {
                        const herbProp = (link.properties?.herb as string || '').trim();
                        if (herbProp) {
                            const v = herbProp.toLowerCase();
                            const o = originHerbName.toLowerCase();
                            if (!(v === o || o.includes(v) || v.includes(o))) return;
                        } else {
                            return;
                        }
                    }
                }

                if (currentLevel.includes(s)) {
                    focusLinkIds.add(`${s}-${t}`);
                    if (!focusNodeIds.has(t)) {
                        focusNodeIds.add(t);
                        nextLevel.push(t);
                    }
                }
                if (hop === 0 && currentLevel.includes(t)) {
                    focusLinkIds.add(`${s}-${t}`);
                    if (!focusNodeIds.has(s)) {
                        focusNodeIds.add(s);
                        nextLevel.push(s);
                    }
                }
            });
            currentLevel = nextLevel;
            if (currentLevel.length === 0) break;
        }
    }

    return {
        focusNodeIds: Array.from(focusNodeIds),
        focusLinkIds: Array.from(focusLinkIds),
        analyticsNeighbors: Array.from(analyticsNeighbors)
    };
}

/**
 * Fast search
 */
function computeSearch(query: string) {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return nodes
        .filter((node) =>
            node.name.toLowerCase().includes(lowerQuery) ||
            node.type.toLowerCase().includes(lowerQuery) ||
            (node.description || '').toLowerCase().includes(lowerQuery)
        )
        .slice(0, 20);
}
