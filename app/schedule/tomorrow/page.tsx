'use client';

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  X, Plus, Trash2, ChevronRight, ChevronLeft,
  Clock, CheckCircle, AlertTriangle,
  Search, UserPlus, Check, GripVertical,
  Calendar, FileText, Tag, User, Minus, Upload,
} from "lucide-react";
import Select from "react-select";
import { default as CreatableSelect } from "react-select/creatable";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  photo?: string;
}

type LeaveType = "full-day" | "half-day" | "short-leave" | null;
type Priority = "urgent" | "high" | "medium" | "low";

interface Task {
  id: string;
  name: string;
  client?: string;
  contentType: string;
  hours: number;
  quantity?: number;
  priority?: Priority;
  source: "carry-forward" | "ad-hoc" | string;
  status?: string;
  copy?: string;
  notes?: string;
  references?: string[];
  deadline?: string;
  campaign?: string;
  assignedTo?: string;
}

type Distribution = Record<string, Task[]>;

// ─── Constants ────────────────────────────────────────────────────────────────

const DAILY_HOURS = 8;

const LEAVE_HOURS: Record<NonNullable<LeaveType>, number> = {
  "full-day": 8, "half-day": 4, "short-leave": 2,
};
const LEAVE_LABELS: Record<NonNullable<LeaveType>, string> = {
  "full-day": "Full Day Leave", "half-day": "Half Day Leave", "short-leave": "Short Leave",
};
const LEAVE_COLORS: Record<NonNullable<LeaveType>, string> = {
  "full-day": "bg-red-100 text-red-700",
  "half-day": "bg-amber-100 text-amber-700",
  "short-leave": "bg-blue-50 text-blue-700",
};

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  "Google Ad Set": "bg-blue-50 text-blue-700",
  "Post": "bg-purple-50 text-purple-700",
  "Story": "bg-pink-50 text-pink-700",
  "Paid Ad": "bg-indigo-50 text-indigo-700",
  "Album": "bg-teal-50 text-teal-700",
  "Animated Videos": "bg-orange-50 text-orange-700",
};

const CONTENT_TYPE_OPTIONS = [
  { value: "Google Ad Set", label: "Google Ad Set" },
  { value: "Post", label: "Post" },
  { value: "Story", label: "Story" },
  { value: "Paid Ad", label: "Paid Ad" },
  { value: "Album", label: "Album" },
  { value: "Animated Videos", label: "Animated Videos" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const CLIENT_OPTIONS = [
  { value: "Abans PLC", label: "Abans PLC" },
  { value: "Xiaomi Sri Lanka", label: "Xiaomi Sri Lanka" },
  { value: "Moeka", label: "Moeka" },
  { value: "Territory London", label: "Territory London" },
  { value: "Madara Books", label: "Madara Books" },
  { value: "Sri Sri Madara", label: "Sri Sri Madara" },
];

const _tomorrow = new Date(); _tomorrow.setDate(_tomorrow.getDate() + 1);
const _tomorrowKey = _tomorrow.toISOString().split("T")[0];

const MOCK_TASKS: Task[] = [
  { id: "cf-1", name: "Xiaomi Product Launch Banner", client: "Xiaomi Sri Lanka", contentType: "Google Ad Set", hours: 2, priority: "urgent", source: "carry-forward", deadline: _tomorrowKey },
  { id: "cf-2", name: "Moeka Lifestyle Instagram Post", client: "Moeka", contentType: "Post", hours: 1, priority: "medium", source: "carry-forward", deadline: _tomorrowKey },
  { id: "cf-3", name: "Territory London Brand Reel", client: "Territory London", contentType: "Animated Videos", hours: 3, priority: "high", source: "carry-forward", deadline: _tomorrowKey },
  { id: "cf-4", name: "Abans Flash Sale Story", client: "Abans PLC", contentType: "Story", hours: 1.5, priority: "urgent", source: "carry-forward", deadline: _tomorrowKey },
  { id: "sc-1", name: "Madara Books Q2 Campaign Post", client: "Madara Books", contentType: "Post", hours: 1.5, priority: "medium", source: "Madara Q2 Campaign", deadline: _tomorrowKey },
  { id: "sc-2", name: "Xiaomi Weekly Ad Set", client: "Xiaomi Sri Lanka", contentType: "Paid Ad", hours: 2, priority: "high", source: "Xiaomi May Campaign", deadline: _tomorrowKey },
  { id: "sc-3", name: "Abans Mega Sale Album", client: "Abans PLC", contentType: "Album", hours: 3, priority: "high", source: "Abans Summer Sale", deadline: _tomorrowKey },
  { id: "sc-4", name: "Territory London Story Pack", client: "Territory London", contentType: "Story", hours: 1, priority: "low", source: "Territory London Brand", deadline: _tomorrowKey },
  { id: "sc-5", name: "Sri Sri Madara Animated Ad", client: "Sri Sri Madara", contentType: "Animated Videos", hours: 2.5, priority: "medium", source: "Sri Sri Madara Launch", deadline: _tomorrowKey },
];

// ─── Select styles ────────────────────────────────────────────────────────────

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base, borderColor: "var(--color-gray-200)", borderRadius: "8px",
    minHeight: "auto", fontSize: "14px", boxShadow: "none",
    "&:hover": { borderColor: "#9ca3af" },
    "&:focus-within": { borderColor: "var(--color-primary)", boxShadow: "0 0 0 2px rgba(82,49,255,0.12)" },
  }),
  input: (base: Record<string, unknown>) => ({ ...base, padding: "4px 8px", margin: "2px", fontSize: "14px" }),
  option: (base: Record<string, unknown>, { isSelected, isFocused }: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    backgroundColor: isSelected ? "#5231FF" : isFocused ? "#f3f4f6" : "white",
    color: isSelected ? "white" : "#111118",
    fontSize: "14px", padding: "8px 12px", cursor: "pointer",
  }),
  menuList: (base: Record<string, unknown>) => ({ ...base, padding: "0", borderRadius: "8px" }),
  menu: (base: Record<string, unknown>) => ({ ...base, borderRadius: "8px", marginTop: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 60 }),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMemberCapacity(memberId: string, leaves: Record<string, LeaveType>): number {
  const leave = leaves[memberId];
  if (!leave) return DAILY_HOURS;
  return Math.max(0, DAILY_HOURS - LEAVE_HOURS[leave]);
}

function hourBarColor(h: number): string {
  if (h > 7.5) return "bg-[#EF4444]";
  if (h >= 6) return "bg-[#F59E0B]";
  return "bg-[#10B981]";
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

const STEPS = ["Available Employees", "Assign Tasks", "Review & Confirm"];

function Stepper({ current }: { current: number }) {
  return (
    <div className="mb-6">
    <div className="w-full bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-2xl px-8 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="flex items-center">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              {/* Step node + label — horizontal layout */}
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Circle */}
                <div className="relative flex items-center justify-center flex-shrink-0">
                  {/* Outer ring for active */}
                  {active && (
                    <div className="absolute w-10 h-10 rounded-full border-2 border-[#5231FF] opacity-20" />
                  )}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    done ? "bg-[#5231FF] text-white shadow-[0_0_0_3px_rgba(82,49,255,0.15)]"
                    : active ? "bg-[#5231FF] text-white shadow-[0_0_0_4px_rgba(82,49,255,0.18)]"
                    : "bg-[var(--surface-input)] border-2 border-[var(--color-gray-200)] text-[var(--color-gray-400)]"
                  }`}>
                    {done ? <Check size={13} /> : i + 1}
                  </div>
                </div>
                {/* Label */}
                <p className={`text-xs font-semibold whitespace-nowrap ${active ? "text-[var(--color-gray-900)]" : done ? "text-[#5231FF]" : "text-[var(--color-gray-400)]"}`}>
                  {label}
                </p>
              </div>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-3 h-px">
                  <div className="relative h-px">
                    <div className="absolute inset-0 bg-[var(--color-gray-200)]" />
                    <div className={`absolute inset-y-0 left-0 bg-[#5231FF] transition-all duration-500 ${done ? "right-0" : "right-full"}`} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}

// ─── Empty add-task form ──────────────────────────────────────────────────────

const EMPTY_ADD_TASK = {
  name: "",
  contentType: null as { value: string; label: string } | null,
  quantity: 1,
  hours: "1",
  deadline: "",
  artworkCopy: "",
  creator: null as { value: string; label: string } | null,
  notes: "",
  references: [] as string[],
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TomorrowPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [leaves, setLeaves] = useState<Record<string, LeaveType>>({});
  const [taskPool, setTaskPool] = useState<Task[]>([]);
  const [distribution, setDistribution] = useState<Distribution>({});
  const [campaignOptions, setCampaignOptions] = useState<{ value: string; label: string }[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskField, setAddTaskField] = useState({ ...EMPTY_ADD_TASK });
  // Step 2 UI state
  const [taskTab, setTaskTab] = useState<"all" | "incomplete">("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<"pool" | string>("pool"); // "pool" or memberId
  const [dragOverMemberId, setDragOverMemberId] = useState<string | null>(null);
  const [dragOverTaskInfo, setDragOverTaskInfo] = useState<{ taskId: string; position: "above" | "below" } | null>(null);
  // Task detail drawer
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  // Derive the target date from ?date= param or default to tomorrow
  const defaultDate = new Date(); defaultDate.setDate(defaultDate.getDate() + 1);
  const selectedDateKey = searchParams.get("date") || defaultDate.toISOString().split("T")[0];
  const selectedDateObj = new Date(selectedDateKey + "T00:00:00");
  const selectedDateStr = selectedDateObj.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Keep backward-compat alias used in publishPlan
  const tomorrow = selectedDateObj;
  const tomorrowStr = selectedDateStr;

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("team-members");
    const members: TeamMember[] = stored ? JSON.parse(stored) : [];
    setAllMembers(members);

    interface StoredCampaign {
      id: string; client: string; campaignName: string;
      items: Record<string, Array<{
        id: string; taskName: string; contentType: string; quantity: string;
        hours: string; caption?: string; note?: string;
        urgency?: Priority; references?: string[];
        creator?: string; deadline?: string;
      }>>;
    }
    const rawCampaigns: StoredCampaign[] = JSON.parse(localStorage.getItem("campaigns") || "[]");
    const dailyPlans: any[] = JSON.parse(localStorage.getItem("daily-plans") || "[]");
    const creatorsOnlyIds = new Set(members.filter((m) => m.designation?.toLowerCase() !== "manager").map(m => m.id));

    // ── Pre-populate distribution from selected date's saved daily plan ──────
    const existingPlan = dailyPlans.find((p) => p.date === selectedDateKey);
    const assignedTaskIds = new Set<string>();

    if (existingPlan) {
      const creatorDistribution: Record<string, Task[]> = {};
      Object.entries(existingPlan.distribution || {}).forEach(([memberId, tasks]) => {
        if (creatorsOnlyIds.has(memberId)) {
          creatorDistribution[memberId] = (tasks as any[]) as Task[];
          (tasks as any[]).forEach((t) => assignedTaskIds.add(t.id));
        }
      });
      setDistribution(creatorDistribution);
    } else {
      // No saved plan — pre-populate from campaign items assigned on selectedDateKey
      const autoDistribution: Record<string, Task[]> = {};
      rawCampaigns.forEach((campaign) => {
        (campaign.items?.[selectedDateKey] || []).forEach((item) => {
          if (item.creator && creatorsOnlyIds.has(item.creator)) {
            const creatorId = item.creator;
            if (!autoDistribution[creatorId]) autoDistribution[creatorId] = [];
            if (!autoDistribution[creatorId].find((t) => t.id === item.id)) {
              autoDistribution[creatorId].push({
                id: item.id,
                name: item.taskName || item.contentType,
                client: campaign.client,
                contentType: item.contentType,
                hours: parseFloat(item.hours) || 1,
                priority: item.urgency || "medium",
                source: campaign.campaignName,
                status: "assigned",
                copy: item.caption,
                notes: item.note,
                references: item.references,
                deadline: item.deadline,
                assignedTo: creatorId,
              });
              assignedTaskIds.add(item.id);
            }
          }
        });
      });
      if (Object.keys(autoDistribution).length > 0) setDistribution(autoDistribution);
    }

    // ── Build task pool: ALL campaign tasks from ALL dates ───────────────────
    const seenIds = new Set<string>();
    const allCampaignTasks: Task[] = [];

    rawCampaigns.forEach((campaign) => {
      Object.entries(campaign.items || {}).forEach(([, dayItems]) => {
        dayItems.forEach((item) => {
          if (seenIds.has(item.id)) return;
          seenIds.add(item.id);
          // Include ALL tasks in pool (assigned ones show with green border + dimmed)
          allCampaignTasks.push({
            id: item.id,
            name: item.taskName || item.contentType,
            client: campaign.client,
            contentType: item.contentType,
            hours: parseFloat(item.hours) || 1,
            priority: item.urgency || "medium",
            source: campaign.campaignName,
            deadline: item.deadline || selectedDateKey,
            copy: item.caption,
            notes: item.note,
          });
        });
      });
    });

    setCampaignOptions(rawCampaigns.map((c) => ({ value: c.campaignName, label: `${c.campaignName} — ${c.client}` })));

    // Only real campaign tasks — no mock data
    const allTasks = [...allCampaignTasks].sort((a, b) => {
      if (a.deadline && b.deadline) { const d = a.deadline.localeCompare(b.deadline); if (d !== 0) return d; }
      return (PRIORITY_ORDER[a.priority ?? "low"] ?? 3) - (PRIORITY_ORDER[b.priority ?? "low"] ?? 3);
    });
    setTaskPool(allTasks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateKey]);

  // Filter out managers - only show creators for task assignment
  const creatorsOnly = allMembers.filter((m) => m.designation?.toLowerCase() !== "manager");
  const availableMembers = creatorsOnly.filter((m) => getMemberCapacity(m.id, leaves) > 0);
  const totalCapacity = creatorsOnly.reduce((s, m) => s + getMemberCapacity(m.id, leaves), 0);

  const handleNext = () => {
    if (step === 0) {
      const dist: Distribution = {};
      availableMembers.forEach((m) => { dist[m.id] = distribution[m.id] || []; });
      setDistribution(dist);
    }
    setStep((s) => s + 1);
  };
  const handleBack = () => setStep((s) => s - 1);

  const assignTask = (task: Task, memberId: string) => {
    setDistribution((prev) => {
      const next: Distribution = {};
      Object.keys(prev).forEach((mid) => { next[mid] = prev[mid].filter((t) => t.id !== task.id); });
      next[memberId] = [...(next[memberId] || []), { ...task, assignedTo: memberId }];
      return next;
    });
  };

  const unassignTask = (taskId: string, memberId: string) => {
    setDistribution((prev) => ({ ...prev, [memberId]: prev[memberId].filter((t) => t.id !== taskId) }));
  };

  const reorderTask = (memberId: string, draggedId: string, targetId: string, position: "above" | "below") => {
    setDistribution((prev) => {
      const tasks = [...(prev[memberId] || [])];
      const fromIdx = tasks.findIndex((t) => t.id === draggedId);
      if (fromIdx === -1) return prev;
      const [removed] = tasks.splice(fromIdx, 1);
      const newToIdx = tasks.findIndex((t) => t.id === targetId);
      if (newToIdx === -1) { tasks.push(removed); return { ...prev, [memberId]: tasks }; }
      tasks.splice(position === "above" ? newToIdx : newToIdx + 1, 0, removed);
      return { ...prev, [memberId]: tasks };
    });
  };

  const moveTask = (taskId: string, fromId: string, toId: string) => {
    setDistribution((prev) => {
      const next = { ...prev };
      const task = next[fromId]?.find((t) => t.id === taskId);
      if (!task) return prev;
      next[fromId] = next[fromId].filter((t) => t.id !== taskId);
      next[toId] = [...(next[toId] || []), { ...task, assignedTo: toId }];
      return next;
    });
  };

  const deleteTask = (taskId: string) => {
    setTaskPool((prev) => prev.filter((t) => t.id !== taskId));
    setDistribution((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((memberId) => {
        next[memberId] = next[memberId].filter((t) => t.id !== taskId);
      });
      return next;
    });
  };

  const addAdHocTask = () => {
    if (!addTaskField.name || !addTaskField.contentType) return;
    const task: Task = {
      id: `adhoc-${Date.now()}`,
      name: addTaskField.name,
      contentType: addTaskField.contentType.value,
      quantity: addTaskField.quantity,
      hours: parseFloat(addTaskField.hours) || 1,
      source: "ad-hoc",
      status: addTaskField.creator ? "Assigned" : "Backlog",
      copy: addTaskField.artworkCopy || undefined,
      notes: addTaskField.notes || undefined,
      references: addTaskField.references.length > 0 ? addTaskField.references : undefined,
      deadline: addTaskField.deadline || undefined,
      assignedTo: addTaskField.creator?.value || undefined,
    };
    setTaskPool((t) => [...t, task]);
    setShowAddTask(false);
    setAddTaskField({ ...EMPTY_ADD_TASK });
  };

  const publishPlan = () => {
    const lightDistribution = Object.fromEntries(
      Object.entries(distribution).map(([memberId, tasks]) => [
        memberId,
        tasks.map((t) => ({ ...t, status: t.status ?? "assigned" })),
      ])
    );
    const plan = {
      id: `plan-${Date.now()}`,
      date: selectedDateKey,
      distribution: lightDistribution,
      members: availableMembers.map(({ id, name, designation }) => ({ id, name, designation })),
      createdAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(localStorage.getItem("daily-plans") || "[]");
      const filtered = existing.filter((p: { date: string }) => p.date !== plan.date);
      localStorage.setItem("daily-plans", JSON.stringify([...filtered, plan]));
      router.push("/schedule?tab=tomorrow");
    } catch {
      localStorage.removeItem("daily-plans");
      localStorage.setItem("daily-plans", JSON.stringify([plan]));
      router.push("/schedule?tab=tomorrow");
    }
  };

  const assignedTaskIds = new Set(Object.values(distribution).flat().map((t) => t.id));

  const filteredTasks = taskPool
    .filter((t) => taskTab === "all" || t.source === "carry-forward")
    .filter((t) => !taskSearch || t.name.toLowerCase().includes(taskSearch.toLowerCase()) || (t.client ?? "").toLowerCase().includes(taskSearch.toLowerCase()));

  if (!mounted) return null;

  const inputClass = "w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2 text-sm text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors bg-white";
  const labelClass = "block text-xs font-medium text-[var(--color-gray-700)] mb-1.5";

  return (
    <main className="flex flex-col">

      {/* Page header + stepper — scrolls with page */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-[var(--color-gray-900)]">Create Daily Plan</h1>
          <p className="text-sm text-[var(--color-gray-500)] mt-1">{tomorrowStr}</p>
        </div>
        <Stepper current={step} />
      </div>

      {/* ── Step 0: Available Employees ─────────────────────────────────────── */}
      {step === 0 && (
        <>
        <div className="px-6 pb-6 flex-1 overflow-y-auto">
          <div className="mb-5">
            <h2 className="text-base font-bold text-[var(--color-gray-900)]">Team Availability — {selectedDateStr}</h2>
            <p className="text-sm text-[var(--color-gray-500)] mt-0.5">All employees are available by default. Mark leave if someone is absent.</p>
          </div>
          {allMembers.length === 0 ? (
            <p className="text-sm text-[var(--color-gray-500)] py-8 text-center">No team members found. Add team members first.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {allMembers.map((m) => {
                const leave = leaves[m.id] ?? null;
                const capacity = getMemberCapacity(m.id, leaves);
                const pct = Math.round((capacity / DAILY_HOURS) * 100);
                const isOnFullLeave = leave === "full-day";
                return (
                  <div key={m.id} className={`flex flex-col rounded-2xl border shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all ${isOnFullLeave ? "border-red-200 bg-red-50/30 opacity-60" : "border-[var(--color-card-border)] bg-[var(--surface-card)]"}`}>
                    {/* Card top */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 overflow-hidden">
                        {m.photo ? <Image src={m.photo} alt={m.name} width={40} height={40} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-[#5231FF]">{m.name.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-gray-900)] truncate">{m.name}</p>
                        <p className="text-xs text-[var(--color-gray-500)] truncate">{m.designation}</p>
                      </div>
                      {leave && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${LEAVE_COLORS[leave]}`}>{LEAVE_LABELS[leave]}</span>
                      )}
                    </div>

                    {/* Capacity bar */}
                    <div className="px-4 pb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-[var(--color-gray-500)]">Capacity</span>
                        <span className={`text-[11px] font-semibold ${capacity === 0 ? "text-red-500" : "text-[var(--color-gray-700)]"}`}>
                          {capacity}h <span className="font-normal text-[var(--color-gray-400)]">/ {DAILY_HOURS}h</span>
                        </span>
                      </div>
                      <div className="w-full bg-[var(--color-gray-100)] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${capacity === 0 ? "bg-red-400" : capacity < DAILY_HOURS ? "bg-amber-400" : "bg-[#10B981]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Divider + leave action */}
                    <div className="border-t border-[var(--color-gray-100)] px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-[var(--color-gray-400)]">
                        {isOnFullLeave ? "Not available tomorrow" : "Available"}
                      </span>
                      <LeaveSelector current={leave} onChange={(lt) => setLeaves((prev) => { const next = { ...prev }; lt === null ? delete next[m.id] : (next[m.id] = lt); return next; })} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-xl p-4 flex items-center gap-6 flex-wrap">
            <span className="text-sm text-[var(--color-gray-700)]"><strong>{availableMembers.length}</strong> of <strong>{allMembers.length}</strong> employees working tomorrow</span>
            <span className="text-sm text-[var(--color-gray-700)]">Total capacity: <strong>{totalCapacity}h</strong></span>
            {Object.values(leaves).filter(Boolean).length > 0 && (
              <span className="text-sm text-amber-600 font-medium">{Object.values(leaves).filter(Boolean).length} leave{Object.values(leaves).filter(Boolean).length > 1 ? "s" : ""} marked</span>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 z-10 flex items-center justify-between px-6 py-4 border-t border-[var(--color-gray-200)] bg-[var(--surface-card)]">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
            <ChevronLeft size={16} /> Cancel
          </button>
          <button onClick={handleNext} disabled={allMembers.length === 0} className="inline-flex items-center gap-2 bg-[#5231FF] text-white px-5 py-2.5 rounded-lg text-sm font-semibold  disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Next <ChevronRight size={16} />
          </button>
        </div>
        </>
      )}

      {/* ── Step 1: Assign Tasks — sticky split-screen once it hits the top ──── */}
      {step === 1 && (
        <div className="sticky top-0 z-10 bg-[var(--surface-page)] flex flex-col" style={{ height: "calc(100vh - 90px)" }}>
        <div className="flex flex-1 min-h-0 overflow-hidden px-6 pb-0 gap-5">

          {/* ── Left panel — task pool ────────────────────────────────────────── */}
          <div className="w-[340px] shrink-0 flex flex-col bg-[var(--surface-card)] border border-[var(--color-card-border)] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">

            {/* Sticky header */}
            <div className="px-4 pt-4 pb-3 border-b border-[var(--color-gray-100)] shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[var(--color-gray-900)]">All Tasks</span>
                <button onClick={() => setShowAddTask(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#5231FF] hover:text-[var(--color-primary-hover)] transition-colors">
                  <Plus size={13} /> Add Task
                </button>
              </div>
              <div className="relative mb-3">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-gray-400)]" />
                <input
                  type="text"
                  placeholder="Search tasks…"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--color-gray-200)] rounded-lg bg-[var(--surface-input)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent placeholder:text-[var(--color-gray-400)]"
                />
              </div>
              {/* Tabs */}
              <div className="flex gap-1 bg-[var(--color-gray-100)] rounded-lg p-0.5">
                {(["all", "incomplete"] as const).map((tab) => (
                  <button key={tab} onClick={() => setTaskTab(tab)}
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${taskTab === tab ? "bg-[var(--surface-elevated)] text-[var(--color-gray-900)] shadow-sm" : "text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]"}`}>
                    {tab === "all" ? "All Tasks" : "Incomplete"}
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${taskTab === tab ? "bg-[var(--color-primary-light)] text-[#5231FF]" : "bg-[var(--color-gray-200)] text-[var(--color-gray-500)]"}`}>
                      {tab === "all" ? taskPool.length : taskPool.filter((t) => t.source === "carry-forward").length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable task list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
              {filteredTasks.length === 0 && <p className="text-xs text-[var(--color-gray-400)] text-center py-6">No tasks found</p>}
              {filteredTasks.map((task) => {
                const isIncomplete = task.source === "carry-forward";
                const assignedMemberId = Object.entries(distribution).find(([, tasks]) => tasks.some((t) => t.id === task.id))?.[0];
                const assignedMember = assignedMemberId ? allMembers.find((m) => m.id === assignedMemberId) : null;
                return (
                  <TaskPoolCard
                    key={`pool-${task.id}`}
                    task={task}
                    isIncomplete={isIncomplete}
                    assignedMember={assignedMember}
                    members={availableMembers}
                    onAssign={(memberId) => assignTask(task, memberId)}
                    onUnassign={assignedMemberId ? () => unassignTask(task.id, assignedMemberId) : undefined}
                    onDragStart={() => { setDraggedTaskId(task.id); setDragSource("pool"); }}
                    onDragEnd={() => { setDraggedTaskId(null); setDragOverTaskInfo(null); }}
                    onOpenDetail={() => setDetailTask(task)}
                  />
                );
              })}
            </div>

            {/* Footer count */}
            <div className="px-4 py-2.5 border-t border-[var(--color-gray-100)] bg-[var(--color-gray-50)] shrink-0">
              <p className="text-xs text-[var(--color-gray-500)]">
                <span className="font-semibold text-[var(--color-gray-700)]">{assignedTaskIds.size}</span> of <span className="font-semibold text-[var(--color-gray-700)]">{taskPool.length}</span> tasks assigned
              </p>
            </div>
          </div>

          {/* ── Right panel — employee columns ───────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-sm font-bold text-[var(--color-gray-900)]">Employee Assignments</h2>
              {availableMembers.length === 0 && <p className="text-xs text-[var(--color-gray-400)]">No available employees.</p>}
            </div>
            {/* Horizontally scrollable columns, each column scrolls vertically */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
              <div className="flex gap-3 h-full" style={{ minWidth: `${Math.max(availableMembers.length, 1) * 220}px` }}>
                {availableMembers.map((m) => {
                  const memberTasks = distribution[m.id] || [];
                  const memberHours = memberTasks.reduce((s, t) => s + t.hours, 0);
                  const memberCapacity = getMemberCapacity(m.id, leaves);
                  const pct = memberCapacity > 0 ? Math.min((memberHours / memberCapacity) * 100, 100) : 100;
                  const isDragOver = dragOverMemberId === m.id && dragSource !== m.id;

                  return (
                    <div key={m.id}
                      className={`flex-1 min-w-[240px] flex flex-col bg-[var(--surface-card)] rounded-xl border transition-colors ${isDragOver ? "border-[var(--color-primary)] shadow-[0_0_0_2px_rgba(82,49,255,0.15)]" : "border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOverMemberId(m.id); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverMemberId(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverMemberId(null);
                        setDragOverTaskInfo(null);
                        if (!draggedTaskId) return;
                        if (dragSource === "pool") {
                          const task = taskPool.find((t) => t.id === draggedTaskId);
                          if (task) assignTask(task, m.id);
                        } else if (dragSource !== m.id) {
                          // Cross-column: move task to this column (appends to end)
                          moveTask(draggedTaskId, dragSource, m.id);
                        }
                      }}
                    >
                      {/* Sticky column header */}
                      <div className="p-3 border-b border-[var(--color-gray-100)] shrink-0">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 overflow-hidden">
                            {m.photo ? <Image src={m.photo} alt={m.name} width={32} height={32} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-[#5231FF]">{m.name.charAt(0)}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--color-gray-900)] truncate">{m.name}</p>
                            <p className="text-[10px] text-[var(--color-gray-500)] truncate">{m.designation}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[var(--color-gray-500)]">Workload</span>
                          <span className={`text-[10px] font-bold ${memberHours > memberCapacity * 0.9 ? "text-[#EF4444]" : memberHours >= memberCapacity * 0.7 ? "text-[#F59E0B]" : "text-[#10B981]"}`}>{memberHours.toFixed(1)} / {memberCapacity}h</span>
                        </div>
                        <div className="w-full bg-[var(--color-gray-100)] rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${hourBarColor(memberHours)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Scrollable task area */}
                      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                        {memberTasks.length === 0 ? (
                          <div className={`flex flex-col items-center justify-center py-6 rounded-lg border-2 border-dashed transition-colors ${isDragOver ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]" : "border-[var(--color-gray-200)]"}`}>
                            <UserPlus size={18} className={isDragOver ? "text-[#5231FF]" : "text-[var(--color-gray-300)]"} />
                            <p className={`text-[10px] mt-1.5 text-center ${isDragOver ? "text-[#5231FF] font-medium" : "text-[var(--color-gray-400)]"}`}>{isDragOver ? "Drop to assign" : "Drag tasks here"}</p>
                          </div>
                        ) : (
                          memberTasks.map((task, tidx) => (
                            <AssignedTaskCard
                              key={`${m.id}-${task.id}-${tidx}`}
                              task={task}
                              members={availableMembers}
                              currentMemberId={m.id}
                              onMove={moveTask}
                              onDelete={() => unassignTask(task.id, m.id)}
                              onOpenDetail={() => setDetailTask(task)}
                              dragOverInfo={dragOverTaskInfo?.taskId === task.id ? dragOverTaskInfo.position : null}
                              onDragStart={() => { setDraggedTaskId(task.id); setDragSource(m.id); }}
                              onDragEnd={() => { setDraggedTaskId(null); setDragOverTaskInfo(null); }}
                              onDragOver={(position) => setDragOverTaskInfo({ taskId: task.id, position })}
                              onDragLeave={() => setDragOverTaskInfo(null)}
                              onDrop={(position) => {
                                if (draggedTaskId && dragSource === m.id) {
                                  reorderTask(m.id, draggedTaskId, task.id, position);
                                } else if (draggedTaskId && dragSource !== "pool" && dragSource !== m.id) {
                                  moveTask(draggedTaskId, dragSource, m.id);
                                }
                                setDragOverTaskInfo(null);
                              }}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {/* Nav buttons — sticky footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between px-6 py-4 border-t border-[var(--color-gray-200)] bg-[var(--surface-card)]">
          <button onClick={handleBack} className="inline-flex items-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={handleNext} className="inline-flex items-center gap-2 bg-[#5231FF] text-white px-5 py-2.5 rounded-lg text-sm font-semibold  transition-colors">
            Next <ChevronRight size={16} />
          </button>
        </div>
        </div>
      )}

      {/* ── Step 2: Review & Confirm ─────────────────────────────────────────── */}
      {step === 2 && (
        <>
        <div className="px-6 pb-6 flex-1 overflow-y-auto">
          <div className="mb-5">
            <h2 className="text-base font-bold text-[var(--color-gray-900)]">Review & Confirm</h2>
            <p className="text-sm text-[var(--color-gray-500)] mt-0.5">Review the final plan before publishing it to the team.</p>
          </div>
          {/* Workload & Stats & Clients Section */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Workload Distribution Pie Chart - Horizontal Layout */}
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4">
              <h4 className="text-sm font-semibold text-[var(--color-gray-900)] mb-3">Workload Distribution</h4>
              <div className="flex gap-4 items-center">
                {/* Chart */}
                <div className="relative w-40 h-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={availableMembers.map((m, idx) => {
                          const memberTasks = Object.values(distribution)[idx] || [];
                          return {
                            name: m.name,
                            value: memberTasks.length,
                            tasks: memberTasks.length,
                          };
                        }).filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {["#5B7FFF", "#FF6B6B", "#4ECDC4", "#FFD93D", "#A78BFA", "#F97316"].map((color) => (
                          <Cell key={`cell-${color}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => {
                          return [`${props.payload.tasks} task${props.payload.tasks > 1 ? "s" : ""}`, ""];
                        }}
                        labelFormatter={(label) => label}
                        contentStyle={{ backgroundColor: "#2563eb", border: "none", borderRadius: "8px", color: "#fff", padding: "8px 12px", fontSize: "12px" }}
                        cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-xl font-bold text-[var(--color-gray-900)]">{Object.values(distribution).flat().length}</p>
                    <p className="text-[9px] text-[var(--color-gray-500)]">Tasks</p>
                  </div>
                </div>

                {/* Legends beside chart */}
                <div className="space-y-1.5">
                  {availableMembers.map((m, idx) => {
                    const memberTasks = Object.values(distribution)[idx] || [];
                    const colors = ["#5B7FFF", "#FF6B6B", "#4ECDC4", "#FFD93D", "#A78BFA", "#F97316"];
                    return memberTasks.length > 0 ? (
                      <div key={m.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[idx] }} />
                        <p className="text-[10px] text-[var(--color-gray-900)] truncate">{m.name}</p>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            {/* Center: Stats Grid 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const allHours = Object.values(distribution).flat().reduce((s, t) => s + t.hours, 0);
                const avgHoursPerEmployee = availableMembers.length > 0 ? (allHours / availableMembers.length).toFixed(1) : 0;
                const maxHours = Math.max(...availableMembers.map((m, idx) => Object.values(distribution)[idx]?.reduce((s, t) => s + t.hours, 0) || 0));
                const totalCapacity = availableMembers.length * 8;
                const slackCapacity = totalCapacity - allHours;

                return [
                  { label: "Avg Workload", value: `${avgHoursPerEmployee}h`, icon: "📊" },
                  { label: "Peak Load", value: `${maxHours}h`, icon: "📈" },
                  { label: "Slack Capacity", value: `${slackCapacity}h`, icon: "✨" },
                  { label: "Total Hours", value: `${allHours}h`, icon: "⏱️" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[9px] text-[var(--color-gray-500)] font-semibold uppercase tracking-tight mb-0.5">{stat.label}</p>
                        <p className="text-base font-bold text-[var(--color-gray-900)]">{stat.value}</p>
                      </div>
                      <p className="text-lg shrink-0">{stat.icon}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Right: Covered Clients - Small Chips */}
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4">
              <h4 className="text-sm font-semibold text-[var(--color-gray-900)] mb-3">Covered Clients</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(Object.values(distribution).flat().map((t) => t.client)))
                  .sort()
                  .map((client) => (
                    <span key={client} className="px-3 py-1.5 bg-[var(--color-primary-light)] text-[#5231FF] rounded-full text-[11px] font-semibold truncate">
                      {client}
                    </span>
                  ))}
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-gray-900)] mb-4">Assignment Breakdown</h3>
            <div className="grid grid-cols-4 gap-4">
              {availableMembers.map((m) => {
                const memberTasks = distribution[m.id] || [];
                const memberHours = memberTasks.reduce((s, t) => s + t.hours, 0);
                return (
                  <div key={m.id} className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4">
                    {/* Profile */}
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 overflow-hidden">
                        {m.photo ? <Image src={m.photo} alt={m.name} width={40} height={40} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-[#5231FF]">{m.name.charAt(0)}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--color-gray-900)] truncate">{m.name}</p>
                        <p className="text-[10px] text-[var(--color-gray-500)] truncate">{m.designation}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-gray-100)]">
                      <div>
                        <p className="text-2xl font-bold text-[var(--color-gray-900)]">{memberTasks.length}</p>
                        <p className="text-xs text-[var(--color-gray-500)]">tasks</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${memberHours > 7.5 ? "text-[#EF4444]" : "text-[var(--color-gray-900)]"}`}>{memberHours.toFixed(1)}h</p>
                        <p className="text-xs text-[var(--color-gray-500)]">hours</p>
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="space-y-1.5">
                      {memberTasks.length > 0 ? (
                        memberTasks.map((t, ti) => (
                          <div key={`review-${m.id}-${t.id}-${ti}`} className="flex items-center justify-between text-xs gap-2">
                            <p className="font-medium text-[var(--color-gray-900)] truncate flex-1" title={t.name}>{t.name}</p>
                            <p className="text-[var(--color-gray-500)] shrink-0">{t.hours}h</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[var(--color-gray-400)] text-center">No tasks assigned</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-10 flex items-center justify-between px-6 py-4 border-t border-[var(--color-gray-200)] bg-[var(--surface-card)]">
          <button onClick={handleBack} className="inline-flex items-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={publishPlan} className="inline-flex items-center gap-2 bg-[#5231FF] text-white px-6 py-2.5 rounded-lg text-sm font-semibold  transition-colors">
            <CheckCircle size={16} /> Publish Plan
          </button>
        </div>
        </>
      )}

      {/* ── Task Detail Drawer ────────────────────────────────────────────────── */}
      {detailTask && (
        <TaskDetailDrawer
          task={detailTask}
          members={availableMembers}
          assignedMemberId={Object.entries(distribution).find(([, tasks]) => tasks.some((t) => t.id === detailTask.id))?.[0]}
          onAssign={(memberId) => { assignTask(detailTask, memberId); setDetailTask({ ...detailTask, assignedTo: memberId }); }}
          onUnassign={(memberId) => { unassignTask(detailTask.id, memberId); setDetailTask({ ...detailTask, assignedTo: undefined }); }}
          onClose={() => setDetailTask(null)}
        />
      )}

      {/* ── Add Ad-hoc Task Drawer ─────────────────────────────────────────────── */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowAddTask(false)} />
          <div className="w-[480px] bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-gray-200)]">
              <h3 className="text-base font-bold text-[var(--color-gray-900)]">Add Ad-hoc Task</h3>
              <button onClick={() => setShowAddTask(false)} className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:bg-[var(--color-gray-100)] transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className={labelClass}>Task Name <span className="text-[#EF4444]">*</span></label>
                <input type="text" placeholder="e.g. Urgent client revision" value={addTaskField.name} onChange={(e) => setAddTaskField({ ...addTaskField, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Content Type <span className="text-[#EF4444]">*</span></label>
                <Select instanceId="adhoc-type" value={addTaskField.contentType} onChange={(v) => setAddTaskField({ ...addTaskField, contentType: v })} options={CONTENT_TYPE_OPTIONS} styles={selectStyles} placeholder="Select content type…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Quantity <span className="text-[#EF4444]">*</span></label>
                  <div className="flex items-center gap-0 rounded-full border border-[var(--color-gray-200)] bg-white">
                    <button onClick={() => setAddTaskField({ ...addTaskField, quantity: Math.max(1, addTaskField.quantity - 1) })} className="p-2 text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] hover:bg-[var(--color-gray-100)] transition-colors rounded-full">
                      <Minus size={16} />
                    </button>
                    <span className="flex-1 text-sm font-semibold text-[var(--color-gray-900)] text-center">{addTaskField.quantity}</span>
                    <button onClick={() => setAddTaskField({ ...addTaskField, quantity: addTaskField.quantity + 1 })} className="p-2 text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] hover:bg-[var(--color-gray-100)] transition-colors rounded-full">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Hours <span className="text-[#EF4444]">*</span></label>
                  <input type="number" min="0.5" max="16" step="0.5" value={addTaskField.hours} onChange={(e) => setAddTaskField({ ...addTaskField, hours: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Deadline <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <input type="date" value={addTaskField.deadline} onChange={(e) => setAddTaskField({ ...addTaskField, deadline: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Artwork Copy <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <textarea rows={2} placeholder="Artwork description, caption, or notes…" value={addTaskField.artworkCopy} onChange={(e) => setAddTaskField({ ...addTaskField, artworkCopy: e.target.value })} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className={labelClass}>Creator / Assignee <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <Select instanceId="adhoc-creator" value={addTaskField.creator} onChange={(v) => setAddTaskField({ ...addTaskField, creator: v })} options={availableMembers.map((m) => ({ value: m.id, label: m.name, photo: m.photo }))} styles={selectStyles} placeholder="Assign to a team member…" isClearable isSearchable={false} formatOptionLabel={(option: any) => option.value ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 overflow-hidden">
                      {option.photo ? <img src={option.photo} alt={option.label} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-[#5231FF]">{option.label.charAt(0).toUpperCase()}</span>}
                    </div>
                    <span>{option.label}</span>
                  </div>
                ) : option.label} />
              </div>
              <div>
                <label className={labelClass}>Notes <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <textarea rows={2} placeholder="Any notes or instructions for the team…" value={addTaskField.notes} onChange={(e) => setAddTaskField({ ...addTaskField, notes: e.target.value })} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className={labelClass}>References <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                {addTaskField.references.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {addTaskField.references.map((ref, i) => (
                      <div key={i} className="relative group/ref w-16 h-16 rounded-lg overflow-hidden border border-[var(--color-gray-200)]">
                        <img src={ref} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setAddTaskField({ ...addTaskField, references: addTaskField.references.filter((_, idx) => idx !== i) })} className="absolute inset-0 bg-black/60 opacity-0 group-hover/ref:opacity-100 flex items-center justify-center transition-opacity">
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-gray-300)] rounded-lg p-6 cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors group/upload">
                  <Upload size={24} className="text-[var(--color-gray-400)] group-hover/upload:text-[#5231FF] mb-2" />
                  <span className="text-sm text-[var(--color-gray-700)] group-hover/upload:text-[#5231FF] font-medium text-center">Click to upload reference images</span>
                  <span className="text-xs text-[var(--color-gray-400)] group-hover/upload:text-[var(--color-gray-500)] mt-1">PNG, JPG, GIF up to 10MB</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                    Array.from(e.target.files || []).forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = (ev) => { const result = ev.target?.result as string; setAddTaskField((prev) => ({ ...prev, references: [...prev.references, result] })); };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = "";
                  }} />
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-gray-200)] flex gap-3 justify-end">
              <button onClick={() => setShowAddTask(false)} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--color-gray-700)] border border-[var(--color-gray-200)] bg-[var(--surface-card)] hover:bg-[var(--color-gray-100)] transition-colors">Cancel</button>
              <button onClick={addAdHocTask} disabled={!addTaskField.name || !addTaskField.contentType} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#5231FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Add Task</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LeaveSelector({ current, onChange }: { current: LeaveType; onChange: (lt: LeaveType) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button onClick={() => setOpen(!open)}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${current ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100" : "border-[var(--color-gray-200)] text-[var(--color-gray-600)] bg-[var(--surface-card)] hover:bg-[var(--color-gray-100)]"}`}>
        {current ? "Change Leave" : "+ Add Leave"}
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-[var(--surface-card)] border border-[var(--color-gray-200)] rounded-xl shadow-lg z-20 w-44 py-1.5 overflow-hidden">
          <p className="text-xs font-semibold text-[var(--color-gray-400)] uppercase tracking-wide px-3 pt-1 pb-2">Leave Type</p>
          {(["full-day", "half-day", "short-leave"] as NonNullable<LeaveType>[]).map((lt) => (
            <button key={lt} onClick={() => { onChange(lt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-gray-50)] transition-colors ${current === lt ? "font-semibold text-[#5231FF]" : "text-[var(--color-gray-700)]"}`}>
              <span className="font-semibold">{LEAVE_LABELS[lt]}</span>
              <span className="text-[var(--color-gray-400)] ml-1">({lt === "full-day" ? "0h" : lt === "half-day" ? "4h" : "6h"})</span>
            </button>
          ))}
          {current && (
            <>
              <div className="mx-3 my-1 h-px bg-[var(--color-gray-100)]" />
              <button onClick={() => { onChange(null); setOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">Remove Leave</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Minimal task pool card ───────────────────────────────────────────────────

function TaskPoolCard({ task, isIncomplete, assignedMember, members, onAssign, onUnassign, onDragStart, onDragEnd, onOpenDetail }: {
  task: Task;
  isIncomplete: boolean;
  assignedMember?: TeamMember | null;
  members: TeamMember[];
  onAssign: (memberId: string) => void;
  onUnassign?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpenDetail: () => void;
}) {
  const [showAssign, setShowAssign] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const openAssign = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setShowAssign(true);
  };

  const isAssigned = !!assignedMember;
  const todayIso = new Date().toISOString().split("T")[0];
  const isDueToday = task.deadline === todayIso;

  const cardBg = isAssigned ? "bg-white" : isDueToday ? "bg-red-50" : "bg-white";
  const cardBorder = isAssigned
    ? "border-2 border-[#10B981] opacity-60"
    : isDueToday
    ? "border-2 border-red-300 hover:border-red-400 hover:shadow-sm"
    : "border border-[var(--color-card-border)] hover:border-[var(--color-gray-300)] hover:shadow-sm";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpenDetail}
      className={`rounded-lg px-3 py-2.5 group cursor-pointer transition-all ${cardBg} ${cardBorder}`}
    >
      {/* Row 1: drag handle + name + deadline */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <GripVertical size={12} className="text-[var(--color-gray-300)] shrink-0 cursor-grab" onClick={(e) => e.stopPropagation()} />
        <p className={`text-xs font-semibold leading-snug truncate flex-1 ${isAssigned ? "text-[var(--color-gray-400)] line-through" : "text-[var(--color-gray-900)]"}`}>{task.name}</p>
        {task.deadline && (
          <span className={`text-[10px] flex items-center gap-0.5 shrink-0 ${isDueToday ? "text-red-500 font-semibold" : "text-[var(--color-gray-400)]"}`}>
            <Calendar size={9} />
            {isDueToday ? "Today" : fmtDate(task.deadline)}
          </span>
        )}
      </div>

      {/* Row 2: badges + hours */}
      <div className="flex items-center gap-1.5 flex-wrap pl-5 mb-1.5">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isAssigned ? "bg-[var(--color-gray-100)] text-[var(--color-gray-400)]" : CONTENT_TYPE_COLORS[task.contentType] || "bg-gray-100 text-gray-600"}`}>{task.contentType}</span>
        {task.priority && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isAssigned ? "bg-[var(--color-gray-100)] text-[var(--color-gray-400)]" : PRIORITY_COLORS[task.priority] || "bg-gray-100 text-gray-600"}`}>{task.priority}</span>}
        {isIncomplete && !isAssigned && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Carry-forward</span>}
        <span className="ml-auto text-[10px] text-[var(--color-gray-400)] flex items-center gap-0.5 shrink-0">
          <Clock size={9} />{task.hours}h
        </span>
      </div>

      {/* Row 4: assignee info + action button — always clickable */}
      <div className="flex items-center justify-between pl-5" style={{ opacity: 1, filter: "none" }} onClick={(e) => e.stopPropagation()}>
        {isAssigned ? (
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-5 h-5 rounded-full bg-[var(--color-gray-300)] flex items-center justify-center text-white text-[8px] font-bold shrink-0 overflow-hidden">
              {assignedMember!.photo
                ? <img src={assignedMember!.photo} alt="" className="w-full h-full object-cover" />
                : assignedMember!.name.charAt(0)}
            </div>
            <span className="text-[10px] text-[var(--color-gray-500)] font-medium truncate">{assignedMember!.name}</span>
            {onUnassign && (
              <button
                onClick={(e) => { e.stopPropagation(); onUnassign(); }}
                title="Unassign"
                className="text-[10px] text-[var(--color-gray-300)] hover:text-[#EF4444] transition-colors ml-1 shrink-0 font-bold leading-none"
              >×</button>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-[var(--color-gray-400)]">Unassigned</span>
        )}
        <button
          ref={buttonRef}
          onClick={openAssign}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-[var(--color-gray-100)] text-[var(--color-gray-500)] hover:bg-[var(--color-primary-light)] hover:text-[#5231FF] transition-colors shrink-0 ml-2"
          style={{ opacity: 1, filter: "none" }}
        >
          <UserPlus size={9} /> {isAssigned ? "Reassign" : "Assign"}
        </button>
      </div>

      {showAssign && createPortal(
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setShowAssign(false)} />
          <div className="fixed z-[100] w-52 bg-[var(--surface-card)] border border-[var(--color-gray-200)] rounded-xl shadow-2xl overflow-hidden" style={{ top: menuPos.top, left: menuPos.left }}>
            <p className="px-3 py-2 text-[10px] font-semibold text-[var(--color-gray-400)] uppercase tracking-wide border-b border-[var(--color-gray-100)]">Assign to</p>
            <div className="overflow-y-auto" style={{ maxHeight: `${5 * 52}px` }}>
              {members.map((m) => {
                const initials = m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <button key={m.id} onClick={() => { onAssign(m.id); setShowAssign(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--color-gray-50)] transition-colors text-left border-b border-[var(--color-gray-100)] last:border-b-0">
                    {m.photo ? <img src={m.photo} alt={m.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" /> : <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{initials}</div>}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-gray-900)] truncate">{m.name}</p>
                      <p className="text-[10px] text-[var(--color-gray-500)] truncate">{m.designation}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Assigned task card (right panel) ────────────────────────────────────────

function AssignedTaskCard({ task, members, currentMemberId, onMove, onDelete, onOpenDetail, dragOverInfo, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop }: {
  task: Task;
  members: TeamMember[];
  currentMemberId: string;
  onMove: (taskId: string, from: string, to: string) => void;
  onDelete: () => void;
  onOpenDetail: () => void;
  dragOverInfo: "above" | "below" | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (position: "above" | "below") => void;
  onDragLeave: () => void;
  onDrop: (position: "above" | "below") => void;
}) {
  const [showMove, setShowMove] = useState(false);

  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const moveButtonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const others = members.filter((m) => m.id !== currentMemberId);
  const isIncomplete = task.source === "carry-forward";

  const getDropPosition = (e: React.DragEvent): "above" | "below" => {
    if (!cardRef.current) return "below";
    const rect = cardRef.current.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? "above" : "below";
  };

  const openMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (moveButtonRef.current) {
      const rect = moveButtonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.top + window.scrollY - 8, left: rect.right + window.scrollX - 208 });
    }
    setShowMove(true);
  };

  return (
    <div className="relative">
      {/* Insertion line — above */}
      {dragOverInfo === "above" && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full z-10 pointer-events-none">
          <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
        </div>
      )}

      <div
        ref={cardRef}
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(getDropPosition(e)); }}
        onDragLeave={(e) => { if (!cardRef.current?.contains(e.relatedTarget as Node)) onDragLeave(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(getDropPosition(e)); }}
        onClick={onOpenDetail}
        className={`border rounded-lg p-2.5 group relative cursor-pointer transition-all select-none ${isIncomplete ? "bg-orange-50 border-orange-300" : "bg-[var(--color-gray-50)] border-[var(--color-gray-200)]"} ${dragOverInfo ? "opacity-50" : "hover:shadow-sm"}`}
      >
        {/* Drag handle + name + unassign */}
        <div className="flex items-start gap-1.5 mb-1.5">
          <GripVertical size={12} className="text-[var(--color-gray-300)] mt-0.5 shrink-0 cursor-grab" onClick={(e) => e.stopPropagation()} />
          <p className="text-xs font-semibold text-[var(--color-gray-900)] leading-snug flex-1">{task.name}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Unassign"
            className="p-1 rounded-md text-[var(--color-gray-300)] hover:text-[var(--color-gray-600)] hover:bg-[var(--color-gray-100)] transition-colors opacity-0 group-hover:opacity-100 shrink-0 leading-none"
          >
            <X size={13} />
          </button>
        </div>
        <div className="flex items-center gap-1 flex-wrap mb-1.5 pl-4">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CONTENT_TYPE_COLORS[task.contentType] || "bg-gray-100 text-gray-600"}`}>{task.contentType}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority ?? "low"] || "bg-gray-100 text-gray-600"}`}>{task.priority}</span>
        </div>
        <div className="flex items-center justify-between pl-4">
          <div className="flex items-center gap-1 text-[var(--color-gray-500)]">
            <Clock size={10} /><span className="text-[10px]">{task.hours}h</span>
          </div>
          {others.length > 0 && (
            <button ref={moveButtonRef} onClick={openMove} className="text-[10px] text-[#5231FF] font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
              Move →
            </button>
          )}
        </div>
      </div>

      {/* Insertion line — below */}
      {dragOverInfo === "below" && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full z-10 pointer-events-none">
          <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
        </div>
      )}

      {showMove && createPortal(
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setShowMove(false)} />
          <div className="fixed z-[100] w-52 bg-[var(--surface-card)] border border-[var(--color-gray-200)] rounded-xl shadow-2xl overflow-hidden" style={{ top: menuPos.top, left: menuPos.left }}>
            <p className="px-3 py-2 text-[10px] font-semibold text-[var(--color-gray-400)] uppercase tracking-wide border-b border-[var(--color-gray-100)]">Move to</p>
            <div className="overflow-y-auto" style={{ maxHeight: `${5 * 52}px` }}>
              {others.map((m) => {
                const initials = m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <button key={m.id} onClick={(e) => { e.stopPropagation(); onMove(task.id, currentMemberId, m.id); setShowMove(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--color-gray-50)] transition-colors text-left border-b border-[var(--color-gray-100)] last:border-b-0">
                    {m.photo ? <img src={m.photo} alt={m.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" /> : <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{initials}</div>}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-gray-900)] truncate">{m.name}</p>
                      <p className="text-[10px] text-[var(--color-gray-500)] truncate">{m.designation}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Task Detail Drawer ───────────────────────────────────────────────────────

function TaskDetailDrawer({ task, members, assignedMemberId, onAssign, onUnassign, onClose }: {
  task: Task;
  members: TeamMember[];
  assignedMemberId?: string;
  onAssign: (memberId: string) => void;
  onUnassign: (memberId: string) => void;
  onClose: () => void;
}) {
  const assignedMember = assignedMemberId ? members.find((m) => m.id === assignedMemberId) : null;
  const isIncomplete = task.source === "carry-forward";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[400px] bg-[var(--surface-card)] h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--color-gray-200)]">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1.5">
              {isIncomplete && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Carry-forward</span>}
              {task.source === "ad-hoc" && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">Ad-hoc</span>}
              {!isIncomplete && task.source !== "ad-hoc" && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-gray-100)] text-[var(--color-gray-600)]">{task.source}</span>}
            </div>
            <h3 className="text-base font-bold text-[var(--color-gray-900)] leading-snug">{task.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:bg-[var(--color-gray-100)] transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--color-gray-50)] rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-medium text-[var(--color-gray-500)] uppercase tracking-wide mb-1 flex items-center gap-1"><Tag size={9} />Content Type</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CONTENT_TYPE_COLORS[task.contentType] || "bg-gray-100 text-gray-600"}`}>{task.contentType}</span>
            </div>
            <div className="bg-[var(--color-gray-50)] rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-medium text-[var(--color-gray-500)] uppercase tracking-wide mb-1 flex items-center gap-1"><Tag size={9} />Priority</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority ?? "low"] || "bg-gray-100 text-gray-600"}`}>{task.priority}</span>
            </div>
            <div className="bg-[var(--color-gray-50)] rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-medium text-[var(--color-gray-500)] uppercase tracking-wide mb-1 flex items-center gap-1"><Clock size={9} />Hours</p>
              <p className="text-sm font-bold text-[var(--color-gray-900)]">{task.hours}h</p>
            </div>
            <div className="bg-[var(--color-gray-50)] rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-medium text-[var(--color-gray-500)] uppercase tracking-wide mb-1 flex items-center gap-1"><Calendar size={9} />Deadline</p>
              <p className="text-sm font-bold text-[var(--color-gray-900)]">{fmtDate(task.deadline) || "—"}</p>
            </div>
          </div>

          {/* Client */}
          <div>
            <p className="text-xs font-semibold text-[var(--color-gray-500)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><User size={11} />Client</p>
            <p className="text-sm font-semibold text-[var(--color-gray-900)]">{task.client}</p>
          </div>

          {/* Campaign */}
          {task.campaign && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-gray-500)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><FileText size={11} />Campaign</p>
              <p className="text-sm text-[var(--color-gray-700)]">{task.campaign}</p>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-gray-500)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><FileText size={11} />Notes</p>
              <p className="text-sm text-[var(--color-gray-700)] leading-relaxed whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          {/* Copy */}
          {task.copy && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-gray-500)] uppercase tracking-wide mb-1.5">Artwork Copy</p>
              <p className="text-sm text-[var(--color-gray-700)] leading-relaxed whitespace-pre-wrap">{task.copy}</p>
            </div>
          )}

          {/* References */}
          {task.references && task.references.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-gray-500)] uppercase tracking-wide mb-2">References</p>
              <div className="flex flex-wrap gap-2">
                {task.references.map((ref, i) => (
                  <img key={i} src={ref} alt="" className="w-16 h-16 rounded-lg object-cover border border-[var(--color-gray-200)]" />
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[var(--color-gray-100)]" />

          {/* Assignment section */}
          <div>
            <p className="text-xs font-semibold text-[var(--color-gray-500)] uppercase tracking-wide mb-3 flex items-center gap-1.5"><UserPlus size={11} />Assigned To</p>
            {assignedMember ? (
              <div className="flex items-center gap-3 p-3 bg-[var(--color-primary-light)] rounded-xl border border-[rgba(82,49,255,0.15)]">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shrink-0 overflow-hidden">
                  {assignedMember.photo ? <img src={assignedMember.photo} alt={assignedMember.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-white">{assignedMember.name.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-gray-900)]">{assignedMember.name}</p>
                  <p className="text-xs text-[var(--color-gray-500)]">{assignedMember.designation}</p>
                </div>
                <button onClick={() => onUnassign(assignedMemberId!)} className="text-xs text-[#EF4444] font-medium hover:underline shrink-0">Remove</button>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-gray-400)] mb-3">Not yet assigned.</p>
            )}

            <p className="text-xs font-semibold text-[var(--color-gray-500)] uppercase tracking-wide mt-4 mb-2">{assignedMember ? "Reassign to" : "Assign to"}</p>
            <div className="space-y-1.5">
              {members.map((m) => {
                const isCurrentlyAssigned = m.id === assignedMemberId;
                const initials = m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <button key={m.id} disabled={isCurrentlyAssigned} onClick={() => onAssign(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${isCurrentlyAssigned ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] opacity-50 cursor-default" : "border-[var(--color-gray-200)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"}`}>
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 overflow-hidden">
                      {m.photo ? <img src={m.photo} alt={m.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-[#5231FF]">{initials}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-gray-900)] truncate">{m.name}</p>
                      <p className="text-[10px] text-[var(--color-gray-500)] truncate">{m.designation}</p>
                    </div>
                    {isCurrentlyAssigned && <Check size={13} className="text-[#5231FF] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
