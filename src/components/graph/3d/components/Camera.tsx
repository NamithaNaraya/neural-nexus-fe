'use client';

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraProps {
    targetNodeId: string | null;
    nodeMap: Map<string, any>;
    defaultCenter: THREE.Vector3;
    graphRadius?: number;
    resetKey?: number;
}

export function CameraManager({ targetNodeId, nodeMap, defaultCenter, graphRadius, resetKey }: CameraProps) {
    const { camera, controls } = useThree();
    const targetVec = useRef(new THREE.Vector3(0, 0, 0));
    const isFirstLoad = useRef(true);
    const lastTargetId = useRef<string | null>(null);

    // Handle Reset Signal
    React.useEffect(() => {
        if (resetKey && resetKey > 0) {
            console.log('[3D] Resetting camera view...');
            isFirstLoad.current = true;
            lastTargetId.current = null;
        }
    }, [resetKey]);

    useFrame((state) => {
        let focusPos: THREE.Vector3;

        if (targetNodeId && nodeMap && nodeMap.has(targetNodeId)) {
            const node = nodeMap.get(targetNodeId);
            focusPos = new THREE.Vector3(node.x || 0, node.y || 0, node.z || 0);
        } else {
            focusPos = defaultCenter || new THREE.Vector3(0, 0, 0);
        }

        // 1. Target Following: Always smoothly move the pivot point to the focused node/center
        // This allows the user to rotate around the node even while it moves.
        targetVec.current.lerp(focusPos, 0.08);

        if (controls) {
            // @ts-ignore
            if (controls.target) {
                // @ts-ignore
                controls.target.lerp(targetVec.current, 0.08);
            }

            // 2. Position Auto-Focus: Only "jump" the camera position when selection changes
            // or on initial load. This prevents fighting with manual rotation.
            if (isFirstLoad.current || targetNodeId !== lastTargetId.current) {
                // Calculate ideal distance based on graph radius if no node is focused
                const distance = targetNodeId ? 600 : Math.max(800, (graphRadius || 500) * 2.5);
                const idealPos = focusPos.clone().add(new THREE.Vector3(0, distance * 0.1, distance));

                camera.position.lerp(idealPos, 0.08);

                // Once we are close enough to the target, stop forcing the position
                if (camera.position.distanceTo(idealPos) < 1) {
                    isFirstLoad.current = false;
                    lastTargetId.current = targetNodeId;
                }
            }

            // @ts-ignore
            if (typeof controls.update === 'function') {
                // @ts-ignore
                controls.update();
            }
        }
    });

    return null;
}
