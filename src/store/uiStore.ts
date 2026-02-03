/**
 * UI Store
 * 
 * Manages global UI state including:
 * - Theme (Neural Dark / Architect Light)
 * - Sidebar visibility
 * - Modal states
 * - Loading states
 * - Notifications
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'dark' | 'light';
export type ViewMode = '3d' | '2d' | 'charts';
export type LODLevel = 'full' | 'balanced' | 'performance' | 'data';

interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

interface Modal {
    id: string;
    component: string;
    props?: Record<string, unknown>;
}

interface UIState {
    // Theme
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;

    // Sidebar
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;
    setSidebarOpen: (open: boolean) => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;

    // View Mode
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;

    // LOD Level for Performance
    lodLevel: LODLevel;
    setLODLevel: (level: LODLevel) => void;

    // Fullscreen Mode
    isFullscreen: boolean;
    setFullscreen: (fullscreen: boolean) => void;
    toggleFullscreen: () => void;

    // Loading States
    isLoading: boolean;
    loadingMessage: string;
    setLoading: (loading: boolean, message?: string) => void;

    // Notifications
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;

    // Modals
    activeModal: Modal | null;
    openModal: (id: string, component: string, props?: Record<string, unknown>) => void;
    closeModal: () => void;

    // Command Palette
    commandPaletteOpen: boolean;
    setCommandPaletteOpen: (open: boolean) => void;
    toggleCommandPalette: () => void;

    // Mobile Detection
    isMobile: boolean;
    setIsMobile: (mobile: boolean) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set, get) => ({
            // Theme - defaults to dark
            theme: 'dark',
            setTheme: (theme) => {
                set({ theme });
                // Update document class for Tailwind
                if (typeof document !== 'undefined') {
                    document.documentElement.classList.toggle('light', theme === 'light');
                }
            },
            toggleTheme: () => {
                const newTheme = get().theme === 'dark' ? 'light' : 'dark';
                get().setTheme(newTheme);
            },

            // Sidebar
            sidebarOpen: true,
            sidebarCollapsed: false,
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

            // View Mode
            viewMode: '3d',
            setViewMode: (mode) => set({ viewMode: mode }),

            // LOD Level
            lodLevel: 'balanced',
            setLODLevel: (level) => set({ lodLevel: level }),

            // Fullscreen
            isFullscreen: false,
            setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
            toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),

            // Loading
            isLoading: false,
            loadingMessage: '',
            setLoading: (loading, message = '') => set({
                isLoading: loading,
                loadingMessage: message
            }),

            // Notifications
            notifications: [],
            addNotification: (notification) => {
                const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const newNotification = { ...notification, id };

                set((state) => ({
                    notifications: [...state.notifications, newNotification]
                }));

                // Auto-remove after duration (default 5s)
                const duration = notification.duration ?? 5000;
                if (duration > 0) {
                    setTimeout(() => {
                        get().removeNotification(id);
                    }, duration);
                }
            },
            removeNotification: (id) => set((state) => ({
                notifications: state.notifications.filter((n) => n.id !== id)
            })),
            clearNotifications: () => set({ notifications: [] }),

            // Modals
            activeModal: null,
            openModal: (id, component, props) => set({
                activeModal: { id, component, props }
            }),
            closeModal: () => set({ activeModal: null }),

            // Command Palette
            commandPaletteOpen: false,
            setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
            toggleCommandPalette: () => set((state) => ({
                commandPaletteOpen: !state.commandPaletteOpen
            })),

            // Mobile
            isMobile: false,
            setIsMobile: (mobile) => set({ isMobile: mobile }),
        }),
        {
            name: 'neural-nexus-ui',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                theme: state.theme,
                sidebarCollapsed: state.sidebarCollapsed,
                viewMode: state.viewMode,
                lodLevel: state.lodLevel,
            }),
        }
    )
);

// Initialize theme on client
if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('neural-nexus-ui');
    if (savedTheme) {
        try {
            const parsed = JSON.parse(savedTheme);
            if (parsed?.state?.theme === 'light') {
                document.documentElement.classList.add('light');
            }
        } catch {
            // Ignore parse errors
        }
    }
}
