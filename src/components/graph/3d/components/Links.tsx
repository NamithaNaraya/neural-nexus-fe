'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphLink } from '@/store/graphStore';
import { RELATIONSHIP_COLORS } from '../../types';

const PARTICLES_PER_LINK = 2;

interface LinksProps {
    links: GraphLink[];
    nodeMap: Map<string, any>;
    focusNodeId: string | null;
    pulseGeometry: THREE.BufferGeometry;
}

export function RelationshipLinks({
    links = [],
    nodeMap = new Map(),
    focusNodeId = null,
    pulseGeometry
}: LinksProps) {
    const pulseMeshRef = useRef<THREE.InstancedMesh>(null);

    const activeLinks = useMemo(() => {
        if (!Array.isArray(links) || !nodeMap) return [];
        return links.filter(link => {
            if (!link || !link.source || !link.target) return false;

            // Extract IDs with fallback to prevent undefined access
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;

            // Ensure both endpoints exist in our current node map to prevent line rendering errors
            return sourceId && targetId && nodeMap.has(sourceId) && nodeMap.has(targetId);
        });
    }, [links, nodeMap]);

    const lineGeometry = useMemo(() => {
        if (!activeLinks || activeLinks.length === 0) {
            const emptyGeo = new THREE.BufferGeometry();
            emptyGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
            emptyGeo.setAttribute('color', new THREE.Float32BufferAttribute([], 3));
            return emptyGeo;
        }

        const positions: number[] = [];
        const colors: number[] = [];
        const color = new THREE.Color();
        const pairCount = new Map<string, number>();

        activeLinks.forEach(link => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            const source = nodeMap.get(sourceId);
            const target = nodeMap.get(targetId);
            if (!source || !target) return;

            // Compute sibling link offset
            const pairId = [sourceId, targetId].sort().join('-');
            const index = pairCount.get(pairId) || 0;
            pairCount.set(pairId, index + 1);

            let sx = source.x, sy = source.y, sz = source.z;
            let tx = target.x, ty = target.y, tz = target.z;

            // If sibling links exist, apply a small perpendicular offset
            if (index > 0) {
                const dx = tx - sx;
                const dy = ty - sy;
                const dz = tz - sz;

                // Vector perpendicular to the link (simple cross product with Y or Z)
                const offsetDir = new THREE.Vector3(dy, -dx, 0).normalize();
                if (offsetDir.lengthSq() < 0.1) offsetDir.set(0, dz, -dy).normalize();

                const offsetScale = index * 5; // 5 units offset per sibling
                sx += offsetDir.x * offsetScale;
                sy += offsetDir.y * offsetScale;
                sz += offsetDir.z * offsetScale;
                tx += offsetDir.x * offsetScale;
                ty += offsetDir.y * offsetScale;
                tz += offsetDir.z * offsetScale;
            }

            positions.push(sx, sy, sz, tx, ty, tz);
            const linkColor = RELATIONSHIP_COLORS[link.type] || RELATIONSHIP_COLORS.default;
            color.set(linkColor);
            colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return geo;
    }, [activeLinks, nodeMap]);

    const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
    const tempPos = useMemo(() => new THREE.Vector3(), []);
    const targetVec = useMemo(() => new THREE.Vector3(), []);

    // Performance Optimization: Disabled CPU-side pulse animation loop
    // High-frequency matrix updates on the main thread for many links cause significant UI lag.
    useEffect(() => {
        if (!pulseMeshRef.current || !activeLinks || activeLinks.length === 0) return;

        activeLinks.forEach((link, i) => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            const source = nodeMap.get(sourceId);
            const target = nodeMap.get(targetId);
            if (!source || !target) return;

            for (let j = 0; j < PARTICLES_PER_LINK; j++) {
                const idx = i * PARTICLES_PER_LINK + j;
                if (idx >= (pulseMeshRef.current?.count || 0)) continue;

                const progress = (j / PARTICLES_PER_LINK);
                tempPos.set(source.x, source.y, source.z);
                targetVec.set(target.x, target.y, target.z).lerp(tempPos, 1 - progress);
                const scale = 0.8;
                tempMatrix.makeScale(scale, scale, scale);
                tempMatrix.setPosition(targetVec);
                pulseMeshRef.current!.setMatrixAt(idx, tempMatrix);
            }
        });
        if (pulseMeshRef.current.instanceMatrix) {
            pulseMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [activeLinks, nodeMap, tempMatrix, tempPos, targetVec]);

    return (
        <group>
            <lineSegments geometry={lineGeometry}>
                <lineBasicMaterial
                    vertexColors
                    transparent
                    opacity={focusNodeId ? 0.6 : 0.8}
                    depthWrite={false}
                    linewidth={3}
                    toneMapped={false}
                />
            </lineSegments>
            <instancedMesh ref={pulseMeshRef} args={[pulseGeometry, undefined, (activeLinks?.length ?? 0) * PARTICLES_PER_LINK]}>
                <meshBasicMaterial
                    color="#ec4899"
                    transparent
                    opacity={0.95}
                    blending={THREE.AdditiveBlending}
                    toneMapped={false}
                />
            </instancedMesh>
        </group>
    );
}
