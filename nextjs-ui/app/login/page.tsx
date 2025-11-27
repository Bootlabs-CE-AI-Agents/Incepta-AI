"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { FluidBackground } from "@/components/ui/FluidBackground";

/**
 * Modern Login Page for Incepta
 *
 * Design inspired by 2025 login page trends:
 * - Split-screen layout with brand showcase
 * - Glass morphism form card
 * - Animated fluid background
 * - Micro-interactions and smooth transitions
 * - Clean, minimalist aesthetic
 *
 * Reference: UX Design Specification
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const logoVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.68, -0.6, 0.32, 1.6] },
  },
};

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const errorParam = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
      } else if (result?.ok) {
        router.push("/dashboard");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Fluid Background */}
      <FluidBackground />

      {/* Left Side - Brand Showcase (Hidden on mobile) */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/20 via-accent-purple/15 to-transparent" />

        {/* Brand Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-lg"
          >
            {/* Logo */}
            <motion.div variants={logoVariants} className="mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-lg shadow-accent-blue/25">
                <span className="text-white font-bold text-3xl">I</span>
              </div>
            </motion.div>

            {/* Brand Name */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl xl:text-6xl font-bold text-text-primary mb-4"
            >
              Incepta
            </motion.h1>

            {/* Tagline */}
            <motion.p
              variants={itemVariants}
              className="text-xl text-text-secondary mb-8"
            >
              Where Intelligent Agents Take Shape
            </motion.p>

            {/* Feature highlights */}
            <motion.div variants={itemVariants} className="space-y-4">
              {[
                "Enterprise-grade AI agent orchestration",
                "Real-time monitoring and analytics",
                "Seamless multi-tenant management",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
                  </div>
                  <span className="text-text-secondary">{feature}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-accent-purple/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-accent-blue/10 to-transparent rounded-full blur-2xl" />
      </motion.div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-12 lg:px-16 xl:px-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo (visible only on mobile) */}
          <motion.div
            variants={logoVariants}
            initial="hidden"
            animate="visible"
            className="lg:hidden flex flex-col items-center mb-10"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-lg shadow-accent-blue/25 mb-4">
              <span className="text-white font-bold text-2xl">I</span>
            </div>
            <h1 className="text-3xl font-bold text-text-primary">Incepta</h1>
            <p className="text-sm text-text-secondary mt-1">
              Where Intelligent Agents Take Shape
            </p>
          </motion.div>

          {/* Login Card */}
          <div className="glass-card p-8 sm:p-10">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-text-primary">
                Welcome back
              </h2>
              <p className="text-text-secondary mt-2">
                Sign in to continue to your dashboard
              </p>
            </div>

            {/* Error Messages */}
            {errorParam === "Configuration" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-lg bg-amber-500/10 p-4 border border-amber-500/30"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Configuration Error
                    </h3>
                    <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/80">
                      Authentication is not properly configured. Please contact
                      your administrator.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-lg bg-red-500/10 p-4 border border-red-500/30"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-500">
                      Authentication Failed
                    </h3>
                    <p className="mt-1 text-sm text-red-500/80">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  Username
                </label>
                <div className="relative">
                  <div
                    className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                      focusedField === "username"
                        ? "text-accent-blue"
                        : "text-text-secondary"
                    }`}
                  >
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    placeholder="Enter your username"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div
                    className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                      focusedField === "password"
                        ? "text-accent-blue"
                        : "text-text-secondary"
                    }`}
                  >
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: isLoading ? 1 : 0.99 }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium shadow-lg shadow-accent-blue/25 hover:shadow-xl hover:shadow-accent-blue/30 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-sm text-text-secondary">
                Protected by enterprise-grade security
              </p>
            </div>
          </div>

          {/* Version */}
          <p className="text-center text-xs text-text-secondary mt-6">
            Incepta v1.0.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center animate-pulse">
              <span className="text-white font-bold text-xl">I</span>
            </div>
            <div className="text-text-secondary">Loading...</div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
