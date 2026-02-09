'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphLink } from '@/store/graphStore';
import { RELATIONSHIP_COLORS } from '../../types';

const PARTICLES_PER_LINK = 3;
const CURVE_SUBDIVISIONS = 8;

interface LinksProps {
    links: GraphLink[];
    nodeMap: Map<string, any>;
    focusNodeId: string | null;
    pulseGeometry: THREE.BufferGeometry;
}

import { Segments, Segment } from '@react-three/drei';

export function RelationshipLinks({
    links = [],
    nodeMap = new Map(),
    focusNodeId = null,
    pulseGeometry
}: LinksProps) {
    const pulseMeshRef = useRef<THREE.InstancedMesh>(null);

    const activeLinksData = useMemo(() => {
        if (!Array.isArray(links) || !nodeMap) return [];

        const result: any[] = [];
        links.forEach((link, i) => {
            if (!link || !link.source || !link.target) return;

            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            const source = nodeMap.get(sourceId);
            const target = nodeMap.get(targetId);

            if (sourceId && targetId && source && target) {
                const linkColor = RELATIONSHIP_COLORS[link.type] || RELATIONSHIP_COLORS.default;
                const linkId = (link as any).id || `${sourceId}-${targetId}-${i}`;

                // Create Curved Path Points
                const start = new THREE.Vector3(source.x, source.y, source.z);
                const end = new THREE.Vector3(target.x, target.y, target.z);

                // Calculate control point (midpoint + offset)
                const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                const distance = start.distanceTo(end);

                // Push control point "outward" or "upward" for an organic look
                // For a "flowy" feel, we push it slightly away from the center or use a consistent bias
                const offset = mid.clone().normalize().multiplyScalar(distance * 0.15);
                const control = mid.clone().add(offset).add(new THREE.Vector3(0, distance * 0.1, 0));

                const curve = new THREE.QuadraticBezierCurve3(start, control, end);
                const points = curve.getPoints(CURVE_SUBDIVISIONS);

                // Pre-calculate segments for the <Segments> component
                const segments: any[] = [];
                for (let i = 0; i < points.length - 1; i++) {
                    segments.push({
                        start: [points[i].x, points[i].y, points[i].z],
                        end: [points[i + 1].x, points[i + 1].y, points[i + 1].z]
                    });
                }

                result.push({
                    id: linkId,
                    segments,
                    curve, // Store curve for particle lerping
                    color: linkColor,
                    opacity: focusNodeId ? (sourceId === focusNodeId || targetId === focusNodeId ? 0.8 : 0.05) : 0.6
                });
            }
        });
        return result;
    }, [links, nodeMap, focusNodeId]);

    const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
    const tempPos = useMemo(() => new THREE.Vector3(), []);

    // Animate Pulses along the Curved Paths
    useFrame((state) => {
        if (!pulseMeshRef.current || activeLinksData.length === 0) return;

        const time = state.clock.getElapsedTime();

        activeLinksData.forEach((linkData, i) => {
            const curve = linkData.curve as THREE.QuadraticBezierCurve3;

            for (let j = 0; j < PARTICLES_PER_LINK; j++) {
                const idx = i * PARTICLES_PER_LINK + j;
                if (idx >= (pulseMeshRef.current?.count || 0)) continue;

                // Staggered flow animation
                const flowOffset = (j / PARTICLES_PER_LINK);
                const progress = (time * 0.4 + flowOffset) % 1.0;

                // Get point on curve
                curve.getPoint(progress, tempPos);

                const scale = 0.6 + Math.sin(time * 3 + j) * 0.1;
                tempMatrix.makeScale(scale, scale, scale);
                tempMatrix.setPosition(tempPos);
                pulseMeshRef.current!.setMatrixAt(idx, tempMatrix);
            }
        });

        pulseMeshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            {/* Render curved segments */}
            <Segments limit={activeLinksData.length * CURVE_SUBDIVISIONS} lineWidth={2.5}>
                {activeLinksData.flatMap((link) =>
                    link.segments.map((seg: any, sIdx: number) => (
                        <Segment
                            key={`${link.id}-${sIdx}`}
                            start={seg.start}
                            end={seg.end}
                            color={link.color}
                        />
                    ))
                )}
            </Segments>

            <instancedMesh ref={pulseMeshRef} args={[pulseGeometry, undefined, activeLinksData.length * PARTICLES_PER_LINK]}>
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                    toneMapped={false}
                />
            </instancedMesh>
        </group>
    );
}
