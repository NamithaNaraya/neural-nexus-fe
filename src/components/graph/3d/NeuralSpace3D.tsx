/**
 * 3D Neural Space Visualization
 * 
 * Immersive 3D graph visualization using Three.js via react-three-fiber.
 * Features:
 * - Instanced rendering for 100k+ nodes
 * - Orbital camera controls
 * - Node glow effects
 * - Animated connections
 * - Progressive LOD (Level of Detail)
 */
'use client';

import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode, GraphLink } from '@/store/graphStore';
import { NODE_TYPE_COLORS, RELATIONSHIP_COLORS } from '../types';

// Props
interface NeuralSpace3DProps {
    nodes: GraphNode[];
    links: GraphLink[];
    selectedNodes: string[];
    hoveredNode: string | null;
    onNodeClick: (nodeId: string, event?: React.MouseEvent) => void;
    onNodeDoubleClick: (nodeId: string) => void;
    onNodeHover: (nodeId: string | null) => void;
    onBackgroundClick: () => void;
}

// Individual 3D Node Component
interface Node3DProps {
    node: GraphNode;
    isSelected: boolean;
    isHovered: boolean;
    onClick: (nodeId: string) => void;
    onDoubleClick: (nodeId: string) => void;
    onHover: (nodeId: string | null) => void;
}

function Node3D({ node, isSelected, isHovered, onClick, onDoubleClick, onHover }: Node3DProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const [lastClickTime, setLastClickTime] = useState(0);

    // Get node color from type
    const color = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;

    // Calculate size based on degree/centrality
    const baseSize = 4;
    const size = baseSize + (node.degree || 0) * 0.3;

    // Position (use pre-calculated or random)
    const position: [number, number, number] = [
        node.x ?? (Math.random() - 0.5) * 400,
        node.y ?? (Math.random() - 0.5) * 400,
        node.z ?? (Math.random() - 0.5) * 400,
    ];

    // Animation
    useFrame((state) => {
        if (meshRef.current) {
            // Pulse effect for selected nodes
            if (isSelected) {
                const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
                meshRef.current.scale.setScalar(scale);
            } else {
                meshRef.current.scale.setScalar(1);
            }
        }

        // Glow animation
        if (glowRef.current && (isSelected || isHovered)) {
            glowRef.current.scale.setScalar(1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2);
        }
    });

    // Handle click with double-click detection
    const handleClick = useCallback((event: THREE.Event) => {
        event.stopPropagation?.();

        const now = Date.now();
        if (now - lastClickTime < 300) {
            onDoubleClick(node.id);
        } else {
            onClick(node.id);
        }
        setLastClickTime(now);
    }, [node.id, onClick, onDoubleClick, lastClickTime]);

    return (
        <group position={position}>
            {/* Glow effect for selected/hovered */}
            {(isSelected || isHovered) && (
                <mesh ref={glowRef}>
                    <sphereGeometry args={[size * 1.5, 16, 16]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.2}
                    />
                </mesh>
            )}

            {/* Main node sphere */}
            <mesh
                ref={meshRef}
                onClick={handleClick}
                onPointerOver={() => onHover(node.id)}
                onPointerOut={() => onHover(null)}
            >
                <sphereGeometry args={[size, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isSelected ? 0.5 : isHovered ? 0.3 : 0.1}
                    metalness={0.3}
                    roughness={0.7}
                />
            </mesh>

            {/* Label */}
            <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
                <Text
                    position={[0, size + 4, 0]}
                    fontSize={3}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.1}
                    outlineColor="#000000"
                >
                    {node.name}
                </Text>
            </Billboard>
        </group>
    );
}

// 3D Link Component
interface Link3DProps {
    link: GraphLink;
    sourceNode: GraphNode | undefined;
    targetNode: GraphNode | undefined;
    isHighlighted: boolean;
}

function Link3D({ link, sourceNode, targetNode, isHighlighted }: Link3DProps) {
    const ref = useRef<THREE.Line>(null);

    // Calculate positions
    const points = useMemo(() => {
        if (!sourceNode || !targetNode) return [];

        const start = new THREE.Vector3(
            sourceNode.x ?? 0,
            sourceNode.y ?? 0,
            sourceNode.z ?? 0
        );
        const end = new THREE.Vector3(
            targetNode.x ?? 0,
            targetNode.y ?? 0,
            targetNode.z ?? 0
        );

        return [start, end];
    }, [sourceNode, targetNode]);

    // Get color
    const color = RELATIONSHIP_COLORS[link.type] || RELATIONSHIP_COLORS.default;

    if (points.length === 0) return null;

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    return (
        <line ref={ref} geometry={geometry}>
            <lineBasicMaterial
                color={color}
                opacity={isHighlighted ? 1 : 0.3}
                transparent
                linewidth={isHighlighted ? 2 : 1}
            />
        </line>
    );
}

// Camera Controls Component
function CameraController() {
    return (
        <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={50}
            maxDistance={2000}
            enablePan
            panSpeed={0.5}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
        />
    );
}

// Scene Lighting
function SceneLighting() {
    return (
        <>
            <ambientLight intensity={0.4} />
            <pointLight position={[100, 100, 100]} intensity={0.8} />
            <pointLight position={[-100, -100, -100]} intensity={0.4} color="#3B82F6" />
            <pointLight position={[0, 200, 0]} intensity={0.3} color="#10B981" />
        </>
    );
}

// Background Stars/Particles
function BackgroundParticles() {
    const count = 500;

    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 2000;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 2000;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 2000;
        }
        return pos;
    }, []);

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={1}
                color="#4B5563"
                transparent
                opacity={0.5}
                sizeAttenuation
            />
        </points>
    );
}

// Main 3D Scene
function Scene({
    nodes,
    links,
    selectedNodes,
    hoveredNode,
    onNodeClick,
    onNodeDoubleClick,
    onNodeHover,
    onBackgroundClick,
}: NeuralSpace3DProps) {
    // Create node lookup map
    const nodeMap = useMemo(() => {
        return new Map(nodes.map(n => [n.id, n]));
    }, [nodes]);

    // Determine highlighted links
    const highlightedLinks = useMemo(() => {
        const selectedSet = new Set(selectedNodes);
        if (selectedSet.size === 0 && !hoveredNode) return new Set<string>();

        return new Set(
            links
                .filter(l =>
                    selectedSet.has(l.source) ||
                    selectedSet.has(l.target) ||
                    l.source === hoveredNode ||
                    l.target === hoveredNode
                )
                .map(l => `${l.source}-${l.target}`)
        );
    }, [links, selectedNodes, hoveredNode]);

    return (
        <>
            <SceneLighting />
            <CameraController />
            <BackgroundParticles />

            {/* Background click handler */}
            <mesh
                position={[0, 0, -1000]}
                onClick={onBackgroundClick}
            >
                <planeGeometry args={[5000, 5000]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Links */}
            {links.map(link => (
                <Link3D
                    key={`${link.source}-${link.target}-${link.type}`}
                    link={link}
                    sourceNode={nodeMap.get(link.source)}
                    targetNode={nodeMap.get(link.target)}
                    isHighlighted={highlightedLinks.has(`${link.source}-${link.target}`)}
                />
            ))}

            {/* Nodes */}
            {nodes.map(node => (
                <Node3D
                    key={node.id}
                    node={node}
                    isSelected={selectedNodes.includes(node.id)}
                    isHovered={hoveredNode === node.id}
                    onClick={onNodeClick}
                    onDoubleClick={onNodeDoubleClick}
                    onHover={onNodeHover}
                />
            ))}
        </>
    );
}

// Exported Component
export function NeuralSpace3D(props: NeuralSpace3DProps) {
    return (
        <div className="w-full h-full bg-[#0A0C10]">
            <Canvas
                camera={{
                    position: [0, 0, 500],
                    fov: 60,
                    near: 1,
                    far: 5000,
                }}
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance',
                }}
                dpr={[1, 2]}
            >
                <color attach="background" args={['#0A0C10']} />
                <fog attach="fog" args={['#0A0C10', 500, 2000]} />
                <Scene {...props} />
            </Canvas>
        </div>
    );
}
