/**
 * 2D Force-Directed Graph Visualization
 * 
 * D3.js-based 2D graph visualization with force simulation.
 * Features:
 * - Force-directed layout
 * - Pan and zoom
 * - Click-to-expand (progressive exploration)
 * - Path highlighting
 * - Smooth animations
 */
'use client';

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink } from '@/store/graphStore';
import { NODE_TYPE_COLORS, RELATIONSHIP_COLORS } from '../types';

// Props
interface ForceGraph2DProps {
    nodes: GraphNode[];
    links: GraphLink[];
    selectedNodes: string[];
    hoveredNode: string | null;
    onNodeClick: (nodeId: string, event?: React.MouseEvent) => void;
    onNodeDoubleClick: (nodeId: string) => void;
    onNodeHover: (nodeId: string | null) => void;
    onBackgroundClick: () => void;
}

// D3 Node type with simulation properties
interface D3Node extends GraphNode {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

// D3 Link type with source/target as nodes
interface D3Link {
    source: D3Node | string;
    target: D3Node | string;
    type: string;
    strength?: number;
}

export function ForceGraph2D({
    nodes,
    links,
    selectedNodes,
    hoveredNode,
    onNodeClick,
    onNodeDoubleClick,
    onNodeHover,
    onBackgroundClick,
}: ForceGraph2DProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // Track last click for double-click detection
    const lastClickRef = useRef<{ time: number; nodeId: string | null }>({ time: 0, nodeId: null });

    // Convert nodes for D3
    const d3Nodes: D3Node[] = useMemo(() => {
        return nodes.map(n => ({
            ...n,
            x: n.x ?? dimensions.width / 2 + (Math.random() - 0.5) * 200,
            y: n.y ?? dimensions.height / 2 + (Math.random() - 0.5) * 200,
        }));
    }, [nodes, dimensions]);

    // Convert links for D3
    const d3Links: D3Link[] = useMemo(() => {
        return links.map(l => ({
            source: l.source,
            target: l.target,
            type: l.type,
            strength: l.strength,
        }));
    }, [links]);

    // Node size calculation
    const getNodeSize = useCallback((node: D3Node) => {
        const baseSize = 8;
        const degreeBonus = (node.degree || 0) * 0.5;
        return Math.min(baseSize + degreeBonus, 25);
    }, []);

    // Get node color
    const getNodeColor = useCallback((node: D3Node) => {
        return NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;
    }, []);

    // Get link color
    const getLinkColor = useCallback((link: D3Link) => {
        return RELATIONSHIP_COLORS[link.type] || RELATIONSHIP_COLORS.default;
    }, []);

    // Check if link is highlighted
    const isLinkHighlighted = useCallback((link: D3Link) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;

        return (
            selectedNodes.includes(sourceId) ||
            selectedNodes.includes(targetId) ||
            sourceId === hoveredNode ||
            targetId === hoveredNode
        );
    }, [selectedNodes, hoveredNode]);

    // Handle resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Initialize and update D3 simulation
    useEffect(() => {
        if (!svgRef.current || d3Nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        const width = dimensions.width;
        const height = dimensions.height;

        // Clear previous content
        svg.selectAll('*').remove();

        // Create container groups
        const container = svg.append('g').attr('class', 'graph-container');
        const linksGroup = container.append('g').attr('class', 'links');
        const nodesGroup = container.append('g').attr('class', 'nodes');
        const labelsGroup = container.append('g').attr('class', 'labels');

        // Setup zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Center the view initially
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));

        // Calculate folder centers for Floating Island layout
        const uniqueFolders = Array.from(new Set(d3Nodes.map(d => d.folderId).filter(Boolean)));
        const folderCenters = new Map<string, { x: number; y: number }>();
        const radius = 300;

        uniqueFolders.forEach((folderId, i) => {
            const angle = (i / uniqueFolders.length) * Math.PI * 2;
            folderCenters.set(folderId!, {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        });

        // Create force simulation
        const simulation = d3.forceSimulation<D3Node>(d3Nodes)
            .force('link', d3.forceLink<D3Node, D3Link>(d3Links)
                .id(d => d.id)
                .distance(100)
                .strength(0.5)
            )
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(0, 0))
            .force('collision', d3.forceCollide().radius(d => getNodeSize(d as D3Node) + 10))
            .force('folder', (alpha) => {
                // Island force: pull nodes toward their folder center
                for (const node of d3Nodes) {
                    if (node.folderId && folderCenters.has(node.folderId)) {
                        const center = folderCenters.get(node.folderId)!;
                        node.vx! += (center.x - node.x) * alpha * 0.1;
                        node.vy! += (center.y - node.y) * alpha * 0.1;
                    }
                }
            });


        simulationRef.current = simulation;

        // Create links
        const linkElements = linksGroup.selectAll<SVGLineElement, D3Link>('line')
            .data(d3Links)
            .join('line')
            .attr('class', 'link')
            .attr('stroke', d => getLinkColor(d))
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', 1.5);

        // Create link labels
        const linkLabels = linksGroup.selectAll<SVGTextElement, D3Link>('text')
            .data(d3Links)
            .join('text')
            .attr('class', 'link-label')
            .attr('fill', '#9CA3AF')
            .attr('font-size', '8px')
            .attr('text-anchor', 'middle')
            .attr('dy', -5)
            .text(d => d.type.replace(/_/g, ' '));

        // Create node groups
        const nodeGroups = nodesGroup.selectAll<SVGGElement, D3Node>('g')
            .data(d3Nodes, d => d.id)
            .join('g')
            .attr('class', 'node-group')
            .call(d3.drag<SVGGElement, D3Node>()
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
                })
            );

        // Add glow filter
        const defs = svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');

        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');

        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Add circles to nodes
        nodeGroups.append('circle')
            .attr('r', d => getNodeSize(d))
            .attr('fill', d => getNodeColor(d))
            .attr('stroke', '#0A0C10')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .style('filter', 'url(#glow)');

        // Add labels to nodes
        nodeGroups.append('text')
            .attr('class', 'node-label')
            .attr('dy', d => getNodeSize(d) + 12)
            .attr('text-anchor', 'middle')
            .attr('fill', '#F1F5F9')
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .text(d => d.name.length > 15 ? d.name.slice(0, 15) + '...' : d.name);

        // Event handlers
        nodeGroups
            .on('click', (event, d) => {
                event.stopPropagation();

                const now = Date.now();
                if (
                    lastClickRef.current.nodeId === d.id &&
                    now - lastClickRef.current.time < 300
                ) {
                    // Double click
                    onNodeDoubleClick(d.id);
                    lastClickRef.current = { time: 0, nodeId: null };
                } else {
                    // Single click
                    onNodeClick(d.id, event as unknown as React.MouseEvent);
                    lastClickRef.current = { time: now, nodeId: d.id };
                }
            })
            .on('mouseenter', (event, d) => {
                onNodeHover(d.id);

                // Highlight effect
                d3.select(event.currentTarget)
                    .select('circle')
                    .transition()
                    .duration(150)
                    .attr('r', getNodeSize(d) * 1.2);
            })
            .on('mouseleave', (event, d) => {
                onNodeHover(null);

                d3.select(event.currentTarget)
                    .select('circle')
                    .transition()
                    .duration(150)
                    .attr('r', getNodeSize(d));
            });

        // Background click
        svg.on('click', (event) => {
            if (event.target === svgRef.current) {
                onBackgroundClick();
            }
        });

        // Update positions on simulation tick
        simulation.on('tick', () => {
            linkElements
                .attr('x1', d => (d.source as D3Node).x)
                .attr('y1', d => (d.source as D3Node).y)
                .attr('x2', d => (d.target as D3Node).x)
                .attr('y2', d => (d.target as D3Node).y);

            linkLabels
                .attr('x', d => ((d.source as D3Node).x + (d.target as D3Node).x) / 2)
                .attr('y', d => ((d.source as D3Node).y + (d.target as D3Node).y) / 2);

            nodeGroups.attr('transform', d => `translate(${d.x}, ${d.y})`);
        });

        // Cleanup
        return () => {
            simulation.stop();
        };
    }, [d3Nodes, d3Links, dimensions, getNodeSize, getNodeColor, getLinkColor, onNodeClick, onNodeDoubleClick, onNodeHover, onBackgroundClick]);

    // Update visual states when selection/hover changes
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        // Update node styles
        svg.selectAll<SVGGElement, D3Node>('.node-group')
            .select('circle')
            .attr('stroke', d => selectedNodes.includes(d.id) ? '#10B981' : '#0A0C10')
            .attr('stroke-width', d => selectedNodes.includes(d.id) ? 3 : 2)
            .attr('opacity', d => {
                if (hoveredNode && hoveredNode !== d.id && !selectedNodes.includes(d.id)) {
                    return 0.4;
                }
                return 1;
            });

        // Update link styles
        svg.selectAll<SVGLineElement, D3Link>('.link')
            .attr('stroke-opacity', d => {
                const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
                const targetId = typeof d.target === 'string' ? d.target : d.target.id;

                if (selectedNodes.includes(sourceId) || selectedNodes.includes(targetId)) {
                    return 0.8;
                }
                if (hoveredNode === sourceId || hoveredNode === targetId) {
                    return 0.6;
                }
                return 0.3;
            })
            .attr('stroke-width', d => {
                const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
                const targetId = typeof d.target === 'string' ? d.target : d.target.id;

                if (selectedNodes.includes(sourceId) || selectedNodes.includes(targetId)) {
                    return 2.5;
                }
                return 1.5;
            });

    }, [selectedNodes, hoveredNode]);

    return (
        <div ref={containerRef} className="w-full h-full bg-[#0A0C10]">
            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className="w-full h-full"
            />
        </div>
    );
}
