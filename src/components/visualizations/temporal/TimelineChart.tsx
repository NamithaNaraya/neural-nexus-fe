/**
 * Timeline Chart
 * 
 * Temporal visualization showing events over time.
 * Perfect for document history and entity evolution.
 */
'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import type { TimeSeries, ChartConfig, ChartInteraction } from '../types';
import { COLOR_PALETTES } from '../types';

interface TimelineData {
    series: TimeSeries[];
    events?: Array<{
        date: Date | string;
        label: string;
        type?: string;
    }>;
}

interface TimelineChartProps {
    data: TimelineData;
    config?: ChartConfig;
    colorPalette?: keyof typeof COLOR_PALETTES;
    onInteraction?: ChartInteraction;
    className?: string;
}

export function TimelineChart({
    data,
    config = {},
    colorPalette = 'neural',
    onInteraction,
    className = '',
}: TimelineChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredPoint, setHoveredPoint] = useState<{
        date: Date;
        value: number;
        series: string;
    } | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 300 });

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
        if (!svgRef.current || !data.series.length) return;

        const { width, height } = dimensions;
        const margin = config.margin || { top: 20, right: 30, bottom: 40, left: 50 };
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

        // Flatten all dates for scale
        const allDates = data.series.flatMap((s) =>
            s.values.map((v) => new Date(v.date))
        );
        const allValues = data.series.flatMap((s) => s.values.map((v) => v.value));

        // Scales
        const xScale = d3
            .scaleTime()
            .domain(d3.extent(allDates) as [Date, Date])
            .range([0, innerWidth]);

        const yScale = d3
            .scaleLinear()
            .domain([0, d3.max(allValues) || 1])
            .nice()
            .range([innerHeight, 0]);

        // Color scale
        const colorScale = d3
            .scaleOrdinal<string>()
            .domain(data.series.map((s) => s.id))
            .range(colors);

        // Line generator
        const line = d3
            .line<{ date: Date | string; value: number }>()
            .x((d) => xScale(new Date(d.date)))
            .y((d) => yScale(d.value))
            .curve(d3.curveMonotoneX);

        // Area generator for fill
        const area = d3
            .area<{ date: Date | string; value: number }>()
            .x((d) => xScale(new Date(d.date)))
            .y0(innerHeight)
            .y1((d) => yScale(d.value))
            .curve(d3.curveMonotoneX);

        // Draw areas
        data.series.forEach((series, i) => {
            svg
                .append('path')
                .datum(series.values)
                .attr('fill', colorScale(series.id))
                .attr('fill-opacity', 0.1)
                .attr('d', area);
        });

        // Draw lines
        data.series.forEach((series, i) => {
            const path = svg
                .append('path')
                .datum(series.values)
                .attr('fill', 'none')
                .attr('stroke', colorScale(series.id))
                .attr('stroke-width', 2)
                .attr('d', line);

            // Animation
            if (config.animated !== false) {
                const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 0;
                path
                    .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
                    .attr('stroke-dashoffset', totalLength)
                    .transition()
                    .duration(1500)
                    .delay(i * 200)
                    .attr('stroke-dashoffset', 0);
            }
        });

        // Draw points
        data.series.forEach((series) => {
            svg
                .selectAll(`.point-${series.id}`)
                .data(series.values)
                .enter()
                .append('circle')
                .attr('class', `point-${series.id}`)
                .attr('cx', (d) => xScale(new Date(d.date)))
                .attr('cy', (d) => yScale(d.value))
                .attr('r', 4)
                .attr('fill', colorScale(series.id))
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('mouseenter', function (event, d) {
                    d3.select(this).attr('r', 6);
                    setHoveredPoint({
                        date: new Date(d.date),
                        value: d.value,
                        series: series.name,
                    });
                })
                .on('mouseleave', function () {
                    d3.select(this).attr('r', 4);
                    setHoveredPoint(null);
                })
                .on('click', (event, d) => {
                    onInteraction?.onNodeClick?.({
                        id: `${series.id}-${d.date}`,
                        name: series.name,
                        value: d.value,
                    });
                });
        });

        // Draw events
        if (data.events) {
            data.events.forEach((event) => {
                const x = xScale(new Date(event.date));

                svg
                    .append('line')
                    .attr('x1', x)
                    .attr('x2', x)
                    .attr('y1', 0)
                    .attr('y2', innerHeight)
                    .attr('stroke', 'currentColor')
                    .attr('stroke-opacity', 0.3)
                    .attr('stroke-dasharray', '4,4');

                svg
                    .append('text')
                    .attr('x', x)
                    .attr('y', -5)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .attr('fill', 'currentColor')
                    .attr('opacity', 0.7)
                    .text(event.label);
            });
        }

        // X axis
        svg
            .append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).ticks(6))
            .selectAll('text')
            .attr('font-size', '10px')
            .attr('fill', 'currentColor');

        // Y axis
        svg
            .append('g')
            .call(d3.axisLeft(yScale).ticks(5))
            .selectAll('text')
            .attr('font-size', '10px')
            .attr('fill', 'currentColor');

        // Legend
        if (config.showLegend !== false && data.series.length > 1) {
            const legend = svg
                .append('g')
                .attr('transform', `translate(${innerWidth - 100}, 0)`);

            data.series.forEach((series, i) => {
                const g = legend
                    .append('g')
                    .attr('transform', `translate(0, ${i * 20})`);

                g.append('circle')
                    .attr('r', 5)
                    .attr('fill', colorScale(series.id));

                g.append('text')
                    .attr('x', 10)
                    .attr('y', 0)
                    .attr('dy', '0.35em')
                    .attr('font-size', '11px')
                    .attr('fill', 'currentColor')
                    .text(series.name);
            });
        }
    }, [data, dimensions, colors, config, onInteraction]);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`relative w-full h-full min-h-[200px] ${className}`}
        >
            <svg ref={svgRef} className="w-full h-full" />

            {/* Tooltip */}
            {hoveredPoint && config.showTooltip !== false && (
                <div className="absolute top-4 right-4 px-3 py-2 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-lg">
                    <div className="font-medium text-foreground">{hoveredPoint.series}</div>
                    <div className="text-sm text-muted-foreground">
                        {hoveredPoint.date.toLocaleDateString()}
                    </div>
                    <div className="text-sm font-medium">
                        Value: {hoveredPoint.value.toLocaleString()}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
