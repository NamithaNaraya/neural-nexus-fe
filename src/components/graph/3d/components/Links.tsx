'use client';

import React, { useMemo, useRef } from 'react';
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
    links,
    nodeMap,
    focusNodeId,
    pulseGeometry
}: LinksProps) {
    const pulseMeshRef = useRef<THREE.InstancedMesh>(null);

    const activeLinks = useMemo(() => {
        return links.filter(link => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            return nodeMap.has(sourceId) && nodeMap.has(targetId);
        });
    }, [links, nodeMap]);

    const lineGeometry = useMemo(() => {
        const positions: number[] = [];
        const colors: number[] = [];
        const color = new THREE.Color();
        activeLinks.forEach(link => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            const source = nodeMap.get(sourceId);
            const target = nodeMap.get(targetId);
            if (!source || !target) return;

            positions.push(source.x, source.y, source.z, target.x, target.y, target.z);
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

    useFrame((state) => {
        if (!pulseMeshRef.current || activeLinks.length === 0) return;
        const time = state.clock.elapsedTime;
        activeLinks.forEach((link, i) => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            const source = nodeMap.get(sourceId)!;
            const target = nodeMap.get(targetId)!;

            for (let j = 0; j < PARTICLES_PER_LINK; j++) {
                const idx = i * PARTICLES_PER_LINK + j;
                const progress = (time * 0.3 + (i * 0.1) + (j / PARTICLES_PER_LINK)) % 1;
                tempPos.set(source.x, source.y, source.z);
                targetVec.set(target.x, target.y, target.z).lerp(tempPos, 1 - progress);
                const scale = Math.sin(progress * Math.PI) * 1.5;
                tempMatrix.makeScale(scale, scale, scale);
                tempMatrix.setPosition(targetVec);
                pulseMeshRef.current!.setMatrixAt(idx, tempMatrix);
            }
        });
        pulseMeshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            <lineSegments geometry={lineGeometry}>
                <lineBasicMaterial vertexColors transparent opacity={focusNodeId ? 0.15 : 0.2} depthWrite={false} linewidth={1.5} />
            </lineSegments>
            <instancedMesh ref={pulseMeshRef} args={[pulseGeometry, undefined, activeLinks.length * PARTICLES_PER_LINK]}>
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
            </instancedMesh>
        </group>
    );
}
