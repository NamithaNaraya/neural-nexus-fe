/**
 * Sunburst Chart
 * 
 * Radial hierarchical visualization showing nested categories.
 * Perfect for displaying entity type distributions and folder structures.
 */
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import type { HierarchyNode, ChartConfig, ChartInteraction, ColorPalette } from '../types';
import { COLOR_PALETTES } from '../types';

interface SunburstChartProps {
    data: HierarchyNode;
    config?: ChartConfig;
    colorPalette?: ColorPalette;
    onInteraction?: ChartInteraction;
    className?: string;
}

export function SunburstChart({
    data,
    config = {},
    colorPalette = 'neural',
    onInteraction,
    className = '',
}: SunburstChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredNode, setHoveredNode] = useState<HierarchyNode | null>(null);
    const [dimensions, setDimensions] = useState({ width: 500, height: 500 });

    // Get color from palette
    const colors = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.neural;

    // Resize observer
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({
                width: config.width || width,
                height: config.height || Math.min(height, width),
            });
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [config.width, config.height]);

    // Render chart
    useEffect(() => {
        if (!svgRef.current || !data) return;

        const { width, height } = dimensions;
        const radius = Math.min(width, height) / 2;

        // Clear previous
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3
            .select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // Create hierarchy
        const root = d3
            .hierarchy(data)
            .sum((d) => d.value || 1)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        // Create partition layout
        const partition = d3.partition<HierarchyNode>().size([2 * Math.PI, radius]);

        partition(root);

        // Arc generator
        const arc = d3
            .arc<d3.HierarchyRectangularNode<HierarchyNode>>()
            .startAngle((d) => d.x0)
            .endAngle((d) => d.x1)
            .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius((d) => d.y0)
            .outerRadius((d) => d.y1 - 1);

        // Color scale
        const colorScale = d3
            .scaleOrdinal<string>()
            .domain(root.children?.map((d) => d.data.name) || [])
            .range(colors);

        // Get ancestor color
        const getColor = (d: d3.HierarchyRectangularNode<HierarchyNode>) => {
            let current = d;
            while (current.depth > 1 && current.parent) {
                current = current.parent;
            }
            return colorScale(current.data.name);
        };

        // Draw arcs
        const paths = svg
            .selectAll('path')
            .data(root.descendants().filter((d) => d.depth) as d3.HierarchyRectangularNode<HierarchyNode>[])
            .enter()
            .append('path')
            .attr('fill', (d: d3.HierarchyRectangularNode<HierarchyNode>) => {
                const baseColor = getColor(d);
                // Lighten for deeper levels
                const lighten = d.depth * 0.1;
                return d3.color(baseColor)?.brighter(lighten)?.toString() || baseColor;
            })
            .attr('fill-opacity', 0.9)
            .attr('d', arc as any)
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d) {
                d3.select(this).attr('fill-opacity', 1);
                setHoveredNode(d.data);
                onInteraction?.onNodeHover?.({
                    id: d.data.id,
                    name: d.data.name,
                    value: d.value,
                });
            })
            .on('mouseleave', function () {
                d3.select(this).attr('fill-opacity', 0.9);
                setHoveredNode(null);
                onInteraction?.onNodeHover?.(null);
            })
            .on('click', (event, d) => {
                onInteraction?.onNodeClick?.({
                    id: d.data.id,
                    name: d.data.name,
                    value: d.value,
                });
            });

        // Animation
        if (config.animated !== false) {
            paths
                .attr('opacity', 0)
                .transition()
                .duration(800)
                .delay((d, i) => i * 10)
                .attr('opacity', 1);
        }

        // Labels for larger segments
        if (config.showLabels !== false) {
            svg
                .selectAll('text')
                .data((root.descendants() as d3.HierarchyRectangularNode<HierarchyNode>[]).filter((d) => d.depth && (d.x1 - d.x0) > 0.1))
                .enter()
                .append('text')
                .attr('transform', (d: d3.HierarchyRectangularNode<HierarchyNode>) => {
                    const x = (d.x0 + d.x1) / 2;
                    const y = (d.y0 + d.y1) / 2;
                    const angle = (x * 180) / Math.PI - 90;
                    return `rotate(${angle}) translate(${y},0) rotate(${angle > 90 ? 180 : 0})`;
                })
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .attr('fill', 'currentColor')
                .attr('opacity', 0.8)
                .text((d) => d.data.name.slice(0, 10));
        }

        // Center label
        svg
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.5em')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .attr('fill', 'currentColor')
            .text(data.name);

        svg
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1em')
            .attr('font-size', '12px')
            .attr('fill', 'currentColor')
            .attr('opacity', 0.6)
            .text(`${root.descendants().length} items`);
    }, [data, dimensions, colors, config, onInteraction]);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`relative w-full h-full min-h-[300px] ${className}`}
        >
            <svg ref={svgRef} className="w-full h-full" />

            {/* Tooltip */}
            {hoveredNode && config.showTooltip !== false && (
                <div className="absolute bottom-4 left-4 px-3 py-2 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-lg">
                    <div className="font-medium text-foreground">{hoveredNode.name}</div>
                    {hoveredNode.value !== undefined && (
                        <div className="text-sm text-muted-foreground">
                            Value: {hoveredNode.value.toLocaleString()}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
