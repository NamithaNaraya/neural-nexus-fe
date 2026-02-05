/**
 * Skeleton Loader
 * 
 * Placeholder loaders for content while data is being fetched.
 */
'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animate?: boolean;
}

export function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animate = true,
}: SkeletonProps) {
    const baseClasses = 'bg-muted/50 rounded';
    const animateClasses = animate ? 'animate-pulse' : '';

    const variantClasses = {
        text: 'h-4 w-full rounded',
        circular: 'rounded-full aspect-square',
        rectangular: 'rounded-md',
    };

    const style: React.CSSProperties = {
        width: width,
        height: height,
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${animateClasses} ${className}`}
            style={style}
        />
    );
}

// Pre-built skeleton patterns
export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`p-4 border rounded-lg space-y-3 ${className}`}>
            <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1 space-y-2">
                    <Skeleton width="60%" height={16} />
                    <Skeleton width="40%" height={12} />
                </div>
            </div>
            <Skeleton height={60} />
            <div className="flex gap-2">
                <Skeleton width={60} height={24} />
                <Skeleton width={80} height={24} />
            </div>
        </div>
    );
}

export function SkeletonList({ count = 5, className = '' }: { count?: number; className?: string }) {
    return (
        <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton variant="circular" width={32} height={32} />
                    <div className="flex-1 space-y-1">
                        <Skeleton width="70%" height={14} />
                        <Skeleton width="40%" height={10} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SkeletonGraph({ className = '' }: { className?: string }) {
    return (
        <div className={`relative w-full h-64 bg-muted/20 rounded-lg overflow-hidden ${className}`}>
            {/* Fake nodes */}
            <Skeleton
                variant="circular"
                width={40}
                height={40}
                className="absolute top-1/4 left-1/4"
            />
            <Skeleton
                variant="circular"
                width={50}
                height={50}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            />
            <Skeleton
                variant="circular"
                width={35}
                height={35}
                className="absolute top-1/3 right-1/4"
            />
            <Skeleton
                variant="circular"
                width={30}
                height={30}
                className="absolute bottom-1/4 left-1/3"
            />
            <Skeleton
                variant="circular"
                width={45}
                height={45}
                className="absolute bottom-1/3 right-1/3"
            />

            {/* Loading text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-muted-foreground animate-pulse">
                    Loading graph...
                </span>
            </div>
        </div>
    );
}

export function SkeletonPanel({ className = '' }: { className?: string }) {
    return (
        <div className={`p-4 space-y-4 ${className}`}>
            <Skeleton width="50%" height={24} />
            <div className="space-y-2">
                <Skeleton height={14} />
                <Skeleton width="80%" height={14} />
                <Skeleton width="60%" height={14} />
            </div>
            <Skeleton height={100} />
            <div className="flex gap-2 pt-2">
                <Skeleton width={80} height={32} />
                <Skeleton width={80} height={32} />
            </div>
        </div>
    );
}
