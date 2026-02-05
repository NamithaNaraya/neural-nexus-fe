/**
 * Comparison Graph
 * 
 * Individual graph panel for comparison view.
 * Renders a 2D force-directed graph with color-coded nodes.
 */
'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import {
    ComparisonNode,
    ComparisonLink,
    ComparisonMode,
    CATEGORY_COLORS,
    NodeCategory,
} from './types';

interface ComparisonGraphProps {
    nodes: ComparisonNode[];
    links: ComparisonLink[];
    title: string;
    nodeCount: number;
    linkCount: number;
    side: 'left' | 'right';
    mode: ComparisonMode;
    highlightCommon?: boolean;
    showBridges?: boolean;
    commonEntities?: string[];
    onNodeClick?: (nodeId: string) => void;
    onNodeHover?: (nodeId: string | null) => void;
    selectedNodes?: string[];
}

interface D3Node extends ComparisonNode {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

interface D3Link {
    source: D3Node | string;
    target: D3Node | string;
    type: string;
    isBridge?: boolean;
    isVirtual?: boolean;
}


export function ComparisonGraph({
    nodes,
    links,
    title,
    nodeCount,
    linkCount,
    side,
    mode,
    highlightCommon = false,
    showBridges = false,
    commonEntities = [],
    onNodeClick,
    onNodeHover,
    selectedNodes = [],
}: ComparisonGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get node color based on category and highlight state
    const getNodeColor = useCallback((node: ComparisonNode, isHighlighted: boolean) => {
        if (highlightCommon && commonEntities.includes(node.name)) {
            return CATEGORY_COLORS.common;
        }
        if (node.category === 'bridge') {
            return CATEGORY_COLORS.bridge;
        }

        // Dim non-common nodes when highlighting
        if (highlightCommon && !commonEntities.includes(node.name)) {
            return side === 'left' ? '#3B82F640' : '#F9731640'; // Faded
        }

        return side === 'left' ? CATEGORY_COLORS['unique-left'] : CATEGORY_COLORS['unique-right'];
    }, [highlightCommon, commonEntities, side]);

    // Get node opacity
    const getNodeOpacity = useCallback((node: ComparisonNode) => {
        if (highlightCommon) {
            return commonEntities.includes(node.name) ? 1 : 0.3;
        }
        return 1;
    }, [highlightCommon, commonEntities]);

    // D3 Simulation
    useEffect(() => {
        if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Clear previous
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height);

        // Create zoom container
        const g = svg.append('g');

        // Add arrow marker definitions
        const defs = svg.append('defs');

        // Arrow marker for normal links
        defs.append('marker')
            .attr('id', `arrow-${side}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('fill', '#ffffff60')
            .attr('d', 'M0,-5L10,0L0,5');

        // Arrow marker for bridge links
        defs.append('marker')
            .attr('id', `arrow-bridge-${side}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('fill', CATEGORY_COLORS.bridge)
            .attr('d', 'M0,-5L10,0L0,5');

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Prepare data
        const nodeData: D3Node[] = nodes.map(n => ({ ...n, x: width / 2, y: height / 2 }));
        const nodeMap = new Map(nodeData.map(n => [n.id, n]));

        // Filter out self-loops and invalid links
        const linkData: D3Link[] = links
            .filter(l => l.source !== l.target) // No self-loops
            .map(l => ({
                ...l,
                source: nodeMap.get(l.source as string) || l.source,
                target: nodeMap.get(l.target as string) || l.target,
            }))
            .filter(l =>
                typeof l.source === 'object' &&
                typeof l.target === 'object' &&
                (l.source as D3Node).id !== (l.target as D3Node).id // Double-check no self-loops
            );

        // Create simulation
        const simulation = d3.forceSimulation(nodeData)
            .force('link', d3.forceLink<D3Node, D3Link>(linkData)
                .id(d => d.id)
                .distance(100) // Increased distance for better readability
            )
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(35));

        // Draw link lines
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(linkData)
            .join('line')
            .attr('stroke', d => d.isBridge ? CATEGORY_COLORS.bridge : '#ffffff60')
            .attr('stroke-width', d => d.isBridge ? 2 : 1.5)
            .attr('stroke-dasharray', d => d.isVirtual ? '4,4' : 'none')
            .attr('marker-end', d => d.isBridge ? `url(#arrow-bridge-${side})` : `url(#arrow-${side})`);

        // Draw link labels (relationship type)
        const linkLabels = g.append('g')
            .attr('class', 'link-labels')
            .selectAll('text')
            .data(linkData)
            .join('text')
            .attr('text-anchor', 'middle')
            .attr('fill', '#ffffff80')
            .attr('font-size', '8px')
            .attr('dy', -4)
            .text(d => d.type ? (d.type.length > 15 ? d.type.slice(0, 12) + '...' : d.type) : '');


        // Draw nodes
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodeData)
            .join('g')
            .attr('cursor', 'pointer');

        // Apply drag behavior with type assertion
        node.call(d3.drag<SVGGElement, D3Node>()
            .on('start', (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }) as any);


        // Node circles
        node.append('circle')
            .attr('r', 10)
            .attr('fill', d => getNodeColor(d, selectedNodes.includes(d.id)))
            .attr('opacity', d => getNodeOpacity(d))
            .attr('stroke', d => selectedNodes.includes(d.id) ? '#ffffff' : 'transparent')
            .attr('stroke-width', 2);

        // Node labels
        node.append('text')
            .text(d => d.name.length > 12 ? d.name.slice(0, 12) + '...' : d.name)
            .attr('x', 0)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ffffff80')
            .attr('font-size', '10px')
            .attr('opacity', d => getNodeOpacity(d));

        // Glow effect for common nodes when highlighting
        if (highlightCommon) {
            node.filter(d => commonEntities.includes(d.name))
                .select('circle')
                .style('filter', 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.8))');
        }

        // Event handlers
        node.on('click', (event, d) => {
            event.stopPropagation();
            onNodeClick?.(d.id);
        });

        node.on('mouseenter', (event, d) => {
            onNodeHover?.(d.id);
        });

        node.on('mouseleave', () => {
            onNodeHover?.(null);
        });

        // Update positions on tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as D3Node).x)
                .attr('y1', d => (d.source as D3Node).y)
                .attr('x2', d => (d.target as D3Node).x)
                .attr('y2', d => (d.target as D3Node).y);

            // Position link labels at midpoint
            linkLabels
                .attr('x', d => ((d.source as D3Node).x + (d.target as D3Node).x) / 2)
                .attr('y', d => ((d.source as D3Node).y + (d.target as D3Node).y) / 2);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });


        // Initial zoom to fit
        setTimeout(() => {
            const bounds = g.node()?.getBBox();
            if (bounds) {
                const padding = 40;
                const dx = bounds.width + padding * 2;
                const dy = bounds.height + padding * 2;
                const x = bounds.x - padding;
                const y = bounds.y - padding;
                const scale = Math.min(0.9, Math.min(width / dx, height / dy));
                const translateX = width / 2 - scale * (x + dx / 2);
                const translateY = height / 2 - scale * (y + dy / 2);

                svg.transition()
                    .duration(500)
                    .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
            }
        }, 500);

        return () => {
            simulation.stop();
        };
    }, [nodes, links, highlightCommon, commonEntities, getNodeColor, getNodeOpacity, onNodeClick, onNodeHover, selectedNodes]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{
                            backgroundColor: side === 'left'
                                ? CATEGORY_COLORS['unique-left']
                                : CATEGORY_COLORS['unique-right']
                        }}
                    />
                    <span className="font-medium text-foreground">{title}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Nodes: {nodeCount}</span>
                    <span>Links: {linkCount}</span>
                </div>
            </div>

            {/* Graph container */}
            <div
                ref={containerRef}
                className="flex-1 relative bg-black/20 overflow-hidden"
            >
                <svg ref={svgRef} className="w-full h-full" />

                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        No data to display
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default ComparisonGraph;
