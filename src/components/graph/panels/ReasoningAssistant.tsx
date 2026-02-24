import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Activity,
    Brain,
    ShieldCheck,
    Search,
    Database,
    Stethoscope,
    MessageSquare,
    Zap,
    ChevronDown,
    Send,
    Loader2,
    X,
    ClipboardList,
    AlertTriangle,
    CheckCircle2,
    Star,
    User,
    Bot,
    Target,
    Maximize2,
    Minimize2,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { useAuthStore } from '@/store/authStore';
import { useUnifiedAssistantStore, type Citation, type Outcome } from '@/store/unifiedAssistantStore';
import { docAiApi } from '@/lib/api';

// 13 Steps of Clinical Reasoning
const REASONING_STEPS = [
    { id: 1, name: "Intake", icon: MessageSquare, description: "Analyzing query structure" },
    { id: 2, name: "NER", icon: Activity, description: "Identifying symptoms" },
    { id: 3, name: "Safety", icon: ShieldCheck, description: "Red-flag detection" },
    { id: 4, name: "Schema", icon: Database, description: "Retrieving ontology" },
    { id: 5, name: "Inference", icon: Brain, description: "Systemic imbalances" },
    { id: 6, name: "Analytics", icon: Zap, description: "GDS Algorithms" },
    { id: 7, name: "Reasoning", icon: Zap, description: "Graph traversal" },
    { id: 8, name: "Properties", icon: ClipboardList, description: "Mapping properties" },
    { id: 9, name: "RAG Search", icon: Search, description: "Monograph retrieval" },
    { id: 10, name: "Guidance", icon: Stethoscope, description: "Dosage calculation" },
    { id: 11, name: "Synthesis", icon: MessageSquare, description: "Composition" },
    { id: 12, name: "Audit", icon: ShieldCheck, description: "Verifying integrity" },
    { id: 13, name: "Outcome", icon: Star, description: "Feedback loop" }
];

export function ReasoningAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const [showOutcomeForm, setShowOutcomeForm] = useState<string | null>(null); // messageId
    const [feedback, setFeedback] = useState({ rating: 5, comment: '' });

    const { activeFolderId } = useGraphStore();
    const { user } = useAuthStore();
    const {
        currentSessionId,
        messages,
        isProcessing,
        currentStep,
        setProcessing,
        setCurrentStep,
        addMessage,
        setSessionId,
        clearMessages
    } = useUnifiedAssistantStore();

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing, currentStep, currentSessionId]);

    // Safeguard: Ensure session_id is a valid UUID (prevents DataError on backend)
    useEffect(() => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (currentSessionId && !uuidRegex.test(currentSessionId)) {
            console.warn("Invalid session ID detected, regenerating...");
            setSessionId(null);
        }
    }, [currentSessionId, setSessionId]);

    const sessionMessages = currentSessionId ? (messages[currentSessionId] || []) : [];

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isProcessing || !activeFolderId || !currentSessionId) return;

        const userQuery = input.trim();
        setInput('');
        addMessage(currentSessionId, { role: "user", content: userQuery });

        // Heuristic to decide if it's a "Discovery" or "Clinical" query
        const isClinical = /symptom|pain|feel|taking|treatment|medicine|dose|diagnose|patient/i.test(userQuery);

        setProcessing(true);

        try {
            if (isClinical) {
                setCurrentStep(1);
                // Simulation intervals for the 13 steps (Updated: faster 500ms + fixed closure)
                const stepTimer = setInterval(() => {
                    setCurrentStep(prev => Math.min(prev + 1, 13));
                }, 500);

                const response = await docAiApi.reasoning.consult({
                    message: userQuery,
                    folder_id: activeFolderId,
                    session_id: currentSessionId,
                    user_id: user?.id
                }) as Outcome;

                clearInterval(stepTimer);
                addMessage(currentSessionId, {
                    role: "assistant",
                    content: response.final_response,
                    isReasoning: true,
                    reasoningOutcome: response
                });
            } else {
                // Enhanced Discovery RAG (10 features)
                const response = await docAiApi.query.ask({
                    question: userQuery,
                    scope: { type: 'folder', id: activeFolderId },
                    session_id: currentSessionId
                }) as { answer: string; citations: Citation[]; grounding_score?: number; ml_insights_count?: number; predictions_count?: number };

                addMessage(currentSessionId, {
                    role: "assistant",
                    content: response.answer,
                    citations: response.citations,
                    metadata: {
                        groundingScore: response.grounding_score ?? 0,
                        mlInsights: response.ml_insights_count ?? 0,
                        predictions: response.predictions_count ?? 0,
                    }
                });
            }
        } catch (err: any) {
            addMessage(currentSessionId, {
                role: "assistant",
                content: `Error: ${err.detail || "Neural dispatch failure."}`
            });
        } finally {
            setProcessing(false);
            setCurrentStep(0);
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

    return (
        <div className={`fixed ${isExpanded ? 'inset-0' : 'bottom-6 right-6'} z-[160] flex flex-col items-end pointer-events-none transition-all duration-500`}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
                        className={`pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-emerald-500/10 dark:border-emerald-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col transition-all duration-500 ease-in-out ${isExpanded ? 'w-full h-full rounded-none m-0' : 'w-[500px] h-[750px] rounded-[2.5rem] mb-4'
                            }`}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-emerald-500/10 dark:border-emerald-500/20 flex items-center justify-between bg-emerald-500/5 dark:bg-emerald-500/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                                    <Brain size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">Unified Neural Assistant</h3>
                                    <div className="flex items-center gap-1.5 leading-none mt-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" />
                                        <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase font-bold tracking-widest leading-none">Reasoning + Discovery v3.0</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => clearMessages(currentSessionId!)}
                                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                                    title="Clear neural context"
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
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-emerald-500/10 dark:scrollbar-thumb-emerald-500/20">

                            {sessionMessages.length === 0 && !isProcessing && (
                                <div className="h-full flex flex-col items-center justify-center text-center px-10 pt-20">
                                    <div className="w-20 h-20 rounded-[2.5rem] bg-emerald-500/5 flex items-center justify-center mb-6 border border-emerald-500/10 relative">
                                        <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full" />
                                        <Zap className="text-emerald-500 w-10 h-10 relative z-10" />
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Neural Matrix Ready</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                                        Ask clinical questions for deep reasoning, or browse facts for discovery.
                                    </p>
                                </div>
                            )}

                            {sessionMessages.map((msg, i) => (
                                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`mt-1 flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center border shadow-sm ${msg.role === 'user' ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                    </div>

                                    <div className={`flex flex-col max-w-[88%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-5 py-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-emerald-500 text-white rounded-tr-none font-medium' : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-tl-none text-slate-800 dark:text-slate-200'
                                            }`}>
                                            {msg.role === 'user' ? (
                                                msg.content
                                            ) : (
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                        h1: ({ node, ...props }) => <h1 className="text-base font-bold mb-2" {...props} />,
                                                        h2: ({ node, ...props }) => <h2 className="text-sm font-bold mb-2" {...props} />,
                                                        h3: ({ node, ...props }) => <h3 className="text-xs font-bold mb-1" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-bold text-emerald-700 dark:text-emerald-400" {...props} />,
                                                        code: ({ node, ...props }) => <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs" {...props} />
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            )}
                                        </div>

                                        {/* Enhanced RAG Indicators (Feature 10: Grounding Score) */}
                                        {msg.role === 'assistant' && (msg as any).metadata && (
                                            <div className="flex items-center gap-2 mt-1.5 ml-1">
                                                {(msg as any).metadata.groundingScore > 0 && (
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${(msg as any).metadata.groundingScore >= 0.7
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                        : (msg as any).metadata.groundingScore >= 0.4
                                                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                                                            : 'bg-red-50 text-red-500 border-red-200'
                                                        }`}>
                                                        {Math.round((msg as any).metadata.groundingScore * 100)}% grounded
                                                    </span>
                                                )}
                                                {(msg as any).metadata.mlInsights > 0 && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                                                        {(msg as any).metadata.mlInsights} ML insights
                                                    </span>
                                                )}
                                                {(msg as any).metadata.predictions > 0 && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-200">
                                                        {(msg as any).metadata.predictions} predictions
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Citations */}
                                        {/* {msg.citations && msg.citations.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {msg.citations.map((cite, ci) => (
                                                    <button key={ci} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[10px] font-bold text-blue-600 hover:bg-blue-500/10 transition-all uppercase tracking-tighter">
                                                        <Target size={11} />
                                                        <span>{cite.nodeName}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )} */}

                                        {/* Reasoning Artifacts */}
                                        {msg.isReasoning && msg.reasoningOutcome && (
                                            <div className="mt-4 w-full space-y-4">
                                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg w-fit">
                                                    <ShieldCheck size={12} className="text-emerald-600" />
                                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Protocol Verified</span>
                                                </div>

                                                {/* Outcome Tracking Toggle */}
                                                {showOutcomeForm !== msg.id ? (
                                                    <button
                                                        onClick={() => setShowOutcomeForm(msg.id)}
                                                        className="flex items-center gap-2 text-[10px] font-bold text-emerald-500/60 hover:text-emerald-500 uppercase tracking-widest transition-colors pl-1"
                                                    >
                                                        <Star size={12} />
                                                        Track Result
                                                    </button>
                                                ) : (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <Star key={s} size={14} className={feedback.rating >= s ? 'text-emerald-500 fill-current' : 'text-slate-300'} onClick={() => setFeedback({ ...feedback, rating: s })} />
                                                            ))}
                                                        </div>
                                                        <textarea
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 h-20 outline-none focus:border-emerald-500/50"
                                                            placeholder="Clinical outcome..."
                                                            value={feedback.comment}
                                                            onChange={e => setFeedback({ ...feedback, comment: e.target.value })}
                                                        />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => submitOutcome(msg.reasoningOutcome!.encounter_id)} className="flex-1 py-1.5 bg-emerald-500 text-white font-bold text-[9px] uppercase rounded-lg shadow-sm">Update Audit</button>
                                                            <button onClick={() => setShowOutcomeForm(null)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[9px] uppercase rounded-lg">Close</button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Processing Indicator / Reasoning Stepper */}
                            {isProcessing && (
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                                            <Bot size={16} />
                                        </div>
                                        <div className="px-5 py-3.5 rounded-[1.5rem] rounded-tl-none bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                            <div className="flex gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0s' }} />
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
                                            </div>
                                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Neural Dispatch...</span>
                                        </div>
                                    </div>

                                    {currentStep > 0 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pr-12 space-y-2 border-r border-emerald-500/20 mr-4">
                                            {REASONING_STEPS.slice(0, currentStep).map((step, idx) => (
                                                <div key={idx} className="flex flex-row-reverse items-center gap-3 py-0.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${idx === currentStep - 1 ? 'bg-emerald-500' : 'bg-emerald-500/20'}`} />
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${idx === currentStep - 1 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                        {step.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Input */}
                        <div className="p-6 border-t border-emerald-500/10 dark:border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10">
                            <form onSubmit={handleSend} className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything... (detects clinical intent)"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 pr-14 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
                                    disabled={isProcessing}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isProcessing}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-emerald-500 text-white rounded-xl disabled:opacity-30 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/10"
                                >
                                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </form>
                            <div className="flex justify-center gap-6 mt-3">
                                <p className="text-[9px] text-emerald-600/40 dark:text-emerald-400/40 font-bold uppercase tracking-[0.2em]">
                                    Neural RAG
                                </p>
                                <p className="text-[9px] text-emerald-600/40 dark:text-emerald-400/40 font-bold uppercase tracking-[0.2em]">
                                    Graph Reasoning
                                </p>
                                <p className="text-[9px] text-emerald-600/40 dark:text-emerald-400/40 font-bold uppercase tracking-[0.2em]">
                                    GDS Analytics
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Float Trigger */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`pointer-events-auto w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 relative group overflow-hidden ${isOpen ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/30 rotate-90' : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/30'
                    }`}
            >
                <div className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}


                {!isOpen && (
                    <div className="absolute right-full mr-6 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 backdrop-blur-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all translate-x-[10px] group-hover:translate-x-0 pointer-events-none shadow-xl">
                        Unified Neural Assistant
                    </div>
                )}
            </motion.button>
        </div>
    );
}
