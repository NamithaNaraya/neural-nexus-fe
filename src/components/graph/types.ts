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

// Extended Color Palette (Strictly "Super" Neons)
const COLOR_PALETTE = [
    '#FF00FF', // Neon Pink (Hot)
    '#00FFFF', // Cyan Neon (Cold)
    '#00FF00', // Lime Neon (Electric)
    '#FFFF00', // Yellow Neon (Cyber)
    '#AA00FF', // Purple Neon (Deep)
    '#FF3D00', // Orange Neon (Sunset)
    '#00E5FF', // Aqua Neon
    '#76FF03', // Volt Green
    '#D500F9', // Magenta Pulse
    '#F50057', // Rose Neon
    '#651FFF', // Indigo Neon
    '#C6FF00', // Chartreuse Neon
    '#FF9100', // Amber Pulse
    '#00B0FF', // Sky Neon
    '#00E676', // Spring Green
    '#FFEA00', // Lemon Neon
    '#FF4081', // Pink Punch
    '#304FFE', // Lucid Blue
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
