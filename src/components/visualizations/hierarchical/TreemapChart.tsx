/**
 * Treemap Chart
 * 
 * Rectangular hierarchical visualization showing nested proportions.
 * Ideal for displaying size-based entity distributions.
 */
'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import type { HierarchyNode, ChartConfig, ChartInteraction } from '../types';
import { COLOR_PALETTES } from '../types';

interface TreemapChartProps {
    data: HierarchyNode;
    config?: ChartConfig;
    colorPalette?: keyof typeof COLOR_PALETTES;
    onInteraction?: ChartInteraction;
    className?: string;
}

export function TreemapChart({
    data,
    config = {},
    colorPalette = 'neural',
    onInteraction,
    className = '',
}: TreemapChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredNode, setHoveredNode] = useState<HierarchyNode | null>(null);
    const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

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
        if (!svgRef.current || !data) return;

        const { width, height } = dimensions;
        const margin = config.margin || { top: 0, right: 0, bottom: 0, left: 0 };

        // Clear previous
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3
            .select(svgRef.current)
            .attr('width', width)
            .attr('height', height);

        // Create hierarchy
        const root = d3
            .hierarchy(data)
            .sum((d) => d.value || 1)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        // Create treemap layout
        const treemap = d3
            .treemap<HierarchyNode>()
            .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
            .paddingOuter(3)
            .paddingTop(19)
            .paddingInner(2)
            .round(true);

        treemap(root);

        // Color scale
        const colorScale = d3
            .scaleOrdinal<string>()
            .domain(root.children?.map((d) => d.data.name) || [])
            .range(colors);

        // Get top-level parent color
        const getColor = (d: d3.HierarchyRectangularNode<HierarchyNode>) => {
            let current = d;
            while (current.depth > 1 && current.parent) {
                current = current.parent;
            }
            return colorScale(current.data.name);
        };

        // Draw cells
        const cells = svg
            .selectAll('g')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('transform', (d: any) => `translate(${d.x0 + margin.left},${d.y0 + margin.top})`);

        // Cell rectangles
        cells
            .append('rect')
            .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
            .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
            .attr('fill', (d: any) => {
                if (d.depth === 0) return 'transparent';
                const baseColor = getColor(d);
                // Lighten for deeper levels
                const lighten = (d.depth - 1) * 0.15;
                return d3.color(baseColor)?.brighter(lighten)?.toString() || baseColor;
            })
            .attr('stroke', (d: any) => (d.depth === 1 ? 'currentColor' : 'none'))
            .attr('stroke-opacity', 0.2)
            .attr('rx', 3)
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d: any) {
                if (d.depth === 0) return;
                d3.select(this).attr('stroke', 'currentColor').attr('stroke-opacity', 0.5);
                setHoveredNode(d.data);
                onInteraction?.onNodeHover?.({
                    id: d.data.id,
                    name: d.data.name,
                    value: d.value,
                });
            })
            .on('mouseleave', function (event, d: any) {
                d3.select(this)
                    .attr('stroke', d.depth === 1 ? 'currentColor' : 'none')
                    .attr('stroke-opacity', 0.2);
                setHoveredNode(null);
                onInteraction?.onNodeHover?.(null);
            })
            .on('click', (event, d: any) => {
                if (d.depth === 0) return;
                onInteraction?.onNodeClick?.({
                    id: d.data.id,
                    name: d.data.name,
                    value: d.value,
                });
            });

        // Cell labels
        if (config.showLabels !== false) {
            // Parent labels (top of cell)
            cells
                .filter((d: any) => d.depth === 1)
                .append('text')
                .attr('x', 4)
                .attr('y', 14)
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .attr('fill', 'currentColor')
                .attr('opacity', 0.8)
                .text((d: any) => {
                    const width = d.x1 - d.x0;
                    const maxChars = Math.floor(width / 7);
                    const name = d.data.name;
                    return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
                });

            // Leaf labels (inside cell)
            cells
                .filter((d: any) => d.depth > 1 && (d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 20)
                .append('text')
                .attr('x', (d: any) => (d.x1 - d.x0) / 2)
                .attr('y', (d: any) => (d.y1 - d.y0) / 2)
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('font-size', '10px')
                .attr('fill', 'currentColor')
                .attr('opacity', 0.7)
                .text((d: any) => {
                    const width = d.x1 - d.x0;
                    const maxChars = Math.floor(width / 6);
                    const name = d.data.name;
                    return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
                });
        }

        // Animation
        if (config.animated !== false) {
            cells
                .selectAll('rect')
                .attr('opacity', 0)
                .transition()
                .duration(500)
                .delay((d: any, i) => i * 10)
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
