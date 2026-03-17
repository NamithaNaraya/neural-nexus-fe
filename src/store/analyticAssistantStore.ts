import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export interface AnalyticMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    algorithm?: string;
    results?: any[];
    resolved_entities?: string[];
}

interface AnalyticAssistantState {
    currentSessionId: string | null;
    messages: Record<string, AnalyticMessage[]>;
    sessionFolders: Record<string, string>;
    isProcessing: boolean;

    // Actions
    setSessionId: (id: string | null, folderId?: string) => void;
    addMessage: (sessionId: string, message: Omit<AnalyticMessage, 'id' | 'timestamp'>, folderId?: string) => void;
    setProcessing: (processing: boolean) => void;
    clearMessages: (sessionId: string) => void;
}

export const useAnalyticAssistantStore = create<AnalyticAssistantState>()(
    persist(
        (set) => ({
            currentSessionId: generateId(),
            messages: {},
            sessionFolders: {},
            isProcessing: false,

            setSessionId: (id, folderId) => {
                const newId = id || generateId();
                set((state) => ({ 
                    currentSessionId: newId,
                    sessionFolders: folderId 
                        ? { ...state.sessionFolders, [newId]: folderId }
                        : state.sessionFolders
                }));
            },

            addMessage: (sessionId, message, folderId) => set((state) => {
                const sessionMessages = state.messages[sessionId] || [];
                const newMessage: AnalyticMessage = {
                    ...message,
                    id: generateId(),
                    timestamp: Date.now(),
                };

                return {
                    messages: {
                        ...state.messages,
                        [sessionId]: [...sessionMessages, newMessage],
                    },
                    sessionFolders: folderId 
                        ? { ...state.sessionFolders, [sessionId]: folderId }
                        : state.sessionFolders
                };
            }),

            setProcessing: (processing) => set({ isProcessing: processing }),

            clearMessages: (sessionId) => set((state) => {
                const newMessages = { ...state.messages };
                const newFolders = { ...state.sessionFolders };
                delete newMessages[sessionId];
                delete newFolders[sessionId];
                return {
                    messages: newMessages,
                    sessionFolders: newFolders
                };
            }),
        }),
        {
            name: 'analytic-assistant-storage',
            partialize: (state) => ({ 
                currentSessionId: state.currentSessionId, 
                messages: state.messages,
                sessionFolders: state.sessionFolders
            }),
            onRehydrateStorage: () => (state) => {
                // Clean up any stale non-UUID session IDs from older versions
                if (state && state.currentSessionId) {
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                    if (!uuidRegex.test(state.currentSessionId)) {
                        state.currentSessionId = generateId();
                    }
                }
            },
        }
    )
);
