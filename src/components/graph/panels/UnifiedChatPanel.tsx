import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Activity, Brain, ShieldCheck, Search, Database, Stethoscope, MessageSquare,
    Zap, ChevronDown, Send, Loader2, X, ClipboardList,
    Star, User, Bot, Maximize2, Minimize2, Trash2, Network, BarChart3,
    Plus, Clock, History, Folder as FolderIcon, FileText as FileIcon, Download,
    FileType, FileText as FileTxtIcon, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { useAuthStore } from '@/store/authStore';
import { useUnifiedAssistantStore, type Citation, type Outcome } from '@/store/unifiedAssistantStore';
import { useAnalyticAssistantStore } from '@/store/analyticAssistantStore';
import { useCombinedChatStore } from '@/store/combinedChatStore';
import { docAiApi } from '@/lib/api';
import { toast } from 'sonner';

const REASONING_STEPS = [
    { id: 1, name: "Analyzing", icon: Brain },
    { id: 2, name: "Searching", icon: Search },
    { id: 3, name: "Synthesizing", icon: MessageSquare },
    { id: 4, name: "Done", icon: Star }
];

type ChatMode = 'general' | 'algorithmic' | 'combined';

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
    sessionFolders,
    currentFolderId,
    currentSessionId,
    onSelectSession,
    onNewSession,
    chatMode,
}: {
    messages: Record<string, any[]>;
    sessionFolders: Record<string, string>;
    currentFolderId: string | null;
    currentSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewSession: () => void;
    chatMode: ChatMode;
}) {
    const sessions = useMemo(() => {
        return Object.entries(messages)
            .filter(([id, msgs]) => {
                // Filter by folder if currentFolderId exists
                if (currentFolderId && sessionFolders[id] && sessionFolders[id] !== currentFolderId) return false;
                return msgs.length > 0;
            })
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
        <div className="w-full sm:w-[240px] md:w-[260px] flex-shrink-0 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
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
    const [chatMode, setChatMode] = useState<ChatMode>('combined');
    const [showHistory, setShowHistory] = useState(false);
    const [showOutcomeForm, setShowOutcomeForm] = useState<string | null>(null);
    const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
    const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [expandedAlgo, setExpandedAlgo] = useState<string | null>(null); // collapsible algo bar

    const { activeFolderId, activeFileId, selectedNodes, zoomToNode: storeZoomToNode } = useGraphStore();
    const { user } = useAuthStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Context Names Fetching
    const [activeFolderName, setActiveFolderName] = useState<string | null>(null);
    const [activeFileName, setActiveFileName] = useState<string | null>(null);

    useEffect(() => {
        if (!activeFolderId) {
            setActiveFolderName(null);
            return;
        }
        docAiApi.folders.get(activeFolderId).then((res: any) => {
            setActiveFolderName(res.name || 'Unknown Folder');
        }).catch(err => console.error(err));
    }, [activeFolderId]);

    useEffect(() => {
        if (!activeFileId) {
            setActiveFileName(null);
            return;
        }
        docAiApi.files.get(activeFileId).then((res: any) => {
            setActiveFileName(res.filename || 'Unknown File');
        }).catch(err => console.error(err));
    }, [activeFileId]);

    // Stores
    const neuralStore = useUnifiedAssistantStore();
    const analyticStore = useAnalyticAssistantStore();
    const combinedStore = useCombinedChatStore();

    // Dynamically derive current state
    const isProcessing = chatMode === 'general' 
        ? neuralStore.isProcessing 
        : chatMode === 'algorithmic' 
            ? analyticStore.isProcessing 
            : combinedStore.isProcessing;

    const currentSessionId = chatMode === 'general' 
        ? neuralStore.currentSessionId 
        : chatMode === 'algorithmic' 
            ? analyticStore.currentSessionId 
            : combinedStore.currentSessionId;

    const allMessages = chatMode === 'general' 
        ? neuralStore.messages 
        : chatMode === 'algorithmic' 
            ? analyticStore.messages 
            : combinedStore.messages;

    const neuralMessages = neuralStore.currentSessionId ? (neuralStore.messages[neuralStore.currentSessionId] || []) : [];
    const analyticMessages = analyticStore.currentSessionId ? (analyticStore.messages[analyticStore.currentSessionId] || []) : [];
    const combinedMessages = combinedStore.currentSessionId ? (combinedStore.messages[combinedStore.currentSessionId] || []) : [];

    const activeMessages = chatMode === 'general' 
        ? neuralMessages 
        : chatMode === 'algorithmic' 
            ? analyticMessages 
            : combinedMessages;

    const ThemeIcon = chatMode === 'general' ? Brain : (chatMode === 'algorithmic' ? Network : Zap);

    // Auto-scroll (smooth)
    useEffect(() => {
        if (scrollRef.current) {
            requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            });
        }
    }, [activeMessages, isProcessing, chatMode, neuralStore.currentStep]);

    // Clear session when folder changes to ensure strict isolation
    useEffect(() => {
        if (activeFolderId) {
            // Combined isolation
            const combFolder = combinedStore.sessionFolders[combinedStore.currentSessionId || ''];
            if (combFolder && combFolder !== activeFolderId) combinedStore.setSessionId(null, activeFolderId);
            else if (!combFolder) combinedStore.setSessionId(combinedStore.currentSessionId, activeFolderId);

            // Neural isolation
            const neuralFolder = neuralStore.sessionFolders[neuralStore.currentSessionId || ''];
            if (neuralFolder && neuralFolder !== activeFolderId) neuralStore.setSessionId(null, activeFolderId);
            else if (!neuralFolder) neuralStore.setSessionId(neuralStore.currentSessionId, activeFolderId);

            // Analytic isolation
            const analyticFolder = analyticStore.sessionFolders[analyticStore.currentSessionId || ''];
            if (analyticFolder && analyticFolder !== activeFolderId) analyticStore.setSessionId(null, activeFolderId);
            else if (!analyticFolder) analyticStore.setSessionId(analyticStore.currentSessionId, activeFolderId);
        }
    }, [activeFolderId]);

    // Show history in expanded mode
    useEffect(() => {
        if (isExpanded) setShowHistory(true);
        else setShowHistory(false);
    }, [isExpanded]);

    const handleClearMessages = () => {
        if (!currentSessionId) return;
        if (chatMode === 'general') neuralStore.clearMessages(currentSessionId);
        else if (chatMode === 'algorithmic') analyticStore.clearMessages(currentSessionId);
        else combinedStore.clearMessages(currentSessionId);
    };

    const handleNewSession = () => {
        if (chatMode === 'general') neuralStore.setSessionId(null);
        else if (chatMode === 'algorithmic') analyticStore.setSessionId(null);
        else combinedStore.setSessionId(null, activeFolderId || undefined);
    };

    const handleSelectSession = (id: string) => {
        if (chatMode === 'general') neuralStore.setSessionId(id);
        else if (chatMode === 'algorithmic') analyticStore.setSessionId(id);
        else combinedStore.setSessionId(id, activeFolderId || undefined);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isProcessing || !currentSessionId) return;

        const userQuery = input.trim();
        setInput('');

        if (chatMode === 'general') {
            neuralStore.addMessage(currentSessionId, { role: "user", content: userQuery }, activeFolderId || undefined);
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
                }, activeFolderId || undefined);
            } catch (err: any) {
                const errorMsg = err?.detail || err?.message || "Something went wrong. Please try again.";
                neuralStore.addMessage(currentSessionId, {
                    role: "assistant", content: `Error: ${errorMsg}`
                });
            } finally {
                neuralStore.setProcessing(false);
                neuralStore.setCurrentStep(0);
            }
        } else if (chatMode === 'algorithmic') {
            analyticStore.addMessage(currentSessionId, { role: "user", content: userQuery } as any, activeFolderId || undefined);
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
                } as any, activeFolderId || undefined);
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
        } else {
            // Combined mode (NON-STREAMING — single JSON response)
            combinedStore.addMessage(currentSessionId, { role: "user", content: userQuery }, activeFolderId || undefined);
            
            combinedStore.setProcessing(true);
            combinedStore.setCurrentStep(1, 'Analyzing research intent...');

            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
                const cleanUrl = baseUrl.endsWith('/api/v1') ? `${baseUrl}/combined-chat/answer` : `${baseUrl}/api/v1/combined-chat/answer`;
                
                const response = await fetch(cleanUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    },
                    body: JSON.stringify({
                        question: userQuery,
                        folder_id: activeFolderId || undefined,
                        history: combinedMessages
                            .filter(m => m.content.trim().length > 0)
                            .slice(-10)
                            .map(m => ({ role: m.role, content: m.content }))
                    })
                });

                if (!response.ok) throw new Error("Connection failed");

                const data = await response.json();

                // Create assistant message with the full answer at once
                combinedStore.addMessage(currentSessionId, { 
                    role: "assistant", 
                    content: data.answer || "" ,
                    suggestWebSearch: data.suggest_web_search,
                    webSearchEmphasized: data.web_search_emphasized
                }, activeFolderId || undefined);
                
                // Attach intent, algorithm, and results to the message
                if (data.intent) {
                    combinedStore.updateLastMessage(currentSessionId, "", data.intent);
                }
                if (data.algorithm && data.results) {
                    combinedStore.updateLastMessage(currentSessionId, "", undefined, data.algorithm, data.results);
                }

            } catch (err: any) {
                const errorMsg = err?.message || "Something went wrong in the combined pipeline.";
                combinedStore.addMessage(currentSessionId, { role: "assistant", content: `Error: ${errorMsg}` }, activeFolderId || undefined);
            } finally {
                combinedStore.setProcessing(false);
                combinedStore.setCurrentStep(0, '');
            }
        }
    };

    const handleWebSearch = async (msgId: string, question: string, contextHint?: string) => {
        if (!currentSessionId) return;
        
        combinedStore.setWebSearchPending(currentSessionId, msgId, true);
        
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
            const cleanUrl = baseUrl.endsWith('/api/v1') ? `${baseUrl}/combined-chat/web-search` : `${baseUrl}/api/v1/combined-chat/web-search`;
            
            const response = await fetch(cleanUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    question: question,
                    context_hint: contextHint
                })
            });

            if (!response.ok) throw new Error("Web search failed");

            const data = await response.json();
            
            combinedStore.setWebSearchResult(
                currentSessionId, 
                msgId, 
                data.answer, 
                data.grounding_metadata?.grounding_chunks
            );
            
            toast.success("Web search results loaded");
        } catch (err: any) {
            console.error("Web search error:", err);
            toast.error("Could not complete web search");
            combinedStore.setWebSearchPending(currentSessionId, msgId, false);
        }
    };

    const toggleResultExpansion = (msgId: string) => {
        setExpandedResults(prev => {
            const next = new Set(prev);
            if (next.has(msgId)) next.delete(msgId);
            else next.add(msgId);
            return next;
        });
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

    // ─── Export Chat as Text ───
    const handleExportChat = () => {
        if (activeMessages.length === 0) {
            toast.info('No messages to export');
            return;
        }

        const modeLabel = chatMode === 'general' ? 'General Chat' : 'Graph Analytics';
        const folderLabel = activeFolderName ? `Folder: ${activeFolderName}` : '';
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        let output = '';
        output += '═'.repeat(60) + '\n';
        output += `  Neural Nexus — ${modeLabel} Export\n`;
        output += '═'.repeat(60) + '\n';
        output += `Date: ${dateStr} at ${timeStr}\n`;
        if (folderLabel) output += `${folderLabel}\n`;
        output += `Messages: ${activeMessages.length}\n`;
        output += '═'.repeat(60) + '\n\n';

        activeMessages.forEach((msg: any, idx: number) => {
            const ts = msg.timestamp
                ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : '';
            const role = msg.role === 'user' ? '👤 YOU' : (chatMode === 'general' ? '🧠 ASSISTANT' : '📊 ANALYTICS');

            output += `─── ${role} ${ts ? `(${ts})` : ''} ───\n`;
            output += `${msg.content}\n`;

            // Add algorithm info for analytics
            if (chatMode === 'algorithmic' && msg.algorithm) {
                output += `\n  ⚡ Algorithm: ${msg.algorithm}`;
                if (msg.results?.length) output += ` | ${msg.results.length} results`;
                output += '\n';
            }

            // Add grounding score for general
            if (chatMode === 'general' && msg.metadata?.groundingScore > 0) {
                output += `  ✓ Grounding: ${Math.round(msg.metadata.groundingScore * 100)}%\n`;
            }

            output += '\n';
        });

        output += '═'.repeat(60) + '\n';
        output += '  End of Export\n';
        output += '═'.repeat(60) + '\n';

        // Download as .txt file
        const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeFolder = activeFolderName ? `_${activeFolderName.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        a.download = `neural-nexus_${chatMode}${safeFolder}_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Chat exported as text!');
    };

    // ─── Export Chat as PDF ───
    const handleExportPDF = async () => {
        if (activeMessages.length === 0) {
            toast.info('No messages to export');
            return;
        }

        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - margin * 2;
            let y = margin;

            const modeLabel = chatMode === 'general' ? 'General Chat' : 'Graph Analytics';
            const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const accentColor: [number, number, number] = chatMode === 'general' ? [16, 185, 129] : [99, 102, 241];

            // Helper: add new page if needed
            const checkPage = (needed: number) => {
                if (y + needed > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }
            };

            // Helper: wrap and print text, returns new Y
            const printWrapped = (text: string, x: number, startY: number, maxW: number, fontSize: number, color: [number, number, number] = [30, 41, 59]) => {
                doc.setFontSize(fontSize);
                doc.setTextColor(...color);
                const lines = doc.splitTextToSize(text, maxW);
                for (const line of lines) {
                    checkPage(fontSize * 0.5);
                    doc.text(line, x, startY);
                    startY += fontSize * 0.45;
                }
                return startY;
            };

            // ── Header ──
            doc.setFillColor(...accentColor);
            doc.rect(0, 0, pageWidth, 28, 'F');
            doc.setFontSize(18);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('Neural Nexus', margin, 12);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`${modeLabel} Export`, margin, 19);
            doc.setFontSize(9);
            doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 19);
            if (activeFolderName) {
                doc.text(`Folder: ${activeFolderName}`, margin, 25);
            }
            y = 38;

            // ── Messages ──
            activeMessages.forEach((msg: any) => {
                const isUser = msg.role === 'user';
                const roleLabel = isUser ? 'You' : (chatMode === 'general' ? 'Assistant' : 'Analytics');
                const ts = msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '';

                checkPage(20);

                // Role + timestamp line
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                const roleColor: [number, number, number] = isUser ? [71, 85, 105] : accentColor;
                doc.setTextColor(...roleColor);
                doc.text(`${roleLabel}${ts ? '  •  ' + ts : ''}`, margin, y);
                y += 5;

                // Message bubble background
                const cleanContent = (msg.content || '').replace(/\*\*/g, '').replace(/#{1,3}\s/g, '');
                doc.setFontSize(10);
                const textLines = doc.splitTextToSize(cleanContent, contentWidth - 8);
                const blockHeight = textLines.length * 4.5 + 6;

                checkPage(blockHeight + 5);

                if (isUser) {
                    doc.setFillColor(241, 245, 249);
                } else {
                    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2], 0.06);
                    doc.setFillColor(
                        Math.min(255, accentColor[0] + 220),
                        Math.min(255, accentColor[1] + 200),
                        Math.min(255, accentColor[2] + 200)
                    );
                }
                doc.roundedRect(margin, y - 2, contentWidth, blockHeight, 2, 2, 'F');

                // Message text
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(30, 41, 59);
                let textY = y + 3;
                for (const line of textLines) {
                    checkPage(5);
                    doc.text(line, margin + 4, textY);
                    textY += 4.5;
                }
                y = textY + 4;

                // Algorithm badge for analytics
                if (chatMode === 'algorithmic' && msg.algorithm) {
                    checkPage(8);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...accentColor);
                    let badge = `Algorithm: ${msg.algorithm}`;
                    if (msg.results?.length) badge += ` | ${msg.results.length} results`;
                    doc.text(badge, margin + 4, y);
                    y += 5;
                }

                // Grounding score for general
                if (chatMode === 'general' && msg.metadata?.groundingScore > 0) {
                    checkPage(8);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    const score = Math.round(msg.metadata.groundingScore * 100);
                    const scoreColor: [number, number, number] = score >= 70 ? [16, 185, 129] : score >= 40 ? [245, 158, 11] : [239, 68, 68];
                    doc.setTextColor(...scoreColor);
                    doc.text(`Grounding: ${score}%`, margin + 4, y);
                    y += 5;
                }

                y += 3; // spacing between messages
            });

            // ── Footer ──
            checkPage(15);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, pageWidth - margin, y);
            y += 6;
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'normal');
            doc.text(`Neural Nexus • ${activeMessages.length} messages • Exported ${dateStr}`, margin, y);

            // Save
            const safeFolder = activeFolderName ? `_${activeFolderName.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
            doc.save(`neural-nexus_${chatMode}${safeFolder}_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('Chat exported as PDF!');
        } catch (err) {
            console.error('PDF export error:', err);
            toast.error('PDF export failed. Make sure jspdf is installed: npm install jspdf');
        }
        setShowExportMenu(false);
    };

    return (
        <div className={`fixed z-[160] pointer-events-none transition-all duration-500 ${isExpanded && isOpen ? 'inset-0' : 'bottom-4 right-4 md:bottom-6 md:right-6 flex flex-col items-end'}`}>
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
                                : 'w-[calc(100vw-2rem)] sm:w-[450px] md:w-[500px] h-[calc(100vh-9rem)] sm:h-[600px] md:h-[650px] max-h-[calc(100vh-8.5rem)] rounded-2xl md:rounded-[2rem] mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_25px_60_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]'
                            }`}
                    >
                        {/* ═══ HEADER ═══ */}
                        <div className={`px-4 md:px-5 py-3 flex items-center justify-between border-b flex-shrink-0 ${chatMode === 'general'
                            ? 'bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/40'
                            : 'bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/40'
                            }`}>
                            <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                {/* History toggle (only in expanded) */}
                                {isExpanded && (
                                    <button
                                        onClick={() => setShowHistory(!showHistory)}
                                        className={`p-1.5 md:p-2 rounded-lg transition-colors ${showHistory ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                                        title="Toggle session history"
                                    >
                                        <History size={15} />
                                    </button>
                                )}
                                <div className={`p-1.5 md:p-2 rounded-xl shrink-0 ${chatMode === 'general' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                    <ThemeIcon size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {chatMode === 'general' ? 'Chat Assistant' : chatMode === 'algorithmic' ? 'Graph Analytics' : 'Ask'}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${chatMode === 'general' ? 'bg-emerald-500' : chatMode === 'algorithmic' ? 'bg-indigo-500' : 'bg-indigo-500'}`} />
                                        <span className={`text-[8px] md:text-[9px] uppercase font-bold tracking-widest truncate ${chatMode === 'general' ? 'text-emerald-500/60' : chatMode === 'algorithmic' ? 'text-indigo-500/60' : 'text-indigo-500/60'}`}>
                                            {chatMode === 'general' ? 'Ask & Discover' : chatMode === 'algorithmic' ? 'Graph Analysis' : 'Assistant Active'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <button onClick={handleNewSession} className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="New session">
                                    <Plus size={15} />
                                </button>
                                {/* Export dropdown */}
                                <div className="relative hidden sm:block">
                                    <button
                                        onClick={() => setShowExportMenu(!showExportMenu)}
                                        disabled={activeMessages.length === 0}
                                        className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30"
                                        title="Export chat"
                                    >
                                        <Download size={14} />
                                    </button>
                                    <AnimatePresence>
                                        {showExportMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => { handleExportChat(); setShowExportMenu(false); }}
                                                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <FileTxtIcon size={14} className="text-blue-500" />
                                                    Export as Text
                                                </button>
                                                <div className="border-t border-slate-100 dark:border-slate-700" />
                                                <button
                                                    onClick={handleExportPDF}
                                                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <FileType size={14} className="text-red-500" />
                                                    Export as PDF
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <button onClick={handleClearMessages} className="hidden sm:block p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="Clear chat">
                                    <Trash2 size={14} />
                                </button>
                                <button onClick={() => setIsExpanded(!isExpanded)} className="hidden sm:block p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                                </button>
                                <button onClick={() => { setIsOpen(false); setIsExpanded(false); }} className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <ChevronDown size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="px-4 md:px-5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                            <div className="flex items-center w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 relative">
                                <button
                                    onClick={() => toggleMode('combined')}
                                    disabled={isProcessing}
                                    className={`relative flex-1 z-10 px-3 md:px-4 py-1.5 flex items-center justify-center gap-1.5 rounded-md text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50
                                        ${chatMode === 'combined' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Zap size={12} className={chatMode === 'combined' ? "text-amber-500" : "text-slate-400"} />
                                    Chat
                                    {chatMode === 'combined' && (
                                        <motion.div
                                            layoutId="modeBackground"
                                            className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-sm -z-10"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </button>
                                {/* 
                                <button
                                    onClick={() => toggleMode('general')}
                                    disabled={isProcessing}
                                    className={`relative flex-1 z-10 px-3 md:px-4 py-1.5 flex items-center justify-center gap-1.5 rounded-md text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50
                                        ${chatMode === 'general' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    General
                                    {chatMode === 'general' && (
                                        <motion.div
                                            layoutId="modeBackground"
                                            className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-sm -z-10"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => toggleMode('algorithmic')}
                                    disabled={isProcessing}
                                    className={`relative flex-1 z-10 px-3 md:px-4 py-1.5 flex items-center justify-center gap-1.5 rounded-md text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50
                                        ${chatMode === 'algorithmic' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Algo
                                    {chatMode === 'algorithmic' && (
                                        <motion.div
                                            layoutId="modeBackground"
                                            className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-sm -z-10"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </button>
                                */}
                            </div>
                            <div className="hidden sm:flex text-[10px] font-semibold text-slate-400 dark:text-slate-500 items-center gap-1.5">
                                {activeFolderId && activeFolderName && (
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-default" title="Active Folder">
                                        <FolderIcon size={10} className="text-emerald-500" />
                                        <span className="truncate max-w-[100px] text-slate-600 dark:text-slate-300">{activeFolderName}</span>
                                    </div>
                                )}
                                {activeFileId && activeFileName && (
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-default" title="Active File">
                                        <FileIcon size={10} className="text-emerald-500" />
                                        <span className="truncate max-w-[100px] text-slate-600 dark:text-slate-300">{activeFileName}</span>
                                    </div>
                                )}
                                {!activeFolderId && !activeFileId && selectedNodes.length > 0 && (
                                    <div className="flex items-center gap-1" title="Selected Nodes">
                                        <span className="text-amber-500">●</span> {selectedNodes.length} nodes
                                    </div>
                                )}
                                {!activeFolderId && !activeFileId && selectedNodes.length === 0 && (
                                    <div className="flex items-center gap-1" title="Full Database Scope">
                                        <span className="text-red-400">●</span> Full DB
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ═══ MAIN BODY (sidebar + chat) ═══ */}
                        <div className="flex flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900">
                            {/* Session History Sidebar */}
                            <AnimatePresence>
                                {showHistory && isExpanded && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 260, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="overflow-hidden flex-shrink-0"
                                    >
                                        <SessionHistorySidebar
                                            messages={allMessages}
                                            sessionFolders={
                                                chatMode === 'general' ? neuralStore.sessionFolders :
                                                chatMode === 'algorithmic' ? analyticStore.sessionFolders :
                                                combinedStore.sessionFolders
                                            }
                                            currentFolderId={activeFolderId}
                                            currentSessionId={currentSessionId}
                                            onSelectSession={(id) => {
                                                handleSelectSession(id);
                                                if (typeof window !== 'undefined' && window.innerWidth < 640) setShowHistory(false);
                                            }}
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
                                            <div className="h-full flex flex-col items-center justify-center text-center pt-10">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${chatMode === 'general' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
                                                    <ThemeIcon className={`w-7 h-7 ${chatMode === 'general' ? 'text-emerald-500' : 'text-indigo-500'}`} />
                                                </div>
                                                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                                                    {chatMode === 'general' ? 'Ready to Help' : chatMode === 'algorithmic' ? 'Ready to Analyze' : 'Ready to Chat'}
                                                </h4>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 max-w-[240px]">
                                                    Ask anything about your active folder's data.
                                                </p>

                                                {/* Question hint chips */}
                                                <div className="flex flex-wrap gap-2 justify-center max-w-[340px]">
                                                    {[
                                                        { icon: '🔍', text: 'Which items are connected to X?' },
                                                        { icon: '📊', text: 'What are the most linked nodes?' },
                                                        { icon: '🔗', text: 'Show me relationships between A and B' },
                                                        { icon: '🌐', text: 'Find clusters or groups in the data' },
                                                        { icon: '📋', text: 'List all entities of a type' },
                                                        { icon: '💡', text: 'What does [entity] connect to?' },
                                                    ].map((hint, hi) => (
                                                        <button
                                                            key={hi}
                                                            onClick={() => setInput(hint.text)}
                                                            className={`text-[11px] px-3 py-1.5 rounded-full border transition-all
                                                                bg-white dark:bg-slate-800
                                                                border-slate-200 dark:border-slate-700
                                                                text-slate-500 dark:text-slate-400
                                                                hover:border-indigo-300 dark:hover:border-indigo-600
                                                                hover:text-indigo-600 dark:hover:text-indigo-400
                                                                hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20
                                                                cursor-pointer select-none`}
                                                        >
                                                            {hint.icon} {hint.text}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {activeMessages.map((msg: any, i: number) => {
                                            if (msg.role === 'assistant' && !msg.content && !msg.algorithm && (!msg.results || msg.results.length === 0) && isProcessing) {
                                                return null;
                                            }
                                            return (
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
                                                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,

                                                                    ul: ({ node, ...props }) => <ul className="my-2 space-y-1" {...props} />,
                                                                    ol: ({ node, ...props }) => <ol className="my-2 space-y-1 list-decimal ml-4" {...props} />,
                                                                    li: ({ node, ...props }) => (
                                                                        <li className="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-[12px]">
                                                                            <span className={`mt-[5px] h-[5px] w-[5px] rounded-full flex-shrink-0 ${chatMode === 'general' ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                                                                            <span className="flex-1 leading-snug">{props.children}</span>
                                                                        </li>
                                                                    ),

                                                                    strong: ({ node, ...props }) => <strong className={`font-semibold ${chatMode === 'general' ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} {...props} />,
                                                                    em: ({ node, ...props }) => <em className="italic text-slate-500 dark:text-slate-400" {...props} />,

                                                                    code: ({ node, ...props }) => <code className="bg-slate-100 dark:bg-slate-700/70 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[11px] font-mono" {...props} />,
                                                                    pre: ({ node, ...props }) => <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 my-3 overflow-x-auto text-[11px] font-mono leading-relaxed" {...props} />,

                                                                    h1: ({ node, ...props }) => <h1 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-700" {...props} />,
                                                                    h2: ({ node, ...props }) => <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 mt-3 mb-1.5" {...props} />,
                                                                    h3: ({ node, ...props }) => <h3 className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mt-2 mb-1 uppercase tracking-wide" {...props} />,

                                                                    blockquote: ({ node, ...props }) => (
                                                                        <blockquote className={`border-l-2 pl-3 my-2 italic text-slate-500 dark:text-slate-400 text-[12px] ${chatMode === 'general' ? 'border-emerald-400' : 'border-indigo-400'}`} {...props} />
                                                                    ),

                                                                    // ── Table: premium striped design ──
                                                                    table: ({ node, ...props }) => (
                                                                        <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                            <table className="min-w-full text-[12px]" {...props} />
                                                                        </div>
                                                                    ),
                                                                    thead: ({ node, ...props }) => (
                                                                        <thead className={`${chatMode === 'general' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'}`} {...props} />
                                                                    ),
                                                                    th: ({ node, ...props }) => (
                                                                        <th className={`px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${chatMode === 'general' ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-400'}`} {...props} />
                                                                    ),
                                                                    tbody: ({ node, ...props }) => (
                                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800" {...props} />
                                                                    ),
                                                                    tr: ({ node, ...props }) => (
                                                                        <tr className="even:bg-slate-50/60 dark:even:bg-slate-800/30 hover:bg-slate-100/70 dark:hover:bg-slate-700/30 transition-colors duration-100" {...props} />
                                                                    ),
                                                                    td: ({ node, ...props }) => (
                                                                        <td className="px-3 py-2 text-[12px] text-slate-700 dark:text-slate-300 align-top max-w-[260px]" {...props} />
                                                                    ),

                                                                    hr: () => <hr className="my-3 border-slate-200 dark:border-slate-700" />,
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

                                                    {/* Algorithm collapsible bar — only when GDS was used AND message has content */}
                                                    {msg.role === 'assistant' && msg.content && (msg.algorithm || msg.intent?.use_gds) && (() => {
                                                        const algoName: string = msg.algorithm || msg.intent?.gds_algo || 'graph-analysis';
                                                        const algoKey = msg.id || String(i);
                                                        const isOpen = expandedAlgo === algoKey;

                                                        const ALGO_INFO: Record<string, { label: string; summary: string }> = {
                                                            centrality: {
                                                                label: 'Centrality Analysis',
                                                                summary: 'Ranks nodes by how many connections they have across the graph. Highly central nodes are the most influential or frequently referenced entities in your data.',
                                                            },
                                                            pagerank: {
                                                                label: 'PageRank Analysis',
                                                                summary: 'Measures node importance based on the quality and quantity of links. Nodes linked by many other important nodes score higher — like Google\'s original web ranking.',
                                                            },
                                                            articlerank: {
                                                                label: 'ArticleRank Analysis',
                                                                summary: 'An improved PageRank variant that reduces bias from low-degree nodes. Better for graphs with diverse connection patterns.',
                                                            },
                                                            betweenness: {
                                                                label: 'Betweenness Centrality',
                                                                summary: 'Identifies bridge nodes that connect different parts of the graph. High betweenness means the node is a critical bottleneck or gateway.',
                                                            },
                                                            closeness: {
                                                                label: 'Closeness Centrality',
                                                                summary: 'Finds nodes closest to all others in the graph. High closeness means the node can reach every other node quickly.',
                                                            },
                                                            degree: {
                                                                label: 'Degree Centrality',
                                                                summary: 'Counts the direct connections per node. The simplest centrality measure — more connections means higher degree.',
                                                            },
                                                            hits: {
                                                                label: 'HITS Analysis',
                                                                summary: 'Identifies hub nodes (link to many) and authority nodes (linked by many). Reveals the dual nature of node importance.',
                                                            },
                                                            community: {
                                                                label: 'Community Detection',
                                                                summary: 'Groups nodes into clusters based on how densely they connect with each other. Reveals natural groupings or categories hidden in your data.',
                                                            },
                                                            louvain: {
                                                                label: 'Louvain Community Detection',
                                                                summary: 'Discovers tightly connected communities using modularity optimization. Reveals hidden groups in your knowledge graph.',
                                                            },
                                                            leiden: {
                                                                label: 'Leiden Community Detection',
                                                                summary: 'An improved community detection over Louvain with guaranteed well-connected communities.',
                                                            },
                                                            similarity: {
                                                                label: 'Similarity Search',
                                                                summary: 'Finds nodes that share similar connectivity patterns using Jaccard Similarity. Two nodes are similar if they connect to many of the same entities.',
                                                            },
                                                            paths: {
                                                                label: 'Path Analysis',
                                                                summary: 'Traces the shortest or most relevant paths between entities. Reveals indirect connections and how far apart two concepts are in your knowledge graph.',
                                                            },
                                                        };

                                                        const info = ALGO_INFO[algoName] ?? {
                                                            label: algoName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                                                            summary: 'A graph algorithm was applied to analyse structural patterns in your data and enrich the answer.',
                                                        };

                                                        return (
                                                            <div className="mt-1 rounded-xl border border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
                                                                <button
                                                                    onClick={() => setExpandedAlgo(isOpen ? null : algoKey)}
                                                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-indigo-50/60 dark:bg-indigo-900/20 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <Zap size={11} className="text-indigo-500 flex-shrink-0" />
                                                                        <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">{info.label}</span>
                                                                        <span className="text-[10px] text-indigo-400 dark:text-indigo-500">used</span>
                                                                    </div>
                                                                    <ChevronDown size={12} className={`text-indigo-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                                                </button>
                                                                <AnimatePresence>
                                                                    {isOpen && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            className="overflow-hidden"
                                                                        >
                                                                            <p className="px-3 py-2.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900">
                                                                                {info.summary}
                                                                            </p>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Result chips (Combined or Algorithmic mode) — only after content has arrived */}
                                                    {msg.content && msg.results?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {(expandedResults.has(msg.id) ? msg.results : msg.results.slice(0, 8)).map((res: any, ri: number) => {
                                                                const isSimilarity = !!(res.source_name && res.target_name);
                                                                const displayName = isSimilarity
                                                                    ? `${res.source_name} ↔ ${res.target_name}`
                                                                    : (res.name || res.id || "Unknown");

                                                                return (
                                                                    <button
                                                                        key={ri}
                                                                        onClick={() => {
                                                                            if (res.id) storeZoomToNode(res.id);
                                                                            else if (res.source_id) storeZoomToNode(res.source_id);
                                                                        }}
                                                                        className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[200px] hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                                                    >
                                                                        {displayName}
                                                                    </button>
                                                                );
                                                            })}
                                                            {msg.results.length > 8 && (
                                                                <button
                                                                    onClick={() => toggleResultExpansion(msg.id)}
                                                                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline py-0.5"
                                                                >
                                                                    {expandedResults.has(msg.id) ? "Show less" : `+${msg.results.length - 8} more`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* 🌐 Web Search Integration */}
                                                    {msg.role === 'assistant' && chatMode === 'combined' && (
                                                        <div className="mt-2 space-y-3 w-full">
                                                            {/* Web Search Button */}
                                                            {!msg.webSearchAnswer && (
                                                                <button
                                                                    onClick={() => {
                                                                        const userMsg = activeMessages[i-1];
                                                                        handleWebSearch(msg.id, userMsg?.content || "", msg.content);
                                                                    }}
                                                                    disabled={msg.webSearchPending}
                                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all
                                                                        ${msg.webSearchEmphasized 
                                                                            ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 animate-pulse' 
                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                                        } disabled:opacity-50 disabled:animate-none`}
                                                                >
                                                                    {msg.webSearchPending ? (
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                    ) : (
                                                                        <Globe size={12} />
                                                                    )}
                                                                    {msg.webSearchPending ? 'Searching the Web...' : 'Search the Web'}
                                                                </button>
                                                            )}

                                                            {/* Web Search Results Display */}
                                                            {msg.webSearchAnswer && (
                                                                <motion.div 
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 space-y-3"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                                                            <Globe size={14} />
                                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Web Insights</span>
                                                                        </div>
                                                                        <span className="text-[9px] font-bold text-blue-400 dark:text-blue-600 uppercase tracking-widest bg-blue-100/50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">Grounded</span>
                                                                    </div>
                                                                    
                                                                    <div className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                            {msg.webSearchAnswer}
                                                                        </ReactMarkdown>
                                                                    </div>

                                                                    {msg.webSearchSources && msg.webSearchSources.length > 0 && (
                                                                        <div className="pt-2 border-t border-blue-100/50 dark:border-blue-900/20">
                                                                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Sources</p>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {msg.webSearchSources.map((source: any, si: number) => (
                                                                                    <a 
                                                                                        key={si}
                                                                                        href={source.uri}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] text-blue-600 dark:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm"
                                                                                    >
                                                                                        <span className="truncate max-w-[150px] font-medium">{source.title || 'Source'}</span>
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            )}
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
                                        )})}

                                        {/* Processing indicator (only while truly thinking, hiding once streaming starts) */}
                                        {isProcessing && (!activeMessages.length || activeMessages[activeMessages.length - 1]?.role !== 'assistant' || !activeMessages[activeMessages.length - 1]?.content) && (
                                            <div className="flex gap-3">
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${chatMode === 'general' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                                                    <Loader2 size={14} className="animate-spin" />
                                                </div>
                                                <div className="space-y-2 max-w-[85%]">
                                                    {/* Typing bubble */}
                                                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[11px] font-bold uppercase tracking-widest ${chatMode === 'general' ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                                                Thinking...
                                                            </span>
                                                            {/* Typing cursor animation */}
                                                            <span className="inline-flex gap-[3px]">
                                                                <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${chatMode === 'general' ? 'bg-emerald-400' : 'bg-indigo-400'}`} style={{ animationDelay: '0ms' }} />
                                                                <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${chatMode === 'general' ? 'bg-emerald-400' : 'bg-indigo-400'}`} style={{ animationDelay: '150ms' }} />
                                                                <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${chatMode === 'general' ? 'bg-emerald-400' : 'bg-indigo-400'}`} style={{ animationDelay: '300ms' }} />
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Step progress pills (Only show for general mode) */}
                                                    {chatMode === 'general' && (neuralStore.currentStep > 0) && (
                                                        <div className="flex flex-wrap gap-1.5 pl-1">
                                                            {REASONING_STEPS.slice(0, neuralStore.currentStep).map((step, idx) => {
                                                                const isActive = idx === neuralStore.currentStep - 1;
                                                                const StepIcon = step.icon;
                                                                return (
                                                                    <span key={idx} className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all duration-300 ${isActive
                                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                                                        : 'text-slate-400 dark:text-slate-600 bg-slate-100/50 dark:bg-slate-800/50'}`}>
                                                                        <StepIcon size={9} />
                                                                        {step.name}
                                                                    </span>
                                                                );
                                                            })}
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
