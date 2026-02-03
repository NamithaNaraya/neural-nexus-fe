/**
 * Graph Type Definitions
 * 
 * Shared types for graph visualization components.
 */

// View modes
export type GraphViewMode = '3d' | '2d' | 'hybrid';

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

// Color palette for node types
export const NODE_TYPE_COLORS: Record<string, string> = {
    Person: '#10B981',      // Emerald
    Place: '#3B82F6',       // Blue
    Organization: '#8B5CF6', // Purple
    Event: '#F59E0B',       // Amber
    Concept: '#EC4899',     // Pink
    Document: '#06B6D4',    // Cyan
    Date: '#EF4444',        // Red
    default: '#6B7280',     // Gray
};

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
