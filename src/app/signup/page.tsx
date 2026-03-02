"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, UserPlus } from "lucide-react";

export default function SignUpPage() {
    const router = useRouter();
    const { register, isAuthenticated, isLoading, error, clearError, checkAuth, isHydrated } = useAuthStore();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        checkAuth();
    }, [checkAuth]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isHydrated && isAuthenticated) {
            router.push("/library");
        }
    }, [isAuthenticated, isHydrated, router]);

    // Password strength indicators
    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
    };
    const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError(null);

        if (password !== confirmPassword) {
            setLocalError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setLocalError("Password must be at least 6 characters");
            return;
        }

        try {
            await register(email, password);
            router.push("/library");
        } catch {
            // Error is handled by the store
        }
    };

    if (!mounted) return null;

    // Generate static background elements (same as login for visual consistency)
    const bgNodes = [...Array(20)].map((_, i) => ({
        cx: (i * 17 + 7) % 100,
        cy: (i * 23 + 13) % 100,
        duration: 2 + (i % 4),
        delay: (i % 5) * 0.4,
    }));

    const bgLines = [...Array(12)].map((_, i) => ({
        x1: (i * 19 + 5) % 100,
        y1: (i * 29 + 11) % 100,
        x2: (i * 31 + 17) % 100,
        y2: (i * 13 + 23) % 100,
        duration: 3 + (i % 3),
        delay: (i % 4) * 0.5,
    }));

    const displayError = localError || error;

    const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald"];
    const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

    return (
        <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
            {/* Animated Neural Background */}
            <div className="absolute inset-0">
                <svg
                    className="w-full h-full opacity-20"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    {bgNodes.map((node, i) => (
                        <motion.circle
                            key={i}
                            cx={node.cx}
                            cy={node.cy}
                            r={0.4}
                            fill="#10B981"
                            initial={{ opacity: 0.2 }}
                            animate={{ opacity: [0.2, 0.7, 0.2] }}
                            transition={{
                                duration: node.duration,
                                repeat: Infinity,
                                delay: node.delay,
                            }}
                        />
                    ))}
                    {bgLines.map((line, i) => (
                        <motion.line
                            key={`l-${i}`}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke="#10B981"
                            strokeWidth={0.08}
                            initial={{ opacity: 0.05 }}
                            animate={{ opacity: [0.05, 0.3, 0.05] }}
                            transition={{
                                duration: line.duration,
                                repeat: Infinity,
                                delay: line.delay,
                            }}
                        />
                    ))}
                </svg>
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-emerald/5" />

            {/* Sign Up Card */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-emerald/5 p-8">
                    {/* Logo & Branding */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-center mb-8"
                    >
                        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center bg-white/5 p-2 border border-border">
                            <img
                                src="/logo.png"
                                alt="NESSO Botanica Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground mb-1">
                            <span className="text-emerald">Create</span> Account
                        </h1>
                        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
                            Join NESSO Botanica
                        </p>
                    </motion.div>

                    {/* Error Message */}
                    {displayError && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mb-5 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{displayError}</span>
                        </motion.div>
                    )}

                    {/* Sign Up Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Email
                            </label>
                            <input
                                id="signup-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoFocus
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:border-emerald/50 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="signup-password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 pr-12 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:border-emerald/50 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {password.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="mt-2 space-y-2"
                                >
                                    <div className="flex gap-1">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < passwordStrength
                                                        ? strengthColors[passwordStrength - 1]
                                                        : 'bg-muted'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                            {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : "Too short"}
                                        </span>
                                        <div className="flex gap-2 text-[10px]">
                                            <span className={passwordChecks.length ? 'text-emerald' : 'text-muted-foreground'}>
                                                8+ chars
                                            </span>
                                            <span className={passwordChecks.uppercase ? 'text-emerald' : 'text-muted-foreground'}>
                                                A-Z
                                            </span>
                                            <span className={passwordChecks.number ? 'text-emerald' : 'text-muted-foreground'}>
                                                0-9
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    id="signup-confirm-password"
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    className={`w-full px-4 py-3 pr-12 bg-muted/50 border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all ${confirmPassword.length > 0
                                            ? passwordsMatch
                                                ? 'border-emerald/50 focus:ring-emerald/50'
                                                : 'border-destructive/50 focus:ring-destructive/50'
                                            : 'border-border focus:ring-emerald/50 focus:border-emerald/50'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showConfirm ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Match indicator */}
                            {confirmPassword.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={`mt-1.5 flex items-center gap-1 text-xs ${passwordsMatch ? 'text-emerald' : 'text-destructive'}`}
                                >
                                    {passwordsMatch ? (
                                        <>
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>Passwords match</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-3 h-3" />
                                            <span>Passwords do not match</span>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={isLoading || !email || !password || !confirmPassword || !passwordsMatch}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="w-full py-3 bg-emerald hover:bg-emerald-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Creating account...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    <span>Create Account</span>
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card/80 px-3 text-muted-foreground font-medium tracking-wider">
                                or
                            </span>
                        </div>
                    </div>

                    {/* Link to Login */}
                    <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="text-emerald hover:text-emerald-dark font-semibold transition-colors hover:underline"
                        >
                            Sign In
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-6">
                    Knowledge Graph Intelligence Platform
                </p>
            </motion.div>
        </div>
    );
}
