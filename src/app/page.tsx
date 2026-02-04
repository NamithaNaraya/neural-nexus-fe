"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
    const router = useRouter();
    const { isAuthenticated, checkAuth } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check authentication status
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        // Redirect based on auth status after initial check
        if (isAuthenticated) {
            router.push("/library");
        } else {
            router.push("/login");
        }
    }, [isAuthenticated, router]);

    // Don't render until mounted to avoid hydration mismatch
    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-neural-bg flex items-center justify-center">
            {/* Animated Loading Screen */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
            >
                {/* Neural Network Animation Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <NeuralBackground />
                </div>

                {/* Logo and Loading */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                >
                    <h1 className="text-5xl font-bold text-white mb-4">
                        <span className="text-emerald">Neural</span> Nexus
                    </h1>
                    <p className="text-neural-muted text-lg mb-8">
                        Knowledge Graph Platform
                    </p>

                    {/* Loading Spinner */}
                    <div className="flex justify-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 border-2 border-emerald border-t-transparent rounded-full"
                        />
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}

// Simple animated neural network background
function NeuralBackground() {
    // Generate static random values once on component mount
    const [nodes] = useState(() => [...Array(20)].map(() => ({
        cx: Math.random() * 100,
        cy: Math.random() * 100,
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 2,
    })));

    const [lines] = useState(() => [...Array(15)].map(() => ({
        x1: Math.random() * 100,
        y1: Math.random() * 100,
        x2: Math.random() * 100,
        y2: Math.random() * 100,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 2,
    })));

    return (
        <svg
            className="w-full h-full opacity-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            {/* Animated nodes */}
            {nodes.map((node, i) => (
                <motion.circle
                    key={i}
                    cx={node.cx}
                    cy={node.cy}
                    r={0.5}
                    fill="#10B981"
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{
                        duration: node.duration,
                        repeat: Infinity,
                        delay: node.delay,
                    }}
                />
            ))}
            {/* Animated connections */}
            {lines.map((line, i) => (
                <motion.line
                    key={`line-${i}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="#10B981"
                    strokeWidth={0.1}
                    initial={{ opacity: 0.1 }}
                    animate={{ opacity: [0.1, 0.4, 0.1] }}
                    transition={{
                        duration: line.duration,
                        repeat: Infinity,
                        delay: line.delay,
                    }}
                />
            ))}
        </svg>
    );
}
