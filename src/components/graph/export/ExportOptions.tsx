/**
 * Export Options Dropdown
 * 
 * Quick export functionality for graph visualizations.
 * Supports: PNG, JSON, PDF, CSV exports.
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    Image,
    FileJson,
    FileText,
    FileSpreadsheet,
    ChevronDown,
    Check,
    Loader2
} from 'lucide-react';

interface ExportFormat {
    id: 'png' | 'json' | 'pdf' | 'csv';
    name: string;
    description: string;
    icon: React.ReactNode;
    fileExtension: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
    {
        id: 'png',
        name: 'PNG Image',
        description: 'High-resolution screenshot',
        icon: <Image className="w-4 h-4" />,
        fileExtension: 'png'
    },
    {
        id: 'json',
        name: 'JSON Data',
        description: 'Graph nodes and relationships',
        icon: <FileJson className="w-4 h-4" />,
        fileExtension: 'json'
    },
    {
        id: 'pdf',
        name: 'PDF Report',
        description: 'Printable document with summary',
        icon: <FileText className="w-4 h-4" />,
        fileExtension: 'pdf'
    },
    {
        id: 'csv',
        name: 'CSV Table',
        description: 'Spreadsheet-compatible data',
        icon: <FileSpreadsheet className="w-4 h-4" />,
        fileExtension: 'csv'
    }
];

interface ExportOptionsProps {
    onExport: (format: 'png' | 'json' | 'pdf' | 'csv') => Promise<void>;
    disabled?: boolean;
}

export function ExportOptions({ onExport, disabled = false }: ExportOptionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExport = async (format: ExportFormat) => {
        setExporting(format.id);
        try {
            await onExport(format.id);
            setSuccess(format.id);
            setTimeout(() => setSuccess(null), 2000);
        } finally {
            setExporting(null);
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden z-50"
                    >
                        <div className="p-1">
                            {EXPORT_FORMATS.map(format => (
                                <button
                                    key={format.id}
                                    onClick={() => handleExport(format)}
                                    disabled={exporting !== null}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    <div className={`p-2 rounded-lg ${format.id === 'png' ? 'bg-blue-500/10 text-blue-400' :
                                            format.id === 'json' ? 'bg-amber-500/10 text-amber-400' :
                                                format.id === 'pdf' ? 'bg-rose-500/10 text-rose-400' :
                                                    'bg-emerald-500/10 text-emerald-400'
                                        }`}>
                                        {exporting === format.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : success === format.id ? (
                                            <Check className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            format.icon
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">{format.name}</p>
                                        <p className="text-xs text-white/50">{format.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Tip */}
                        <div className="px-3 py-2 border-t border-white/5 bg-slate-800/50">
                            <p className="text-[10px] text-white/40">
                                Tip: PNG exports capture the current view exactly as shown
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ExportOptions;
