'use client';

import React, { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface RelationshipLabelsProps {
    links: any[];
    nodeMap: Map<string, any>;
    focusNodeId: string | null;
    selectedNodes: string[];
}

export function RelationshipLabels({
    links = [],
    nodeMap = new Map(),
    focusNodeId = null,
    selectedNodes = []
}: RelationshipLabelsProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const activeLabels = useMemo(() => {
        if (!Array.isArray(links) || !nodeMap || !mounted) return [];

        const safeSelected = Array.isArray(selectedNodes) ? selectedNodes : [];
        const hasFocus = focusNodeId || safeSelected.length > 0;
        const focusIds = focusNodeId ? [focusNodeId] : safeSelected;

        return links.filter(link => {
            if (!link) return false;
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            // Only show labels for focused connections to reduce clutter
            return focusIds.includes(sourceId) || focusIds.includes(targetId);
        }).map((link, i) => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            const source = nodeMap.get(sourceId);
            const target = nodeMap.get(targetId);

            if (!source || !target) return null;
            if (typeof source.x !== 'number' || typeof target.x !== 'number') return null;

            const mid = new THREE.Vector3(
                (source.x + target.x) / 2,
                (source.y + target.y) / 2 + 8,
                (source.z + target.z) / 2
            );

            return {
                id: `html-label-${sourceId}-${targetId}-${i}`,
                position: mid,
                text: link.type || 'RELATES_TO',
            };
        }).filter((n): n is any => n !== null);
    }, [links, nodeMap, focusNodeId, selectedNodes, mounted]);

    if (!mounted || !Array.isArray(activeLabels)) return null;

    return (
        <group>
            {activeLabels.map((label: any) => (
                <Html
                    key={label.id}
                    position={label.position}
                    center
                    distanceFactor={500}
                    style={{ pointerEvents: 'none' }}
                >
                    {/* Premium Low-Profile Label (No Dabba!) */}
                    <div className="pointer-events-none select-none">
                        <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] whitespace-nowrap drop-shadow-lg filter blur-[0.2px]">
                            {label.text}
                        </span>
                    </div>
                </Html>
            ))}
        </group>
    );
}
