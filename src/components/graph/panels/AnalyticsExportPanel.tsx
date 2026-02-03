/**
 * Analytics Export Panel
 * 
 * Export graph analytics with detailed reports.
 * Supports PDF, JSON, and CSV formats.
 */
'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    FileJson,
    FileSpreadsheet,
    FileText,
    X,
    Loader2,
    CheckCircle,
    BarChart3,
    Network,
    Sparkles,
    Heart,
    ChevronDown,
} from 'lucide-react';
import { docAiApi } from '@/lib/api';

type ExportFormat = 'pdf' | 'json' | 'csv';

interface ExportConfig {
    includeCentrality: boolean;
    includeClustering: boolean;
    includeGhostLines: boolean;
    includeHealth: boolean;
}

interface AnalyticsExportPanelProps {
    folderId: string;
    folderName: string;
    isOpen: boolean;
    onClose: () => void;
}

const FORMAT_OPTIONS: Array<{
    value: ExportFormat;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
        {
            value: 'pdf',
            label: 'PDF Report',
            description: 'Formatted report with charts and tables',
            icon: FileText,
        },
        {
            value: 'json',
            label: 'JSON Data',
            description: 'Raw analytics data for processing',
            icon: FileJson,
        },
        {
            value: 'csv',
            label: 'CSV Table',
            description: 'Summary metrics for spreadsheets',
            icon: FileSpreadsheet,
        },
    ];

export function AnalyticsExportPanel({
    folderId,
    folderName,
    isOpen,
    onClose,
}: AnalyticsExportPanelProps) {
    const [format, setFormat] = useState<ExportFormat>('pdf');
    const [config, setConfig] = useState<ExportConfig>({
        includeCentrality: true,
        includeClustering: true,
        includeGhostLines: true,
        includeHealth: true,
    });
    const [isExporting, setIsExporting] = useState(false);
    const [exportResult, setExportResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Run export
    const handleExport = useCallback(async () => {
        setIsExporting(true);
        setError(null);
        setExportResult(null);

        try {
            const response = await docAiApi.graph.exportAnalytics(folderId, {
                format,
                include_centrality: config.includeCentrality,
                include_clustering: config.includeClustering,
                include_ghost_lines: config.includeGhostLines,
                include_health: config.includeHealth,
            }) as {
                error?: string;
                data?: unknown;
                filename?: string;
                content?: string;
                structure?: unknown;
            };

            if (response.error) {
                setError(response.error);
            } else {
                setExportResult(response);

                // Handle download
                if (format === 'json' && response.filename) {
                    downloadJson(response.data || response, response.filename);
                } else if (format === 'csv' && response.content && response.filename) {
                    downloadCsv(response.content, response.filename);
                }
                // PDF is rendered in the panel for preview
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Export failed');
        } finally {
            setIsExporting(false);
        }
    }, [folderId, format, config]);


    // Download helpers
    const downloadJson = (data: any, filename: string) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
        });
        downloadBlob(blob, filename);
    };

    const downloadCsv = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv' });
        downloadBlob(blob, filename);
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Toggle config option
    const toggleConfig = (key: keyof ExportConfig) => {
        setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald/10 rounded-xl">
                                <Download className="w-5 h-5 text-emerald" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    Export Analytics
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {folderName}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                            Export Format
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {FORMAT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFormat(opt.value)}
                                    className={`
                                        p-3 rounded-xl border transition-all text-left
                                        ${format === opt.value
                                            ? 'border-emerald bg-emerald/10'
                                            : 'border-border hover:border-muted-foreground/50'
                                        }
                                    `}
                                >
                                    <opt.icon
                                        className={`w-5 h-5 mb-2 ${format === opt.value
                                            ? 'text-emerald'
                                            : 'text-muted-foreground'
                                            }`}
                                    />
                                    <div className="text-sm font-medium">{opt.label}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {opt.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Include Options */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                            Include Sections
                        </label>
                        <div className="space-y-2">
                            <ConfigToggle
                                label="Centrality Analysis"
                                description="Top nodes by degree, betweenness, PageRank"
                                icon={BarChart3}
                                checked={config.includeCentrality}
                                onChange={() => toggleConfig('includeCentrality')}
                            />
                            <ConfigToggle
                                label="Clustering & Communities"
                                description="Entity type distribution, community detection"
                                icon={Network}
                                checked={config.includeClustering}
                                onChange={() => toggleConfig('includeClustering')}
                            />
                            <ConfigToggle
                                label="Blind Spots (Ghost Lines)"
                                description="Predicted missing relationships"
                                icon={Sparkles}
                                checked={config.includeGhostLines}
                                onChange={() => toggleConfig('includeGhostLines')}
                            />
                            <ConfigToggle
                                label="Health Assessment"
                                description="Graph completeness and quality score"
                                icon={Heart}
                                checked={config.includeHealth}
                                onChange={() => toggleConfig('includeHealth')}
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {exportResult && (
                        <div className="p-3 bg-emerald/10 border border-emerald/30 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald" />
                            <span className="text-sm text-emerald">
                                Export complete!{' '}
                                {format !== 'pdf' && 'Download started.'}
                            </span>
                        </div>
                    )}

                    {/* PDF Preview */}
                    {exportResult && format === 'pdf' && exportResult.structure && (
                        <PDFPreview structure={exportResult.structure} />
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border bg-muted/30">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className={`
                            w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                            ${isExporting
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-emerald text-white hover:bg-emerald/90'
                            }
                        `}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating Export...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Export {format.toUpperCase()}
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Config Toggle Component
function ConfigToggle({
    label,
    description,
    icon: Icon,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <button
            onClick={onChange}
            className={`
                w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                ${checked
                    ? 'border-emerald/50 bg-emerald/5'
                    : 'border-border hover:bg-muted/30'
                }
            `}
        >
            <div
                className={`
                    p-2 rounded-lg
                    ${checked ? 'bg-emerald/10' : 'bg-muted'}
                `}
            >
                <Icon className={`w-4 h-4 ${checked ? 'text-emerald' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground truncate">{description}</div>
            </div>
            <div
                className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                    ${checked
                        ? 'border-emerald bg-emerald'
                        : 'border-muted-foreground/30'
                    }
                `}
            >
                {checked && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
        </button>
    );
}

// PDF Preview Component
function PDFPreview({ structure }: { structure: any }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
                <span className="text-sm font-medium">Preview Report Structure</span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 space-y-2 max-h-64 overflow-y-auto bg-background">
                            <div className="text-center mb-3">
                                <h3 className="text-lg font-bold">{structure.title}</h3>
                                {structure.subtitle && (
                                    <p className="text-sm text-muted-foreground">
                                        {structure.subtitle}
                                    </p>
                                )}
                            </div>

                            {structure.sections?.map((section: any, i: number) => (
                                <div
                                    key={i}
                                    className="p-2 bg-muted/30 rounded-lg text-sm"
                                >
                                    <div className="font-medium">{section.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Type: {section.type}
                                        {section.rows && ` • ${section.rows.length} rows`}
                                        {section.data && ` • ${Object.keys(section.data).length} items`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
