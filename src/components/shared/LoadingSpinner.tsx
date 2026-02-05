/**
 * Loading Spinner
 * 
 * Consistent loading spinner used across all panels.
 */
'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
    className?: string;
    fullScreen?: boolean;
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
};

export function LoadingSpinner({
    size = 'md',
    message,
    className = '',
    fullScreen = false,
}: LoadingSpinnerProps) {
    const content = (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
            {message && (
                <p className="text-sm text-muted-foreground animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
                {content}
            </div>
        );
    }

    return content;
}

// Inline variant for buttons, etc.
export function InlineSpinner({ className = '' }: { className?: string }) {
    return <Loader2 className={`w-4 h-4 animate-spin ${className}`} />;
}
