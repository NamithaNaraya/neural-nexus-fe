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
        if (!Array.isArray(nodes) || nodes.length === 0) return [];

        // Hub-based Organic Layout (Non-Sphere)
        const typeHubs = new Map<string, THREE.Vector3>();
        const spreadFactor = 600; // Increased spread

        // Deterministic seeding for consistent organic look
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        // Create hubs for each node type/category
        const types = Array.from(new Set(nodes.map(n => n.type || 'default')));
        types.forEach((type, i) => {
            const angle = (i / types.length) * Math.PI * 2;
            const r = spreadFactor * (0.8 + seededRandom(i) * 2.0); // More varied radius
            typeHubs.set(type, new THREE.Vector3(
                Math.cos(angle) * r,
                (seededRandom(i + 10) - 0.5) * spreadFactor * 1.5, // Vertical spread
                Math.sin(angle) * r
            ));
        });

        // Calculate degrees for scaling
        const degreeMap = new Map<string, number>();
        links.forEach(link => {
            const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const t = typeof link.target === 'object' ? (link.target as any).id : link.target;
            degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
            degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
        });

        return nodes.map((node, i) => {
            if (!node) return null;
            const degree = degreeMap.get(node.id) || 0;

            // FORCE Organic Cluster Distribution (Ignore isFixed for overhaul)
            const hub = typeHubs.get(node.type || 'default') || new THREE.Vector3(0, 0, 0);

            // Random offset within cluster
            const phi = seededRandom(i * 3) * Math.PI * 2;
            const theta = Math.acos(2 * seededRandom(i * 7) - 1);
            const r = 150 + seededRandom(i * 11) * 300; // Increased density radius

            const ox = r * Math.sin(theta) * Math.cos(phi);
            const oy = r * Math.sin(theta) * Math.sin(phi);
            const oz = r * Math.cos(theta);

            return {
                ...node,
                x: hub.x + ox,
                y: hub.y + oy,
                z: hub.z + oz,
                degree
            };
        }).filter((n): n is any => n !== null);
    }, [nodes, links, props.analyticSelectionActive]);

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
                resetKey={props.resetKey}
            />

            <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.07}
                minDistance={10}
                maxDistance={5000}
                rotateSpeed={0.8}
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
                nodes={nodesWithPositions}
                links={Array.isArray(links) ? links : []}
                selectedNodes={Array.isArray(selectedNodes) ? selectedNodes : []}
                hoveredNode={hoveredNode}
                onNodeClick={props.onNodeClick}
                onNodeDoubleClick={props.onNodeDoubleClick}
                onNodeHover={props.onNodeHover}
                analyticSelectionActive={props.analyticSelectionActive}
                analyticIncludeNeighbors={props.analyticIncludeNeighbors}
                nodeGeometry={nodeGeometry}
            />
            {nodesWithPositions.length > 0 && (
                <RelationshipLabels
                    links={Array.isArray(links) ? links : []}
                    nodeMap={nodeMap}
                    focusNodeId={focusNodeId}
                    selectedNodes={Array.isArray(selectedNodes) ? selectedNodes : []}
                />
            )}

            {/* Premium Neural Node Labels (Clean, No Interactivity Block) */}
            {nodesWithPositions.map(node => {
                if (!node || !node.id) return null;
                const safeSelected = Array.isArray(selectedNodes) ? selectedNodes : [];
                const isSelected = safeSelected.includes(node.id);
                const isHovered = hoveredNode === node.id;

                const isLargeGraph = nodesWithPositions.length > 80;
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
                            pointer-events-none px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap
                            ${isSelected ? 'bg-primary/20 text-white scale-110 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-black/40 text-white/80'}
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
    const [isDark, setIsDark] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [orbitEnabled, setOrbitEnabled] = useState(true);

    // SSR Guard
    useEffect(() => {
        setMounted(true);
    }, []);

    // Higher fidelity geometries for "Super Shape" look - Ultra Smooth
    const nodeGeometry = useMemo(() => new THREE.SphereGeometry(1, 64, 64), []);
    const pulseGeometry = useMemo(() => new THREE.SphereGeometry(0.8, 32, 32), []);

    useEffect(() => {
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
        };
    }, []);

    // Cleanup geometries on unmount
    useEffect(() => {
        return () => {
            nodeGeometry.dispose();
            pulseGeometry.dispose();
        };
    }, [nodeGeometry, pulseGeometry]);

    if (!mounted || typeof window === 'undefined') {
        return <div className="w-full h-full bg-[#05070A]" />;
    }

    const sceneBgColor = isDark ? '#05070A' : '#F8FAFC';
    const glConfig = {
        antialias: true, // Re-enable for perfect smoothing
        powerPreference: 'high-performance' as const,
        stencil: false,
        depth: true,
    };
    const cameraConfig = { position: [0, 100, 1000] as [number, number, number], fov: 60 };

    return (
        <div className="w-full h-full relative" style={{ backgroundColor: sceneBgColor }}>
            <IngestionProgressHUD />
            <Canvas
                shadows={false}
                camera={cameraConfig}
                gl={glConfig}
                dpr={[1, 2]} // Support high-DPI displays for sharpness
            >
                <color attach="background" args={[sceneBgColor]} />
                <ambientLight intensity={1.2} />
                <pointLight position={[50, 50, 50]} intensity={2} />
                <Scene
                    {...props}
                    nodes={Array.isArray(nodes) ? nodes : []}
                    links={Array.isArray(links) ? links : []}
                    selectedNodes={Array.isArray(selectedNodes) ? selectedNodes : []}
                    isDark={isDark}
                    bgColor={sceneBgColor}
                    nodeGeometry={nodeGeometry}
                    pulseGeometry={pulseGeometry}
                    setOrbitEnabled={setOrbitEnabled}
                    orbitEnabled={orbitEnabled}
                />

            </Canvas>
            <div className="absolute bottom-4 left-4 z-10 p-3 rounded-lg border border-white/5 bg-background/40 backdrop-blur-xl max-w-xs pointer-events-none">
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-1">3D Neural Space</p>
                <p className="text-[11px] text-foreground/70 leading-relaxed">Zoom to explore. Drag to rotate. <span className="text-white font-medium">Click & Drag nodes to rearrange.</span></p>
            </div>
        </div>
    );
}
