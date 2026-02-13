'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphLink } from '@/store/graphStore';
import { RELATIONSHIP_COLORS } from '../../types';

const CURVE_SUBDIVISIONS = 32; // Optimized for responsiveness, still smooth
const STABLE_CYLINDER_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 16);
const STABLE_ARROW_GEOMETRY = new THREE.ConeGeometry(2, 6, 12);

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

    const activeLinksData = useMemo(() => {
        const safeLinks = Array.isArray(links) ? links : [];
        const safeNodeMap = nodeMap instanceof Map ? nodeMap : new Map();
        if (safeLinks.length === 0 || safeNodeMap.size === 0) return [];

        const safeSelected = Array.isArray(selectedNodes) ? selectedNodes : [];
        const hasFocus = focusNodeId || safeSelected.length > 0;
        const focusIds = focusNodeId ? [focusNodeId] : safeSelected;

        const result: any[] = [];
        safeLinks.forEach((link, i) => {
            if (!link || !link.source || !link.target) return;

            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;

            if (!sourceId || !targetId) return;

            const source = safeNodeMap.get(sourceId);
            const target = safeNodeMap.get(targetId);

            if (source && target) {
                if (typeof source.x !== 'number' || typeof target.x !== 'number') return;

                const isPartOfFocus = focusIds.includes(sourceId) || focusIds.includes(targetId);
                const opacity = hasFocus ? (isPartOfFocus ? 1.0 : 0.05) : 0.8;
                const baseColor = RELATIONSHIP_COLORS[link.type] || RELATIONSHIP_COLORS.default;

                const start = new THREE.Vector3(source.x || 0, source.y || 0, source.z || 0);
                const end = new THREE.Vector3(target.x || 0, target.y || 0, target.z || 0);
                const dist = Math.max(0.1, start.distanceTo(end));

                const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                const distFromOrigin = mid.length();
                const normal = distFromOrigin > 1 ? mid.clone().normalize() : new THREE.Vector3(0, 1, 0);
                const control = mid.clone().add(normal.multiplyScalar(dist * 0.25));

                const curve = new THREE.QuadraticBezierCurve3(start, control, end);
                const points = curve.getPoints(CURVE_SUBDIVISIONS);

                const segmentData: any[] = [];
                const safeSubdivisions = Math.max(1, points.length - 1);
                for (let j = 0; j < safeSubdivisions; j++) {
                    const p1 = points[j];
                    const p2 = points[j + 1];
                    if (!p1 || !p2) continue;
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
                    width: isPartOfFocus ? 1.2 : 0.6, // Significant increase for "solid" look
                    arrowPos,
                    arrowTangent
                });
            }
        });
        return result;
    }, [links, nodeMap, focusNodeId, selectedNodes, analyticSelectionActive]);

    const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
    const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

    useFrame((state) => {
        const safeData = Array.isArray(activeLinksData) ? activeLinksData : [];
        if (!linkMeshRef.current || safeData.length === 0) return;

        const totalSegments = safeData.length * CURVE_SUBDIVISIONS;
        if (linkMeshRef.current.count !== totalSegments) linkMeshRef.current.count = totalSegments;
        if (linkGlowRef.current) linkGlowRef.current.count = totalSegments;
        if (arrowMeshRef.current) arrowMeshRef.current.count = safeData.length;

        safeData.forEach((link, i) => {
            if (!link || !link.color) return;
            const linkColor = new THREE.Color(link.color);

            const safeSegments = Array.isArray(link.segmentData) ? link.segmentData : [];
            safeSegments.forEach((seg: any, j: number) => {
                const idx = i * CURVE_SUBDIVISIONS + j;
                if (j >= CURVE_SUBDIVISIONS || !seg) return;

                tempMatrix.identity();
                tempMatrix.lookAt(seg.start, seg.end, up);
                tempMatrix.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
                tempMatrix.scale(new THREE.Vector3(link.width || 0.1, seg.dist || 1, link.width || 0.1));
                tempMatrix.setPosition(seg.mid);

                linkMeshRef.current!.setMatrixAt(idx, tempMatrix);
                linkMeshRef.current!.setColorAt(idx, linkColor);
            });

            if (arrowMeshRef.current && link.arrowPos) {
                tempMatrix.identity();
                const rotMatrix = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), link.arrowTangent, up);
                rotMatrix.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
                tempMatrix.makeTranslation(link.arrowPos.x, link.arrowPos.y, link.arrowPos.z);
                tempMatrix.multiply(rotMatrix);
                arrowMeshRef.current.setMatrixAt(i, tempMatrix);
                arrowMeshRef.current.setColorAt(i, linkColor);
            }
        });

        if (linkMeshRef.current) {
            linkMeshRef.current.instanceMatrix.needsUpdate = true;
            if (linkMeshRef.current.instanceColor) linkMeshRef.current.instanceColor.needsUpdate = true;
        }
        if (linkGlowRef.current) {
            linkGlowRef.current.instanceMatrix.needsUpdate = true;
            if (linkGlowRef.current.instanceColor) linkGlowRef.current.instanceColor.needsUpdate = true;
        }
        if (arrowMeshRef.current) {
            arrowMeshRef.current.instanceMatrix.needsUpdate = true;
            if (arrowMeshRef.current.instanceColor) arrowMeshRef.current.instanceColor.needsUpdate = true;
        }
    });

    return (
        <group>
            <instancedMesh
                ref={linkMeshRef}
                args={[STABLE_CYLINDER_GEOMETRY, undefined, (Array.isArray(activeLinksData) ? activeLinksData.length : 0) * CURVE_SUBDIVISIONS]}
            >
                <meshStandardMaterial
                    transparent
                    opacity={0.8}
                    roughness={1}
                    metalness={0}
                />
            </instancedMesh>

            <instancedMesh
                ref={arrowMeshRef}
                args={[STABLE_ARROW_GEOMETRY, undefined, Array.isArray(activeLinksData) ? activeLinksData.length : 0]}
            >
                <meshStandardMaterial metalness={0.9} roughness={0.1} transparent opacity={1} />
            </instancedMesh>
        </group>
    );
}
