import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Citation {
    nodeId: string;
    nodeName: string;
    chunkText: string;
}

export interface Outcome {
    encounter_id: string;
    final_response: string;
    extracted_indicators: string[];
    inferred_states: string[];
    recommendation: string;
    graph_analytics?: any;
    graph_interventions?: any;
}

export interface RAGMetadata {
    groundingScore: number;      // Feature 10: 0-1 confidence
    mlInsights: number;          // Feature 3+6: structurally similar nodes found
    predictions: number;         // Feature 4+5: ML predictions injected
}

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    citations?: Citation[];
    isReasoning?: boolean;
    reasoningOutcome?: Outcome;
    metadata?: RAGMetadata;      // Enhanced RAG intelligence indicators
}

interface ReasoningState {
    // Session management
    currentSessionId: string | null;
    messages: Record<string, Message[]>; // sessionId -> messages

    // Status
    isProcessing: boolean;
    currentStep: number;

    // Actions
    setProcessing: (processing: boolean) => void;
    setCurrentStep: (step: number) => void;
    addMessage: (sessionId: string, message: Omit<Message, "id" | "timestamp">) => string;
    clearMessages: (sessionId: string) => void;
    setSessionId: (id: string | null) => void;
}

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const useUnifiedAssistantStore = create<ReasoningState>()(
    persist(
        (set, get) => ({
            currentSessionId: generateUUID(),
            messages: {},
            isProcessing: false,
            currentStep: 0,

            setProcessing: (processing) => set({ isProcessing: processing }),

            setCurrentStep: (step) => set({ currentStep: step }),

            setSessionId: (id) => set({ currentSessionId: id || generateUUID() }),

            addMessage: (sessionId, msg) => {
                const id = `msg-${Date.now()}`;
                const newMessage: Message = {
                    ...msg,
                    id,
                    timestamp: Date.now(),
                };

                set((state) => ({
                    messages: {
                        ...state.messages,
                        [sessionId]: [...(state.messages[sessionId] || []), newMessage],
                    },
                }));

                return id;
            },

            clearMessages: (sessionId) => {
                set((state) => {
                    const newMessages = { ...state.messages };
                    delete newMessages[sessionId];
                    return { messages: newMessages };
                });
            },
        }),
        {
            name: "unified-assistant-storage",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
