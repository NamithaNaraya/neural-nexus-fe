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

// Extended Pastel Color Palette — visually pleasing soft hues
const COLOR_PALETTE = [
    '#A78BFA', // Soft Violet
    '#F472B6', // Soft Pink
    '#FB923C', // Soft Orange
    '#FCD34D', // Soft Amber
    '#6EE7B7', // Soft Emerald
    '#7DD3FC', // Soft Sky
    '#FCA5A5', // Soft Red
    '#86EFAC', // Soft Green
    '#C084FC', // Soft Purple
    '#5EEAD4', // Soft Teal
    '#818CF8', // Soft Indigo
    '#BEF264', // Soft Lime
    '#FDA4AF', // Soft Rose
    '#67E8F9', // Soft Cyan
    '#FDE047', // Soft Yellow
    '#93C5FD', // Soft Blue
    '#D8B4FE', // Soft Fuchsia
    '#FDBA74', // Soft Peach
    '#99F6E4', // Soft Mint
    '#E9D5FF', // Light Violet
    '#FECDD3', // Light Rose
    '#BBF7D0', // Light Green
    '#BFDBFE', // Light Blue
    '#FED7AA', // Light Orange
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
            const color = `hsl(${Math.round(hue)}, 70%, 75%)`;
            assignedTypeColors.set(prop, color);
            return color;
        }
    }
);
// ── Relationship colour palette ──
// Rich, saturated-but-classic hues that pair well with the pastel node colours.
// Deliberately darker/deeper than the node palette so edges are distinct.
const REL_COLOR_PALETTE = [
    '#2563EB', // Strong Blue
    '#059669', // Forest Green
    '#D97706', // Warm Amber
    '#7C3AED', // Deep Violet
    '#DB2777', // Rich Pink
    '#0891B2', // Deep Cyan
    '#DC2626', // Brick Red
    '#65A30D', // Olive Green
    '#9333EA', // Bold Purple
    '#0D9488', // Deep Teal
    '#EA580C', // Burnt Orange
    '#1D4ED8', // Royal Blue
    '#BE185D', // Magenta Rose
    '#15803D', // Deep Green
    '#B45309', // Caramel Brown
    '#6D28D9', // Dark Indigo
    '#0E7490', // Petrol Blue
    '#C2410C', // Rust
    '#166534', // Dark Forest
    '#7E22CE', // Grape
];

// Separate assigned/used maps for relationship colours (independent of node palette)
const assignedRelColors = new Map<string, string>();
const usedRelColorIndices = new Set<number>();

// Dynamic proxy — each relationship type deterministically gets a unique colour
export const RELATIONSHIP_COLORS: Record<string, string> = new Proxy(
    {
        default: '#64748B', // Slate default
    },
    {
        get: (target: Record<string, string>, prop: string | symbol) => {
            if (typeof prop !== 'string' || prop === 'default') return target.default;
            if (prop in target) return target[prop];
            if (assignedRelColors.has(prop)) return assignedRelColors.get(prop)!;

            // Find an unused palette colour starting from this type's hash
            const hash = getStringHash(prop);
            let idx = hash % REL_COLOR_PALETTE.length;

            for (let attempt = 0; attempt < REL_COLOR_PALETTE.length; attempt++) {
                const candidateIdx = (idx + attempt) % REL_COLOR_PALETTE.length;
                if (!usedRelColorIndices.has(candidateIdx)) {
                    usedRelColorIndices.add(candidateIdx);
                    const color = REL_COLOR_PALETTE[candidateIdx];
                    assignedRelColors.set(prop, color);
                    return color;
                }
            }

            // Palette exhausted — generate from golden-angle HSL
            const hue = (assignedRelColors.size * 137.508) % 360;
            const color = `hsl(${Math.round(hue)}, 65%, 40%)`;
            assignedRelColors.set(prop, color);
            return color;
        }
    }
);


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
