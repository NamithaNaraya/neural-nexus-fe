"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useMergeNodes } from "@/hooks/useApi";
import {
    GitMerge,
    AlertTriangle,
    Loader2,
    X,
    Check
} from "lucide-react";

interface Node {
    id: string;
    name: string;
    type: string;
    description?: string;
    file_ids?: string[];
}

interface MergeNodesModalProps {
    nodes: Node[];
    onClose: () => void;
    onSuccess: () => void;
}

export function MergeNodesModal({ nodes, onClose, onSuccess }: MergeNodesModalProps) {
    const [primaryId, setPrimaryId] = useState<string>(nodes[0]?.id || "");
    const [newName, setNewName] = useState(nodes.find(n => n.id === primaryId)?.name || "");
    const [newType, setNewType] = useState(nodes.find(n => n.id === primaryId)?.type || "");
    const [newDescription, setNewDescription] = useState(nodes.find(n => n.id === primaryId)?.description || "");

    const mergeMutation = useMergeNodes();

    const primaryNode = nodes.find(n => n.id === primaryId);

    const handleMerge = async () => {
        try {
            await mergeMutation.mutateAsync({
                primary_id: primaryId,
                secondary_ids: nodes.map(n => n.id).filter(id => id !== primaryId),
                new_name: newName !== primaryNode?.name ? newName : undefined,
                new_type: newType !== primaryNode?.type ? newType : undefined,
                new_description: newDescription !== primaryNode?.description ? newDescription : undefined,
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Merge failed:", error);
        }
    };

    if (nodes.length < 2) return null;

    return (
        <Modal onClose={onClose} wide>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <GitMerge className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Merge Entities</h3>
                        <p className="text-xs text-muted-foreground">Consolidate {nodes.length} duplicate nodes into one</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Source Nodes Selection */}
                <div className="space-y-4">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                        Select Primary canonical Entity
                    </label>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                        {nodes.map((node) => (
                            <button
                                key={node.id}
                                onClick={() => {
                                    setPrimaryId(node.id);
                                    setNewName(node.name);
                                    setNewType(node.type);
                                    setNewDescription(node.description || "");
                                }}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${primaryId === node.id
                                        ? "bg-emerald-500/5 border-emerald-500 shadow-sm"
                                        : "bg-muted/30 border-border hover:border-muted-foreground/30"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm text-foreground">{node.name}</span>
                                    {primaryId === node.id && (
                                        <div className="p-1 bg-emerald-500 rounded-full">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 items-center text-[10px] mb-2">
                                    <span className="px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-semibold uppercase tracking-wider">
                                        {node.type}
                                    </span>
                                    <span className="text-muted-foreground italic">
                                        {node.file_ids?.length || 1} source files
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {node.description || "No description provided."}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Final Metadata Customization */}
                <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            Final canonical Details
                        </h4>

                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                                Entity Name
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                                Entity Type
                            </label>
                            <input
                                type="text"
                                value={newType}
                                onChange={(e) => setNewType(e.target.value)}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                                Description
                            </label>
                            <textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                className="w-full h-32 px-4 py-2.5 bg-background border border-border rounded-lg text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none leading-relaxed"
                            />
                        </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-600/90 leading-relaxed font-medium">
                            Merging will delete {nodes.length - 1} secondary nodes and re-route all their connections to the primary node. This action is permanent.
                        </p>
                    </div>

                    <button
                        onClick={handleMerge}
                        disabled={mergeMutation.isPending}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {mergeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <GitMerge className="w-4 h-4" />
                        )}
                        Confirm Merge
                    </button>
                </div>
            </div>
        </Modal>
    );
}
