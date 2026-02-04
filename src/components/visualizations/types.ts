/**
 * Chart Types
 * 
 * Common types for all visualization components.
 */

export interface ChartData {
    nodes?: ChartNode[];
    links?: ChartLink[];
    hierarchy?: HierarchyNode;
    matrix?: number[][];
    series?: TimeSeries[];
    values?: DataPoint[];
}

export interface ChartNode {
    id: string;
    name: string;
    type?: string;
    value?: number;
    group?: string;
    color?: string;
    metadata?: Record<string, unknown>;
}

export interface ChartLink {
    source: string;
    target: string;
    value?: number;
    type?: string;
    metadata?: Record<string, unknown>;
}

export interface HierarchyNode {
    id: string;
    name: string;
    value?: number;
    children?: HierarchyNode[];
    metadata?: Record<string, unknown>;
}

export interface TimeSeries {
    id: string;
    name: string;
    values: TimePoint[];
    color?: string;
}

export interface TimePoint {
    date: Date | string;
    value: number;
    metadata?: Record<string, unknown>;
}

export interface DataPoint {
    x: number;
    y: number;
    z?: number;
    label?: string;
    category?: string;
    size?: number;
    color?: string;
    metadata?: Record<string, unknown>;
}

export interface ChartConfig {
    width?: number;
    height?: number;
    margin?: { top: number; right: number; bottom: number; left: number };
    colorScheme?: string[];
    animated?: boolean;
    interactive?: boolean;
    showLegend?: boolean;
    showTooltip?: boolean;
    showLabels?: boolean;
    responsive?: boolean;
}

export interface ChartInteraction {
    onNodeClick?: (node: ChartNode) => void;
    onNodeHover?: (node: ChartNode | null) => void;
    onLinkClick?: (link: ChartLink) => void;
    onLinkHover?: (link: ChartLink | null) => void;
    onZoom?: (transform: { x: number; y: number; k: number }) => void;
    onBrush?: (selection: [Date, Date] | [[number, number], [number, number]]) => void;
}

// Color Palettes
export const COLOR_PALETTES = {
    neural: [
        '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
        '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
    ],
    warm: [
        '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24',
        '#f59e0b', '#d97706', '#b45309', '#92400e',
    ],
    cool: [
        '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8',
        '#0ea5e9', '#0284c7', '#0369a1', '#075985',
    ],
    diverging: [
        '#dc2626', '#f87171', '#fca5a5', '#fef2f2',
        '#f0fdf4', '#86efac', '#22c55e', '#15803d',
    ],
    categorical: [
        '#6366f1', '#ec4899', '#f97316', '#eab308',
        '#22c55e', '#06b6d4', '#8b5cf6', '#f43f5e',
    ],
} as const;

export type ColorPalette = keyof typeof COLOR_PALETTES;
