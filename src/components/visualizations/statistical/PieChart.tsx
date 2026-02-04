/**
 * Pie Chart Component
 * 
 * Classic circular chart showing proportions.
 * Features:
 * - Animated slices
 * - Labels and percentages
 * - Interactive hover effects
 * - Donut variant
 */
'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ChartContainer, ChartProps } from '../shared/ChartContainer';

interface PieData {
    label: string;
    value: number;
    color?: string;
}

interface PieChartProps extends ChartProps {
    data: PieData[];
    donut?: boolean;
    innerRadiusRatio?: number;
    showLabels?: boolean;
    showValues?: boolean;
    colorScheme?: string[];
}

const DEFAULT_COLORS = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899',
    '#06B6D4', '#EF4444', '#84CC16', '#F97316', '#6366F1'
];

export function PieChart({
    data,
    donut = false,
    innerRadiusRatio = 0.5,
    showLabels = true,
    showValues = true,
    colorScheme = DEFAULT_COLORS,
    ...containerProps
}: PieChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        const { width, height } = svgRef.current.getBoundingClientRect();

        svg.selectAll('*').remove();

        const radius = Math.min(width, height) / 2 - 40;
        const innerRadius = donut ? radius * innerRadiusRatio : 0;

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // Create pie layout
        const pie = d3.pie<PieData>()
            .value(d => d.value)
            .sort(null);

        // Create arc generator
        const arc = d3.arc<d3.PieArcDatum<PieData>>()
            .innerRadius(innerRadius)
            .outerRadius(radius)
            .cornerRadius(4);

        // Create arcs for labels
        const labelArc = d3.arc<d3.PieArcDatum<PieData>>()
            .innerRadius(radius * 0.7)
            .outerRadius(radius * 0.7);

        const total = d3.sum(data, d => d.value);

        // Draw slices
        const slices = g.selectAll('.slice')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'slice');

        slices.append('path')
            .attr('fill', (d, i) => d.data.color || colorScheme[i % colorScheme.length])
            .attr('stroke', 'rgba(0,0,0,0.2)')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d) {
                setHoveredSlice(d.data.label);
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('transform', `scale(1.05)`);
            })
            .on('mouseleave', function () {
                setHoveredSlice(null);
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('transform', 'scale(1)');
            })
            .transition()
            .duration(800)
            .attrTween('d', function (d) {
                const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                return (t) => arc(interpolate(t)) || '';
            });

        // Add labels
        if (showLabels) {
            slices.append('text')
                .attr('transform', d => `translate(${labelArc.centroid(d)})`)
                .attr('text-anchor', 'middle')
                .attr('dy', showValues ? '-0.3em' : '0.35em')
                .style('fill', 'white')
                .style('font-size', '11px')
                .style('font-weight', '500')
                .style('opacity', 0)
                .text(d => d.data.label)
                .transition()
                .delay(800)
                .duration(300)
                .style('opacity', 1);

            if (showValues) {
                slices.append('text')
                    .attr('transform', d => `translate(${labelArc.centroid(d)})`)
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.9em')
                    .style('fill', 'rgba(255,255,255,0.7)')
                    .style('font-size', '10px')
                    .style('opacity', 0)
                    .text(d => `${((d.data.value / total) * 100).toFixed(1)}%`)
                    .transition()
                    .delay(800)
                    .duration(300)
                    .style('opacity', 1);
            }
        }

        // Center text for donut
        if (donut) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '-0.2em')
                .style('fill', 'white')
                .style('font-size', '20px')
                .style('font-weight', '600')
                .text(total.toLocaleString());

            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '1.2em')
                .style('fill', 'rgba(255,255,255,0.6)')
                .style('font-size', '11px')
                .text('Total');
        }

    }, [data, donut, innerRadiusRatio, showLabels, showValues, colorScheme]);

    return (
        <ChartContainer {...containerProps}>
            <svg ref={svgRef} className="w-full h-full" />
        </ChartContainer>
    );
}

export default PieChart;
