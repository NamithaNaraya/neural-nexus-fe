/**
 * Node Context Menu
 * 
 * Right-click menu for graph nodes with quick actions.
 * Features:
 * - Edit properties
 * - Add relationship
 * - Find connected nodes
 * - Copy details
 * - Delete node
 */
'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Edit3,
    Link,
    Search,
    Copy,
    Trash2,
    Expand,
    EyeOff,
    Share2,
    X,
} from 'lucide-react';

export interface ContextMenuAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive';
    disabled?: boolean;
}

interface NodeContextMenuProps {
    x: number;
    y: number;
    nodeId: string;
    nodeName: string;
    onClose: () => void;
    onEdit?: () => void;
    onAddRelationship?: () => void;
    onFindConnected?: () => void;
    onExpand?: () => void;
    onHide?: () => void;
    onCopyDetails?: () => void;
    onDelete?: () => void;
    customActions?: ContextMenuAction[];
}

export function NodeContextMenu({
    x,
    y,
    nodeId,
    nodeName,
    onClose,
    onEdit,
    onAddRelationship,
    onFindConnected,
    onExpand,
    onHide,
    onCopyDetails,
    onDelete,
    customActions = [],
}: NodeContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click or escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to keep menu on screen
    const adjustedPosition = {
        x: Math.min(x, window.innerWidth - 220),
        y: Math.min(y, window.innerHeight - 350),
    };

    // Default actions
    const defaultActions: ContextMenuAction[] = [
        {
            id: 'edit',
            label: 'Edit Properties',
            icon: <Edit3 className="w-4 h-4" />,
            onClick: () => {
                onEdit?.();
                onClose();
            },
            disabled: !onEdit,
        },
        {
            id: 'expand',
            label: 'Expand Connections',
            icon: <Expand className="w-4 h-4" />,
            onClick: () => {
                onExpand?.();
                onClose();
            },
            disabled: !onExpand,
        },
        {
            id: 'add-relationship',
            label: 'Add Relationship',
            icon: <Link className="w-4 h-4" />,
            onClick: () => {
                onAddRelationship?.();
                onClose();
            },
            disabled: !onAddRelationship,
        },
        {
            id: 'find-connected',
            label: 'Find Connected',
            icon: <Search className="w-4 h-4" />,
            onClick: () => {
                onFindConnected?.();
                onClose();
            },
            disabled: !onFindConnected,
        },
        {
            id: 'hide',
            label: 'Hide from View',
            icon: <EyeOff className="w-4 h-4" />,
            onClick: () => {
                onHide?.();
                onClose();
            },
            disabled: !onHide,
        },
        {
            id: 'copy',
            label: 'Copy Details',
            icon: <Copy className="w-4 h-4" />,
            onClick: () => {
                // Copy node details to clipboard with fallback for non-secure contexts
                const details = `Node: ${nodeName}\nID: ${nodeId}`;

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(details).catch(err => {
                        console.error('Failed to copy: ', err);
                        fallbackCopyTextToClipboard(details);
                    });
                } else {
                    fallbackCopyTextToClipboard(details);
                }

                onCopyDetails?.();
                onClose();
            },
        },
    ];

    // Fallback for copy when navigator.clipboard is not available (non-secure context)
    function fallbackCopyTextToClipboard(text: string) {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Ensure textarea is not visible
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (!successful) console.error('Fallback copy was unsuccessful');
        } catch (err) {
            console.error('Fallback copy failed', err);
        }

        document.body.removeChild(textArea);
    }

    // Destructive actions (shown at bottom with separator)
    const destructiveActions: ContextMenuAction[] = [
        {
            id: 'delete',
            label: 'Delete Node',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => {
                onDelete?.();
                onClose();
            },
            variant: 'destructive',
            disabled: !onDelete,
        },
    ];

    const allActions = [
        ...defaultActions.filter(a => !a.disabled),
        ...customActions,
    ];

    const visibleDestructive = destructiveActions.filter(a => !a.disabled);

    return (
        <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[100] min-w-[200px] bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{
                left: adjustedPosition.x,
                top: adjustedPosition.y,
            }}
        >
            {/* Header */}
            <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Node</p>
                    <p className="text-sm font-medium text-foreground truncate">
                        {nodeName}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    aria-label="Close menu"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Actions */}
            <div className="py-1">
                {allActions.map((action) => (
                    <ContextMenuItem
                        key={action.id}
                        icon={action.icon}
                        label={action.label}
                        onClick={action.onClick}
                        variant={action.variant}
                    />
                ))}

                {/* Separator before destructive actions */}
                {visibleDestructive.length > 0 && (
                    <>
                        <div className="my-1 border-t border-border" />
                        {visibleDestructive.map((action) => (
                            <ContextMenuItem
                                key={action.id}
                                icon={action.icon}
                                label={action.label}
                                onClick={action.onClick}
                                variant={action.variant}
                            />
                        ))}
                    </>
                )}
            </div>
        </motion.div>
    );
}

// Menu Item Component
interface ContextMenuItemProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive';
}

function ContextMenuItem({ icon, label, onClick, variant = 'default' }: ContextMenuItemProps) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors
                ${variant === 'destructive'
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-muted'
                }
            `}
        >
            <span className={variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}>
                {icon}
            </span>
            {label}
        </button>
    );
}

// Provider for context menu state
interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    nodeId: string | null;
    nodeName: string | null;
}

export const initialContextMenuState: ContextMenuState = {
    isOpen: false,
    x: 0,
    y: 0,
    nodeId: null,
    nodeName: null,
};
