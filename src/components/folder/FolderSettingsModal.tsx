"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useUpdateFolder, useDeleteFolder } from "@/hooks/useApi";
import {
    Trash2,
    Edit,
    Save,
    X,
    AlertTriangle,
    Loader2,
    Settings
} from "lucide-react";

interface FolderSettingsModalProps {
    folder: {
        id: string;
        name: string;
        description?: string;
    };
    onClose: () => void;
    onDeleteSuccess: () => void;
}

export function FolderSettingsModal({ folder, onClose, onDeleteSuccess }: FolderSettingsModalProps) {
    const [name, setName] = useState(folder.name);
    const [description, setDescription] = useState(folder.description || "");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const updateFolderMutation = useUpdateFolder();
    const deleteFolderMutation = useDeleteFolder();

    const handleSave = async () => {
        if (!name.trim()) return;

        try {
            await updateFolderMutation.mutateAsync({
                folderId: folder.id,
                data: { name, description }
            });
            onClose();
        } catch (error) {
            console.error("Failed to update folder:", error);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteFolderMutation.mutateAsync(folder.id);
            onDeleteSuccess();
        } catch (error) {
            console.error("Failed to delete folder:", error);
        }
    };

    return (
        <Modal onClose={onClose}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-muted rounded-lg">
                        <Settings className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Folder Settings</h3>
                        <p className="text-xs text-muted-foreground">Manage {folder.name}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            <div className="space-y-6">
                {/* Rename Section */}
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                            Folder Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                            placeholder="Folder Name"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full h-24 px-4 py-2.5 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none font-sans"
                            placeholder="Optional description..."
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={updateFolderMutation.isPending || !name.trim()}
                        className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {updateFolderMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Changes
                    </button>
                </div>

                <div className="border-t border-border pt-6">
                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full py-2.5 border border-destructive/30 text-destructive hover:bg-destructive/10 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Folder
                        </button>
                    ) : (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-destructive text-sm">Delete "{folder.name}"?</h4>
                                    <p className="text-xs text-destructive/80 mt-1">
                                        This action cannot be undone. All files and extracted knowledge will be permanently removed.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2 bg-background border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteFolderMutation.isPending}
                                    className="flex-1 py-2 bg-destructive text-white font-medium rounded-lg hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2 text-xs"
                                >
                                    {deleteFolderMutation.isPending ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3 h-3" />
                                    )}
                                    Confirm Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
