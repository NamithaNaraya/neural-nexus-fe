'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, BrainCircuit, Play, Trash2, Sparkles, CheckCircle2, AlertCircle,
    Loader2, Link2, Tags, Fingerprint, GitCompareArrows
} from 'lucide-react';
import { mlApi } from '@/lib/api/ml';
import { useGraphStore } from '@/store/graphStore';

interface MachineLearningDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentFolderId?: string;
}

type MLTask = 'catalog' | 'linkPrediction' | 'nodeClassification' | 'embeddings' | 'similarity';

const ML_TASKS: { id: MLTask; label: string; icon: React.ReactNode }[] = [
    { id: 'catalog', label: 'Catalog', icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'linkPrediction', label: 'Link Pred', icon: <Link2 className="w-4 h-4" /> },
    { id: 'nodeClassification', label: 'Classify', icon: <Tags className="w-4 h-4" /> },
    { id: 'embeddings', label: 'Embeddings', icon: <Fingerprint className="w-4 h-4" /> },
    { id: 'similarity', label: 'Similarity', icon: <GitCompareArrows className="w-4 h-4" /> },
];

export function MachineLearningDrawer({ isOpen, onClose, currentFolderId }: MachineLearningDrawerProps) {
    const [models, setModels] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTask, setActiveTask] = useState<MLTask>('catalog');

    // Link Prediction form
    const [lpPipeline, setLpPipeline] = useState('my_lp_pipeline');
    const [lpModel, setLpModel] = useState('my_lp_model');
    // Node Classification form
    const [ncPipeline, setNcPipeline] = useState('my_nc_pipeline');
    const [ncModel, setNcModel] = useState('my_nc_model');
    // Embedding form
    const [embMethod, setEmbMethod] = useState<'fastRP' | 'node2vec'>('fastRP');
    const [embDim, setEmbDim] = useState(128);

    // Results
    const [trainResult, setTrainResult] = useState<any>(null);
    const [ncPredictions, setNcPredictions] = useState<any[]>([]);
    const [embeddingResult, setEmbeddingResult] = useState<any>(null);
    const [similarityResult, setSimilarityResult] = useState<any>(null);
    const [statusMsg, setStatusMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => { if (isOpen) { loadCatalog(); clearStatus(); } }, [isOpen]);

    const clearStatus = () => {
        setTrainResult(null); setNcPredictions([]); setEmbeddingResult(null);
        setSimilarityResult(null); setStatusMsg(''); setErrorMsg('');
    };

    const loadCatalog = async () => {
        try { const res = await mlApi.getModels(); setModels(res.models || []); } catch (e) { console.error(e); }
    };

    // ─── Actions ────────────────────────────────────────

    const handleTrainLP = async () => {
        if (!currentFolderId) { setErrorMsg('Open a folder first.'); return; }
        const sp = lpPipeline.trim(), sm = lpModel.trim();
        if (!sp || !sm) { setErrorMsg('Names cannot be empty.'); return; }
        setIsLoading(true); clearStatus(); setStatusMsg('Creating pipeline, generating FastRP embeddings, extracting Hadamard features, training classifier...');
        try {
            const res = await mlApi.trainLinkPrediction(currentFolderId, sp, sm);
            setTrainResult(res); setStatusMsg(''); await loadCatalog();
        } catch (e: any) { setErrorMsg(e.response?.data?.detail || 'Training failed.'); setStatusMsg(''); }
        finally { setIsLoading(false); }
    };

    const handleTrainNC = async () => {
        const sp = ncPipeline.trim(), sm = ncModel.trim();
        if (!sp || !sm) { setErrorMsg('Names cannot be empty.'); return; }
        setIsLoading(true); clearStatus(); setStatusMsg('Encoding node types → generating embeddings → training classifier...');
        try {
            const res = await mlApi.trainNodeClassification(sp, sm);
            setTrainResult(res); setStatusMsg(''); await loadCatalog();
        } catch (e: any) { setErrorMsg(e.response?.data?.detail || 'Training failed.'); setStatusMsg(''); }
        finally { setIsLoading(false); }
    };

    const handlePredictNC = async (modelName: string) => {
        setIsLoading(true); setErrorMsg('');
        try {
            const res = await mlApi.predictNodeClasses(modelName, 100);
            setNcPredictions(res.predictions || []);
            setActiveTask('nodeClassification');
        } catch (e: any) { setErrorMsg(e.response?.data?.detail || 'Prediction failed.'); }
        finally { setIsLoading(false); }
    };

    const handleGenerateEmbeddings = async () => {
        if (!currentFolderId) { setErrorMsg('Open a folder first.'); return; }
        setIsLoading(true); clearStatus(); setStatusMsg(`Running ${embMethod === 'fastRP' ? 'Fast Random Projection' : 'Node2Vec random walks'}...`);
        try {
            const res = await mlApi.generateEmbeddings(currentFolderId, embMethod, embDim);
            setEmbeddingResult(res); setStatusMsg('');
        } catch (e: any) { setErrorMsg(e.response?.data?.detail || 'Failed.'); setStatusMsg(''); }
        finally { setIsLoading(false); }
    };

    const handleRunSimilarity = async () => {
        if (!currentFolderId) { setErrorMsg('Open a folder first.'); return; }
        setIsLoading(true); clearStatus(); setStatusMsg('Computing Jaccard similarities across all node pairs...');
        try {
            const res = await mlApi.nodeSimilarity(currentFolderId, 10, 0.1);
            setSimilarityResult(res); setStatusMsg('');
        } catch (e: any) { setErrorMsg(e.response?.data?.detail || 'Failed.'); setStatusMsg(''); }
        finally { setIsLoading(false); }
    };

    const handleDeleteModel = async (name: string) => {
        if (!confirm(`Delete model "${name}"?`)) return;
        try { await mlApi.dropModel(name); await loadCatalog(); } catch (e) { console.error(e); }
    };

    const handlePredictLinks = async (modelName: string) => {
        if (!currentFolderId) { setErrorMsg('Open a folder first.'); return; }
        setIsLoading(true); setErrorMsg('');
        try {
            const res = await mlApi.predictLinks(currentFolderId, modelName, 0.5, 50);
            if (res.predictions?.length > 0) {
                const newLinks = res.predictions.map((p: any) => ({
                    source: p.source_id, target: p.target_id, type: 'PREDICTED_LINK',
                    color: 'rgba(236,72,153,0.8)', width: 2,
                    description: `Predicted (${(p.probability * 100).toFixed(1)}%)`,
                    properties: { isPredicted: true, probability: p.probability },
                }));
                useGraphStore.getState().addNodesAndLinks([], newLinks);
                onClose();
            } else { setErrorMsg('No links predicted above 50% confidence.'); }
        } catch (e: any) { setErrorMsg(e.response?.data?.detail || 'Failed.'); }
        finally { setIsLoading(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed right-0 top-0 bottom-0 w-[500px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 shadow-2xl z-[70] flex flex-col">

                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400"><BrainCircuit className="w-5 h-5" /></div>
                            <div>
                                <h2 className="font-semibold text-slate-800 dark:text-white">Machine Learning</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Neo4j GDS — No External AI Needed</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-200 dark:border-white/10 px-1">
                        {ML_TASKS.map(t => (
                            <button key={t.id} onClick={() => { setActiveTask(t.id); clearStatus(); }}
                                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${activeTask === t.id
                                    ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                                    }`}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">

                        {/* ═══ CATALOG ═══ */}
                        {activeTask === 'catalog' && (
                            <>
                                <HelpBox color="slate" lines={['Your trained ML models are listed here.', 'Click "Apply" to run predictions on your current graph.', 'Link Prediction → pink ghost lines on graph.', 'Node Classification → predicted labels for nodes.']} />
                                {models.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <BrainCircuit className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm font-medium">No models yet</p>
                                        <p className="text-xs mt-1">Train one from the other tabs!</p>
                                    </div>
                                ) : models.map((m, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-medium text-slate-800 dark:text-white text-sm">{m.modelName}</h3>
                                            <button onClick={() => handleDeleteModel(m.modelName)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-3">
                                            Type: <span className={`font-medium ${m.modelType?.includes('Link') ? 'text-pink-600' : 'text-purple-600'}`}>{m.modelType}</span>
                                        </p>
                                        <div className="flex gap-2">
                                            {/* Show the correct button based on model type */}
                                            {m.modelType?.toLowerCase().includes('link') ? (
                                                <button onClick={() => handlePredictLinks(m.modelName)} disabled={isLoading}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 transition-colors disabled:opacity-50">
                                                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} Predict Links
                                                </button>
                                            ) : m.modelType?.toLowerCase().includes('classification') ? (
                                                <button onClick={() => handlePredictNC(m.modelName)} disabled={isLoading}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 transition-colors disabled:opacity-50">
                                                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tags className="w-3.5 h-3.5" />} Classify Nodes
                                                </button>
                                            ) : (
                                                <p className="text-xs text-slate-400">Unknown model type</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* ═══ LINK PREDICTION ═══ */}
                        {activeTask === 'linkPrediction' && (
                            <div className="space-y-4">
                                <HelpBox color="blue" lines={[
                                    '🔗 Predicts MISSING CONNECTIONS between existing nodes.',
                                    '📊 Output: Pink dashed "ghost lines" appear on your graph.',
                                    '💡 Example: "Shatavari ↔ Anti-Inflammatory" (87% confidence).',
                                    '🎯 How to use: Train → go to Catalog → click "Predict Links".',
                                    '📌 The model looks at your graph\'s structure to find patterns.',
                                ]} />
                                <Input label="Pipeline Name" value={lpPipeline} onChange={setLpPipeline} disabled={isLoading} />
                                <Input label="Model Name" value={lpModel} onChange={setLpModel} disabled={isLoading} />
                                <ActionButton onClick={handleTrainLP} loading={isLoading} label="Train Link Prediction" color="pink" />
                            </div>
                        )}

                        {/* ═══ NODE CLASSIFICATION ═══ */}
                        {activeTask === 'nodeClassification' && (
                            <div className="space-y-4">
                                <HelpBox color="purple" lines={[
                                    '🏷️ Predicts what TYPE each node should be (Herb / Property / Quality).',
                                    '📊 Output: A table showing each node\'s current vs predicted type.',
                                    '💡 Use case: Find mislabeled nodes or auto-label new ones.',
                                    '🎯 How: Train → go to Catalog → click "Classify Nodes".',
                                    '⚙️ Automatically encodes types as numbers for GDS internally.',
                                ]} />
                                <Input label="Pipeline Name" value={ncPipeline} onChange={setNcPipeline} disabled={isLoading} />
                                <Input label="Model Name" value={ncModel} onChange={setNcModel} disabled={isLoading} />
                                <ActionButton onClick={handleTrainNC} loading={isLoading} label="Train Node Classifier" color="purple" />

                                {/* NC Prediction Results */}
                                {ncPredictions.length > 0 && (
                                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20">
                                        <h4 className="text-purple-700 dark:text-purple-400 font-medium text-sm mb-3">
                                            🏷️ Classification Results ({ncPredictions.length} nodes)
                                        </h4>
                                        <div className="max-h-64 overflow-y-auto space-y-1.5">
                                            {ncPredictions.map((p: any, i: number) => {
                                                const match = p.current_type === p.predicted_type;
                                                return (
                                                    <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${match ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-transparent' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'}`}>
                                                        <span className="font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">{p.name}</span>
                                                        <span className="text-slate-400 text-[10px]">{p.current_type}</span>
                                                        <span className="text-slate-300">→</span>
                                                        <span className={`font-semibold ${match ? 'text-emerald-600' : 'text-amber-600'}`}>{p.predicted_type}</span>
                                                        {!match && <span className="text-amber-500 text-[10px]">⚠️</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-purple-500 mt-2">Rows highlighted in amber = predicted type differs from current type.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══ EMBEDDINGS ═══ */}
                        {activeTask === 'embeddings' && (
                            <div className="space-y-4">
                                <HelpBox color="amber" lines={[
                                    '🔑 Converts each node into a mathematical VECTOR (fingerprint).',
                                    '📊 Output: A number array per node. Similar nodes → similar vectors.',
                                    '💡 What to do with them:',
                                    '   • Power similarity search ("find herbs like Shatavari")',
                                    '   • Feed into Link Prediction or Classification internally',
                                    '   • Export for external analytics or visualization',
                                    '⚡ FastRP = fast, good for general structure.',
                                    '🚶 Node2Vec = slower, captures deeper walk patterns.',
                                    '🚫 No Ollama/AI needed — pure graph math.',
                                ]} />
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Embedding Method</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['fastRP', 'node2vec'] as const).map(m => (
                                            <button key={m} onClick={() => setEmbMethod(m)}
                                                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${embMethod === m ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-300'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-800 dark:border-white/10 dark:text-slate-400'
                                                    }`}>
                                                {m === 'fastRP' ? '⚡ FastRP' : '🚶 Node2Vec'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Dimensions: {embDim}</label>
                                    <input type="range" min={16} max={512} step={16} value={embDim} onChange={e => setEmbDim(Number(e.target.value))} className="w-full accent-amber-500" />
                                    <div className="flex justify-between text-[10px] text-slate-400"><span>16 (faster)</span><span>512 (more detail)</span></div>
                                </div>
                                <ActionButton onClick={handleGenerateEmbeddings} loading={isLoading} label={`Generate ${embMethod} Embeddings`} color="amber" />

                                {embeddingResult && (
                                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                                        <h4 className="text-amber-700 dark:text-amber-400 font-medium text-sm mb-2">
                                            ✅ {embeddingResult.count} embeddings ({embeddingResult.method}, {embeddingResult.dimension}D)
                                        </h4>
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2">Each node now has a {embeddingResult.dimension}-number fingerprint. Nodes with similar fingerprints are structurally alike in your graph.</p>
                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                            {embeddingResult.embeddings?.slice(0, 10).map((e: any, i: number) => (
                                                <div key={i} className="text-xs flex gap-2">
                                                    <span className="font-medium text-slate-700 dark:text-slate-300 min-w-[100px] truncate">{e.name}</span>
                                                    <span className="text-slate-400 font-mono truncate text-[10px]">[{e.embedding?.slice(0, 4).map((v: number) => v.toFixed(3)).join(', ')}...]</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══ SIMILARITY ═══ */}
                        {activeTask === 'similarity' && (
                            <div className="space-y-4">
                                <HelpBox color="teal" lines={[
                                    '🔄 Finds which nodes are STRUCTURALLY SIMILAR.',
                                    '📊 Output: Pairs of nodes with a similarity % score.',
                                    '💡 What it means:',
                                    '   • 100% = two nodes connect to the exact same neighbors',
                                    '   • 80% = they share most of the same connections',
                                    '   • 30% = loosely similar structure',
                                    '🎯 Use case: Find duplicate entities, discover herbs with similar properties, identify redundant nodes.',
                                    '⚡ No training needed — runs instantly.',
                                ]} />
                                <ActionButton onClick={handleRunSimilarity} loading={isLoading} label="Find Similar Nodes" color="teal" icon={<GitCompareArrows className="w-4 h-4" />} />

                                {similarityResult && (
                                    <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20">
                                        <h4 className="text-teal-700 dark:text-teal-400 font-medium text-sm mb-3">
                                            🔄 {similarityResult.count} similar pairs found
                                        </h4>
                                        <div className="max-h-60 overflow-y-auto space-y-1.5">
                                            {similarityResult.similarities?.map((s: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-xs bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-100 dark:border-transparent">
                                                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{s.source_name}</span>
                                                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${s.similarity > 0.8 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                                                        s.similarity > 0.5 ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300' :
                                                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                        {(s.similarity * 100).toFixed(0)}%
                                                    </span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate flex-1 text-right">{s.target_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-teal-500 mt-2">High similarity = these nodes connect to the same neighbors. They may represent the same concept or closely related entities.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Shared Status Messages */}
                        {statusMsg && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                                <p className="text-xs text-blue-700 dark:text-blue-300">{statusMsg}</p>
                            </div>
                        )}
                        {errorMsg && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700 dark:text-red-300">{errorMsg}</p>
                            </div>
                        )}
                        {trainResult && (
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                                <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <h4 className="text-emerald-700 dark:text-emerald-400 font-medium text-sm">Training Complete!</h4>
                                </div>
                                <p className="text-xs text-emerald-600 dark:text-emerald-300">Model <strong>&quot;{trainResult.model_name}&quot;</strong> saved ({trainResult.training_time_ms}ms)</p>
                                <p className="text-[10px] text-emerald-500 mt-1">→ Go to Catalog tab to apply predictions to your graph.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Sub-Components ─────────────────────────────────────────

function HelpBox({ color, lines }: { color: string; lines: string[] }) {
    const c: Record<string, string> = {
        slate: 'bg-slate-50 border-slate-100 text-slate-700 dark:bg-slate-800 dark:border-white/5 dark:text-slate-300',
        blue: 'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-200',
        purple: 'bg-purple-50 border-purple-100 text-purple-800 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-200',
        amber: 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-200',
        teal: 'bg-teal-50 border-teal-100 text-teal-800 dark:bg-teal-500/10 dark:border-teal-500/20 dark:text-teal-200',
    };
    return (
        <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-0.5 ${c[color]}`}>
            {lines.map((l, i) => <p key={i}>{l}</p>)}
        </div>
    );
}

function Input({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean }) {
    return (
        <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
            <input value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-pink-500 disabled:opacity-50" />
        </div>
    );
}

function ActionButton({ onClick, loading, label, color = 'pink', icon }: { onClick: () => void; loading: boolean; label: string; color?: string; icon?: React.ReactNode }) {
    const c: Record<string, string> = {
        pink: 'bg-pink-600 hover:bg-pink-700', amber: 'bg-amber-600 hover:bg-amber-700',
        teal: 'bg-teal-600 hover:bg-teal-700', purple: 'bg-purple-600 hover:bg-purple-700',
    };
    return (
        <button onClick={onClick} disabled={loading}
            className={`w-full py-3 rounded-lg ${c[color]} text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (icon || <Play className="w-4 h-4" />)}
            {loading ? 'Processing...' : label}
        </button>
    );
}

export default MachineLearningDrawer;
