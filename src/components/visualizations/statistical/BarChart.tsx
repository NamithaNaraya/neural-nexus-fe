/**
 * Bar Chart Component
 * 
 * Standard vertical/horizontal bar chart for categorical data.
 * Features:
 * - Animated bars
 * - Tooltips
 * - Value labels
 * - Sorting options
 */
'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { ChartContainer, ChartProps } from '../shared/ChartContainer';

interface BarData {
    label: string;
    value: number;
    color?: string;
}

interface BarChartProps extends ChartProps {
    data: BarData[];
    orientation?: 'vertical' | 'horizontal';
    showValues?: boolean;
    sortBy?: 'none' | 'value-asc' | 'value-desc' | 'label';
    colorScheme?: string[];
}

const DEFAULT_COLORS = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899',
    '#06B6D4', '#EF4444', '#84CC16', '#F97316', '#6366F1'
];

export function BarChart({
    data,
    orientation = 'vertical',
    showValues = true,
    sortBy = 'none',
    colorScheme = DEFAULT_COLORS,
    ...containerProps
}: BarChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    // Sort data based on sortBy prop
    const sortedData = useMemo(() => {
        const sorted = [...data];
        switch (sortBy) {
            case 'value-asc':
                return sorted.sort((a, b) => a.value - b.value);
            case 'value-desc':
                return sorted.sort((a, b) => b.value - a.value);
            case 'label':
                return sorted.sort((a, b) => a.label.localeCompare(b.label));
            default:
                return sorted;
        }
    }, [data, sortBy]);

    useEffect(() => {
        if (!svgRef.current || sortedData.length === 0) return;

        const svg = d3.select(svgRef.current);
        const { width, height } = svgRef.current.getBoundingClientRect();

        svg.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        if (orientation === 'vertical') {
            // Vertical bar chart
            const xScale = d3.scaleBand()
                .domain(sortedData.map(d => d.label))
                .range([0, innerWidth])
                .padding(0.3);

            const yScale = d3.scaleLinear()
                .domain([0, d3.max(sortedData, d => d.value) || 0])
                .nice()
                .range([innerHeight, 0]);

            // X axis
            g.append('g')
                .attr('transform', `translate(0,${innerHeight})`)
                .call(d3.axisBottom(xScale))
                .selectAll('text')
                .style('fill', 'rgba(255,255,255,0.7)')
                .style('font-size', '10px')
                .attr('transform', 'rotate(-25)')
                .attr('text-anchor', 'end');

            // Y axis
            g.append('g')
                .call(d3.axisLeft(yScale))
                .selectAll('text')
                .style('fill', 'rgba(255,255,255,0.7)');

            // Bars
            g.selectAll('.bar')
                .data(sortedData)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => xScale(d.label) || 0)
                .attr('width', xScale.bandwidth())
                .attr('y', innerHeight)
                .attr('height', 0)
                .attr('fill', (d, i) => d.color || colorScheme[i % colorScheme.length])
                .attr('rx', 4)
                .transition()
                .duration(800)
                .delay((_, i) => i * 50)
                .attr('y', d => yScale(d.value))
                .attr('height', d => innerHeight - yScale(d.value));

            // Value labels
            if (showValues) {
                g.selectAll('.label')
                    .data(sortedData)
                    .enter()
                    .append('text')
                    .attr('class', 'label')
                    .attr('x', d => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
                    .attr('y', d => yScale(d.value) - 5)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'rgba(255,255,255,0.8)')
                    .attr('font-size', '10px')
                    .attr('opacity', 0)
                    .text(d => d.value.toLocaleString())
                    .transition()
                    .delay(800)
                    .duration(300)
                    .attr('opacity', 1);
            }
        } else {
            // Horizontal bar chart
            const yScale = d3.scaleBand()
                .domain(sortedData.map(d => d.label))
                .range([0, innerHeight])
                .padding(0.3);

            const xScale = d3.scaleLinear()
                .domain([0, d3.max(sortedData, d => d.value) || 0])
                .nice()
                .range([0, innerWidth]);

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
                .style('fill', 'rgba(255,255,255,0.7)')
                .style('font-size', '10px');

            // Bars
            g.selectAll('.bar')
                .data(sortedData)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', 0)
                .attr('y', d => yScale(d.label) || 0)
                .attr('height', yScale.bandwidth())
                .attr('width', 0)
                .attr('fill', (d, i) => d.color || colorScheme[i % colorScheme.length])
                .attr('rx', 4)
                .transition()
                .duration(800)
                .delay((_, i) => i * 50)
                .attr('width', d => xScale(d.value));

            // Value labels
            if (showValues) {
                g.selectAll('.label')
                    .data(sortedData)
                    .enter()
                    .append('text')
                    .attr('class', 'label')
                    .attr('x', d => xScale(d.value) + 5)
                    .attr('y', d => (yScale(d.label) || 0) + yScale.bandwidth() / 2)
                    .attr('dy', '0.35em')
                    .attr('fill', 'rgba(255,255,255,0.8)')
                    .attr('font-size', '10px')
                    .attr('opacity', 0)
                    .text(d => d.value.toLocaleString())
                    .transition()
                    .delay(800)
                    .duration(300)
                    .attr('opacity', 1);
            }
        }

        // Style axis lines
        svg.selectAll('.domain, .tick line')
            .style('stroke', 'rgba(255,255,255,0.2)');

    }, [sortedData, orientation, showValues, colorScheme]);

    return (
        <ChartContainer {...containerProps}>
            <svg ref={svgRef} className="w-full h-full" />
        </ChartContainer>
    );
}

export default BarChart;
