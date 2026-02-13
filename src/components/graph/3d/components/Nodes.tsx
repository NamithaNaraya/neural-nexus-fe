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
    onNodeContextMenu?: (nodeId: string, x: number, y: number) => void;
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
    onNodeContextMenu,
    nodeGeometry,
    onDragStart,
    onDragEnd,
    analyticSelectionActive = false,
    analyticIncludeNeighbors = false,
    links = [],
}: NodesProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const borderRef = useRef<THREE.InstancedMesh>(null);
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
        const safeLinks = Array.isArray(links) ? links : [];
        const safeSelected = Array.isArray(selectedNodes) ? selectedNodes : [];

        if (hoveredNode || (safeSelected.length > 0)) {
            const focusIds = hoveredNode ? [hoveredNode] : safeSelected;
            safeLinks.forEach(l => {
                if (!l) return;
                const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
                const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
                if (s && focusIds.includes(s)) set.add(t);
                if (t && focusIds.includes(t)) set.add(s);
            });
            focusIds.forEach(id => { if (id) set.add(id); }); // Include self
        }
        return set;
    }, [hoveredNode, selectedNodes, links]);

    useFrame((state) => {
        const safeNodes = Array.isArray(nodes) ? nodes : [];
        if (!meshRef.current || !borderRef.current || !glowRef.current || !glowOuterRef.current || safeNodes.length === 0) return;

        const time = state.clock.getElapsedTime();
        const safeSelected = Array.isArray(selectedNodes) ? selectedNodes : [];
        const hasFocus = hoveredNode || safeSelected.length > 0;

        // Sync instance counts
        if (meshRef.current.count !== safeNodes.length) meshRef.current.count = safeNodes.length;
        if (borderRef.current.count !== safeNodes.length) borderRef.current.count = safeNodes.length;
        if (glowRef.current.count !== safeNodes.length) glowRef.current.count = safeNodes.length;
        if (glowOuterRef.current.count !== safeNodes.length) glowOuterRef.current.count = safeNodes.length;

        safeNodes.forEach((node, i) => {
            if (!node || !node.id) return;
            const isSelected = safeSelected.includes(node.id);
            const isHovered = hoveredNode === node.id;
            const isNeighbor = neighbors.has(node.id);
            const isDragging = draggingNodeId === node.id;

            const opacity = hasFocus ? (isNeighbor ? 1.0 : 0.15) : 1.0;

            const baseSize = (node.degree || 0) * 0.6 + 12;
            let size = baseSize;
            if (isSelected) size *= 1.3;
            else if (isHovered) size *= 1.2;
            if (isDragging) size *= 1.4; // Grow while dragging

            if (isSelected || isHovered || isDragging) {
                size *= (1 + Math.sin(time * 3 + i) * 0.03);
            }

            const nx = typeof node.x === 'number' && isFinite(node.x) ? node.x : 0;
            const ny = typeof node.y === 'number' && isFinite(node.y) ? node.y : 0;
            const nz = typeof node.z === 'number' && isFinite(node.z) ? node.z : 0;

            tempObject.position.set(nx, ny, nz);
            tempObject.scale.setScalar(Math.max(0.1, size));
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);

            // Border (Slightly larger than main mesh)
            tempObject.scale.setScalar(Math.max(0.1, size * 1.08));
            tempObject.updateMatrix();
            borderRef.current!.setMatrixAt(i, tempObject.matrix);

            // Inner Glow (Slightly larger than node)
            const innerGlowScale = size * (1.3 + Math.sin(time * 2 + i) * 0.05);
            tempObject.scale.setScalar(Math.max(0.1, innerGlowScale));
            tempObject.updateMatrix();
            glowRef.current!.setMatrixAt(i, tempObject.matrix);

            // Outer Glow (Much larger, soft aura)
            const outerGlowScale = size * (2.2 + Math.cos(time * 1.5 + i) * 0.1);
            tempObject.scale.setScalar(Math.max(0.1, outerGlowScale));
            tempObject.updateMatrix();
            glowOuterRef.current!.setMatrixAt(i, tempObject.matrix);

            const customNodeTypeColors = useGraphStore.getState().filters.customNodeTypeColors || {};
            const nodeType = node.type || 'default';
            const baseColor = customNodeTypeColors[nodeType] || NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.default;
            tempColor.set(isDragging ? '#ffffff' : baseColor);

            if (isSelected) tempColor.lerp(new THREE.Color('#ffffff'), 0.4);
            if (opacity < 1) {
                tempColor.lerp(new THREE.Color('#444444'), 0.6);
                tempColor.multiplyScalar(0.5);
            }

            meshRef.current!.setColorAt(i, tempColor);

            // Fixed Border Color (Dark neat stroke)
            const borderColor = new THREE.Color('#000000').lerp(tempColor, 0.2);
            borderRef.current!.setColorAt(i, borderColor);

            // Bright Glow Color - Consistently soft
            const glowColor = tempColor.clone().multiplyScalar(1.5);
            glowRef.current!.setColorAt(i, glowColor);
            glowOuterRef.current!.setColorAt(i, glowColor);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        borderRef.current.instanceMatrix.needsUpdate = true;
        glowRef.current.instanceMatrix.needsUpdate = true;
        glowOuterRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        if (borderRef.current.instanceColor) borderRef.current.instanceColor.needsUpdate = true;
        if (glowRef.current.instanceColor) glowRef.current.instanceColor.needsUpdate = true;
        if (glowOuterRef.current.instanceColor) glowOuterRef.current.instanceColor.needsUpdate = true;
    });

    const handlePointerDown = useCallback((e: any) => {
        const safeNodes = Array.isArray(nodes) ? nodes : [];
        if (e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < safeNodes.length) {
            e.stopPropagation();
            const node = safeNodes[e.instanceId];
            if (node) {
                if (e.button === 0) {
                    setDraggingNodeId(node.id);
                    onDragStart?.();
                    plane.setFromNormalAndCoplanarPoint(
                        camera.getWorldDirection(planeNormal),
                        new THREE.Vector3(node.x || 0, node.y || 0, node.z || 0)
                    );
                }
                // onNodeClick(node.id, e); // REMOVED from here to fix double firing
            }
        }
    }, [nodes, onNodeClick, camera, plane, planeNormal, onDragStart]);

    const handlePointerMove = useCallback((e: any) => {
        const safeNodes = Array.isArray(nodes) ? nodes : [];
        if (draggingNodeId) {
            e.stopPropagation();
            const node = safeNodes.find(n => n && n.id === draggingNodeId);
            if (!node) return;

            const intersectPoint = new THREE.Vector3();
            e.ray.intersectPlane(plane, intersectPoint);

            if (intersectPoint && isFinite(intersectPoint.x) && isFinite(intersectPoint.y) && isFinite(intersectPoint.z)) {
                updateNode(draggingNodeId, {
                    x: intersectPoint.x,
                    y: intersectPoint.y,
                    z: intersectPoint.z
                });
            }
        } else if (e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < safeNodes.length) {
            const node = safeNodes[e.instanceId];
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
                    opacity={0.15} // Increased from 0.05 for "soft" star feel
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

            {/* 3. Node Border (Crisp neat stroke) */}
            <instancedMesh
                ref={borderRef}
                args={[nodeGeometry, undefined, Array.isArray(nodes) ? nodes.length : 0]}
                frustumCulled={false}
            >
                <meshBasicMaterial color="#000000" />
            </instancedMesh>

            {/* 4. Main Premium Nodes */}
            <instancedMesh
                ref={meshRef}
                args={[nodeGeometry, undefined, Array.isArray(nodes) ? nodes.length : 0]}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerOut={() => onNodeHover(null)}
                onPointerUp={(e) => {
                    if (draggingNodeId === null) {
                        const safeNodes = Array.isArray(nodes) ? nodes : [];
                        if (e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < safeNodes.length) {
                            const node = safeNodes[e.instanceId];
                            if (node) onNodeClick(node.id, e);
                        }
                    }
                    setDraggingNodeId(null);
                    onDragEnd?.();
                }}
                onDoubleClick={(e) => {
                    const safeNodes = Array.isArray(nodes) ? nodes : [];
                    if (e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < safeNodes.length) {
                        const node = safeNodes[e.instanceId];
                        if (node && onNodeDoubleClick) onNodeDoubleClick(node.id);
                    }
                }}
                onContextMenu={(e) => {
                    const safeNodes = Array.isArray(nodes) ? nodes : [];
                    if (e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < safeNodes.length) {
                        e.stopPropagation();
                        const node = safeNodes[e.instanceId];
                        if (node && onNodeContextMenu) {
                            // Extract screen coordinates from the Three.js event
                            onNodeContextMenu(node.id, e.clientX, e.clientY);
                        }
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
                    metalness={0.4}
                    roughness={0.1}
                    clearcoat={0.5}
                    clearcoatRoughness={0.1}
                    reflectivity={0.8}
                    transmission={0.4}
                    thickness={1.5}
                    ior={1.4}
                    depthWrite={true} // Critical for reducing flickering in transparent instances
                    depthTest={true}
                />
            </instancedMesh>

            {/* Selection Ring (High Fidelity) */}
            {Array.isArray(nodes) && Array.isArray(selectedNodes) && nodes.filter(n => n && n.id && selectedNodes.includes(n.id)).map(node => (
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
