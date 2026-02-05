/**
 * 2D Force-Directed Graph Visualization
 * 
 * D3.js-based 2D graph visualization with force simulation.
 * Features:
 * - Force-directed layout with good spacing
 * - Pan and zoom
 * - Click-to-expand (progressive exploration)
 * - Theme-aware styling
 * - Clean, minimal link labels (only on hover)
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
    const [isDark, setIsDark] = useState(true);

    // Track last click for double-click detection
    const lastClickRef = useRef<{ time: number; nodeId: string | null }>({ time: 0, nodeId: null });

    // Detect dark mode
    useEffect(() => {
        const checkDarkMode = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        checkDarkMode();

        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    // Theme colors
    const bgColor = isDark ? '#0A0C10' : '#F8FAFC';
    const textColor = isDark ? '#F1F5F9' : '#1E293B';
    const strokeColor = isDark ? '#1E293B' : '#E2E8F0';

    // Convert nodes for D3 - spread them out more initially
    const d3Nodes: D3Node[] = useMemo(() => {
        const spread = Math.max(dimensions.width, dimensions.height) * 0.4;
        return nodes.map((n, i) => {
            const angle = (i / nodes.length) * 2 * Math.PI;
            const radius = spread * (0.3 + Math.random() * 0.7);
            return {
                ...n,
                x: n.x ?? Math.cos(angle) * radius,
                y: n.y ?? Math.sin(angle) * radius,
            };
        });
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
        const baseSize = 12;
        const degreeBonus = (node.degree || 0) * 0.8;
        return Math.min(baseSize + degreeBonus, 35);
    }, []);

    // Get node color
    const getNodeColor = useCallback((node: D3Node) => {
        return NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;
    }, []);

    // Get link color
    const getLinkColor = useCallback((link: D3Link) => {
        return RELATIONSHIP_COLORS[link.type] || RELATIONSHIP_COLORS.default;
    }, []);

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

        // Setup zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Center the view initially
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.6));

        // Create force simulation with STRONGER repulsion for better spacing
        const simulation = d3.forceSimulation<D3Node>(d3Nodes)
            .force('link', d3.forceLink<D3Node, D3Link>(d3Links)
                .id(d => d.id)
                .distance(150) // Longer link distance
                .strength(0.3) // Weaker link strength
            )
            .force('charge', d3.forceManyBody()
                .strength(-800) // MUCH stronger repulsion
                .distanceMax(500)
            )
            .force('center', d3.forceCenter(0, 0).strength(0.05))
            .force('collision', d3.forceCollide()
                .radius(d => getNodeSize(d as D3Node) + 40) // Larger collision radius
                .strength(0.8)
            )
            .force('x', d3.forceX(0).strength(0.02))
            .force('y', d3.forceY(0).strength(0.02));

        simulationRef.current = simulation;

        // Create links - curved paths for better visibility
        const linkElements = linksGroup.selectAll<SVGPathElement, D3Link>('path')
            .data(d3Links)
            .join('path')
            .attr('class', 'link')
            .attr('stroke', d => getLinkColor(d))
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', 2)
            .attr('fill', 'none');

        // Add glow filter
        const defs = svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'node-glow')
            .attr('x', '-100%')
            .attr('y', '-100%')
            .attr('width', '300%')
            .attr('height', '300%');

        filter.append('feGaussianBlur')
            .attr('stdDeviation', '4')
            .attr('result', 'coloredBlur');

        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Create node groups
        const nodeGroups = nodesGroup.selectAll<SVGGElement, D3Node>('g')
            .data(d3Nodes, d => d.id)
            .join('g')
            .attr('class', 'node-group')
            .style('cursor', 'pointer')
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

        // Add outer glow circle for selected nodes
        nodeGroups.append('circle')
            .attr('class', 'glow-ring')
            .attr('r', d => getNodeSize(d) + 8)
            .attr('fill', 'none')
            .attr('stroke', d => getNodeColor(d))
            .attr('stroke-width', 3)
            .attr('stroke-opacity', 0)
            .style('filter', 'url(#node-glow)');

        // Add main circles to nodes
        nodeGroups.append('circle')
            .attr('class', 'node-circle')
            .attr('r', d => getNodeSize(d))
            .attr('fill', d => getNodeColor(d))
            .attr('stroke', strokeColor)
            .attr('stroke-width', 2);

        // Add labels to nodes - BELOW the node, not overlapping
        nodeGroups.append('text')
            .attr('class', 'node-label')
            .attr('dy', d => getNodeSize(d) + 16)
            .attr('text-anchor', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('pointer-events', 'none')
            .text(d => d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name);

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
                    .select('.node-circle')
                    .transition()
                    .duration(150)
                    .attr('r', getNodeSize(d) * 1.3);

                d3.select(event.currentTarget)
                    .select('.glow-ring')
                    .transition()
                    .duration(150)
                    .attr('stroke-opacity', 0.6);
            })
            .on('mouseleave', (event, d) => {
                onNodeHover(null);

                d3.select(event.currentTarget)
                    .select('.node-circle')
                    .transition()
                    .duration(150)
                    .attr('r', getNodeSize(d));

                d3.select(event.currentTarget)
                    .select('.glow-ring')
                    .transition()
                    .duration(150)
                    .attr('stroke-opacity', 0);
            });

        // Background click - clear hover
        svg.on('click', (event) => {
            if (event.target === svgRef.current) {
                onBackgroundClick();
                onNodeHover(null);
            }
        });

        // Update positions on simulation tick
        simulation.on('tick', () => {
            // Curved links
            linkElements.attr('d', d => {
                const source = d.source as D3Node;
                const target = d.target as D3Node;
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 0.8;
                return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
            });

            nodeGroups.attr('transform', d => `translate(${d.x}, ${d.y})`);
        });

        // Cleanup
        return () => {
            simulation.stop();
        };
    }, [d3Nodes, d3Links, dimensions, getNodeSize, getNodeColor, getLinkColor, onNodeClick, onNodeDoubleClick, onNodeHover, onBackgroundClick, strokeColor, textColor]);

    // Update visual states when selection/hover changes
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        // Update node styles
        svg.selectAll<SVGGElement, D3Node>('.node-group')
            .each(function (d) {
                const group = d3.select(this);
                const isSelected = selectedNodes.includes(d.id);
                const isHovered = hoveredNode === d.id;

                group.select('.node-circle')
                    .attr('stroke', isSelected ? '#10B981' : strokeColor)
                    .attr('stroke-width', isSelected ? 4 : 2)
                    .attr('opacity', hoveredNode && !isHovered && !isSelected ? 0.3 : 1);

                group.select('.glow-ring')
                    .attr('stroke-opacity', isSelected ? 0.8 : 0);

                group.select('.node-label')
                    .attr('opacity', hoveredNode && !isHovered && !isSelected ? 0.3 : 1);
            });

        // Update link styles
        svg.selectAll<SVGPathElement, D3Link>('.link')
            .attr('stroke-opacity', d => {
                const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
                const targetId = typeof d.target === 'string' ? d.target : d.target.id;

                if (selectedNodes.includes(sourceId) || selectedNodes.includes(targetId)) {
                    return 0.8;
                }
                if (hoveredNode === sourceId || hoveredNode === targetId) {
                    return 0.6;
                }
                if (hoveredNode) {
                    return 0.1;
                }
                return 0.4;
            })
            .attr('stroke-width', d => {
                const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
                const targetId = typeof d.target === 'string' ? d.target : d.target.id;

                if (selectedNodes.includes(sourceId) || selectedNodes.includes(targetId)) {
                    return 3;
                }
                return 2;
            });

    }, [selectedNodes, hoveredNode, strokeColor]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full"
            style={{ backgroundColor: bgColor }}
        >
            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className="w-full h-full"
            />
        </div>
    );
}
