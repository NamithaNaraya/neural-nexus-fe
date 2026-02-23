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
        <header className="glass-strong sticky top-0 z-50 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.05)] h-20 flex items-center">
            <div className="w-full mx-auto px-8 flex items-center justify-between">
                {/* Logo - Premium Branding */}
                <button
                    onClick={() => router.push('/library')}
                    className="group flex items-center gap-3 text-2xl font-black text-foreground hover:opacity-90 transition-all duration-300"
                >
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-emerald/20 transition-transform duration-500 flex items-center justify-center bg-white/5 p-0.5 border border-border group-hover:rotate-3 shrink-0">
                        <img src="/logo.png" alt="NESSO Botanica Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col items-start leading-none gap-0.5">
                        <span className="font-heading text-emerald font-black uppercase tracking-tighter text-xl pt-0.5">
                            NESSO Botanica
                        </span>
                        <span className="font-heading text-foreground/60 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-bold">
                            Natural & Essential Oils.
                        </span>
                    </div>
                </button>

                {/* Right Section */}
                <div className="flex items-center gap-6">
                    {/* Theme Toggle */}
                    {showThemeToggle && (
                        <button
                            onClick={toggleTheme}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border border-white/5 hover:border-white/20 group/theme"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-5 h-5 text-muted-foreground group-hover:text-amber-400 group-hover:rotate-45 transition-all duration-500" />
                            ) : (
                                <Moon className="w-5 h-5 text-muted-foreground group-hover:text-indigo-500 group-hover:-rotate-12 transition-all duration-500" />
                            )}
                        </button>
                    )}

                    {/* User Info */}
                    {isAuthenticated && (
                        <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                            <div className="flex flex-col items-end leading-none hidden md:flex">
                                <span className="text-xs font-bold text-foreground/80">{user?.email?.split('@')[0]}</span>
                                <span className="text-[10px] text-primary font-black uppercase tracking-widest opacity-60">Architect</span>
                            </div>
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-[1px] shadow-xl group/user cursor-pointer">
                                <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center border border-white/10 overflow-hidden relative">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-br from-primary to-rose-500 font-black text-lg">
                                        {user?.email?.[0]?.toUpperCase() || "U"}
                                    </span>
                                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover/user:opacity-100 transition-opacity duration-300" />
                                </div>
                            </div>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="p-3 rounded-2xl bg-destructive/5 hover:bg-destructive/10 transition-all duration-300 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/20"
                                aria-label="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;
