'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Search, Filter, ChevronDown, ChevronUp, ArrowUpDown,
  Clock, AlertCircle, CheckCircle2, ListTodo, X, Plus,
  Upload, FileText, Calendar, Tag, ArrowRight, ChevronRight, Trash2, Download, ZoomIn,
  FileImage, MessageSquare,
} from "lucide-react";
import Select from "react-select";
import { default as CreatableSelect } from "react-select/creatable";
import { useAuth } from "@/components/AuthProvider";
import { saveTaskImages, getTaskImages, removeTaskImage, type UploadedImage } from "@/lib/imageStore";
import { useMemberPhotos } from "@/lib/useMemberPhotos";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "urgent" | "high" | "medium" | "low";
type TaskStatus =
  | "unassigned" | "assigned" | "work-in-progress" | "internal-review"
  | "internal-approved" | "client-review" | "client-approved";

interface FlatTask {
  id: string;
  name: string;
  client: string;
  contentType: string;
  hours: number;
  priority: Priority;
  source: string;
  status: TaskStatus;
  deadline?: string;
  campaign?: string;
  assigneeId: string;
  assigneeName: string;
  assigneePhoto?: string;
  planDate: string;
  copy?: string;
  note?: string;
  notes?: string;
  references?: string[];
  parentTaskId?: string;
  designerName?: string;
  captionWriterId?: string;
  captionWriterName?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  "unassigned":        { label: "Unassigned",          bg: "#F3F4F6", text: "#6B7280" },
  "assigned":          { label: "Assigned",            bg: "#EFF6FF", text: "#2563EB" },
  "work-in-progress":  { label: "Work In Progress",    bg: "#DBEAFE", text: "#1D4ED8" },
  "internal-review":   { label: "In Internal Review",  bg: "#F5F3FF", text: "#7C3AED" },
  "internal-approved": { label: "Internally Approved", bg: "#EEF2FF", text: "#4338CA" },
  "client-review":     { label: "In Client Review",    bg: "#FEFCE8", text: "#A16207" },
  "client-approved":   { label: "Client Approved",     bg: "#F0FDF4", text: "#16A34A" },
};

const PRIORITY_META: Record<Priority, { bg: string; text: string }> = {
  urgent: { bg: "#FEF2F2", text: "#DC2626" },
  high:   { bg: "#FFF7ED", text: "#EA580C" },
  medium: { bg: "#FFFBEB", text: "#D97706" },
  low:    { bg: "#F0FDF4", text: "#16A34A" },
};

const STATUS_OPTIONS = (Object.keys(STATUS_META) as TaskStatus[]).map((v) => ({
  value: v, label: STATUS_META[v].label,
}));

const PRIORITY_OPTIONS = (Object.keys(PRIORITY_META) as Priority[]).map((v) => ({
  value: v, label: v.charAt(0).toUpperCase() + v.slice(1),
}));

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base, borderColor: "var(--color-gray-200)", borderRadius: "8px",
    minHeight: "auto", fontSize: "13px", boxShadow: "none", minWidth: "160px",
    "&:hover": { borderColor: "#9ca3af" },
    "&:focus-within": { borderColor: "#5231FF", boxShadow: "0 0 0 2px rgba(82,49,255,0.12)" },
  }),
  input: (base: Record<string, unknown>) => ({ ...base, padding: "2px 4px", margin: "0", fontSize: "13px" }),
  valueContainer: (base: Record<string, unknown>) => ({ ...base, padding: "4px 8px", flexWrap: "nowrap" as const }),
  multiValue: (base: Record<string, unknown>) => ({ ...base, backgroundColor: "#EDE9FF", borderRadius: "4px" }),
  multiValueLabel: (base: Record<string, unknown>) => ({ ...base, color: "#5231FF", fontSize: "12px" }),
  multiValueRemove: (base: Record<string, unknown>) => ({ ...base, color: "#5231FF", ":hover": { backgroundColor: "#c4b5fd", color: "#3D1FE8" } }),
  option: (base: Record<string, unknown>, { isSelected, isFocused }: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    backgroundColor: isSelected ? "#5231FF" : isFocused ? "#f3f4f6" : "white",
    color: isSelected ? "white" : "#111118",
    fontSize: "13px", padding: "7px 12px", cursor: "pointer",
  }),
  menuList: (base: Record<string, unknown>) => ({ ...base, padding: "0", borderRadius: "8px" }),
  menu: (base: Record<string, unknown>) => ({ ...base, borderRadius: "8px", marginTop: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 60 }),
  indicatorsContainer: (base: Record<string, unknown>) => ({ ...base, padding: "0 4px" }),
};

const inlineStatusStyles = {
  ...selectStyles,
  control: (base: Record<string, unknown>) => ({
    ...base, border: "none", borderRadius: "6px", minHeight: "auto",
    fontSize: "12px", boxShadow: "none", minWidth: "155px", cursor: "pointer",
    "&:hover": { backgroundColor: "#f3f4f6" },
  }),
  valueContainer: (base: Record<string, unknown>) => ({ ...base, padding: "2px 6px" }),
  indicatorsContainer: (base: Record<string, unknown>) => ({ ...base, padding: "0 2px" }),
  singleValue: (base: Record<string, unknown>, state: { data: { value: TaskStatus } }) => {
    const s = STATUS_META[state.data.value];
    return { ...base, color: s.text, fontWeight: 600 };
  },
  dropdownIndicator: (base: Record<string, unknown>) => ({ ...base, padding: "0 2px", color: "#9ca3af" }),
  menu: (base: Record<string, unknown>) => ({ ...base, borderRadius: "8px", marginTop: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 60, minWidth: "180px" }),
};

type SortKey = "name" | "client" | "assigneeName" | "priority" | "hours" | "status" | "planDate" | "deadline";
type SortDir = "asc" | "desc";

const SORT_OPTIONS = [
  { value: "planDate:asc",   label: "Date (Oldest first)" },
  { value: "planDate:desc",  label: "Date (Newest first)" },
  { value: "deadline:asc",   label: "Deadline (Earliest first)" },
  { value: "deadline:desc",  label: "Deadline (Latest first)" },
  { value: "priority:asc",   label: "Priority (Highest first)" },
  { value: "priority:desc",  label: "Priority (Lowest first)" },
  { value: "name:asc",       label: "Name A–Z" },
  { value: "name:desc",      label: "Name Z–A" },
  { value: "hours:asc",      label: "Hours (Least first)" },
  { value: "hours:desc",     label: "Hours (Most first)" },
];

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER: Record<TaskStatus, number> = {
  "unassigned": 0, "assigned": 1, "work-in-progress": 2, "internal-review": 3,
  "internal-approved": 4, "client-review": 5, "client-approved": 6,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function saveTasks(tasks: FlatTask[], plans: StoredPlan[]) {
  const updated = plans.map((plan) => {
    // Rebuild distribution: reassign tasks to their new assignee bucket
    const newDist: Record<string, StoredTask[]> = {};

    // Initialise buckets for all existing members
    Object.keys(plan.distribution).forEach((mid) => { newDist[mid] = []; });

    // Place each task in the correct bucket based on current assignee
    Object.entries(plan.distribution).forEach(([, ptasks]) => {
      ptasks.forEach((t) => {
        const flat = tasks.find((ft) => ft.id === t.id);
        if (!flat) return;
        const targetId = flat.assigneeId ?? Object.keys(plan.distribution).find((mid) =>
          plan.distribution[mid].some((pt) => pt.id === t.id)
        ) ?? Object.keys(plan.distribution)[0];
        if (!newDist[targetId]) newDist[targetId] = [];
        newDist[targetId].push({ ...t, status: flat.status });
      });
    });

    return { ...plan, distribution: newDist };
  });
  localStorage.setItem("daily-plans", JSON.stringify(updated));
}

interface StoredTask {
  id: string; name: string; client: string; contentType: string;
  hours: number; priority: Priority; source: string; status?: TaskStatus;
  deadline?: string; campaign?: string;
  copy?: string; note?: string; notes?: string; references?: string[];
  parentTaskId?: string; designerName?: string;
  captionWriterId?: string; captionWriterName?: string;
}
interface StoredMember { id: string; name: string; designation: string; photo?: string; }
interface StoredPlan {
  id: string; date: string;
  distribution: Record<string, StoredTask[]>;
  members: StoredMember[];
}

// Build a lookup map from campaign item id → {copy, note, references}
function buildCampaignItemLookup(campaigns: StoredCampaign[]): Map<string, { copy?: string; note?: string; references?: string[] }> {
  const map = new Map<string, { copy?: string; note?: string; references?: string[] }>();
  campaigns.forEach((c) => {
    Object.values(c.items || {}).forEach((dayItems) => {
      (dayItems as any[]).forEach((item) => {
        map.set(item.id, { copy: item.caption, note: item.note, references: item.references });
      });
    });
  });
  return map;
}

function flattenPlans(plans: StoredPlan[], teamMembers: StoredMember[], campaignLookup?: Map<string, { copy?: string; note?: string; references?: string[] }>, memberPhotos: Record<string, string> = {}): FlatTask[] {
  const sorted = [...plans].sort((a, b) => a.date.localeCompare(b.date));

  // First pass: build a map of all tasks by id so caption tasks can look up their parent
  const allTasksById = new Map<string, { task: StoredTask; memberName: string }>();
  sorted.forEach((plan) => {
    Object.entries(plan.distribution).forEach(([memberId, tasks]) => {
      const planMember = plan.members.find((m) => m.id === memberId);
      const teamMember = teamMembers.find((m) => m.id === memberId);
      const name = planMember?.name ?? teamMember?.name ?? "";
      tasks.forEach((task) => allTasksById.set(task.id, { task, memberName: name }));
    });
  });

  const seen = new Map<string, FlatTask>();

  sorted.forEach((plan) => {
    Object.entries(plan.distribution).forEach(([memberId, tasks]) => {
      const planMember = plan.members.find((m) => m.id === memberId);
      const teamMember = teamMembers.find((m) => m.id === memberId);
      const photo = memberPhotos[memberId] ?? teamMember?.photo ?? planMember?.photo;
      tasks.forEach((task) => {
        const enriched = campaignLookup?.get(task.id);

        // For caption tasks missing fields, derive from parent task
        let parentCopy = task.copy;
        let parentNote = task.note || task.notes;
        let designerName = task.designerName;
        const parentId = task.parentTaskId ?? (task.id.startsWith("caption-") ? task.id.slice("caption-".length) : null);
        if (parentId && allTasksById.has(parentId)) {
          const parent = allTasksById.get(parentId)!;
          if (!parentCopy) parentCopy = parent.task.copy ?? campaignLookup?.get(parentId)?.copy;
          if (!parentNote) parentNote = (parent.task.note || parent.task.notes) ?? campaignLookup?.get(parentId)?.note;
          if (!designerName) designerName = parent.memberName;
        }

        const flat: FlatTask = {
          ...task,
          status: task.status ?? "unassigned",
          assigneeId: memberId,
          assigneeName: planMember?.name ?? teamMember?.name ?? "Unassigned",
          assigneePhoto: photo,
          planDate: plan.date,
          copy: parentCopy ?? enriched?.copy,
          note: parentNote ?? enriched?.note,
          references: (task.references && task.references.length > 0) ? task.references : enriched?.references,
          designerName,
          parentTaskId: task.parentTaskId ?? (task.id.startsWith("caption-") ? task.id.slice("caption-".length) : undefined),
          captionWriterId: task.captionWriterId,
          captionWriterName: task.captionWriterName,
        };
        seen.set(task.id, flat);
      });
    });
  });

  return Array.from(seen.values());
}

function flattenUnassignedCampaignTasks(campaigns: StoredCampaign[]): FlatTask[] {
  const tasks: FlatTask[] = [];
  const today = new Date().toISOString().slice(0, 10);

  campaigns.forEach((campaign) => {
    Object.entries(campaign.items || {}).forEach(([dateStr, items]) => {
      if (dateStr < today) return; // Only include future/today items
      (items as any[]).forEach((item) => {
        // Only include items that don't have a creator assigned
        if (!item.creator) {
          tasks.push({
            id: item.id,
            name: item.taskName || item.contentType,
            client: campaign.client,
            contentType: item.contentType,
            hours: parseFloat(item.hours) || 1,
            priority: (item.urgency || "medium") as Priority,
            source: campaign.campaignName,
            status: "unassigned",
            deadline: item.deadline || dateStr,
            campaign: campaign.campaignName,
            assigneeId: "unassigned",
            assigneeName: "Unassigned",
            planDate: dateStr,
            copy: item.caption,
            note: item.note,
            references: item.references,
          });
        }
      });
    });
  });

  return tasks;
}

const CONTENT_TYPE_OPTIONS = [
  "Google Ad Set","Post","Story","Paid Ad","Album","Animated Videos",
].map((v) => ({ value: v, label: v }));

const CLIENT_OPTIONS = [
  "Abans PLC","Xiaomi Sri Lanka","Moeka","Territory London","Madara Books","Sri Sri Madara",
].map((v) => ({ value: v, label: v }));

const PRIORITY_OPTIONS_FORM = (["urgent","high","medium","low"] as Priority[]).map((v) => ({
  value: v, label: v.charAt(0).toUpperCase() + v.slice(1),
}));

interface StoredCampaign {
  id: string; client: string; campaignName: string;
  items: Record<string, Array<{
    id: string; taskName?: string; contentType: string; quantity: string;
    hours: string; caption?: string; note?: string; urgency?: Priority; references?: string[];
  }>>;
}

const EMPTY_NEW_TASK = {
  name: "",
  contentType: null as { value: string; label: string } | null,
  client: null as { value: string; label: string } | null,
  campaign: null as { value: string; label: string } | null,
  assigneeId: null as { value: string; label: string } | null,
  hours: "1",
  priority: { value: "medium" as Priority, label: "Medium" },
  deadline: "",
  notes: "",
  references: [] as string[],
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, imgSrc, accent }: { label: string; value: number; imgSrc: string; accent: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border-[1.5px] p-5 flex items-center gap-4 ${accent}`}>
      <img src={imgSrc} alt={label} className="w-14 h-14 object-contain flex-shrink-0" />
      <div>
        <p className="text-3xl font-bold text-[var(--color-gray-900)] leading-none">{value}</p>
        <p className="text-xs font-semibold text-[var(--color-gray-500)] mt-1.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Creator Task Detail Panel ────────────────────────────────────────────────

const CREATOR_STATUS_FLOW: TaskStatus[] = ["assigned", "work-in-progress", "internal-review"];
const CREATOR_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  "work-in-progress": "Work in Progress",
  "internal-review": "In Internal Review",
};

// Client logo mapping
const CLIENT_LOGOS: Record<string, string> = {
  "Abans PLC":        "/images/client logos/abans plc.png",
  "Xiaomi Sri Lanka": "/images/client logos/xiaomi.png",
  "Moeka":            "/images/client logos/moeka.png",
  "Territory London": "/images/client logos/territory london.png",
  "Madara Books":     "/images/client logos/madara apps.png",
};

function ClientLogo({ client }: { client?: string }) {
  const src = client ? CLIENT_LOGOS[client] : undefined;
  const initials = client ? client.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
  if (src) {
    return (
      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
        <Image src={src} alt={client ?? ""} width={36} height={36} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-[#5231FF]">{initials}</span>
    </div>
  );
}

const CREATOR_STATUS_OPTIONS = CREATOR_STATUS_FLOW.map((v) => ({
  value: v,
  label: CREATOR_STATUS_LABELS[v],
}));

const creatorInlineStatusStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base, border: "none", borderRadius: "999px", minHeight: "auto",
    fontSize: "12px", boxShadow: "none", minWidth: "150px", cursor: "pointer",
    "&:hover": { opacity: 0.85 },
  }),
  valueContainer: (base: Record<string, unknown>) => ({ ...base, padding: "3px 10px" }),
  indicatorsContainer: (base: Record<string, unknown>) => ({ ...base, padding: "0 4px 0 0" }),
  dropdownIndicator: (base: Record<string, unknown>) => ({ ...base, padding: "0", color: "inherit", opacity: 0.6 }),
  indicatorSeparator: () => ({ display: "none" }),
  singleValue: (base: Record<string, unknown>) => ({ ...base, fontWeight: 600, color: "inherit" }),
  menu: (base: Record<string, unknown>) => ({ ...base, borderRadius: "10px", marginTop: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 60, minWidth: "180px" }),
  menuList: (base: Record<string, unknown>) => ({ ...base, padding: "4px" }),
  option: (base: Record<string, unknown>, { isSelected, isFocused }: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    backgroundColor: isSelected ? "#5231FF" : isFocused ? "#f3f4f6" : "white",
    color: isSelected ? "white" : "#111118",
    fontSize: "12px", padding: "7px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 500,
  }),
};

function CreatorTasksView() {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState<FlatTask[]>([]);
  const [plans, setPlans] = useState<StoredPlan[]>([]);
  const [mounted, setMounted] = useState(false);
  const memberPhotos = useMemberPhotos();
  const [selectedTask, setSelectedTask] = useState<FlatTask | null>(null);
  const [taskFeedback, setTaskFeedback] = useState<Record<string, { author: string; text: string; createdAt: string }[]>>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [parentArtwork, setParentArtwork] = useState<UploadedImage[]>([]);
  const [captionInput, setCaptionInput] = useState(""); // caption task writer input
  const [taskCaptions, setTaskCaptions] = useState<Record<string, { text: string }>>({}); // persisted captions
  // uploads: taskId → array of { name, dataUrl } — dataUrl is memory-only, not persisted
  const [uploads, setUploads] = useState<Record<string, { name: string; dataUrl: string }[]>>({});
  const [uploadMeta, setUploadMeta] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("today");

  useEffect(() => {
    setMounted(true);
    // Remove old-style caption-* duplicate tasks (same migration as manager view)
    const rawPlans: StoredPlan[] = JSON.parse(localStorage.getItem("daily-plans") || "[]");
    const migrated = rawPlans.map((plan) => {
      const newDist: Record<string, StoredTask[]> = {};
      const captionMeta = new Map<string, { writerId: string; writerName: string }>();
      Object.values(plan.distribution).forEach((tasks) => {
        (tasks as StoredTask[]).forEach((t) => {
          if (t.id.startsWith("caption-")) {
            const parentId = t.id.slice("caption-".length);
            captionMeta.set(parentId, {
              writerId: (t as any).assignedTo ?? (t as any).assigneeId ?? "",
              writerName: (t as any).assigneeName ?? "",
            });
          }
        });
      });
      const LEGACY_STATUS_MAP: Record<string, string> = {
        "caption-in-progress": "assigned",
        "caption-in-review": "internal-review",
        "caption-approved": "internal-approved",
      };
      Object.entries(plan.distribution).forEach(([mid, tasks]) => {
        newDist[mid] = (tasks as StoredTask[])
          .filter((t) => !t.id.startsWith("caption-"))
          .map((t) => {
            const meta = captionMeta.get(t.id);
            const newStatus = LEGACY_STATUS_MAP[(t.status as string) ?? ""] ?? t.status;
            const withStatus = newStatus !== t.status ? { ...t, status: newStatus as TaskStatus } : t;
            if (meta && !t.captionWriterId) return { ...withStatus, captionWriterId: meta.writerId, captionWriterName: meta.writerName };
            return withStatus;
          });
      });
      return { ...plan, distribution: newDist };
    });
    const needsSave = JSON.stringify(migrated) !== JSON.stringify(rawPlans);
    if (needsSave) localStorage.setItem("daily-plans", JSON.stringify(migrated));
    const stored = needsSave ? migrated : rawPlans;

    const members: StoredMember[] = JSON.parse(localStorage.getItem("team-members") || "[]");
    const campaigns: StoredCampaign[] = JSON.parse(localStorage.getItem("campaigns") || "[]");
    const lookup = buildCampaignItemLookup(campaigns);
    setPlans(stored);
    setAllTasks(flattenPlans(stored, members, lookup, memberPhotos));
    const savedMeta: Record<string, string[]> = JSON.parse(localStorage.getItem("task-upload-meta") || "{}");
    setUploadMeta(savedMeta);
    setTaskFeedback(JSON.parse(localStorage.getItem("task-feedback") || "{}"));
    setTaskCaptions(JSON.parse(localStorage.getItem("task-captions") || "{}"));
    // Load all persisted images from IndexedDB into uploads state
    const taskIds = Object.keys(savedMeta);
    if (taskIds.length > 0) {
      Promise.all(taskIds.map((id) => getTaskImages(id).then((imgs) => ({ id, imgs }))))
        .then((results) => {
          const restored: Record<string, { name: string; dataUrl: string }[]> = {};
          results.forEach(({ id, imgs }) => { if (imgs.length > 0) restored[id] = imgs; });
          setUploads((prev) => ({ ...prev, ...restored }));
        })
        .catch(() => {});
    }
    try { localStorage.removeItem("task-uploads"); } catch {}
  }, []);

  const myTasks = useMemo(() => {
    if (!user) return [];
    const name = user.name.toLowerCase();
    return allTasks.filter((t) =>
      t.assigneeName.toLowerCase() === name ||
      t.captionWriterName?.toLowerCase() === name
    );
  }, [allTasks, user]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const todayTasks = useMemo(() =>
    myTasks.filter((t) => t.planDate === todayStr),
    [myTasks, todayStr]
  );

  const upcomingTasks = useMemo(() =>
    myTasks.filter((t) => t.planDate > todayStr),
    [myTasks, todayStr]
  );

  const activeTasks = activeTab === "today" ? todayTasks : upcomingTasks;

  const filtered = useMemo(() => {
    if (!search) return activeTasks;
    const q = search.toLowerCase();
    return activeTasks.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      (t.client ?? "").toLowerCase().includes(q) ||
      t.contentType.toLowerCase().includes(q)
    );
  }, [activeTasks, search]);

  const urgentCount = todayTasks.filter((t) => t.priority === "urgent").length;

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const updated = allTasks.map((t) => t.id === taskId ? { ...t, status: newStatus } : t);
    setAllTasks(updated);
    saveTasks(updated, plans);
    if (selectedTask?.id === taskId) setSelectedTask((t) => t ? { ...t, status: newStatus } : t);

    // Fire notification to manager when creator submits for review
    if (newStatus === "internal-review") {
      const task = allTasks.find((t) => t.id === taskId);
      if (task) {
        const notif = {
          id: `notif-${Date.now()}`,
          type: "internal-review",
          taskId,
          taskName: task.name,
          client: task.client,
          assigneeName: task.captionWriterName && isWriterTask(task) ? task.captionWriterName : task.assigneeName,
          createdAt: new Date().toISOString(),
          read: false,
        };
        try {
          const existing = JSON.parse(localStorage.getItem("notifications") || "[]");
          localStorage.setItem("notifications", JSON.stringify([notif, ...existing]));
        } catch {}
      }
    }
  };

  const handleUpload = (taskId: string, files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const newEntry = { name: file.name, dataUrl };

        setUploads((prev) => {
          const updated = { ...prev, [taskId]: [...(prev[taskId] || []), newEntry] };
          // Persist to IndexedDB (all images for this task)
          saveTaskImages(taskId, updated[taskId]).catch(() => {});
          return updated;
        });
        setUploadMeta((prev) => {
          const next = { ...prev, [taskId]: [...(prev[taskId] || []), file.name] };
          try { localStorage.setItem("task-upload-meta", JSON.stringify(next)); } catch {}
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUpload = (taskId: string, idx: number) => {
    setUploads((prev) => {
      const updated = { ...prev, [taskId]: (prev[taskId] || []).filter((_, i) => i !== idx) };
      saveTaskImages(taskId, updated[taskId] || []).catch(() => {});
      return updated;
    });
    setUploadMeta((prev) => {
      const next = { ...prev, [taskId]: (prev[taskId] || []).filter((_, i) => i !== idx) };
      try { localStorage.setItem("task-upload-meta", JSON.stringify(next)); } catch {}
      return next;
    });
    removeTaskImage(taskId, idx).catch(() => {});
  };

  // True if the current user is the caption writer on this task
  function isCurrentUserWriter(task: FlatTask): boolean {
    if (!user) return false;
    return !!task.captionWriterId && task.captionWriterName?.toLowerCase() === user.name.toLowerCase();
  }

  // True when the current user is acting as writer (not designer)
  function isWriterTask(task: FlatTask): boolean {
    return isCurrentUserWriter(task);
  }

  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    const idx = CREATOR_STATUS_FLOW.indexOf(current);
    return idx >= 0 && idx < CREATOR_STATUS_FLOW.length - 1 ? CREATOR_STATUS_FLOW[idx + 1] : null;
  };

  async function openTask(task: FlatTask) {
    setSelectedTask(task);
    setParentArtwork([]);
    if (isCurrentUserWriter(task)) {
      // Writer sees the artwork uploaded by the designer (stored under same task id)
      const imgs = await getTaskImages(task.id).catch(() => [] as UploadedImage[]);
      setParentArtwork(imgs);
    } else if (task.parentTaskId) {
      // Old-style caption task: load artwork from parent
      const imgs = await getTaskImages(task.parentTaskId).catch(() => [] as UploadedImage[]);
      setParentArtwork(imgs);
    }
    const saved: Record<string, { text: string }> = JSON.parse(localStorage.getItem("task-captions") || "{}");
    setCaptionInput(saved[task.id]?.text ?? "");
  }

  if (!mounted) return null;

  return (
    <main className="flex-1">
      <div className="p-6">
        {/* Header */}
        <div className="mb-0">
          <h1 className="text-xl font-bold text-[var(--color-gray-900)]">My Tasks</h1>
          <p className="text-sm text-[var(--color-gray-500)] mt-1 mb-5">Tasks assigned to you across all plans.</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 mb-5">
          {/* Tab group — same style as Schedule page */}
          <div className="flex gap-1 bg-[var(--color-gray-100)] p-1 rounded-lg w-fit">
            {(["today", "upcoming"] as const).map((tab) => {
              const count = tab === "today" ? todayTasks.length : upcomingTasks.length;
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSearch(""); }}
                  className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-[var(--surface-elevated)] text-[var(--color-gray-900)] shadow-sm"
                      : "text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]"
                  }`}
                >
                  {tab === "today" ? "Today" : "Upcoming Tasks"}
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-[#5231FF] text-white" : "bg-[var(--color-gray-200)] text-[var(--color-gray-600)]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Urgent alert */}
          {activeTab === "today" && urgentCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
              <AlertCircle size={13} className="text-[#EF4444] shrink-0" />
              <span className="text-xs font-semibold text-[#EF4444]">{urgentCount} Urgent Task{urgentCount > 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Search — pushed right */}
          <div className="relative ml-auto w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-gray-400)]" />
            <input type="text" placeholder="Search tasks, clients…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-[var(--color-gray-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5231FF] focus:border-transparent bg-[var(--surface-input)]" />
          </div>
        </div>

        {/* Table */}
        {activeTasks.length === 0 ? (
          <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] p-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-gray-100)] flex items-center justify-center mx-auto mb-4">
              <ListTodo size={22} className="text-[var(--color-gray-400)]" />
            </div>
            <p className="text-base font-semibold text-[var(--color-gray-900)] mb-1">
              {activeTab === "today" ? "No tasks scheduled for today" : "No upcoming tasks"}
            </p>
            <p className="text-sm text-[var(--color-gray-500)]">Tasks assigned to you will appear here.</p>
          </div>
        ) : (
          <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            {/* Table header */}
            <div className="grid grid-cols-[2.5fr_1fr_1fr_100px_90px_160px_44px] gap-3 px-5 py-3 border-b border-[var(--color-gray-200)] bg-[var(--color-gray-50)] rounded-t-xl">
              {["TASK", "CONTENT TYPE", "DEADLINE", "HOURS", "PRIORITY", "STATUS", ""].map((h) => (
                <p key={h} className="text-[11px] font-semibold text-[var(--color-gray-500)] uppercase tracking-wide">{h}</p>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((task, idx) => {
              const sm = STATUS_META[task.status] ?? STATUS_META["assigned"];
              const pm = task.priority ? PRIORITY_META[task.priority] : null;
              const todayDate = new Date().toISOString().slice(0, 10);
              const isDueToday = task.deadline === todayDate;
              const isOverdue = task.deadline && task.deadline < todayDate && task.status !== "client-approved" && task.status !== "internal-approved";
              const taskUploads = uploads[task.id] || [];
              const taskUploadCount = (uploadMeta[task.id] || []).length || taskUploads.length;
              const currentOption = CREATOR_STATUS_OPTIONS.find((o) => o.value === task.status) ?? CREATOR_STATUS_OPTIONS[0];

              return (
                <div
                  key={task.id}
                  onClick={() => openTask(task)}
                  className={`grid grid-cols-[2.5fr_1fr_1fr_100px_90px_160px_44px] gap-3 px-5 py-3.5 items-center cursor-pointer hover:bg-[var(--color-gray-50)] transition-colors group ${idx < filtered.length - 1 ? "border-b border-[var(--color-gray-200)]" : "rounded-b-xl"}`}
                >
                  {/* Logo + Task name + client + campaign */}
                  <div className="flex items-center gap-3 min-w-0">
                    <ClientLogo client={task.client} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-gray-900)] truncate">{task.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {task.client && <span className="text-xs text-[var(--color-gray-500)] truncate">{task.client}</span>}
                        {task.campaign && (
                          <>
                            <span className="text-[var(--color-gray-300)]">·</span>
                            <span className="text-xs text-[var(--color-gray-400)] truncate">{task.campaign}</span>
                          </>
                        )}
                        {taskUploadCount > 0 && (
                          <span className="text-[10px] font-semibold text-[#5231FF] bg-[var(--color-primary-light)] px-1.5 py-0.5 rounded-full shrink-0">
                            {taskUploadCount} file{taskUploadCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {taskFeedback[task.id]?.length > 0 && task.status === "work-in-progress" && (
                          <span className="text-[10px] font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full shrink-0">
                            Feedback
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content Type */}
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--color-gray-100)] text-[var(--color-gray-700)] truncate max-w-fit">{task.contentType}</span>

                  {/* Deadline */}
                  <div>
                    {task.deadline ? (
                      <>
                        <p className={`text-sm font-medium flex items-center gap-1 ${isOverdue ? "text-[#EF4444]" : isDueToday ? "text-[#D97706]" : "text-[var(--color-gray-700)]"}`}>
                          <Calendar size={11} className="shrink-0" />
                          {new Date(task.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        {isOverdue && <p className="text-[10px] text-[#EF4444] flex items-center gap-0.5 mt-0.5"><AlertCircle size={10} /> Overdue</p>}
                        {isDueToday && <p className="text-[10px] text-[#D97706] flex items-center gap-0.5 mt-0.5"><AlertCircle size={10} /> Due today</p>}
                      </>
                    ) : (
                      <p className="text-sm text-[var(--color-gray-400)]">—</p>
                    )}
                  </div>

                  {/* Hours */}
                  <p className="text-sm text-[var(--color-gray-600)] flex items-center gap-1"><Clock size={12} />{task.hours}h</p>

                  {/* Priority */}
                  {pm ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full max-w-fit" style={{ background: pm.bg, color: pm.text }}>
                      {task.priority!.charAt(0).toUpperCase() + task.priority!.slice(1)}
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--color-gray-400)]">—</span>
                  )}

                  {/* Status dropdown */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      instanceId={`creator-status-${task.id}`}
                      value={currentOption}
                      options={CREATOR_STATUS_OPTIONS}
                      onChange={(opt) => opt && handleStatusChange(task.id, opt.value)}
                      styles={{
                        ...creatorInlineStatusStyles,
                        control: (base) => ({
                          ...creatorInlineStatusStyles.control(base),
                          backgroundColor: sm.bg,
                          color: sm.text,
                        }),
                        singleValue: (base) => ({ ...base, color: sm.text, fontWeight: 600, fontSize: "12px" }),
                        dropdownIndicator: (base) => ({ ...base, padding: "0", color: sm.text, opacity: 0.7 }),
                      }}
                      isSearchable={false}
                    />
                  </div>

                  {/* View button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openTask(task); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-gray-400)] group-hover:text-[#5231FF] group-hover:bg-[var(--color-primary-light)] transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Task Detail Panel ─────────────────────────────────────────────────── */}
      {selectedTask && (() => {
        const task = selectedTask;
        const sm = STATUS_META[task.status] ?? STATUS_META["assigned"];
        const nextStatus = getNextStatus(task.status);
        const taskUploads = uploads[task.id] || [];
        const isCaptionTask = isCurrentUserWriter(task);
        const _todayStr = new Date().toISOString().slice(0, 10);
        const isDueTodayPanel = task.deadline === _todayStr;
        const isOverdue = task.deadline && task.deadline < _todayStr && task.status !== "client-approved";

        return (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40" onClick={() => setSelectedTask(null)} />
            <div className="w-[520px] bg-[var(--surface-card)] h-full shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-gray-200)]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-gray-400)] mb-0.5">Task Detail</p>
                  <h3 className="text-base font-bold text-[var(--color-gray-900)] leading-tight">{task.name}</h3>
                </div>
                <button onClick={() => setSelectedTask(null)} className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:bg-[var(--color-gray-100)] transition-colors shrink-0 ml-3">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Status pill */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: sm.bg, color: sm.text }}>{sm.label}</span>
                  {isOverdue && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-[#EF4444]">Overdue</span>}
                  {!isOverdue && isDueTodayPanel && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-[#D97706]">Due Today</span>}
                </div>

                {/* Manager feedback banner — shown when task is sent back */}
                {taskFeedback[task.id]?.length > 0 && task.status === "work-in-progress" && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Design Feedback from Manager</p>
                    </div>
                    {taskFeedback[task.id].map((fb, i) => (
                      <p key={i} className="text-sm text-orange-900 leading-relaxed whitespace-pre-wrap">{fb.text}</p>
                    ))}
                  </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Content Type", value: task.contentType },
                    { label: "Hours", value: `${task.hours}h estimated` },
                    ...(task.client ? [{ label: "Client", value: task.client }] : []),
                    ...(task.deadline ? [{ label: "Deadline", value: new Date(task.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) }] : []),
                    ...(task.campaign ? [{ label: "Campaign", value: task.campaign }] : []),
                    ...(task.planDate ? [{ label: "Plan Date", value: new Date(task.planDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }] : []),
                  ].map((item) => (
                    <div key={item.label} className="bg-[var(--color-gray-50)] rounded-lg px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-gray-400)] mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-[var(--color-gray-900)]">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                {!isCaptionTask && <div className="border-t border-[var(--color-gray-200)]" />}

                {/* Artwork Copy — hidden for caption tasks (shown in their own section below) */}
                {!isCaptionTask && <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={13} className="text-[var(--color-gray-400)]" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">Artwork Copy</p>
                  </div>
                  {task.copy ? (
                    <p className="text-sm text-[var(--color-gray-800)] bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-lg px-4 py-3 leading-relaxed whitespace-pre-wrap">{task.copy}</p>
                  ) : (
                    <p className="text-sm text-[var(--color-gray-400)] bg-[var(--color-gray-50)] border border-dashed border-[var(--color-gray-200)] rounded-lg px-4 py-3 italic">No artwork copy provided.</p>
                  )}
                </div>}

                {/* Notes — hidden for caption tasks */}
                {!isCaptionTask && <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag size={13} className="text-[var(--color-gray-400)]" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">Notes</p>
                  </div>
                  {(task.note || task.notes) ? (
                    <p className="text-sm text-[var(--color-gray-800)] bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-lg px-4 py-3 leading-relaxed whitespace-pre-wrap">{task.note || task.notes}</p>
                  ) : (
                    <p className="text-sm text-[var(--color-gray-400)] bg-[var(--color-gray-50)] border border-dashed border-[var(--color-gray-200)] rounded-lg px-4 py-3 italic">No notes provided.</p>
                  )}
                </div>}

                {/* References — hidden for caption tasks */}
                {!isCaptionTask &&
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight size={13} className="text-[var(--color-gray-400)]" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">References</p>
                  </div>
                  {task.references && task.references.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {task.references.map((ref, i) => (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); setLightboxSrc(ref); }}
                          className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--color-gray-200)] group/ref hover:border-[#5231FF] transition-colors shrink-0"
                        >
                          {ref.startsWith("data:image") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ref} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[var(--color-gray-100)] flex items-center justify-center">
                              <FileText size={20} className="text-[var(--color-gray-400)]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/ref:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn size={16} className="text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-gray-400)] bg-[var(--color-gray-50)] border border-dashed border-[var(--color-gray-200)] rounded-lg px-4 py-3 italic">No references provided.</p>
                  )}
                </div>}

                {/* For caption tasks: show reference artwork from parent task */}
                {isCaptionTask && (
                  <div className="space-y-4">
                    <div className="border-t border-[var(--color-gray-200)]" />

                    {/* Designer info */}
                    {task.designerName && (
                      <div className="flex items-center gap-2.5 bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-xl px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-[#5231FF]">{task.designerName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--color-gray-900)]">{task.designerName}</p>
                          <p className="text-[11px] text-[var(--color-gray-500)]">Artwork Designer</p>
                        </div>
                      </div>
                    )}

                    {/* Artwork copy from original task */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-1.5 flex items-center gap-1.5">
                        <FileText size={12} /> Artwork Copy
                      </p>
                      {task.copy ? (
                        <p className="text-sm text-[var(--color-gray-800)] bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-lg px-4 py-3 leading-relaxed whitespace-pre-wrap">{task.copy}</p>
                      ) : (
                        <p className="text-sm text-[var(--color-gray-400)] bg-[var(--color-gray-50)] border border-dashed border-[var(--color-gray-200)] rounded-lg px-4 py-3 italic">No artwork copy provided.</p>
                      )}
                    </div>

                    {/* Notes from original task */}
                    {(task.note || task.notes) && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-1.5 flex items-center gap-1.5">
                          <Tag size={12} /> Notes
                        </p>
                        <p className="text-sm text-[var(--color-gray-800)] bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-lg px-4 py-3 leading-relaxed whitespace-pre-wrap">{task.note || task.notes}</p>
                      </div>
                    )}

                    {/* Reference artwork */}
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-2.5 flex items-center gap-1.5">
                      <FileImage size={12} /> Reference Artwork
                    </p>
                    {parentArtwork.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {parentArtwork.map((img, i) => (
                          <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setLightboxSrc(img.dataUrl); }}
                            className="relative aspect-square rounded-xl overflow-hidden border border-[var(--color-gray-200)] group/img hover:border-[#5231FF] transition-colors"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                              <ZoomIn size={18} className="text-white" />
                              <p className="text-[10px] text-white font-medium px-2 text-center truncate max-w-full">{img.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-gray-400)] italic bg-[var(--color-gray-50)] border border-dashed border-[var(--color-gray-200)] rounded-lg px-4 py-3 text-center">
                        Artwork not available — ask the designer to re-upload.
                      </p>
                    )}
                  </div>
                )}

                {/* Caption input — only for caption tasks */}
                {isCaptionTask && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-2 flex items-center gap-1.5">
                      <MessageSquare size={12} /> Your Caption
                    </p>
                    <textarea
                      rows={4}
                      value={captionInput}
                      onChange={(e) => {
                        setCaptionInput(e.target.value);
                        // Auto-save to localStorage
                        const saved: Record<string, { text: string }> = JSON.parse(localStorage.getItem("task-captions") || "{}");
                        saved[task.id] = { text: e.target.value };
                        localStorage.setItem("task-captions", JSON.stringify(saved));
                        setTaskCaptions(saved);
                      }}
                      placeholder="Write the caption for this artwork…"
                      className="w-full border border-[var(--color-gray-200)] rounded-xl px-4 py-3 text-sm text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none bg-[var(--surface-input)]"
                    />
                    <p className="text-[11px] text-[var(--color-gray-400)] mt-1.5">Caption is auto-saved. Change status to &quot;In Internal Review&quot; to submit to manager.</p>
                  </div>
                )}

                {/* File upload — hide for caption tasks */}
                {!isCaptionTask && <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-2">Upload Artwork / Video</p>
                  {taskUploads.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {taskUploads.map((file, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border border-[var(--color-gray-200)] bg-[var(--color-gray-50)]">
                          {file.dataUrl.startsWith("data:image") ? (
                            <div className="w-20 h-20">
                              <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-20 h-20 flex flex-col items-center justify-center gap-1 px-2">
                              <FileText size={18} className="text-[var(--color-gray-400)]" />
                              <p className="text-[9px] text-[var(--color-gray-500)] text-center leading-tight truncate w-full">{file.name}</p>
                            </div>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); removeUpload(task.id, i); }}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-gray-300)] rounded-xl p-6 cursor-pointer hover:border-[#5231FF] hover:bg-[var(--color-primary-light)] transition-colors group/up">
                    <Upload size={22} className="text-[var(--color-gray-400)] group-hover/up:text-[#5231FF] mb-2" />
                    <span className="text-sm font-medium text-[var(--color-gray-700)] group-hover/up:text-[#5231FF]">Click to upload files</span>
                    <span className="text-xs text-[var(--color-gray-400)] mt-1">Images, videos, PDFs</span>
                    <input type="file" multiple accept="image/*,video/*,.pdf" className="hidden"
                      onChange={(e) => e.target.files && handleUpload(task.id, e.target.files)} />
                  </label>
                </div>}
                {(() => {
                  const flow = CREATOR_STATUS_FLOW;
                  return (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-3">Status Progress</p>
                      <div className="flex items-center gap-0">
                        {flow.map((s, i) => {
                          const idx = flow.indexOf(task.status);
                          const isPast = i < idx;
                          const isCurrent = i === idx;
                          return (
                            <div key={s} className="flex items-center flex-1 last:flex-none">
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                                  isPast ? "bg-[#5231FF] border-[#5231FF] text-white"
                                  : isCurrent ? "bg-[#5231FF] border-[#5231FF] text-white shadow-[0_0_0_3px_rgba(82,49,255,0.2)]"
                                  : "bg-white border-[var(--color-gray-200)] text-[var(--color-gray-400)]"
                                }`}>
                                  {isPast ? "✓" : i + 1}
                                </div>
                                <p className={`text-[10px] font-semibold whitespace-nowrap ${isCurrent || isPast ? "text-[#5231FF]" : "text-[var(--color-gray-400)]"}`}>
                                  {STATUS_META[s]?.label ?? s}
                                </p>
                              </div>
                              {i < flow.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 mb-4 ${isPast || isCurrent ? "bg-[#5231FF]" : "bg-[var(--color-gray-200)]"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[var(--color-gray-200)]">
                {(() => {
                  const isWriter = isWriterTask(task);
                  const hasFiles = isWriter
                    ? (captionInput.trim().length > 0 || !!(taskCaptions[task.id]?.text))
                    : (uploads[task.id] || []).length > 0 || (uploadMeta[task.id] || []).length > 0;
                  if (nextStatus === "internal-review") return (
                    <>
                      <button
                        onClick={() => { if (hasFiles) handleStatusChange(task.id, "internal-review"); }}
                        disabled={!hasFiles}
                        className="w-full flex items-center justify-center gap-2 bg-[#5231FF] hover:bg-[#3D1FE8] text-white rounded-lg px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isWriter ? "Submit Caption for Review" : "Submit for Review"} <ArrowRight size={15} />
                      </button>
                      {!hasFiles && <p className="text-center text-xs text-[var(--color-gray-400)] mt-2">{isWriter ? "Write your caption above to enable submission" : "Upload artwork or video above to enable submission"}</p>}
                    </>
                  );
                  if (nextStatus) return (
                    <button onClick={() => handleStatusChange(task.id, nextStatus)}
                      className="w-full flex items-center justify-center gap-2 bg-[#5231FF] hover:bg-[#3D1FE8] text-white rounded-lg px-5 py-3 text-sm font-semibold transition-colors">
                      Mark as {STATUS_META[nextStatus]?.label ?? nextStatus} <ArrowRight size={15} />
                    </button>
                  );
                  return (
                    <div className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-lg px-5 py-3 text-sm font-semibold">
                      <CheckCircle2 size={15} /> {isWriter ? "Caption Submitted for Review" : "Submitted for Review"}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox modal for reference images */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80" onClick={() => setLightboxSrc(null)}>
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxSrc} alt="Reference" className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl" />
            <div className="flex items-center gap-3 mt-4">
              <a
                href={lightboxSrc}
                download={`reference-${Date.now()}.png`}
                className="inline-flex items-center gap-2 bg-white text-[var(--color-gray-900)] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={14} /> Download
              </a>
              <button
                onClick={() => setLightboxSrc(null)}
                className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors"
              >
                <X size={14} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ManagerTasksView() {
  const [allTasks, setAllTasks] = useState<FlatTask[]>([]);
  const [plans, setPlans] = useState<StoredPlan[]>([]);
  const [teamMembers, setTeamMembers] = useState<StoredMember[]>([]);
  const [mounted, setMounted] = useState(false);
  const memberPhotos = useMemberPhotos();

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<{ value: TaskStatus; label: string }[]>([]);
  const [filterPriority, setFilterPriority] = useState<{ value: Priority; label: string }[]>([]);
  const [filterAssignee, setFilterAssignee] = useState<{ value: string; label: string }[]>([]);
  const [filterClient, setFilterClient] = useState<{ value: string; label: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node))
        setShowSortMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("planDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<{ value: TaskStatus; label: string } | null>(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [newTask, setNewTask] = useState({ ...EMPTY_NEW_TASK });
  const [campaignOptions, setCampaignOptions] = useState<{ value: string; label: string }[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ taskId: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    // Migrate: remove old-style caption-* duplicate tasks and merge captionWriter fields back to parent
    const rawPlans: StoredPlan[] = JSON.parse(localStorage.getItem("daily-plans") || "[]");
    const migrated = rawPlans.map((plan) => {
      const newDist: Record<string, StoredTask[]> = {};
      // First pass: find all caption-* tasks to extract writer info for their parent
      const captionMeta = new Map<string, { writerId: string; writerName: string }>();
      Object.values(plan.distribution).forEach((tasks) => {
        (tasks as any[]).forEach((t) => {
          if (t.id.startsWith("caption-")) {
            const parentId = t.id.slice("caption-".length);
            captionMeta.set(parentId, {
              writerId: t.assignedTo ?? t.assigneeId ?? "",
              writerName: t.assigneeName ?? "",
            });
          }
        });
      });
      // Second pass: keep non-caption tasks, apply writer meta to parent
      Object.entries(plan.distribution).forEach(([mid, tasks]) => {
        newDist[mid] = (tasks as StoredTask[])
          .filter((t) => !t.id.startsWith("caption-"))
          .map((t) => {
            const meta = captionMeta.get(t.id);
            if (meta && !t.captionWriterId) {
              return { ...t, captionWriterId: meta.writerId, captionWriterName: meta.writerName };
            }
            return t;
          });
      });
      return { ...plan, distribution: newDist };
    });
    const needsSave = JSON.stringify(migrated) !== JSON.stringify(rawPlans);
    if (needsSave) localStorage.setItem("daily-plans", JSON.stringify(migrated));

    const stored = needsSave ? migrated : rawPlans;
    const members: StoredMember[] = JSON.parse(localStorage.getItem("team-members") || "[]");
    const campaigns: StoredCampaign[] = JSON.parse(localStorage.getItem("campaigns") || "[]");
    setPlans(stored);
    setTeamMembers(members);
    const lookup = buildCampaignItemLookup(campaigns);
    const planTasks = flattenPlans(stored, members, lookup, memberPhotos);
    const campaignTasks = flattenUnassignedCampaignTasks(campaigns);
    const deduped = new Map<string, FlatTask>();
    [...planTasks, ...campaignTasks].forEach((t) => {
      if (!deduped.has(t.id)) deduped.set(t.id, t);
    });
    setAllTasks(Array.from(deduped.values()));
    setCampaignOptions(campaigns.map((c) => ({ value: c.id, label: `${c.campaignName} — ${c.client}` })));
  }, []);

  const assigneeOptions = useMemo(() =>
    teamMembers.map((m) => ({ value: m.id, label: m.name, photo: memberPhotos[m.id] })),
  [teamMembers, memberPhotos]);

  const clientOptions = useMemo(() => {
    const clients = [...new Set(allTasks.map((t) => t.client))];
    return clients.map((c) => ({ value: c, label: c }));
  }, [allTasks]);

  const activeFilterCount = filterStatus.length + filterPriority.length + filterAssignee.length + filterClient.length;

  const filtered = useMemo(() => {
    let list = [...allTasks];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.client.toLowerCase().includes(q) ||
        t.assigneeName.toLowerCase().includes(q) ||
        t.contentType.toLowerCase().includes(q)
      );
    }
    if (filterStatus.length) list = list.filter((t) => filterStatus.some((f) => f.value === t.status));
    if (filterPriority.length) list = list.filter((t) => filterPriority.some((f) => f.value === t.priority));
    if (filterAssignee.length) list = list.filter((t) => filterAssignee.some((f) => f.value === t.assigneeName));
    if (filterClient.length) list = list.filter((t) => filterClient.some((f) => f.value === t.client));

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "priority") cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      else if (sortKey === "status") cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      else if (sortKey === "hours") cmp = a.hours - b.hours;
      else cmp = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [allTasks, search, filterStatus, filterPriority, filterAssignee, filterClient, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total: allTasks.length,
    inProgress: allTasks.filter((t) => t.status === "work-in-progress").length,
    overdue: allTasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "client-approved").length,
    done: allTasks.filter((t) => t.status === "client-approved").length,
  }), [allTasks]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    const updated = allTasks.map((t) => t.id === taskId ? { ...t, status } : t);
    setAllTasks(updated);
    saveTasks(updated, plans);
  };

  const handleAssigneeChange = (taskId: string, memberId: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;
    const updated = allTasks.map((t) =>
      t.id === taskId
        ? { ...t, assigneeId: memberId, assigneeName: member.name, assigneePhoto: memberPhotos[memberId] }
        : t
    );
    setAllTasks(updated);
    saveTasks(updated, plans);
  };

  const handleCaptionWriterChange = (taskId: string, memberId: string | null) => {
    const member = memberId ? teamMembers.find((m) => m.id === memberId) : null;
    const updated = allTasks.map((t) =>
      t.id === taskId
        ? { ...t, captionWriterId: member?.id ?? undefined, captionWriterName: member?.name ?? undefined }
        : t
    );
    setAllTasks(updated);
    // Persist captionWriter fields directly to localStorage plans
    const storedPlans: StoredPlan[] = JSON.parse(localStorage.getItem("daily-plans") || "[]");
    const patched = storedPlans.map((plan) => ({
      ...plan,
      distribution: Object.fromEntries(
        Object.entries(plan.distribution).map(([mid, tasks]) => [
          mid,
          (tasks as StoredTask[]).map((t) =>
            t.id === taskId
              ? { ...t, captionWriterId: member?.id ?? undefined, captionWriterName: member?.name ?? undefined }
              : t
          ),
        ])
      ),
    }));
    localStorage.setItem("daily-plans", JSON.stringify(patched));
    setPlans(patched as StoredPlan[]);
  };

  const handleAddTask = () => {
    if (!newTask.name || !newTask.contentType || !newTask.client) return;

    const taskId = `manual-${Date.now()}`;
    const deadline = newTask.deadline || undefined;
    const assigneeId = newTask.assigneeId?.value ?? "";
    const member = teamMembers.find((m) => m.id === assigneeId);

    // 1. Add to campaign plan if one is selected
    if (newTask.campaign) {
      const campaigns: StoredCampaign[] = JSON.parse(localStorage.getItem("campaigns") || "[]");
      const dateKey = deadline ?? new Date().toISOString().split("T")[0];
      const updated = campaigns.map((c) => {
        if (c.id !== newTask.campaign!.value) return c;
        const dayItems = c.items[dateKey] || [];
        return {
          ...c,
          items: {
            ...c.items,
            [dateKey]: [...dayItems, {
              id: taskId,
              taskName: newTask.name,
              contentType: newTask.contentType!.value,
              quantity: "1",
              hours: newTask.hours,
              caption: "",
              note: newTask.notes || "",
              urgency: newTask.priority.value,
              references: [],
            }],
          },
        };
      });
      localStorage.setItem("campaigns", JSON.stringify(updated));
    }

    // 2. Add to a daily plan for the deadline date (create one if none exists)
    const planDate = deadline ?? new Date().toISOString().split("T")[0];
    const storedPlans: StoredPlan[] = JSON.parse(localStorage.getItem("daily-plans") || "[]");
    const existingPlan = storedPlans.find((p) => p.date === planDate);
    const bucketKey = assigneeId || "unassigned";

    const storedTask: StoredTask = {
      id: taskId,
      name: newTask.name,
      client: newTask.client.value,
      contentType: newTask.contentType!.value,
      hours: parseFloat(newTask.hours) || 1,
      priority: newTask.priority.value,
      source: newTask.campaign ? (campaignOptions.find((o) => o.value === newTask.campaign?.value)?.label ?? "manual") : "manual",
      status: "work-in-progress",
      deadline,
      campaign: newTask.campaign?.label,
    };

    let updatedPlans: StoredPlan[];
    if (existingPlan) {
      updatedPlans = storedPlans.map((p) => {
        if (p.id !== existingPlan.id) return p;
        const dist = { ...p.distribution };
        dist[bucketKey] = [...(dist[bucketKey] || []), storedTask];
        const members = [...p.members];
        if (member && !members.find((m) => m.id === member.id)) {
          members.push({ id: member.id, name: member.name, designation: member.designation });
        }
        return { ...p, distribution: dist, members };
      });
    } else {
      const newPlan: StoredPlan = {
        id: `plan-${Date.now()}`,
        date: planDate,
        distribution: { [bucketKey]: [storedTask] },
        members: member ? [{ id: member.id, name: member.name, designation: member.designation }] : [],
      };
      updatedPlans = [...storedPlans, newPlan];
    }

    localStorage.setItem("daily-plans", JSON.stringify(updatedPlans));
    setPlans(updatedPlans);
    setAllTasks(flattenPlans(updatedPlans, teamMembers, undefined, memberPhotos));
    setShowAddDrawer(false);
    setNewTask({ ...EMPTY_NEW_TASK });
  };

  const handleBulkStatus = () => {
    if (!bulkStatus || selected.size === 0) return;
    const updated = allTasks.map((t) => selected.has(t.id) ? { ...t, status: bulkStatus.value } : t);
    setAllTasks(updated);
    saveTasks(updated, plans);
    setSelected(new Set());
    setBulkStatus(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.id)));
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = allTasks.filter((t) => t.id !== taskId);
    setAllTasks(updated);
    saveTasks(updated, plans);
    setDeleteConfirm(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-30" />;

  const thClass = "px-4 py-3 text-left text-xs font-semibold text-[var(--color-gray-500)] uppercase tracking-wide select-none";
  const thBtn = `${thClass} cursor-pointer hover:text-[var(--color-gray-900)] transition-colors`;

  if (!mounted) return null;

  return (
    <main className="flex-1">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-gray-900)]">Tasks</h1>
            <p className="text-sm text-[var(--color-gray-500)] mt-1">All tasks across published plans.</p>
          </div>
          <button
            onClick={() => setShowAddDrawer(true)}
            className="inline-flex items-center gap-2 bg-[#5231FF] text-white px-5 py-2.5 rounded-lg text-sm font-semibold  transition-colors"
          >
            <Plus size={15} /> Add Task
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Tasks"  value={stats.total}      imgSrc="/images/tasks/Total Tasks.png"  accent="bg-gradient-to-br from-violet-50 to-indigo-100 border-indigo-200" />
          <StatCard label="In Progress"  value={stats.inProgress} imgSrc="/images/tasks/In Progress.png"  accent="bg-gradient-to-br from-amber-50 to-orange-100 border-orange-200" />
          <StatCard label="Overdue"      value={stats.overdue}    imgSrc="/images/tasks/Overdue.png"      accent="bg-gradient-to-br from-rose-50 to-red-100 border-red-200" />
          <StatCard label="Completed"    value={stats.done}       imgSrc="/images/tasks/Completed.png"    accent="bg-gradient-to-br from-emerald-50 to-teal-100 border-teal-200" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* Search */}
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-gray-400)]" />
            <input
              type="text"
              placeholder="Search tasks, clients, assignees…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-gray-200)] rounded-lg text-sm text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-400)] focus:outline-none focus:ring-2 focus:ring-[#5231FF] focus:border-transparent bg-[var(--surface-input)]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-gray-400)] hover:text-[var(--color-gray-700)]">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sort + Filter */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu((v) => !v)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${sortKey !== "planDate" || sortDir !== "asc" ? "border-[#5231FF] text-[#5231FF] bg-[var(--color-primary-light)]" : "border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] hover:bg-[var(--color-gray-100)]"}`}
              >
                <ArrowUpDown size={14} />
                Sort: {({ planDate: "Date", deadline: "Deadline", priority: "Priority", name: "Name", hours: "Hours", assigneeName: "Assignee", client: "Client", status: "Status" } as Record<string, string>)[sortKey] ?? "Date"}
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 z-[100] bg-[var(--surface-card)] border border-[var(--color-gray-200)] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] overflow-hidden py-1 min-w-[220px]">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { const [k, d] = opt.value.split(":"); setSortKey(k as SortKey); setSortDir(d as SortDir); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${`${sortKey}:${sortDir}` === opt.value ? "bg-[var(--color-primary-light)] text-[#5231FF] font-semibold" : "text-[var(--color-gray-700)] hover:bg-[var(--color-gray-100)]"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${showFilters || activeFilterCount > 0 ? "border-[#5231FF] text-[#5231FF] bg-[var(--color-primary-light)]" : "border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] hover:bg-[var(--color-gray-100)]"}`}
            >
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#5231FF] text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* Bulk action */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto bg-[var(--color-primary-light)] border border-[#5231FF]/20 px-3 py-1.5 rounded-lg">
              <span className="text-sm font-semibold text-[#5231FF]">{selected.size} selected</span>
              <div className="w-px h-4 bg-[#5231FF]/20" />
              <Select
                instanceId="bulk-status"
                value={bulkStatus}
                onChange={(v) => setBulkStatus(v)}
                options={STATUS_OPTIONS}
                styles={selectStyles}
                placeholder="Change status…"
                isSearchable={false}
              />
              <button
                onClick={handleBulkStatus}
                disabled={!bulkStatus}
                className="px-3 py-1.5 rounded-lg bg-[#5231FF] text-white text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                Apply
              </button>
              <button onClick={() => setSelected(new Set())} className="text-[var(--color-gray-400)] hover:text-[var(--color-gray-700)]">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-xl p-4 mb-4 grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Status</label>
              <Select instanceId="f-status" isMulti value={filterStatus} onChange={(v) => setFilterStatus(v as typeof filterStatus)} options={STATUS_OPTIONS} styles={selectStyles} placeholder="All statuses" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Priority</label>
              <Select instanceId="f-priority" isMulti value={filterPriority} onChange={(v) => setFilterPriority(v as typeof filterPriority)} options={PRIORITY_OPTIONS} styles={selectStyles} placeholder="All priorities" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Assignee</label>
              <Select instanceId="f-assignee" isMulti value={filterAssignee} onChange={(v) => setFilterAssignee(v as typeof filterAssignee)} options={assigneeOptions} styles={selectStyles} placeholder="All members" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Client</label>
              <Select instanceId="f-client" isMulti value={filterClient} onChange={(v) => setFilterClient(v as typeof filterClient)} options={clientOptions} styles={selectStyles} placeholder="All clients" />
            </div>
            {activeFilterCount > 0 && (
              <div className="col-span-4 flex justify-end">
                <button
                  onClick={() => { setFilterStatus([]); setFilterPriority([]); setFilterAssignee([]); setFilterClient([]); }}
                  className="text-xs text-[var(--color-danger)] hover:underline font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {allTasks.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-gray-100)] flex items-center justify-center mx-auto mb-4">
                <ListTodo size={22} className="text-[var(--color-gray-400)]" />
              </div>
              <p className="text-base font-semibold text-[var(--color-gray-900)] mb-1">No tasks yet</p>
              <p className="text-sm text-[var(--color-gray-500)]">Publish a daily plan to see tasks here.</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-[var(--color-gray-50)] border-b border-[var(--color-gray-200)]">
                  <tr>
                    <th className={thClass} style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-[var(--color-gray-300)] accent-[#5231FF]"
                      />
                    </th>
                    <th className={thBtn} onClick={() => handleSort("name")}>
                      <span className="flex items-center gap-1">Task <SortIcon k="name" /></span>
                    </th>
                    <th className={thBtn} onClick={() => handleSort("client")}>
                      <span className="flex items-center gap-1">Client <SortIcon k="client" /></span>
                    </th>
                    <th className={thBtn} onClick={() => handleSort("assigneeName")}>
                      <span className="flex items-center gap-1">Assignee <SortIcon k="assigneeName" /></span>
                    </th>
                    <th className={thClass}>
                      <span className="flex items-center gap-1">Caption Writer</span>
                    </th>
                    <th className={thBtn} onClick={() => handleSort("priority")}>
                      <span className="flex items-center gap-1">Priority <SortIcon k="priority" /></span>
                    </th>
                    <th className={thBtn} onClick={() => handleSort("hours")}>
                      <span className="flex items-center gap-1">Hours <SortIcon k="hours" /></span>
                    </th>
                    <th className={thBtn} onClick={() => handleSort("deadline")}>
                      <span className="flex items-center gap-1">Deadline <SortIcon k="deadline" /></span>
                    </th>
                    <th className={thBtn} onClick={() => handleSort("status")}>
                      <span className="flex items-center gap-1">Status <SortIcon k="status" /></span>
                    </th>
                    <th className={thClass} style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-gray-100)]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-sm text-[var(--color-gray-400)]">
                        No tasks match your filters.
                      </td>
                    </tr>
                  ) : filtered.map((task) => {
                    const pm = PRIORITY_META[task.priority];
                    const sm = STATUS_META[task.status];
                    const isSelected = selected.has(task.id);
                    const _today = new Date().toISOString().slice(0, 10);
                    const isOverdue = task.deadline && task.deadline < _today && task.status !== "client-approved";
                    const isDueTodayRow = task.deadline === _today;

                    const firstName = (name: string) => name.split(" ")[0];
                    const isClientApproved = task.status === "client-approved";

                    // Shared avatar+firstName renderer for member columns
                    const MemberChip = ({ memberId, name, locked }: { memberId: string; name: string; locked?: boolean }) => {
                      const ini = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                      const photo = memberPhotos[memberId];
                      return (
                        <div className={`flex items-center gap-1.5 ${locked ? "px-1.5 py-0.5 rounded-lg bg-green-50" : ""}`}>
                          {locked && <CheckCircle2 size={12} className="text-[#10B981] shrink-0" />}
                          {photo ? (
                            <img src={photo} alt={name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[#5231FF] flex items-center justify-center text-white text-[9px] font-bold shrink-0">{ini}</div>
                          )}
                          <span className="text-sm font-medium text-[var(--color-gray-700)]">{firstName(name)}</span>
                        </div>
                      );
                    };

                    // Shared inline Select styles for narrow member columns
                    const memberSelectStyles = {
                      ...inlineStatusStyles,
                      control: (base: Record<string, unknown>) => ({
                        ...base, border: "none", borderRadius: "6px", minHeight: "auto",
                        fontSize: "13px", boxShadow: "none", minWidth: "150px", cursor: "pointer",
                        "&:hover": { backgroundColor: "#f3f4f6" },
                      }),
                      singleValue: (base: Record<string, unknown>) => ({ ...base, color: "var(--color-gray-700)", fontWeight: 500 }),
                      clearIndicator: (base: Record<string, unknown>) => ({ ...base, padding: "0 2px", color: "#9ca3af", "&:hover": { color: "#6b7280" } }),
                    };

                    // formatOptionLabel receives (option, { context }) — "value" = inside control, "menu" = in dropdown
                    const memberFormatLabel = (opt: { value: string; label: string; photo?: string }, meta: { context: string }) => {
                      const ini = opt.label.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                      const photo = memberPhotos[opt.value] ?? opt.photo;
                      const avatar = photo
                        ? <img src={photo} alt={opt.label} className="w-5 h-5 rounded-full object-cover shrink-0" />
                        : <div className="w-5 h-5 rounded-full bg-[#5231FF] flex items-center justify-center text-white text-[9px] font-bold shrink-0">{ini}</div>;
                      if (meta.context === "value") {
                        // Compact: avatar + name, no extra padding
                        return <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>{avatar}<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firstName(opt.label)}</span></div>;
                      }
                      return <div className="flex items-center gap-2">{avatar}<span className="truncate">{firstName(opt.label)}</span></div>;
                    };

                    return (
                      <tr key={task.id} className={`group transition-colors ${isClientApproved ? "bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100" : isSelected ? "bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-light)]" : "hover:bg-[var(--color-gray-50)]"}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(task.id)}
                            className="rounded border-[var(--color-gray-300)] accent-[#5231FF]"
                          />
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="text-sm font-semibold text-[var(--color-gray-900)] truncate">{task.name}</p>
                          <p className="text-xs text-[var(--color-gray-500)] truncate">{task.contentType}{task.campaign ? ` · ${task.campaign}` : ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[var(--color-gray-700)]">{task.client}</span>
                        </td>

                        {/* Assignee — locked when caption writer assigned */}
                        <td className="px-3 py-3" style={{ width: 180 }}>
                          {task.captionWriterId ? (
                            <MemberChip memberId={task.assigneeId} name={task.assigneeName} locked />
                          ) : (
                            <Select
                              instanceId={`assignee-${task.id}`}
                              value={assigneeOptions.find((o) => o.value === task.assigneeId) ?? null}
                              onChange={(v) => v && handleAssigneeChange(task.id, v.value)}
                              options={assigneeOptions}
                              styles={memberSelectStyles}
                              isSearchable={false}
                              formatOptionLabel={memberFormatLabel}
                            />
                          )}
                        </td>

                        {/* Caption Writer — editable dropdown */}
                        <td className="px-3 py-3" style={{ width: 130 }}>
                          <Select
                            instanceId={`caption-writer-${task.id}`}
                            value={task.captionWriterId ? (assigneeOptions.find((o) => o.value === task.captionWriterId) ?? null) : null}
                            onChange={(v) => handleCaptionWriterChange(task.id, v?.value ?? null)}
                            options={assigneeOptions}
                            styles={{
                              ...memberSelectStyles,
                              placeholder: (base: Record<string, unknown>) => ({ ...base, color: "#d1d5db", fontSize: "13px" }),
                            }}
                            isSearchable={false}
                            placeholder="—"
                            formatOptionLabel={memberFormatLabel}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: pm.bg, color: pm.text }}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[var(--color-gray-700)] flex items-center gap-1">
                            <Clock size={12} className="text-[var(--color-gray-400)]" />{task.hours}h
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {task.deadline ? (
                            <div>
                              <p className={`text-xs font-normal ${isOverdue ? "text-[var(--color-danger)]" : isDueTodayRow ? "text-[#D97706]" : "text-[var(--color-gray-600)]"}`}>
                                {new Date(task.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                              {isOverdue && (
                                <p className="text-[10px] font-semibold text-[var(--color-danger)] flex items-center gap-0.5 mt-0.5">
                                  <AlertCircle size={10} /> Overdue
                                </p>
                              )}
                              {!isOverdue && isDueTodayRow && (
                                <p className="text-[10px] font-semibold text-[#D97706] flex items-center gap-0.5 mt-0.5">
                                  <AlertCircle size={10} /> Due today
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-gray-400)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="inline-flex items-center rounded-lg" style={{ background: sm.bg }}>
                            <Select
                              instanceId={`status-${task.id}`}
                              value={STATUS_OPTIONS.find((o) => o.value === task.status)}
                              onChange={(v) => v && handleStatusChange(task.id, v.value)}
                              options={STATUS_OPTIONS}
                              styles={inlineStatusStyles}
                              isSearchable={false}
                            />
                          </div>
                        </td>
                        <td className="px-1 py-3 text-right" style={{ width: 36 }}>
                          <button
                            onClick={() => setDeleteConfirm({ taskId: task.id })}
                            className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:text-[#EF4444] hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-[var(--color-gray-100)] flex items-center justify-between">
                <p className="text-xs text-[var(--color-gray-500)]">
                  Showing <strong>{filtered.length}</strong> of <strong>{allTasks.length}</strong> tasks
                </p>
                {selected.size > 0 && (
                  <p className="text-xs text-[#5231FF] font-medium">{selected.size} selected</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Task Drawer */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowAddDrawer(false)} />
          <div className="w-[480px] bg-[var(--surface-card)] h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-gray-200)]">
              <h3 className="text-base font-bold text-[var(--color-gray-900)]">Add Task</h3>
              <button onClick={() => setShowAddDrawer(false)} className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:bg-[var(--color-gray-100)] transition-colors"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Task Name */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Task Name <span className="text-[#EF4444]">*</span></label>
                <input type="text" placeholder="e.g. Xiaomi Banner Design" value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className="w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2 text-sm text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-500)] focus:outline-none focus:ring-2 focus:ring-[#5231FF] focus:border-transparent bg-[var(--surface-input)]" />
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Content Type <span className="text-[#EF4444]">*</span></label>
                <Select instanceId="nt-type" value={newTask.contentType} onChange={(v) => setNewTask({ ...newTask, contentType: v })} options={CONTENT_TYPE_OPTIONS} styles={selectStyles} placeholder="Select content type…" />
              </div>

              {/* Client */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Client <span className="text-[#EF4444]">*</span></label>
                <CreatableSelect instanceId="nt-client" value={newTask.client} onChange={(v) => setNewTask({ ...newTask, client: v ?? null })} options={CLIENT_OPTIONS} styles={selectStyles} placeholder="Select or type a new client…" formatCreateLabel={(i) => `Add "${i}"`} isSearchable />
              </div>

              {/* Campaign */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Campaign <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <Select instanceId="nt-campaign" value={newTask.campaign} onChange={(v) => setNewTask({ ...newTask, campaign: v ?? null })} options={campaignOptions} styles={selectStyles} placeholder="Link to an existing campaign…" isClearable />
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Assignee <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <Select
                  instanceId="nt-assignee"
                  value={newTask.assigneeId}
                  onChange={(v) => setNewTask({ ...newTask, assigneeId: v ?? null })}
                  options={assigneeOptions.map((o) => ({ value: o.value, label: o.label }))}
                  styles={selectStyles}
                  placeholder="Select assignee…"
                  isClearable
                  formatOptionLabel={(opt: { value: string; label: string }) => {
                    const photo = memberPhotos[opt.value];
                    const ini = opt.label.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <div className="flex items-center gap-2">
                        {photo ? (
                          <img src={photo} alt={opt.label} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#5231FF] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">{ini}</div>
                        )}
                        <span>{opt.label}</span>
                      </div>
                    );
                  }}
                />
              </div>

              {/* Hours + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Estimated Hours</label>
                  <input type="number" min="0.5" max="16" step="0.5" value={newTask.hours} onChange={(e) => setNewTask({ ...newTask, hours: e.target.value })}
                    className="w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2 text-sm text-[var(--color-gray-900)] focus:outline-none focus:ring-2 focus:ring-[#5231FF] focus:border-transparent bg-[var(--surface-input)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Priority</label>
                  <Select instanceId="nt-priority" value={newTask.priority} onChange={(v) => v && setNewTask({ ...newTask, priority: v as { value: Priority; label: string } })} options={PRIORITY_OPTIONS_FORM} styles={selectStyles} isSearchable={false} />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Deadline <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <input type="date" value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  className="w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2 text-sm text-[var(--color-gray-900)] focus:outline-none focus:ring-2 focus:ring-[#5231FF] focus:border-transparent bg-[var(--surface-input)]" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-gray-700)] mb-1.5">Notes <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <textarea rows={3} placeholder="Any notes for the team…" value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  className="w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2 text-sm text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-500)] focus:outline-none focus:ring-2 focus:ring-[#5231FF] focus:border-transparent bg-[var(--surface-input)] resize-none" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--color-gray-200)] flex gap-3 justify-end">
              <button onClick={() => { setShowAddDrawer(false); setNewTask({ ...EMPTY_NEW_TASK }); }}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--color-gray-700)] border border-[var(--color-gray-200)] bg-[var(--surface-card)] hover:bg-[var(--color-gray-100)] transition-colors">
                Cancel
              </button>
              <button onClick={handleAddTask} disabled={!newTask.name || !newTask.contentType || !newTask.client}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#5231FF]  disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--color-gray-200)] shadow-lg p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertCircle size={20} className="text-[#EF4444]" />
              </div>
              <h3 className="text-base font-bold text-[var(--color-gray-900)]">Delete Task</h3>
            </div>
            <p className="text-sm text-[var(--color-gray-600)] mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-[var(--color-gray-700)] border border-[var(--color-gray-200)] bg-[var(--surface-card)] hover:bg-[var(--color-gray-100)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTask(deleteConfirm.taskId)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#EF4444] hover:bg-red-600 transition-colors"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  if (user?.role === "writer" || user?.role === "designer") return <CreatorTasksView />;
  return <ManagerTasksView />;
}
