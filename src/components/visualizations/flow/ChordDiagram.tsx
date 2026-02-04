/**
 * Chord Diagram
 * 
 * Circular flow visualization showing relationships between entities.
 * Excellent for displaying interconnections and flow patterns.
 */
'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import type { ChartConfig, ChartInteraction } from '../types';
import { COLOR_PALETTES } from '../types';

interface ChordData {
    names: string[];
    matrix: number[][];
}

interface ChordDiagramProps {
    data: ChordData;
    config?: ChartConfig;
    colorPalette?: keyof typeof COLOR_PALETTES;
    onInteraction?: ChartInteraction;
    className?: string;
}

export function ChordDiagram({
    data,
    config = {},
    colorPalette = 'neural',
    onInteraction,
    className = '',
}: ChordDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [dimensions, setDimensions] = useState({ width: 500, height: 500 });

    const colors = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.neural;

    // Resize observer
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            const size = Math.min(width, height);
            setDimensions({
                width: config.width || size,
                height: config.height || size,
            });
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [config.width, config.height]);

    // Render chart
    useEffect(() => {
        if (!svgRef.current || !data.matrix.length) return;

        const { width, height } = dimensions;
        const outerRadius = Math.min(width, height) * 0.5 - 40;
        const innerRadius = outerRadius - 20;

        // Clear previous
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3
            .select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // Create chord layout
        const chord = d3
            .chord()
            .padAngle(0.05)
            .sortSubgroups(d3.descending);

        const chords = chord(data.matrix);

        // Color scale
        const colorScale = d3
            .scaleOrdinal<number, string>()
            .domain(d3.range(data.names.length))
            .range(colors);

        // Arc generator for groups
        const arc = d3
            .arc<d3.ChordGroup>()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius);

        // Ribbon generator for chords
        const ribbon = d3.ribbon().radius(innerRadius);

        // Draw groups (outer arcs)
        const groups = svg
            .append('g')
            .selectAll('g')
            .data(chords.groups)
            .enter()
            .append('g');

        groups
            .append('path')
            .attr('fill', (d) => colorScale(d.index))
            .attr('stroke', (d) => d3.color(colorScale(d.index))?.darker().toString() || '#000')
            .attr('d', arc as any)
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d) {
                setHoveredIndex(d.index);
                // Fade non-related chords
                svg
                    .selectAll('.chord')
                    .attr('opacity', (c: any) =>
                        c.source.index === d.index || c.target.index === d.index ? 0.8 : 0.1
                    );
            })
            .on('mouseleave', function () {
                setHoveredIndex(null);
                svg.selectAll('.chord').attr('opacity', 0.7);
            })
            .on('click', (event, d) => {
                onInteraction?.onNodeClick?.({
                    id: data.names[d.index],
                    name: data.names[d.index],
                    value: d.value,
                });
            });

        // Group labels
        if (config.showLabels !== false) {
            groups
                .append('text')
                .each((d: any) => {
                    d.angle = (d.startAngle + d.endAngle) / 2;
                })
                .attr('dy', '0.35em')
                .attr('transform', (d: any) => {
                    const rotate = (d.angle * 180) / Math.PI - 90;
                    const translate = outerRadius + 10;
                    const flip = d.angle > Math.PI ? 'rotate(180)' : '';
                    return `rotate(${rotate}) translate(${translate}) ${flip}`;
                })
                .attr('text-anchor', (d: any) => (d.angle > Math.PI ? 'end' : 'start'))
                .attr('font-size', '11px')
                .attr('fill', 'currentColor')
                .text((d) => data.names[d.index]);
        }

        // Draw chords (ribbons)
        svg
            .append('g')
            .attr('fill-opacity', 0.7)
            .selectAll('path')
            .data(chords)
            .enter()
            .append('path')
            .attr('class', 'chord')
            .attr('d', ribbon as any)
            .attr('fill', (d) => colorScale(d.source.index))
            .attr('stroke', (d) =>
                d3.color(colorScale(d.source.index))?.darker().toString() || '#000'
            )
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d) {
                d3.select(this).attr('fill-opacity', 1);
                onInteraction?.onLinkHover?.({
                    source: data.names[d.source.index],
                    target: data.names[d.target.index],
                    value: d.source.value,
                });
            })
            .on('mouseleave', function () {
                d3.select(this).attr('fill-opacity', 0.7);
                onInteraction?.onLinkHover?.(null);
            })
            .on('click', (event, d) => {
                onInteraction?.onLinkClick?.({
                    source: data.names[d.source.index],
                    target: data.names[d.target.index],
                    value: d.source.value,
                });
            });

        // Animation
        if (config.animated !== false) {
            svg
                .selectAll('path')
                .attr('opacity', 0)
                .transition()
                .duration(800)
                .delay((d, i) => i * 20)
                .attr('opacity', (d: any) => (d.source ? 0.7 : 1));
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
            {hoveredIndex !== null && config.showTooltip !== false && (
                <div className="absolute top-4 left-4 px-3 py-2 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-lg">
                    <div className="font-medium text-foreground">
                        {data.names[hoveredIndex]}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {data.matrix[hoveredIndex].reduce((a, b) => a + b, 0)} total connections
                    </div>
                </div>
            )}
        </motion.div>
    );
}
