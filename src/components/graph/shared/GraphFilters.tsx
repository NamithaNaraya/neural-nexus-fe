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
import { X, Circle, ArrowRight, Filter, RotateCcw } from 'lucide-react';

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

    // Toggle node type filter
    const toggleNodeType = useCallback((type: string) => {
        const current = filters.nodeTypes;
        const updated = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        setFilters({ nodeTypes: updated });
    }, [filters.nodeTypes, setFilters]);

    // Toggle relationship type filter
    const toggleRelationshipType = useCallback((type: string) => {
        const current = filters.relationshipTypes;
        const updated = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        setFilters({ relationshipTypes: updated });
    }, [filters.relationshipTypes, setFilters]);

    // Handle minimum degree change
    const handleMinDegreeChange = useCallback((value: number) => {
        setFilters({ minDegree: value });
    }, [setFilters]);

    // Toggle show orphans
    const toggleShowOrphans = useCallback(() => {
        setFilters({ showOrphans: !filters.showOrphans });
    }, [filters.showOrphans, setFilters]);

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
                <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Node Types
                    </h4>
                    <div className="space-y-2">
                        {nodeTypes.length > 0 ? (
                            nodeTypes.map(type => (
                                <FilterCheckbox
                                    key={type}
                                    label={type}
                                    checked={filters.nodeTypes.length === 0 || filters.nodeTypes.includes(type)}
                                    onChange={() => toggleNodeType(type)}
                                    color={NODE_TYPE_COLORS[type] || NODE_TYPE_COLORS.default}
                                />
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No node types available</p>
                        )}
                    </div>
                </div>

                {/* Relationship Types */}
                <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Relationship Types
                    </h4>
                    <div className="space-y-2">
                        {linkTypes.length > 0 ? (
                            linkTypes.map(type => (
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
                            <p className="text-sm text-muted-foreground">No relationship types available</p>
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
        </div>
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
