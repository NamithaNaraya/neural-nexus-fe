/**
 * Chart Container
 * 
 * Wrapper component for all visualizations.
 * Provides consistent styling, loading states, and error handling.
 */
'use client';

import React, { ReactNode, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, Maximize2, Minimize2 } from 'lucide-react';

interface ChartContainerProps {
    title?: string;
    description?: string;
    loading?: boolean;
    error?: string | null;
    children: ReactNode;
    className?: string;
    expandable?: boolean;
    onExpand?: () => void;
    expanded?: boolean;
}

// Export ChartProps as an alias for use by chart components
export type ChartProps = Omit<ChartContainerProps, 'children'>;

export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
    function ChartContainer(
        {
            title,
            description,
            loading = false,
            error = null,
            children,
            className = '',
            expandable = false,
            onExpand,
            expanded = false,
        },
        ref
    ) {
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                    relative flex flex-col rounded-xl border border-border bg-card overflow-hidden
                    ${expanded ? 'fixed inset-4 z-50' : ''}
                    ${className}
                `}
            >
                {/* Backdrop for expanded mode */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10"
                            onClick={onExpand}
                        />
                    )}
                </AnimatePresence>

                {/* Header */}
                {(title || expandable) && (
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div>
                            {title && (
                                <h3 className="font-semibold text-foreground">{title}</h3>
                            )}
                            {description && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {description}
                                </p>
                            )}
                        </div>
                        {expandable && (
                            <button
                                onClick={onExpand}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                title={expanded ? 'Minimize' : 'Maximize'}
                            >
                                {expanded ? (
                                    <Minimize2 className="w-4 h-4" />
                                ) : (
                                    <Maximize2 className="w-4 h-4" />
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 relative min-h-0">
                    {/* Loading Overlay */}
                    <AnimatePresence>
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-10"
                            >
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald" />
                                    <span className="text-sm text-muted-foreground">
                                        Loading visualization...
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error State */}
                    {error ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-center p-6">
                                <AlertCircle className="w-10 h-10 text-red-500" />
                                <div>
                                    <h4 className="font-medium text-foreground">
                                        Visualization Error
                                    </h4>
                                    <p className="text-sm text-muted-foreground max-w-xs mt-1">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </motion.div>
        );
    }
);
