/**
 * 3D Neural Space Visualization
 * 
 * Immersive 3D graph visualization using Three.js via react-three-fiber.
 * Modular architecture with separated components for Nodes, Links, and Camera logic.
 */
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode, GraphLink } from '@/store/graphStore';
import { useWebSocket } from '@/hooks/useWebSocket';

// Modular Components
import { InstancedNodes } from './components/Nodes';
import { RelationshipLinks } from './components/Links';
import { CameraManager } from './components/Camera';
import { NeuralAtmosphere } from './components/Atmosphere';
import { IngestionProgressHUD } from './components/HUD';

interface NeuralSpace3DProps {
    nodes: GraphNode[];
    links: GraphLink[];
    selectedNodes: string[];
    hoveredNode: string | null;
    onNodeClick: (nodeId: string, event?: any) => void;
    onNodeDoubleClick: (nodeId: string) => void;
    onNodeHover: (nodeId: string | null) => void;
    onBackgroundClick: () => void;
    onNodeContextMenu?: (nodeId: string, x: number, y: number) => void;
    folderId?: string;
    isDark?: boolean;
    bgColor?: string;
}

function Scene(props: NeuralSpace3DProps & { nodeGeometry: THREE.BufferGeometry, pulseGeometry: THREE.BufferGeometry }) {
    const { nodes, links, selectedNodes, hoveredNode, nodeGeometry, pulseGeometry, folderId } = props;

    const wsOptions = useMemo(() => ({ folderId }), [folderId]);
    const { lastMessage } = useWebSocket(wsOptions);

    useEffect(() => {
        if (lastMessage?.type === 'node_updated') console.log('[3D Sync] Live update:', lastMessage.payload);
    }, [lastMessage]);

    const nodesWithPositions = useMemo(() => {
        const spread = 250;
        const folderGroups = new Map<string, any[]>();
        nodes.forEach(n => {
            const fid = n.folderId || 'global';
            if (!folderGroups.has(fid)) folderGroups.set(fid, []);
            folderGroups.get(fid)!.push(n);
        });

        const groups = Array.from(folderGroups.entries());
        const islandSpread = 2000;

        return groups.flatMap(([fid, groupNodes], gIdx) => {
            const angle = (gIdx / Math.max(groups.length, 1)) * Math.PI * 2;
            const islandRadius = groups.length > 1 ? islandSpread * (1.2 + Math.floor(gIdx / 5)) : 0;
            const cx = Math.cos(angle) * islandRadius;
            const cy = groups.length > 1 ? (gIdx % 3 - 1) * spread * 2 : 0;
            const cz = Math.sin(angle) * islandRadius;

            return groupNodes.map((node, i) => {
                const phi = Math.acos(1 - 2 * (i + 0.5) / groupNodes.length);
                const theta = Math.PI * (1 + Math.sqrt(5)) * i;
                const r = spread * (0.5 + Math.sqrt(i / groupNodes.length) * 0.8);

                return {
                    ...node,
                    x: cx + r * Math.sin(phi) * Math.cos(theta),
                    y: cy + r * Math.sin(phi) * Math.sin(theta),
                    z: cz + r * Math.cos(phi),
                };
            });
        });
    }, [nodes]);

    const nodeMap = useMemo(() => new Map(nodesWithPositions.map(n => [n.id, n])), [nodesWithPositions]);

    const graphCenter = useMemo(() => {
        if (nodesWithPositions.length === 0) return new THREE.Vector3(0, 0, 0);
        const sum = nodesWithPositions.reduce((acc, n) => {
            acc.x += n.x!; acc.y += n.y!; acc.z += n.z!;
            return acc;
        }, { x: 0, y: 0, z: 0 });
        return new THREE.Vector3(
            sum.x / nodesWithPositions.length,
            sum.y / nodesWithPositions.length,
            sum.z / nodesWithPositions.length
        );
    }, [nodesWithPositions]);

    const focusNodeId = hoveredNode || (selectedNodes.length === 1 ? selectedNodes[0] : null);

    return (
        <group onPointerMissed={() => props.onBackgroundClick()}>
            <NeuralAtmosphere isDark={props.isDark ?? true} color={props.bgColor ?? '#0A0C10'} />
            <CameraManager
                targetNodeId={selectedNodes.length === 1 ? selectedNodes[0] : null}
                nodeMap={nodeMap}
                defaultCenter={graphCenter}
            />
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={50} maxDistance={4000} />
            <RelationshipLinks links={links} nodeMap={nodeMap} focusNodeId={focusNodeId} pulseGeometry={pulseGeometry} />
            <InstancedNodes
                nodes={nodesWithPositions}
                selectedNodes={selectedNodes}
                hoveredNode={hoveredNode}
                onNodeClick={props.onNodeClick}
                onNodeHover={props.onNodeHover}
                nodeGeometry={nodeGeometry}
            />
            {/* Relationship Labels (Midpoint of lines) */}
            {links
                .filter(link => {
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    // Only show link labels for the focused cluster to avoid clutter
                    return sourceId === focusNodeId || targetId === focusNodeId || selectedNodes.includes(sourceId) || selectedNodes.includes(targetId);
                })
                .map((link, i) => {
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const s = nodeMap.get(sourceId);
                    const t = nodeMap.get(targetId);
                    if (!s || !t) return null;

                    const midpoint: [number, number, number] = [
                        (s.x + t.x) / 2,
                        ((s.y + t.y) / 2) + 2,
                        (s.z + t.z) / 2
                    ];

                    return (
                        <Html key={`link-label-${i}`} position={midpoint} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
                            <div className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-white/90 text-[8px] font-medium whitespace-nowrap uppercase tracking-tighter">
                                {link.type}
                            </div>
                        </Html>
                    );
                })}

            {/* Node Labels */}
            {nodesWithPositions
                .filter(n => {
                    // Show labels for:
                    // 1. Selected or Hovered nodes (Always)
                    // 2. High degree nodes (Global context)
                    // 3. All nodes if the total count is small
                    return selectedNodes.includes(n.id) || hoveredNode === n.id || (n.degree || 0) > 3 || nodes.length < 50;
                })
                .map(node => (
                    <Html key={`label-${node.id}`} position={[node.x!, node.y! + 12, node.z!]} center distanceFactor={15} style={{ pointerEvents: 'none' }}>
                        <div className={`px-2 py-1 rounded backdrop-blur-md border text-[10px] font-bold whitespace-nowrap shadow-2xl transition-all duration-300 ${selectedNodes.includes(node.id) || hoveredNode === node.id
                                ? 'bg-emerald/90 border-emerald text-white scale-110'
                                : 'bg-background/80 border-border text-foreground opacity-70'
                            }`}>
                            {node.name}
                        </div>
                    </Html>
                ))}
        </group>
    );
}

export function NeuralSpace3D(props: NeuralSpace3DProps) {
    const [isDark, setIsDark] = useState(true);
    const nodeGeometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
    const pulseGeometry = useMemo(() => new THREE.SphereGeometry(0.8, 8, 8), []);

    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => {
            obs.disconnect();
            nodeGeometry.dispose();
            pulseGeometry.dispose();
        };
    }, [nodeGeometry, pulseGeometry]);

    const sceneBgColor = isDark ? '#0A0C10' : '#F8FAFC';
    const glConfig = useMemo(() => ({ antialias: true, alpha: false, powerPreference: 'high-performance' as const }), []);
    const cameraConfig = useMemo(() => ({ position: [0, 100, 1000] as [number, number, number], fov: 60 }), []);

    return (
        <div className="w-full h-full relative" style={{ backgroundColor: sceneBgColor }}>
            <IngestionProgressHUD />
            <Canvas shadows={false} camera={cameraConfig} gl={glConfig} dpr={[1, 2]}>
                <color attach="background" args={[sceneBgColor]} />
                <Scene {...props} isDark={isDark} bgColor={sceneBgColor} nodeGeometry={nodeGeometry} pulseGeometry={pulseGeometry} />
            </Canvas>
            <div className="absolute bottom-4 left-4 z-10 p-3 rounded-lg border border-white/5 bg-background/40 backdrop-blur-xl max-w-xs pointer-events-none">
                <p className="text-[10px] text-emerald uppercase tracking-widest font-bold mb-1">3D Neural Space</p>
                <p className="text-[11px] text-foreground/70 leading-relaxed">Zoom to explore. Drag to rotate. Grab nodes to move.</p>
            </div>
        </div>
    );
}
