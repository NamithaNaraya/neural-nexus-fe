/**
 * Graph Filters
 * 
 * Filter panel for controlling visible nodes and links.
 * Features:
 * - Filter by node type
 * - Filter by relationship type
 * - Minimum degree filter
 * - Show/hide orphan nodes
 */
'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { NODE_TYPE_COLORS, RELATIONSHIP_COLORS } from '../types';
import { X, Circle, ArrowRight, Filter, RotateCcw, Search, CheckSquare, Square } from 'lucide-react';

interface GraphFiltersProps {
    onClose: () => void;
}

export function GraphFilters({ onClose }: GraphFiltersProps) {
    const {
        nodeTypes,
        linkTypes,
        filters,
        setFilters,
        resetFilters,
    } = useGraphStore();
    const [nodeSearch, setNodeSearch] = React.useState('');
    const [linkSearch, setLinkSearch] = React.useState('');

    // Toggle node type filter
    const toggleNodeType = useCallback((type: string) => {
        const current = filters.nodeTypes.filter(t => t !== '__NONE__');
        let updated;

        if (filters.nodeTypes.length === 0) {
            // Case 1: Switching from "Show All" to "Show All except one"
            updated = nodeTypes.filter(t => t !== type);
        } else {
            // Case 2: Standard toggle
            updated = current.includes(type)
                ? current.filter(t => t !== type)
                : [...current, type];
        }

        if (updated.length === 0) {
            setFilters({ nodeTypes: ['__NONE__'] });
        } else if (updated.length === nodeTypes.length) {
            setFilters({ nodeTypes: [] }); // Reset to empty for "Show All" performance
        } else {
            setFilters({ nodeTypes: updated });
        }
    }, [filters.nodeTypes, nodeTypes, setFilters]);

    // Toggle relationship type filter
    const toggleRelationshipType = useCallback((type: string) => {
        const current = filters.relationshipTypes.filter(t => t !== '__NONE__');
        let updated;

        if (filters.relationshipTypes.length === 0) {
            updated = linkTypes.filter(t => t !== type);
        } else {
            updated = current.includes(type)
                ? current.filter(t => t !== type)
                : [...current, type];
        }

        if (updated.length === 0) {
            setFilters({ relationshipTypes: ['__NONE__'] });
        } else if (updated.length === linkTypes.length) {
            setFilters({ relationshipTypes: [] });
        } else {
            setFilters({ relationshipTypes: updated });
        }
    }, [filters.relationshipTypes, linkTypes, setFilters]);

    // Handle minimum degree change
    const handleMinDegreeChange = useCallback((value: number) => {
        setFilters({ minDegree: value });
    }, [setFilters]);

    // Toggle show orphans
    const toggleShowOrphans = useCallback(() => {
        setFilters({ showOrphans: !filters.showOrphans });
    }, [filters.showOrphans, setFilters]);

    // Bulk select handlers
    const selectAllNodeTypes = useCallback(() => {
        if (nodeSearch) {
            const current = filters.nodeTypes.length === 0 ? nodeTypes : filters.nodeTypes.filter(t => t !== '__NONE__');
            const visible = nodeTypes.filter((t: string) => t.toLowerCase().includes(nodeSearch.toLowerCase()));
            const toAdd = visible.filter(t => !current.includes(t));
            const updated = [...current, ...toAdd];
            setFilters({ nodeTypes: updated.length === nodeTypes.length ? [] : updated });
        } else {
            setFilters({ nodeTypes: [] });
        }
    }, [nodeSearch, nodeTypes, filters.nodeTypes, setFilters]);

    const deselectAllNodeTypes = useCallback(() => {
        if (nodeSearch) {
            const current = filters.nodeTypes.length === 0 ? nodeTypes : filters.nodeTypes.filter(t => t !== '__NONE__');
            const visible = nodeTypes.filter((t: string) => t.toLowerCase().includes(nodeSearch.toLowerCase()));
            const updated = current.filter(t => !visible.includes(t));
            setFilters({ nodeTypes: updated.length === 0 ? ['__NONE__'] : updated });
        } else {
            setFilters({ nodeTypes: ['__NONE__'] });
        }
    }, [nodeSearch, nodeTypes, filters.nodeTypes, setFilters]);

    const selectAllRelTypes = useCallback(() => {
        if (linkSearch) {
            const current = filters.relationshipTypes.length === 0 ? linkTypes : filters.relationshipTypes.filter(t => t !== '__NONE__');
            const visible = linkTypes.filter((t: string) => t.toLowerCase().includes(linkSearch.toLowerCase()));
            const toAdd = visible.filter(t => !current.includes(t));
            const updated = [...current, ...toAdd];
            setFilters({ relationshipTypes: updated.length === linkTypes.length ? [] : updated });
        } else {
            setFilters({ relationshipTypes: [] });
        }
    }, [linkSearch, linkTypes, filters.relationshipTypes, setFilters]);

    const deselectAllRelTypes = useCallback(() => {
        if (linkSearch) {
            const current = filters.relationshipTypes.length === 0 ? linkTypes : filters.relationshipTypes.filter(t => t !== '__NONE__');
            const visible = linkTypes.filter((t: string) => t.toLowerCase().includes(linkSearch.toLowerCase()));
            const updated = current.filter(t => !visible.includes(t));
            setFilters({ relationshipTypes: updated.length === 0 ? ['__NONE__'] : updated });
        } else {
            setFilters({ relationshipTypes: ['__NONE__'] });
        }
    }, [linkSearch, linkTypes, filters.relationshipTypes, setFilters]);

    const filteredNodeTypes = nodeTypes.filter((t: string) => t.toLowerCase().includes(nodeSearch.toLowerCase()));
    const filteredLinkTypes = linkTypes.filter((t: string) => t.toLowerCase().includes(linkSearch.toLowerCase()));

    return (
        <div
            className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden flex flex-col h-full"
        >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-emerald" />
                    <h3 className="font-semibold text-foreground">Filters</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={resetFilters}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        title="Reset Filters"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Node Types */}
                <div className="pt-2">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Node Types
                        </h4>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={selectAllNodeTypes}
                                className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                                Select All
                            </button>
                            <span className="w-px h-2.5 bg-border/50" />
                            <button
                                onClick={deselectAllNodeTypes}
                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>

                    <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search types..."
                            value={nodeSearch}
                            onChange={(e) => setNodeSearch(e.target.value)}
                            className="w-full bg-muted/50 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {filteredNodeTypes.length > 0 ? (
                            filteredNodeTypes.map(type => (
                                <FilterCheckbox
                                    key={type}
                                    label={type}
                                    checked={filters.nodeTypes.length === 0 || filters.nodeTypes.includes(type)}
                                    onChange={() => toggleNodeType(type)}
                                    color={NODE_TYPE_COLORS[type] || NODE_TYPE_COLORS.default}
                                />
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No types found</p>
                        )}
                    </div>
                </div>

                {/* Relationship Types */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Relationship Types
                        </h4>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={selectAllRelTypes}
                                className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                                Select All
                            </button>
                            <span className="w-px h-2.5 bg-border/50" />
                            <button
                                onClick={deselectAllRelTypes}
                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>

                    <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search types..."
                            value={linkSearch}
                            onChange={(e) => setLinkSearch(e.target.value)}
                            className="w-full bg-muted/50 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {filteredLinkTypes.length > 0 ? (
                            filteredLinkTypes.map(type => (
                                <FilterCheckbox
                                    key={type}
                                    label={type.replace(/_/g, ' ')}
                                    checked={filters.relationshipTypes.length === 0 || filters.relationshipTypes.includes(type)}
                                    onChange={() => toggleRelationshipType(type)}
                                    color={RELATIONSHIP_COLORS[type] || RELATIONSHIP_COLORS.default}
                                    icon={<ArrowRight className="w-3 h-3" />}
                                />
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No types found</p>
                        )}
                    </div>
                </div>

                {/* Minimum Degree */}
                <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Minimum Connections
                    </h4>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min={0}
                            max={10}
                            value={filters.minDegree}
                            onChange={(e) => handleMinDegreeChange(Number(e.target.value))}
                            className="flex-1 accent-emerald"
                        />
                        <span className="text-sm font-medium text-foreground w-8 text-center">
                            {filters.minDegree}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Hide nodes with fewer than {filters.minDegree} connections
                    </p>
                </div>

                {/* Show Orphans */}
                <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Display Options
                    </h4>
                    <FilterCheckbox
                        label="Show isolated nodes"
                        checked={filters.showOrphans}
                        onChange={toggleShowOrphans}
                        color="#6B7280"
                    />
                </div>
            </div>
        </div >
    );
}

// Filter Checkbox Component
interface FilterCheckboxProps {
    label: string;
    checked: boolean;
    onChange: () => void;
    color: string;
    icon?: React.ReactNode;
}

function FilterCheckbox({ label, checked, onChange, color, icon }: FilterCheckboxProps) {
    return (
        <label className="flex items-center gap-3 cursor-pointer group">
            <div
                className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                    ${checked
                        ? 'border-transparent'
                        : 'border-muted-foreground/30'
                    }
                `}
                style={{
                    backgroundColor: checked ? color : 'transparent',
                }}
            >
                {checked && (
                    <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                )}
            </div>
            <div className="flex items-center gap-2 flex-1">
                {icon && (
                    <span style={{ color }} className="opacity-60">
                        {icon}
                    </span>
                )}
                <span className="text-sm text-foreground group-hover:text-foreground/80 transition-colors">
                    {label}
                </span>
            </div>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="sr-only"
            />
        </label>
    );
}
