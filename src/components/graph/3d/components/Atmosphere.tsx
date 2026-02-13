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
                intensity={isDark ? 0.4 : 1.2}
                groundColor={isDark ? "#1a0a20" : "#ffffff"}
            />
            {/* Super Bright Atmospheric Lighting */}
            <ambientLight intensity={isDark ? 0.8 : 1.2} />
            <pointLight position={[100, 100, 100]} intensity={2.5} color="#ffffff" />
            <directionalLight position={[-100, 200, 100]} intensity={3.5} color="#ffffff" />
            <pointLight position={[-200, -100, -200]} intensity={1.5} color="#ffffff" />
            <Stars
                radius={400}
                depth={150}
                count={isDark ? 6000 : 500} // Significant reduction for light mode
                factor={isDark ? 8 : 4}
                saturation={0.3}
                fade
                speed={0.8}
            />
            <Sparkles
                count={isDark ? 300 : 50} // Significant reduction for light mode
                scale={[1200, 1200, 1200]}
                opacity={isDark ? 0.5 : 0.15}
                size={isDark ? 6 : 3}
                speed={0.5}
                noise={0.3}
                color={isDark ? "#ec4899" : "#22d3ee"}
            />
            <fog attach="fog" args={[isDark ? "#0A0C10" : color, 800, 4000]} />
        </>
    );
}
