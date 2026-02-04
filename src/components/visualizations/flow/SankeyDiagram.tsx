/**
 * Sankey Diagram
 * 
 * Flow visualization showing relationships and their weights.
 * Perfect for displaying entity connections and knowledge flow.
 */
'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { motion } from 'framer-motion';
import type { ChartNode, ChartLink, ChartConfig, ChartInteraction } from '../types';
import { COLOR_PALETTES } from '../types';

interface SankeyData {
    nodes: ChartNode[];
    links: ChartLink[];
}

interface SankeyDiagramProps {
    data: SankeyData;
    config?: ChartConfig;
    colorPalette?: keyof typeof COLOR_PALETTES;
    onInteraction?: ChartInteraction;
    className?: string;
}

export function SankeyDiagram({
    data,
    config = {},
    colorPalette = 'neural',
    onInteraction,
    className = '',
}: SankeyDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredNode, setHoveredNode] = useState<ChartNode | null>(null);
    const [hoveredLink, setHoveredLink] = useState<ChartLink | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    const colors = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.neural;

    // Resize observer
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({
                width: config.width || width,
                height: config.height || height,
            });
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [config.width, config.height]);

    // Render chart
    useEffect(() => {
        if (!svgRef.current || !data.nodes.length) return;

        const { width, height } = dimensions;
        const margin = config.margin || { top: 10, right: 10, bottom: 10, left: 10 };

        // Clear previous
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3
            .select(svgRef.current)
            .attr('width', width)
            .attr('height', height);

        // Create node index map
        const nodeMap = new Map(data.nodes.map((n, i) => [n.id, i]));

        // Convert links to use indices
        const sankeyLinks = data.links
            .filter((l) => nodeMap.has(l.source) && nodeMap.has(l.target))
            .map((l) => ({
                source: nodeMap.get(l.source)!,
                target: nodeMap.get(l.target)!,
                value: l.value || 1,
                originalLink: l,
            }));

        // Create sankey layout
        const sankeyLayout = sankey<ChartNode, typeof sankeyLinks[0]>()
            .nodeId((d, i) => i)
            .nodeWidth(15)
            .nodePadding(10)
            .extent([
                [margin.left, margin.top],
                [width - margin.right, height - margin.bottom],
            ]);

        const { nodes, links } = sankeyLayout({
            nodes: data.nodes.map((n) => ({ ...n })),
            links: sankeyLinks,
        });

        // Color scale
        const colorScale = d3
            .scaleOrdinal<string>()
            .domain(data.nodes.map((n) => n.group || n.type || 'default'))
            .range(colors);

        // Draw links
        svg
            .append('g')
            .attr('fill', 'none')
            .selectAll('path')
            .data(links)
            .enter()
            .append('path')
            .attr('d', sankeyLinkHorizontal())
            .attr('stroke', (d: any) => {
                const sourceNode = d.source as SankeyNode<ChartNode, typeof sankeyLinks[0]>;
                return colorScale(sourceNode.group || sourceNode.type || 'default');
            })
            .attr('stroke-width', (d: any) => Math.max(1, d.width || 1))
            .attr('stroke-opacity', 0.4)
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d: any) {
                d3.select(this).attr('stroke-opacity', 0.7);
                setHoveredLink(d.originalLink);
                onInteraction?.onLinkHover?.(d.originalLink);
            })
            .on('mouseleave', function () {
                d3.select(this).attr('stroke-opacity', 0.4);
                setHoveredLink(null);
                onInteraction?.onLinkHover?.(null);
            })
            .on('click', (event, d: any) => {
                onInteraction?.onLinkClick?.(d.originalLink);
            });

        // Draw nodes
        const nodeGroups = svg
            .append('g')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d: any) {
                setHoveredNode(d);
                onInteraction?.onNodeHover?.(d);
            })
            .on('mouseleave', function () {
                setHoveredNode(null);
                onInteraction?.onNodeHover?.(null);
            })
            .on('click', (event, d: any) => {
                onInteraction?.onNodeClick?.(d);
            });

        // Node rectangles
        nodeGroups
            .append('rect')
            .attr('x', (d: any) => d.x0)
            .attr('y', (d: any) => d.y0)
            .attr('height', (d: any) => Math.max(1, d.y1 - d.y0))
            .attr('width', (d: any) => d.x1 - d.x0)
            .attr('fill', (d: any) => colorScale(d.group || d.type || 'default'))
            .attr('rx', 3)
            .attr('stroke', 'currentColor')
            .attr('stroke-opacity', 0.2);

        // Node labels
        if (config.showLabels !== false) {
            nodeGroups
                .append('text')
                .attr('x', (d: any) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
                .attr('y', (d: any) => (d.y1 + d.y0) / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', (d: any) => (d.x0 < width / 2 ? 'start' : 'end'))
                .attr('font-size', '11px')
                .attr('fill', 'currentColor')
                .text((d: any) => d.name);
        }

        // Animation
        if (config.animated !== false) {
            svg
                .selectAll('path')
                .attr('stroke-dasharray', function (this: SVGPathElement) {
                    const length = this.getTotalLength?.() || 0;
                    return `${length} ${length}`;
                })
                .attr('stroke-dashoffset', function (this: SVGPathElement) {
                    return this.getTotalLength?.() || 0;
                })
                .transition()
                .duration(1000)
                .attr('stroke-dashoffset', 0);

            svg
                .selectAll('rect')
                .attr('opacity', 0)
                .transition()
                .duration(500)
                .delay((d, i) => i * 30)
                .attr('opacity', 1);
        }
    }, [data, dimensions, colors, config, onInteraction]);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`relative w-full h-full min-h-[300px] ${className}`}
        >
            <svg ref={svgRef} className="w-full h-full" />

            {/* Node Tooltip */}
            {hoveredNode && config.showTooltip !== false && (
                <div className="absolute bottom-4 left-4 px-3 py-2 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-lg">
                    <div className="font-medium text-foreground">{hoveredNode.name}</div>
                    {hoveredNode.type && (
                        <div className="text-xs text-muted-foreground">{hoveredNode.type}</div>
                    )}
                    {hoveredNode.value !== undefined && (
                        <div className="text-sm text-muted-foreground">
                            Value: {hoveredNode.value.toLocaleString()}
                        </div>
                    )}
                </div>
            )}

            {/* Link Tooltip */}
            {hoveredLink && config.showTooltip !== false && (
                <div className="absolute bottom-4 right-4 px-3 py-2 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-lg">
                    <div className="text-sm text-foreground">
                        {hoveredLink.source} → {hoveredLink.target}
                    </div>
                    {hoveredLink.value !== undefined && (
                        <div className="text-xs text-muted-foreground">
                            Flow: {hoveredLink.value.toLocaleString()}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
