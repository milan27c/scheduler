'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useSidebar } from "./SidebarContext";

const SEGMENT_LABELS: Record<string, string> = {
  "":        "Dashboard",
  plans:     "Campaign Plans",
  new:       "Create Campaign Plan",
  schedule:  "Schedule",
  tasks:     "Tasks",
  team:      "Team",
  reports:   "Reports",
  settings:  "Settings",
};

const SEGMENT_HREFS: Record<string, string> = {
  "":     "/",
  plans:  "/plans",
};

interface Crumb {
  label: string;
  href?: string;
}

function buildCrumbs(pathname: string, campaignName?: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return [{ label: "Dashboard" }];
  }

  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/" }];

  segments.forEach((seg, idx) => {
    const isUUID = /^[0-9a-f-]{36}$/.test(seg);
    const label = isUUID ? (campaignName || "Campaign Detail") : (SEGMENT_LABELS[seg] ?? seg);
    const isLast = idx === segments.length - 1;
    const href = SEGMENT_HREFS[seg];
    crumbs.push(isLast ? { label } : { label, href });
  });

  return crumbs;
}

export default function TopBar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const [campaignName, setCampaignName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);
    const uuidSeg = segments.find((s) => /^[0-9a-f-]{36}$/.test(s));
    if (uuidSeg) {
      try {
        const campaigns = JSON.parse(localStorage.getItem("campaigns") || "[]");
        const found = campaigns.find((c: any) => c.id === uuidSeg);
        if (found) setCampaignName(found.campaignName);
      } catch {}
    } else {
      setCampaignName(undefined);
    }
  }, [pathname]);

  const crumbs = buildCrumbs(pathname, campaignName);

  return (
    <header className="flex items-center justify-between px-4 h-11 border-b border-[var(--color-gray-200)] bg-white sticky top-0 z-10">
      <div className="flex items-center gap-2">
        {/* Sidebar toggle */}
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-gray-700)] transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <div key={idx} className="flex items-center gap-1">
              {idx > 0 && (
                <ChevronRight size={12} className="text-[var(--color-gray-300)]" />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-xs text-[var(--color-gray-500)] hover:text-[var(--color-gray-900)] transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={`text-xs ${isLast ? "text-[var(--color-gray-900)] font-semibold" : "text-[var(--color-gray-500)]"}`}>
                  {crumb.label}
                </span>
              )}
            </div>
          );
        })}
        </nav>
      </div>

      {/* Right icons */}
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="p-1.5 rounded-lg text-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-gray-900)] transition-colors"
        >
          <Settings size={17} />
        </Link>
        <button className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-xs font-semibold flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-colors">
          AD
        </button>
      </div>
    </header>
  );
}
