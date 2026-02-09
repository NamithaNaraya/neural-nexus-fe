'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NODE_TYPE_COLORS } from '../../types';
import { useGraphStore } from '@/store/graphStore';

interface NodesProps {
    nodes: any[];
    selectedNodes: string[];
    hoveredNode: string | null;
    onNodeClick: (nodeId: string, event?: any) => void;
    onNodeHover: (nodeId: string | null) => void;
    nodeGeometry: THREE.BufferGeometry;
}

export function InstancedNodes({
    nodes = [],
    selectedNodes = [],
    hoveredNode = null,
    onNodeClick,
    onNodeHover,
    nodeGeometry
}: NodesProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const updateNode = useGraphStore(state => state.updateNode);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const { camera } = useThree();
    const plane = useMemo(() => new THREE.Plane(), []);
    const planeNormal = useMemo(() => new THREE.Vector3(), []);

    useEffect(() => {
        if (!Array.isArray(nodes) || !meshRef.current) return;
        nodes.forEach((node, i) => {
            if (!node) return;

            // Extract and sanitize numeric properties
            const x = typeof node.x === 'number' && isFinite(node.x) ? node.x : 0;
            const y = typeof node.y === 'number' && isFinite(node.y) ? node.y : 0;
            const z = typeof node.z === 'number' && isFinite(node.z) ? node.z : 0;

            const isSelected = Array.isArray(selectedNodes) && selectedNodes.includes(node.id);
            const isHovered = hoveredNode === node.id;

            // Size matching the Html labels in NeuralSpace3D for easier raycasting
            const sizeScalar = isSelected ? 15 : isHovered ? 12 : 10;

            tempObject.position.set(x, y, z);
            tempObject.scale.setScalar(sizeScalar);
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);

            const colorHex = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;
            tempColor.set(colorHex);
            meshRef.current!.setColorAt(i, tempColor);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [nodes, selectedNodes, hoveredNode, tempObject, tempColor]);

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
                    plane.setFromNormalAndCoplanarPoint(
                        camera.getWorldDirection(planeNormal),
                        new THREE.Vector3(node.x, node.y, node.z)
                    );
                }
                onNodeClick(node.id, e);
            }
        }
    }, [nodes, onNodeClick, camera, plane, planeNormal]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[nodeGeometry, undefined, (Array.isArray(nodes) ? nodes.length : 0)]}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={() => setDraggingNodeId(null)}
            onPointerOut={() => {
                if (!draggingNodeId && typeof onNodeHover === 'function') onNodeHover(null);
            }}
        >
            <meshBasicMaterial transparent opacity={0.01} />
        </instancedMesh>
    );
}
