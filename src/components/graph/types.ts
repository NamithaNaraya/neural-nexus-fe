/**
 * Graph Type Definitions
 * 
 * Shared types for graph visualization components.
 */

// View modes
export type GraphViewMode = '3d' | '2d' | 'charts' | 'hybrid' | 'list';

// Node interaction states
export interface NodeInteraction {
    id: string;
    isHovered: boolean;
    isSelected: boolean;
    isExpanded: boolean;
    isFocused: boolean;
    opacity: number;
}

// Graph configuration
export interface GraphConfig {
    viewMode: GraphViewMode;
    enablePhysics: boolean;
    showLabels: boolean;
    showTooltips: boolean;

    // 3D specific
    enableRotation: boolean;
    enableZoom: boolean;
    particleEffects: boolean;

    // 2D specific
    forceStrength: number;
    linkDistance: number;

    // Performance
    lodEnabled: boolean;
    maxVisibleNodes: number;
    cullingEnabled: boolean;
}

// Node visual configuration
export interface NodeVisualConfig {
    baseSize: number;
    sizeByDegree: boolean;
    colorByType: boolean;
    showLabels: boolean;
    labelSize: number;
}

// Link visual configuration
export interface LinkVisualConfig {
    baseWidth: number;
    colorByType: boolean;
    showArrows: boolean;
    showLabels: boolean;
    curvature: number;
}

// Extended Color Palette (30+ distinct colors)
const COLOR_PALETTE = [
    '#EF4444', // Red 500
    '#F97316', // Orange 500
    '#F59E0B', // Amber 500
    '#84CC16', // Lime 500
    '#10B981', // Emerald 500
    '#06B6D4', // Cyan 500
    '#3B82F6', // Blue 500
    '#6366F1', // Indigo 500
    '#8B5CF6', // Violet 500
    '#D946EF', // Fuchsia 500
    '#F43F5E', // Rose 500
    '#E11D48', // Rose 600
    '#BE123C', // Rose 700
    '#C026D3', // Fuchsia 600
    '#9333EA', // Purple 600
    '#7E22CE', // Purple 700
    '#4F46E5', // Indigo 600
    '#4338CA', // Indigo 700
    '#2563EB', // Blue 600
    '#1D4ED8', // Blue 700
    '#0284C7', // Sky 600
    '#0369A1', // Sky 700
    '#0891B2', // Cyan 600
    '#0E7490', // Cyan 700
    '#059669', // Emerald 600
    '#047857', // Emerald 700
    '#16A34A', // Green 600
    '#15803D', // Green 700
    '#65A30D', // Lime 600
    '#4D7C0F', // Lime 700
    '#CA8A04', // Yellow 600
    '#A16207', // Yellow 700
    '#EA580C', // Orange 600
    '#C2410C', // Orange 700
    '#DC2626', // Red 600
    '#B91C1C', // Red 700
];

// Helper to deterministically map a string to a color index
const getStringHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

// Dynamic color proxy
export const NODE_TYPE_COLORS: Record<string, string> = new Proxy(
    {
        default: '#6B7280', // Gray default
    },
    {
        get: (target: Record<string, string>, prop: string | symbol) => {
            // Return default for symbol or 'default' key
            if (typeof prop !== 'string' || prop === 'default') {
                return target.default;
            }

            // Check if we have a hardcoded override (keep 'default' just in case)
            if (prop in target) {
                return target[prop];
            }

            // Generate color from palette based on string hash
            const hash = getStringHash(prop);
            return COLOR_PALETTE[hash % COLOR_PALETTE.length];
        }
    }
);
// Relationship type colors
export const RELATIONSHIP_COLORS: Record<string, string> = {
    WORKS_FOR: '#3B82F6',
    LIVES_IN: '#10B981',
    MARRIED_TO: '#EC4899',
    RELATED_TO: '#8B5CF6',
    OWNS: '#F59E0B',
    PART_OF: '#06B6D4',
    default: '#6B7280',
};

// Camera presets
export interface CameraPreset {
    name: string;
    position: { x: number; y: number; z: number };
    lookAt: { x: number; y: number; z: number };
}

export const CAMERA_PRESETS: CameraPreset[] = [
    { name: 'Default', position: { x: 0, y: 0, z: 500 }, lookAt: { x: 0, y: 0, z: 0 } },
    { name: 'Top-Down', position: { x: 0, y: 500, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
    { name: 'Side View', position: { x: 500, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
    { name: 'Isometric', position: { x: 400, y: 400, z: 400 }, lookAt: { x: 0, y: 0, z: 0 } },
];

// Layout algorithms
export type LayoutAlgorithm = 'force' | 'radial' | 'hierarchical' | 'circular' | 'grid';

// Expansion state for progressive exploration
export interface ExpansionState {
    expandedNodes: Set<string>;
    collapsedNodes: Set<string>;
    visibleDepth: number;
    rootNodeId: string | null;
}

// Focus mode for path highlighting
export interface FocusMode {
    enabled: boolean;
    sourceNodeId: string | null;
    targetNodeId: string | null;
    pathNodeIds: string[];
    pathLinkIds: string[];
}
