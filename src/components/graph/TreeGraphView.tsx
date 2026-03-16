'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useGraphStore } from '@/store/graphStore';

interface TreeGraphViewProps {
    nodes: any[];
    links: any[];
    onNodeClick?: (nodeId: string, event?: React.MouseEvent) => void;
    onNodeDoubleClick?: (nodeId: string, event?: React.MouseEvent) => void;
}

// Convert flat graph to hierarchy using BFS for undirected layout
function buildHierarchy(nodes: any[], links: any[], rootId?: string) {
    if (!nodes.length) return null;

    // Build adjacency list for bi-directional traversal
    const adjList = new Map<string, string[]>();
    nodes.forEach(n => adjList.set(n.id, []));

    links.forEach(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        if (adjList.has(sourceId) && adjList.has(targetId)) {
            // Only add unique connections
            if (!adjList.get(sourceId)!.includes(targetId)) adjList.get(sourceId)!.push(targetId);
            if (!adjList.get(targetId)!.includes(sourceId)) adjList.get(targetId)!.push(sourceId);
        }
    });

    // Find root
    let actualRootId = rootId;
    if (!actualRootId || !adjList.has(actualRootId)) {
        if (nodes.length > 0) {
            actualRootId = nodes.reduce((a, b) => (adjList.get(a.id)!.length > adjList.get(b.id)!.length ? a : b)).id;
        }
    }

    if (!actualRootId) return null;

    const nodeMap = new Map(nodes.map(n => [n.id, { ...n, children: [], value: 1 }]));
    
    // BFS to build tree and avoid cycles
    const visited = new Set<string>();
    visited.add(actualRootId);
    
    const queue = [actualRootId];
    
    while(queue.length > 0) {
        const currId = queue.shift()!;
        const currNode = nodeMap.get(currId)!;
        
        const neighbors = adjList.get(currId) || [];
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                const neighborNode = nodeMap.get(neighborId)!;
                currNode.children.push(neighborNode);
                queue.push(neighborId);
            }
        }
    }

    const rootNode = nodeMap.get(actualRootId);
    return rootNode || null;
}

export function TreeGraphView({ nodes, links, onNodeClick, onNodeDoubleClick }: TreeGraphViewProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { traversalPath, getNodeColor, selectedNodes } = useGraphStore();
    const [expandedLocalNodes, setExpandedLocalNodes] = useState<Set<string>>(new Set());

    const handleNodeClick = (nodeId: string, event: any) => {
        setExpandedLocalNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
        if (onNodeClick) onNodeClick(nodeId, event);
    };

    const hierarchyData = useMemo(() => {
        const rootId = traversalPath && traversalPath.length > 0 ? traversalPath[0] : (selectedNodes && selectedNodes.length > 0 ? selectedNodes[0] : undefined);
        const root = buildHierarchy(nodes, links, rootId);
        
        if (!root) return null;

        // Progressive collapse logic
        const prune = (node: any, depth: number) => {
            // Keep root's children visible by default (depth 0)
            if (depth > 0 && !expandedLocalNodes.has(node.id)) {
                if (node.children) {
                    node._children = node.children;
                    delete node.children;
                }
            } else if (node.children) {
                node.children.forEach((c: any) => prune(c, depth + 1));
            }
        };
        
        prune(root, 0);
        return root;
    }, [nodes, links, traversalPath, selectedNodes, expandedLocalNodes]);

    useEffect(() => {
        if (!svgRef.current || !wrapperRef.current || !hierarchyData) {
            if (svgRef.current) d3.select(svgRef.current).selectAll('*').remove();
            return;
        }

        const width = wrapperRef.current.clientWidth;
        const height = wrapperRef.current.clientHeight;
        const margin = { top: 40, right: 120, bottom: 40, left: 120 };

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const g = svg.append('g');

        // Enable zoom/pan
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform as any);
            });
            
        svg.call(zoom as any);

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Start panned to top center
        const initialTransform = d3.zoomIdentity.translate(width / 2, margin.top).scale(0.8);
        svg.call(zoom.transform as any, initialTransform);

        const root = d3.hierarchy(hierarchyData);
        // Tidy tree layout (vertical)
        const treeLayout = d3.tree<any>()
            .nodeSize([80, 150]); // dx (horizontal spacing), dy (vertical spacing)
            
        treeLayout(root);

        // Links
        g.selectAll('.link')
            .data(root.links())
            .join('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#cbd5e1') // Tailwind slate-300
            .attr('stroke-width', 2)
            .attr('d', d3.linkVertical<any, any>()
                .x(d => d.x)
                .y(d => d.y)
            );

        // Nodes
        const nodeGroup = g.selectAll('.node')
            .data(root.descendants())
            .join('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                handleNodeClick(d.data.id, event as any);
            })
            .on('dblclick', (event, d) => {
                event.stopPropagation();
                if (onNodeDoubleClick) onNodeDoubleClick(d.data.id, event as any);
            });

        // Node circles
        nodeGroup.append('circle')
            .attr('r', 16)
            .attr('fill', d => getNodeColor(d.data.type || d.data.labels?.[0] || 'Unknown'))
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .style('filter', 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))')
            .on('mouseover', function() {
                d3.select(this).attr('stroke', '#3b82f6').attr('stroke-width', 4).attr('r', 18);
            })
            .on('mouseout', function() {
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 3).attr('r', 16);
            });

        // Node labels
        nodeGroup.append('text')
            .attr('dy', 28)
            .attr('text-anchor', 'middle')
            .text(d => d.data.name || d.data.id || 'Unknown')
            .style('font-family', 'sans-serif')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', '#475569') // slate-600
            .style('user-select', 'none')
            // Add custom background to label for readability
            .clone(true).lower()
            .style('stroke', 'white')
            .style('stroke-width', 3)
            .style('stroke-linejoin', 'round');

    }, [hierarchyData, getNodeColor, onNodeClick, onNodeDoubleClick]);

    if (!nodes.length) {
        return <div className="w-full h-full flex items-center justify-center text-slate-400">No data available for Tree View</div>;
    }

    return (
        <div className="w-full h-full relative" ref={wrapperRef}>
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    );
}
