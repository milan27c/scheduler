'use client';

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CheckSquare,
  Users,
  BarChart2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";

const navItems = [
  { label: "Dashboard",      href: "/",         icon: LayoutDashboard },
  { label: "Campaign Plans",  href: "/plans",    icon: FileText },
  { label: "Schedule",       href: "/schedule", icon: Calendar },
  { label: "Tasks",          href: "/tasks",    icon: CheckSquare },
  { label: "Team",           href: "/team",     icon: Users },
  { label: "Reports",        href: "/reports",  icon: BarChart2 },
  { label: "Settings",       href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className={`h-full flex flex-col fixed left-0 top-0 bg-white border-r border-[var(--color-gray-200)] transition-all duration-200 z-20 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center justify-between px-3 py-4 shrink-0 ${collapsed ? "justify-center" : ""}`}>
        <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
          {collapsed ? (
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center">
              <Image
                src="/images/logo2.png"
                alt="Creative Scheduler"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
          ) : (
            <Image
              src="/images/logo.png"
              alt="Creative Scheduler"
              width={120}
              height={28}
              className="object-contain"
            />
          )}
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <a
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium"
                  : "text-[var(--color-gray-700)] hover:bg-[var(--color-gray-100)]"
              }`}
            >
              <Icon size={19} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </a>
          );
        })}
      </nav>

      {/* Bottom: expand button when collapsed, user when expanded */}
      <div className="px-2 py-3 border-t border-[var(--color-gray-200)]">
        {collapsed ? (
          <div />
        ) : (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--color-gray-100)] transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-gray-900)] truncate">Admin User</p>
              <p className="text-xs text-[var(--color-gray-500)] truncate">admin@agency.com</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
