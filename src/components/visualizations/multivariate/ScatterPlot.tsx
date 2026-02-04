/**
 * Scatter Plot Component
 * 
 * Two-dimensional data visualization with points.
 * Features:
 * - Point sizing and coloring by value
 * - Trend line
 * - Tooltips
 * - Quadrant analysis
 */
'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ChartContainer, ChartProps } from '../shared/ChartContainer';

interface ScatterPoint {
    x: number;
    y: number;
    label?: string;
    size?: number;
    color?: string;
    group?: string;
}

interface ScatterPlotProps extends ChartProps {
    data: ScatterPoint[];
    xLabel?: string;
    yLabel?: string;
    showTrendLine?: boolean;
    showGrid?: boolean;
    colorScheme?: string[];
}

const DEFAULT_COLORS = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899',
];

export function ScatterPlot({
    data,
    xLabel = 'X',
    yLabel = 'Y',
    showTrendLine = false,
    showGrid = true,
    colorScheme = DEFAULT_COLORS,
    ...containerProps
}: ScatterPlotProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltip, setTooltip] = useState<{ point: ScatterPoint; x: number; y: number } | null>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        const { width, height } = svgRef.current.getBoundingClientRect();

        svg.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales
        const xExtent = d3.extent(data, d => d.x) as [number, number];
        const yExtent = d3.extent(data, d => d.y) as [number, number];

        const xScale = d3.scaleLinear()
            .domain([xExtent[0] - (xExtent[1] - xExtent[0]) * 0.1, xExtent[1] + (xExtent[1] - xExtent[0]) * 0.1])
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - (yExtent[1] - yExtent[0]) * 0.1, yExtent[1] + (yExtent[1] - yExtent[0]) * 0.1])
            .range([innerHeight, 0]);

        // Get unique groups
        const groups = Array.from(new Set(data.map(d => d.group).filter(Boolean)));
        const groupColor = (group: string | undefined) => {
            if (!group) return colorScheme[0];
            const index = groups.indexOf(group);
            return colorScheme[index % colorScheme.length];
        };

        // Grid
        if (showGrid) {
            g.append('g')
                .attr('class', 'grid')
                .selectAll('line.horizontal')
                .data(yScale.ticks(5))
                .enter()
                .append('line')
                .attr('x1', 0)
                .attr('x2', innerWidth)
                .attr('y1', d => yScale(d))
                .attr('y2', d => yScale(d))
                .attr('stroke', 'rgba(255,255,255,0.1)')
                .attr('stroke-dasharray', '2,2');

            g.append('g')
                .attr('class', 'grid')
                .selectAll('line.vertical')
                .data(xScale.ticks(5))
                .enter()
                .append('line')
                .attr('x1', d => xScale(d))
                .attr('x2', d => xScale(d))
                .attr('y1', 0)
                .attr('y2', innerHeight)
                .attr('stroke', 'rgba(255,255,255,0.1)')
                .attr('stroke-dasharray', '2,2');
        }

        // X axis
        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('fill', 'rgba(255,255,255,0.7)');

        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 40)
            .attr('text-anchor', 'middle')
            .style('fill', 'rgba(255,255,255,0.6)')
            .style('font-size', '11px')
            .text(xLabel);

        // Y axis
        g.append('g')
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .style('fill', 'rgba(255,255,255,0.7)');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .style('fill', 'rgba(255,255,255,0.6)')
            .style('font-size', '11px')
            .text(yLabel);

        // Trend line
        if (showTrendLine && data.length > 1) {
            const xMean = d3.mean(data, d => d.x) || 0;
            const yMean = d3.mean(data, d => d.y) || 0;

            let num = 0;
            let den = 0;
            data.forEach(point => {
                num += (point.x - xMean) * (point.y - yMean);
                den += (point.x - xMean) ** 2;
            });

            const slope = den !== 0 ? num / den : 0;
            const intercept = yMean - slope * xMean;

            const trendLine = g.append('line')
                .attr('x1', xScale(xExtent[0]))
                .attr('y1', yScale(slope * xExtent[0] + intercept))
                .attr('x2', xScale(xExtent[0]))
                .attr('y2', yScale(slope * xExtent[0] + intercept))
                .attr('stroke', '#F59E0B')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '6,4');

            trendLine.transition()
                .delay(500)
                .duration(800)
                .attr('x2', xScale(xExtent[1]))
                .attr('y2', yScale(slope * xExtent[1] + intercept));
        }

        // Points
        g.selectAll('.point')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'point')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 0)
            .attr('fill', d => d.color || groupColor(d.group))
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d) {
                const [px, py] = d3.pointer(event, svgRef.current);
                setTooltip({ point: d, x: px, y: py });
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr('r', (d.size || 6) * 1.5);
            })
            .on('mouseleave', function (event, d) {
                setTooltip(null);
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr('r', d.size || 6);
            })
            .transition()
            .duration(500)
            .delay((_, i) => i * 20)
            .attr('r', d => d.size || 6);

        // Style axis
        svg.selectAll('.domain, .tick line')
            .style('stroke', 'rgba(255,255,255,0.2)');

    }, [data, xLabel, yLabel, showTrendLine, showGrid, colorScheme]);

    return (
        <ChartContainer {...containerProps}>
            <div className="relative w-full h-full">
                <svg ref={svgRef} className="w-full h-full" />
                {tooltip && (
                    <div
                        className="absolute z-10 px-2 py-1 bg-card/95 border border-border rounded text-xs shadow-lg pointer-events-none"
                        style={{
                            left: tooltip.x + 10,
                            top: tooltip.y - 30,
                        }}
                    >
                        {tooltip.point.label && (
                            <div className="font-medium text-foreground">{tooltip.point.label}</div>
                        )}
                        <div className="text-muted-foreground">
                            X: {tooltip.point.x.toFixed(2)}, Y: {tooltip.point.y.toFixed(2)}
                        </div>
                    </div>
                )}
            </div>
        </ChartContainer>
    );
}

export default ScatterPlot;
