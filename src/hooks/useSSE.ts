"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/authStore";

interface IngestionProgress {
    type: "ingestion_progress";
    file_id: string;
    phase: string;
    progress: number;
    message: string;
}

interface SSEEvent {
    type: string;
    file_id?: string;
    phase?: string;
    progress?: number;
    message?: string;
    [key: string]: unknown;
}

export function useSSE() {
    const { user, token } = useAuthStore();
    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState<SSEEvent[]>([]);
    const [ingestionProgress, setIngestionProgress] = useState<Record<string, IngestionProgress>>({});
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (!user?.id || !token) return;

        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        // Use relative path to leverage Next.js proxy defined in next.config.js
        // This avoids CORS issues and host mismatches (e.g. accessing via IP)
        const url = `/api/v1/sse/tasks/${user.id}?token=${encodeURIComponent(token)}`;

        try {
            const eventSource = new EventSource(url);

            eventSource.onopen = () => {
                console.log("[SSE] Connected");
                setIsConnected(true);
            };

            eventSource.onmessage = (event) => {
                try {
                    const data: SSEEvent = JSON.parse(event.data);
                    console.log("[SSE] Event:", data);

                    setEvents((prev) => [...prev.slice(-50), data]); // Keep last 50 events

                    // Handle specific event types
                    if (data.type === "ingestion_progress" && data.file_id && data.phase !== undefined) {
                        const progress: IngestionProgress = {
                            type: "ingestion_progress",
                            file_id: data.file_id,
                            phase: data.phase,
                            progress: data.progress ?? 0,
                            message: data.message ?? "",
                        };
                        setIngestionProgress((prev) => ({
                            ...prev,
                            [progress.file_id]: progress,
                        }));
                    }
                } catch (e) {
                    console.error("[SSE] Failed to parse event:", e);
                }
            };

            eventSource.onerror = (error) => {
                console.error("[SSE] Error:", error);
                setIsConnected(false);
                eventSource.close();

                // Reconnect after 5 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log("[SSE] Reconnecting...");
                    connect();
                }, 5000);
            };

            eventSourceRef.current = eventSource;
        } catch (e) {
            console.error("[SSE] Failed to connect:", e);
        }
    }, [user?.id, token]);

    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        setIsConnected(false);
    }, []);

    // Auto-connect when user is authenticated
    useEffect(() => {
        if (user?.id && token) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [user?.id, token, connect, disconnect]);

    // Get progress for a specific file
    const getFileProgress = useCallback(
        (fileId: string): IngestionProgress | null => {
            return ingestionProgress[fileId] || null;
        },
        [ingestionProgress]
    );

    // Clear progress for a specific file
    const clearFileProgress = useCallback((fileId: string) => {
        setIngestionProgress((prev) => {
            const next = { ...prev };
            delete next[fileId];
            return next;
        });
    }, []);

    return {
        isConnected,
        events,
        ingestionProgress,
        getFileProgress,
        clearFileProgress,
        connect,
        disconnect,
    };
}

// Phase mapping for display
export const PHASE_LABELS: Record<string, string> = {
    layout: "📄 Analyzing Document Layout",
    chunking: "✂️ Creating Semantic Chunks",
    ontology: "🔤 Defining Schema",
    extraction: "🔍 Extracting Entities & Relationships",
    deduplication: "🔗 Neural Reconciliation",
    validation: "✅ Validating Extractions",
    human_review: "👤 Ready for Review",
    embedding: "🧠 Generating Embeddings",
    storage: "💾 Storing to Database",
    completed: "✨ Completed",
    failed: "❌ Failed",
};

export const PHASE_COLORS: Record<string, string> = {
    layout: "bg-blue-500",
    chunking: "bg-purple-500",
    ontology: "bg-indigo-500",
    extraction: "bg-cyan-500",
    deduplication: "bg-teal-500",
    validation: "bg-green-500",
    human_review: "bg-yellow-500",
    embedding: "bg-orange-500",
    storage: "bg-emerald-500",
    completed: "bg-emerald-600",
    failed: "bg-red-500",
};
