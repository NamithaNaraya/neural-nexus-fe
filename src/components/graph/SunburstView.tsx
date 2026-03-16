import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useGraphStore } from '@/store/graphStore';
import { NODE_TYPE_COLORS } from './types';

interface SunburstViewProps {
    nodes: any[];
    links: any[];
    onNodeClick?: (nodeId: string, event?: React.MouseEvent) => void;
    onNodeDoubleClick?: (nodeId: string, event?: React.MouseEvent) => void;
}

// Helper to convert flat graph to hierarchy (BFS for undirected layout)
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

    const nodeMap = new Map();
    nodes.forEach(n => {
        nodeMap.set(n.id, { ...n, children: [], value: 1 }); // D3 Partition requires value
    });
    
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
    
    // Clean up empty children arrays so leaves don't try to render children arcs
    const cleanup = (node: any) => {
        if (node.children.length === 0) {
            delete node.children;
        } else {
            node.children.forEach(cleanup);
        }
    };
    if (rootNode) cleanup(rootNode);

    return rootNode || null;
}

export function SunburstView({ nodes, links, onNodeClick, onNodeDoubleClick }: SunburstViewProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { traversalPath, getNodeColor, selectedNodes } = useGraphStore();
    const customNodeTypeColors = useGraphStore(state => state.filters.customNodeTypeColors);
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
        const minDim = Math.min(width, height);
        const radius = minDim / 2.2; 

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const g = svg.append('g');

        // Enable zoom/pan
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform as any);
            });
            
        svg.call(zoom as any);

        const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85);
        svg.call(zoom.transform as any, initialTransform);

        const rootLayout = d3.hierarchy(hierarchyData)
            .sum(d => d.value)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        const partition = d3.partition<any>()
            .size([2 * Math.PI, radius]); // width mapping to angle, height mapping to radius

        partition(rootLayout);

        // Arc generator
        const arc = d3.arc<any>()
            .startAngle((d: any) => d.x0)
            .endAngle((d: any) => d.x1)
            .innerRadius((d: any) => d.y0)
            .outerRadius((d: any) => d.y1)
            .padAngle(0.01)
            .padRadius(radius / 2);

        // Render arcs
        const cell = g.selectAll('g')
            .data(rootLayout.descendants())
            .join('g')
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                handleNodeClick(d.data.id, event as any);
            })
            .on('dblclick', (event, d) => {
                event.stopPropagation();
                if (onNodeDoubleClick) onNodeDoubleClick(d.data.id, event as any);
            });

        cell.append('path')
            .attr('d', arc)
            .style('fill', d => {
                const nodeType = d.data.type || d.data.labels?.[0] || 'Unknown';
                return getNodeColor(d.data.id) || customNodeTypeColors[nodeType] || NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.default;
            })
            .style('stroke', '#fff')
            .style('stroke-width', '1.5px')
            .style('stroke-linejoin', 'round')
            .style('opacity', 0.9)
            .on('mouseover', function() {
                d3.select(this).style('opacity', 1).style('stroke-width', '2.5px').style('stroke', '#3b82f6');
            })
            .on('mouseout', function() {
                d3.select(this).style('opacity', 0.9).style('stroke-width', '1.5px').style('stroke', '#fff');
            });

        // Add text labels
        cell.append('text')
            .attr('transform', ((d: any) => {
                const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                const r = (d.y0 + d.y1) / 2;
                return `rotate(${angle - 90}) translate(${r},0) rotate(${angle > 90 && angle < 270 ? 180 : 0})`;
            }) as any)
            .attr('dy', '0.35em')
            .text(((d: any) => {
                const name = d.data.name || d.data.id || 'Unknown';
                const angleDiff = d.x1 - d.x0;
                return Math.abs(angleDiff) > 0.1 ? name.substring(0, 15) + (name.length > 15 ? '...' : '') : '';
            }) as any)
            .style('fill', d => {
                // If it's a very tiny slice, don't color it differently, or just use white/black depending on bg
                return '#fff';
            })
            .style('font-size', '10px')
            .style('font-weight', '600')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .style('text-shadow', '0px 1px 2px rgba(0,0,0,0.6)');

    }, [hierarchyData, getNodeColor, customNodeTypeColors, onNodeClick, onNodeDoubleClick]);

    if (!nodes.length) {
        return <div className="w-full h-full flex items-center justify-center text-slate-400">No data available for Sunburst View</div>;
    }

    return (
        <div className="w-full h-full relative" ref={wrapperRef}>
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    );
}
