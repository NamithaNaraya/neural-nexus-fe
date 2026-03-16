/**
 * Graph Type Definitions
 * 
 * Shared types for graph visualization components.
 */

// View modes
export type GraphViewMode = '3d' | '2d' | 'charts' | 'hybrid' | 'list' | 'tree' | 'sunburst';

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

// Extended Color Palette — maximally distinct hues (no two adjacent hues are close)
const COLOR_PALETTE = [
    '#6366F1', // Indigo
    '#F43F5E', // Rose
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#0EA5E9', // Sky
    '#F97316', // Orange
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#3B82F6', // Blue
    '#84CC16', // Lime
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#7C3AED', // Deep Purple
    '#2DD4BF', // Mint
    '#64748B', // Slate
    '#D946EF', // Fuchsia
    '#EA580C', // Deep Orange
    '#0D9488', // Dark Teal
    '#A855F7', // Purple
    '#E11D48', // Crimson
    '#059669', // Green
    '#CA8A04', // Dark Amber
    '#4F46E5', // Deep Indigo
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

// Assigned type→color map to guarantee no two types share a color
const assignedTypeColors = new Map<string, string>();
const usedColorIndices = new Set<number>();

// Dynamic color proxy — guarantees unique color per type
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

            // Check if we have a hardcoded override
            if (prop in target) {
                return target[prop];
            }

            // Already assigned? Return it
            if (assignedTypeColors.has(prop)) {
                return assignedTypeColors.get(prop)!;
            }

            // Find an unused palette color, starting from the hash position
            const hash = getStringHash(prop);
            let idx = hash % COLOR_PALETTE.length;

            // Walk forward through the palette to find unused color
            for (let attempt = 0; attempt < COLOR_PALETTE.length; attempt++) {
                const candidateIdx = (idx + attempt) % COLOR_PALETTE.length;
                if (!usedColorIndices.has(candidateIdx)) {
                    usedColorIndices.add(candidateIdx);
                    const color = COLOR_PALETTE[candidateIdx];
                    assignedTypeColors.set(prop, color);
                    return color;
                }
            }

            // Palette exhausted — generate a unique HSL color based on the assignment count
            const hue = (assignedTypeColors.size * 137.508) % 360; // Golden angle for max spread
            const color = `hsl(${Math.round(hue)}, 65%, 55%)`;
            assignedTypeColors.set(prop, color);
            return color;
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
