/**
 * Radar Chart Component
 * 
 * Multi-dimensional data visualization on radial axes.
 * Features:
 * - Multiple data series
 * - Animated drawing
 * - Axis labels
 * - Fill and stroke options
 */
'use client';

import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ChartContainer, ChartProps } from '../shared/ChartContainer';

interface RadarSeries {
    name: string;
    values: number[];
    color?: string;
}

interface RadarChartProps extends ChartProps {
    data: RadarSeries[];
    labels: string[];
    maxValue?: number;
    showLevels?: boolean;
    levelCount?: number;
    fillOpacity?: number;
    colorScheme?: string[];
}

const DEFAULT_COLORS = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899',
];

export function RadarChart({
    data,
    labels,
    maxValue,
    showLevels = true,
    levelCount = 5,
    fillOpacity = 0.2,
    colorScheme = DEFAULT_COLORS,
    ...containerProps
}: RadarChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0 || labels.length === 0) return;

        const svg = d3.select(svgRef.current);
        const { width, height } = svgRef.current.getBoundingClientRect();

        svg.selectAll('*').remove();

        const radius = Math.min(width, height) / 2 - 60;
        const centerX = width / 2;
        const centerY = height / 2;
        const angleSlice = (2 * Math.PI) / labels.length;

        const g = svg.append('g')
            .attr('transform', `translate(${centerX},${centerY})`);

        // Calculate max value
        const max = maxValue || d3.max(data.flatMap(s => s.values)) || 1;
        const rScale = d3.scaleLinear()
            .domain([0, max])
            .range([0, radius]);

        // Draw level circles
        if (showLevels) {
            for (let level = 1; level <= levelCount; level++) {
                const r = (radius / levelCount) * level;

                g.append('circle')
                    .attr('r', r)
                    .attr('fill', 'none')
                    .attr('stroke', 'rgba(255,255,255,0.1)')
                    .attr('stroke-dasharray', '3,3');

                // Level value label
                g.append('text')
                    .attr('x', 5)
                    .attr('y', -r - 3)
                    .style('fill', 'rgba(255,255,255,0.4)')
                    .style('font-size', '9px')
                    .text(((max / levelCount) * level).toFixed(0));
            }
        }

        // Draw axis lines
        labels.forEach((label, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            g.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', x)
                .attr('y2', y)
                .attr('stroke', 'rgba(255,255,255,0.2)')
                .attr('stroke-width', 1);

            // Axis labels
            const labelX = Math.cos(angle) * (radius + 20);
            const labelY = Math.sin(angle) * (radius + 20);

            g.append('text')
                .attr('x', labelX)
                .attr('y', labelY)
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('fill', 'rgba(255,255,255,0.7)')
                .style('font-size', '10px')
                .text(label);
        });

        // Draw data series
        data.forEach((series, seriesIndex) => {
            const color = series.color || colorScheme[seriesIndex % colorScheme.length];

            // Create path data
            const pathPoints = series.values.map((value, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                const r = rScale(value);
                return {
                    x: Math.cos(angle) * r,
                    y: Math.sin(angle) * r,
                };
            });

            const lineGenerator = d3.line<{ x: number; y: number }>()
                .x(d => d.x)
                .y(d => d.y)
                .curve(d3.curveLinearClosed);

            // Filled area
            const area = g.append('path')
                .datum(pathPoints)
                .attr('fill', color)
                .attr('fill-opacity', 0)
                .attr('stroke', color)
                .attr('stroke-width', 2)
                .attr('d', lineGenerator);

            area.transition()
                .duration(800)
                .delay(seriesIndex * 200)
                .attr('fill-opacity', fillOpacity);

            // Animate the path drawing
            const pathLength = area.node()?.getTotalLength() || 0;
            area
                .attr('stroke-dasharray', pathLength)
                .attr('stroke-dashoffset', pathLength)
                .transition()
                .duration(800)
                .delay(seriesIndex * 200)
                .attr('stroke-dashoffset', 0);

            // Draw points
            pathPoints.forEach((point, i) => {
                g.append('circle')
                    .attr('cx', point.x)
                    .attr('cy', point.y)
                    .attr('r', 0)
                    .attr('fill', color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1)
                    .transition()
                    .duration(400)
                    .delay(800 + seriesIndex * 200 + i * 50)
                    .attr('r', 4);
            });
        });

        // Legend
        const legend = svg.append('g')
            .attr('transform', `translate(20, 20)`);

        data.forEach((series, i) => {
            const color = series.color || colorScheme[i % colorScheme.length];

            legend.append('rect')
                .attr('x', 0)
                .attr('y', i * 20)
                .attr('width', 12)
                .attr('height', 12)
                .attr('rx', 2)
                .attr('fill', color);

            legend.append('text')
                .attr('x', 18)
                .attr('y', i * 20 + 9)
                .style('fill', 'rgba(255,255,255,0.8)')
                .style('font-size', '11px')
                .text(series.name);
        });

    }, [data, labels, maxValue, showLevels, levelCount, fillOpacity, colorScheme]);

    return (
        <ChartContainer {...containerProps}>
            <svg ref={svgRef} className="w-full h-full" />
        </ChartContainer>
    );
}

export default RadarChart;
