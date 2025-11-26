"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Cpu,
  MessageSquare,
  Shield,
  Workflow,
  Database,
  Package,
  Activity,
  Users,
  DollarSign,
  Server,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ReactNode } from "react";
import { useSidebar } from "./SidebarContext";
import { Tooltip } from "@/components/ui/Tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface NavCategory {
  category: string;
  items: NavItem[];
}

/**
 * Dashboard Sidebar Navigation
 *
 * Collapsible navigation with icon-only collapsed state.
 * State is persisted in localStorage.
 *
 * Navigation structure:
 * - Monitoring (4 pages): Dashboard, Agent Metrics, Agent Performance, LLM Costs
 * - Configuration (8 pages): Tenants, Users, Agents, Prompts, Tools, Plugins, MCP Servers, LLM Providers
 * - Operations (4 pages): Audit Trail, Execution History, Operations, Workers
 *
 * UX Best Practices:
 * - Expanded width: 256px (w-64)
 * - Collapsed width: 64px (w-16) - icon only
 * - Tooltips shown on hover in collapsed state
 * - Smooth CSS transitions (300ms)
 * - State persistence via localStorage
 */

const navigationData: NavCategory[] = [
  {
    category: "Monitoring",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <BarChart3 className="w-5 h-5 shrink-0" /> },
      { label: "Agent Metrics", href: "/dashboard/agents", icon: <Bot className="w-5 h-5 shrink-0" /> },
      { label: "Agent Performance", href: "/dashboard/agent-performance", icon: <Activity className="w-5 h-5 shrink-0" /> },
      { label: "LLM Costs", href: "/dashboard/llm-costs", icon: <DollarSign className="w-5 h-5 shrink-0" /> },
    ],
  },
  {
    category: "Configuration",
    items: [
      { label: "Tenants", href: "/dashboard/tenants", icon: <Shield className="w-5 h-5 shrink-0" /> },
      { label: "Users", href: "/dashboard/users", icon: <Users className="w-5 h-5 shrink-0" /> },
      { label: "Agents", href: "/dashboard/agents-config", icon: <Bot className="w-5 h-5 shrink-0" /> },
      { label: "Prompts", href: "/dashboard/prompts", icon: <MessageSquare className="w-5 h-5 shrink-0" /> },
      { label: "Tools", href: "/dashboard/tools", icon: <Cpu className="w-5 h-5 shrink-0" /> },
      { label: "Plugins", href: "/dashboard/plugins", icon: <Package className="w-5 h-5 shrink-0" /> },
      { label: "MCP Servers", href: "/dashboard/mcp-servers", icon: <Database className="w-5 h-5 shrink-0" /> },
      { label: "LLM Providers", href: "/dashboard/llm-providers", icon: <Server className="w-5 h-5 shrink-0" /> },
    ],
  },
  {
    category: "Operations",
    items: [
      { label: "Audit Trail", href: "/dashboard/audit-logs", icon: <Workflow className="w-5 h-5 shrink-0" /> },
      { label: "Execution History", href: "/dashboard/execution-history", icon: <Activity className="w-5 h-5 shrink-0" /> },
      { label: "Operations", href: "/dashboard/operations", icon: <Cpu className="w-5 h-5 shrink-0" /> },
      { label: "Workers", href: "/dashboard/workers", icon: <Bot className="w-5 h-5 shrink-0" /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse } = useSidebar();

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 glass-card mr-6 h-[calc(100vh-120px)] overflow-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16 p-3" : "w-64 p-6"
      }`}
      role="complementary"
      aria-label="Main Navigation"
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapse}
        className={`flex items-center justify-center w-8 h-8 rounded-lg bg-white/50 hover:bg-white/80 transition-colors mb-4 ${
          isCollapsed ? "mx-auto" : "ml-auto"
        }`}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-text-secondary" />
        )}
      </button>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto scrollbar-hidden space-y-6"
        aria-label="Navigation Sections"
      >
        {navigationData.map((section) => (
          <div key={section.category}>
            {/* Category Header */}
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                {section.category}
              </h3>
            )}
            {isCollapsed && (
              <div className="h-px bg-border/50 my-3" aria-hidden="true" />
            )}

            {/* Nav Items */}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const linkContent = (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg transition-all duration-fast ${
                      isCollapsed
                        ? "justify-center p-2"
                        : "px-3 py-2"
                    } ${
                      isActive
                        ? "bg-accent-blue text-white shadow-md"
                        : "text-text-primary hover:bg-white/50"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.icon}
                    {!isCollapsed && (
                      <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );

                return (
                  <li key={item.href}>
                    {isCollapsed ? (
                      <Tooltip content={item.label} placement="right" delay={100}>
                        {linkContent}
                      </Tooltip>
                    ) : (
                      linkContent
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
