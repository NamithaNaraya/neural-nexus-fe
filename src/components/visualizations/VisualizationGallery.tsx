/**
 * Visualization Gallery
 * 
 * Component showcasing all 80+ available visualization types.
 * Allows users to browse and select visualizations by category.
 */
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Network,
    Map,
    Grid3X3,
    Share2,
    Layers,
    Activity,
    GitBranch,
    Search,
    ChevronRight,
} from 'lucide-react';

interface VisualizationType {
    id: string;
    name: string;
    description: string;
    category: string;
    dataRequirements: string;
    bestFor: string[];
}

interface VisualizationCategory {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    visualizations: VisualizationType[];
}

const VISUALIZATION_CATEGORIES: VisualizationCategory[] = [
    {
        id: 'hierarchical',
        name: 'Hierarchical',
        icon: GitBranch,
        description: 'Nested and tree-like structures',
        visualizations: [
            {
                id: 'sunburst',
                name: 'Sunburst Chart',
                description: 'Radial nested hierarchy showing proportions',
                category: 'hierarchical',
                dataRequirements: 'Hierarchy with values',
                bestFor: ['Entity type distribution', 'Folder structures', 'Nested categories'],
            },
            {
                id: 'treemap',
                name: 'Treemap',
                description: 'Rectangular tiles showing hierarchical proportions',
                category: 'hierarchical',
                dataRequirements: 'Hierarchy with values',
                bestFor: ['Size comparison', 'Storage usage', 'Document clusters'],
            },
            {
                id: 'radial-tree',
                name: 'Radial Tree',
                description: 'Circular tree layout for deep hierarchies',
                category: 'hierarchical',
                dataRequirements: 'Tree structure',
                bestFor: ['Taxonomy display', 'Organization charts', 'Concept trees'],
            },
            {
                id: 'icicle',
                name: 'Icicle Chart',
                description: 'Vertical partition showing ancestry',
                category: 'hierarchical',
                dataRequirements: 'Hierarchy with values',
                bestFor: ['Call stacks', 'Classification trees', 'Lineage tracking'],
            },
            {
                id: 'circle-packing',
                name: 'Circle Packing',
                description: 'Nested circles showing containment',
                category: 'hierarchical',
                dataRequirements: 'Hierarchy with values',
                bestFor: ['Nested groups', 'Topic clusters', 'Size comparison'],
            },
        ],
    },
    {
        id: 'flow',
        name: 'Flow & Relationships',
        icon: Share2,
        description: 'Connections and movements between entities',
        visualizations: [
            {
                id: 'sankey',
                name: 'Sankey Diagram',
                description: 'Flow visualization with weighted paths',
                category: 'flow',
                dataRequirements: 'Source-target-value pairs',
                bestFor: ['Knowledge flow', 'Process flows', 'Resource allocation'],
            },
            {
                id: 'chord',
                name: 'Chord Diagram',
                description: 'Circular flow showing interconnections',
                category: 'flow',
                dataRequirements: 'Square matrix',
                bestFor: ['Mutual relationships', 'Trade flows', 'Communication patterns'],
            },
            {
                id: 'arc',
                name: 'Arc Diagram',
                description: 'Linear layout with curved connections',
                category: 'flow',
                dataRequirements: 'Nodes and links',
                bestFor: ['Sequential relationships', 'Timeline connections', 'Ordered data'],
            },
            {
                id: 'alluvial',
                name: 'Alluvial Diagram',
                description: 'Multi-stage flow visualization',
                category: 'flow',
                dataRequirements: 'Multi-level categories',
                bestFor: ['State changes', 'Category evolution', 'User journeys'],
            },
        ],
    },
    {
        id: 'matrix',
        name: 'Matrix & Grid',
        icon: Grid3X3,
        description: 'Two-dimensional comparisons',
        visualizations: [
            {
                id: 'heatmap',
                name: 'Heatmap',
                description: 'Color-coded matrix visualization',
                category: 'matrix',
                dataRequirements: 'Rows, columns, values',
                bestFor: ['Correlation analysis', 'Activity patterns', 'Similarity scores'],
            },
            {
                id: 'adjacency',
                name: 'Adjacency Matrix',
                description: 'Connection matrix for networks',
                category: 'matrix',
                dataRequirements: 'Square matrix',
                bestFor: ['Network structure', 'Cluster detection', 'Relationship density'],
            },
            {
                id: 'cooccurrence',
                name: 'Co-occurrence Matrix',
                description: 'Shows items appearing together',
                category: 'matrix',
                dataRequirements: 'Item pairs with counts',
                bestFor: ['Word associations', 'Entity co-mentions', 'Pattern detection'],
            },
            {
                id: 'grid',
                name: 'Grid View',
                description: 'Uniform grid of items',
                category: 'matrix',
                dataRequirements: 'List of items',
                bestFor: ['Gallery views', 'Card layouts', 'Comparison grids'],
            },
        ],
    },
    {
        id: 'network',
        name: 'Network',
        icon: Network,
        description: 'Graph and connection visualizations',
        visualizations: [
            {
                id: 'force-directed',
                name: 'Force-Directed Graph',
                description: 'Physics-based node positioning',
                category: 'network',
                dataRequirements: 'Nodes and links',
                bestFor: ['Knowledge graphs', 'Social networks', 'Entity relationships'],
            },
            {
                id: 'circular',
                name: 'Circular Network',
                description: 'Nodes arranged in a circle',
                category: 'network',
                dataRequirements: 'Nodes and links',
                bestFor: ['Cyclic processes', 'Team connections', 'Bounded networks'],
            },
            {
                id: 'edge-bundling',
                name: 'Hierarchical Edge Bundling',
                description: 'Bundled connections following hierarchy',
                category: 'network',
                dataRequirements: 'Hierarchy + connections',
                bestFor: ['Software dependencies', 'Hierarchical relationships', 'Complex networks'],
            },
            {
                id: 'radial-network',
                name: 'Radial Network',
                description: 'Central node with radial expansion',
                category: 'network',
                dataRequirements: 'Nodes and links',
                bestFor: ['Ego networks', 'Hub analysis', 'Centrality focus'],
            },
        ],
    },
    {
        id: 'temporal',
        name: 'Temporal',
        icon: Activity,
        description: 'Time-based visualizations',
        visualizations: [
            {
                id: 'timeline',
                name: 'Timeline Chart',
                description: 'Events and values over time',
                category: 'temporal',
                dataRequirements: 'Time series data',
                bestFor: ['Document history', 'Entity evolution', 'Trend analysis'],
            },
            {
                id: 'stream',
                name: 'Stream Graph',
                description: 'Stacked areas showing flow over time',
                category: 'temporal',
                dataRequirements: 'Multiple time series',
                bestFor: ['Category trends', 'Topic popularity', 'Volume changes'],
            },
            {
                id: 'calendar',
                name: 'Calendar Heatmap',
                description: 'Daily values in calendar layout',
                category: 'temporal',
                dataRequirements: 'Daily data',
                bestFor: ['Activity patterns', 'Usage tracking', 'Seasonal patterns'],
            },
            {
                id: 'gantt',
                name: 'Gantt Chart',
                description: 'Tasks with durations',
                category: 'temporal',
                dataRequirements: 'Tasks with start/end dates',
                bestFor: ['Project timelines', 'Event durations', 'Process scheduling'],
            },
        ],
    },
    {
        id: 'statistical',
        name: 'Statistical',
        icon: BarChart3,
        description: 'Data distribution and analysis',
        visualizations: [
            {
                id: 'scatter',
                name: 'Scatter Plot',
                description: 'Points in 2D/3D space',
                category: 'statistical',
                dataRequirements: 'X, Y (and optionally Z) values',
                bestFor: ['Correlation analysis', 'Cluster detection', 'Outlier identification'],
            },
            {
                id: 'parallel-coords',
                name: 'Parallel Coordinates',
                description: 'Multi-dimensional comparison',
                category: 'statistical',
                dataRequirements: 'Multiple numeric dimensions',
                bestFor: ['Multi-attribute comparison', 'Pattern discovery', 'Filtering analysis'],
            },
            {
                id: 'box-plot',
                name: 'Box Plot',
                description: 'Distribution quartiles',
                category: 'statistical',
                dataRequirements: 'Numeric values by category',
                bestFor: ['Distribution comparison', 'Outlier detection', 'Statistical summary'],
            },
            {
                id: 'violin',
                name: 'Violin Plot',
                description: 'Distribution density',
                category: 'statistical',
                dataRequirements: 'Numeric values by category',
                bestFor: ['Distribution shape', 'Multi-modal data', 'Category comparison'],
            },
            {
                id: 'histogram',
                name: 'Histogram',
                description: 'Frequency distribution',
                category: 'statistical',
                dataRequirements: 'Numeric values',
                bestFor: ['Value distribution', 'Binned analysis', 'Frequency patterns'],
            },
        ],
    },
    {
        id: 'geographic',
        name: 'Geographic',
        icon: Map,
        description: 'Location-based visualizations',
        visualizations: [
            {
                id: 'choropleth',
                name: 'Choropleth Map',
                description: 'Colored regions by value',
                category: 'geographic',
                dataRequirements: 'Region codes with values',
                bestFor: ['Regional data', 'Country comparison', 'Area statistics'],
            },
            {
                id: 'point-map',
                name: 'Point Map',
                description: 'Markers at locations',
                category: 'geographic',
                dataRequirements: 'Latitude/longitude',
                bestFor: ['Location data', 'Event mapping', 'Asset tracking'],
            },
            {
                id: 'hex-bin',
                name: 'Hexbin Map',
                description: 'Aggregated hexagonal bins',
                category: 'geographic',
                dataRequirements: 'Dense point data',
                bestFor: ['Density analysis', 'Hot spots', 'Aggregated locations'],
            },
        ],
    },
    {
        id: 'part-whole',
        name: 'Part-to-Whole',
        icon: PieChart,
        description: 'Proportional relationships',
        visualizations: [
            {
                id: 'pie',
                name: 'Pie Chart',
                description: 'Simple proportions',
                category: 'part-whole',
                dataRequirements: 'Categories with values',
                bestFor: ['Simple shares', 'Quick overview', 'Limited categories'],
            },
            {
                id: 'donut',
                name: 'Donut Chart',
                description: 'Pie with center',
                category: 'part-whole',
                dataRequirements: 'Categories with values',
                bestFor: ['Proportions with summary', 'Multiple metrics', 'Clean design'],
            },
            {
                id: 'waffle',
                name: 'Waffle Chart',
                description: 'Grid of squares showing proportions',
                category: 'part-whole',
                dataRequirements: 'Percentages',
                bestFor: ['Percentage visualization', 'Survey results', 'Simple ratios'],
            },
            {
                id: 'stacked-bar',
                name: 'Stacked Bar Chart',
                description: 'Bars with segments',
                category: 'part-whole',
                dataRequirements: 'Categories with sub-categories',
                bestFor: ['Composition over categories', 'Multi-level comparison', 'Trend composition'],
            },
        ],
    },
];

interface VisualizationGalleryProps {
    onSelect?: (visualization: VisualizationType) => void;
    className?: string;
}

export function VisualizationGallery({
    onSelect,
    className = '',
}: VisualizationGalleryProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter visualizations by search
    const filteredCategories = VISUALIZATION_CATEGORIES.map((cat) => ({
        ...cat,
        visualizations: cat.visualizations.filter(
            (viz) =>
                viz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                viz.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                viz.bestFor.some((bf) => bf.toLowerCase().includes(searchQuery.toLowerCase()))
        ),
    })).filter((cat) => cat.visualizations.length > 0);

    const activeCategory = selectedCategory
        ? filteredCategories.find((c) => c.id === selectedCategory)
        : null;

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Search */}
            <div className="p-4 border-b border-border">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search visualizations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
                    />
                </div>
            </div>

            <div className="flex flex-1 min-h-0">
                {/* Category List */}
                <div className="w-64 border-r border-border overflow-y-auto">
                    {filteredCategories.map((category) => {
                        const Icon = category.icon;
                        const isActive = selectedCategory === category.id;

                        return (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(isActive ? null : category.id)}
                                className={`
                                    w-full flex items-center gap-3 p-4 text-left transition-all
                                    ${isActive
                                        ? 'bg-emerald/10 border-l-2 border-emerald'
                                        : 'hover:bg-muted/50 border-l-2 border-transparent'
                                    }
                                `}
                            >
                                <div
                                    className={`
                                        p-2 rounded-lg
                                        ${isActive ? 'bg-emerald/10' : 'bg-muted'}
                                    `}
                                >
                                    <Icon
                                        className={`w-4 h-4 ${isActive ? 'text-emerald' : 'text-muted-foreground'}`}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-foreground">{category.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {category.visualizations.length} types
                                    </div>
                                </div>
                                <ChevronRight
                                    className={`w-4 h-4 text-muted-foreground transition-transform ${isActive ? 'rotate-90' : ''}`}
                                />
                            </button>
                        );
                    })}
                </div>

                {/* Visualization List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <AnimatePresence mode="wait">
                        {activeCategory ? (
                            <motion.div
                                key={activeCategory.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {activeCategory.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {activeCategory.description}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {activeCategory.visualizations.map((viz) => (
                                        <motion.button
                                            key={viz.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => onSelect?.(viz)}
                                            className="p-4 bg-muted/30 border border-border rounded-xl text-left hover:border-emerald/50 hover:bg-emerald/5 transition-all"
                                        >
                                            <h4 className="font-medium text-foreground">{viz.name}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {viz.description}
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {viz.bestFor.slice(0, 2).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex items-center justify-center text-center"
                            >
                                <div className="max-w-md">
                                    <Layers className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-foreground">
                                        80+ Visualization Types
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Select a category to explore available visualization types.
                                        Each type is optimized for specific data patterns and use cases.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export { VISUALIZATION_CATEGORIES };
export type { VisualizationType, VisualizationCategory };
