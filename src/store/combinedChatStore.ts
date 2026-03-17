import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    intent?: any;
    context_summary?: string;
    algorithm?: string;
    results?: any[];
}

interface CombinedChatState {
    currentSessionId: string | null;
    messages: Record<string, Message[]>;
    // Map of sessionId -> folderId
    sessionFolders: Record<string, string>;
    isProcessing: boolean;
    currentStep: number;

    setProcessing: (processing: boolean) => void;
    setCurrentStep: (step: number) => void;
    addMessage: (sessionId: string, message: Omit<Message, "id" | "timestamp">, folderId?: string) => string;
    updateLastMessage: (sessionId: string, content: string, intent?: any, algorithm?: string, results?: any[]) => void;
    clearMessages: (sessionId: string) => void;
    setSessionId: (id: string | null, folderId?: string) => void;
}

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 11);
};

export const useCombinedChatStore = create<CombinedChatState>()(
    persist(
        (set, get) => ({
            currentSessionId: generateUUID(),
            messages: {},
            sessionFolders: {},
            isProcessing: false,
            currentStep: 0,

            setProcessing: (processing) => set({ isProcessing: processing }),
            setCurrentStep: (step) => set({ currentStep: step }),

            setSessionId: (id, folderId) => {
                const newId = id || generateUUID();
                set((state) => ({ 
                    currentSessionId: newId,
                    sessionFolders: folderId 
                        ? { ...state.sessionFolders, [newId]: folderId }
                        : state.sessionFolders
                }));
            },

            addMessage: (sessionId, msg, folderId) => {
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
                    sessionFolders: folderId 
                        ? { ...state.sessionFolders, [sessionId]: folderId }
                        : state.sessionFolders
                }));

                return id;
            },

            updateLastMessage: (sessionId, content, intent, algorithm, results) => {
                set((state) => {
                    const sessionMessages = [...(state.messages[sessionId] || [])];
                    if (sessionMessages.length === 0) return state;
                    
                    const lastMsg = { ...sessionMessages[sessionMessages.length - 1] };
                    if (content) lastMsg.content += content;
                    if (intent) lastMsg.intent = intent;
                    if (algorithm) lastMsg.algorithm = algorithm;
                    if (results) lastMsg.results = results;
                    
                    sessionMessages[sessionMessages.length - 1] = lastMsg;
                    
                    return {
                        messages: {
                            ...state.messages,
                            [sessionId]: sessionMessages
                        }
                    };
                });
            },

            clearMessages: (sessionId) => {
                set((state) => {
                    const newMessages = { ...state.messages };
                    const newFolders = { ...state.sessionFolders };
                    delete newMessages[sessionId];
                    delete newFolders[sessionId];
                    return { messages: newMessages, sessionFolders: newFolders };
                });
            },
        }),
        {
            name: "combined-chat-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ 
                currentSessionId: state.currentSessionId, 
                messages: state.messages,
                sessionFolders: state.sessionFolders 
            }),
        }
    )
);
