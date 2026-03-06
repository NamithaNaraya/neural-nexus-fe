/**
 * Weight Config Store
 * 
 * Manages the state of weight configurations with a global toggle.
 * When weights are ON:
 *   - The active weight config's formula is sent to ALL backend calls
 *   - Algorithms, RAG, and Analytics Chat all consider weights
 * When weights are OFF:
 *   - Everything runs with default structural weights (coalesce(r.strength, 1.0))
 */
import { create } from 'zustand';
import { weightsApi, type WeightConfig, type WeightFormula, type DiscoveredProperties } from '@/lib/api/weights';

interface WeightConfigState {
    // === Data ===
    configs: WeightConfig[];
    activeConfig: WeightConfig | null;
    weightsEnabled: boolean;  // Global toggle — affects ALL systems

    // Property discovery
    discoveredProperties: DiscoveredProperties | null;
    isDiscovering: boolean;

    // Loading states
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;

    // === Actions ===

    /** Load all weight configs for a folder */
    loadConfigs: (folderId: string) => Promise<void>;

    /** Load the active config for a folder */
    loadActiveConfig: (folderId: string) => Promise<void>;

    /** Create a new weight config */
    createConfig: (data: { name: string; folder_id: string; formula: WeightFormula; description?: string }) => Promise<WeightConfig | null>;

    /** Update an existing weight config */
    updateConfig: (configId: string, data: { name?: string; formula?: WeightFormula; description?: string }) => Promise<boolean>;

    /** Delete a weight config */
    deleteConfig: (configId: string) => Promise<boolean>;

    /** Activate a weight config (turns weights ON globally) */
    activateConfig: (configId: string) => Promise<boolean>;

    /** Deactivate all weights (turns weights OFF globally) */
    deactivateWeights: (configId: string) => Promise<boolean>;

    /** Toggle weights ON/OFF using the active config */
    toggleWeights: () => Promise<void>;

    /** Discover numeric properties in a folder */
    discoverProperties: (folderId: string) => Promise<void>;

    /** Get the formula to send to backend (null if weights are off) */
    getActiveFormula: () => WeightFormula | null;

    /** Reset store state */
    reset: () => void;
}

export const useWeightConfigStore = create<WeightConfigState>()((set, get) => ({
    // Initial state
    configs: [],
    activeConfig: null,
    weightsEnabled: false,
    discoveredProperties: null,
    isDiscovering: false,
    isLoading: false,
    isSaving: false,
    error: null,

    loadConfigs: async (folderId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await weightsApi.list(folderId);
            set({ configs: response.configs, isLoading: false });
        } catch (err: any) {
            set({ error: err.detail || 'Failed to load weight configs', isLoading: false });
        }
    },

    loadActiveConfig: async (folderId: string) => {
        try {
            const response = await weightsApi.getActive(folderId);
            set({
                activeConfig: response.config,
                weightsEnabled: response.active,
            });
        } catch (err: any) {
            console.error('Failed to load active weight config:', err);
        }
    },

    createConfig: async (data) => {
        set({ isSaving: true, error: null });
        try {
            const response = await weightsApi.create(data);
            const newConfig: WeightConfig = {
                id: response.id,
                name: data.name,
                formula: data.formula,
                description: data.description,
                is_active: false,
            };
            set(state => ({
                configs: [newConfig, ...state.configs],
                isSaving: false,
            }));
            return newConfig;
        } catch (err: any) {
            set({ error: err.detail || 'Failed to create weight config', isSaving: false });
            return null;
        }
    },

    updateConfig: async (configId, data) => {
        set({ isSaving: true, error: null });
        try {
            await weightsApi.update(configId, data);
            set(state => ({
                configs: state.configs.map(c =>
                    c.id === configId ? { ...c, ...data } : c
                ),
                activeConfig: state.activeConfig?.id === configId
                    ? { ...state.activeConfig, ...data }
                    : state.activeConfig,
                isSaving: false,
            }));
            return true;
        } catch (err: any) {
            set({ error: err.detail || 'Failed to update weight config', isSaving: false });
            return false;
        }
    },

    deleteConfig: async (configId) => {
        try {
            await weightsApi.delete(configId);
            const { activeConfig } = get();
            set(state => ({
                configs: state.configs.filter(c => c.id !== configId),
                activeConfig: activeConfig?.id === configId ? null : activeConfig,
                weightsEnabled: activeConfig?.id === configId ? false : state.weightsEnabled,
            }));
            return true;
        } catch (err: any) {
            set({ error: err.detail || 'Failed to delete weight config' });
            return false;
        }
    },

    activateConfig: async (configId) => {
        try {
            await weightsApi.activate(configId);
            const config = get().configs.find(c => c.id === configId);
            set(state => ({
                activeConfig: config || null,
                weightsEnabled: true,
                configs: state.configs.map(c => ({
                    ...c,
                    is_active: c.id === configId,
                })),
            }));
            return true;
        } catch (err: any) {
            set({ error: err.detail || 'Failed to activate weight config' });
            return false;
        }
    },

    deactivateWeights: async (configId) => {
        try {
            await weightsApi.deactivate(configId);
            set(state => ({
                activeConfig: null,
                weightsEnabled: false,
                configs: state.configs.map(c => ({ ...c, is_active: false })),
            }));
            return true;
        } catch (err: any) {
            set({ error: err.detail || 'Failed to deactivate weights' });
            return false;
        }
    },

    toggleWeights: async () => {
        const { weightsEnabled, activeConfig } = get();

        if (weightsEnabled && activeConfig) {
            // Turn OFF
            await get().deactivateWeights(activeConfig.id);
        } else if (!weightsEnabled && activeConfig) {
            // Turn ON (re-activate the last active config)
            await get().activateConfig(activeConfig.id);
        }
        // If no activeConfig exists and trying to turn on, user needs to select one first
    },

    discoverProperties: async (folderId: string) => {
        set({ isDiscovering: true });
        try {
            const props = await weightsApi.discoverProperties(folderId);
            set({ discoveredProperties: props, isDiscovering: false });
        } catch (err: any) {
            console.error('Failed to discover properties:', err);
            set({ isDiscovering: false });
        }
    },

    getActiveFormula: () => {
        const { weightsEnabled, activeConfig } = get();
        if (weightsEnabled && activeConfig) {
            return activeConfig.formula;
        }
        return null;
    },

    reset: () => set({
        configs: [],
        activeConfig: null,
        weightsEnabled: false,
        discoveredProperties: null,
        isDiscovering: false,
        isLoading: false,
        isSaving: false,
        error: null,
    }),
}));

// Selector hooks
export const useWeightsEnabled = () => useWeightConfigStore(s => s.weightsEnabled);
export const useActiveWeightConfig = () => useWeightConfigStore(s => s.activeConfig);
