'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NODE_TYPE_COLORS } from '../../types';
import { useGraphStore } from '@/store/graphStore';

interface NodesProps {
    nodes: any[];
    links: any[];
    selectedNodes: string[];
    hoveredNode: string | null;
    onNodeClick: (nodeId: string, event?: any) => void;
    onNodeDoubleClick?: (nodeId: string) => void;
    onNodeHover: (nodeId: string | null) => void;
    nodeGeometry: THREE.BufferGeometry;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    analyticSelectionActive?: boolean;
    analyticIncludeNeighbors?: boolean;
}

export function InstancedNodes({
    nodes = [],
    selectedNodes = [],
    hoveredNode = null,
    onNodeClick,
    onNodeDoubleClick,
    onNodeHover,
    nodeGeometry,
    onDragStart,
    onDragEnd,
    analyticSelectionActive = false,
    analyticIncludeNeighbors = false,
    links = [],
}: NodesProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const updateNode = useGraphStore(state => state.updateNode);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const { camera } = useThree();
    const plane = useMemo(() => new THREE.Plane(), []);
    const planeNormal = useMemo(() => new THREE.Vector3(), []);

    // Unified matrix update loop with breathing animation
    useFrame((state) => {
        if (!Array.isArray(nodes) || !meshRef.current) return;
        const time = state.clock.getElapsedTime();

        // Neighborhood Map for Analytics
        const analyticsNeighbors = new Set<string>();
        if (analyticSelectionActive && analyticIncludeNeighbors && selectedNodes.length > 0) {
            links.forEach(l => {
                if (selectedNodes.includes(l.source)) analyticsNeighbors.add(l.target);
                if (selectedNodes.includes(l.target)) analyticsNeighbors.add(l.source);
            });
        }

        nodes.forEach((node, i) => {
            if (!node) return;

            const isSelected = Array.isArray(selectedNodes) && selectedNodes.includes(node.id);
            const isHovered = hoveredNode === node.id;
            const isAnalyticNeighbor = analyticsNeighbors.has(node.id);

            // Neo4j-style scaling: base size + degree influence
            const degreeBonus = Math.min((node.degree || 0) * 1.5, 30);

            // Analytic Boldness
            let sizeScalar = (isSelected ? 10 : isHovered ? 9 : 8) + (degreeBonus / 4);
            if (analyticSelectionActive && isSelected) {
                const pulse = 1 + Math.sin(time * 6 + i) * 0.2;
                sizeScalar *= 1.3 * pulse;
            } else if (analyticSelectionActive && isAnalyticNeighbor) {
                const pulse = 1 + Math.sin(time * 3 + i) * 0.1;
                sizeScalar *= 1.15 * pulse;
            }

            // Calculate organic sway (breathing)
            const phase = i * 0.5;
            const swayMultiplier = (isSelected || isAnalyticNeighbor) ? 0.4 : 1.0;
            const swayX = Math.sin(time * 0.5 + phase) * 1.2 * swayMultiplier;
            const swayY = Math.cos(time * 0.4 + phase) * 1.2 * swayMultiplier;
            const swayZ = Math.sin(time * 0.6 + phase) * 1.2 * swayMultiplier;

            const x = (typeof node.x === 'number' && isFinite(node.x) ? node.x : 0) + swayX;
            const y = (typeof node.y === 'number' && isFinite(node.y) ? node.y : 0) + swayY;
            const z = (typeof node.z === 'number' && isFinite(node.z) ? node.z : 0) + swayZ;

            tempObject.position.set(x, y, z);
            tempObject.scale.setScalar(sizeScalar);
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);

            // Update color in real-time for analytic pop
            const colorHex = node.color || NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;

            if (analyticSelectionActive && (isSelected || isAnalyticNeighbor)) {
                tempColor.set('#000000');
                tempColor.multiplyScalar(isSelected ? 0.3 : 0.6); // Darker for selected, slightly visible for neighbors
            } else {
                tempColor.set(colorHex);
                if (isSelected) {
                    tempColor.multiplyScalar(1.5);
                } else if (isHovered) {
                    tempColor.multiplyScalar(1.2);
                }
            }
            meshRef.current!.setColorAt(i, tempColor);
        });

        meshRef.current!.instanceMatrix.needsUpdate = true;
        if (meshRef.current?.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    });

    // Remove legacy color effect
    useEffect(() => {
        // Handled in useFrame for real-time analytic pulsing
    }, []);

    const handlePointerMove = useCallback((e: any) => {
        if (draggingNodeId) {
            e.stopPropagation();
            if (!Array.isArray(nodes)) return;
            const node = nodes.find(n => n.id === draggingNodeId);
            if (!node) return;

            const intersectPoint = new THREE.Vector3();
            e.ray.intersectPlane(plane, intersectPoint);

            if (intersectPoint) {
                updateNode(draggingNodeId, {
                    x: intersectPoint.x,
                    y: intersectPoint.y,
                    z: node.z
                });
            }
        } else if (e.instanceId !== undefined && Array.isArray(nodes)) {
            const node = nodes[e.instanceId];
            if (node) onNodeHover(node.id);
        }
    }, [nodes, draggingNodeId, plane, updateNode, onNodeHover]);

    const handlePointerDown = useCallback((e: any) => {
        if (e.instanceId !== undefined && Array.isArray(nodes)) {
            e.stopPropagation();
            const node = nodes[e.instanceId];
            if (node) {
                if (e.button === 0) {
                    setDraggingNodeId(node.id);
                    onDragStart?.();
                    plane.setFromNormalAndCoplanarPoint(
                        camera.getWorldDirection(planeNormal),
                        new THREE.Vector3(node.x, node.y, node.z)
                    );
                }
                onNodeClick(node.id, e);
            }
        }
    }, [nodes, onNodeClick, camera, plane, planeNormal, onDragStart]);

    const handlePointerUp = useCallback(() => {
        if (draggingNodeId) {
            setDraggingNodeId(null);
            onDragEnd?.();
        }
    }, [draggingNodeId, onDragEnd]);

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[nodeGeometry, undefined, (Array.isArray(nodes) ? nodes.length : 0)]}
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
                onDoubleClick={(e) => {
                    if (e.instanceId !== undefined && Array.isArray(nodes)) {
                        e.stopPropagation();
                        const node = nodes[e.instanceId];
                        if (node && onNodeDoubleClick) onNodeDoubleClick(node.id);
                    }
                }}
                onPointerUp={() => setDraggingNodeId(null)}
                onPointerOut={() => {
                    if (!draggingNodeId && typeof onNodeHover === 'function') onNodeHover(null);
                }}
                frustumCulled={false}
            >
                <meshStandardMaterial
                    metalness={0.6}
                    roughness={0.3}
                    emissive="#ffffff"
                    emissiveIntensity={0}
                    toneMapped={false}
                />
            </instancedMesh>

            {/* Selection Rings - Rendered individually for selected nodes */}
            {nodes.filter(n => Array.isArray(selectedNodes) && selectedNodes.includes(n.id)).map(node => (
                <mesh key={`ring-${node.id}`} position={[node.x!, node.y!, node.z!]}>
                    <ringGeometry args={[12, 14, 32]} />
                    <meshBasicMaterial
                        color={analyticSelectionActive ? "#000000" : "#ffffff"}
                        transparent
                        opacity={analyticSelectionActive ? 0.9 : 0.4}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
        </group>
    );
}
