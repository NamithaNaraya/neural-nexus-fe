'use client';

import React from 'react';
import { Stars } from '@react-three/drei';

interface AtmosphereProps {
    isDark: boolean;
    color: string;
}

export function NeuralAtmosphere({ isDark, color }: AtmosphereProps) {
    return (
        <>
            <hemisphereLight intensity={isDark ? 0.3 : 0.5} groundColor="#000000" />
            <ambientLight intensity={isDark ? 0.4 : 0.7} />
            <pointLight position={[500, 500, 500]} intensity={isDark ? 1.5 : 1} />
            <directionalLight position={[-500, 500, -500]} intensity={isDark ? 1 : 0.5} />
            <Stars
                radius={300}
                depth={100}
                count={isDark ? 5000 : 1000}
                factor={6}
                saturation={0}
                fade
                speed={1}
            />
            <fog attach="fog" args={[color, 1000, 5000]} />
        </>
    );
}
