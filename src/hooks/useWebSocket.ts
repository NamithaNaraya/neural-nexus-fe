/**
 * WebSocket Hook
 * 
 * Real-time connection to backend for live updates.
 * Handles reconnection, message parsing, and state management.
 */
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
    type: string;
    payload: unknown;
    timestamp?: string;
}

interface UseWebSocketOptions {
    folderId?: string;
    onMessage?: (message: WebSocketMessage) => void;
    onStatusChange?: (status: WebSocketStatus) => void;
    autoReconnect?: boolean;
    reconnectInterval?: number;
}

export function useWebSocket({
    folderId,
    onMessage,
    onStatusChange,
    autoReconnect = true,
    reconnectInterval = 3000,
}: UseWebSocketOptions = {}) {
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const [status, setStatus] = useState<WebSocketStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const { token } = useAuthStore();

    const updateStatus = useCallback((newStatus: WebSocketStatus) => {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
    }, [onStatusChange]);

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) return;

        try {
            updateStatus('connecting');

            // Build WebSocket URL with auth and folder
            const params = new URLSearchParams();
            if (token) params.append('token', token);
            if (folderId) params.append('folder_id', folderId);

            const url = `${WS_BASE_URL}?${params.toString()}`;
            ws.current = new WebSocket(url);

            ws.current.onopen = () => {
                updateStatus('connected');
                console.log('[WebSocket] Connected');
            };

            ws.current.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    setLastMessage(message);
                    onMessage?.(message);
                } catch (e) {
                    console.error('[WebSocket] Failed to parse message:', e);
                }
            };

            ws.current.onclose = () => {
                updateStatus('disconnected');
                console.log('[WebSocket] Disconnected');

                // Auto reconnect
                if (autoReconnect) {
                    reconnectTimeout.current = setTimeout(connect, reconnectInterval);
                }
            };

            ws.current.onerror = (error) => {
                updateStatus('error');
                console.error('[WebSocket] Error:', error);
            };
        } catch (error) {
            updateStatus('error');
            console.error('[WebSocket] Connection failed:', error);
        }
    }, [token, folderId, onMessage, updateStatus, autoReconnect, reconnectInterval]);

    const disconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }

        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }

        updateStatus('disconnected');
    }, [updateStatus]);

    const send = useCallback((message: WebSocketMessage) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.warn('[WebSocket] Cannot send, not connected');
        }
    }, []);

    // Connect on mount, disconnect on unmount
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    // Reconnect when folderId changes
    useEffect(() => {
        if (status === 'connected') {
            disconnect();
            connect();
        }
    }, [folderId]);

    return {
        status,
        lastMessage,
        send,
        connect,
        disconnect,
        isConnected: status === 'connected',
    };
}
