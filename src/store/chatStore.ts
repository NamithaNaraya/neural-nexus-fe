/**
 * Chat Store
 * 
 * Manages chat history and session state.
 * Implements Sliding Window context (last 5 questions).
 */
import { create } from "zustand";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    citations?: Array<{
        nodeId: string;
        nodeName: string;
        chunkText: string;
    }>;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

interface ChatState {
    // Current session
    currentSessionId: string | null;
    sessions: ChatSession[];
    isStreaming: boolean;
    streamingContent: string;

    // Sliding window for context (last 5 messages)
    contextWindow: number;

    // Actions
    createSession: () => string;
    setCurrentSession: (sessionId: string) => void;
    addMessage: (role: "user" | "assistant", content: string, citations?: Message["citations"]) => void;
    updateStreamingContent: (content: string) => void;
    finalizeStreaming: (citations?: Message["citations"]) => void;
    setStreaming: (streaming: boolean) => void;
    clearSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
    getContextMessages: () => Message[];
}

export const useChatStore = create<ChatState>((set, get) => ({
    currentSessionId: null,
    sessions: [],
    isStreaming: false,
    streamingContent: "",
    contextWindow: 5, // Last 5 Q&A pairs for sliding window

    createSession: () => {
        // Fallback for crypto.randomUUID if not available (e.g. non-secure context)
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

        const sessionId = generateUUID();
        const newSession: ChatSession = {
            id: sessionId,
            title: "New Chat",
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        set((state) => ({
            sessions: [...state.sessions, newSession],
            currentSessionId: sessionId,
        }));

        return sessionId;
    },

    setCurrentSession: (sessionId) => {
        set({ currentSessionId: sessionId });
    },

    addMessage: (role, content, citations) => {
        const { currentSessionId, sessions } = get();
        if (!currentSessionId) return;

        const message: Message = {
            id: `msg-${Date.now()}`,
            role,
            content,
            timestamp: Date.now(),
            citations,
        };

        set({
            sessions: sessions.map((session) =>
                session.id === currentSessionId
                    ? {
                        ...session,
                        messages: [...session.messages, message],
                        updatedAt: Date.now(),
                        title:
                            session.messages.length === 0 && role === "user"
                                ? content.slice(0, 50) + (content.length > 50 ? "..." : "")
                                : session.title,
                    }
                    : session
            ),
        });
    },

    updateStreamingContent: (content) => {
        set({ streamingContent: content });
    },

    finalizeStreaming: (citations) => {
        const { streamingContent } = get();
        if (streamingContent) {
            get().addMessage("assistant", streamingContent, citations);
        }
        set({ isStreaming: false, streamingContent: "" });
    },

    setStreaming: (streaming) => {
        set({ isStreaming: streaming, streamingContent: streaming ? "" : get().streamingContent });
    },

    clearSession: (sessionId) => {
        const { sessions } = get();
        set({
            sessions: sessions.map((session) =>
                session.id === sessionId
                    ? { ...session, messages: [], updatedAt: Date.now() }
                    : session
            ),
        });
    },

    deleteSession: (sessionId) => {
        const { sessions, currentSessionId } = get();
        set({
            sessions: sessions.filter((s) => s.id !== sessionId),
            currentSessionId: currentSessionId === sessionId ? null : currentSessionId,
        });
    },

    getContextMessages: () => {
        const { currentSessionId, sessions, contextWindow } = get();
        if (!currentSessionId) return [];

        const session = sessions.find((s) => s.id === currentSessionId);
        if (!session) return [];

        // Get last N Q&A pairs (2 messages per pair)
        const messageCount = contextWindow * 2;
        return session.messages.slice(-messageCount);
    },
}));
