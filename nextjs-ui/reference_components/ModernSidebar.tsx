"use client";

import { GlassCard } from "./GlassCard";
import { ScrollArea } from "@/components/ui/scroll-area"; // Assuming this exists or will be created
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

// Mock data for demonstration
const navigationData = [
    { category: "Monitoring", items: [{ label: "Dashboard", href: "/dashboard" }] },
    // ... other items
];

export function ModernSidebar() {
    const pathname = usePathname();

    return (
        <GlassCard className="h-screen w-64 flex flex-col border-r border-white/10 rounded-none" intensity="high" variant="frosted">
            <div className="p-6">
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    AI Ops
                </h1>
            </div>

            {/* Custom Scroll Area to replace native scrollbar */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
                <nav className="space-y-6">
                    {navigationData.map((section) => (
                        <div key={section.category}>
                            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-2">
                                {section.category}
                            </h3>
                            <ul className="space-y-1">
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={item.href}>
                                            <Link href={item.href} className="block relative group">
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeNav"
                                                        className="absolute inset-0 bg-white/10 rounded-lg"
                                                        initial={false}
                                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                    />
                                                )}
                                                <span className={cn(
                                                    "relative flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                                                    isActive ? "text-white" : "text-white/60 group-hover:text-white"
                                                )}>
                                                    {item.label}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>
            </div>
        </GlassCard>
    );
}
