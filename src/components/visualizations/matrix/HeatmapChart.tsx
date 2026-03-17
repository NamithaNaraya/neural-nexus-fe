/**
 * Heatmap Chart
 * 
 * Matrix visualization showing intensity of relationships.
 * Perfect for co-occurrence analysis and similarity matrices.
 */
'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import type { ChartConfig, ChartInteraction } from '../types';
import { COLOR_PALETTES } from '../types';

interface HeatmapData {
    rows: string[];
    columns: string[];
    values: number[][];
}

interface HeatmapChartProps {
    data: HeatmapData;
    config?: ChartConfig;
    colorScheme?: 'warm' | 'cool' | 'diverging';
    onInteraction?: ChartInteraction;
    className?: string;
}

export function HeatmapChart({
    data,
    config = {},
    colorScheme = 'warm',
    onInteraction,
    className = '',
}: HeatmapChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredCell, setHoveredCell] = useState<{
        row: string;
        col: string;
        value: number;
    } | null>(null);
    const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

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
        if (!svgRef.current || !data.values.length) return;

        const { width, height } = dimensions;
        const margin = config.margin || { top: 60, right: 30, bottom: 30, left: 100 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Clear previous
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3
            .select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Flatten values for color scale
        const allValues = data.values.flat();
        const minVal = d3.min(allValues) || 0;
        const maxVal = d3.max(allValues) || 1;

        // Color scale
        const colorScale = (() => {
            const colors = COLOR_PALETTES[colorScheme] as any;
            if (colorScheme === 'diverging') {
                return d3.scaleDiverging<string>()
                    .domain([minVal, (minVal + maxVal) / 2, maxVal])
                    .interpolator(d3.interpolateRgbBasis(colors));
            }
            return d3.scaleSequential<string>()
                .domain([minVal, maxVal])
                .interpolator(d3.interpolateRgbBasis(colors));
        })();

        // Scales
        const xScale = d3
            .scaleBand()
            .domain(data.columns)
            .range([0, innerWidth])
            .padding(0.05);

        const yScale = d3
            .scaleBand()
            .domain(data.rows)
            .range([0, innerHeight])
            .padding(0.05);

        // Draw cells
        const rows = svg
            .selectAll('g.row')
            .data(data.values)
            .enter()
            .append('g')
            .attr('class', 'row')
            .attr('transform', (d, i) => `translate(0,${yScale(data.rows[i])})`);

        rows
            .selectAll('rect')
            .data((row, rowIndex) =>
                row.map((value, colIndex) => ({
                    value,
                    row: data.rows[rowIndex],
                    col: data.columns[colIndex],
                }))
            )
            .enter()
            .append('rect')
            .attr('x', (d) => xScale(d.col) || 0)
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', (d) => colorScale(d.value))
            .attr('rx', 2)
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d) {
                d3.select(this).attr('stroke', 'currentColor').attr('stroke-width', 2);
                setHoveredCell(d);
            })
            .on('mouseleave', function () {
                d3.select(this).attr('stroke', 'none');
                setHoveredCell(null);
            })
            .on('click', (event, d) => {
                onInteraction?.onNodeClick?.({
                    id: `${d.row}-${d.col}`,
                    name: `${d.row} × ${d.col}`,
                    value: d.value,
                });
            });

        // Animation
        if (config.animated !== false) {
            rows
                .selectAll('rect')
                .attr('opacity', 0)
                .transition()
                .duration(500)
                .delay((d, i) => i * 20)
                .attr('opacity', 1);
        }

        // X axis (column labels)
        svg
            .append('g')
            .attr('transform', `translate(0,${-5})`)
            .selectAll('text')
            .data(data.columns)
            .enter()
            .append('text')
            .attr('x', (d) => (xScale(d) || 0) + xScale.bandwidth() / 2)
            .attr('y', 0)
            .attr('text-anchor', 'start')
            .attr('transform', (d) => `rotate(-45,${(xScale(d) || 0) + xScale.bandwidth() / 2},0)`)
            .attr('font-size', '10px')
            .attr('fill', 'currentColor')
            .text((d) => d.slice(0, 12) + (d.length > 12 ? '...' : ''));

        // Y axis (row labels)
        svg
            .append('g')
            .attr('transform', `translate(${-5},0)`)
            .selectAll('text')
            .data(data.rows)
            .enter()
            .append('text')
            .attr('x', 0)
            .attr('y', (d) => (yScale(d) || 0) + yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .attr('font-size', '10px')
            .attr('fill', 'currentColor')
            .text((d) => d.slice(0, 12) + (d.length > 12 ? '...' : ''));

        // Legend
        if (config.showLegend !== false) {
            const legendWidth = 200;
            const legendHeight = 10;

            const legendScale = d3
                .scaleLinear()
                .domain([minVal, maxVal])
                .range([0, legendWidth]);

            const legendAxis = d3
                .axisBottom(legendScale)
                .ticks(5)
                .tickFormat((d) => d.toLocaleString());

            const legendGroup = svg
                .append('g')
                .attr('transform', `translate(${innerWidth - legendWidth},${innerHeight + 20})`);

            // Gradient
            const gradientId = `heatmap-gradient-${Math.random().toString(36).slice(2)}`;
            const defs = svg.append('defs');
            const gradient = defs
                .append('linearGradient')
                .attr('id', gradientId);

            const colors = COLOR_PALETTES[colorScheme];
            colors.forEach((color, i) => {
                gradient
                    .append('stop')
                    .attr('offset', `${(i / (colors.length - 1)) * 100}%`)
                    .attr('stop-color', color);
            });

            legendGroup
                .append('rect')
                .attr('width', legendWidth)
                .attr('height', legendHeight)
                .attr('fill', `url(#${gradientId})`)
                .attr('rx', 2);

            legendGroup
                .append('g')
                .attr('transform', `translate(0,${legendHeight})`)
                .call(legendAxis)
                .selectAll('text')
                .attr('font-size', '9px')
                .attr('fill', 'currentColor');
        }
    }, [data, dimensions, colorScheme, config, onInteraction]);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`relative w-full h-full min-h-[300px] ${className}`}
        >
            <svg ref={svgRef} className="w-full h-full" />

            {/* Tooltip */}
            {hoveredCell && config.showTooltip !== false && (
                <div className="absolute top-4 right-4 px-3 py-2 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-lg">
                    <div className="font-medium text-foreground">
                        {hoveredCell.row} × {hoveredCell.col}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Value: {hoveredCell.value.toLocaleString()}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
