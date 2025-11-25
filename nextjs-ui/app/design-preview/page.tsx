"use client";

import { FluidBackground } from "@/reference_components/FluidBackground";
import { ModernSidebar } from "@/reference_components/ModernSidebar";
import { GlassCard } from "@/reference_components/GlassCard";
import { LiquidSelect } from "@/reference_components/LiquidSelect";
import { useState } from "react";
import { BarChart3, Activity, Users, Zap } from "lucide-react";

export default function DesignPreviewPage() {
    const [selectedOption, setSelectedOption] = useState({ id: '1', name: 'GPT-4 Turbo' });

    const options = [
        { id: '1', name: 'GPT-4 Turbo' },
        { id: '2', name: 'Claude 3 Opus' },
        { id: '3', name: 'Gemini 1.5 Pro' },
        { id: '4', name: 'Llama 3 70B' },
    ];

    return (
        <div className="flex h-screen w-full text-white font-sans overflow-hidden">
            <FluidBackground />

            {/* Sidebar */}
            <div className="z-20">
                <ModernSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 z-10">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-h3 font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                            Dashboard Preview
                        </h1>
                        <p className="text-white/60 mt-1">Liquid Glass Design System</p>
                    </div>
                    <div className="flex gap-4">
                        <GlassCard className="px-4 py-2 flex items-center gap-2" intensity="low" variant="clear">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-sm font-medium">System Online</span>
                        </GlassCard>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: "Active Agents", value: "12", icon: Users, color: "text-blue-400" },
                        { label: "Total Requests", value: "1.2M", icon: Activity, color: "text-purple-400" },
                        { label: "Avg. Latency", value: "142ms", icon: Zap, color: "text-yellow-400" },
                        { label: "Cost / Month", value: "$420", icon: BarChart3, color: "text-green-400" },
                    ].map((stat, i) => (
                        <GlassCard key={i} className="p-6 flex items-start justify-between" variant="default">
                            <div>
                                <p className="text-sm text-white/60 mb-1">{stat.label}</p>
                                <h3 className="text-h2 font-bold">{stat.value}</h3>
                            </div>
                            <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chart Section (Placeholder) */}
                    <GlassCard className="lg:col-span-2 p-6 min-h-[400px]" variant="frosted">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold">Performance Metrics</h3>
                            <div className="flex gap-2">
                                {['1H', '24H', '7D', '30D'].map((period) => (
                                    <button key={period} className="px-3 py-1 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors text-white/60 hover:text-white">
                                        {period}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[300px] w-full flex items-end justify-between gap-2 px-4 pb-4 border-b border-l border-white/10">
                            {/* Mock Chart Bars */}
                            {[40, 65, 45, 80, 55, 70, 40, 60, 75, 50, 85, 65].map((h, i) => (
                                <div key={i} className="w-full bg-accent-blue/40 rounded-t-sm hover:bg-accent-blue/60 transition-all duration-300 relative group" style={{ height: `${h}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {h}% Load
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Configuration Panel */}
                    <GlassCard className="p-6" variant="default">
                        <h3 className="text-lg font-semibold mb-6">Agent Configuration</h3>

                        <div className="space-y-6">
                            <div>
                                <LiquidSelect
                                    label="Select Model"
                                    options={options}
                                    value={selectedOption}
                                    onChange={setSelectedOption}
                                />
                                <p className="text-xs text-white/40 mt-2">
                                    Select the underlying LLM for this agent.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Temperature</label>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full w-[70%] bg-gradient-to-r from-blue-500 to-purple-500" />
                                </div>
                                <div className="flex justify-between text-xs text-white/40">
                                    <span>Precise</span>
                                    <span>Creative</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <button className="w-full py-2 rounded-lg bg-accent-blue hover:bg-accent-blue/80 transition-colors font-medium shadow-lg shadow-accent-blue/20">
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
}
