"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
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
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Sync with document theme
    useEffect(() => {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
    }, []);

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <button
                    onClick={() => router.push('/library')}
                    className="text-xl font-bold text-foreground hover:opacity-80 transition-opacity"
                >
                    <span className="text-emerald">Neural</span> Nexus
                </button>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    {showThemeToggle && (
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            aria-label="Toggle theme"
                        >
                            {isDarkMode ? (
                                <Sun className="w-5 h-5 text-muted-foreground" />
                            ) : (
                                <Moon className="w-5 h-5 text-muted-foreground" />
                            )}
                        </button>
                    )}

                    {/* User Info */}
                    {isAuthenticated && (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald/20 flex items-center justify-center">
                                    <span className="text-emerald text-sm font-medium">
                                        {user?.email?.[0]?.toUpperCase() || "U"}
                                    </span>
                                </div>
                                {!minimal && (
                                    <span className="text-sm text-muted-foreground hidden sm:block">
                                        {user?.email || "user@neuralnexus.ai"}
                                    </span>
                                )}
                            </div>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
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
