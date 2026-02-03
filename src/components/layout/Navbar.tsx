/**
 * Navbar Component
 * 
 * Top navigation bar for Neural Nexus.
 * Features:
 * - Breadcrumb navigation
 * - Global search
 * - User menu
 * - Quick actions
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useGraphStore } from '@/store/graphStore';

// Icons
const Icons = {
    Menu: () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    ),
    Search: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    ),
    Bell: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
    ),
    User: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    Maximize: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
    ),
    Minimize: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
        </svg>
    ),
    ChevronRight: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    ),
    LogOut: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    ),
};

interface Breadcrumb {
    label: string;
    href?: string;
}

interface NavbarProps {
    breadcrumbs?: Breadcrumb[];
}

export default function Navbar({ breadcrumbs = [] }: NavbarProps) {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { toggleSidebar, isFullscreen, toggleFullscreen, sidebarOpen } = useUIStore();
    const { searchQuery, setSearchQuery, searchResults } = useGraphStore();

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Handle search
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        setShowSearchResults(query.length > 0);
    };

    // Handle search result click
    const handleResultClick = (nodeId: string) => {
        setShowSearchResults(false);
        // Navigate to node or highlight in graph
    };

    // Handle logout
    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    // Hide navbar in fullscreen mode
    if (isFullscreen) return null;

    return (
        <header
            className={`
        glass-strong fixed top-0 right-0 z-30 h-14
        transition-all duration-300
        ${sidebarOpen ? 'left-64' : 'left-0'}
      `}
        >
            <div className="h-full px-4 flex items-center justify-between">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    {/* Menu Toggle */}
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Toggle menu"
                    >
                        <Icons.Menu />
                    </button>

                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-1 text-sm">
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && (
                                    <Icons.ChevronRight />
                                )}
                                {crumb.href ? (
                                    <button
                                        onClick={() => router.push(crumb.href!)}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {crumb.label}
                                    </button>
                                ) : (
                                    <span className="font-medium">{crumb.label}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                </div>

                {/* Center Section - Search */}
                <div className="flex-1 max-w-xl mx-4 relative">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <Icons.Search />
                        </span>
                        <input
                            type="text"
                            placeholder="Search nodes, relationships... (⌘K)"
                            value={searchQuery}
                            onChange={handleSearch}
                            onFocus={() => searchQuery && setShowSearchResults(true)}
                            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                            className="input-neural pl-10 text-sm w-full"
                        />
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-lg shadow-xl overflow-hidden animate-scale-in">
                            <div className="max-h-80 overflow-y-auto">
                                {searchResults.map((node) => (
                                    <button
                                        key={node.id}
                                        onClick={() => handleResultClick(node.id)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{
                                                backgroundColor: node.type === 'Person' ? '#10B981' :
                                                    node.type === 'Place' ? '#3B82F6' :
                                                        '#F59E0B'
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{node.name}</div>
                                            <div className="text-xs text-muted-foreground">{node.type}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                    {/* Fullscreen Toggle */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Toggle fullscreen"
                    >
                        {isFullscreen ? <Icons.Minimize /> : <Icons.Maximize />}
                    </button>

                    {/* Notifications */}
                    <button
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors relative"
                        aria-label="Notifications"
                    >
                        <Icons.Bell />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                    </button>

                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-electric flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                        </button>

                        {/* User Dropdown */}
                        {showUserMenu && (
                            <div className="absolute top-full right-0 mt-2 w-48 glass-strong rounded-lg shadow-xl overflow-hidden animate-scale-in">
                                <div className="p-3 border-b border-white/10">
                                    <div className="font-medium text-sm truncate">{user?.email}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{user?.role || 'User'}</div>
                                </div>
                                <div className="p-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left text-sm text-red-400"
                                    >
                                        <Icons.LogOut />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
