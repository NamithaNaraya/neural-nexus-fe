'use client';

import React from 'react';
import { Stars, Sparkles } from '@react-three/drei';

interface AtmosphereProps {
    isDark: boolean;
    color: string;
}

export function NeuralAtmosphere({ isDark, color }: AtmosphereProps) {
    return (
        <>
            <hemisphereLight
                intensity={isDark ? 0.4 : 0.6}
                groundColor={isDark ? "#1a0a20" : "#e0d4f0"}
            />
            <ambientLight intensity={isDark ? 0.5 : 0.8} />
            <pointLight
                position={[500, 500, 500]}
                intensity={isDark ? 2 : 1.2}
                color={isDark ? "#ec4899" : "#f97316"}
            />
            <directionalLight
                position={[-500, 500, -500]}
                intensity={isDark ? 1.2 : 0.6}
                color="#a855f7"
            />
            <Stars
                radius={400}
                depth={150}
                count={isDark ? 6000 : 1500}
                factor={8}
                saturation={0.3}
                fade
                speed={0.8}
            />
            <Sparkles
                count={300}
                scale={[1200, 1200, 1200]}
                opacity={isDark ? 0.5 : 0.3}
                size={6}
                speed={0.5}
                noise={0.3}
                color={isDark ? "#ec4899" : "#a855f7"}
            />
            <fog attach="fog" args={[isDark ? "#0A0C10" : color, 1200, 6000]} />
        </>
    );
}
