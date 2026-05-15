'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Bell, Settings, Moon, Sun, LogOut } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CheckSquare,
  Users,
  BarChart2,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";

const MANAGER_NAV = [
  { label: "Dashboard",      href: "/",         icon: LayoutDashboard },
  { label: "Campaign Plans", href: "/plans",    icon: FileText },
  { label: "Schedule",       href: "/schedule", icon: Calendar },
  { label: "Tasks",          href: "/tasks",    icon: CheckSquare },
  { label: "Team",           href: "/team",     icon: Users },
  { label: "Reports",        href: "/reports",  icon: BarChart2 },
];

const CREATOR_NAV = [
  { label: "Dashboard",  href: "/",       icon: LayoutDashboard },
  { label: "Campaigns",  href: "/plans",  icon: FileText },
  { label: "Tasks",      href: "/tasks",  icon: CheckSquare },
];

const ROLE_LABELS: Record<string, string> = {
  manager: "Manager",
  writer: "Content Writer",
  designer: "Designer",
};

export default function TopNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const load = () => {
      try {
        const notifs = JSON.parse(localStorage.getItem("notifications") || "[]");
        setUnreadCount(notifs.filter((n: { read: boolean }) => !n.read).length);
      } catch {}
    };
    load();
    window.addEventListener("storage", load);
    // Poll every 10s so manager sees new notifications without refresh
    const interval = setInterval(load, 10000);
    return () => { window.removeEventListener("storage", load); clearInterval(interval); };
  }, []);

  const navItems = user?.role === "manager" ? MANAGER_NAV : CREATOR_NAV;
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[var(--color-gray-200)]">
      <div className="flex items-center justify-between px-6 h-14">
        {/* Logo */}
        <a href="/" className="flex items-center shrink-0 mr-8 hover:opacity-80 transition-opacity">
          <Image
            src="/images/logo.png"
            alt="Creative Scheduler"
            width={130}
            height={30}
            className="object-contain dark:brightness-0 dark:invert"
          />
        </a>

        {/* Nav items */}
        <nav className="flex items-center gap-1 bg-[var(--color-gray-100)] rounded-full px-1.5 py-1.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold"
                    : "text-[var(--color-gray-500)] hover:text-[var(--color-gray-900)] hover:bg-[var(--surface-elevated)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: theme toggle + bell + settings + avatar */}
        <div className="flex items-center gap-2 ml-8">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-gray-900)] transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button className="relative p-2 rounded-lg text-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-gray-900)] transition-colors">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#EF4444] rounded-full flex items-center justify-center text-white text-[9px] font-bold px-0.5">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <Link
            href="/settings"
            className="p-2 rounded-lg text-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-gray-900)] transition-colors"
          >
            <Settings size={18} />
          </Link>
          <div className="flex items-center gap-2.5 ml-1 pl-3 border-l border-[var(--color-gray-200)]">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {user?.name.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-[var(--color-gray-900)]">{user?.name ?? "—"}</p>
              <p className="text-xs text-[var(--color-gray-500)]">{user ? ROLE_LABELS[user.role] : ""}</p>
            </div>
            <button
              onClick={logout}
              className="ml-1 p-1.5 rounded-lg text-[var(--color-gray-400)] hover:text-[#EF4444] hover:bg-red-50 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
