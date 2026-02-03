/**
 * Blind Spots Panel
 * 
 * Displays predicted missing relationships (Ghost Lines).
 * Shows hidden connections that should exist based on graph structure.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye,
    EyeOff,
    Sparkles,
    Link2,
    ArrowRight,
    Loader2,
    RefreshCw,
    Filter,
    ChevronDown,
    AlertCircle,
    X,
    Zap,
} from 'lucide-react';
import { docAiApi } from '@/lib/api';

interface GhostLine {
    source_id: string;
    source_name: string;
    target_id: string;
    target_name: string;
    confidence: number;
    predicted_type: string;
    reason: string;
    method: string;
}

interface BlindSpotsPanelProps {
    folderId: string;
    isOpen: boolean;
    onClose: () => void;
    onShowGhostLine?: (line: GhostLine) => void;
    onHideGhostLine?: (line: GhostLine) => void;
}

const METHODS = [
    { value: 'structural', label: 'Combined Analysis', icon: Sparkles },
    { value: 'common_neighbors', label: 'Common Neighbors', icon: Link2 },
    { value: 'adamic_adar', label: 'Adamic-Adar', icon: Zap },
    { value: 'jaccard', label: 'Jaccard Coefficient', icon: Filter },
];

export function BlindSpotsPanel({
    folderId,
    isOpen,
    onClose,
    onShowGhostLine,
    onHideGhostLine,
}: BlindSpotsPanelProps) {
    const [ghostLines, setGhostLines] = useState<GhostLine[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [method, setMethod] = useState('structural');
    const [minConfidence, setMinConfidence] = useState(0.5);
    const [visibleLines, setVisibleLines] = useState<Set<string>>(new Set());
    const [byCategory, setByCategory] = useState<Record<string, GhostLine[]>>({});

    // Fetch ghost lines
    const fetchGhostLines = useCallback(async () => {
        if (!folderId) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await docAiApi.graph.discoverBlindSpots(folderId, {
                method,
                min_confidence: minConfidence,
                limit: 50,
            }) as {
                error?: string;
                ghost_lines?: GhostLine[];
                by_category?: Record<string, GhostLine[]>;
            };

            if (response.error) {
                setError(response.error);
            } else {
                setGhostLines(response.ghost_lines || []);
                setByCategory(response.by_category || {});
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Discovery failed');
        } finally {
            setIsLoading(false);
        }
    }, [folderId, method, minConfidence]);


    // Initial fetch
    useEffect(() => {
        if (isOpen && folderId) {
            fetchGhostLines();
        }
    }, [isOpen, folderId, fetchGhostLines]);

    // Toggle ghost line visibility
    const toggleLine = useCallback(
        (line: GhostLine) => {
            const key = `${line.source_id}-${line.target_id}`;
            setVisibleLines((prev) => {
                const next = new Set(prev);
                if (next.has(key)) {
                    next.delete(key);
                    onHideGhostLine?.(line);
                } else {
                    next.add(key);
                    onShowGhostLine?.(line);
                }
                return next;
            });
        },
        [onShowGhostLine, onHideGhostLine]
    );

    // Show/hide all
    const showAll = useCallback(() => {
        const allKeys = new Set(
            ghostLines.map((l) => `${l.source_id}-${l.target_id}`)
        );
        setVisibleLines(allKeys);
        ghostLines.forEach((line) => onShowGhostLine?.(line));
    }, [ghostLines, onShowGhostLine]);

    const hideAll = useCallback(() => {
        ghostLines.forEach((line) => onHideGhostLine?.(line));
        setVisibleLines(new Set());
    }, [ghostLines, onHideGhostLine]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            className="absolute right-4 top-20 bottom-4 w-80 bg-card/95 backdrop-blur-xl rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col z-30"
        >
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-500/10 rounded-lg">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                        </div>
                        <h3 className="font-semibold text-foreground">Blind Spots</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Predicted missing relationships based on graph structure
                </p>
            </div>

            {/* Controls */}
            <div className="p-3 border-b border-border space-y-3">
                {/* Method selector */}
                <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                        Discovery Method
                    </label>
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="w-full p-2 bg-muted rounded-lg text-sm border border-border"
                    >
                        {METHODS.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Confidence slider */}
                <div>
                    <label className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Min Confidence</span>
                        <span>{(minConfidence * 100).toFixed(0)}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={minConfidence}
                        onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                        className="w-full accent-purple-500"
                    />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={fetchGhostLines}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-500/10 text-purple-500 rounded-lg text-sm font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Discover
                    </button>
                    <button
                        onClick={showAll}
                        disabled={ghostLines.length === 0}
                        className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                        title="Show all ghost lines"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={hideAll}
                        disabled={visibleLines.size === 0}
                        className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                        title="Hide all ghost lines"
                    >
                        <EyeOff className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-3" />
                        <p className="text-sm">Analyzing graph structure...</p>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                )}

                {!isLoading && !error && ghostLines.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Sparkles className="w-10 h-10 mb-3 opacity-50" />
                        <p className="text-sm text-center">
                            No blind spots detected.
                            <br />
                            Your graph looks complete!
                        </p>
                    </div>
                )}

                {!isLoading && ghostLines.length > 0 && (
                    <>
                        <div className="text-xs text-muted-foreground mb-2">
                            Found {ghostLines.length} potential missing connections
                        </div>

                        {ghostLines.map((line) => {
                            const key = `${line.source_id}-${line.target_id}`;
                            const isVisible = visibleLines.has(key);

                            return (
                                <GhostLineCard
                                    key={key}
                                    line={line}
                                    isVisible={isVisible}
                                    onToggle={() => toggleLine(line)}
                                />
                            );
                        })}
                    </>
                )}
            </div>

            {/* Footer Stats */}
            {ghostLines.length > 0 && (
                <div className="p-3 border-t border-border bg-muted/30">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                            Showing: {visibleLines.size} / {ghostLines.length}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-purple-500/50" />
                            Ghost Lines
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// Ghost Line Card Component
function GhostLineCard({
    line,
    isVisible,
    onToggle,
}: {
    line: GhostLine;
    isVisible: boolean;
    onToggle: () => void;
}) {
    const confidenceColor =
        line.confidence >= 0.8
            ? 'text-green-500'
            : line.confidence >= 0.6
                ? 'text-yellow-500'
                : 'text-muted-foreground';

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                p-3 rounded-lg border transition-all cursor-pointer
                ${isVisible
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-muted/30 border-border hover:bg-muted/50'
                }
            `}
            onClick={onToggle}
        >
            {/* Connection */}
            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium truncate max-w-[100px]">
                    {line.source_name}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate max-w-[100px]">
                    {line.target_name}
                </span>
            </div>

            {/* Details */}
            <div className="flex items-center justify-between text-xs">
                <span className="px-1.5 py-0.5 bg-background rounded text-muted-foreground">
                    {line.predicted_type}
                </span>
                <span className={`font-medium ${confidenceColor}`}>
                    {(line.confidence * 100).toFixed(0)}% likely
                </span>
            </div>

            {/* Reason */}
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                {line.reason}
            </p>

            {/* Visibility indicator */}
            <div className="flex items-center justify-end mt-2">
                {isVisible ? (
                    <span className="flex items-center gap-1 text-xs text-purple-500">
                        <Eye className="w-3 h-3" />
                        Visible
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <EyeOff className="w-3 h-3" />
                        Hidden
                    </span>
                )}
            </div>
        </motion.div>
    );
}
