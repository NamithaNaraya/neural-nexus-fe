/**
 * Dashboard Layout Component
 * 
 * Main layout wrapper for the Neural Nexus dashboard.
 * Provides consistent layout with sidebar and header.
 */
'use client';

import React, { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import LibrarianSidebar from './LibrarianSidebar';
import { Header } from './Header';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: Breadcrumb[];
    showSidebar?: boolean;
    showNavbar?: boolean;
}

export default function DashboardLayout({
    children,
    breadcrumbs = [],
    showSidebar = true,
    showNavbar = true,
}: DashboardLayoutProps) {
    const {
        sidebarOpen,
        isFullscreen,
        setIsMobile,
        theme,
    } = useUIStore();

    // Detect mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [setIsMobile]);

    // Apply theme class to document
    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    }, [theme]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K for search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                // Focus search input
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                searchInput?.focus();
            }

            // Escape to exit fullscreen
            if (e.key === 'Escape' && useUIStore.getState().isFullscreen) {
                useUIStore.getState().setFullscreen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar */}
            {showSidebar && !isFullscreen && <LibrarianSidebar />}

            {/* Header */}
            {showNavbar && !isFullscreen && <Header />}

            {/* Main Content */}
            <main
                className={`
          min-h-screen transition-all duration-300
          ${showNavbar && !isFullscreen ? 'pt-14' : ''}
          ${showSidebar && sidebarOpen && !isFullscreen ? 'pl-64' : ''}
        `}
            >
                {children}
            </main>

            {/* Fullscreen Exit Button */}
            {isFullscreen && (
                <button
                    onClick={() => useUIStore.getState().setFullscreen(false)}
                    className="fixed top-4 right-4 z-50 p-2 glass-strong rounded-lg hover:bg-white/20 transition-colors"
                    aria-label="Exit fullscreen"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Notification Container */}
            <NotificationContainer />
        </div>
    );
}

/**
 * Notification Container
 * Displays toast notifications
 */
function NotificationContainer() {
    const { notifications, removeNotification } = useUIStore();

    if (notifications.length === 0) return null;

    const iconMap = {
        success: (
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        warning: (
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5 text-electric" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className="glass-strong rounded-lg shadow-xl p-4 min-w-[300px] max-w-md animate-slide-in-left"
                >
                    <div className="flex items-start gap-3">
                        {iconMap[notification.type]}
                        <div className="flex-1">
                            <div className="font-medium text-sm">{notification.title}</div>
                            {notification.message && (
                                <div className="text-xs text-muted-foreground mt-1">{notification.message}</div>
                            )}
                        </div>
                        <button
                            onClick={() => removeNotification(notification.id)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
