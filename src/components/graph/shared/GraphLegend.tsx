/**
 * Graph Legend
 * 
 * Premium, animated legend showing node type colors and relationship meanings.
 * Features glassmorphism, colorful Phosphor icons, and smooth transitions.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { NODE_TYPE_COLORS, RELATIONSHIP_COLORS } from '../types';
import {
    ChevronDown,
    Sparkles,
    Users,
    MapPin,
    Building2,
    Swords,
    BookOpen,
    Crown,
    Gem,
    Shield,
    Heart,
    Star,
    Zap,
    Globe,
    Package,
    Flame,
    Target,
    Compass,
    Anchor
} from 'lucide-react';

// Map entity types to colorful icons with matching colors
const TYPE_CONFIG: Record<string, { icon: React.ReactNode; gradient: string }> = {
    Person: {
        icon: <Users className="w-3 h-3" />,
        gradient: 'from-blue-500 to-cyan-400'
    },
    Location: {
        icon: <MapPin className="w-3 h-3" />,
        gradient: 'from-green-500 to-emerald-400'
    },
    Organization: {
        icon: <Building2 className="w-3 h-3" />,
        gradient: 'from-purple-500 to-violet-400'
    },
    Conflict: {
        icon: <Swords className="w-3 h-3" />,
        gradient: 'from-red-500 to-orange-400'
    },
    LiteraryWork: {
        icon: <BookOpen className="w-3 h-3" />,
        gradient: 'from-amber-500 to-yellow-400'
    },
    FamilyGroup: {
        icon: <Crown className="w-3 h-3" />,
        gradient: 'from-yellow-500 to-amber-400'
    },
    Weapon: {
        icon: <Shield className="w-3 h-3" />,
        gradient: 'from-slate-500 to-zinc-400'
    },
    Event: {
        icon: <Star className="w-3 h-3" />,
        gradient: 'from-pink-500 to-rose-400'
    },
    Concept: {
        icon: <Gem className="w-3 h-3" />,
        gradient: 'from-indigo-500 to-purple-400'
    },
    Relationship: {
        icon: <Heart className="w-3 h-3" />,
        gradient: 'from-rose-500 to-pink-400'
    },
    Technology: {
        icon: <Zap className="w-3 h-3" />,
        gradient: 'from-cyan-500 to-blue-400'
    },
    Country: {
        icon: <Globe className="w-3 h-3" />,
        gradient: 'from-teal-500 to-green-400'
    },
    Product: {
        icon: <Package className="w-3 h-3" />,
        gradient: 'from-orange-500 to-amber-400'
    },
    Battle: {
        icon: <Flame className="w-3 h-3" />,
        gradient: 'from-red-600 to-orange-500'
    },
    Place: {
        icon: <Compass className="w-3 h-3" />,
        gradient: 'from-emerald-500 to-teal-400'
    },
    default: {
        icon: <Sparkles className="w-3 h-3" />,
        gradient: 'from-gray-500 to-slate-400'
    },
};

export function GraphLegend() {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDark, setIsDark] = useState(true);
    const { nodeTypes, linkTypes } = useGraphStore();

    // Detect dark mode
    useEffect(() => {
        const checkDarkMode = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        checkDarkMode();

        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`
                backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden
                ${isDark
                    ? 'bg-gray-900/80 border-white/10 shadow-black/40'
                    : 'bg-white/90 border-gray-200/50 shadow-gray-300/30'
                }
            `}
        >
            {/* Header */}
            <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className={`text-sm font-semibold tracking-wide ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        Legend
                    </span>
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                    className={isDark ? 'text-gray-400' : 'text-gray-500'}
                >
                    <ChevronDown className="w-4 h-4" />
                </motion.div>
            </motion.button>

            {/* Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4">
                            {/* Divider */}
                            <div className={`h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

                            {/* Node Types */}
                            {nodeTypes.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <p className={`text-xs font-semibold mb-3 uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Entities
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {nodeTypes.slice(0, 6).map((type, index) => {
                                            const config = TYPE_CONFIG[type] || TYPE_CONFIG.default;
                                            const color = NODE_TYPE_COLORS[type] || NODE_TYPE_COLORS.default;
                                            return (
                                                <LegendItem
                                                    key={type}
                                                    label={type}
                                                    color={color}
                                                    icon={config.icon}
                                                    gradient={config.gradient}
                                                    delay={index * 0.04}
                                                    isDark={isDark}
                                                />
                                            );
                                        })}
                                        {nodeTypes.length > 6 && (
                                            <motion.span
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className={`
                                                    text-xs font-medium px-2.5 py-1.5 rounded-xl
                                                    ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}
                                                `}
                                            >
                                                +{nodeTypes.length - 6}
                                            </motion.span>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Relationship Types */}
                            {linkTypes.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <p className={`text-xs font-semibold mb-3 uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Relationships
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {linkTypes.slice(0, 4).map((type, index) => (
                                            <LinkLegendItem
                                                key={type}
                                                label={type.replace(/_/g, ' ')}
                                                color={RELATIONSHIP_COLORS[type] || RELATIONSHIP_COLORS.default}
                                                delay={index * 0.04}
                                                isDark={isDark}
                                            />
                                        ))}
                                        {linkTypes.length > 4 && (
                                            <motion.span
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className={`
                                                    text-xs font-medium px-2.5 py-1.5 rounded-xl
                                                    ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}
                                                `}
                                            >
                                                +{linkTypes.length - 4}
                                            </motion.span>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Node Legend Item Component - Premium Pill Design
interface LegendItemProps {
    label: string;
    color: string;
    icon: React.ReactNode;
    gradient: string;
    delay?: number;
    isDark: boolean;
}

function LegendItem({ label, color, icon, gradient, delay = 0, isDark }: LegendItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.05, y: -2 }}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-default
                transition-all duration-200
                ${isDark
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200/50'
                }
            `}
            style={{
                boxShadow: `0 4px 12px ${color}15`,
            }}
        >
            <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg`}
                style={{
                    boxShadow: `0 3px 10px ${color}40`,
                }}
            >
                <span className="text-white">{icon}</span>
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                {label}
            </span>
        </motion.div>
    );
}

// Link Legend Item Component
interface LinkLegendItemProps {
    label: string;
    color: string;
    delay?: number;
    isDark: boolean;
}

function LinkLegendItem({ label, color, delay = 0, isDark }: LinkLegendItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.05, y: -2 }}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-default
                transition-all duration-200
                ${isDark
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200/50'
                }
            `}
        >
            {/* Animated connection line */}
            <div className="flex items-center gap-0.5">
                <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                />
                <div
                    className="w-5 h-0.5 rounded-full"
                    style={{
                        background: `linear-gradient(90deg, ${color}, ${color}60)`,
                    }}
                />
                <svg viewBox="0 0 8 8" className="w-2 h-2" fill={color}>
                    <path d="M0 0L8 4L0 8V0Z" />
                </svg>
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                {label}
            </span>
        </motion.div>
    );
}
