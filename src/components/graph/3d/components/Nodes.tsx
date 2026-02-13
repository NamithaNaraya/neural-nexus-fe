'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Billboard } from '@react-three/drei';
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
    const glowRef = useRef<THREE.InstancedMesh>(null);
    const glowOuterRef = useRef<THREE.InstancedMesh>(null);
    const updateNode = useGraphStore(state => state.updateNode);
    const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const tempObject = useMemo(() => new THREE.Object3D(), []);

    // Dragging State
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const { camera } = useThree();
    const plane = useMemo(() => new THREE.Plane(), []);
    const planeNormal = useMemo(() => new THREE.Vector3(), []);

    // Neighborhood Map for Dimming / Analytics
    const neighbors = useMemo(() => {
        const set = new Set<string>();
        if (hoveredNode || (selectedNodes.length > 0)) {
            const focusIds = hoveredNode ? [hoveredNode] : selectedNodes;
            links.forEach(l => {
                const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
                const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
                if (focusIds.includes(s)) set.add(t);
                if (focusIds.includes(t)) set.add(s);
            });
            focusIds.forEach(id => set.add(id)); // Include self
        }
        return set;
    }, [hoveredNode, selectedNodes, links]);

    useFrame((state) => {
        if (!meshRef.current || !glowRef.current || !glowOuterRef.current || !Array.isArray(nodes) || nodes.length === 0) return;
        const time = state.clock.getElapsedTime();
        const safeSelected = Array.isArray(selectedNodes) ? selectedNodes : [];
        const hasFocus = hoveredNode || safeSelected.length > 0;

        // Sync instance counts
        if (meshRef.current.count !== nodes.length) meshRef.current.count = nodes.length;
        if (glowRef.current.count !== nodes.length) glowRef.current.count = nodes.length;
        if (glowOuterRef.current.count !== nodes.length) glowOuterRef.current.count = nodes.length;

        nodes.forEach((node, i) => {
            if (!node || !node.id) return;
            const isSelected = safeSelected.includes(node.id);
            const isHovered = hoveredNode === node.id;
            const isNeighbor = neighbors.has(node.id);

            const opacity = hasFocus ? (isNeighbor ? 1.0 : 0.15) : 1.0;

            const baseSize = (node.degree || 0) * 0.5 + 8;
            let size = baseSize;
            if (isSelected) size *= 1.2;
            else if (isHovered) size *= 1.1;

            if (isSelected || isHovered) {
                size *= (1 + Math.sin(time * 3 + i) * 0.03);
            }

            const nx = typeof node.x === 'number' && isFinite(node.x) ? node.x : 0;
            const ny = typeof node.y === 'number' && isFinite(node.y) ? node.y : 0;
            const nz = typeof node.z === 'number' && isFinite(node.z) ? node.z : 0;

            tempObject.position.set(nx, ny, nz);
            tempObject.scale.setScalar(Math.max(0.1, size));
            tempObject.updateMatrix();

            meshRef.current!.setMatrixAt(i, tempObject.matrix);

            // Inner Glow (Slightly larger than node)
            tempObject.scale.setScalar(Math.max(0.1, size * 1.3));
            tempObject.updateMatrix();
            glowRef.current!.setMatrixAt(i, tempObject.matrix);

            // Outer Glow (Much larger, soft aura)
            tempObject.scale.setScalar(Math.max(0.1, size * 2.2));
            tempObject.updateMatrix();
            glowOuterRef.current!.setMatrixAt(i, tempObject.matrix);

            const customNodeTypeColors = useGraphStore.getState().filters.customNodeTypeColors;
            const baseColor = customNodeTypeColors[node.type] || NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;
            tempColor.set(baseColor);

            if (isSelected) tempColor.lerp(new THREE.Color('#ffffff'), 0.4);
            if (opacity < 1) {
                tempColor.lerp(new THREE.Color('#444444'), 0.6);
                tempColor.multiplyScalar(0.5);
            }

            meshRef.current!.setColorAt(i, tempColor);

            // Bright Glow Color
            const glowColor = tempColor.clone().multiplyScalar(2.0); // Boost for manual radiance
            glowRef.current!.setColorAt(i, glowColor);
            glowOuterRef.current!.setColorAt(i, glowColor);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        glowRef.current.instanceMatrix.needsUpdate = true;
        glowOuterRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        if (glowRef.current.instanceColor) glowRef.current.instanceColor.needsUpdate = true;
        if (glowOuterRef.current.instanceColor) glowOuterRef.current.instanceColor.needsUpdate = true;
    });

    const handlePointerDown = useCallback((e: any) => {
        if (!Array.isArray(nodes)) return;
        if (e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < nodes.length) {
            e.stopPropagation();
            const node = nodes[e.instanceId];
            if (node) {
                if (e.button === 0) {
                    setDraggingNodeId(node.id);
                    onDragStart?.();
                    plane.setFromNormalAndCoplanarPoint(
                        camera.getWorldDirection(planeNormal),
                        new THREE.Vector3(node.x || 0, node.y || 0, node.z || 0)
                    );
                }
                onNodeClick(node.id, e);
            }
        }
    }, [nodes, onNodeClick, camera, plane, planeNormal, onDragStart]);

    const handlePointerMove = useCallback((e: any) => {
        if (!Array.isArray(nodes)) return;
        if (draggingNodeId) {
            e.stopPropagation();
            const node = nodes.find(n => n.id === draggingNodeId);
            if (!node) return;

            const intersectPoint = new THREE.Vector3();
            e.ray.intersectPlane(plane, intersectPoint);

            if (intersectPoint && isFinite(intersectPoint.x) && isFinite(intersectPoint.y)) {
                updateNode(draggingNodeId, {
                    x: intersectPoint.x,
                    y: intersectPoint.y,
                    z: node.z || 0
                });
            }
        } else if (e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < nodes.length) {
            const node = nodes[e.instanceId];
            if (node) onNodeHover(node.id);
        }
    }, [nodes, draggingNodeId, plane, updateNode, onNodeHover]);

    if (!Array.isArray(nodes) || nodes.length === 0) return null;

    return (
        <group>
            {/* 1. Outer Glow Soft Aura (Static performance-friendly glow) */}
            <instancedMesh
                ref={glowOuterRef}
                args={[nodeGeometry, undefined, Array.isArray(nodes) ? nodes.length : 0]}
                frustumCulled={false}
            >
                <meshBasicMaterial
                    transparent
                    opacity={0.05}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            {/* 2. Inner Glow Core */}
            <instancedMesh
                ref={glowRef}
                args={[nodeGeometry, undefined, Array.isArray(nodes) ? nodes.length : 0]}
                frustumCulled={false}
            >
                <meshBasicMaterial
                    transparent
                    opacity={0.25}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            {/* 3. Main Premium Nodes */}
            <instancedMesh
                ref={meshRef}
                args={[nodeGeometry, undefined, Array.isArray(nodes) ? nodes.length : 0]}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerOut={() => onNodeHover(null)}
                onClick={(e) => {
                    if (Array.isArray(nodes) && e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < nodes.length) {
                        const node = nodes[e.instanceId];
                        if (node) onNodeClick(node.id, e);
                    }
                }}
                onPointerUp={() => {
                    setDraggingNodeId(null);
                    onDragEnd?.();
                }}
                onDoubleClick={(e) => {
                    if (Array.isArray(nodes) && e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < nodes.length) {
                        const node = nodes[e.instanceId];
                        if (node && onNodeDoubleClick) onNodeDoubleClick(node.id);
                    }
                }}
                frustumCulled={false}
            >
                {/* 
                    "Clean Shape" Optimization:
                    - Higher metalness for a solid look.
                    - Lower transmission to prevent fuzzy edges.
                */}
                <meshPhysicalMaterial
                    transparent
                    metalness={0.7} // Even more solid/premium
                    roughness={0.02} // Mirror-like sharpness
                    clearcoat={1.0}
                    clearcoatRoughness={0.01}
                    reflectivity={1.0}
                    transmission={0.2} // Catch more internal light
                    thickness={2}
                    ior={1.5}
                />
            </instancedMesh>

            {/* Selection Ring (High Fidelity) */}
            {Array.isArray(nodes) && Array.isArray(selectedNodes) && nodes.filter(n => n && selectedNodes.includes(n.id)).map(node => (
                <Billboard
                    key={`ring-${node.id}`}
                    position={[node.x || 0, node.y || 0, node.z || 0]}
                >
                    <mesh>
                        <ringGeometry args={[14, 15, 64]} />
                        <meshBasicMaterial
                            color="#00f3ff"
                            transparent
                            opacity={0.8}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                    <mesh scale={1.1}>
                        <ringGeometry args={[14.5, 14.7, 64]} />
                        <meshBasicMaterial
                            color="#00f3ff"
                            transparent
                            opacity={0.3}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </Billboard>
            ))}
        </group>
    );
}
