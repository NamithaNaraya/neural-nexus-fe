'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphLink } from '@/store/graphStore';
import { RELATIONSHIP_COLORS } from '../../types';

const PARTICLES_PER_LINK = 4; // Increased for "Super" flow
const CURVE_SUBDIVISIONS = 64; // Ultra-high smoothness

interface LinksProps {
    links: GraphLink[];
    nodeMap: Map<string, any>;
    focusNodeId: string | null;
    pulseGeometry: THREE.BufferGeometry;
    selectedNodes?: string[];
    analyticSelectionActive?: boolean;
}

export function RelationshipLinks({
    links = [],
    nodeMap = new Map(),
    focusNodeId = null,
    pulseGeometry,
    selectedNodes = [],
    analyticSelectionActive = false
}: LinksProps) {
    const linkMeshRef = useRef<THREE.InstancedMesh>(null);
    const linkGlowRef = useRef<THREE.InstancedMesh>(null);
    const arrowMeshRef = useRef<THREE.InstancedMesh>(null);
    const pulseMeshRef = useRef<THREE.InstancedMesh>(null);

    const cylinderGeometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 8), []);
    const arrowGeometry = useMemo(() => new THREE.ConeGeometry(3, 10, 8), []);

    const activeLinksData = useMemo(() => {
        if (!Array.isArray(links) || !nodeMap) return [];

        const safeSelected = Array.isArray(selectedNodes) ? selectedNodes : [];
        const hasFocus = focusNodeId || safeSelected.length > 0;
        const focusIds = focusNodeId ? [focusNodeId] : safeSelected;

        const result: any[] = [];
        links.forEach((link, i) => {
            if (!link || !link.source || !link.target) return;

            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            const source = nodeMap.get(sourceId);
            const target = nodeMap.get(targetId);

            if (sourceId && targetId && source && target) {
                if (typeof source.x !== 'number' || typeof target.x !== 'number') return;

                const isPartOfFocus = focusIds.includes(sourceId) || focusIds.includes(targetId);
                const opacity = hasFocus ? (isPartOfFocus ? 1.0 : 0.05) : 0.8;
                const baseColor = RELATIONSHIP_COLORS[link.type] || RELATIONSHIP_COLORS.default;

                const start = new THREE.Vector3(source.x || 0, source.y || 0, source.z || 0);
                const end = new THREE.Vector3(target.x || 0, target.y || 0, target.z || 0);
                const dist = start.distanceTo(end);

                // Stable organic bend
                const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                const distFromOrigin = mid.length();
                const normal = distFromOrigin > 1 ? mid.clone().normalize() : new THREE.Vector3(0, 1, 0);
                const control = mid.clone().add(normal.multiplyScalar(dist * 0.25));

                const curve = new THREE.QuadraticBezierCurve3(start, control, end);
                const points = curve.getPoints(CURVE_SUBDIVISIONS);

                // Pre-calculate segments for instanced cylinder placement
                const segmentData: any[] = [];
                for (let j = 0; j < points.length - 1; j++) {
                    const p1 = points[j];
                    const p2 = points[j + 1];
                    const sMid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
                    const sDist = p1.distanceTo(p2);
                    segmentData.push({ mid: sMid, start: p1, end: p2, dist: sDist });
                }

                const targetNodeSize = (target.degree || 0) * 0.5 + 10;
                const arrowT = Math.max(0.7, 1 - (targetNodeSize + 15) / dist);
                const arrowPos = curve.getPoint(arrowT);
                const arrowTangent = curve.getTangent(arrowT);

                result.push({
                    id: (link as any).id || `${sourceId}-${targetId}-${i}`,
                    curve,
                    segmentData,
                    color: baseColor,
                    opacity,
                    width: isPartOfFocus ? 2.5 : 1.5,
                    arrowPos,
                    arrowTangent
                });
            }
        });
        return result;
    }, [links, nodeMap, focusNodeId, selectedNodes, analyticSelectionActive]);

    const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
    const tempPos = useMemo(() => new THREE.Vector3(), []);
    const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

    useFrame((state) => {
        if (!linkMeshRef.current || !activeLinksData.length) return;
        const time = state.clock.getElapsedTime();

        // Sync instance counts
        const totalSegments = activeLinksData.length * CURVE_SUBDIVISIONS;
        if (linkMeshRef.current.count !== totalSegments) linkMeshRef.current.count = totalSegments;
        if (linkGlowRef.current) linkGlowRef.current.count = totalSegments;
        if (arrowMeshRef.current) arrowMeshRef.current.count = activeLinksData.length;

        activeLinksData.forEach((link, i) => {
            const linkColor = new THREE.Color(link.color);

            // Render physical segments
            link.segmentData.forEach((seg: any, j: number) => {
                const idx = i * CURVE_SUBDIVISIONS + j;
                if (j >= CURVE_SUBDIVISIONS) return;

                tempMatrix.identity();
                tempMatrix.lookAt(seg.start, seg.end, up);
                tempMatrix.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
                tempMatrix.scale(new THREE.Vector3(link.width, seg.dist, link.width));
                tempMatrix.setPosition(seg.mid);

                linkMeshRef.current!.setMatrixAt(idx, tempMatrix);
                linkMeshRef.current!.setColorAt(idx, linkColor);

                if (linkGlowRef.current) {
                    tempMatrix.scale(new THREE.Vector3(2.5, 1.05, 2.5)); // Glow size
                    linkGlowRef.current.setMatrixAt(idx, tempMatrix);
                    linkGlowRef.current.setColorAt(idx, linkColor);
                }
            });

            // Arrow
            if (arrowMeshRef.current && link.arrowPos) {
                tempMatrix.identity();
                const rotMatrix = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), link.arrowTangent, up);
                rotMatrix.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
                tempMatrix.makeTranslation(link.arrowPos.x, link.arrowPos.y, link.arrowPos.z);
                tempMatrix.multiply(rotMatrix);
                arrowMeshRef.current.setMatrixAt(i, tempMatrix);
                arrowMeshRef.current.setColorAt(i, linkColor);
            }

            // Pulses
            for (let j = 0; j < PARTICLES_PER_LINK; j++) {
                const idx = i * PARTICLES_PER_LINK + j;
                const progress = (time * 0.4 + j / PARTICLES_PER_LINK) % 1.0;
                link.curve.getPoint(progress, tempPos);
                const scale = 1.0 * link.opacity;
                tempMatrix.makeScale(scale, scale, scale);
                tempMatrix.setPosition(tempPos);
                pulseMeshRef.current!.setMatrixAt(idx, tempMatrix);
            }
        });

        linkMeshRef.current.instanceMatrix.needsUpdate = true;
        if (linkMeshRef.current.instanceColor) linkMeshRef.current.instanceColor.needsUpdate = true;
        if (linkGlowRef.current) {
            linkGlowRef.current.instanceMatrix.needsUpdate = true;
            linkGlowRef.current.instanceColor!.needsUpdate = true;
        }
        if (arrowMeshRef.current) {
            arrowMeshRef.current.instanceMatrix.needsUpdate = true;
            arrowMeshRef.current.instanceColor!.needsUpdate = true;
        }
        pulseMeshRef.current!.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            {/* 1. Main Physical Ribbon Links */}
            <instancedMesh
                ref={linkMeshRef}
                args={[cylinderGeometry, undefined, activeLinksData.length * CURVE_SUBDIVISIONS]}
            >
                <meshPhongMaterial
                    transparent
                    opacity={0.9}
                    shininess={100}
                    specular="#ffffff"
                />
            </instancedMesh>

            {/* 2. Link Glow */}
            <instancedMesh
                ref={linkGlowRef}
                args={[cylinderGeometry, undefined, activeLinksData.length * CURVE_SUBDIVISIONS]}
            >
                <meshBasicMaterial
                    transparent
                    opacity={0.15}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            {/* 3. Directional Arrows */}
            <instancedMesh
                ref={arrowMeshRef}
                args={[arrowGeometry, undefined, activeLinksData.length]}
            >
                <meshStandardMaterial metalness={0.8} roughness={0.2} transparent opacity={1} />
            </instancedMesh>

            {/* 4. Neon Particles */}
            <instancedMesh
                ref={pulseMeshRef}
                args={[pulseGeometry, undefined, activeLinksData.length * PARTICLES_PER_LINK]}
            >
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.4}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>
        </group>
    );
}
