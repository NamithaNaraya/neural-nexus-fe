/**
 * Histogram Component
 * 
 * Distribution visualization showing frequency of values in bins.
 * Features:
 * - Automatic bin calculation
 * - Custom bin counts
 * - Animated bars
 * - Distribution curve overlay
 */
'use client';

import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ChartContainer, ChartProps } from '../shared/ChartContainer';

interface HistogramProps extends ChartProps {
    data: number[];
    binCount?: number;
    showCurve?: boolean;
    color?: string;
    curveColor?: string;
}

export function Histogram({
    data,
    binCount = 20,
    showCurve = true,
    color = '#10B981',
    curveColor = '#3B82F6',
    ...containerProps
}: HistogramProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        const { width, height } = svgRef.current.getBoundingClientRect();

        svg.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(data) as [number, number])
            .nice()
            .range([0, innerWidth]);

        // Create histogram bins
        const histogram = d3.bin()
            .domain(xScale.domain() as [number, number])
            .thresholds(xScale.ticks(binCount));

        const bins = histogram(data);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length) || 0])
            .nice()
            .range([innerHeight, 0]);

        // X axis
        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('fill', 'rgba(255,255,255,0.7)');

        // Y axis
        g.append('g')
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .style('fill', 'rgba(255,255,255,0.7)');

        // Y axis label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -innerHeight / 2)
            .attr('text-anchor', 'middle')
            .style('fill', 'rgba(255,255,255,0.5)')
            .style('font-size', '11px')
            .text('Frequency');

        // Bars
        g.selectAll('.bar')
            .data(bins)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.x0 || 0) + 1)
            .attr('width', d => Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 2))
            .attr('y', innerHeight)
            .attr('height', 0)
            .attr('fill', color)
            .attr('opacity', 0.7)
            .attr('rx', 2)
            .transition()
            .duration(800)
            .delay((_, i) => i * 30)
            .attr('y', d => yScale(d.length))
            .attr('height', d => innerHeight - yScale(d.length));

        // Distribution curve
        if (showCurve && bins.length > 2) {
            const line = d3.line<d3.Bin<number, number>>()
                .x(d => xScale(((d.x0 || 0) + (d.x1 || 0)) / 2))
                .y(d => yScale(d.length))
                .curve(d3.curveCatmullRom.alpha(0.5));

            const path = g.append('path')
                .datum(bins)
                .attr('fill', 'none')
                .attr('stroke', curveColor)
                .attr('stroke-width', 2)
                .attr('d', line);

            // Animate path
            const pathLength = path.node()?.getTotalLength() || 0;
            path
                .attr('stroke-dasharray', pathLength)
                .attr('stroke-dashoffset', pathLength)
                .transition()
                .delay(500)
                .duration(1000)
                .ease(d3.easeLinear)
                .attr('stroke-dashoffset', 0);
        }

        // Style axis
        svg.selectAll('.domain, .tick line')
            .style('stroke', 'rgba(255,255,255,0.2)');

    }, [data, binCount, showCurve, color, curveColor]);

    return (
        <ChartContainer {...containerProps}>
            <svg ref={svgRef} className="w-full h-full" />
        </ChartContainer>
    );
}

export default Histogram;
