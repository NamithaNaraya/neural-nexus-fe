/**
 * Device Detection Hook
 * 
 * Detects device type and screen size for responsive behavior.
 * Used to lock mobile/tablet devices to 2D view for performance.
 */
'use client';

import { useState, useEffect, useMemo } from 'react';

interface DeviceInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    screenWidth: number;
    screenHeight: number;
    is3DCapable: boolean;
    orientationType: 'portrait' | 'landscape';
}

interface UseDeviceOptions {
    mobileBreakpoint?: number;
    tabletBreakpoint?: number;
}

const DEFAULT_OPTIONS: UseDeviceOptions = {
    mobileBreakpoint: 768,
    tabletBreakpoint: 1024,
};

export function useDevice(options: UseDeviceOptions = {}): DeviceInfo {
    const { mobileBreakpoint, tabletBreakpoint } = { ...DEFAULT_OPTIONS, ...options };

    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    });

    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        // Set initial dimensions
        handleResize();

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    const deviceInfo = useMemo<DeviceInfo>(() => {
        const { width, height } = dimensions;

        const isMobile = width < mobileBreakpoint!;
        const isTablet = width >= mobileBreakpoint! && width < tabletBreakpoint!;
        const isDesktop = width >= tabletBreakpoint!;

        // 3D is capable on desktop only for performance
        const is3DCapable = isDesktop;

        const orientationType = width > height ? 'landscape' : 'portrait';

        return {
            isMobile,
            isTablet,
            isDesktop,
            screenWidth: width,
            screenHeight: height,
            is3DCapable,
            orientationType,
        };
    }, [dimensions, mobileBreakpoint, tabletBreakpoint]);

    return deviceInfo;
}

/**
 * Hook to automatically lock view mode based on device capability
 */
export function useViewModeLock(
    currentViewMode: '2d' | '3d' | 'charts' | 'hybrid',
    setViewMode: (mode: '2d' | '3d' | 'charts' | 'hybrid') => void
): { lockedMode: '2d' | '3d' | 'charts' | 'hybrid'; isLocked: boolean; reason?: string } {
    const { is3DCapable, isMobile, isTablet } = useDevice();

    useEffect(() => {
        // Force 2D on non-capable devices
        if (!is3DCapable && currentViewMode === '3d') {
            setViewMode('2d');
        }
    }, [is3DCapable, currentViewMode, setViewMode]);

    const isLocked = !is3DCapable && currentViewMode === '3d';

    let reason: string | undefined;
    if (isMobile) {
        reason = 'Mobile device detected. 3D view disabled for performance.';
    } else if (isTablet) {
        reason = 'Tablet device detected. 3D view disabled for performance.';
    }

    return {
        lockedMode: is3DCapable ? currentViewMode : (currentViewMode === '3d' ? '2d' : currentViewMode),
        isLocked,
        reason,
    };
}

/**
 * Hook to check WebGL support
 */
export function useWebGLSupport(): { isSupported: boolean; tier: 'high' | 'medium' | 'low' | 'none' } {
    const [support, setSupport] = useState<{ isSupported: boolean; tier: 'high' | 'medium' | 'low' | 'none' }>({
        isSupported: true,
        tier: 'high',
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

            if (!gl) {
                setSupport({ isSupported: false, tier: 'none' });
                return;
            }

            // Check for discrete GPU via performance hints
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            let tier: 'high' | 'medium' | 'low' = 'medium';

            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
                const rendererLower = renderer.toLowerCase();

                // High-end GPU detection
                if (
                    rendererLower.includes('nvidia') ||
                    rendererLower.includes('radeon') ||
                    rendererLower.includes('geforce') ||
                    rendererLower.includes('rtx') ||
                    rendererLower.includes('gtx')
                ) {
                    tier = 'high';
                }
                // Low-end GPU detection
                else if (
                    rendererLower.includes('intel') ||
                    rendererLower.includes('mesa') ||
                    rendererLower.includes('llvmpipe') ||
                    rendererLower.includes('swiftshader')
                ) {
                    tier = 'low';
                }
            }

            setSupport({ isSupported: true, tier });
        } catch {
            setSupport({ isSupported: false, tier: 'none' });
        }
    }, []);

    return support;
}

/**
 * Get recommended node limit based on device capability
 */
export function getRecommendedNodeLimit(
    tier: 'high' | 'medium' | 'low' | 'none',
    is3D: boolean
): number {
    const limits = {
        high: is3D ? 100000 : 250000,
        medium: is3D ? 25000 : 75000,
        low: is3D ? 5000 : 25000,
        none: 10000, // 2D only
    };

    return limits[tier];
}
