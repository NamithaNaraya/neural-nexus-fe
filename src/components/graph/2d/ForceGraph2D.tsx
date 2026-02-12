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
import { useGraphStore, GraphNode, GraphLink } from '@/store/graphStore';
import { NODE_TYPE_COLORS, RELATIONSHIP_COLORS } from '../types';
import { useSSE, PHASE_LABELS } from '@/hooks/useSSE';
import { useWebSocket } from '@/hooks/useWebSocket';

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
    onNodeContextMenu?: (nodeId: string, x: number, y: number) => void; // Right-click for expand
    folderId?: string;
    resetKey?: number;
    analyticSelectionActive?: boolean;
    analyticIncludeNeighbors?: boolean;
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

// Ingestion Progress UI for 2D
function IngestionProgressHUD() {
    const { ingestionProgress } = useSSE();
    const activeTasks = Object.values(ingestionProgress).filter((p: any) => p.progress < 100);

    if (activeTasks.length === 0) return null;

    return (
        <div className="absolute top-20 right-4 flex flex-col gap-2 pointer-events-auto z-50">
            {activeTasks.map((task: any) => (
                <div key={task.file_id} className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl w-64 shadow-2xl transition-all">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-emerald uppercase tracking-tighter">AI Ingestion</span>
                        <span className="text-[10px] text-foreground/50">{task.progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                        <div
                            className="h-full bg-emerald transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                            style={{ width: `${task.progress}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-foreground/80 truncate">
                        {PHASE_LABELS[task.phase] || task.phase}
                    </p>
                </div>
            ))}
        </div>
    );
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
    onNodeContextMenu,
    folderId,
    resetKey = 0,
    analyticSelectionActive = false,
    analyticIncludeNeighbors = false,
}: ForceGraph2DProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [isDark, setIsDark] = useState(false);

    // Zoom behavior ref to allow programmatic reset
    const zoomRef = useRef<any>(null);

    // ... existing logic

    // Handle Reset Signal
    useEffect(() => {
        if (resetKey > 0) {
            console.log('[2D] Resetting layout and camera...');

            // 1. Clear sticky positions
            nodeStateRef.current.clear();

            // 2. Reset zoom transform
            if (svgRef.current && zoomRef.current) {
                const svg = d3.select(svgRef.current);
                svg.transition()
                    .duration(750)
                    .call(zoomRef.current.transform, d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2).scale(0.6));
            }

            // 3. Reheat simulation to re-center nodes (since sticky is gone)
            if (simulationRef.current) {
                simulationRef.current.alpha(1).restart();
            }
        }
    }, [resetKey, dimensions.width, dimensions.height]);

    // Real-time Sync via WebSocket - use passed folderId
    const { lastMessage } = useWebSocket({ folderId });

    useEffect(() => {
        if (lastMessage?.type === 'node_updated') {
            console.log('[2D Sync] Live update:', lastMessage.payload);
        }
    }, [lastMessage]);

    // Detect dark mode
    // Store previous node positions to prevent resetting on re-renders
    const nodeStateRef = useRef<Map<string, { x: number; y: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null }>>(new Map());

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

    // Convert nodes for D3 - ALWAYS spread them out freshly for clean initialization
    const d3Nodes: D3Node[] = useMemo(() => {
        const spread = Math.max(dimensions.width, dimensions.height) * 0.4;
        // Use a seeded random based on node index for consistent but spread positions
        return nodes.map((n, i) => {
            const existingState = nodeStateRef.current.get(n.id);

            // If we have valid previous position, use it to prevent jumping
            if (existingState && !isNaN(existingState.x) && !isNaN(existingState.y)) {
                return {
                    ...n,
                    x: existingState.x,
                    y: existingState.y,
                    vx: existingState.vx,
                    vy: existingState.vy,
                    fx: existingState.fx,
                    fy: existingState.fy
                };
            }

            // Fallback to initial layout for new nodes
            const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI;
            const radius = spread * (0.3 + (((i * 17) % 10) / 10) * 0.7); // Deterministic "random"
            return {
                ...n,
                // Always use fresh calculated positions for clean layout on view switch
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
            };
        });
    }, [nodes, dimensions.width, dimensions.height]); // Depend on width/height separately



    // Convert links for D3 - use STRING IDs (D3 forceLink will resolve them)
    // IMPORTANT: Keep as strings - we'll look up positions manually for rendering
    const d3Links: D3Link[] = useMemo(() => {
        // Create a set of valid node IDs
        const nodeIds = new Set(d3Nodes.map(n => n.id));

        return links.reduce<D3Link[]>((acc, l) => {
            // Skip links to non-existent nodes
            if (!nodeIds.has(l.source) || !nodeIds.has(l.target)) return acc;

            acc.push({
                source: l.source, // Keep as STRING
                target: l.target, // Keep as STRING  
                type: l.type,
                strength: l.strength,
            });
            return acc;
        }, []);
    }, [links, d3Nodes]);




    // Node size calculation
    const getNodeSize = useCallback((node: D3Node) => {
        const baseSize = 12;
        const degreeBonus = (node.degree || 0) * 0.8;
        return Math.min(baseSize + degreeBonus, 35);
    }, []);

    // Get node color
    const getNodeColor = useCallback((node: D3Node) => {
        return node.color || NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;
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
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        // Always clear previous content to prevent stale renders on empty data
        svg.selectAll('*').remove();

        if (d3Nodes.length === 0) {
            console.log('[2D] No nodes to render, cleared view.');
            return;
        }
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
        zoomRef.current = zoom;

        // Center the view initially
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.6));

        // Create force simulation with proper D3 pattern
        const simulation = d3.forceSimulation<D3Node>(d3Nodes)
            .force('link', d3.forceLink<D3Node, D3Link>(d3Links)
                .id(d => d.id)
                .distance(180) // Increased for better spreading
                .strength(1)
            )
            .force('charge', d3.forceManyBody()
                .strength(-2000) // Much stronger repulsion
                .distanceMax(600)
            )
            .force('center', d3.forceCenter(0, 0))
            .force('collision', d3.forceCollide()
                .radius(d => getNodeSize(d as D3Node) + 40) // More buffer for labels
                .strength(0.9)
            )
            .force('x', d3.forceX(0).strength(0.01)) // Subtle pull to center
            .force('y', d3.forceY(0).strength(0.01));

        simulationRef.current = simulation;

        // Create links - curved paths for better visibility
        const linkElements = linksGroup.selectAll<SVGPathElement, D3Link>('path')
            .data(d3Links)
            .join('path')
            .attr('class', 'link')
            .attr('stroke', d => getLinkColor(d))
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrow-marker)');

        // Add defs for filters and markers
        const defs = svg.append('defs');

        // Arrow marker for directional links
        defs.append('marker')
            .attr('id', 'arrow-marker')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 25) // Offset from target node
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('fill', '#ffffff80')
            .attr('d', 'M0,-5L10,0L0,5');

        // Glow filter for nodes
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

        // Create link labels group (relationship names)
        const linkLabelsGroup = container.append('g').attr('class', 'link-labels');
        const linkLabels = linkLabelsGroup.selectAll<SVGTextElement, D3Link>('text')
            .data(d3Links)
            .join('text')
            .attr('class', 'link-label')
            .attr('text-anchor', 'middle')
            .attr('fill', isDark ? '#94A3B8' : '#64748B') // Visible on both backgrounds
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('pointer-events', 'none')
            .attr('dy', -6)
            .attr('paint-order', 'stroke')
            .attr('stroke', isDark ? '#0A0C10' : '#F8FAFC') // Background color stroke for readability
            .attr('stroke-width', 3)
            .text(d => d.type ? (d.type.length > 18 ? d.type.slice(0, 15) + '...' : d.type) : '');

        // Create node groups
        const nodeGroups = nodesGroup.selectAll<SVGGElement, D3Node>('g')
            .data(d3Nodes, d => d.id)
            .join('g')
            .attr('class', 'node-group')
            .style('cursor', 'pointer')
            .call(d3.drag<SVGGElement, D3Node>()
                .clickDistance(5)
                .on('start', (event, d) => {
                    // Reheat simulation during drag for smooth movement
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    // Cool down simulation
                    if (!event.active) simulation.alphaTarget(0);
                    // Keep node fixed where dragged
                    d.fx = d.x;
                    d.fy = d.y;
                    // Save position for persistence, including fixed coordinates
                    nodeStateRef.current.set(d.id, {
                        x: d.x!,
                        y: d.y!,
                        fx: d.fx,
                        fy: d.fy,
                        vx: d.vx,
                        vy: d.vy
                    });
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
            .text(d => {
                const isSelected = selectedNodes.includes(d.id);
                const isHovered = hoveredNode === d.id;
                if (isSelected || isHovered) return d.name;
                return d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name;
            });

        // Event handlers
        nodeGroups
            .on('click', (event, d) => {
                const nativeEvent = event.sourceEvent || event;

                console.log('Node Action Triggered (2D):', d.id, 'Button:', nativeEvent.button);
                event.stopPropagation();

                // Single left click - strictly for showing context menu/selecting
                const syntheticEvent = {
                    clientX: event.clientX,
                    clientY: event.clientY,
                    shiftKey: event.shiftKey,
                    ctrlKey: event.ctrlKey,
                    metaKey: event.metaKey,
                    button: 0,
                    stopPropagation: () => event.stopPropagation?.(),
                    preventDefault: () => event.preventDefault?.(),
                } as unknown as React.MouseEvent;

                onNodeClick(d.id, syntheticEvent);
            })
            .on('dblclick', (event, d) => {
                event.stopPropagation();
                if (onNodeDoubleClick) onNodeDoubleClick(d.id);
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
            })
            .on('contextmenu', (event, d) => {
                // Block default browser menu
                event.preventDefault();
                event.stopPropagation();

                console.log('Node ContextMenu (Right-Click):', d.id);

                // Right-click triggers expansion directly as requested
                if (onNodeContextMenu) {
                    onNodeContextMenu(d.id, event.clientX, event.clientY);
                }
            });

        // REHEAT simulation when data changes
        if (simulation) {
            simulation.alpha(1).restart();
        }

        // Background click - clear hover
        svg.on('click', (event) => {
            if (event.target === svgRef.current) {
                console.log('Background clicked');
                onBackgroundClick();
                onNodeHover(null);
            }
        });

        // Clear hover when mouse leaves the graph area
        svg.on('mouseleave', () => {
            onNodeHover(null);
        });


        // TICK HANDLER - Updates all positions on every frame (proper D3 pattern)
        simulation.on('tick', () => {
            // Update link paths - curved arcs between source and target
            linkElements.attr('d', d => {
                const source = d.source as D3Node;
                const target = d.target as D3Node;
                if (source.x == null || source.y == null || target.x == null || target.y == null) {
                    return '';
                }

                if (source.id === target.id) {
                    // Self-loop: Render as a circular arc offset from node
                    const x = source.x;
                    const y = source.y;
                    const r = getNodeSize(source) * 1.5;
                    // Slightly more readable self-loop arc
                    return `M ${x},${y} m ${-r},0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 ${-r * 2},0`;
                }

                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 1.2; // Slightly more curved
                return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
            });

            // Update link labels - positioned at midpoint or above self-loops
            linkLabels.attr('transform', d => {
                const source = d.source as D3Node;
                const target = d.target as D3Node;
                if (source.x == null || source.y == null || target.x == null || target.y == null) {
                    return 'translate(0,0)';
                }

                if (source.id === target.id) {
                    // Position label above self-loop
                    const r = getNodeSize(source) * 1.5;
                    return `translate(${source.x}, ${source.y - r - 10})`;
                }

                const midX = (source.x + target.x) / 2;
                const midY = (source.y + target.y) / 2;
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const offsetX = -dy / len * 15;
                const offsetY = dx / len * 15;
                return `translate(${midX + offsetX}, ${midY + offsetY})`;
            });

            // Update node positions
            nodeGroups.attr('transform', d => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
        });

        // Cleanup
        return () => {
            simulation.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
        // CRITICAL: Only rebuild graph when DATA changes, NOT when callbacks change
        // Callbacks are accessed via closure and don't need to trigger rebuilds
    }, [d3Nodes, d3Links, dimensions, getNodeSize, getNodeColor, getLinkColor, strokeColor, textColor, isDark]);

    // Update visual states when selection/hover changes
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        // Calculate neighborhood for dimming effect
        // Dim on BOTH hover AND selection for focus during expansion
        const focusNodeId = hoveredNode || (selectedNodes.length === 1 ? selectedNodes[0] : null);
        const neighbors = new Set<string>();

        // Analytics scope neighbors
        const analyticsNeighbors = new Set<string>();
        if (analyticSelectionActive && analyticIncludeNeighbors && selectedNodes.length > 0) {
            d3Links.forEach(link => {
                const s = typeof link.source === 'string' ? link.source : (link.source as D3Node).id;
                const t = typeof link.target === 'string' ? link.target : (link.target as D3Node).id;
                if (selectedNodes.includes(s)) analyticsNeighbors.add(t);
                if (selectedNodes.includes(t)) analyticsNeighbors.add(s);
            });
        }

        if (focusNodeId) {
            neighbors.add(focusNodeId);
            // Include all selected nodes as neighbors too
            selectedNodes.forEach(id => neighbors.add(id));
            d3Links.forEach(link => {
                const sourceId = typeof link.source === 'string' ? link.source : (link.source as D3Node).id;
                const targetId = typeof link.target === 'string' ? link.target : (link.target as D3Node).id;

                if (sourceId === focusNodeId || selectedNodes.includes(sourceId)) neighbors.add(targetId);
                if (targetId === focusNodeId || selectedNodes.includes(targetId)) neighbors.add(sourceId);
            });
        }

        // Update node styles
        svg.selectAll<SVGGElement, D3Node>('.node-group')
            .each(function (d: any) {
                const group = d3.select(this);
                const isSelected = selectedNodes.includes(d.id);
                const isAnalyticNeighbor = analyticsNeighbors.has(d.id);
                const isFocused = focusNodeId && neighbors.has(d.id);
                const shouldDim = focusNodeId && !isFocused;

                // Selection styling
                const selectionColor = analyticSelectionActive ? '#000000' : '#10B981';
                const strokeWidth = isSelected ? 4 : 2;
                const strokeOpacity = isSelected ? 0.8 : (isAnalyticNeighbor ? 0.4 : 1);

                group.select('.node-circle')
                    .attr('stroke', isSelected ? selectionColor : (isAnalyticNeighbor ? selectionColor : strokeColor))
                    .attr('stroke-width', isSelected ? strokeWidth : (isAnalyticNeighbor ? 5 : 2))
                    .attr('opacity', shouldDim ? 0.15 : 1)
                    .attr('stroke-opacity', strokeOpacity)
                    .attr('stroke-dasharray', isAnalyticNeighbor && !isSelected ? '6,3' : 'none');

                group.select('.glow-ring')
                    .attr('stroke-opacity', isSelected ? (analyticSelectionActive ? 0.2 : 0.6) : (isAnalyticNeighbor ? 0.4 : 0))
                    .attr('stroke', isSelected || isAnalyticNeighbor ? selectionColor : 'none')
                    .attr('r', isSelected ? getNodeSize(d) + 12 : getNodeSize(d) + 8);

                group.select('.node-label')
                    .attr('opacity', shouldDim ? 0.1 : 1)
                    .attr('font-weight', isSelected || isAnalyticNeighbor ? '700' : '500')
                    .text((node: any) => (isSelected || isFocused) ? node.name : (node.name.length > 12 ? node.name.slice(0, 12) + '…' : node.name));
            });

        // Update link styles
        svg.selectAll<SVGPathElement, D3Link>('.link')
            .attr('stroke', d => {
                const sourceId = typeof d.source === 'string' ? d.source : (d.source as D3Node).id;
                const targetId = typeof d.target === 'string' ? d.target : (d.target as D3Node).id;

                if (analyticSelectionActive && selectedNodes.includes(sourceId) && selectedNodes.includes(targetId)) {
                    return '#000000';
                }
                return '#94a3b8';
            })
            .attr('stroke-opacity', d => {
                const sourceId = typeof d.source === 'string' ? d.source : (d.source as D3Node).id;
                const targetId = typeof d.target === 'string' ? d.target : (d.target as D3Node).id;

                const isLinkFocused = focusNodeId && (neighbors.has(sourceId) && neighbors.has(targetId));
                const isCorrelation = analyticSelectionActive && selectedNodes.includes(sourceId) && selectedNodes.includes(targetId);

                if (isCorrelation) return 1;
                if (isLinkFocused) return 0.6;
                if (focusNodeId) return 0.04;

                if (selectedNodes.includes(sourceId) || selectedNodes.includes(targetId)) return 0.6;
                return 0.3;
            })
            .attr('stroke-width', d => {
                const sourceId = typeof d.source === 'string' ? d.source : (d.source as D3Node).id;
                const targetId = typeof d.target === 'string' ? d.target : (d.target as D3Node).id;

                const isCorrelation = analyticSelectionActive && selectedNodes.includes(sourceId) && selectedNodes.includes(targetId);
                if (isCorrelation) return 2.5;
                if (focusNodeId && (neighbors.has(sourceId) && neighbors.has(targetId))) return 2.5;
                if (selectedNodes.includes(sourceId) || selectedNodes.includes(targetId)) return 2.5;
                return 1.5;
            });

        // Update link labels - only show for focused connections
        svg.selectAll<SVGTextElement, D3Link>('.link-label')
            .attr('opacity', d => {
                const sourceId = typeof d.source === 'string' ? d.source : (d.source as D3Node).id;
                const targetId = typeof d.target === 'string' ? d.target : (d.target as D3Node).id;
                const isLinkFocused = focusNodeId && (neighbors.has(sourceId) && neighbors.has(targetId));
                return isLinkFocused ? 1 : 0;
            });

    }, [selectedNodes, hoveredNode, strokeColor, d3Links, analyticSelectionActive]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative"
            style={{ backgroundColor: bgColor }}
        >
            <IngestionProgressHUD />
            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className="w-full h-full"
            />
        </div>
    );
}
