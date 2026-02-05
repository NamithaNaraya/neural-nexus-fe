'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DonutChartProps {
    value: number; // 0 to 100
    label?: string;
    subLabel?: string;
    color?: string;
    width?: number;
    height?: number;
}

export function DonutChart({
    value,
    label,
    subLabel,
    color = '#10B981',
    width = 300,
    height = 300
}: DonutChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const radius = Math.min(width, height) / 2;
        const thickness = 20;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // Background Arc
        const bgArc = d3.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius)
            .startAngle(0)
            .endAngle(2 * Math.PI);

        g.append('path')
            .attr('d', bgArc as any)
            .attr('fill', '#374151') // muted
            .attr('fill-opacity', 0.2);

        // Value Arc
        const dataArc = d3.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius)
            .startAngle(0)
            .endAngle((value / 100) * 2 * Math.PI);

        g.append('path')
            .attr('d', dataArc as any)
            .attr('fill', color)
            .attr('stroke', color)
            .attr('stroke-width', 1)
            .call(transition);

        function transition(path: any) {
            path.transition()
                .duration(1000)
                .attrTween('d', function (d: any) {
                    const i = d3.interpolate(0, (value / 100) * 2 * Math.PI);
                    return function (t: number) {
                        dataArc.endAngle(i(t));
                        return dataArc(d) || '';
                    };
                });
        }

        // Center Text
        if (label) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '-0.2em')
                .style('font-size', '24px')
                .style('font-weight', 'bold')
                .style('fill', 'currentColor')
                .text(`${Math.round(value)}%`);

            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '1.2em')
                .style('font-size', '14px')
                .style('fill', '#9CA3AF')
                .text(label);
        }

    }, [value, label, color, width, height]);

    return (
        <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="overflow-visible text-foreground"
        />
    );
}
