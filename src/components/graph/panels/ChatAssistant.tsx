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

    // Sync sessions from backend on mount
    useEffect(() => {
        const syncSessions = async () => {
            try {
                const backendSessions = (await docAiApi.query.listSessions()) as any[];
                if (backendSessions && backendSessions.length > 0) {
                    // This could be used to populate a session selector if added later
                }
            } catch (error) {
                console.error('Failed to sync sessions:', error);
            }
        };
        syncSessions();
    }, []);

    const handleDeleteSession = async () => {
        if (!currentSessionId) return;

        if (window.confirm('Are you sure you want to delete this conversation permanently?')) {
            try {
                await docAiApi.query.deleteSession(currentSessionId);
                deleteSession(currentSessionId);

                // Create a fresh session if all are gone
                if (sessions.length <= 1) {
                    createSession();
                }
            } catch (error) {
                console.error('Failed to delete session:', error);
                alert('Session removed locally.');
                deleteSession(currentSessionId);
            }
        }
    };

    const focusNode = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setCameraFocus(nodeId);
            setSelectedNodes([nodeId]);
        }
    };

    // Helper to render formatted text with simple markdown-like support
    const FormattedMessage = ({ content }: { content: string }) => {
        const lines = content.split('\n');

        return (
            <div className="space-y-4">
                {lines.map((line, idx) => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return <div key={idx} className="h-2" />;

                    // Headers: ### Header or **Header** on its own line
                    if (trimmedLine.startsWith('###') || (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.length < 50)) {
                        const text = trimmedLine.replace(/^###\s*|\*\*/g, '');
                        return (
                            <h4 key={idx} className="text-xs font-black uppercase tracking-[0.15em] text-primary/90 mt-6 mb-2 first:mt-0">
                                {text}
                            </h4>
                        );
                    }

                    // Bullet points: * Item or - Item
                    if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                        const parts = trimmedLine.substring(2).split('**');
                        return (
                            <div key={idx} className="flex gap-3 pl-2 group">
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0 group-hover:scale-125 transition-transform" />
                                <p className="text-sm leading-relaxed text-foreground/90">
                                    {parts.map((part, pIdx) => (
                                        pIdx % 2 === 1 ? <strong key={pIdx} className="text-primary/90 font-bold">{part}</strong> : part
                                    ))}
                                </p>
                            </div>
                        );
                    }

                    // "Why:" specifically highlighted
                    if (trimmedLine.toLowerCase().startsWith('why:') || trimmedLine.includes('*Why:*')) {
                        return (
                            <div key={idx} className="bg-primary/5 border-l-2 border-primary/30 p-3 rounded-r-xl my-2 italic text-xs text-muted-foreground/80 leading-relaxed shadow-sm">
                                {trimmedLine.replace(/\*Why:\*/g, 'Why:')}
                            </div>
                        );
                    }

                    // Standard paragraph
                    const parts = line.split('**');
                    return (
                        <p key={idx} className="text-sm leading-relaxed text-foreground/80">
                            {parts.map((part, pIdx) => (
                                pIdx % 2 === 1 ? <strong key={pIdx} className="text-primary font-bold">{part}</strong> : part
                            ))}
                        </p>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={`fixed ${(!isMinimized && isExpanded) ? 'inset-0' : 'bottom-6 right-6'} z-[60] flex flex-col items-end pointer-events-none transition-all duration-500`}>
            {/* Chat Window */}
            <AnimatePresence>
                {!isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={`pointer-events-auto bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ease-in-out ${isExpanded ? 'w-full h-full rounded-none m-0' : 'w-[450px] h-[600px] rounded-2xl mb-4 border border-white/10'
                            }`}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-primary/10 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
                                    <Bot size={18} />
                                </div>
                                <div>
                                    <h3 className={`font-bold tracking-tight transition-all ${isExpanded ? 'text-lg' : 'text-sm'}`}>AI Neural Assistant</h3>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Hybrid RAG Online</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleDeleteSession}
                                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-400 group"
                                title="Delete Conversation"
                            >
                                <Trash2 size={16} />
                            </button>
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


                        {/* History / Sessions (Collapsible) */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Messages */}
                            <div className="flex-1 flex flex-col min-w-0">
                                <div
                                    ref={scrollRef}
                                    className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 transition-all ${isExpanded ? 'max-w-4xl mx-auto w-full px-8' : ''}`}
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
                                                <div className={`px-5 py-4 rounded-2xl text-sm shadow-xl ${msg.role === 'user'
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                    : 'bg-card/40 border border-white/5 rounded-tl-none ring-1 ring-white/5'
                                                    }`}>
                                                    {msg.role === 'user' ? msg.content : <FormattedMessage content={msg.content} />}
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
                                <div className={`p-4 border-t border-white/10 bg-muted/20 transition-all ${isExpanded ? 'flex flex-col items-center py-8' : ''}`}>
                                    <form onSubmit={handleSend} className={`relative transition-all ${isExpanded ? 'max-w-4xl w-full' : 'w-full'}`}>
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
                className={`pointer-events-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 relative group ${(!isMinimized && isExpanded) ? 'hidden' : (isMinimized
                    ? 'bg-primary text-primary-foreground rotate-0'
                    : 'bg-card text-foreground rotate-90 border border-white/10'
                )}`}
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
