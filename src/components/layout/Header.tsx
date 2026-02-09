"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { Sun, Moon, LogOut } from "lucide-react";

interface HeaderProps {
    showThemeToggle?: boolean;
    minimal?: boolean;
}

/**
 * Shared Header Component
 * 
 * Consistent header bar across all pages with:
 * - Neural Nexus branding
 * - Theme toggle
 * - User info & logout
 */
export function Header({ showThemeToggle = true, minimal = false }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, isAuthenticated } = useAuthStore();
    const { theme, toggleTheme } = useUIStore();

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <header className="border-b border-border/30 backdrop-blur-xl bg-background/90 sticky top-0 z-50 shadow-sm">
            <div className="w-full mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo - Premium Branding */}
                <button
                    onClick={() => router.push('/library')}
                    className="group flex items-center gap-2 text-xl font-bold text-foreground hover:opacity-90 transition-all duration-300"
                >
                    <span className="font-heading bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-orange-500 to-purple-600 bg-[length:200%_auto] animate-gradient-shift">
                        Neural
                    </span>
                    <span className="font-heading text-foreground group-hover:text-primary transition-colors duration-300">
                        Nexus
                    </span>
                </button>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    {showThemeToggle && (
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl hover:bg-muted/60 hover:shadow-md transition-all duration-300 border border-transparent hover:border-border/50"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-5 h-5 text-muted-foreground hover:text-amber-400 transition-colors" />
                            ) : (
                                <Moon className="w-5 h-5 text-muted-foreground hover:text-indigo-500 transition-colors" />
                            )}
                        </button>
                    )}

                    {/* User Info */}
                    {isAuthenticated && (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500/30 via-orange-500/30 to-purple-600/30 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-br from-pink-500 to-purple-600 font-semibold text-sm">
                                        {user?.email?.[0]?.toUpperCase() || "U"}
                                    </span>
                                </div>
                                {!minimal && (
                                    <span className="text-sm text-muted-foreground hidden sm:block font-medium">
                                        {user?.email || "user@neuralnexus.ai"}
                                    </span>
                                )}
                            </div>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="p-2.5 rounded-xl hover:bg-destructive/10 transition-all duration-300 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/30"
                                aria-label="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;
