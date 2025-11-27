"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import {
  Bot,
  Zap,
  Shield,
  BarChart3,
  Workflow,
  Settings2,
  ArrowRight,
  Sparkles,
  GitBranch,
  Plug,
} from "lucide-react";
import { FluidBackground } from "@/components/ui/FluidBackground";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Landing Page for Incepta
 *
 * A modern, dynamic landing page showcasing the Incepta platform capabilities.
 * Features animated sections, glassmorphic design, and fluid background effects.
 *
 * Brand: Incepta - "Where Intelligent Agents Take Shape"
 *
 * Design principles (2025 trends):
 * - Hero section with clear value proposition
 * - Feature highlights with icons
 * - Social proof with animated stats
 * - Clear CTAs throughout
 * - Mobile-first responsive design
 */

// Animation variants for staggered children
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
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

// Feature data
const features = [
  {
    icon: Bot,
    title: "Intelligent AI Agents",
    description:
      "Deploy autonomous AI agents that understand context, make decisions, and execute complex workflows.",
  },
  {
    icon: Workflow,
    title: "Visual Workflow Builder",
    description:
      "Design agent behaviors with our intuitive drag-and-drop interface. No coding required.",
  },
  {
    icon: Plug,
    title: "MCP Server Integration",
    description:
      "Connect to external tools and services via Model Context Protocol for extended capabilities.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Multi-tenant architecture with role-based access control, audit trails, and data encryption.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Monitor agent performance, track costs, and optimize operations with detailed dashboards.",
  },
  {
    icon: Settings2,
    title: "Flexible Configuration",
    description:
      "Customize prompts, tools, and behaviors to match your specific business requirements.",
  },
];


// How it works steps
const steps = [
  {
    step: "01",
    title: "Configure Your Agent",
    description:
      "Define your AI agent's purpose, personality, and capabilities using our intuitive configuration panel.",
  },
  {
    step: "02",
    title: "Connect Tools & Prompts",
    description:
      "Attach powerful tools, custom prompts, and MCP servers to extend your agent's abilities.",
  },
  {
    step: "03",
    title: "Deploy & Monitor",
    description:
      "Launch your agent and track performance in real-time with comprehensive analytics dashboards.",
  },
];

// Feature card component
function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="glass-card p-6 group hover:scale-[1.02] transition-transform duration-300"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-accent-blue" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: true });

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fluid Background */}
      <FluidBackground />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-subtle border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
                <span className="text-white font-bold text-lg">I</span>
              </div>
              <span className="text-xl font-semibold text-text-primary">
                Incepta
              </span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                How it Works
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/login"
                className="px-5 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors font-medium shadow-lg shadow-accent-blue/25"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 min-h-[90vh] flex items-center"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={isHeroInView ? "visible" : "hidden"}
              className="text-center lg:text-left"
            >
              {/* Badge */}
              <motion.div variants={itemVariants} className="mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm font-medium text-text-secondary">
                  <Sparkles className="w-4 h-4 text-accent-blue" />
                  Where Intelligent Agents Take Shape
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={itemVariants}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6"
              >
                Welcome to{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-purple">
                  Incepta
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                variants={itemVariants}
                className="text-lg sm:text-xl text-text-secondary mb-8 max-w-xl mx-auto lg:mx-0"
              >
                Build, deploy, and manage autonomous AI agents that automate
                complex workflows, integrate with your tools, and deliver
                results 24/7.
              </motion.p>

              {/* CTA Button */}
              <motion.div
                variants={itemVariants}
                className="flex justify-center lg:justify-start"
              >
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent-blue text-white rounded-xl hover:bg-accent-blue/90 transition-all font-semibold shadow-xl shadow-accent-blue/25 hover:shadow-2xl hover:shadow-accent-blue/30 hover:-translate-y-0.5"
                >
                  Login
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Hero Visual */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={
                isHeroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }
              }
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              {/* Dashboard Preview Card */}
              <div className="glass-kpi p-4 rounded-2xl shadow-2xl">
                <div className="rounded-xl overflow-hidden bg-surface border border-white/20">
                  {/* Mock Dashboard Header */}
                  <div className="bg-white/50 dark:bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="text-xs text-text-secondary">
                      Incepta Dashboard
                    </div>
                  </div>
                  {/* Mock Dashboard Content */}
                  <div className="p-6 space-y-4">
                    {/* KPI Row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="glass-subtle p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-text-primary">
                          5
                        </div>
                        <div className="text-xs text-text-secondary">
                          Active Agents
                        </div>
                      </div>
                      <div className="glass-subtle p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-accent-green">
                          98%
                        </div>
                        <div className="text-xs text-text-secondary">
                          Success Rate
                        </div>
                      </div>
                      <div className="glass-subtle p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-text-primary">
                          2.4K
                        </div>
                        <div className="text-xs text-text-secondary">
                          Executions
                        </div>
                      </div>
                    </div>
                    {/* Agent List */}
                    <div className="space-y-2">
                      {[
                        "Ticket Enhancer",
                        "Code Reviewer",
                        "Data Analyzer",
                      ].map((agent, i) => (
                        <motion.div
                          key={agent}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1 + i * 0.2 }}
                          className="flex items-center justify-between p-3 glass-subtle rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-accent-blue" />
                            </div>
                            <span className="text-sm font-medium text-text-primary">
                              {agent}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-accent-green/20 text-accent-green">
                            Active
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 glass-kpi p-4 rounded-xl shadow-xl"
              >
                <Zap className="w-8 h-8 text-accent-blue" />
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute -bottom-4 -left-4 glass-kpi p-4 rounded-xl shadow-xl"
              >
                <GitBranch className="w-8 h-8 text-accent-purple" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm font-medium text-accent-blue mb-4">
              <Sparkles className="w-4 h-4" />
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              Everything You Need to Automate
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              A comprehensive platform for building, deploying, and managing AI
              agents that handle your most complex business processes.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section
        id="how-it-works"
        className="py-20 px-4 sm:px-6 lg:px-8 relative"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm font-medium text-accent-purple mb-4">
              <Workflow className="w-4 h-4" />
              How it Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              From configuration to deployment, our platform makes it easy to
              create powerful AI agents.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="glass-card p-8 h-full">
                  <div className="text-6xl font-bold text-accent-blue/20 mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-3">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-accent-blue/30" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
                <span className="text-white font-bold text-sm">I</span>
              </div>
              <span className="text-lg font-semibold text-text-primary">
                Incepta
              </span>
            </div>
            <p className="text-text-secondary text-sm">
              © 2025 Incepta. Internal Use Only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
