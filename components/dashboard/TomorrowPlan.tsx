'use client';

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Users, ChevronRight, CalendarCheck } from "lucide-react";
import Link from "next/link";

interface Task {
  id: string;
  name: string;
  client: string;
  contentType: string;
  hours: number;
  priority: string;
  source: string;
}

interface Member {
  id: string;
  name: string;
  designation: string;
  photo?: string;
}

interface DailyPlan {
  id: string;
  date: string;
  distribution: Record<string, Task[]>;
  members: Member[];
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "#FEF2F2", text: "#DC2626" },
  high:   { bg: "#FFF7ED", text: "#EA580C" },
  medium: { bg: "#FFFBEB", text: "#D97706" },
  low:    { bg: "#F0FDF4", text: "#16A34A" },
};

export default function TomorrowPlan() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = tomorrow.toISOString().split("T")[0];

    const plans: DailyPlan[] = JSON.parse(localStorage.getItem("daily-plans") || "[]");
    const teamMembers: Member[] = JSON.parse(localStorage.getItem("team-members") || "[]");
    const found = plans.find((p) => p.date === tomorrowKey);
    if (found) {
      setPlan({
        ...found,
        members: found.members.map((m) => ({ ...m, photo: teamMembers.find((tm) => tm.id === m.id)?.photo || m.photo })),
      });
    }
  }, []);

  if (!plan) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateLabel = tomorrow.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const allTasks = Object.values(plan.distribution).flat();
  const totalTasks = allTasks.length;
  const totalHours = allTasks.reduce((s, t) => s + t.hours, 0);
  const memberCount = Object.keys(plan.distribution).filter((id) => plan.distribution[id].length > 0).length;

  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center">
            <CalendarCheck size={16} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-gray-900)]">Tomorrow's Plan</h2>
            <p className="text-xs text-[var(--color-gray-500)]">{dateLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)] bg-green-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={12} /> Published
          </span>
          <Link href="/schedule/tomorrow" className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
            Edit <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-[var(--color-gray-50)] rounded-lg">
        <div className="flex items-center gap-1.5 text-sm text-[var(--color-gray-700)]">
          <CheckCircle2 size={14} className="text-[var(--color-success)]" />
          <span className="font-semibold">{totalTasks}</span> tasks
        </div>
        <div className="w-px h-4 bg-[var(--color-gray-200)]" />
        <div className="flex items-center gap-1.5 text-sm text-[var(--color-gray-700)]">
          <Clock size={14} className="text-[var(--color-warning)]" />
          <span className="font-semibold">{totalHours}h</span> total
        </div>
        <div className="w-px h-4 bg-[var(--color-gray-200)]" />
        <div className="flex items-center gap-1.5 text-sm text-[var(--color-gray-700)]">
          <Users size={14} className="text-[var(--color-primary)]" />
          <span className="font-semibold">{memberCount}</span> members
        </div>
      </div>

      {/* Per-member rows */}
      <div className="space-y-2">
        {plan.members
          .filter((m) => (plan.distribution[m.id] || []).length > 0)
          .map((member) => {
            const memberTasks = plan.distribution[member.id] || [];
            const memberHours = memberTasks.reduce((s, t) => s + t.hours, 0);
            const isOpen = expanded === member.id;
            const initials = member.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

            return (
              <div key={member.id} className="border border-[var(--color-gray-200)] rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : member.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-gray-50)] transition-colors text-left"
                >
                  {member.photo ? (
                    <img src={member.photo} alt={member.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-gray-900)] truncate">{member.name}</p>
                    <p className="text-xs text-[var(--color-gray-500)] truncate">{member.designation}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-[var(--color-gray-500)]">{memberTasks.length} tasks · {memberHours}h</span>
                    <ChevronRight size={14} className={`text-[var(--color-gray-400)] transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--color-gray-100)] px-4 py-3 space-y-2 bg-[var(--color-gray-50)]">
                    {memberTasks.map((task) => {
                      const pc = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
                      return (
                        <div key={task.id} className="flex items-center gap-3 bg-[var(--surface-elevated)] border border-[var(--color-gray-200)] rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--color-gray-900)] truncate">{task.name}</p>
                            <p className="text-xs text-[var(--color-gray-500)]">{task.client}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: pc.bg, color: pc.text }}>{task.priority}</span>
                          <span className="text-xs text-[var(--color-gray-500)] shrink-0">{task.hours}h</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
