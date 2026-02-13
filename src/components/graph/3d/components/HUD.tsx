'use client';

import React from 'react';
import { useSSE, PHASE_LABELS } from '@/hooks/useSSE';

export function IngestionProgressHUD() {
    const { ingestionProgress = {} } = useSSE();
    const safeProgress = ingestionProgress || {};
    const activeTasks = Object.values(safeProgress).filter((p: any) => p && p.progress < 100);

    if (activeTasks.length === 0) return null;

    return (
        <div className="absolute top-20 right-4 flex flex-col gap-2 pointer-events-auto z-50">
            {activeTasks.map((task: any) => {
                if (!task || !task.file_id) return null;
                return (
                    <div key={task.file_id} className="p-3 bg-background/40 backdrop-blur-xl border border-white/10 rounded-xl w-64 shadow-2xl animate-in slide-in-from-right-full">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-emerald uppercase tracking-tighter">AI Ingestion</span>
                            <span className="text-[10px] text-foreground/50">{task.progress || 0}%</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-emerald transition-all duration-500" style={{ width: `${task.progress || 0}%` }} />
                        </div>
                        <p className="text-[11px] text-foreground/80 truncate">{PHASE_LABELS[task.phase] || task.phase || 'Processing...'}</p>
                    </div>
                );
            })}
        </div>
    );
}
