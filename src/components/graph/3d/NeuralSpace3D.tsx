/**
 * 3D Neural Space Visualization
 * 
 * Immersive 3D graph visualization using Three.js via react-three-fiber.
 * Modular architecture with separated components for Nodes, Links, and Camera logic.
 */
'use client';


import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SphereGeometry } from 'three';
import { GraphNode, GraphLink } from '@/store/graphStore';
import { useWebSocket } from '@/hooks/useWebSocket';

// Modular Components
import { InstancedNodes } from './components/Nodes';
import { RelationshipLinks } from './components/Links';
import { CameraManager } from './components/Camera';
import { NeuralAtmosphere } from './components/Atmosphere';
import { IngestionProgressHUD } from './components/HUD';
import { RelationshipLabels } from './components/RelationshipLabels';
import { NODE_TYPE_COLORS } from '../types';
import { useFrame } from '@react-three/fiber';

// Stable Geometries - Define outside to prevent re-creation and "HotReload" warnings
const STABLE_NODE_GEOMETRY = new SphereGeometry(1, 48, 48);
const STABLE_PULSE_GEOMETRY = new SphereGeometry(0.8, 32, 32);
const STABLE_BG_COLOR_DARK = '#05070A';
const STABLE_BG_COLOR_LIGHT = '#F8FAFC';

/**
 * Isolated Post-Processing Guard
 * Uses useEffect (not useFrame) to prevent "setState during render" warnings.
 * Delays mounting until the WebGL state has stabilized.
 */
function StablePostProcessing() {
    const { gl, camera } = useThree();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!gl || !camera) return;

        // Delay initialization slightly to let the WebGL context fully mature and prevent race conditions
        const timer = setTimeout(() => {
            // Final check that context is still valid before signaling ready
            if (gl.getContext()) {
                setReady(true);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            setReady(false);
        };
    }, [gl, camera]);

    // Only render EffectComposer when we are absolutely ready
    if (!ready) return null;

    return (
        <EffectComposer multisampling={0} key="neural-effect-composer">
            <Bloom
                intensity={0.4}
                luminanceThreshold={0.2}
                luminanceSmoothing={0.9}
                radius={0.3}
            />
        </EffectComposer>
    );
}

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
    resetKey?: number;
    analyticSelectionActive?: boolean;
    analyticIncludeNeighbors?: boolean;
}

// Simplified Scene that includes post-processing for better lifecycle sync
interface SceneProps extends NeuralSpace3DProps {
    nodeGeometry: THREE.BufferGeometry;
    pulseGeometry: THREE.BufferGeometry;
    setOrbitEnabled: (enabled: boolean) => void;
    orbitEnabled: boolean;
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
        setOrbitEnabled,
        orbitEnabled
    } = props;


    const nodesWithPositions = useMemo(() => {
        const safeNodes = Array.isArray(nodes) ? nodes : [];
        const safeLinks = Array.isArray(links) ? links : [];
        if (safeNodes.length === 0) return [];

        // Hub-based Organic Layout (Restored for distinctive 3D structure)
        const typeHubs = new Map<string, THREE.Vector3>();
        const spreadFactor = 200; // Keep it compact

        const seededRandom = (seed: number) => {
            const x = Math.sin(seed || 0) * 10000;
            return x - Math.floor(x);
        };

        const typesSet = new Set<string>();
        const degreeMap = new Map<string, number>();

        // Pre-calculate degrees and unique types
        for (let i = 0; i < safeLinks.length; i++) {
            const l = safeLinks[i];
            if (!l) continue;
            const s = l.source && typeof l.source === 'object' ? (l.source as any).id : l.source;
            const t = l.target && typeof l.target === 'object' ? (l.target as any).id : l.target;
            if (s) degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
            if (t) degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
        }

        for (let i = 0; i < safeNodes.length; i++) {
            const n = safeNodes[i];
            if (n) typesSet.add(n.type || 'default');
        }

        const types = Array.from(typesSet);
        const typesCount = Math.max(1, types.length);
        types.forEach((type, i) => {
            const angle = (i / typesCount) * Math.PI * 2;
            const r = spreadFactor * (0.8 + seededRandom(i) * 1.5);
            typeHubs.set(type, new THREE.Vector3(
                Math.cos(angle) * r,
                (seededRandom(i + 10) - 0.5) * spreadFactor,
                Math.sin(angle) * r
            ));
        });

        // Final mapping into distinctive 3D clusters
        return safeNodes.map((node, i) => {
            if (!node || !node.id) return null;

            // PERSISTENCE: preserve coordinates if they exist
            if (typeof node.x === 'number' && isFinite(node.x) &&
                typeof node.y === 'number' && isFinite(node.y) &&
                typeof node.z === 'number' && isFinite(node.z) &&
                (node.x !== 0 || node.y !== 0 || node.z !== 0)) {
                return { ...node, degree: degreeMap.get(node.id) || 0 };
            }

            const hub = typeHubs.get(node.type || 'default') || new THREE.Vector3(0, 0, 0);
            const degree = degreeMap.get(node.id) || 0;
            const phi = seededRandom(i * 3) * Math.PI * 2;
            const theta = Math.acos(2 * seededRandom(i * 7) - 1);
            const r = 60 + seededRandom(i * 11) * 120; // Tighter organic clustering

            return {
                ...node,
                x: hub.x + r * Math.sin(theta) * Math.cos(phi),
                y: hub.y + r * Math.sin(theta) * Math.sin(phi),
                z: hub.z + r * Math.cos(theta),
                degree
            };
        }).filter((n): n is any => n !== null);
    }, [nodes, links]); // Reduced dependencies to prevent layout jumps

    const nodeMap = useMemo(() => new Map(nodesWithPositions.map(n => [n.id, n])), [nodesWithPositions]);

    const graphCenter = useMemo(() => {
        const safeNodes = Array.isArray(nodesWithPositions) ? nodesWithPositions : [];
        if (safeNodes.length === 0) return new THREE.Vector3(0, 0, 0);
        const center = new THREE.Vector3(0, 0, 0);
        for (let i = 0; i < safeNodes.length; i++) {
            const n = safeNodes[i];
            if (n) {
                center.x += n.x; center.y += n.y; center.z += n.z;
            }
        }
        return center.divideScalar(safeNodes.length);
    }, [nodesWithPositions]);

    const graphRadius = useMemo(() => {
        const safeNodes = Array.isArray(nodesWithPositions) ? nodesWithPositions : [];
        if (safeNodes.length === 0) return 0;
        let maxDistSq = 0;
        for (const n of safeNodes) {
            const distSq = n.x * n.x + n.y * n.y + n.z * n.z;
            if (distSq > maxDistSq) maxDistSq = distSq;
        }
        return Math.sqrt(maxDistSq);
    }, [nodesWithPositions]);

    const focusNodeId = hoveredNode || (Array.isArray(selectedNodes) && selectedNodes.length === 1 ? selectedNodes[0] : null);

    if (nodesWithPositions.length === 0) return null;

    return (
        <group onPointerMissed={() => props.onBackgroundClick()}>
            <NeuralAtmosphere isDark={props.isDark ?? true} color={props.bgColor ?? '#0A0C10'} />
            <CameraManager
                targetNodeId={Array.isArray(selectedNodes) && selectedNodes.length === 1 ? selectedNodes[0] : null}
                nodeMap={nodeMap}
                defaultCenter={graphCenter}
                graphRadius={graphRadius}
                resetKey={props.resetKey}
            />

            <OrbitControls
                makeDefault
                enabled={orbitEnabled}
                enableDamping
                dampingFactor={0.05}
                minDistance={10}
                maxDistance={10000}
                rotateSpeed={0.8}
                zoomSpeed={1.5}
                screenSpacePanning={true}
            />

            <RelationshipLinks
                links={Array.isArray(links) ? links : []}
                nodeMap={nodeMap}
                focusNodeId={focusNodeId}
                pulseGeometry={pulseGeometry}
                selectedNodes={Array.isArray(selectedNodes) ? selectedNodes : []}
                analyticSelectionActive={props.analyticSelectionActive}
            />
            <InstancedNodes
                nodes={Array.isArray(nodesWithPositions) ? nodesWithPositions : []}
                links={Array.isArray(links) ? links : []}
                selectedNodes={Array.isArray(selectedNodes) ? selectedNodes : []}
                hoveredNode={hoveredNode}
                onNodeClick={props.onNodeClick}
                onNodeDoubleClick={props.onNodeDoubleClick}
                onNodeHover={props.onNodeHover}
                onNodeContextMenu={props.onNodeContextMenu}
                onDragStart={() => setOrbitEnabled(false)}
                onDragEnd={() => setOrbitEnabled(true)}
                analyticSelectionActive={props.analyticSelectionActive}
                analyticIncludeNeighbors={props.analyticIncludeNeighbors}
                nodeGeometry={nodeGeometry}
            />
            {(Array.isArray(nodesWithPositions) && nodesWithPositions.length > 0) && (
                <RelationshipLabels
                    links={Array.isArray(links) ? links : []}
                    nodeMap={nodeMap}
                    focusNodeId={focusNodeId}
                    selectedNodes={Array.isArray(selectedNodes) ? selectedNodes : []}
                />
            )}

            {/* Premium Neural Node Labels (Clean, No Interactivity Block) */}
            {Array.isArray(nodesWithPositions) && nodesWithPositions.map(node => {
                if (!node || !node.id) return null;
                const safeSelected = Array.isArray(selectedNodes) ? selectedNodes : [];
                const isSelected = safeSelected.includes(node.id);
                const isHovered = hoveredNode === node.id;

                const safeNodes = Array.isArray(nodesWithPositions) ? nodesWithPositions : [];
                const isLargeGraph = safeNodes.length > 80;
                const showLabel = isSelected || isHovered || (node.degree || 0) > (isLargeGraph ? 8 : 1);

                if (!showLabel) return null;

                return (
                    <Html
                        key={`label-${node.id}`}
                        position={[node.x ?? 0, (node.y ?? 0) + 15, node.z ?? 0]}
                        center
                        distanceFactor={600}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                        <div className={`
                            pointer-events-none px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-xl font-bold text-[11px] uppercase tracking-widest whitespace-nowrap
                            ${isSelected
                                ? 'bg-primary/30 text-white scale-110 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                                : props.isDark
                                    ? 'bg-black/60 text-white/90 shadow-lg'
                                    : 'bg-white/90 text-slate-900 shadow-xl border-slate-200'}
                            transition-all duration-300
                        `}>
                            {isSelected || isHovered ? (node.name || 'Unknown') : ((node.name || '').length > 20 ? node.name.slice(0, 18) + '…' : (node.name || 'Unknown'))}
                        </div>
                    </Html>
                );
            })}

        </group>
    );
}

export function NeuralSpace3D(props: NeuralSpace3DProps) {
    const { nodes = [], links = [], selectedNodes = [] } = props;

    // SSR-Safe Initial Theme Detection (Atomic Initialization)
    // This prevents a rapid remount flip on initial load, which triggers the EffectComposer race condition.
    const [isDark, setIsDark] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return true;
    });

    const [mounted, setMounted] = useState(false);
    const [orbitEnabled, setOrbitEnabled] = useState(true);

    // Defensive GL Configuration for Post-Processing - Must be before early return
    const glConfig = useMemo(() => ({
        antialias: false,
        stencil: true,
        powerPreference: 'high-performance' as const,
        depth: true,
    }), []);

    const cameraConfig = useMemo(() => ({
        position: [0, 100, 1000] as [number, number, number],
        fov: 60,
        far: 10000
    }), []);

    // SSR & Theme Sync (Mounted state only)
    useEffect(() => {
        setMounted(true);

        const checkDark = () => {
            if (typeof document !== 'undefined') {
                setIsDark(document.documentElement.classList.contains('dark'));
            }
        };
        const obs = new MutationObserver(checkDark);
        if (typeof document !== 'undefined') {
            obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        }
        return () => obs.disconnect();
    }, []);

    // Scene Background Color
    const sceneBgColor = isDark ? STABLE_BG_COLOR_DARK : STABLE_BG_COLOR_LIGHT;

    if (!mounted || typeof window === 'undefined') {
        return <div className="w-full h-full bg-[#05070A]" />;
    }

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
                <ambientLight intensity={1.2} />
                <pointLight position={[50, 50, 50]} intensity={2} />
                {/* Defensive Scene Rendering */}
                <Scene
                    {...props}
                    nodes={Array.isArray(nodes) ? nodes : []}
                    links={Array.isArray(links) ? links : []}
                    selectedNodes={Array.isArray(selectedNodes) ? selectedNodes : []}
                    isDark={isDark}
                    bgColor={sceneBgColor}
                    nodeGeometry={STABLE_NODE_GEOMETRY}
                    pulseGeometry={STABLE_PULSE_GEOMETRY}
                    setOrbitEnabled={setOrbitEnabled}
                    orbitEnabled={orbitEnabled}
                />

                {/* Definitive Stability Layer */}
                <StablePostProcessing />

            </Canvas>
            <div className="absolute bottom-4 left-4 z-10 p-3 rounded-lg border border-white/5 bg-background/40 backdrop-blur-xl max-w-xs pointer-events-none">
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-1">3D Neural Space</p>
                <p className="text-[11px] text-foreground/70 leading-relaxed uppercase tracking-tighter">
                    <span className="text-white font-black">L-Click</span> Select •
                    <span className="text-white font-black"> R-Click</span> Options •
                    <span className="text-white font-black"> Drag</span> Nodes to Move
                </p>
            </div>
        </div>
    );
}
