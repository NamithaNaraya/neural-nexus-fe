"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
    const router = useRouter();
    const { isAuthenticated, checkAuth } = useAuthStore();

    useEffect(() => {
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
    return (
        <svg
            className="w-full h-full opacity-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            {/* Animated nodes */}
            {[...Array(20)].map((_, i) => (
                <motion.circle
                    key={i}
                    cx={Math.random() * 100}
                    cy={Math.random() * 100}
                    r={0.5}
                    fill="#10B981"
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{
                        duration: 2 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                    }}
                />
            ))}
            {/* Animated connections */}
            {[...Array(15)].map((_, i) => (
                <motion.line
                    key={`line-${i}`}
                    x1={Math.random() * 100}
                    y1={Math.random() * 100}
                    x2={Math.random() * 100}
                    y2={Math.random() * 100}
                    stroke="#10B981"
                    strokeWidth={0.1}
                    initial={{ opacity: 0.1 }}
                    animate={{ opacity: [0.1, 0.4, 0.1] }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                    }}
                />
            ))}
        </svg>
    );
}
