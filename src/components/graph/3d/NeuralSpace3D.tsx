/**
 * 3D Neural Space Visualization
 * 
 * Immersive 3D graph visualization using Three.js via react-three-fiber.
 * Modular architecture with separated components for Nodes, Links, and Camera logic.
 */
'use client';


import React, { useMemo, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
// EffectComposer temporarily disabled due to initialization crash
// import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GraphNode, GraphLink } from '@/store/graphStore';
import { useWebSocket } from '@/hooks/useWebSocket';

// Modular Components
import { InstancedNodes } from './components/Nodes';
import { RelationshipLinks } from './components/Links';
import { CameraManager } from './components/Camera';
import { NeuralAtmosphere } from './components/Atmosphere';
import { IngestionProgressHUD } from './components/HUD';
import { NODE_TYPE_COLORS } from '../types';

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

// Simplified Scene that includes post-processing for better lifecycle sync
function Scene(props: NeuralSpace3DProps & { nodeGeometry: THREE.BufferGeometry, pulseGeometry: THREE.BufferGeometry, isMounted: boolean }) {
    const {
        nodes = [],
        links = [],
        selectedNodes = [],
        hoveredNode,
        nodeGeometry,
        pulseGeometry,
        folderId,
        isMounted
    } = props;

    const nodesWithPositions = useMemo(() => {
        if (!Array.isArray(nodes) || nodes.length === 0) return [];
        const spread = 250;
        const folderGroups = new Map<string, any[]>();

        // Group nodes by folder
        nodes.forEach(n => {
            if (!n) return;
            const fid = n.folderId || 'global';
            if (!folderGroups.has(fid)) folderGroups.set(fid, []);
            folderGroups.get(fid)!.push(n);
        });

        const groups = Array.from(folderGroups.entries());
        const islandSpread = 2000;

        return groups.flatMap(([fid, groupNodes], gIdx) => {
            const groupSize = groupNodes.length;
            if (groupSize === 0) return [];

            const angle = (gIdx / Math.max(groups.length, 1)) * Math.PI * 2;
            const islandRadius = groups.length > 1 ? islandSpread * (1.2 + Math.floor(gIdx / 5)) : 0;
            const cx = Math.cos(angle) * islandRadius;
            const cy = groups.length > 1 ? (gIdx % 3 - 1) * spread * 2 : 0;
            const cz = Math.sin(angle) * islandRadius;

            return groupNodes.map((node, i) => {
                // If node already has valid coordinates, use them
                if (typeof node.x === 'number' && isFinite(node.x) &&
                    typeof node.y === 'number' && isFinite(node.y) &&
                    typeof node.z === 'number' && isFinite(node.z)) {
                    return node;
                }

                const phiIdx = 1 - 2 * (i + 0.5) / groupSize;
                const phi = Math.acos(Math.max(-1, Math.min(1, phiIdx)));
                const theta = Math.PI * (1 + Math.sqrt(5)) * i;
                const r = spread * (0.5 + Math.sqrt(i / groupSize) * 0.8);

                const x = cx + r * Math.sin(phi) * Math.cos(theta);
                const y = cy + r * Math.sin(phi) * Math.sin(theta);
                const z = cz + r * Math.cos(phi);

                return {
                    ...node,
                    x: isFinite(x) ? x : 0,
                    y: isFinite(y) ? y : 0,
                    z: isFinite(z) ? z : 0,
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

    const focusNodeId = hoveredNode || (Array.isArray(selectedNodes) && selectedNodes.length === 1 ? selectedNodes[0] : null);

    return (
        <group onPointerMissed={() => props.onBackgroundClick()}>
            <NeuralAtmosphere isDark={props.isDark ?? true} color={props.bgColor ?? '#0A0C10'} />
            <CameraManager
                targetNodeId={Array.isArray(selectedNodes) && selectedNodes.length === 1 ? selectedNodes[0] : null}
                nodeMap={nodeMap}
                defaultCenter={graphCenter}
            />

            <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.05}
                minDistance={50}
                maxDistance={4000}
            />

            <RelationshipLinks links={Array.isArray(links) ? links : []} nodeMap={nodeMap} focusNodeId={focusNodeId} pulseGeometry={pulseGeometry} />
            <InstancedNodes
                nodes={nodesWithPositions}
                selectedNodes={Array.isArray(selectedNodes) ? selectedNodes : []}
                hoveredNode={hoveredNode}
                onNodeClick={props.onNodeClick}
                onNodeHover={props.onNodeHover}
                nodeGeometry={nodeGeometry}
            />

            {/* Relationship Labels - ALWAYS show for ALL links in Neo4j style */}
            {(Array.isArray(links) ? links : [])
                .map((link, i) => {
                    if (!link || !link.source || !link.target) return null;
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const s = nodeMap.get(sourceId);
                    const t = nodeMap.get(targetId);
                    if (!s || !t) return null;

                    return (
                        <Html key={`link-label-${i}`} position={[(s.x + t.x) / 2, ((s.y + t.y) / 2), (s.z + t.z) / 2]} center distanceFactor={400} style={{ pointerEvents: 'none' }}>
                            <div className="px-2 py-0.5 rounded shadow-xl bg-slate-900 border border-white/20 text-[10px] font-bold text-white uppercase tracking-tight whitespace-nowrap">
                                {link.type}
                            </div>
                        </Html>
                    );
                })}

            {/* Neo4j-style Node Circles with Names Inside */}
            {nodesWithPositions.map(node => {
                const isSelected = Array.isArray(selectedNodes) && selectedNodes.includes(node.id);
                const isHovered = hoveredNode === node.id;
                const nodeColor = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;

                // Scale sizes to match Neo4j vibe
                const size = isSelected ? 80 : isHovered ? 70 : 60;

                return (
                    <Html
                        key={`neo-node-${node.id}`}
                        position={[node.x!, node.y!, node.z!]}
                        center
                        distanceFactor={400}
                        style={{ pointerEvents: 'auto', zIndex: isSelected || isHovered ? 10 : 1 }}
                    >
                        <div
                            onClick={(e) => { e.stopPropagation(); props.onNodeClick(node.id, e); }}
                            onDoubleClick={(e) => { e.stopPropagation(); props.onNodeDoubleClick(node.id); }}
                            onMouseEnter={() => props.onNodeHover(node.id)}
                            onMouseLeave={() => props.onNodeHover(null)}
                            className={`
                                relative flex items-center justify-center rounded-full
                                border-[4px] shadow-2xl cursor-pointer
                                transition-all duration-300 ease-out
                                select-none
                                ${isSelected ? 'ring-4 ring-white/40 scale-110' : ''}
                                ${isHovered && !isSelected ? 'ring-2 ring-white/20 scale-105' : ''}
                            `}
                            style={{
                                width: size,
                                height: size,
                                backgroundColor: nodeColor,
                                borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)',
                                boxShadow: isSelected
                                    ? `0 0 40px ${nodeColor}, inset 0 0 15px rgba(0,0,0,0.2)`
                                    : `0 8px 16px rgba(0,0,0,0.3), inset 0 0 5px rgba(0,0,0,0.1)`,
                            }}
                        >
                            {/* Inner label */}
                            <div className="text-white text-center flex flex-col items-center justify-center pointer-events-none px-2 w-full h-full">
                                <span className="text-[10px] font-black leading-tight tracking-tight drop-shadow-md break-all overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                    {node.name}
                                </span>
                            </div>

                            {/* Type badge above node on hover */}
                            {(isHovered || isSelected) && (
                                <div className="absolute -top-7 px-2 py-0.5 rounded-full bg-slate-900/90 text-[8px] font-bold text-white whitespace-nowrap border border-white/20 shadow-lg">
                                    {node.type}
                                </div>
                            )}
                        </div>
                        {/* Type badge below node (Default visible) */}
                        <div
                            className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-wide whitespace-nowrap"
                            style={{
                                backgroundColor: `${nodeColor}20`,
                                color: isSelected ? '#fff' : nodeColor,
                                border: `1px solid ${nodeColor}40`,
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            {node.type}
                        </div>
                    </Html>
                );
            })}
            {/* Post-processing temporarily disabled - using enhanced materials instead */}
        </group>
    );
}

export function NeuralSpace3D(props: NeuralSpace3DProps) {
    const { nodes = [], links = [], selectedNodes = [] } = props;
    const [isDark, setIsDark] = useState(true);
    const [mounted, setMounted] = useState(false);
    const nodeGeometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
    const pulseGeometry = useMemo(() => new THREE.SphereGeometry(0.8, 16, 16), []);

    useEffect(() => {
        setMounted(true);
        const checkDark = () => {
            if (typeof document !== 'undefined') {
                setIsDark(document.documentElement.classList.contains('dark'));
            }
        };
        checkDark();
        const obs = new MutationObserver(checkDark);
        if (typeof document !== 'undefined') {
            obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        }
        return () => {
            obs.disconnect();
            nodeGeometry.dispose();
            pulseGeometry.dispose();
        };
    }, [nodeGeometry, pulseGeometry]);

    const sceneBgColor = isDark ? '#05070A' : '#F8FAFC';
    const glConfig = useMemo(() => ({
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance' as const,
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: false
    }), []);
    const cameraConfig = useMemo(() => ({ position: [0, 100, 1000] as [number, number, number], fov: 60 }), []);

    return (
        <div className="w-full h-full relative" style={{ backgroundColor: sceneBgColor }}>
            <IngestionProgressHUD />
            <Canvas shadows={false} camera={cameraConfig} gl={glConfig} dpr={[1, 1.5]}>
                <color attach="background" args={[sceneBgColor]} />
                <Scene
                    {...props}
                    nodes={Array.isArray(nodes) ? nodes : []}
                    links={Array.isArray(links) ? links : []}
                    selectedNodes={Array.isArray(selectedNodes) ? selectedNodes : []}
                    isDark={isDark}
                    bgColor={sceneBgColor}
                    nodeGeometry={nodeGeometry}
                    pulseGeometry={pulseGeometry}
                    isMounted={mounted}
                />
            </Canvas>
            <div className="absolute bottom-4 left-4 z-10 p-3 rounded-lg border border-white/5 bg-background/40 backdrop-blur-xl max-w-xs pointer-events-none">
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-1">3D Neural Space</p>
                <p className="text-[11px] text-foreground/70 leading-relaxed">Zoom to explore. Drag to rotate. <span className="text-white font-medium">Click & Drag nodes to rearrange.</span></p>
            </div>
        </div>
    );
}
