/**
 * Island Layout Component
 * 
 * Multi-folder "Island" visualization for the "All My Files" view.
 * Different folder topics are rendered as separated "Floating Islands"
 * to prevent visual clutter, with connections only appearing via bridging.
 * 
 * Features:
 * - Separated islands per folder/topic
 * - Inter-island connections (bridges)
 * - Smooth animations between views
 * - Per-island controls and stats
 */
'use client';

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layers,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Move,
    Link2,
    Grid,
    Circle,
    Folder,
    ChevronDown,
    Eye,
    EyeOff,
} from 'lucide-react';

interface IslandNode {
    id: string;
    name: string;
    type: string;
    x?: number;
    y?: number;
    folderId: string;
}

interface IslandLink {
    source: string;
    target: string;
    type: string;
    isBridge?: boolean;
}

interface Island {
    id: string;
    name: string;
    color: string;
    nodes: IslandNode[];
    links: IslandLink[];
    x: number;
    y: number;
    radius: number;
    visible: boolean;
}

interface IslandLayoutProps {
    folders: Array<{
        id: string;
        name: string;
        nodes: IslandNode[];
        links: IslandLink[];
    }>;
    bridgeLinks?: IslandLink[];
    width?: number;
    height?: number;
    onNodeClick?: (node: IslandNode) => void;
    onIslandClick?: (island: Island) => void;
    onBridgeClick?: (link: IslandLink) => void;
}

// Color palette for islands
const ISLAND_COLORS = [
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#EF4444', // Red
    '#84CC16', // Lime
];

export function IslandLayout({
    folders,
    bridgeLinks = [],
    width = 1200,
    height = 800,
    onNodeClick,
    onIslandClick,
    onBridgeClick,
}: IslandLayoutProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [transform, setTransform] = useState(d3.zoomIdentity);
    const [hoveredIsland, setHoveredIsland] = useState<string | null>(null);
    const [showBridges, setShowBridges] = useState(true);
    const [visibleIslands, setVisibleIslands] = useState<Set<string>>(new Set());
    const [selectedIsland, setSelectedIsland] = useState<string | null>(null);

    // Calculate islands layout
    const islands = useMemo(() => {
        const islandCount = folders.length;
        const centerX = width / 2;
        const centerY = height / 2;
        const layoutRadius = Math.min(width, height) * 0.35;

        return folders.map((folder, index) => {
            const angle = (2 * Math.PI * index) / islandCount - Math.PI / 2;
            const islandRadius = Math.max(80, Math.sqrt(folder.nodes.length) * 15);

            return {
                id: folder.id,
                name: folder.name,
                color: ISLAND_COLORS[index % ISLAND_COLORS.length],
                nodes: folder.nodes.map(node => ({
                    ...node,
                    folderId: folder.id,
                })),
                links: folder.links,
                x: centerX + Math.cos(angle) * layoutRadius,
                y: centerY + Math.sin(angle) * layoutRadius,
                radius: islandRadius,
                visible: true,
            };
        });
    }, [folders, width, height]);

    // Initialize visible islands
    useEffect(() => {
        setVisibleIslands(new Set(islands.map(i => i.id)));
    }, [islands]);

    // Position nodes within each island
    const positionedIslands = useMemo(() => {
        return islands.map(island => {
            const nodeCount = island.nodes.length;
            const positioned = island.nodes.map((node, i) => {
                const angle = (2 * Math.PI * i) / nodeCount;
                const r = island.radius * 0.6;
                return {
                    ...node,
                    x: island.x + Math.cos(angle) * r,
                    y: island.y + Math.sin(angle) * r,
                };
            });
            return { ...island, nodes: positioned };
        });
    }, [islands]);

    // Find bridge connections between islands
    const bridges = useMemo(() => {
        const allNodes = new Map<string, { node: IslandNode; island: Island }>();
        positionedIslands.forEach(island => {
            island.nodes.forEach(node => {
                allNodes.set(node.id, { node, island });
            });
        });

        return bridgeLinks.map(link => {
            const sourceInfo = allNodes.get(link.source);
            const targetInfo = allNodes.get(link.target);

            if (sourceInfo && targetInfo && sourceInfo.island.id !== targetInfo.island.id) {
                return {
                    ...link,
                    isBridge: true,
                    sourceNode: sourceInfo.node,
                    targetNode: targetInfo.node,
                    sourceIsland: sourceInfo.island,
                    targetIsland: targetInfo.island,
                };
            }
            return null;
        }).filter(Boolean);
    }, [positionedIslands, bridgeLinks]);

    // Toggle island visibility
    const toggleIsland = useCallback((islandId: string) => {
        setVisibleIslands(prev => {
            const next = new Set(prev);
            if (next.has(islandId)) {
                next.delete(islandId);
            } else {
                next.add(islandId);
            }
            return next;
        });
    }, []);

    // Render the visualization
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Create zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                setTransform(event.transform);
            });

        svg.call(zoom);

        // Create container group with transform
        const g = svg.append('g')
            .attr('transform', transform.toString());

        // Draw islands
        positionedIslands.forEach(island => {
            if (!visibleIslands.has(island.id)) return;

            const islandGroup = g.append('g')
                .attr('class', 'island')
                .attr('data-island-id', island.id);

            // Island background circle
            islandGroup.append('circle')
                .attr('cx', island.x)
                .attr('cy', island.y)
                .attr('r', island.radius)
                .attr('fill', `${island.color}10`)
                .attr('stroke', island.color)
                .attr('stroke-width', hoveredIsland === island.id ? 3 : 1.5)
                .attr('stroke-dasharray', hoveredIsland === island.id ? 'none' : '4,4')
                .style('cursor', 'pointer')
                .on('mouseenter', () => setHoveredIsland(island.id))
                .on('mouseleave', () => setHoveredIsland(null))
                .on('click', () => {
                    setSelectedIsland(island.id);
                    onIslandClick?.(island);
                });

            // Island label
            islandGroup.append('text')
                .attr('x', island.x)
                .attr('y', island.y - island.radius - 12)
                .attr('text-anchor', 'middle')
                .attr('fill', island.color)
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .text(island.name);

            // Node count badge
            islandGroup.append('text')
                .attr('x', island.x)
                .attr('y', island.y - island.radius + 4)
                .attr('text-anchor', 'middle')
                .attr('fill', 'rgba(255,255,255,0.7)')
                .attr('font-size', '10px')
                .text(`${island.nodes.length} nodes`);

            // Internal links
            island.links.forEach(link => {
                const sourceNode = island.nodes.find(n => n.id === link.source);
                const targetNode = island.nodes.find(n => n.id === link.target);

                if (sourceNode && targetNode) {
                    islandGroup.append('line')
                        .attr('x1', sourceNode.x!)
                        .attr('y1', sourceNode.y!)
                        .attr('x2', targetNode.x!)
                        .attr('y2', targetNode.y!)
                        .attr('stroke', 'rgba(255,255,255,0.2)')
                        .attr('stroke-width', 1);
                }
            });

            // Nodes
            island.nodes.forEach(node => {
                islandGroup.append('circle')
                    .attr('cx', node.x!)
                    .attr('cy', node.y!)
                    .attr('r', 4)
                    .attr('fill', island.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1)
                    .style('cursor', 'pointer')
                    .on('click', () => onNodeClick?.(node));
            });
        });

        // Draw bridges (cross-island connections)
        if (showBridges) {
            const bridgeGroup = g.append('g').attr('class', 'bridges');

            bridges.forEach((bridge: any) => {
                if (!bridge) return;
                if (!visibleIslands.has(bridge.sourceIsland.id) || !visibleIslands.has(bridge.targetIsland.id)) return;

                // Draw curved bridge line
                const midX = (bridge.sourceNode.x + bridge.targetNode.x) / 2;
                const midY = (bridge.sourceNode.y + bridge.targetNode.y) / 2 - 30;

                const pathData = `M ${bridge.sourceNode.x} ${bridge.sourceNode.y} Q ${midX} ${midY} ${bridge.targetNode.x} ${bridge.targetNode.y}`;

                bridgeGroup.append('path')
                    .attr('d', pathData)
                    .attr('fill', 'none')
                    .attr('stroke', 'url(#bridgeGradient)')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '6,4')
                    .attr('opacity', 0.8)
                    .style('cursor', 'pointer')
                    .on('click', () => onBridgeClick?.(bridge));
            });
        }

        // Create gradient for bridge lines
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'bridgeGradient')
            .attr('gradientUnits', 'userSpaceOnUse');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#10B981');

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#3B82F6');

    }, [positionedIslands, bridges, transform, hoveredIsland, visibleIslands, showBridges, onNodeClick, onIslandClick, onBridgeClick]);

    return (
        <div className="relative w-full h-full bg-background rounded-xl overflow-hidden">
            {/* Controls */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="flex gap-1 p-1 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
                    <button
                        onClick={() => {
                            if (svgRef.current) {
                                d3.select(svgRef.current).transition().call(
                                    d3.zoom<SVGSVGElement, unknown>().transform as any,
                                    d3.zoomIdentity.scale(1.5)
                                );
                            }
                        }}
                        className="p-2 hover:bg-muted rounded transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            if (svgRef.current) {
                                d3.select(svgRef.current).transition().call(
                                    d3.zoom<SVGSVGElement, unknown>().transform as any,
                                    d3.zoomIdentity.scale(0.7)
                                );
                            }
                        }}
                        className="p-2 hover:bg-muted rounded transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            if (svgRef.current) {
                                d3.select(svgRef.current).transition().call(
                                    d3.zoom<SVGSVGElement, unknown>().transform as any,
                                    d3.zoomIdentity
                                );
                            }
                        }}
                        className="p-2 hover:bg-muted rounded transition-colors"
                        title="Reset View"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>

                <button
                    onClick={() => setShowBridges(!showBridges)}
                    className={`p-2 rounded-lg border transition-colors ${showBridges
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                            : 'bg-card/80 border-border text-muted-foreground'
                        }`}
                    title="Toggle Cross-Topic Bridges"
                >
                    <Link2 className="w-4 h-4" />
                </button>
            </div>

            {/* Island Legend / Visibility Controls */}
            <div className="absolute top-4 right-4 z-10 bg-card/80 backdrop-blur-sm rounded-lg border border-border p-3 max-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">Topic Islands</span>
                </div>
                <div className="space-y-1">
                    {islands.map(island => (
                        <button
                            key={island.id}
                            onClick={() => toggleIsland(island.id)}
                            className={`w-full flex items-center gap-2 p-1.5 rounded text-xs transition-colors ${visibleIslands.has(island.id)
                                    ? 'bg-muted/50 text-foreground'
                                    : 'text-muted-foreground opacity-50'
                                }`}
                        >
                            <Circle
                                className="w-3 h-3"
                                fill={island.color}
                                stroke={island.color}
                            />
                            <span className="flex-1 text-left truncate">{island.name}</span>
                            {visibleIslands.has(island.id) ? (
                                <Eye className="w-3 h-3" />
                            ) : (
                                <EyeOff className="w-3 h-3" />
                            )}
                        </button>
                    ))}
                </div>
                {bridges.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-[10px] text-muted-foreground">
                            {bridges.length} cross-topic connection{bridges.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </div>

            {/* Selected Island Info */}
            <AnimatePresence>
                {selectedIsland && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-card/90 backdrop-blur-sm rounded-lg border border-border p-3"
                    >
                        {(() => {
                            const island = islands.find(i => i.id === selectedIsland);
                            if (!island) return null;
                            return (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Folder className="w-4 h-4" style={{ color: island.color }} />
                                        <span className="font-medium text-foreground">{island.name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {island.nodes.length} nodes • {island.links.length} links
                                    </div>
                                    <button
                                        onClick={() => setSelectedIsland(null)}
                                        className="p-1 hover:bg-muted rounded"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SVG Canvas */}
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="w-full h-full"
            />
        </div>
    );
}

export default IslandLayout;
