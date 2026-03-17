import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    intent?: any;
    context_summary?: string;
}

interface CombinedChatState {
    currentSessionId: string | null;
    messages: Record<string, Message[]>;
    // Map of sessionId -> folderId
    sessionFolders: Record<string, string>;
    isProcessing: boolean;

    setProcessing: (processing: boolean) => void;
    addMessage: (sessionId: string, message: Omit<Message, "id" | "timestamp">, folderId?: string) => string;
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

            setProcessing: (processing) => set({ isProcessing: processing }),

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
