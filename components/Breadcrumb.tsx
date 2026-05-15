'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const SEGMENT_LABELS: Record<string, string> = {
  "":        "Dashboard",
  plans:     "Campaign Plans",
  new:       "Create Campaign Plan",
  schedule:  "Schedule",
  tomorrow:  "Tomorrow's Plan",
  tasks:     "Tasks",
  team:      "Team",
  reports:   "Reports",
  settings:  "Settings",
};

const SEGMENT_HREFS: Record<string, string> = {
  "":       "/",
  plans:    "/plans",
  schedule: "/schedule",
};

interface Crumb {
  label: string;
  href?: string;
}

function buildCrumbs(pathname: string, campaignName?: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard" }];

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

export default function Breadcrumb() {
  const pathname = usePathname();
  const [campaignName, setCampaignName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);
    const uuidSeg = segments.find((s) => /^[0-9a-f-]{36}$/.test(s));
    if (uuidSeg) {
      try {
        const campaigns = JSON.parse(localStorage.getItem("campaigns") || "[]");
        const found = campaigns.find((c: { id: string; campaignName: string }) => c.id === uuidSeg);
        if (found) setCampaignName(found.campaignName);
      } catch {}
    } else {
      setCampaignName(undefined);
    }
  }, [pathname]);

  const crumbs = buildCrumbs(pathname, campaignName);

  // Don't show breadcrumb on dashboard root
  if (crumbs.length <= 1) return null;

  return (
    <div className="px-6 py-2 bg-white">
      <nav className="flex items-center gap-1">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <div key={idx} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight size={12} className="text-[var(--color-gray-300)]" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-xs text-[var(--color-gray-500)] hover:text-[var(--color-gray-900)] transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={`text-xs ${isLast ? "font-semibold text-[var(--color-gray-900)]" : "text-[var(--color-gray-500)]"}`}>
                  {crumb.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
