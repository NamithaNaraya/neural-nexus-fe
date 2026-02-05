/**
 * Delete Confirm Modal
 * 
 * Confirmation dialog for destructive actions (delete node/relationship).
 */
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    title: string;
    message: string;
    itemName?: string;
}

export function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    itemName,
}: DeleteConfirmModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await onConfirm();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to delete');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-destructive/5">
                        <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                            {itemName && (
                                <p className="text-sm text-muted-foreground truncate max-w-[280px]">
                                    {itemName}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-auto p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <p className="text-foreground">{message}</p>

                        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-sm text-destructive">
                                ⚠️ This action cannot be undone. The data will be permanently removed from the database.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            Delete
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
