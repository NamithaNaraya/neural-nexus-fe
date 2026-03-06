/**
 * Weight Config Panel
 * 
 * Embeddable panel for defining, managing, and toggling weight configurations.
 * Features:
 *   - Global ON/OFF toggle (affects algorithms, RAG, and analytics chat)
 *   - Property discovery from Neo4j
 *   - Guided formula builder (simple property, ratio, weighted sum)
 *   - Saved weight profiles per folder
 *   - Activate/deactivate weight configs
 */
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Scale, Plus, Trash2, Power, ChevronDown, ChevronUp,
    Loader2, AlertCircle, Check, X, Zap, RefreshCw,
    Divide, Hash, Sigma, ArrowRight, Info
} from 'lucide-react';
import { useWeightConfigStore } from '@/store/weightConfigStore';
import type { WeightFormula } from '@/lib/api/weights';

interface WeightConfigPanelProps {
    folderId: string;
    compact?: boolean;
}


// ─── Formula Builder Modal ───────────────────────────────────

type FormulaType = 'property' | 'ratio' | 'weighted_sum';

interface FormulaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, desc: string, formula: WeightFormula) => void;
    nodeProperties: string[];
    relProperties: string[];
    isSaving: boolean;
}

function FormulaModal({ isOpen, onClose, onSave, nodeProperties, relProperties, isSaving }: FormulaModalProps) {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [formulaType, setFormulaType] = useState<FormulaType>('property');
    const [formula, setFormula] = useState<WeightFormula>({ type: 'property', property: '' });
    const modalRef = useRef<HTMLDivElement>(null);

    const allProps = Array.from(new Set([...nodeProperties, ...relProperties]));

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setName('');
            setDesc('');
            setFormulaType('property');
            setFormula({ type: 'property', property: allProps[0] || '' });
        }
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleTypeSelect = (type: FormulaType) => {
        setFormulaType(type);
        if (type === 'property') {
            setFormula({ type: 'property', property: allProps[0] || '' });
        } else if (type === 'ratio') {
            setFormula({ type: 'ratio', numerator: allProps[0] || '', denominator: allProps[1] || allProps[0] || '', label: '' });
        } else if (type === 'weighted_sum') {
            setFormula({ type: 'weighted_sum', terms: [{ property: allProps[0] || '', coefficient: 1.0 }] });
        }
        setStep(2);
    };

    const getFormulaPreview = (): string => {
        if (formula.type === 'property') return formula.property || '—';
        if (formula.type === 'ratio') return `${formula.numerator || '?'} ÷ ${formula.denominator || '?'}`;
        if (formula.type === 'weighted_sum') {
            return (formula.terms || []).map(t => `${t.coefficient}×${t.property}`).join(' + ') || '—';
        }
        return '—';
    };

    const isFormulaValid = (): boolean => {
        if (formula.type === 'property') return !!formula.property;
        if (formula.type === 'ratio') return !!formula.numerator && !!formula.denominator;
        if (formula.type === 'weighted_sum') return (formula.terms || []).length > 0 && (formula.terms || []).every(t => !!t.property);
        return false;
    };

    const handleSave = () => {
        if (name.trim() && isFormulaValid()) {
            onSave(name.trim(), desc.trim(), formula);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[420px] max-h-[85vh] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                            <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Create Weight Formula</h3>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">Step {step} of 3</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Step Progress */}
                <div className="flex gap-1 px-5 pt-3">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    ))}
                </div>

                {/* Content */}
                <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

                    {/* STEP 1: Choose Formula Type */}
                    {step === 1 && (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                How would you like to calculate the weight for connections?
                            </p>

                            <button
                                onClick={() => handleTypeSelect('property')}
                                className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                        <Hash className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                                            Use a Single Property
                                        </div>
                                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                            e.g. use &quot;marks&quot; directly as the weight
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleTypeSelect('ratio')}
                                className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                                        <Divide className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                                            Calculate a Ratio
                                        </div>
                                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                            e.g. &quot;marks ÷ timeTaken&quot; = accuracy score
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleTypeSelect('weighted_sum')}
                                className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                                        <Sigma className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                                            Combine Multiple Properties
                                        </div>
                                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                            e.g. &quot;0.7×marks + 0.3×attempts&quot;
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Configure Formula */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {formulaType === 'property' && 'Pick which property to use as the weight value.'}
                                {formulaType === 'ratio' && 'Choose two properties. The weight will be the first divided by the second.'}
                                {formulaType === 'weighted_sum' && 'Assign a multiplier to each property. They will be added together.'}
                            </p>

                            {/* Single Property */}
                            {formulaType === 'property' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Property</label>
                                    <select
                                        value={formula.property || ''}
                                        onChange={e => setFormula({ type: 'property', property: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-500"
                                    >
                                        {allProps.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Ratio */}
                            {formulaType === 'ratio' && (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Name this ratio (optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. accuracy, performance, speed"
                                            value={formula.label || ''}
                                            onChange={e => setFormula({ ...formula, type: 'ratio', label: e.target.value } as WeightFormula)}
                                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white
                                                       placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Top value</label>
                                            <select
                                                value={formula.numerator || ''}
                                                onChange={e => setFormula({ ...formula, type: 'ratio', numerator: e.target.value } as WeightFormula)}
                                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white
                                                           focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                            >
                                                {allProps.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mt-5 shrink-0">
                                            <Divide className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bottom value</label>
                                            <select
                                                value={formula.denominator || ''}
                                                onChange={e => setFormula({ ...formula, type: 'ratio', denominator: e.target.value } as WeightFormula)}
                                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white
                                                           focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                            >
                                                {allProps.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Weighted Sum */}
                            {formulaType === 'weighted_sum' && (
                                <div className="space-y-3">
                                    {(formula.terms || []).map((term, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="10"
                                                value={term.coefficient}
                                                onChange={e => {
                                                    const terms = [...(formula.terms || [])];
                                                    terms[i] = { ...terms[i], coefficient: parseFloat(e.target.value) || 0 };
                                                    setFormula({ type: 'weighted_sum', terms });
                                                }}
                                                className="w-16 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-2.5 text-sm text-slate-800 dark:text-white text-center
                                                           focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                            />
                                            <span className="text-slate-400 dark:text-slate-500 text-sm">×</span>
                                            <select
                                                value={term.property}
                                                onChange={e => {
                                                    const terms = [...(formula.terms || [])];
                                                    terms[i] = { ...terms[i], property: e.target.value };
                                                    setFormula({ type: 'weighted_sum', terms });
                                                }}
                                                className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white
                                                           focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                            >
                                                {allProps.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                            {(formula.terms || []).length > 1 && (
                                                <button
                                                    onClick={() => {
                                                        const terms = (formula.terms || []).filter((_, j) => j !== i);
                                                        setFormula({ type: 'weighted_sum', terms });
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const terms = [...(formula.terms || []), { property: allProps[0] || '', coefficient: 1.0 }];
                                            setFormula({ type: 'weighted_sum', terms });
                                        }}
                                        className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Add another property
                                    </button>
                                </div>
                            )}

                            {/* Preview */}
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Formula Preview</div>
                                <div className="text-sm font-mono text-emerald-600 dark:text-emerald-400">{getFormulaPreview()}</div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Name & Save */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Give this weight a name so you can find it later.
                            </p>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Weight Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Accuracy Score, Performance Index"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    autoFocus
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white
                                               placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Description (optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Measures how quickly a student answers correctly"
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white
                                               placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                                />
                            </div>

                            {/* Summary Card */}
                            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Your Weight Formula</div>
                                <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300 font-mono">
                                    {getFormulaPreview()}
                                </div>
                                <div className="text-[10px] text-emerald-500 dark:text-emerald-400/70 mt-1">
                                    {formulaType === 'property' && 'Uses this property value directly as the connection weight.'}
                                    {formulaType === 'ratio' && 'Divides the top value by the bottom to calculate the weight.'}
                                    {formulaType === 'weighted_sum' && 'Multiplies each property by its coefficient and adds them together.'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <button
                        onClick={() => step === 1 ? onClose() : setStep(step - 1)}
                        className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>
                    {step < 3 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            disabled={step === 2 && !isFormulaValid()}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next <ArrowRight className="w-3 h-3" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={!name.trim() || isSaving}
                            className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-40"
                        >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Save Weight
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


// ─── Main Panel ──────────────────────────────────────────────

export function WeightConfigPanel({ folderId, compact = false }: WeightConfigPanelProps) {
    const {
        configs, activeConfig, weightsEnabled,
        discoveredProperties, isDiscovering,
        isLoading, isSaving, error,
        loadConfigs, loadActiveConfig, discoverProperties,
        createConfig, deleteConfig, activateConfig, deactivateWeights,
    } = useWeightConfigStore();

    const [expanded, setExpanded] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Load configs when folder changes
    useEffect(() => {
        if (folderId) {
            loadConfigs(folderId);
            loadActiveConfig(folderId);
        }
    }, [folderId, loadConfigs, loadActiveConfig]);

    // Discover properties when expanded
    useEffect(() => {
        if (expanded && folderId && !discoveredProperties) {
            discoverProperties(folderId);
        }
    }, [expanded, folderId, discoveredProperties, discoverProperties]);

    const nodeProps = discoveredProperties ? Object.keys(discoveredProperties.node_properties) : [];
    const relProps = discoveredProperties ? Object.keys(discoveredProperties.relationship_properties) : [];
    const hasProperties = nodeProps.length > 0 || relProps.length > 0;

    const handleCreate = useCallback(async (name: string, desc: string, formula: WeightFormula) => {
        const config = await createConfig({
            name,
            folder_id: folderId,
            formula,
            description: desc || undefined,
        });
        if (config) {
            setShowModal(false);
        }
    }, [folderId, createConfig]);

    const handleToggle = useCallback(async () => {
        if (weightsEnabled && activeConfig) {
            await deactivateWeights(activeConfig.id);
        } else if (!weightsEnabled && configs.length > 0) {
            const target = configs.find(c => c.is_active) || configs[0];
            await activateConfig(target.id);
        }
    }, [weightsEnabled, activeConfig, configs, deactivateWeights, activateConfig]);

    const getFormulaLabel = (f: WeightFormula): string => {
        if (f.type === 'property') return f.property || '';
        if (f.type === 'ratio') return `${f.numerator} ÷ ${f.denominator}`;
        if (f.type === 'weighted_sum') return (f.terms || []).map(t => `${t.coefficient}×${t.property}`).join(' + ');
        return '';
    };

    // ─── Compact Mode ───
    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-2">
                <Scale className="w-4 h-4 text-emerald-500 dark:text-emerald-400/70" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Weights</span>
                <button
                    onClick={handleToggle}
                    disabled={configs.length === 0}
                    className={`
                        ml-auto relative w-9 h-5 rounded-full transition-colors duration-200
                        ${weightsEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}
                        ${configs.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                >
                    <div className={`
                        absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200
                        ${weightsEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'}
                    `} />
                </button>
            </div>
        );
    }

    // ─── Full Panel ───
    return (
        <>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
                {/* Header */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <div className={`
                            w-7 h-7 rounded-lg flex items-center justify-center
                            ${weightsEnabled
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                            }
                        `}>
                            <Scale className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Quantitative Weights</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                {weightsEnabled && activeConfig
                                    ? `Active: ${activeConfig.name}`
                                    : configs.length > 0
                                        ? `${configs.length} weight${configs.length !== 1 ? 's' : ''} saved`
                                        : 'Not configured yet'
                                }
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Global Toggle */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                            disabled={configs.length === 0}
                            className={`
                                relative w-10 h-5 rounded-full transition-colors duration-200
                                ${weightsEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}
                                ${configs.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                            title={weightsEnabled ? 'Turn weights OFF' : 'Turn weights ON'}
                        >
                            <div className={`
                                absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200
                                ${weightsEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}
                            `} />
                        </button>
                        {expanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        )}
                    </div>
                </button>

                {/* Expanded Content */}
                {expanded && (
                    <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 space-y-3">

                        {/* Active Weight Banner */}
                        {weightsEnabled && activeConfig && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg">
                                <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                    Weights are applied to all algorithms and chat responses.
                                </span>
                            </div>
                        )}

                        {/* Property Discovery Status */}
                        {isDiscovering ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Scanning your data for numeric properties...
                            </div>
                        ) : !hasProperties ? (
                            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400/70 py-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>No numeric properties found in this folder.</span>
                                <button
                                    onClick={() => discoverProperties(folderId)}
                                    className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 ml-auto"
                                    title="Refresh"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Info className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                    Available: {[...nodeProps, ...relProps].join(', ')}
                                </span>
                                <button
                                    onClick={() => discoverProperties(folderId)}
                                    className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 ml-auto shrink-0"
                                    title="Refresh properties"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        {/* Saved Configs List */}
                        {configs.length > 0 && (
                            <div className="space-y-1.5">
                                {configs.map(config => (
                                    <div
                                        key={config.id}
                                        className={`
                                            flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all
                                            ${config.is_active && weightsEnabled
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                                                : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }
                                        `}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{config.name}</span>
                                                {config.is_active && weightsEnabled && (
                                                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                                                {getFormulaLabel(config.formula)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 ml-2 shrink-0">
                                            {!config.is_active || !weightsEnabled ? (
                                                <button
                                                    onClick={() => activateConfig(config.id)}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                                    title="Use this weight"
                                                >
                                                    <Power className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => deactivateWeights(config.id)}
                                                    className="p-1.5 text-emerald-600 dark:text-emerald-400 transition-colors rounded-lg"
                                                    title="Currently active"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteConfig(config.id)}
                                                className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Create New Button */}
                        <button
                            onClick={() => setShowModal(true)}
                            disabled={!hasProperties}
                            className={`
                                w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed transition-all
                                ${hasProperties
                                    ? 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                }
                            `}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Create New Weight</span>
                        </button>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400/80 px-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Formula Builder Modal */}
            <FormulaModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSave={handleCreate}
                nodeProperties={nodeProps}
                relProperties={relProps}
                isSaving={isSaving}
            />
        </>
    );
}
