'use client';

import React, { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface RelationshipLabelsProps {
    links: any[];
    nodeMap: Map<string, any>;
    focusNodeId: string | null;
    focusNodeIds?: Set<string>;
    selectedNodes: string[];
}

export function RelationshipLabels({
    links = [],
    nodeMap = new Map(),
    focusNodeId = null,
    focusNodeIds = new Set(),
    selectedNodes = []
}: RelationshipLabelsProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const activeLabels = useMemo(() => {
        const safeLinks = Array.isArray(links) ? links : [];
        const safeNodeMap = nodeMap instanceof Map ? nodeMap : new Map();
        if (safeLinks.length === 0 || safeNodeMap.size === 0 || !mounted) return [];

        const safeSelected = Array.isArray(selectedNodes) ? selectedNodes : [];
        const focusIds = focusNodeId ? [focusNodeId] : safeSelected;

        return safeLinks.filter(link => {
            if (!link || !link.source || !link.target) return false;
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            if (!sourceId || !targetId) return false;
            // Show label if directly connected to focus node OR if both nodes are in the focus path
            const isDirectFocus = focusIds.includes(sourceId) || focusIds.includes(targetId);
            const isPathFocus = focusNodeIds.has(sourceId) && focusNodeIds.has(targetId);
            return isDirectFocus || isPathFocus;
        }).map((link, i) => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            const source = safeNodeMap.get(sourceId);
            const target = safeNodeMap.get(targetId);

            if (!source || !target || typeof source.x !== 'number' || typeof target.x !== 'number') return null;

            const mid = new THREE.Vector3(
                ((source.x || 0) + (target.x || 0)) / 2,
                ((source.y || 0) + (target.y || 0)) / 2 + 8,
                ((source.z || 0) + (target.z || 0)) / 2
            );

            return {
                id: `html-label-${sourceId}-${targetId}-${i}`,
                position: mid,
                text: link.type || 'RELATES_TO',
            };
        }).filter((n): n is any => n !== null);
    }, [links, nodeMap, focusNodeId, focusNodeIds, selectedNodes, mounted]);

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
