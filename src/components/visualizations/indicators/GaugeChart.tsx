/**
 * Gauge Chart Component
 * 
 * Radial indicator for single value metrics.
 * Features:
 * - Animated needle/arc
 * - Color zones (good/warning/danger)
 * - Multiple styles (needle, arc, donut)
 * - Min/Max labels
 */
'use client';

import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ChartContainer, ChartProps } from '../shared/ChartContainer';

interface GaugeChartProps extends ChartProps {
    value: number;
    min?: number;
    max?: number;
    label?: string;
    unit?: string;
    style?: 'arc' | 'needle' | 'donut';
    zones?: Array<{
        from: number;
        to: number;
        color: string;
    }>;
}

const DEFAULT_ZONES = [
    { from: 0, to: 33, color: '#10B981' },   // Green - Good
    { from: 33, to: 66, color: '#F59E0B' },  // Yellow - Warning  
    { from: 66, to: 100, color: '#EF4444' }, // Red - Danger
];

export function GaugeChart({
    value,
    min = 0,
    max = 100,
    label = '',
    unit = '',
    style = 'arc',
    zones = DEFAULT_ZONES,
    ...containerProps
}: GaugeChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const { width, height } = svgRef.current.getBoundingClientRect();

        svg.selectAll('*').remove();

        const radius = Math.min(width, height) / 2 - 30;
        const centerX = width / 2;
        const centerY = height / 2 + 20;

        const g = svg.append('g')
            .attr('transform', `translate(${centerX},${centerY})`);

        // Scale for angle mapping
        const angleScale = d3.scaleLinear()
            .domain([min, max])
            .range([-Math.PI * 0.75, Math.PI * 0.75]); // -135 to 135 degrees

        // Draw background arc
        const backgroundArc = d3.arc()
            .innerRadius(radius * 0.7)
            .outerRadius(radius)
            .startAngle(-Math.PI * 0.75)
            .endAngle(Math.PI * 0.75)
            .cornerRadius(5);

        g.append('path')
            .attr('d', backgroundArc as any)
            .attr('fill', 'rgba(255,255,255,0.1)');

        // Draw colored zones
        zones.forEach(zone => {
            const zoneArc = d3.arc()
                .innerRadius(radius * 0.75)
                .outerRadius(radius * 0.95)
                .startAngle(angleScale(zone.from))
                .endAngle(angleScale(zone.to))
                .cornerRadius(2);

            g.append('path')
                .attr('d', zoneArc as any)
                .attr('fill', zone.color)
                .attr('opacity', 0.3);
        });

        // Get current zone color
        const normalizedValue = Math.max(min, Math.min(max, value));
        const normalizedPercent = ((normalizedValue - min) / (max - min)) * 100;
        const currentZone = zones.find(z => normalizedPercent >= z.from && normalizedPercent <= z.to);
        const valueColor = currentZone?.color || '#3B82F6';

        if (style === 'arc' || style === 'donut') {
            // Value arc
            const valueArc = d3.arc()
                .innerRadius(radius * 0.7)
                .outerRadius(radius)
                .startAngle(-Math.PI * 0.75)
                .cornerRadius(5);

            const valuePath = g.append('path')
                .attr('fill', valueColor);

            valuePath
                .transition()
                .duration(1000)
                .ease(d3.easeElasticOut.amplitude(1).period(0.4))
                .attrTween('d', function () {
                    const interpolate = d3.interpolate(-Math.PI * 0.75, angleScale(value));
                    return (t) => {
                        return (valueArc.endAngle(interpolate(t)) as any)();
                    };
                });
        }

        if (style === 'needle') {
            // Needle
            const needleLength = radius * 0.8;
            const needleWidth = 8;

            const needle = g.append('g');

            // Needle path
            needle.append('path')
                .attr('d', `M 0 ${-needleLength} L ${needleWidth / 2} 0 L 0 10 L ${-needleWidth / 2} 0 Z`)
                .attr('fill', valueColor)
                .attr('stroke', 'white')
                .attr('stroke-width', 1);

            // Center circle
            needle.append('circle')
                .attr('r', 10)
                .attr('fill', valueColor)
                .attr('stroke', 'white')
                .attr('stroke-width', 2);

            // Animate needle rotation
            needle
                .attr('transform', `rotate(${-135})`)
                .transition()
                .duration(1000)
                .ease(d3.easeElasticOut.amplitude(1).period(0.4))
                .attr('transform', `rotate(${(angleScale(value) * 180 / Math.PI)})`);
        }

        // Min/Max labels
        g.append('text')
            .attr('x', -radius * 0.85)
            .attr('y', radius * 0.4)
            .attr('text-anchor', 'middle')
            .style('fill', 'rgba(255,255,255,0.5)')
            .style('font-size', '10px')
            .text(min.toString());

        g.append('text')
            .attr('x', radius * 0.85)
            .attr('y', radius * 0.4)
            .attr('text-anchor', 'middle')
            .style('fill', 'rgba(255,255,255,0.5)')
            .style('font-size', '10px')
            .text(max.toString());

        // Value display
        g.append('text')
            .attr('y', 10)
            .attr('text-anchor', 'middle')
            .style('fill', valueColor)
            .style('font-size', '28px')
            .style('font-weight', '700')
            .text(value.toLocaleString());

        if (unit) {
            g.append('text')
                .attr('y', 30)
                .attr('text-anchor', 'middle')
                .style('fill', 'rgba(255,255,255,0.6)')
                .style('font-size', '12px')
                .text(unit);
        }

        // Label
        if (label) {
            g.append('text')
                .attr('y', radius * 0.6)
                .attr('text-anchor', 'middle')
                .style('fill', 'rgba(255,255,255,0.7)')
                .style('font-size', '13px')
                .style('font-weight', '500')
                .text(label);
        }

    }, [value, min, max, label, unit, style, zones]);

    return (
        <ChartContainer {...containerProps}>
            <svg ref={svgRef} className="w-full h-full" />
        </ChartContainer>
    );
}

export default GaugeChart;
