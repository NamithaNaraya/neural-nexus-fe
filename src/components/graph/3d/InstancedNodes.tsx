/**
 * Instanced Nodes Component
 * 
 * High-performance node rendering using THREE.InstancedMesh.
 * Renders 100k+ nodes in a single draw call for GPU efficiency.
 */
'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphNode } from '@/store/graphStore';
import { NODE_TYPE_COLORS } from '../types';

interface InstancedNodesProps {
    nodes: GraphNode[];
    selectedNodes: string[];
    hoveredNode: string | null;
    onNodeClick: (nodeId: string) => void;
    onNodeDoubleClick: (nodeId: string) => void;
    onNodeHover: (nodeId: string | null) => void;
    analyticSelectionActive?: boolean;
    analyticIncludeNeighbors?: boolean;
    links: { source: string; target: string }[];
}

// Temporary objects for matrix calculations (reused to avoid GC)
const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();
const tempPosition = new THREE.Vector3();
const tempScale = new THREE.Vector3();

export function InstancedNodes({
    nodes,
    selectedNodes,
    hoveredNode,
    onNodeClick,
    onNodeDoubleClick,
    onNodeHover,
    analyticSelectionActive = false,
    analyticIncludeNeighbors = false,
    links,
}: InstancedNodesProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const glowMeshRef = useRef<THREE.InstancedMesh>(null);
    const { raycaster, camera, pointer } = useThree();

    // Track double-click timing
    const lastClickRef = useRef<{ time: number; index: number }>({ time: 0, index: -1 });

    // Neighborhood Map for Analytics
    const analyticsNeighborhood = useMemo(() => {
        if (!analyticSelectionActive || !analyticIncludeNeighbors || selectedNodes.length === 0) return new Set<string>();
        const set = new Set<string>();
        links.forEach(l => {
            if (selectedNodes.includes(l.source)) set.add(l.target);
            if (selectedNodes.includes(l.target)) set.add(l.source);
        });
        return set;
    }, [analyticSelectionActive, analyticIncludeNeighbors, selectedNodes, links]);

    // Create node ID to index mapping for fast lookup
    const nodeIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        nodes.forEach((node, i) => map.set(node.id, i));
        return map;
    }, [nodes]);

    // Create color array based on node types
    const colors = useMemo(() => {
        return nodes.map(node => {
            const hex = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;
            return new THREE.Color(hex);
        });
    }, [nodes]);

    // Calculate base sizes based on degree
    const sizes = useMemo(() => {
        return nodes.map(node => {
            const baseSize = 4;
            const degreeBonus = (node.degree || 0) * 0.3;
            return Math.min(baseSize + degreeBonus, 20);
        });
    }, [nodes]);

    // Update instance matrices and colors
    useEffect(() => {
        if (!meshRef.current || nodes.length === 0) return;

        const mesh = meshRef.current;
        const glowMesh = glowMeshRef.current;

        nodes.forEach((node, i) => {
            // Position
            tempPosition.set(
                node.x ?? (Math.random() - 0.5) * 400,
                node.y ?? (Math.random() - 0.5) * 400,
                node.z ?? (Math.random() - 0.5) * 400
            );

            // Scale based on size
            const size = sizes[i];
            tempScale.set(size, size, size);

            // Build matrix
            tempMatrix.compose(tempPosition, new THREE.Quaternion(), tempScale);
            mesh.setMatrixAt(i, tempMatrix);

            // Set color
            mesh.setColorAt(i, colors[i]);

            // Glow mesh (larger scale)
            if (glowMesh) {
                tempScale.set(size * 1.5, size * 1.5, size * 1.5);
                tempMatrix.compose(tempPosition, new THREE.Quaternion(), tempScale);
                glowMesh.setMatrixAt(i, tempMatrix);
                glowMesh.setColorAt(i, colors[i]);
            }
        });

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        if (glowMesh) {
            glowMesh.instanceMatrix.needsUpdate = true;
            if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;
        }
    }, [nodes, colors, sizes]);

    // Update visual states on selection/hover change
    useFrame((state) => {
        if (!meshRef.current) return;

        const mesh = meshRef.current;
        const time = state.clock.elapsedTime;

        // Update colors based on selection/hover state
        nodes.forEach((node, i) => {
            const isSelected = selectedNodes.includes(node.id);
            const isNeighbor = analyticsNeighborhood.has(node.id);
            const isHovered = hoveredNode === node.id;

            // Pulse effect for selected nodes
            if (isSelected) {
                const pulse = 1 + Math.sin(time * (analyticSelectionActive ? 6 : 3)) * (analyticSelectionActive ? 0.25 : 0.15);
                tempScale.set(sizes[i] * pulse, sizes[i] * pulse, sizes[i] * pulse);

                // Get current position
                mesh.getMatrixAt(i, tempMatrix);
                tempMatrix.decompose(tempPosition, new THREE.Quaternion(), new THREE.Vector3());

                tempMatrix.compose(tempPosition, new THREE.Quaternion(), tempScale);
                mesh.setMatrixAt(i, tempMatrix);

                // Brighten color - extra boost in analytic mode
                tempColor.copy(colors[i]).multiplyScalar(analyticSelectionActive ? 2.5 : 1.5);
                mesh.setColorAt(i, tempColor);
            } else if (isNeighbor) {
                // Neighbors in analytics mode get a solid distinct look
                const pulse = 1 + Math.sin(time * 2 + i) * 0.1;
                tempScale.set(sizes[i] * pulse, sizes[i] * pulse, sizes[i] * pulse);

                mesh.getMatrixAt(i, tempMatrix);
                tempMatrix.decompose(tempPosition, new THREE.Quaternion(), new THREE.Vector3());
                tempMatrix.compose(tempPosition, new THREE.Quaternion(), tempScale);
                mesh.setMatrixAt(i, tempMatrix);

                tempColor.copy(colors[i]).multiplyScalar(1.4);
                mesh.setColorAt(i, tempColor);
            } else if (isHovered) {
                // Slightly larger and brighter on hover
                tempScale.set(sizes[i] * 1.2, sizes[i] * 1.2, sizes[i] * 1.2);

                mesh.getMatrixAt(i, tempMatrix);
                tempMatrix.decompose(tempPosition, new THREE.Quaternion(), new THREE.Vector3());

                tempMatrix.compose(tempPosition, new THREE.Quaternion(), tempScale);
                mesh.setMatrixAt(i, tempMatrix);

                tempColor.copy(colors[i]).multiplyScalar(1.3);
                mesh.setColorAt(i, tempColor);
            } else {
                // Reset to normal
                tempScale.set(sizes[i], sizes[i], sizes[i]);

                mesh.getMatrixAt(i, tempMatrix);
                tempMatrix.decompose(tempPosition, new THREE.Quaternion(), new THREE.Vector3());

                tempMatrix.compose(tempPosition, new THREE.Quaternion(), tempScale);
                mesh.setMatrixAt(i, tempMatrix);

                mesh.setColorAt(i, colors[i]);
            }
        });

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    // Handle pointer events
    const handlePointerMove = (event: THREE.Event) => {
        if (!meshRef.current) return;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(meshRef.current);

        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            if (instanceId !== undefined && nodes[instanceId]) {
                onNodeHover(nodes[instanceId].id);
            }
        } else {
            onNodeHover(null);
        }
    };

    const handleClick = (event: THREE.Event) => {
        if (!meshRef.current) return;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(meshRef.current);

        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            if (instanceId !== undefined && nodes[instanceId]) {
                const now = Date.now();

                // Check for double-click
                if (
                    lastClickRef.current.index === instanceId &&
                    now - lastClickRef.current.time < 300
                ) {
                    onNodeDoubleClick(nodes[instanceId].id);
                    lastClickRef.current = { time: 0, index: -1 };
                } else {
                    onNodeClick(nodes[instanceId].id);
                    lastClickRef.current = { time: now, index: instanceId };
                }
            }
        }
    };

    if (nodes.length === 0) return null;

    return (
        <group>
            {/* Glow layer (rendered behind) - More subtle aura */}
            <instancedMesh
                ref={glowMeshRef}
                args={[undefined, undefined, nodes.length]}
                frustumCulled={false}
            >
                <sphereGeometry args={[1, 12, 12]} />
                <meshBasicMaterial
                    transparent
                    opacity={0.12}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </instancedMesh>

            {/* Main nodes - Classic & Super Physical Material */}
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, nodes.length]}
                onPointerMove={handlePointerMove}
                onClick={handleClick}
                frustumCulled={false}
            >
                <sphereGeometry args={[1, 20, 20]} />
                <meshPhysicalMaterial
                    metalness={0.6}
                    roughness={0.2}
                    clearcoat={1.0}
                    clearcoatRoughness={0.1}
                    sheen={1}
                    sheenRoughness={0.1}
                    sheenColor={new THREE.Color('#ffffff')}
                />
            </instancedMesh>
        </group>
    );
}
