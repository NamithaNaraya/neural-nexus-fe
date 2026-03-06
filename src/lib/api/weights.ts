/**
 * Weight Config API Client
 * 
 * Manages dynamic weight configurations per folder.
 */
import { api } from '../api';

// === Types ===

export interface WeightFormula {
    type: 'property' | 'ratio' | 'weighted_sum' | 'expression';
    property?: string;          // For type="property"
    numerator?: string;         // For type="ratio"
    denominator?: string;       // For type="ratio"
    label?: string;             // For type="ratio" (human label)
    terms?: Array<{ property: string; coefficient: number }>;  // For type="weighted_sum"
    expr?: string;              // For type="expression"
    properties?: string[];      // For type="expression"
}

export interface WeightConfig {
    id: string;
    name: string;
    formula: WeightFormula;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface NumericPropertyInfo {
    occurrences: number;
    avg: number | null;
    min: number | null;
    max: number | null;
}

export interface DiscoveredProperties {
    folder_id: string;
    node_properties: Record<string, NumericPropertyInfo>;
    relationship_properties: Record<string, NumericPropertyInfo>;
}

// === API ===

export const weightsApi = {
    /** List all weight configs for a folder */
    list: (folderId: string) =>
        api.get<{ configs: WeightConfig[]; count: number }>(`/weights/folder/${folderId}`),

    /** Create a new weight config */
    create: (data: { name: string; folder_id: string; formula: WeightFormula; description?: string }) =>
        api.post<WeightConfig>('/weights/', data),

    /** Update an existing weight config */
    update: (configId: string, data: { name?: string; formula?: WeightFormula; description?: string }) =>
        api.put<{ id: string; message: string }>(`/weights/${configId}`, data),

    /** Delete a weight config */
    delete: (configId: string) =>
        api.delete<{ id: string; message: string }>(`/weights/${configId}`),

    /** Activate a weight config (global ON) */
    activate: (configId: string) =>
        api.post<{ id: string; is_active: boolean; message: string }>(`/weights/${configId}/activate`),

    /** Deactivate a weight config (global OFF) */
    deactivate: (configId: string) =>
        api.post<{ id: string; is_active: boolean; message: string }>(`/weights/${configId}/deactivate`),

    /** Get the currently active weight config for a folder */
    getActive: (folderId: string) =>
        api.get<{ active: boolean; config: WeightConfig | null }>(`/weights/active/${folderId}`),

    /** Discover numeric properties available in a folder */
    discoverProperties: (folderId: string) =>
        api.get<DiscoveredProperties>(`/weights/properties/${folderId}`),
};
