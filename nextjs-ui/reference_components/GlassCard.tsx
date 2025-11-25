import { cn } from "@/lib/utils/cn";
import { HTMLAttributes, forwardRef } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "frosted" | "clear" | "neo";
    intensity?: "low" | "medium" | "high";
    hoverEffect?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, variant = "default", intensity = "medium", hoverEffect = true, children, ...props }, ref) => {

        // Premium Glass Styles
        const baseStyles = "relative overflow-hidden rounded-3xl transition-all duration-500 ease-out";

        const variants = {
            default: "bg-white/[0.08] border border-white/[0.15] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]",
            frosted: "bg-white/[0.15] border border-white/[0.2] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]",
            clear: "bg-white/[0.03] border border-white/[0.05] shadow-sm",
            neo: "bg-gradient-to-br from-white/[0.1] to-white/[0.02] border-t border-l border-white/[0.2] border-b-0 border-r-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]",
        };

        const intensities = {
            low: "backdrop-blur-[8px]",
            medium: "backdrop-blur-[16px]",
            high: "backdrop-blur-[24px]",
        };

        const hoverStyles = hoverEffect
            ? "hover:bg-white/[0.12] hover:scale-[1.01] hover:shadow-[0_15px_40px_0_rgba(0,0,0,0.4)] hover:border-white/[0.25]"
            : "";

        return (
            <div
                ref={ref}
                className={cn(
                    baseStyles,
                    variants[variant],
                    intensities[intensity],
                    hoverStyles,
                    className
                )}
                {...props}
            >
                {/* 1. Noise Texture (SVG Filter for performance & quality) */}
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-0"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* 2. Specular Highlight (Top Shine) */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70 z-10" />

                {/* 3. Inner Glow (Depth) */}
                <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_40px_rgba(255,255,255,0.03)] pointer-events-none z-10" />

                {/* 4. Content */}
                <div className="relative z-20">
                    {children}
                </div>
            </div>
        );
    }
);

GlassCard.displayName = "GlassCard";
