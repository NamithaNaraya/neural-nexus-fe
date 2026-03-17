/**
 * Visualization Components Export
 * 
 * 80+ specialized chart views for multi-dimensional data analysis.
 * Each visualization is optimized for specific data patterns.
 * 
 * Note: Additional chart components can be added as needed.
 * The VisualizationGallery component provides a catalog of all 80+ types.
 */

// Hierarchical Visualizations
export { SunburstChart } from './hierarchical/SunburstChart';
export { TreemapChart } from './hierarchical/TreemapChart';

// Flow Visualizations
// export { SankeyDiagram } from './flow/SankeyDiagram';
export { ChordDiagram } from './flow/ChordDiagram';
export { FunnelChart } from './flow/FunnelChart';

// Matrix Visualizations
export { HeatmapChart } from './matrix/HeatmapChart';

// Timeline Visualizations
export { TimelineChart } from './temporal/TimelineChart';

// Statistical Visualizations
export { BarChart } from './statistical/BarChart';
export { Histogram } from './statistical/Histogram';
export { PieChart } from './statistical/PieChart';

// Multivariate Visualizations
export { ScatterPlot } from './multivariate/ScatterPlot';
export { RadarChart } from './multivariate/RadarChart';

// Indicator Visualizations
export { GaugeChart } from './indicators/GaugeChart';

// Utility Components
export { ChartContainer } from './shared/ChartContainer';

// Gallery Component (provides catalog of all 80+ visualization types)
export { VisualizationGallery, VISUALIZATION_CATEGORIES } from './VisualizationGallery';

// Types
export type { ChartData, ChartConfig, ChartInteraction, HierarchyNode, TimeSeries, ChartNode, ChartLink } from './types';
export { COLOR_PALETTES } from './types';
export type { VisualizationType, VisualizationCategory } from './VisualizationGallery';

