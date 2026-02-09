/**
 * Entity Type Filter Component
 * 
 * Multi-select dropdown for filtering by entity types.
 * Fetches available types from database dynamically.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, X, Filter, Loader2 } from 'lucide-react';
import { graphApi } from '@/lib/api';

interface EntityTypeFilterProps {
    selectedTypes: string[];
    onSelectionChange: (types: string[]) => void;
    label?: string;
    placeholder?: string;
    className?: string;
}

export function EntityTypeFilter({
    selectedTypes,
    onSelectionChange,
    label = 'Entity Types',
    placeholder = 'All types (no filter)',
    className = '',
}: EntityTypeFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch available types from backend
    useEffect(() => {
        const fetchTypes = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await graphApi.getNodeTypes();
                setAvailableTypes(result.types || []);
            } catch (err) {
                setError('Failed to load entity types');
                console.error('Failed to fetch entity types:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTypes();
    }, []);

    const toggleType = useCallback((type: string) => {
        if (selectedTypes.includes(type)) {
            onSelectionChange(selectedTypes.filter(t => t !== type));
        } else {
            onSelectionChange([...selectedTypes, type]);
        }
    }, [selectedTypes, onSelectionChange]);

    const clearSelection = useCallback(() => {
        onSelectionChange([]);
    }, [onSelectionChange]);

    const selectAll = useCallback(() => {
        onSelectionChange([...availableTypes]);
    }, [availableTypes, onSelectionChange]);

    return (
        <div className={`relative ${className}`}>
            {/* Label */}
            {label && (
                <label className="block text-sm font-medium text-foreground mb-2">
                    <Filter className="w-4 h-4 inline mr-2" />
                    {label}
                </label>
            )}

            {/* Dropdown Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground hover:border-primary/50 transition-colors"
            >
                <span className={selectedTypes.length === 0 ? 'text-muted-foreground' : ''}>
                    {selectedTypes.length === 0
                        ? placeholder
                        : `${selectedTypes.length} type${selectedTypes.length > 1 ? 's' : ''} selected`
                    }
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Selected Tags */}
            {selectedTypes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedTypes.map(type => (
                        <span
                            key={type}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium"
                        >
                            {type}
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleType(type); }}
                                className="hover:bg-primary/20 rounded p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    <button
                        onClick={clearSelection}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute z-50 w-full mt-2 rounded-xl bg-card border border-border shadow-lg overflow-hidden"
                    >
                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div className="p-3 text-sm text-destructive">{error}</div>
                        )}

                        {/* Types List */}
                        {!isLoading && !error && (
                            <>
                                {/* Quick Actions */}
                                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                                    <button
                                        onClick={selectAll}
                                        className="text-xs text-primary hover:text-primary/80"
                                    >
                                        Select all
                                    </button>
                                    <button
                                        onClick={clearSelection}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {/* Type Options */}
                                <div className="max-h-48 overflow-y-auto">
                                    {availableTypes.length === 0 ? (
                                        <div className="p-3 text-sm text-muted-foreground text-center">
                                            No entity types found in database
                                        </div>
                                    ) : (
                                        availableTypes.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => toggleType(type)}
                                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center
                                                    ${selectedTypes.includes(type)
                                                        ? 'bg-primary border-primary'
                                                        : 'border-border'
                                                    }`}
                                                >
                                                    {selectedTypes.includes(type) && (
                                                        <Check className="w-3 h-3 text-primary-foreground" />
                                                    )}
                                                </div>
                                                <span className="text-sm">{type}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop to close dropdown */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
