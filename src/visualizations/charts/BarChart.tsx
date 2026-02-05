'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface BarChartProps {
    data: { label: string; value: number; color?: string }[];
    width?: number;
    height?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
    xAxisLabel?: string;
    yAxisLabel?: string;
    onBarClick?: (label: string) => void;
}

export function BarChart({
    data,
    width = 600,
    height = 400,
    marginTop = 20,
    marginRight = 20,
    marginBottom = 40,
    marginLeft = 40,
    xAxisLabel,
    yAxisLabel,
    onBarClick
}: BarChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Responsive width (optional, but good for grid layouts)
    // For now, we'll rely on the passed width or container queries in a real app
    // but D3 needs explicit numbers.

    useEffect(() => {
        if (!svgRef.current || !data.length) return;

        // Clear previous
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const x = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([marginLeft, width - marginRight])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value) || 0])
            .range([height - marginBottom, marginTop]);

        // Bars
        svg.append('g')
            .selectAll('rect')
            .data(data)
            .join('rect')
            .attr('x', d => x(d.label)!)
            .attr('y', d => y(d.value))
            .attr('height', d => y(0) - y(d.value))
            .attr('width', x.bandwidth())
            .attr('fill', d => d.color || '#10B981') // Emerald default
            .attr('rx', 4) // Rounded top
            .attr('cursor', onBarClick ? 'pointer' : 'default')
            .on('click', (event, d) => onBarClick?.(d.label))
            .on('mouseover', function () {
                d3.select(this).attr('opacity', 0.8);
            })
            .on('mouseout', function () {
                d3.select(this).attr('opacity', 1);
            });

        // X Axis
        const xAxis = svg.append('g')
            .attr('transform', `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x).tickSizeOuter(0));

        // Rotate text if too many items
        if (data.length > 10) {
            xAxis.selectAll('text')
                .attr('transform', 'rotate(-45)')
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em');
        }

        xAxis.selectAll('line').attr('stroke', '#374151'); // border-color
        xAxis.selectAll('text').attr('fill', '#9CA3AF'); // text-muted-foreground

        // Y Axis
        const yAxis = svg.append('g')
            .attr('transform', `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).ticks(5));

        yAxis.selectAll('line').attr('stroke', '#374151');
        yAxis.selectAll('text').attr('fill', '#9CA3AF');
        yAxis.select('.domain').remove(); // Remove Y axis line

        // Grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y)
                .tickSize(-width + marginLeft + marginRight)
                .tickFormat(() => '')
            )
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line')
                .attr('stroke', '#374151')
                .attr('stroke-opacity', 0.1)
            );

        // Labels
        if (xAxisLabel) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height - 5)
                .attr('text-anchor', 'middle')
                .attr('fill', '#9CA3AF')
                .style('font-size', '12px')
                .text(xAxisLabel);
        }

        if (yAxisLabel) {
            svg.append('text')
                .attr('x', -height / 2)
                .attr('y', 15)
                .attr('transform', 'rotate(-90)')
                .attr('text-anchor', 'middle')
                .attr('fill', '#9CA3AF')
                .style('font-size', '12px')
                .text(yAxisLabel);
        }

    }, [data, width, height, marginLeft, marginRight, marginTop, marginBottom, xAxisLabel, yAxisLabel, onBarClick]);

    return (
        <div ref={containerRef} className="relative">
            <svg
                ref={svgRef}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="overflow-visible"
            />
        </div>
    );
}
