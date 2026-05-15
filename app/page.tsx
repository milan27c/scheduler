'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import StatsCards from "@/components/dashboard/StatsCards";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import ClientProgress from "@/components/dashboard/ClientProgress";
import Alerts from "@/components/dashboard/Alerts";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import TomorrowPlan from "@/components/dashboard/TomorrowPlan";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import InReviewPanel from "@/components/dashboard/InReviewPanel";
import { useAuth } from "@/components/AuthProvider";
import { CheckSquare, FileText, MessageSquare, ArrowRight } from "lucide-react";

interface FeedbackTask {
  id: string;
  name: string;
  client?: string;
  feedbackText: string;
}

function CreatorDashboard() {
  const { user } = useAuth();
  const [feedbackTasks, setFeedbackTasks] = useState<FeedbackTask[]>([]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const ROLE_LABELS: Record<string, string> = {
    writer: "Content Writer",
    designer: "Designer",
  };

  useEffect(() => {
    const plans = JSON.parse(localStorage.getItem("daily-plans") || "[]");
    const feedback: Record<string, { text: string }[]> = JSON.parse(localStorage.getItem("task-feedback") || "{}");
    const found: FeedbackTask[] = [];
    const seen = new Set<string>();

    plans.forEach((plan: any) => {
      Object.values(plan.distribution || {}).forEach((taskList) => {
        (taskList as any[]).forEach((t) => {
          if (
            t.status === "work-in-progress" &&
            feedback[t.id]?.length > 0 &&
            !seen.has(t.id) &&
            t.assigneeName?.toLowerCase() === user?.name?.toLowerCase()
          ) {
            seen.add(t.id);
            found.push({ id: t.id, name: t.name, client: t.client, feedbackText: feedback[t.id][0].text });
          }
        });
      });
    });
    setFeedbackTasks(found);
  }, [user]);

  return (
    <main className="flex-1">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--color-gray-900)]">
            Welcome back, {user?.name} 👋
          </h1>
          <p className="text-sm text-[var(--color-gray-500)] mt-1">{today}</p>
        </div>

        {/* Role badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-primary-light)] mb-6">
          <span className="w-2 h-2 rounded-full bg-[#5231FF]" />
          <span className="text-xs font-semibold text-[#5231FF]">{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</span>
        </div>

        {/* Design feedback section */}
        {feedbackTasks.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <h2 className="text-sm font-bold text-[var(--color-gray-900)]">Design Feedback Received</h2>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">{feedbackTasks.length}</span>
            </div>
            <div className="space-y-2">
              {feedbackTasks.map((ft) => (
                <Link
                  key={ft.id}
                  href="/tasks"
                  className="flex items-start gap-4 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 hover:border-orange-400 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={15} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-[var(--color-gray-900)]">{ft.name}</p>
                      {ft.client && <span className="text-xs text-[var(--color-gray-500)]">· {ft.client}</span>}
                    </div>
                    <p className="text-sm text-orange-800 leading-relaxed line-clamp-2">{ft.feedbackText}</p>
                  </div>
                  <ArrowRight size={15} className="text-orange-400 group-hover:text-orange-600 shrink-0 mt-1 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <Link href="/plans" className="group flex flex-col gap-3 p-6 bg-[var(--surface-card)] border border-[var(--color-card-border)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-[#5231FF]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center">
              <FileText size={18} className="text-[#5231FF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-gray-900)] group-hover:text-[#5231FF] transition-colors">Campaigns</p>
              <p className="text-xs text-[var(--color-gray-500)] mt-0.5">View active campaigns</p>
            </div>
          </Link>
          <Link href="/tasks" className="group flex flex-col gap-3 p-6 bg-[var(--surface-card)] border border-[var(--color-card-border)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-[#5231FF]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center">
              <CheckSquare size={18} className="text-[#5231FF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-gray-900)] group-hover:text-[#5231FF] transition-colors">My Tasks</p>
              <p className="text-xs text-[var(--color-gray-500)] mt-0.5">View your assigned tasks</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role !== "manager") return <CreatorDashboard />;

  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <main className="flex-1">
      <div className="p-6">
        <DashboardHeader dateLabel={dateFormatter.format(today)} />
        <InReviewPanel />
        <StatsCards />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <TodaySchedule />
            <TomorrowPlan />
            <ClientProgress />
          </div>
          <div className="space-y-6">
            <Alerts />
            <ActivityFeed />
          </div>
        </div>
      </div>
    </main>
  );
}
