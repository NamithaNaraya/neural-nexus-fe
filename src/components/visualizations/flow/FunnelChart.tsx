/**
 * Funnel Chart Component
 * 
 * Sequential process visualization showing conversion/drop-off.
 * Features:
 * - Animated segments
 * - Conversion percentages
 * - Gradient fills
 * - Stage labels
 */
'use client';

import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ChartContainer, ChartProps } from '../shared/ChartContainer';

interface FunnelStage {
    label: string;
    value: number;
    color?: string;
}

interface FunnelChartProps extends ChartProps {
    data: FunnelStage[];
    showPercentages?: boolean;
    showConversion?: boolean;
    colorScheme?: string[];
}

const DEFAULT_COLORS = [
    '#10B981', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6'
];

export function FunnelChart({
    data,
    showPercentages = true,
    showConversion = true,
    colorScheme = DEFAULT_COLORS,
    ...containerProps
}: FunnelChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        const { width, height } = svgRef.current.getBoundingClientRect();

        svg.selectAll('*').remove();

        const margin = { top: 20, right: 100, bottom: 20, left: 100 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const maxValue = d3.max(data, d => d.value) || 1;
        const segmentHeight = innerHeight / data.length;
        const centerX = innerWidth / 2;

        // Create gradient definitions
        const defs = svg.append('defs');

        data.forEach((stage, i) => {
            const color = stage.color || colorScheme[i % colorScheme.length];

            const gradient = defs.append('linearGradient')
                .attr('id', `funnel-gradient-${i}`)
                .attr('x1', '0%')
                .attr('x2', '100%');

            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', color)
                .attr('stop-opacity', 0.8);

            gradient.append('stop')
                .attr('offset', '50%')
                .attr('stop-color', color)
                .attr('stop-opacity', 1);

            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', color)
                .attr('stop-opacity', 0.8);
        });

        // Draw funnel segments
        data.forEach((stage, i) => {
            const color = stage.color || colorScheme[i % colorScheme.length];
            const nextStage = data[i + 1];

            const currentWidth = (stage.value / maxValue) * innerWidth;
            const nextWidth = nextStage ? (nextStage.value / maxValue) * innerWidth : currentWidth * 0.6;

            const y = i * segmentHeight;
            const currentLeft = centerX - currentWidth / 2;
            const currentRight = centerX + currentWidth / 2;
            const nextLeft = centerX - nextWidth / 2;
            const nextRight = centerX + nextWidth / 2;

            // Create trapezoid path
            const pathData = `
                M ${currentLeft} ${y}
                L ${currentRight} ${y}
                L ${nextRight} ${y + segmentHeight}
                L ${nextLeft} ${y + segmentHeight}
                Z
            `;

            const segment = g.append('path')
                .attr('d', pathData)
                .attr('fill', `url(#funnel-gradient-${i})`)
                .attr('stroke', 'rgba(255,255,255,0.2)')
                .attr('stroke-width', 1)
                .attr('opacity', 0)
                .style('cursor', 'pointer');

            segment.transition()
                .duration(600)
                .delay(i * 150)
                .attr('opacity', 1);

            // Add hover effect
            segment
                .on('mouseenter', function () {
                    d3.select(this)
                        .attr('stroke', 'rgba(255,255,255,0.6)')
                        .attr('stroke-width', 2);
                })
                .on('mouseleave', function () {
                    d3.select(this)
                        .attr('stroke', 'rgba(255,255,255,0.2)')
                        .attr('stroke-width', 1);
                });

            // Stage label (left)
            g.append('text')
                .attr('x', -10)
                .attr('y', y + segmentHeight / 2)
                .attr('text-anchor', 'end')
                .attr('dy', '0.35em')
                .style('fill', 'rgba(255,255,255,0.8)')
                .style('font-size', '12px')
                .style('font-weight', '500')
                .style('opacity', 0)
                .text(stage.label)
                .transition()
                .delay(600 + i * 150)
                .duration(300)
                .style('opacity', 1);

            // Value label (right)
            g.append('text')
                .attr('x', innerWidth + 10)
                .attr('y', y + segmentHeight / 2)
                .attr('text-anchor', 'start')
                .attr('dy', '0.35em')
                .style('fill', color)
                .style('font-size', '13px')
                .style('font-weight', '600')
                .style('opacity', 0)
                .text(stage.value.toLocaleString())
                .transition()
                .delay(600 + i * 150)
                .duration(300)
                .style('opacity', 1);

            // Percentage/Conversion label
            if (showPercentages && i > 0) {
                const prevValue = data[i - 1].value;
                const conversion = ((stage.value / prevValue) * 100).toFixed(1);

                g.append('text')
                    .attr('x', innerWidth + 10)
                    .attr('y', y + segmentHeight / 2 + 14)
                    .attr('text-anchor', 'start')
                    .style('fill', 'rgba(255,255,255,0.5)')
                    .style('font-size', '10px')
                    .style('opacity', 0)
                    .text(`${conversion}% from prev`)
                    .transition()
                    .delay(600 + i * 150)
                    .duration(300)
                    .style('opacity', 1);
            }
        });

        // Overall conversion summary
        if (showConversion && data.length > 1) {
            const overallConversion = ((data[data.length - 1].value / data[0].value) * 100).toFixed(1);

            g.append('text')
                .attr('x', innerWidth / 2)
                .attr('y', innerHeight + 10)
                .attr('text-anchor', 'middle')
                .style('fill', 'rgba(255,255,255,0.6)')
                .style('font-size', '11px')
                .text(`Overall Conversion: ${overallConversion}%`);
        }

    }, [data, showPercentages, showConversion, colorScheme]);

    return (
        <ChartContainer {...containerProps}>
            <svg ref={svgRef} className="w-full h-full" />
        </ChartContainer>
    );
}

export default FunnelChart;
