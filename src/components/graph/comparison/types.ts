/**
 * Cluster Comparison Types
 * 
 * TypeScript interfaces for the comparison visualization system.
 */

export type ComparisonMode = 'split' | 'merge' | 'highlight';

export type ClusterType = 'file' | 'folder' | 'cluster' | 'selection';

export type NodeCategory = 'unique-left' | 'unique-right' | 'common' | 'bridge' | 'missing';

export interface ClusterConfig {
    type: ClusterType;
    id: string;
    name: string;
    node_ids?: string[];
}

export interface ComparisonNode {
    id: string;
    name: string;
    type: string;
    category: NodeCategory;
    x?: number;
    y?: number;
    // For bridge nodes
    leftConnections?: number;
    rightConnections?: number;
}

export interface ComparisonLink {
    source: string;
    target: string;
    type: string;
    isBridge?: boolean;
    isVirtual?: boolean; // For predicted missing links
}

export interface BridgeNode {
    id: string;
    name: string;
    type: string;
    leftConnections: number;
    rightConnections: number;
    bridgeStrength: number;
}

export interface ComparisonResult {
    // Node lists
    leftNodes: ComparisonNode[];
    rightNodes: ComparisonNode[];
    leftLinks: ComparisonLink[];
    rightLinks: ComparisonLink[];

    // Analysis results
    commonEntities: string[];
    commonCount: number;
    uniqueLeft: string[];
    uniqueLeftCount: number;
    uniqueRight: string[];
    uniqueRightCount: number;

    // Bridge analysis
    bridges: BridgeNode[];
    bridgeCount: number;

    // Similarity metrics
    semanticSimilarity: number;
    structuralSimilarity: number;
    jaccardIndex: number;

    // Missing entities (predicted)
    missingInLeft?: string[];
    missingInRight?: string[];
}

export interface ComparisonViewState {
    mode: ComparisonMode;
    leftCluster: ClusterConfig | null;
    rightCluster: ClusterConfig | null;
    result: ComparisonResult | null;
    isLoading: boolean;
    error: string | null;

    // Visual state
    showBridges: boolean;
    highlightCommon: boolean;
    showMissing: boolean;
    selectedNodes: string[];
}

// Color constants for node categories
export const CATEGORY_COLORS: Record<NodeCategory, string> = {
    'unique-left': '#3B82F6',   // Blue
    'unique-right': '#F97316',  // Orange
    'common': '#22C55E',        // Green
    'bridge': '#A855F7',        // Purple
    'missing': '#9CA3AF',       // Gray
};

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
    'unique-left': 'Unique to Left',
    'unique-right': 'Unique to Right',
    'common': 'Common to Both',
    'bridge': 'Bridge Node',
    'missing': 'Predicted Missing',
};
