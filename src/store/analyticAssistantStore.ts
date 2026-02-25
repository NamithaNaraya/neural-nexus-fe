import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);

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
        }
    )
);
