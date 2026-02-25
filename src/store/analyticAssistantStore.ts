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
    isProcessing: boolean;

    // Actions
    setSessionId: (id: string | null) => void;
    addMessage: (sessionId: string, message: Omit<AnalyticMessage, 'id' | 'timestamp'>) => void;
    setProcessing: (processing: boolean) => void;
    clearMessages: (sessionId: string) => void;
}

export const useAnalyticAssistantStore = create<AnalyticAssistantState>()(
    persist(
        (set) => ({
            currentSessionId: generateId(),
            messages: {},
            isProcessing: false,

            setSessionId: (id) => set({ currentSessionId: id || generateId() }),

            addMessage: (sessionId, message) => set((state) => {
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
                };
            }),

            setProcessing: (processing) => set({ isProcessing: processing }),

            clearMessages: (sessionId) => set((state) => ({
                messages: {
                    ...state.messages,
                    [sessionId]: [],
                },
            })),
        }),
        {
            name: 'analytic-assistant-storage',
            partialize: (state) => ({ currentSessionId: state.currentSessionId, messages: state.messages }),
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
