import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Zap,
    Send,
    Loader2,
    X,
    Bot,
    User,
    Maximize2,
    Minimize2,
    Trash2,
    ChevronDown,
    Activity,
    GitBranch,
    BarChart3,
    Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { useAnalyticAssistantStore } from '@/store/analyticAssistantStore';
import { docAiApi } from '@/lib/api';
import { toast } from 'sonner';

export function AnalyticChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');

    const { activeFolderId, selectedNodes } = useGraphStore();
    const {
        currentSessionId,
        messages,
        isProcessing,
        setProcessing,
        addMessage,
        setSessionId,
        clearMessages
    } = useAnalyticAssistantStore();

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing, currentSessionId]);

    const sessionMessages = currentSessionId ? (messages[currentSessionId] || []) : [];

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isProcessing || !currentSessionId) return;

        const userQuery = input.trim();
        setInput('');
        addMessage(currentSessionId, { role: "user", content: userQuery });

        setProcessing(true);

        try {
            const response = await docAiApi.analyticsChat.query({
                query: userQuery,
                folder_id: activeFolderId || undefined,
                node_ids: selectedNodes.length > 0 ? selectedNodes : undefined
            }) as { answer: string; algorithm: string; results: any[]; resolved_entities?: string[] };

            addMessage(currentSessionId, {
                role: "assistant",
                content: response.answer,
                algorithm: response.algorithm,
                results: response.results,
                resolved_entities: response.resolved_entities
            });
        } catch (err: any) {
            toast.error("Algorithmic matrix failure");
            addMessage(currentSessionId, {
                role: "assistant",
                content: `Error: ${err.detail || "I encountered a processing error while running graph algorithms."}`
            });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className={`fixed ${isExpanded ? 'inset-0' : 'bottom-6 left-6'} z-[160] flex flex-col items-start pointer-events-none transition-all duration-500`}>
            {/* Float Trigger */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`pointer-events-auto w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 relative group overflow-hidden ${isOpen
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                    : 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    }`}
            >
                <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isOpen ? <X size={28} /> : <BarChart3 size={28} />}

                {!isOpen && (
                    <div className="absolute left-full ml-6 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 backdrop-blur-xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all -translate-x-[10px] group-hover:translate-x-0 pointer-events-none shadow-xl">
                        Algorithmic Assistant
                    </div>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, x: -20 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95, x: -20 }}
                        className={`pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-indigo-500/10 dark:border-indigo-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col transition-all duration-500 ease-in-out ${isExpanded ? 'w-full h-full rounded-none m-0 fixed inset-0' : 'w-[500px] h-[750px] rounded-[2.5rem] mt-4'
                            }`}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-indigo-500/10 dark:border-indigo-500/20 flex items-center justify-between bg-indigo-500/5 dark:bg-indigo-500/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20">
                                    <Network size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">Algorithmic Insight</h3>
                                    <div className="flex items-center gap-1.5 leading-none mt-1">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1] animate-pulse" />
                                        <span className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 uppercase font-bold tracking-widest leading-none">GDS Analytics v1.0</span>
                                    </div>
                                    <div className="mt-1 text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[250px]">
                                        {activeFolderId
                                            ? `📂 Scoped to folder`
                                            : selectedNodes.length > 0
                                                ? `🎯 ${selectedNodes.length} nodes selected`
                                                : '⚠️ No folder selected — full DB'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => clearMessages(currentSessionId!)}
                                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    <ChevronDown size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-indigo-500/10 dark:scrollbar-thumb-indigo-500/20">
                            {sessionMessages.length === 0 && !isProcessing && (
                                <div className="h-full flex flex-col items-center justify-center text-center px-10 pt-20">
                                    <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/5 flex items-center justify-center mb-6 border border-indigo-500/10 relative">
                                        <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full" />
                                        <Activity className="text-indigo-500 w-10 h-10 relative z-10" />
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Analytic Engine Idle</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                                        Ask questions like "Who are the most important entities?" or "Find me grouped clusters".
                                    </p>
                                </div>
                            )}

                            {sessionMessages.map((msg, i) => (
                                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`mt-1 flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center border shadow-sm ${msg.role === 'user'
                                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                                        }`}>
                                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                    </div>

                                    <div className={`flex flex-col max-w-[88%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-5 py-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                                            : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-tl-none text-slate-800 dark:text-slate-200'
                                            }`}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-bold text-indigo-700 dark:text-indigo-400" {...props} />,
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Meta Indicators */}
                                        <div className="flex flex-wrap items-center gap-2 mt-2 ml-1">
                                            {msg.algorithm && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center gap-1">
                                                    <Zap size={10} />
                                                    {msg.algorithm}
                                                </span>
                                            )}
                                            {msg.resolved_entities && msg.resolved_entities.length > 0 && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                                                    <Activity size={10} />
                                                    {msg.resolved_entities.length} nodes found
                                                </span>
                                            )}
                                            {msg.results && msg.results.length > 0 && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                                                    {msg.results.length} data points
                                                </span>
                                            )}
                                        </div>

                                        {/* Simplified result preview */}
                                        {msg.results && msg.results.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2 max-w-full overflow-hidden">
                                                {msg.results.slice(0, 10).map((res, ri) => (
                                                    <div key={ri} className="px-2 py-1 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-indigo-600 font-medium truncate max-w-[150px] animate-in fade-in slide-in-from-bottom-1" style={{ animationDelay: `${ri * 50}ms` }}>
                                                        {res.name || res.id}
                                                    </div>
                                                ))}
                                                {msg.results.length > 10 && (
                                                    <div className="px-2 py-1 text-[10px] text-slate-400 italic">
                                                        +{msg.results.length - 10} more items
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isProcessing && (
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center">
                                            <Bot size={16} />
                                        </div>
                                        <div className="px-5 py-3.5 rounded-[1.5rem] rounded-tl-none bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                            <div className="flex gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0s' }} />
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
                                            </div>
                                            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Running Algorithms...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Input */}
                        <div className="p-6 border-t border-indigo-500/10 dark:border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10">
                            <form onSubmit={handleSend} className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about influence, bridges, or groups..."
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 pr-14 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                                    disabled={isProcessing}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isProcessing}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl disabled:opacity-30 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/10"
                                >
                                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </form>
                            <div className="flex justify-center gap-6 mt-3">
                                <p className="text-[9px] text-indigo-600/40 dark:text-indigo-400/40 font-bold uppercase tracking-[0.2em]">
                                    LLM Decision
                                </p>
                                <Network size={10} className="text-indigo-400/30" />
                                <p className="text-[9px] text-indigo-600/40 dark:text-indigo-400/40 font-bold uppercase tracking-[0.2em]">
                                    GDS Execution
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
