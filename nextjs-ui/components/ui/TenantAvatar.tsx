"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Tenant Avatar Component
 *
 * Displays tenant logo with smart fallback hierarchy:
 * 1. Logo URL (if valid and loads successfully)
 * 2. Initials with consistent background color (generated from tenant name)
 * 3. Default building icon
 *
 * 2025 Best Practices:
 * - Avatar size: 32-40px for headers, 24-32px in lists
 * - Fallback to initials when image unavailable
 * - Consistent color generation from tenant name
 * - Graceful error handling for broken images
 *
 * Reference: https://medium.com/ux-power-tools/ways-to-design-account-switchers-app-switchers-743e05372ede
 */

interface TenantAvatarProps {
  name: string;
  logo?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

const iconSizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

/**
 * Generate initials from tenant name
 * Takes first letter of first two words, or first two letters if single word
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Generate consistent color from string using hash
 * Returns a pleasant color from a curated palette
 */
function getColorFromName(name: string): { bg: string; text: string } {
  const colors = [
    { bg: "bg-blue-500", text: "text-white" },
    { bg: "bg-emerald-500", text: "text-white" },
    { bg: "bg-violet-500", text: "text-white" },
    { bg: "bg-amber-500", text: "text-white" },
    { bg: "bg-rose-500", text: "text-white" },
    { bg: "bg-cyan-500", text: "text-white" },
    { bg: "bg-indigo-500", text: "text-white" },
    { bg: "bg-teal-500", text: "text-white" },
    { bg: "bg-pink-500", text: "text-white" },
    { bg: "bg-orange-500", text: "text-white" },
  ];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Validate logo URL
 */
function isValidLogoUrl(url: string | null | undefined): boolean {
  if (!url || url.trim().length === 0) return false;
  if (url.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function TenantAvatar({
  name,
  logo,
  size = "md",
  className,
}: TenantAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const initials = useMemo(() => getInitials(name), [name]);
  const color = useMemo(() => getColorFromName(name), [name]);

  const hasValidLogo = isValidLogoUrl(logo) && !imageError;

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden shrink-0 flex items-center justify-center font-semibold",
        sizeClasses[size],
        !hasValidLogo && color.bg,
        !hasValidLogo && color.text,
        className
      )}
      role="img"
      aria-label={`${name} logo`}
    >
      {hasValidLogo ? (
        <Image
          src={logo!}
          alt={`${name} logo`}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
          unoptimized
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <Building2 className={cn(iconSizes[size], "opacity-80")} />
      )}
    </div>
  );
}
