'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    MessageSquare,
    Send,
    X,
    ChevronDown,
    ChevronUp,
    Bot,
    User,
    Zap,
    Target,
    History,
    Plus,
    Loader2,
    Trash2,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import { useGraphStore } from '@/store/graphStore';
import { docAiApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/shared';

interface Citation {
    node_id: string;
    node_name: string;
    chunk_text: string;
}

interface QueryResponse {
    answer: string;
    citations: Citation[];
    session_id: string;
    related_nodes: string[];
}

export function ChatAssistant() {
    const [isMinimized, setIsMinimized] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    // Store integration
    const {
        currentSessionId,
        sessions,
        createSession,
        setCurrentSession,
        addMessage,
        deleteSession
    } = useChatStore();

    const {
        setCameraFocus,
        setSelectedNodes,
        selectedNodes,
        nodes,
        activeFolderId
    } = useGraphStore();

    const scrollRef = useRef<HTMLDivElement>(null);
    const currentSession = sessions.find(s => s.id === currentSessionId);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [currentSession?.messages, isThinking]);

    // Scope control
    const [useGlobalSearch, setUseGlobalSearch] = useState(false);

    // Initialize session if none exists
    useEffect(() => {
        if (!currentSessionId && sessions.length === 0) {
            createSession();
        } else if (!currentSessionId && sessions.length > 0) {
            setCurrentSession(sessions[0].id);
        }
    }, [currentSessionId, sessions, createSession, setCurrentSession]);

    // Determine current scope for UI indicator
    const currentScopeLabel = useMemo(() => {
        if (useGlobalSearch) return "Universal Search";
        if (selectedNodes.length > 0) return `Targeting ${selectedNodes.length} Selectee${selectedNodes.length > 1 ? 's' : ''}`;
        if (activeFolderId) return "Current Folder Only";
        return "Universal Search";
    }, [useGlobalSearch, selectedNodes, activeFolderId]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isThinking || !currentSessionId) return;

        const question = input.trim();
        setInput('');
        addMessage('user', question);
        setIsThinking(true);

        try {
            // Determine Scope
            let scope: any = undefined;
            if (!useGlobalSearch) {
                if (selectedNodes.length > 0) {
                    scope = { type: 'selection', id: selectedNodes.join(',') };
                } else if (activeFolderId) {
                    scope = { type: 'folder', id: activeFolderId };
                }
            }

            const response = (await docAiApi.query.ask({
                question,
                session_id: currentSessionId,
                scope
            })) as QueryResponse;

            addMessage('assistant', response.answer, response.citations?.map((c: Citation) => ({
                nodeId: c.node_id,
                nodeName: c.node_name,
                chunkText: c.chunk_text
            })));

            // Highlight related nodes in the graph if returned
            if (response.related_nodes?.length > 0) {
                setSelectedNodes(response.related_nodes);
            }

        } catch (error) {
            console.error('Chat error:', error);
            addMessage('assistant', 'Sorry, I encountered an error while processing your request. Please check if the AI services are active.');
        } finally {
            setIsThinking(false);
        }
    };

    const focusNode = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setCameraFocus(nodeId);
            setSelectedNodes([nodeId]);
        }
    };

    return (
        <div className={`fixed bottom-6 right-6 z-[60] flex flex-col items-end pointer-events-none`}>
            {/* Chat Window */}
            <AnimatePresence>
                {!isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={`pointer-events-auto bg-card/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col mb-4 transition-all duration-300 ${isExpanded ? 'w-[600px] h-[70vh]' : 'w-96 h-[500px]'
                            }`}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-primary/10 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
                                    <Bot size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold tracking-tight">AI Neural Assistant</h3>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Hybrid RAG Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                <button
                                    onClick={() => setIsMinimized(true)}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <ChevronDown size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Scope Indicator & Toggle */}
                        <div className="px-4 py-2 bg-muted/30 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <Target size={12} className={useGlobalSearch ? "text-muted-foreground" : "text-primary"} />
                                <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                                    {currentScopeLabel}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setUseGlobalSearch(!useGlobalSearch)}
                                className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter transition-all ${useGlobalSearch
                                        ? 'bg-zinc-800 text-muted-foreground'
                                        : 'bg-primary/20 text-primary border border-primary/30'
                                    }`}
                            >
                                {useGlobalSearch ? "Enable Context" : "Go Global"}
                            </button>
                        </div>

                        {/* History / Sessions (Collapsible) */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Messages */}
                            <div className="flex-1 flex flex-col min-w-0">
                                <div
                                    ref={scrollRef}
                                    className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
                                >
                                    {currentSession?.messages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center px-6">
                                            <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                                                <Zap className="text-primary w-8 h-8" />
                                            </div>
                                            <h4 className="text-lg font-bold mb-2">Discovery Context</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                I can answer questions about entities and relationships in your graph.
                                                Try asking: <br />
                                                <span className="italic">"Who are the key players in this project?"</span>
                                            </p>
                                        </div>
                                    )}

                                    {currentSession?.messages.map((msg, i) => (
                                        <div
                                            key={msg.id}
                                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                        >
                                            <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${msg.role === 'user'
                                                ? 'bg-zinc-800 border-white/10 text-white'
                                                : 'bg-primary/20 border-primary/30 text-primary'
                                                }`}>
                                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                            </div>
                                            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm ${msg.role === 'user'
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                    : 'bg-muted/50 border border-white/5 rounded-tl-none shadow-sm'
                                                    }`}>
                                                    {msg.content}
                                                </div>

                                                {/* Citations */}
                                                {msg.citations && msg.citations.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {msg.citations.map((cite, ci) => (
                                                            <button
                                                                key={`${msg.id}-cite-${ci}`}
                                                                onClick={() => focusNode(cite.nodeId)}
                                                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                                            >
                                                                <Target size={10} />
                                                                <span>{cite.nodeName}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {isThinking && (
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 text-primary flex items-center justify-center">
                                                <Bot size={14} />
                                            </div>
                                            <div className="px-4 py-2.5 rounded-2xl rounded-tl-none bg-muted/50 border border-white/5 flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0s' }} />
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0.4s' }} />
                                                </div>
                                                <span className="text-xs text-muted-foreground italic">Thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input */}
                                <div className="p-4 border-t border-white/10 bg-muted/20">
                                    <form onSubmit={handleSend} className="relative">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ask about the graph..."
                                            className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!input.trim() || isThinking}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
                                        >
                                            {isThinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        </button>
                                    </form>
                                    <p className="text-[10px] text-muted-foreground mt-2 text-center uppercase tracking-widest font-bold opacity-50">
                                        Knowledge Graph Discovery Interface
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble Trigger */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMinimized(!isMinimized)}
                className={`pointer-events-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 relative group ${isMinimized
                    ? 'bg-primary text-primary-foreground rotate-0'
                    : 'bg-card text-foreground rotate-90 border border-white/10'
                    }`}
            >
                {isMinimized ? (
                    <MessageSquare size={24} />
                ) : (
                    <X size={24} />
                )}

                {/* Tooltip */}
                {isMinimized && (
                    <div className="absolute right-full mr-4 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                        AI Discovery Agent
                    </div>
                )}
            </motion.button>
        </div>
    );
}
