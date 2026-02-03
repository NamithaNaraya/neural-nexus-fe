/**
 * Instanced Links Component
 * 
 * High-performance link rendering with animated flow particles.
 * Shows direction of relationships via moving pulses.
 */
'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphNode, GraphLink } from '@/store/graphStore';
import { RELATIONSHIP_COLORS } from '../types';

interface InstancedLinksProps {
    nodes: GraphNode[];
    links: GraphLink[];
    selectedNodes: string[];
    hoveredNode: string | null;
}

// Temporary objects
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);

export function InstancedLinks({
    nodes,
    links,
    selectedNodes,
    hoveredNode,
}: InstancedLinksProps) {
    const linesRef = useRef<THREE.Group>(null);
    const particlesRef = useRef<THREE.InstancedMesh>(null);

    // Create node lookup map
    const nodeMap = useMemo(() => {
        return new Map(nodes.map(n => [n.id, n]));
    }, [nodes]);

    // Filter valid links (both endpoints exist)
    const validLinks = useMemo(() => {
        return links.filter(link =>
            nodeMap.has(link.source) && nodeMap.has(link.target)
        );
    }, [links, nodeMap]);

    // Create line geometries
    const lineGeometries = useMemo(() => {
        return validLinks.map(link => {
            const sourceNode = nodeMap.get(link.source)!;
            const targetNode = nodeMap.get(link.target)!;

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

            const points = [start, end];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const color = RELATIONSHIP_COLORS[link.type] || RELATIONSHIP_COLORS.default;

            return { geometry, color, link };
        });
    }, [validLinks, nodeMap]);

    // Particle positions for flow animation
    const particleData = useMemo(() => {
        return validLinks.map(link => {
            const sourceNode = nodeMap.get(link.source)!;
            const targetNode = nodeMap.get(link.target)!;

            return {
                start: new THREE.Vector3(
                    sourceNode.x ?? 0,
                    sourceNode.y ?? 0,
                    sourceNode.z ?? 0
                ),
                end: new THREE.Vector3(
                    targetNode.x ?? 0,
                    targetNode.y ?? 0,
                    targetNode.z ?? 0
                ),
                color: new THREE.Color(RELATIONSHIP_COLORS[link.type] || RELATIONSHIP_COLORS.default),
                link,
            };
        });
    }, [validLinks, nodeMap]);

    // Animate flow particles
    useFrame((state) => {
        if (!particlesRef.current || particleData.length === 0) return;

        const mesh = particlesRef.current;
        const time = state.clock.elapsedTime;

        particleData.forEach((data, i) => {
            // Calculate position along the line (0 to 1, cycling)
            const t = (time * 0.5 + i * 0.1) % 1;

            // Lerp between start and end
            tempPosition.lerpVectors(data.start, data.end, t);

            // Check if this link should be highlighted
            const isHighlighted =
                selectedNodes.includes(data.link.source) ||
                selectedNodes.includes(data.link.target) ||
                data.link.source === hoveredNode ||
                data.link.target === hoveredNode;

            // Scale based on highlight state
            const scale = isHighlighted ? 2.5 : 1.5;
            tempScale.set(scale, scale, scale);

            tempMatrix.compose(tempPosition, new THREE.Quaternion(), tempScale);
            mesh.setMatrixAt(i, tempMatrix);

            // Set color with highlight intensity
            if (isHighlighted) {
                mesh.setColorAt(i, data.color.clone().multiplyScalar(1.5));
            } else {
                mesh.setColorAt(i, data.color);
            }
        });

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    if (validLinks.length === 0) return null;

    return (
        <group>
            {/* Static lines */}
            <group ref={linesRef}>
                {lineGeometries.map((item, i) => {
                    const isHighlighted =
                        selectedNodes.includes(item.link.source) ||
                        selectedNodes.includes(item.link.target) ||
                        item.link.source === hoveredNode ||
                        item.link.target === hoveredNode;

                    const lineMaterial = new THREE.LineBasicMaterial({
                        color: item.color,
                        transparent: true,
                        opacity: isHighlighted ? 0.8 : 0.25,
                    });
                    const lineObj = new THREE.Line(item.geometry, lineMaterial);

                    return (
                        <primitive key={i} object={lineObj} />
                    );
                })}
            </group>

            {/* Animated flow particles */}
            <instancedMesh
                ref={particlesRef}
                args={[undefined, undefined, validLinks.length]}
                frustumCulled={false}
            >
                <sphereGeometry args={[1, 8, 8]} />
                <meshBasicMaterial transparent opacity={0.9} />
            </instancedMesh>
        </group>
    );
}
