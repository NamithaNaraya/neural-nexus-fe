import React, { useMemo } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { ChartCard, ChartType } from './ChartCard';
import { NODE_TYPE_COLORS, RELATIONSHIP_COLORS } from '../components/graph/types';
import { Download, Activity, Layers, Grid } from 'lucide-react';
import { HeatmapChart } from '../components/visualizations/matrix/HeatmapChart';
import { TreemapChart } from '../components/visualizations/hierarchical/TreemapChart';
import { SunburstChart } from './charts/SunburstChart';
import { DonutChart } from './charts/DonutChart';
import { BarChart } from './charts/BarChart';

export function DataCanvas() {
    const { nodes, links, filters, filteredNodes, filteredLinks } = useGraphStore();
    const customColors = filters.customNodeTypeColors || {};

    // Compute visible data based on current filters
    const visibleNodes = useMemo(() => filteredNodes(), [nodes, filters, filteredNodes]);
    const visibleLinks = useMemo(() => filteredLinks(), [links, filters, nodes, filteredLinks]);

    // 1. Node Type Distribution
    const nodeTypeData = useMemo(() => {
        const counts: Record<string, number> = {};
        visibleNodes.forEach(n => {
            counts[n.type] = (counts[n.type] || 0) + 1;
        });
        const total = visibleNodes.length;

        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1]) // Sort desc
            .map(([label, value]) => ({
                label,
                value,
                color: customColors[label] || NODE_TYPE_COLORS[label] || NODE_TYPE_COLORS.default,
                percentage: total > 0 ? (value / total) * 100 : 0
            }));
    }, [visibleNodes]);

    // 2. Top Connected Nodes (Degree)
    const topDegreeData = useMemo(() => {
        const degrees: Record<string, number> = {};
        visibleLinks.forEach(l => {
            const sid = typeof l.source === 'object' ? (l.source as any).id : l.source;
            const tid = typeof l.target === 'object' ? (l.target as any).id : l.target;
            degrees[sid] = (degrees[sid] || 0) + 1;
            degrees[tid] = (degrees[tid] || 0) + 1;
        });

        return visibleNodes
            .map(n => ({
                label: n.name.length > 15 ? n.name.substring(0, 15) + '...' : n.name,
                value: degrees[n.id] || 0,
                color: customColors[n.type] || NODE_TYPE_COLORS[n.type]
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [visibleNodes, visibleLinks]);

    // 3. Relationship Type Distribution
    const linkTypeData = useMemo(() => {
        const counts: Record<string, number> = {};
        visibleLinks.forEach(l => {
            counts[l.type] = (counts[l.type] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({
                label: label.replace(/_/g, ' '),
                value,
                color: RELATIONSHIP_COLORS[label] || RELATIONSHIP_COLORS.default
            }));
    }, [visibleLinks]);

    // 4. Hierarchical Data for Sunburst (Type -> Name)
    const sunburstData = useMemo(() => {
        const root = { name: "Graph", children: [] as any[] };
        const types: Record<string, any> = {};

        visibleNodes.forEach(n => {
            if (!types[n.type]) {
                types[n.type] = {
                    name: n.type,
                    children: [],
                    color: customColors[n.type] || NODE_TYPE_COLORS[n.type]
                };
                root.children.push(types[n.type]);
            }
            types[n.type].children.push({
                name: n.name,
                value: 1,
                color: customColors[n.type] || NODE_TYPE_COLORS[n.type]
            });
        });

        return root;
    }, [visibleNodes]);

    // 5. Mock Completeness Score (Replace with real metric later)
    const completenessScore = useMemo(() => {
        // Simple metric: Ratio of nodes with > 0 relationships
        const connectedNodes = new Set();
        visibleLinks.forEach(l => {
            connectedNodes.add(typeof l.source === 'object' ? (l.source as any).id : l.source);
            connectedNodes.add(typeof l.target === 'object' ? (l.target as any).id : l.target);
        });
        const ratio = visibleNodes.length > 0 ? (connectedNodes.size / visibleNodes.length) * 100 : 0;
        return Math.round(ratio);
    }, [visibleNodes, visibleLinks]);


    // 6. Hierarchical Data (Hierarchy / Treemap)
    const treemapData = useMemo(() => {
        const types = Array.from(new Set(visibleNodes.map(n => n.type)));
        const children = types.map(type => ({
            id: type,
            name: type,
            children: visibleNodes
                .filter(n => n.type === type)
                .map(n => ({ id: n.id, name: n.name, value: 1 }))
        }));
        return { id: 'root', name: 'Knowledge Graph', children };
    }, [visibleNodes]);

    // 7. Heatmap Data (Type vs Type Intensity)
    const heatmapData = useMemo(() => {
        const types = Array.from(new Set(visibleNodes.map(n => n.type))).sort();
        const matrix = types.map(rowType =>
            types.map(colType => {
                return visibleLinks.filter(l => {
                    const s = visibleNodes.find(n => n.id === (typeof l.source === 'object' ? (l.source as any).id : l.source));
                    const t = visibleNodes.find(n => n.id === (typeof l.target === 'object' ? (l.target as any).id : l.target));
                    return s?.type === rowType && t?.type === colType;
                }).length;
            })
        );
        return { rows: types, columns: types, values: matrix };
    }, [visibleNodes, visibleLinks]);

    return (
        <div className="flex-1 min-h-0 w-full overflow-y-auto bg-background p-6">
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Data Canvas</h1>
                        <p className="text-muted-foreground mt-1">
                            Visual analytics of {visibleNodes.length} nodes and {visibleLinks.length} relationships
                            {nodes.length !== visibleNodes.length && <span className="text-emerald-500 ml-2 font-medium">(Filtered)</span>}
                        </p>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                            <Download className="w-4 h-4" />
                            Export Report
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {/* Card 1: Node Types (Bar or Donut) */}
                    <ChartCard
                        title="Node Type Distribution"
                        subtitle="Count of entities by category"
                        availableTypes={['bar', 'donut']}
                        defaultType="bar"
                        renderChart={(type, isMaximized) => {
                            const width = isMaximized ? 900 : 500;
                            const height = isMaximized ? 600 : 300;

                            if (type === 'donut') {
                                // For donut, just pick the top category as validation or render a custom multi-donut
                                // Currently basic donut only supports single value
                                // TODO: Upgrade DonutChart to support multi-value or multiple rings
                                // For now, let's render the LARGEST category
                                const top = nodeTypeData[0] || { label: 'None', value: 0, percentage: 0 };
                                return (
                                    <div className="flex flex-wrap gap-4 justify-center">
                                        {nodeTypeData.slice(0, isMaximized ? 6 : 3).map(d => (
                                            <DonutChart
                                                key={d.label}
                                                value={d.percentage}
                                                label={d.label}
                                                color={d.color}
                                                width={isMaximized ? 250 : 120}
                                                height={isMaximized ? 250 : 120}
                                            />
                                        ))}
                                    </div>
                                );
                            }
                            return (
                                <BarChart
                                    data={nodeTypeData}
                                    width={width}
                                    height={height}
                                    xAxisLabel="Entity Type"
                                    yAxisLabel="Count"
                                />
                            );
                        }}
                    />

                    {/* Card 2: Entity Hierarchy (Sunburst only for now) */}
                    <ChartCard
                        title="Entity Hierarchy"
                        subtitle="Drill-down: Type > Entity"
                        availableTypes={['sunburst']}
                        renderChart={(type, isMaximized) => (
                            <div className="flex justify-center">
                                <SunburstChart
                                    data={sunburstData}
                                    width={isMaximized ? 700 : 300}
                                    height={isMaximized ? 700 : 300}
                                />
                            </div>
                        )}
                    />

                    {/* Card 3: Top Nodes (Bar only) */}
                    <ChartCard
                        title="Most Connected Entities"
                        subtitle="Top 10 hubs by degree centrality"
                        availableTypes={['bar']}
                        renderChart={(type, isMaximized) => (
                            <BarChart
                                data={topDegreeData}
                                width={isMaximized ? 900 : 500}
                                height={isMaximized ? 600 : 300}
                                xAxisLabel="Entity Name"
                                yAxisLabel="Connections"
                            />
                        )}
                    />

                    {/* Card 4: Knowledge Health (Donut only) */}
                    <ChartCard
                        title="Knowledge Health"
                        subtitle="Graph connectivity score"
                        availableTypes={['donut']}
                        renderChart={(type, isMaximized) => (
                            <div className="flex items-center justify-center p-4">
                                <DonutChart
                                    value={completenessScore}
                                    label="Connectivity"
                                    color="#10B981"
                                    width={isMaximized ? 400 : 200}
                                    height={isMaximized ? 400 : 200}
                                />
                            </div>
                        )}
                    />

                    {/* Card 5: Relationship Types (Bar only) */}
                    <ChartCard
                        title="Relationship Types"
                        subtitle="Distribution of connection types"
                        availableTypes={['bar']}
                        renderChart={(type, isMaximized) => (
                            <BarChart
                                data={linkTypeData}
                                width={isMaximized ? 900 : 500}
                                height={isMaximized ? 600 : 300}
                                xAxisLabel="Relationship"
                                yAxisLabel="Count"
                            />
                        )}
                    />

                    {/* Card 6: Relationship Intensity (Heatmap) */}
                    <ChartCard
                        title="Connection Density"
                        subtitle="Heatmap of type-to-type interactions"
                        availableTypes={['heatmap']}
                        defaultType="heatmap"
                        renderChart={(type, isMaximized) => (
                            <HeatmapChart
                                data={heatmapData}
                                config={{
                                    width: isMaximized ? 900 : 500,
                                    height: isMaximized ? 600 : 350
                                }}
                                colorScheme="warm"
                            />
                        )}
                    />

                    {/* Card 8: Hierarchical Distribution (Treemap) */}
                    <ChartCard
                        title="EntityType Distribution"
                        subtitle="Sized by node density"
                        availableTypes={['treemap']}
                        defaultType="treemap"
                        renderChart={(type, isMaximized) => (
                            <TreemapChart
                                data={treemapData}
                                config={{
                                    width: isMaximized ? 900 : 500,
                                    height: isMaximized ? 600 : 350
                                }}
                            />
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
