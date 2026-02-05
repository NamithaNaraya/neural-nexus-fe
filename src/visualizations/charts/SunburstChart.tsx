'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface HierarchyNode {
    name: string;
    value?: number;
    color?: string;
    children?: HierarchyNode[];
}

interface SunburstChartProps {
    data: HierarchyNode;
    width?: number;
    height?: number;
}

export function SunburstChart({ data, width = 500, height = 500 }: SunburstChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data) return;

        const radius = Math.min(width, height) / 2;

        // Clear previous
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // Partition layout
        const root = d3.hierarchy(data)
            .sum(d => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        const partition = d3.partition<HierarchyNode>()
            .size([2 * Math.PI, radius]);

        partition(root);

        // Arc generator
        const arc = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1);

        // Draw arcs
        g.selectAll('path')
            .data(root.descendants().filter(d => d.depth)) // Filter out root circle
            .join('path')
            .attr('fill', d => {
                const node = d.data as HierarchyNode;
                if (node.color) return node.color;
                let current = d;
                while (current.parent) {
                    current = current.parent;
                    const parentNode = current.data as HierarchyNode;
                    if (parentNode.color) return parentNode.color;
                }
                return '#ccc';
            })
            .attr('fill-opacity', d => d.children ? 0.8 : 0.6)
            .attr('d', arc as any) // Cast arc to any to avoid complex d3 typing issues
            .append('title')
            .text(d => `${d.ancestors().map(n => (n.data as HierarchyNode).name).reverse().join('/')}\n${d.value}`);

        // Label arcs
        g.selectAll('text')
            .data(root.descendants().filter(d => {
                const rect = d as unknown as d3.HierarchyRectangularNode<HierarchyNode>;
                return d.depth && (rect.y0 + rect.y1) / 2 * (rect.x1 - rect.x0) > 10;
            }))
            .join('text')
            .attr('transform', function (d) {
                const rect = d as unknown as d3.HierarchyRectangularNode<HierarchyNode>;
                const x = (rect.x0 + rect.x1) / 2 * 180 / Math.PI;
                const y = (rect.y0 + rect.y1) / 2;
                return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
            })
            .attr('dy', '0.35em')
            .style('font-size', '10px')
            .style('fill', '#fff')
            .style('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .text(d => (d.data as HierarchyNode).name.slice(0, 10));

    }, [data, width, height]);

    return (
        <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="overflow-visible"
        />
    );
}
