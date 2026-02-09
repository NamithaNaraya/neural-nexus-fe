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
    nodes,
    selectedNodes,
    hoveredNode,
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

    useEffect(() => {
        if (!meshRef.current) return;

        nodes.forEach((node, i) => {
            const baseSize = 2.5 + (node.degree || 0) * 0.15;
            const isSelected = selectedNodes.includes(node.id);
            const isHovered = hoveredNode === node.id;
            const sizeScalar = isSelected ? baseSize * 1.5 : isHovered ? baseSize * 1.2 : baseSize;

            tempObject.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
            tempObject.scale.setScalar(Math.min(sizeScalar, 25));
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);

            const colorHex = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;
            tempColor.set(colorHex);
            if (isSelected || isHovered) {
                tempColor.multiplyScalar(1.5);
            }
            meshRef.current!.setColorAt(i, tempColor);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [nodes, selectedNodes, hoveredNode, tempObject, tempColor]);

    const handlePointerMove = useCallback((e: any) => {
        if (draggingNodeId) {
            e.stopPropagation();
            const node = nodes.find(n => n.id === draggingNodeId);
            if (!node) return;
            const plane = new THREE.Plane(camera.getWorldDirection(new THREE.Vector3()), -node.z || 0);
            const intersectPoint = new THREE.Vector3();
            e.ray.intersectPlane(plane, intersectPoint);
            updateNode(draggingNodeId, { x: intersectPoint.x, y: intersectPoint.y });
        } else if (e.instanceId !== undefined) {
            const node = nodes[e.instanceId];
            if (node) onNodeHover(node.id);
        }
    }, [nodes, draggingNodeId, camera, updateNode, onNodeHover]);

    const handlePointerDown = useCallback((e: any) => {
        if (e.instanceId !== undefined) {
            e.stopPropagation();
            const node = nodes[e.instanceId];
            if (node) {
                if (e.button === 0) setDraggingNodeId(node.id);
                onNodeClick(node.id, e);
            }
        }
    }, [nodes, onNodeClick]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[nodeGeometry, undefined, nodes.length]}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={() => setDraggingNodeId(null)}
            onPointerOut={() => onNodeHover(null)}
        >
            <meshStandardMaterial
                metalness={0.4}
                roughness={0.3}
                emissive="#000000"
                emissiveIntensity={0}
            />
        </instancedMesh>
    );
}
