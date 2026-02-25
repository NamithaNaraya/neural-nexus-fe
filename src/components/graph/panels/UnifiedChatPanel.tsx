import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Activity, Brain, ShieldCheck, Search, Database, Stethoscope, MessageSquare,
    Zap, ChevronDown, Send, Loader2, X, ClipboardList,
    Star, User, Bot, Maximize2, Minimize2, Trash2, Network, BarChart3,
    Plus, Clock, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { useAuthStore } from '@/store/authStore';
import { useUnifiedAssistantStore, type Citation, type Outcome } from '@/store/unifiedAssistantStore';
import { useAnalyticAssistantStore } from '@/store/analyticAssistantStore';
import { docAiApi } from '@/lib/api';
import { toast } from 'sonner';

const REASONING_STEPS = [
    { id: 1, name: "Reading", icon: MessageSquare },
    { id: 2, name: "Identifying", icon: Activity },
    { id: 3, name: "Checking", icon: ShieldCheck },
    { id: 4, name: "Loading Data", icon: Database },
    { id: 5, name: "Analyzing", icon: Brain },
    { id: 6, name: "Computing", icon: Zap },
    { id: 7, name: "Connecting", icon: Zap },
    { id: 8, name: "Mapping", icon: ClipboardList },
    { id: 9, name: "Searching", icon: Search },
    { id: 10, name: "Reviewing", icon: Stethoscope },
    { id: 11, name: "Writing", icon: MessageSquare },
    { id: 12, name: "Verifying", icon: ShieldCheck },
    { id: 13, name: "Done", icon: Star }
];

type ChatMode = 'general' | 'algorithmic';

/* ─── Helper: format timestamp ─── */
function formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── Session History Sidebar ─── */
function SessionHistorySidebar({
    messages,
    currentSessionId,
    onSelectSession,
    onNewSession,
    chatMode,
}: {
    messages: Record<string, any[]>;
    currentSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewSession: () => void;
    chatMode: ChatMode;
}) {
    const sessions = useMemo(() => {
        return Object.entries(messages)
            .filter(([_, msgs]) => msgs.length > 0)
            .map(([id, msgs]) => {
                const firstUserMsg = msgs.find((m: any) => m.role === 'user');
                const lastMsg = msgs[msgs.length - 1];
                return {
                    id,
                    title: firstUserMsg?.content?.slice(0, 50) || 'New conversation',
                    messageCount: msgs.length,
                    lastTimestamp: lastMsg?.timestamp || 0,
                };
            })
            .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    }, [messages]);

    const accent = chatMode === 'general' ? 'emerald' : 'indigo';

    return (
        <div className="w-[260px] flex-shrink-0 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
            {/* New Chat button */}
            <div className="p-3">
                <button
                    onClick={onNewSession}
                    className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed transition-all text-xs font-bold uppercase tracking-wider
                        ${chatMode === 'general'
                            ? 'border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            : 'border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                        }`}
                >
                    <Plus size={14} />
                    New Chat
                </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {sessions.length === 0 && (
                    <div className="text-center py-10">
                        <History size={24} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="text-[11px] text-slate-400 dark:text-slate-600">No conversations yet</p>
                    </div>
                )}
                {sessions.map((session) => (
                    <button
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group relative
                            ${session.id === currentSessionId
                                ? chatMode === 'general'
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
                            }`}
                    >
                        <p className={`text-xs font-medium truncate leading-tight ${session.id === currentSessionId ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                            {session.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <Clock size={10} className="text-slate-400 dark:text-slate-600" />
                            <span className="text-[10px] text-slate-400 dark:text-slate-600">
                                {formatTime(session.lastTimestamp)}
                            </span>
                            <span className="text-[10px] text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-600">
                                {session.messageCount} msgs
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ─── Main Component ─── */
export function UnifiedChatPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const [chatMode, setChatMode] = useState<ChatMode>('general');
    const [showHistory, setShowHistory] = useState(false);
    const [showOutcomeForm, setShowOutcomeForm] = useState<string | null>(null);
    const [feedback, setFeedback] = useState({ rating: 5, comment: '' });

    const { activeFolderId, selectedNodes } = useGraphStore();
    const { user } = useAuthStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Stores
    const neuralStore = useUnifiedAssistantStore();
    const analyticStore = useAnalyticAssistantStore();

    // Dynamically derive current state
    const isProcessing = chatMode === 'general' ? neuralStore.isProcessing : analyticStore.isProcessing;
    const currentSessionId = chatMode === 'general' ? neuralStore.currentSessionId : analyticStore.currentSessionId;
    const allMessages = chatMode === 'general' ? neuralStore.messages : analyticStore.messages;

    const neuralMessages = neuralStore.currentSessionId ? (neuralStore.messages[neuralStore.currentSessionId] || []) : [];
    const analyticMessages = analyticStore.currentSessionId ? (analyticStore.messages[analyticStore.currentSessionId] || []) : [];
    const activeMessages = chatMode === 'general' ? neuralMessages : analyticMessages;

    const ThemeIcon = chatMode === 'general' ? Brain : Network;

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activeMessages, isProcessing, chatMode, neuralStore.currentStep]);

    // Show history in expanded mode
    useEffect(() => {
        if (isExpanded) setShowHistory(true);
        else setShowHistory(false);
    }, [isExpanded]);

    const handleClearMessages = () => {
        if (!currentSessionId) return;
        if (chatMode === 'general') neuralStore.clearMessages(currentSessionId);
        else analyticStore.clearMessages(currentSessionId);
    };

    const handleNewSession = () => {
        if (chatMode === 'general') neuralStore.setSessionId(null);
        else analyticStore.setSessionId(null);
    };

    const handleSelectSession = (id: string) => {
        if (chatMode === 'general') neuralStore.setSessionId(id);
        else analyticStore.setSessionId(id);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isProcessing || !currentSessionId) return;

        const userQuery = input.trim();
        setInput('');

        if (chatMode === 'general') {
            neuralStore.addMessage(currentSessionId, { role: "user", content: userQuery });
            neuralStore.setProcessing(true);

            try {
                const response = await docAiApi.query.ask({
                    question: userQuery,
                    scope: { type: 'folder', id: activeFolderId || '' },
                    session_id: currentSessionId!
                }) as any;

                neuralStore.addMessage(currentSessionId, {
                    role: "assistant", content: response.answer,
                    citations: response.citations,
                    metadata: {
                        groundingScore: response.grounding_score ?? 0,
                        mlInsights: response.ml_insights_count ?? 0,
                        predictions: response.predictions_count ?? 0,
                    }
                });
            } catch (err: any) {
                const errorMsg = err?.detail || err?.message || "Something went wrong. Please try again.";
                neuralStore.addMessage(currentSessionId, {
                    role: "assistant", content: `Error: ${errorMsg}`
                });
            } finally {
                neuralStore.setProcessing(false);
                neuralStore.setCurrentStep(0);
            }
        } else {
            analyticStore.addMessage(currentSessionId, { role: "user", content: userQuery } as any);
            analyticStore.setProcessing(true);

            try {
                const response = await docAiApi.analyticsChat.query({
                    query: userQuery,
                    folder_id: activeFolderId || undefined,
                    node_ids: selectedNodes.length > 0 ? selectedNodes : undefined
                }) as any;

                analyticStore.addMessage(currentSessionId, {
                    role: "assistant", content: response.answer,
                    algorithm: response.algorithm, results: response.results,
                    resolved_entities: response.resolved_entities
                } as any);
            } catch (err: any) {
                const errorMsg = err?.detail || err?.message || "Something went wrong while analyzing. Please try again.";
                toast.error("Something went wrong");
                analyticStore.addMessage(currentSessionId, {
                    role: "assistant",
                    content: `Error: ${errorMsg}`
                } as any);
            } finally {
                analyticStore.setProcessing(false);
            }
        }
    };

    const submitOutcome = async (encounterId: string) => {
        try {
            await docAiApi.reasoning.submitFeedback({
                encounter_id: encounterId,
                feedback: feedback.comment,
                rating: feedback.rating
            });
            setShowOutcomeForm(null);
        } catch (err) {
            console.error("Feedback error:", err);
        }
    };

    const toggleMode = (mode: ChatMode) => {
        if (isProcessing) return;
        setChatMode(mode);
    };

    return (
        <div className={`fixed z-[160] pointer-events-none transition-all duration-500 ${isExpanded && isOpen ? 'inset-0' : 'bottom-6 right-6 flex flex-col items-end'}`}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: isExpanded ? 0 : 20, scale: isExpanded ? 1 : 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: isExpanded ? 0 : 20, scale: isExpanded ? 1 : 0.95 }}
                        style={{ transformOrigin: "bottom right" }}
                        className={`pointer-events-auto overflow-hidden flex flex-col transition-all duration-500 ease-in-out
                            ${isExpanded
                                ? 'fixed inset-0 w-full h-full bg-white dark:bg-slate-900'
                                : 'w-[500px] h-[750px] rounded-[2rem] mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]'
                            }`}
                    >
                        {/* ═══ HEADER ═══ */}
                        <div className={`px-5 py-3 flex items-center justify-between border-b flex-shrink-0 ${chatMode === 'general'
                            ? 'bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/40'
                            : 'bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/40'
                            }`}>
                            <div className="flex items-center gap-3">
                                {/* History toggle (only in expanded) */}
                                {isExpanded && (
                                    <button
                                        onClick={() => setShowHistory(!showHistory)}
                                        className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                                        title="Toggle session history"
                                    >
                                        <History size={16} />
                                    </button>
                                )}
                                <div className={`p-2 rounded-xl ${chatMode === 'general' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                    <ThemeIcon size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        {chatMode === 'general' ? 'Chat Assistant' : 'Graph Analytics'}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${chatMode === 'general' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                        <span className={`text-[9px] uppercase font-bold tracking-widest ${chatMode === 'general' ? 'text-emerald-500/60' : 'text-indigo-500/60'}`}>
                                            {chatMode === 'general' ? 'Ask & Discover' : 'Graph Analysis'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <button onClick={handleNewSession} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="New session">
                                    <Plus size={16} />
                                </button>
                                <button onClick={handleClearMessages} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="Clear chat">
                                    <Trash2 size={15} />
                                </button>
                                <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                <button onClick={() => { setIsOpen(false); setIsExpanded(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <ChevronDown size={18} />
                                </button>
                            </div>
                        </div>

                        {/* ═══ MODE TOGGLE BAR ═══ */}
                        <div className="px-5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 relative">
                                <button
                                    onClick={() => toggleMode('general')}
                                    disabled={isProcessing}
                                    className={`relative z-10 px-4 py-1.5 flex items-center gap-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50
                                        ${chatMode === 'general' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <MessageSquare size={11} />
                                    General
                                </button>
                                <button
                                    onClick={() => toggleMode('algorithmic')}
                                    disabled={isProcessing}
                                    className={`relative z-10 px-4 py-1.5 flex items-center gap-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50
                                        ${chatMode === 'algorithmic' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Network size={11} />
                                    Algorithms
                                </button>
                                <motion.div
                                    className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md shadow-sm ${chatMode === 'general'
                                        ? 'bg-white dark:bg-slate-700 left-0.5'
                                        : 'bg-white dark:bg-slate-700 left-[calc(50%+1px)]'
                                        }`}
                                    layoutId="chatTab"
                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                            </div>
                            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                {activeFolderId ? <><span className="text-emerald-500">●</span> Scoped</> : selectedNodes.length > 0 ? <><span className="text-amber-500">●</span> {selectedNodes.length} nodes</> : <><span className="text-red-400">●</span> Full DB</>}
                            </div>
                        </div>

                        {/* ═══ MAIN BODY (sidebar + chat) ═══ */}
                        <div className="flex flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900">
                            {/* Session History Sidebar */}
                            <AnimatePresence>
                                {showHistory && isExpanded && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 260, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="overflow-hidden flex-shrink-0"
                                    >
                                        <SessionHistorySidebar
                                            messages={allMessages}
                                            currentSessionId={currentSessionId}
                                            onSelectSession={handleSelectSession}
                                            onNewSession={handleNewSession}
                                            chatMode={chatMode}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Chat Column */}
                            <div className="flex flex-col flex-1 min-w-0">
                                {/* Content area with constrained width for expanded mode */}
                                <div className={`flex flex-col flex-1 min-h-0 ${isExpanded ? 'max-w-5xl mx-auto w-full px-4' : 'w-full'}`}>
                                    {/* Messages */}
                                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                        {activeMessages.length === 0 && !isProcessing && (
                                            <div className="h-full flex flex-col items-center justify-center text-center pt-16">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${chatMode === 'general' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
                                                    <ThemeIcon className={`w-8 h-8 ${chatMode === 'general' ? 'text-emerald-500' : 'text-indigo-500'}`} />
                                                </div>
                                                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                                                    {chatMode === 'general' ? 'Ready to Help' : 'Ready to Analyze'}
                                                </h4>
                                                <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed max-w-sm">
                                                    {chatMode === 'general'
                                                        ? 'Ask questions about your data. I\'ll search your knowledge graph and give you answers.'
                                                        : 'Ask things like "What are the most important items?" or "Find groups in my data".'}
                                                </p>
                                            </div>
                                        )}

                                        {activeMessages.map((msg: any, i: number) => (
                                            <div key={msg.id || i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                                                    ${msg.role === 'user'
                                                        ? 'bg-slate-600 dark:bg-slate-500'
                                                        : chatMode === 'general' ? 'bg-emerald-500' : 'bg-indigo-500'
                                                    }`}>
                                                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                                </div>

                                                <div className={`flex flex-col max-w-[85%] gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                    <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed
                                                        ${msg.role === 'user'
                                                            ? `${chatMode === 'general' ? 'bg-emerald-500' : 'bg-indigo-600'} text-white rounded-tr-sm`
                                                            : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-sm text-slate-800 dark:text-slate-200'
                                                        }`}>
                                                        {msg.role === 'user' ? msg.content : (
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                                    ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-0.5" {...props} />,
                                                                    ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-0.5" {...props} />,
                                                                    li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
                                                                    strong: ({ node, ...props }) => <strong className={`font-semibold ${chatMode === 'general' ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-400'}`} {...props} />,
                                                                    code: ({ node, ...props }) => <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />,
                                                                    h1: ({ node, ...props }) => <h1 className="text-base font-bold mb-2 mt-3" {...props} />,
                                                                    h2: ({ node, ...props }) => <h2 className="text-sm font-bold mb-1.5 mt-2" {...props} />,
                                                                    h3: ({ node, ...props }) => <h3 className="text-xs font-bold mb-1 mt-2" {...props} />,
                                                                }}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        )}
                                                    </div>

                                                    {/* Timestamp */}
                                                    {msg.timestamp && (
                                                        <span className="text-[10px] text-slate-300 dark:text-slate-600 px-1">
                                                            {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}

                                                    {/* Grounding score (General mode) */}
                                                    {chatMode === 'general' && msg.role === 'assistant' && msg.metadata?.groundingScore > 0 && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border
                                                                ${msg.metadata.groundingScore >= 0.7 ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                                                    : msg.metadata.groundingScore >= 0.4 ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                                                                        : 'bg-red-50 text-red-500 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'}`}>
                                                                {Math.round(msg.metadata.groundingScore * 100)}% grounded
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Algorithm badge (Algorithmic mode) */}
                                                    {chatMode === 'algorithmic' && msg.role === 'assistant' && msg.algorithm && (
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800 flex items-center gap-1">
                                                                <Zap size={9} /> {msg.algorithm}
                                                            </span>
                                                            {msg.results?.length > 0 && (
                                                                <span className="text-[9px] text-slate-400">{msg.results.length} results</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Result chips (Algorithmic mode) */}
                                                    {chatMode === 'algorithmic' && msg.results?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {msg.results.slice(0, 8).map((res: any, ri: number) => (
                                                                <span key={ri} className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[140px]">
                                                                    {res.name || res.id}
                                                                </span>
                                                            ))}
                                                            {msg.results.length > 8 && <span className="text-[10px] text-slate-400 py-0.5">+{msg.results.length - 8} more</span>}
                                                        </div>
                                                    )}

                                                    {/* Reasoning artifacts */}
                                                    {chatMode === 'general' && msg.isReasoning && msg.reasoningOutcome && (
                                                        <div className="mt-2 space-y-2">
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg w-fit">
                                                                <ShieldCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
                                                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Verified</span>
                                                            </div>
                                                            {showOutcomeForm !== msg.id ? (
                                                                <button onClick={() => setShowOutcomeForm(msg.id)} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-500 uppercase tracking-wider transition-colors">
                                                                    <Star size={11} /> Track Result
                                                                </button>
                                                            ) : (
                                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                                                                    <div className="flex gap-1">
                                                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} className={`cursor-pointer ${feedback.rating >= s ? 'text-emerald-500 fill-emerald-500' : 'text-slate-300'}`} onClick={() => setFeedback({ ...feedback, rating: s })} />)}
                                                                    </div>
                                                                    <textarea className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs h-16 outline-none focus:border-emerald-400" placeholder="Clinical outcome..." value={feedback.comment} onChange={e => setFeedback({ ...feedback, comment: e.target.value })} />
                                                                    <div className="flex gap-2">
                                                                        <button onClick={() => submitOutcome(msg.reasoningOutcome!.encounter_id)} className="flex-1 py-1.5 bg-emerald-500 text-white font-bold text-[9px] uppercase rounded-lg hover:bg-emerald-600 transition-colors">Submit</button>
                                                                        <button onClick={() => setShowOutcomeForm(null)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[9px] uppercase rounded-lg">Cancel</button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Processing */}
                                        {isProcessing && (
                                            <div className="flex gap-3">
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${chatMode === 'general' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                                                    <Loader2 size={14} className="animate-spin" />
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                        <span className={`text-[11px] font-bold uppercase tracking-widest ${chatMode === 'general' ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                                            {chatMode === 'general' ? 'Thinking...' : 'Analyzing...'}
                                                        </span>
                                                    </div>
                                                    {chatMode === 'general' && neuralStore.currentStep > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pl-1">
                                                            {REASONING_STEPS.slice(0, neuralStore.currentStep).map((step, idx) => (
                                                                <span key={idx} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${idx === neuralStore.currentStep - 1 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`}>
                                                                    {step.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ═══ FOOTER INPUT ═══ */}
                                    <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <form onSubmit={handleSend} className="relative">
                                            <input
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder={chatMode === 'general' ? "Ask a question..." : "Ask about patterns, rankings, or groups..."}
                                                className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 pr-12 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all
                                                    ${chatMode === 'general' ? 'focus:ring-emerald-500/30 focus:border-emerald-400' : 'focus:ring-indigo-500/30 focus:border-indigo-400'}`}
                                                disabled={isProcessing}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!input.trim() || isProcessing}
                                                className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 text-white rounded-lg disabled:opacity-30 transition-all hover:scale-105 active:scale-95
                                                    ${chatMode === 'general' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                            >
                                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                            </button>
                                        </form>
                                        <div className="flex justify-center gap-4 mt-2">
                                            {chatMode === 'general' ? (
                                                <>
                                                    <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-[0.15em]">Smart Search</span>
                                                    <span className="text-[9px] text-slate-300 dark:text-slate-600">•</span>
                                                    <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-[0.15em]">Knowledge Graph</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-[0.15em]">AI Powered</span>
                                                    <span className="text-[9px] text-slate-300 dark:text-slate-600">•</span>
                                                    <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-[0.15em]">Graph Algorithms</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ FAB TRIGGER ═══ */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (isOpen) {
                        setIsOpen(false);
                        setIsExpanded(false);
                    } else {
                        setIsOpen(true);
                    }
                }}
                className={`pointer-events-auto w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative group overflow-hidden
                    ${isOpen
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-lg'
                        : 'bg-emerald-500 text-white shadow-[0_8px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.5)]'
                    }`}
            >
                {isOpen ? <X size={22} /> : <MessageSquare size={22} />}

                {!isOpen && (
                    <div className="absolute right-full mr-4 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 pointer-events-none shadow-xl">
                        Unified Assistant
                    </div>
                )}
            </motion.button>
        </div>
    );
}
