/**
 * Graph Search
 * 
 * Search bar for finding nodes in the graph.
 * Features:
 * - Real-time search with debounce
 * - Result dropdown with keyboard navigation
 * - Click to select and zoom to node
 */
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { NODE_TYPE_COLORS } from '../types';
import { Search, X, Circle, ArrowRight } from 'lucide-react';

export function GraphSearch() {
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        searchQuery,
        searchResults,
        setSearchQuery,
        selectNode,
        addToDiscovery,
    } = useGraphStore();

    // Reset selected index when results change
    useEffect(() => {
        setSelectedIndex(-1);
    }, [searchResults]);

    // Handle input change
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, [setSearchQuery]);

    // Handle clear
    const handleClear = useCallback(() => {
        setSearchQuery('');
        inputRef.current?.focus();
    }, [setSearchQuery]);

    // Handle result selection
    const handleSelect = useCallback((nodeId: string) => {
        addToDiscovery(nodeId);
        selectNode(nodeId);
        setSearchQuery('');
        setIsFocused(false);
        inputRef.current?.blur();
    }, [selectNode, setSearchQuery, addToDiscovery]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < searchResults.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                if (selectedIndex >= 0 && searchResults[selectedIndex]) {
                    handleSelect(searchResults[selectedIndex].id);
                }
                break;
            case 'Escape':
                setIsFocused(false);
                inputRef.current?.blur();
                break;
        }
    }, [searchResults, selectedIndex, handleSelect]);

    const showResults = isFocused && searchQuery.length > 0;

    return (
        <div className="relative">
            {/* Search Input */}
            <div className={`
                relative flex items-center bg-card/80 backdrop-blur-md border rounded-lg
                transition-all duration-200
                ${isFocused ? 'border-emerald shadow-lg shadow-emerald/10' : 'border-border'}
            `}>
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search nodes..."
                    className="w-full py-2.5 pl-10 pr-8 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
                />
                {searchQuery && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2 p-1 rounded-md hover:bg-muted transition-colors"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            <AnimatePresence>
                {showResults && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50"
                    >
                        {searchResults.length > 0 ? (
                            <div className="max-h-64 overflow-y-auto">
                                {searchResults.map((node, index) => (
                                    <SearchResultItem
                                        key={node.id}
                                        node={node}
                                        isSelected={index === selectedIndex}
                                        onClick={() => handleSelect(node.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No nodes found for "{searchQuery}"
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Search Result Item
interface SearchResultItemProps {
    node: {
        id: string;
        name: string;
        type: string;
        description?: string;
    };
    isSelected: boolean;
    onClick: () => void;
}

function SearchResultItem({ node, isSelected, onClick }: SearchResultItemProps) {
    const color = useGraphStore.getState().filters.customNodeTypeColors[node.type] || NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;

    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 p-3 text-left transition-colors
                ${isSelected ? 'bg-emerald/10' : 'hover:bg-muted/50'}
            `}
        >
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}20` }}
            >
                <Circle className="w-3 h-3" fill={color} stroke={color} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                    {node.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                    {node.type}
                    {node.description && ` • ${node.description}`}
                </p>
            </div>
            <ArrowRight className={`w-4 h-4 text-muted-foreground transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
        </button>
    );
}
