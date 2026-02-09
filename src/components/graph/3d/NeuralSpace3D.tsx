/**
 * 3D Neural Space Visualization
 * 
 * Immersive 3D graph visualization using Three.js via react-three-fiber.
 * Modular architecture with separated components for Nodes, Links, and Camera logic.
 */
'use client';


import React, { useMemo, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Billboard, Text } from '@react-three/drei';
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
interface SceneProps extends NeuralSpace3DProps {
    nodeGeometry: THREE.BufferGeometry;
    pulseGeometry: THREE.BufferGeometry;
    isMounted: boolean;
    setOrbitEnabled: (enabled: boolean) => void;
    orbitEnabled: boolean;
    d3AlphaDecay?: number;
    d3VelocityDecay?: number;
}

function Scene(props: SceneProps) {
    const {
        nodes = [],
        links = [],
        selectedNodes = [],
        hoveredNode,
        nodeGeometry,
        pulseGeometry,
        folderId,
        isMounted,
        setOrbitEnabled,
        orbitEnabled
    } = props;

    const nodesWithPositions = useMemo(() => {
        if (!Array.isArray(nodes) || nodes.length === 0) return [];

        // Calculate degrees first
        const degreeMap = new Map<string, number>();
        links.forEach(link => {
            const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const t = typeof link.target === 'object' ? (link.target as any).id : link.target;
            degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
            degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
        });

        const spread = 250;
        const folderGroups = new Map<string, any[]>();

        // Group nodes by folder
        nodes.forEach(n => {
            if (!n) return;
            const fid = n.folderId || 'global';
            if (!folderGroups.get(fid)) folderGroups.set(fid, []);
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
                const degree = degreeMap.get(node.id) || 0;

                // If node already has valid coordinates, use them
                let baseNode = node;
                if (!(typeof node.x === 'number' && isFinite(node.x) &&
                    typeof node.y === 'number' && isFinite(node.y) &&
                    typeof node.z === 'number' && isFinite(node.z))) {
                    const phiIdx = 1 - 2 * (i + 0.5) / groupSize;
                    const phi = Math.acos(Math.max(-1, Math.min(1, phiIdx)));
                    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
                    const r = spread * (0.5 + Math.sqrt(i / groupSize) * 0.8);

                    const x = cx + r * Math.sin(phi) * Math.cos(theta);
                    const y = cy + r * Math.sin(phi) * Math.sin(theta);
                    const z = cz + r * Math.cos(phi);

                    baseNode = {
                        ...node,
                        x: isFinite(x) ? x : 0,
                        y: isFinite(y) ? y : 0,
                        z: isFinite(z) ? z : 0,
                    };
                }

                return { ...baseNode, degree };
            });
        });
    }, [nodes, links]);

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
                enabled={orbitEnabled}
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
                onDragStart={() => setOrbitEnabled(false)}
                onDragEnd={() => setOrbitEnabled(true)}
            />

            {/* High Performance Labels - Switched to Html for stability */}
            {nodesWithPositions.map(node => {
                const isSelected = Array.isArray(selectedNodes) && selectedNodes.includes(node.id);
                const isHovered = hoveredNode === node.id;

                // LOD: Only show labels for important nodes or if interacted
                const isLargeGraph = nodesWithPositions.length > 80;
                const showLabel = isSelected || isHovered || (node.degree || 0) > (isLargeGraph ? 8 : 1);

                if (!showLabel) return null;

                return (
                    <Html
                        key={`label-${node.id}`}
                        position={[node.x!, node.y! + 12, node.z!]}
                        center
                        distanceFactor={400} // Perspective scaling
                        style={{
                            pointerEvents: 'none',
                            userSelect: 'none',
                        }}
                    >
                        <div className={`
                            px-3 py-1 rounded-full border border-white/20 backdrop-blur-md font-bold text-[11px] whitespace-nowrap
                            ${isSelected ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' : 'bg-black/60 text-white/90'}
                            transition-all duration-300
                        `}>
                            {node.name}
                        </div>
                    </Html>
                );
            })}
        </group>
    );
}

export function NeuralSpace3D(props: NeuralSpace3DProps) {
    const { nodes = [], links = [], selectedNodes = [] } = props;
    const [isDark, setIsDark] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [orbitEnabled, setOrbitEnabled] = useState(true);

    // SSR Guard: Prevent any execution during server-side rendering
    if (typeof window === 'undefined') {
        return <div className="w-full h-full bg-[#05070A]" />;
    }

    // Higher fidelity geometries for "Super Shape" look
    const nodeGeometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
    const pulseGeometry = useMemo(() => new THREE.SphereGeometry(0.8, 24, 24), []);

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
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance' as const,
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
        precision: 'highp' as const
    }), []);
    const cameraConfig = useMemo(() => ({ position: [0, 100, 1000] as [number, number, number], fov: 60 }), []);

    return (
        <div className="w-full h-full relative" style={{ backgroundColor: sceneBgColor }}>
            <IngestionProgressHUD />
            <Canvas
                shadows={false}
                camera={cameraConfig}
                gl={glConfig}
                dpr={[1, 2]}
            >
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
                    setOrbitEnabled={setOrbitEnabled}
                    orbitEnabled={orbitEnabled}
                    d3AlphaDecay={0.05}
                    d3VelocityDecay={0.6}
                />
            </Canvas>
            <div className="absolute bottom-4 left-4 z-10 p-3 rounded-lg border border-white/5 bg-background/40 backdrop-blur-xl max-w-xs pointer-events-none">
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-1">3D Neural Space</p>
                <p className="text-[11px] text-foreground/70 leading-relaxed">Zoom to explore. Drag to rotate. <span className="text-white font-medium">Click & Drag nodes to rearrange.</span></p>
            </div>
        </div>
    );
}
