'use client';

import { useEffect, useState, useRef } from "react";
import { Clock, ChevronDown, Calendar, CheckCircle2, X, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Select from "react-select";
import { useMemberPhotos } from "@/lib/useMemberPhotos";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "urgent" | "high" | "medium" | "low";
type TaskStatus = "unassigned" | "work-in-progress" | "internal-review" | "internal-approved" | "client-review" | "redesign" | "client-approved";

interface Task {
  id: string;
  name: string;
  client: string;
  contentType: string;
  hours: number;
  priority: Priority;
  source: string;
  status?: TaskStatus;
  copy?: string;
  notes?: string;
  references?: string[];
  deadline?: string;
  campaign?: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "unassigned",        label: "Unassigned" },
  { value: "work-in-progress",  label: "Work in Progress" },
  { value: "internal-review",   label: "Internal Review" },
  { value: "internal-approved", label: "Internal Approved" },
  { value: "client-review",     label: "Client Review" },
  { value: "redesign",          label: "Redesign" },
  { value: "client-approved",   label: "Client Approved" },
];

const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string }> = {
  "unassigned":        { bg: "#F3F4F6", text: "#6B7280" },
  "work-in-progress":  { bg: "#EFF6FF", text: "#2563EB" },
  "internal-review":   { bg: "#F5F3FF", text: "#7C3AED" },
  "internal-approved": { bg: "#EEF2FF", text: "#4338CA" },
  "client-review":     { bg: "#FEFCE8", text: "#A16207" },
  "redesign":          { bg: "#FFF7ED", text: "#EA580C" },
  "client-approved":   { bg: "#F0FDF4", text: "#16A34A" },
};

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  urgent: { bg: "#FEF2F2", text: "#DC2626" },
  high:   { bg: "#FFF7ED", text: "#EA580C" },
  medium: { bg: "#FFFBEB", text: "#D97706" },
  low:    { bg: "#F0FDF4", text: "#16A34A" },
};

const statusSelectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base, borderColor: "var(--color-gray-200)", borderRadius: "6px",
    minHeight: "auto", fontSize: "12px", boxShadow: "none", minWidth: "160px",
    "&:hover": { borderColor: "#9ca3af" },
    "&:focus-within": { borderColor: "#5231FF", boxShadow: "0 0 0 2px rgba(82,49,255,0.12)" },
  }),
  input: (base: Record<string, unknown>) => ({ ...base, padding: "0px 4px", margin: "0", fontSize: "12px" }),
  valueContainer: (base: Record<string, unknown>) => ({ ...base, padding: "2px 8px" }),
  indicatorsContainer: (base: Record<string, unknown>) => ({ ...base, padding: "0 4px" }),
  option: (base: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean; data: { value: TaskStatus } }) => {
    const s = STATUS_STYLES[state.data.value];
    return {
      ...base,
      backgroundColor: state.isSelected ? s.bg : state.isFocused ? "#f3f4f6" : "white",
      color: state.isSelected ? s.text : "#111118",
      fontWeight: state.isSelected ? 600 : 400,
      fontSize: "12px", padding: "6px 10px", cursor: "pointer",
    };
  },
  singleValue: (base: Record<string, unknown>, state: { data: { value: TaskStatus } }) => {
    const s = STATUS_STYLES[state.data.value];
    return { ...base, color: s.text, fontWeight: 600 };
  },
  menuList: (base: Record<string, unknown>) => ({ ...base, padding: "0", borderRadius: "8px" }),
  menu: (base: Record<string, unknown>) => ({ ...base, borderRadius: "8px", marginTop: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 60 }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function savePlan(plan: DailyPlan) {
  const all: DailyPlan[] = JSON.parse(localStorage.getItem("daily-plans") || "[]");
  const idx = all.findIndex((p) => p.id === plan.id);
  if (idx >= 0) all[idx] = plan; else all.push(plan);
  localStorage.setItem("daily-plans", JSON.stringify(all));
}

function dateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

function buildTodayPlan(members: Member[]): DailyPlan {
  const today = new Date();
  return {
    id: `today-${dateKey(today)}`,
    date: dateKey(today),
    distribution: {},
    members,
    createdAt: today.toISOString(),
  };
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onStatusChange }: {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const status: TaskStatus = task.status ?? "unassigned";
  const ss = STATUS_STYLES[status];
  const pc = PRIORITY_COLORS[task.priority as Priority] || PRIORITY_COLORS.medium;

  return (
    <div className="flex items-center gap-3 bg-[var(--surface-card)] border border-[var(--color-gray-200)] rounded-lg px-3 py-2.5 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-gray-900)] truncate">{task.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--color-gray-500)]">{task.client}</span>
          {task.campaign && <span className="text-xs text-[var(--color-gray-400)]">· {task.campaign}</span>}
        </div>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: pc.bg, color: pc.text }}>{task.priority}</span>
      <span className="text-xs text-[var(--color-gray-500)] shrink-0 flex items-center gap-1"><Clock size={11} />{task.hours}h</span>
      <div className="shrink-0">
        <Select
          instanceId={`status-${task.id}`}
          value={STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0]}
          onChange={(v) => v && onStatusChange(task.id, v.value)}
          options={STATUS_OPTIONS}
          styles={statusSelectStyles}
          isSearchable={false}
        />
      </div>
    </div>
  );
}

// ─── MemberColumn ─────────────────────────────────────────────────────────────

function MemberSection({ member, tasks, onStatusChange }: {
  member: Member;
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const initials = member.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const memberPhotos = useMemberPhotos();
  const totalHours = tasks.reduce((s, t) => s + t.hours, 0);
  const done = tasks.filter((t) => t.status === "client-approved").length;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--color-card-border)] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-gray-50)] transition-colors text-left"
      >
        {memberPhotos[member.id] ? (
          <img src={memberPhotos[member.id]} alt={member.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{initials}</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-gray-900)]">{member.name}</p>
          <p className="text-xs text-[var(--color-gray-500)]">{member.designation}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[var(--color-gray-500)]">{tasks.length} tasks · {totalHours}h</span>
          {done > 0 && (
            <span className="text-xs font-medium text-[var(--color-success)] bg-green-50 px-2 py-0.5 rounded-full">{done} done</span>
          )}
          <ChevronDown size={14} className={`text-[var(--color-gray-400)] transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-[var(--color-gray-100)] px-4 py-3 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-[var(--color-gray-400)] py-2 text-center">No tasks assigned</p>
          ) : (
            tasks.map((task, idx) => (
              <TaskRow key={`${member.id}-${task.id}-${idx}`} task={task} onStatusChange={onStatusChange} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── DayPlanView ──────────────────────────────────────────────────────────────

function DayPlanView({ plan, label, onUpdate, editHref }: {
  plan: DailyPlan;
  label: string;
  onUpdate: (updated: DailyPlan) => void;
  editHref?: string;
}) {
  const allTasks = Object.values(plan.distribution).flat();
  const totalTasks = allTasks.length;
  const totalHours = allTasks.reduce((s, t) => s + t.hours, 0);
  const done = allTasks.filter((t) => t.status === "client-approved").length;
  const inProgress = allTasks.filter((t) => t.status === "work-in-progress").length;

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    const updated: DailyPlan = {
      ...plan,
      distribution: Object.fromEntries(
        Object.entries(plan.distribution).map(([memberId, tasks]) => [
          memberId,
          tasks.map((t) => t.id === taskId ? { ...t, status } : t),
        ])
      ),
    };
    onUpdate(updated);
    savePlan(updated);
  };

  const activeMembers = plan.members.filter((m) => (plan.distribution[m.id] || []).length > 0);

  return (
    <div>
      {/* Day header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[var(--color-gray-900)]">{label}</h2>
          <p className="text-xs text-[var(--color-gray-500)] mt-0.5">
            {new Date(plan.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-sm text-[var(--color-gray-600)]">
            <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-[var(--color-success)]" /><strong>{done}</strong> done</span>
            <span className="flex items-center gap-1"><Clock size={14} className="text-[var(--color-warning)]" /><strong>{inProgress}</strong> in progress</span>
            <span className="flex items-center gap-1 text-[var(--color-gray-500)]"><strong>{totalTasks}</strong> total · <strong>{totalHours}h</strong></span>
          </div>
          {editHref && (
            <Link href={editHref} className="inline-flex items-center gap-1.5 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--color-gray-50)] transition-colors">
              <Pencil size={12} /> Edit Plan
            </Link>
          )}
        </div>
      </div>

      {/* Member sections */}
      {activeMembers.length === 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--color-card-border)] rounded-xl p-10 text-center">
          <p className="text-sm text-[var(--color-gray-400)]">No tasks scheduled for this day.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeMembers.map((member) => (
            <MemberSection
              key={member.id}
              member={member}
              tasks={plan.distribution[member.id] || []}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function todayKey2() { return new Date().toISOString().split("T")[0]; }

export default function SchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"today" | "tomorrow">("today");
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  const [tomorrowPlan, setTomorrowPlan] = useState<DailyPlan | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const plans: DailyPlan[] = JSON.parse(localStorage.getItem("daily-plans") || "[]");
    const members: Member[] = JSON.parse(localStorage.getItem("team-members") || "[]");

    // Merge photos from team-members into plan members
    const withPhotos = (plan: DailyPlan): DailyPlan => ({
      ...plan,
      members: plan.members.map((m) => ({ ...m, photo: members.find((tm) => tm.id === m.id)?.photo || m.photo })),
    });

    const tp = plans.find((p) => p.date === dateKey(today));
    const tom = plans.find((p) => p.date === dateKey(tomorrow));

    setTodayPlan(tp ? withPhotos(tp) : buildTodayPlan(members));
    setTomorrowPlan(tom ? withPhotos(tom) : null);

    // Respect ?tab= query param (e.g. after publishing tomorrow's plan)
    if (searchParams.get("tab") === "tomorrow") {
      setTab("tomorrow");
    } else if (!tp && tom) {
      setTab("tomorrow");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  if (!mounted) return null;

  const hasTomorrow = tomorrowPlan !== null;

  const fmtPickerDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

  const PlanButton = () => (
    <div className="relative">
      <button
        onClick={() => setShowPicker(true)}
        className="inline-flex items-center gap-2 bg-[#5231FF] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--color-primary-hover)]"
      >
        <Calendar size={15} /> Create Daily Plan
      </button>
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute right-0 top-full mt-2 z-50 bg-[var(--surface-card)] border border-[var(--color-gray-200)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-4 w-72"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[var(--color-gray-900)]">Select a date</p>
            <button onClick={() => setShowPicker(false)} className="p-1 rounded-lg text-[var(--color-gray-400)] hover:text-[var(--color-gray-700)] hover:bg-[var(--color-gray-100)] transition-colors">
              <X size={14} />
            </button>
          </div>
          <input
            type="date"
            value={pickerDate}
            min={todayKey2()}
            onChange={(e) => setPickerDate(e.target.value)}
            className="w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2 text-sm text-[var(--color-gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors bg-[var(--surface-input)] mb-2"
          />
          {pickerDate && <p className="text-xs text-[var(--color-gray-500)] mb-3">{fmtPickerDate(pickerDate)}</p>}
          <button
            onClick={() => { setShowPicker(false); router.push(`/schedule/tomorrow?date=${pickerDate}`); }}
            disabled={!pickerDate}
            className="w-full bg-[#5231FF] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );

  return (
    <main className="flex-1">
      <div className="p-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-gray-900)]">Schedule</h1>
            <p className="text-sm text-[var(--color-gray-500)] mt-1">View and update task statuses for today and tomorrow.</p>
          </div>
          <PlanButton />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--color-gray-100)] p-1 rounded-lg w-fit mb-6">
          <button
            onClick={() => setTab("today")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${tab === "today" ? "bg-[var(--surface-elevated)] text-[var(--color-gray-900)] shadow-sm" : "text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]"}`}
          >
            Today
          </button>
          <button
            onClick={() => setTab("tomorrow")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${tab === "tomorrow" ? "bg-[var(--surface-elevated)] text-[var(--color-gray-900)] shadow-sm" : "text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]"}`}
          >
            Tomorrow
            {hasTomorrow && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />}
          </button>
        </div>

        {/* Content */}
        {tab === "today" && todayPlan && (
          <DayPlanView
            plan={todayPlan}
            label="Today's Schedule"
            onUpdate={setTodayPlan}
          />
        )}

        {tab === "tomorrow" && (
          hasTomorrow && tomorrowPlan ? (
            <DayPlanView
              plan={tomorrowPlan}
              label="Tomorrow's Plan"
              onUpdate={setTomorrowPlan}
              editHref="/schedule/tomorrow"
            />
          ) : (
            <div className="bg-[var(--surface-card)] border border-[var(--color-card-border)] rounded-xl p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center mx-auto mb-4">
                <Plus size={22} className="text-[var(--color-primary)]" />
              </div>
              <p className="text-base font-semibold text-[var(--color-gray-900)] mb-1">No plan for tomorrow yet</p>
              <p className="text-sm text-[var(--color-gray-500)] mb-5">Create tomorrow&apos;s plan to distribute tasks across the team.</p>
              <PlanButton />
            </div>
          )
        )}
      </div>
    </main>
  );
}
