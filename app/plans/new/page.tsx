'use client';

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Upload, X, ChevronLeft, ChevronRight, Check, Trash2, Minus } from "lucide-react";
import Select from "react-select";
import Papa from "papaparse";
import {
  format, addDays, eachDayOfInterval, isWithinInterval,
  isSameDay, addMonths, subMonths, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, isBefore, isAfter, isToday, parseISO,
} from "date-fns";

const CLIENTS = ["Abans PLC","Xiaomi Sri Lanka","Moeka","Territory London","Madara Books","Sri Sri Madara"];
const CONTENT_TYPES = ["Google Ad Set","Post","Story","Paid Ad","Album","Animated Videos"];
const CONTENT_TYPE_COLORS: Record<string, string> = {
  "Google Ad Set":   "bg-blue-100 text-blue-700",
  "Post":            "bg-purple-100 text-purple-700",
  "Story":           "bg-pink-100 text-pink-700",
  "Paid Ad":         "bg-orange-100 text-orange-700",
  "Album":           "bg-green-100 text-green-700",
  "Animated Videos": "bg-amber-100 text-amber-700",
};
const STEPS = ["Plan Details","Import CSV","Calendar Plan"];

const PREDEFINED_HOURS: Record<string, number> = {
  "Post": 1, "Story": 1, "Google Ad Set": 3,
  "Album": 1, "Animated Videos": 5, "Paid Ad": 2,
};

interface DateRangeState { startDate: Date; endDate: Date; key: string; }
type Urgency = "urgent" | "high" | "medium" | "low";

interface DayItem {
  id: string; taskName: string; contentType: string; quantity: string;
  hours: string; caption: string; note: string;
  urgency?: Urgency;
  references: string[];
  linkedType?: string;
  creator?: string;
  deadline?: string;
}
type CalendarData = Record<string, DayItem[]>;

interface DrawerForm {
  taskName: string;
  contentType: { value: string; label: string } | null;
  quantity: string; hours: string; hoursManual: boolean;
  deadline: string;
  urgency: { value: Urgency; label: string } | null;
  caption: string; note: string;
  creator: { value: string; label: string } | null;
  references: string[];
  addAnother: boolean; createLinked: boolean;
}

const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const URGENCY_COLORS: Record<Urgency, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-500",
};

const selectStyles = (compact = false) => ({
  control: (base: any) => ({
    ...base, borderColor: "var(--color-gray-200)", borderRadius: "8px",
    minHeight: "auto", fontSize: compact ? "13px" : "14px", boxShadow: "none",
    "&:hover": { borderColor: "#9ca3af" },
    "&:focus-within": { borderColor: "var(--color-primary)", boxShadow: "0 0 0 2px rgba(82,49,255,0.12)" },
  }),
  input: (base: any) => ({ ...base, padding: compact ? "4px 6px" : "6px 8px", margin: "2px", fontSize: compact ? "13px" : "14px" }),
  option: (base: any, { isSelected, isFocused }: any) => ({
    ...base,
    backgroundColor: isSelected ? "#5231FF" : isFocused ? "#f3f4f6" : "white",
    color: isSelected ? "white" : "#111118",
    fontSize: compact ? "13px" : "14px", padding: "8px 12px", cursor: "pointer",
  }),
  menuList: (base: any) => ({ ...base, padding: "0", borderRadius: "8px" }),
  menu: (base: any) => ({ ...base, borderRadius: "8px", marginTop: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 60 }),
});

export default function CreateCampaignPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [step, setStep] = useState(1);

  // Step 1
  const [client, setClient] = useState<{ value: string; label: string } | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeState>({ startDate: new Date(), endDate: new Date(), key: "selection" });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(startOfMonth(new Date()));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [pickingStart, setPickingStart] = useState(true);
  const [notes, setNotes] = useState("");

  // Step 2
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [csvItems, setCsvItems] = useState<{ id: string; contentType: string; quantity: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 calendar
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; designation?: string; photo?: string }[]>([]);

  // Drawer
  const [drawerDay, setDrawerDay] = useState<Date | null>(null);
  const [drawerMode, setDrawerMode] = useState<"view" | "form">("view");
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const emptyForm: DrawerForm = { taskName: "", contentType: null, quantity: "1", hours: "", hoursManual: false, deadline: "", urgency: { value: "medium", label: "Medium" }, caption: "", note: "", creator: null, references: [], addAnother: false, createLinked: false };
  const [form, setForm] = useState<DrawerForm>(emptyForm);
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ dateKey: string; itemId: string } | null>(null);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const minDate = new Date(today.getFullYear(), 0, 1);

  // Load team members
  useEffect(() => {
    try {
      const members = JSON.parse(localStorage.getItem("team-members") || "[]");
      console.log("[DEBUG] Loaded team members:", members);
      setTeamMembers(members);
    } catch {}
  }, []);

  // Load campaign for edit mode
  useEffect(() => {
    if (!editId) return;
    try {
      const campaigns = JSON.parse(localStorage.getItem("campaigns") || "[]");
      const found = campaigns.find((c: any) => c.id === editId);
      if (found) {
        setClient(found.client ? { value: found.client, label: found.client } : null);
        setCampaignName(found.campaignName || "");
        setNotes(found.notes || "");
        const sd = parseISO(found.startDate);
        const ed = parseISO(found.endDate);
        setDateRange({ startDate: sd, endDate: ed, key: "selection" });
        setPickerMonth(startOfMonth(sd));
        setCalendarData(found.items || {});
        setCurrentMonth(startOfMonth(sd));
        setStep(3);
      }
    } catch {}
  }, [editId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node))
        setShowDatePicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file.name);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const items = (res.data as any[])
          .map((row) => ({ id: crypto.randomUUID(), contentType: row["Content Type"] || row.contentType || "", quantity: String(row.Quantity || row.quantity || "") }))
          .filter((i) => i.contentType);
        setCsvItems(items);
      },
      error: () => setUploadedFile(null),
    });
    e.target.value = "";
  };

  const autoHours = (type: string, qty: string) => {
    const base = PREDEFINED_HOURS[type];
    if (!base) return "";
    return String(base * (parseInt(qty) || 1));
  };

  const openDrawer = (day: Date, mode: "view" | "form" = "view", itemId?: string) => {
    setDrawerDay(day);
    setSuccessMsg("");
    if (itemId) {
      const key = format(day, "yyyy-MM-dd");
      const item = (calendarData[key] || []).find((i) => i.id === itemId);
      if (item) {
        setEditItemId(itemId);
        setDrawerMode("form");
        const urg: { value: Urgency; label: string } = item.urgency ? { value: item.urgency as Urgency, label: item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1) } : { value: "medium" as Urgency, label: "Medium" };
        setForm({ taskName: item.taskName || "", contentType: { value: item.contentType, label: item.contentType }, quantity: item.quantity, hours: item.hours, hoursManual: true, deadline: item.deadline || "", urgency: urg, caption: item.caption, note: item.note, creator: item.creator ? { value: item.creator, label: item.creator } : null, references: item.references || [], addAnother: false, createLinked: !!item.linkedType });
        return;
      }
    }
    setEditItemId(null);
    setDrawerMode(mode);
    setForm(emptyForm);
  };

  const closeDrawer = () => { setDrawerDay(null); setEditItemId(null); setDrawerMode("view"); setForm(emptyForm); setSuccessMsg(""); };

  const saveDrawerItem = () => {
    if (!drawerDay || !form.contentType) return;
    const key = format(drawerDay, "yyyy-MM-dd");
    const type = form.contentType.value;
    const items: DayItem[] = [];

    const linkedType = form.createLinked ? (type === "Post" ? "Story" : "Post") : undefined;
    const base: DayItem = {
      id: editItemId || crypto.randomUUID(),
      taskName: form.taskName,
      contentType: type,
      quantity: form.quantity || "1",
      hours: form.hours || autoHours(type, form.quantity),
      urgency: form.urgency?.value,
      caption: form.caption,
      note: form.note,
      creator: form.creator?.value,
      deadline: form.deadline || undefined,
      references: form.references,
      linkedType,
    };
    console.log("[DEBUG] Saving item:", base.taskName, "Creator:", base.creator);
    items.push(base);

    setCalendarData((prev) => {
      const existing = prev[key] || [];
      if (editItemId) return { ...prev, [key]: existing.map((i) => i.id === editItemId ? base : i) };
      return { ...prev, [key]: [...existing, ...items] };
    });

    setSuccessMsg(`${items.map((i) => i.contentType).join(" + ")} added for ${format(drawerDay, "MMM d")}`);
    setTimeout(() => setSuccessMsg(""), 3000);

    if (form.addAnother) {
      setEditItemId(null);
      setForm({ ...emptyForm, addAnother: true });
    } else {
      setEditItemId(null);
      setDrawerMode("view");
      setForm(emptyForm);
    }
  };

  const removeItem = (dateKey: string, id: string) => {
    setCalendarData((prev) => ({ ...prev, [dateKey]: (prev[dateKey] || []).filter((i) => i.id !== id) }));
  };

  const addCsvItemToDay = (day: Date, csvItem: typeof csvItems[0]) => {
    const key = format(day, "yyyy-MM-dd");
    const item: DayItem = { id: crypto.randomUUID(), taskName: "", contentType: csvItem.contentType, quantity: csvItem.quantity, hours: autoHours(csvItem.contentType, csvItem.quantity), urgency: "medium", caption: "", note: "", references: [] };
    setCalendarData((prev) => ({ ...prev, [key]: [...(prev[key] || []), item] }));
  };

  const isInRange = (d: Date) => isWithinInterval(d, { start: dateRange.startDate, end: dateRange.endDate });

  const saveCampaign = () => {
    console.log("[DEBUG] Saving campaign with calendarData:", calendarData);
    const existing: any[] = JSON.parse(localStorage.getItem("campaigns") || "[]");
    const name = campaignName || `Campaign ${format(new Date(), "MMM yyyy")}`;

    // Convert campaign items into daily tasks
    const syncTasksToDaily = () => {
      const dailyPlans: any[] = JSON.parse(localStorage.getItem("daily-plans") || "[]");
      const teamMembers: any[] = JSON.parse(localStorage.getItem("team-members") || "[]");

      Object.entries(calendarData).forEach(([dateStr, items]: [string, any]) => {
        // Filter items that have a creator assigned
        const assignedItems = (items as any[]).filter((item) => item.creator);

        if (assignedItems.length === 0) return;

        // Find or create daily plan for this date
        let plan = dailyPlans.find((p) => p.date === dateStr);
        if (!plan) {
          plan = { id: `plan-${dateStr}`, date: dateStr, distribution: {}, members: [] };
          dailyPlans.push(plan);
        }

        // Add tasks to the assigned member's bucket
        assignedItems.forEach((item) => {
          const creatorId = item.creator;
          const member = teamMembers.find((m) => m.id === creatorId);

          if (!member) return;

          // Ensure member is in the plan
          if (!plan.members.find((m: any) => m.id === creatorId)) {
            plan.members.push({ id: member.id, name: member.name, designation: member.designation });
          }

          // Ensure distribution bucket exists for this member
          if (!plan.distribution[creatorId]) {
            plan.distribution[creatorId] = [];
          }

          // Convert item to task and add to member's bucket
          const task = {
            id: item.id,
            name: item.taskName || item.contentType,
            client: client?.value || "",
            contentType: item.contentType,
            hours: parseFloat(item.hours) || 1,
            quantity: parseInt(item.quantity) || 1,
            priority: item.urgency || "medium",
            source: `campaign-${name}`,
            status: "assigned",
            copy: item.caption,
            notes: item.note,
            references: item.references,
            deadline: item.deadline,
            campaign: name,
          };

          // Avoid duplicates
          if (!plan.distribution[creatorId].find((t: any) => t.id === task.id)) {
            plan.distribution[creatorId].push(task);
          }
        });
      });

      try {
        localStorage.setItem("daily-plans", JSON.stringify(dailyPlans));
      } catch (e) {
        console.error("Failed to save daily plans:", e);
      }
    };

    if (editId) {
      const updated = existing.map((c) =>
        c.id === editId
          ? { ...c, client: client?.value || "", campaignName: name, startDate: format(dateRange.startDate, "yyyy-MM-dd"), endDate: format(dateRange.endDate, "yyyy-MM-dd"), notes, items: calendarData }
          : c
      );
      localStorage.setItem("campaigns", JSON.stringify(updated));
      syncTasksToDaily();
      setSuccessMsg(`Campaign "${name}" updated successfully!`);
      setTimeout(() => router.push(`/plans/${editId}`), 1500);
    } else {
      const campaign = {
        id: crypto.randomUUID(),
        client: client?.value || "",
        campaignName: name,
        startDate: format(dateRange.startDate, "yyyy-MM-dd"),
        endDate: format(dateRange.endDate, "yyyy-MM-dd"),
        notes,
        items: calendarData,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("campaigns", JSON.stringify([...existing, campaign]));
      syncTasksToDaily();
      setSuccessMsg(`Campaign "${name}" saved successfully!`);
      setTimeout(() => router.push("/plans"), 1500);
    }
  };

  // Build weeks
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const weeks: Date[][] = [];
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const inputClass = "w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2 text-sm text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors bg-white";
  const labelClass = "block text-xs font-medium text-[var(--color-gray-700)] mb-1.5";

  return (
    <main className="flex-1 bg-[var(--surface-page)] flex flex-col">
      {/* Top bar */}
      <div className="px-6 pt-6 pb-4 flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-gray-900)]">{editId ? "Edit Campaign Plan" : "Create Campaign Plan"}</h1>
          <p className="text-sm text-[var(--color-gray-500)] mt-1">Define the campaign period, assign content deliverables, and set priorities for your team.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href={editId ? `/plans/${editId}` : "/plans"} className="border border-[var(--color-gray-200)] text-[var(--color-gray-700)] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
            Cancel
          </Link>
          {step === 3 && (
            <button onClick={saveCampaign} className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors">
              Save Campaign
            </button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="px-6 mb-6 mt-4 shrink-0 flex justify-center">
        <div className="w-full max-w-lg bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-2xl px-8 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center">
            {STEPS.map((label, idx) => {
              const num = idx + 1;
              const done = step > num;
              const active = step === num;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => setStep(num)}
                    disabled={!editId && !done && !active}
                    className={`flex flex-col items-center gap-2 shrink-0 ${!editId && !done && !active ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="relative flex items-center justify-center">
                      {active && <div className="absolute w-10 h-10 rounded-full border-2 border-[#5231FF] opacity-20" />}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        done   ? "bg-[#5231FF] text-white shadow-[0_0_0_3px_rgba(82,49,255,0.15)]"
                        : active ? "bg-[#5231FF] text-white shadow-[0_0_0_4px_rgba(82,49,255,0.18)]"
                        : "bg-[var(--surface-card)] border-2 border-[var(--color-gray-200)] text-[var(--color-gray-400)]"
                      }`}>
                        {done ? <Check size={13} /> : num}
                      </div>
                    </div>
                    <p className={`text-xs font-semibold whitespace-nowrap ${active ? "text-[var(--color-gray-900)]" : done ? "text-[#5231FF]" : "text-[var(--color-gray-400)]"}`}>
                      {label}
                    </p>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 mx-4 mb-5">
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

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <><div className="px-6 pb-6 flex flex-col items-center">
          <div className="w-full max-w-lg">
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 space-y-4">
              <div>
                <label className={labelClass}>Client <span className="text-[var(--color-danger)]">*</span></label>
                <Select instanceId="client-select" options={CLIENTS.map((c) => ({ value: c, label: c }))} value={client} onChange={setClient} placeholder="Select client…" styles={selectStyles()} isSearchable />
              </div>
              <div>
                <label className={labelClass}>Campaign Name <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. Summer Launch 2026" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Campaign Period <span className="text-[var(--color-danger)]">*</span></label>
                <div className="relative" ref={datePickerRef}>
                  <button
                    onClick={() => { setShowDatePicker(!showDatePicker); setPickingStart(true); }}
                    className={`${inputClass} flex items-center justify-between cursor-pointer`}
                  >
                    <span className="text-[var(--color-gray-900)]">
                      {format(dateRange.startDate, "MMM dd, yyyy")} — {format(dateRange.endDate, "MMM dd, yyyy")}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-gray-500)]"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </button>
                  {showDatePicker && (() => {
                    const month1 = pickerMonth;
                    const month2 = addMonths(pickerMonth, 1);
                    const effectiveEnd = !pickingStart && hoverDate
                      ? (isBefore(hoverDate, dateRange.startDate) ? dateRange.startDate : hoverDate)
                      : dateRange.endDate;

                    const renderMonth = (month: Date, arrow?: "prev" | "next") => {
                      const mStart = startOfMonth(month);
                      const mEnd = endOfMonth(month);
                      const days = eachDayOfInterval({ start: startOfWeek(mStart), end: endOfWeek(mEnd) });
                      const weeks: Date[][] = [];
                      for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

                      return (
                        <div key={format(month, "yyyy-MM")} className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            {arrow === "prev" ? (
                              <button onClick={() => setPickerMonth((m) => subMonths(m, 1))}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-gray-100)] text-[var(--color-gray-500)] transition-colors">
                                <ChevronLeft size={16} />
                              </button>
                            ) : <div className="w-7" />}
                            <span className="text-sm font-semibold text-[var(--color-gray-900)]">{format(month, "MMMM yyyy")}</span>
                            {arrow === "next" ? (
                              <button onClick={() => setPickerMonth((m) => addMonths(m, 1))}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-gray-100)] text-[var(--color-gray-500)] transition-colors">
                                <ChevronRight size={16} />
                              </button>
                            ) : <div className="w-7" />}
                          </div>
                          <div className="grid grid-cols-7 mb-2">
                            {["S","M","T","W","T","F","S"].map((d, i) => (
                              <div key={i} className="text-center text-xs font-semibold text-[var(--color-gray-400)]">{d}</div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            {weeks.map((week, wi) => (
                              <div key={wi} className="grid grid-cols-7">
                                {week.map((day, di) => {
                                  const inMonth = day.getMonth() === month.getMonth();
                                  const isPast = isBefore(day, today) && !isToday(day);
                                  const isStart = isSameDay(day, dateRange.startDate);
                                  const isEnd = !pickingStart ? isSameDay(day, effectiveEnd) : isSameDay(day, dateRange.endDate);
                                  const inRange = !pickingStart
                                    ? isWithinInterval(day, { start: dateRange.startDate, end: effectiveEnd })
                                    : isWithinInterval(day, { start: dateRange.startDate, end: dateRange.endDate });
                                  const isEndpoint = isStart || isEnd;

                                  if (!inMonth) return <div key={di} />;

                                  return (
                                    <div key={di} className="flex items-center justify-center h-9 relative">
                                      {/* range background strip */}
                                      {inRange && !isStart && !isEnd && (
                                        <div className="absolute inset-y-1 inset-x-0 bg-[rgba(82,49,255,0.1)]" />
                                      )}
                                      {inRange && isStart && !isSameDay(dateRange.startDate, effectiveEnd) && (
                                        <div className="absolute inset-y-1 right-0 left-1/2 bg-[rgba(82,49,255,0.1)]" />
                                      )}
                                      {inRange && isEnd && !isSameDay(dateRange.startDate, effectiveEnd) && (
                                        <div className="absolute inset-y-1 left-0 right-1/2 bg-[rgba(82,49,255,0.1)]" />
                                      )}
                                      <button
                                        disabled={isPast}
                                        onMouseEnter={() => !pickingStart && setHoverDate(day)}
                                        onMouseLeave={() => !pickingStart && setHoverDate(null)}
                                        onClick={() => {
                                          if (isPast) return;
                                          if (pickingStart) {
                                            setDateRange({ startDate: day, endDate: day, key: "selection" });
                                            setPickingStart(false);
                                          } else {
                                            if (isBefore(day, dateRange.startDate)) {
                                              setDateRange({ startDate: day, endDate: dateRange.startDate, key: "selection" });
                                            } else {
                                              setDateRange((r) => ({ ...r, endDate: day }));
                                            }
                                            setHoverDate(null);
                                            setPickingStart(true);
                                            setShowDatePicker(false);
                                          }
                                        }}
                                        className={`relative z-10 w-8 h-8 rounded-full text-sm transition-colors flex items-center justify-center
                                          ${isEndpoint ? "bg-[#5231FF] text-white font-semibold" : ""}
                                          ${!isEndpoint && !isPast && inMonth ? "hover:bg-[var(--color-gray-100)] text-[var(--color-gray-900)]" : ""}
                                          ${isPast ? "text-[var(--color-gray-300)] cursor-not-allowed" : "cursor-pointer"}
                                          ${isToday(day) && !isEndpoint ? "font-bold text-[#5231FF]" : ""}
                                        `}
                                      >
                                        {format(day, "d")}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-[var(--surface-card)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.14)] border border-[var(--color-gray-200)] p-6 select-none" style={{ minWidth: 580 }}>
                        <div className="flex gap-8">
                          {renderMonth(month1, "prev")}
                          <div className="w-px bg-[var(--color-gray-200)]" />
                          {renderMonth(month2, "next")}
                        </div>
                        {!pickingStart && (
                          <p className="text-xs text-center text-[var(--color-gray-400)] mt-4">Select end date</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div>
                <label className={labelClass}>Notes <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <textarea placeholder="Any additional context…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-10 flex items-center justify-between px-6 py-4 border-t border-[var(--color-gray-200)] bg-[var(--surface-card)]">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
            <ChevronLeft size={16} /> Cancel
          </button>
          <button onClick={() => setStep(2)} disabled={!client} className="inline-flex items-center gap-2 bg-[#5231FF] text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Next <ChevronRight size={16} />
          </button>
        </div>
        </>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <><div className="px-6 pb-6 flex flex-col items-center">
          <div className="w-full max-w-lg">
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <h2 className="text-base font-semibold text-[var(--color-gray-900)] mb-1">Import Content Items</h2>
              <p className="text-sm text-[var(--color-gray-500)] mb-5">
                Upload a CSV with <span className="font-medium text-[var(--color-gray-700)]">Content Type</span> and <span className="font-medium text-[var(--color-gray-700)]">Quantity</span> columns. You'll assign dates in the next step.
              </p>
              {!uploadedFile ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-gray-300)] rounded-xl p-10 cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                  <Upload size={28} className="text-[var(--color-gray-400)] mb-3" />
                  <span className="text-sm font-medium text-[var(--color-gray-700)]">Click to upload or drag and drop</span>
                  <span className="text-xs text-[var(--color-gray-500)] mt-1">CSV files only</span>
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-[var(--color-primary-light)] border border-[var(--color-primary)] rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                        <Upload size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-gray-900)]">{uploadedFile}</p>
                        <p className="text-xs text-[var(--color-gray-500)]">{csvItems.length} items imported</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { if (fileInputRef.current) { fileInputRef.current.value = ""; fileInputRef.current.click(); }}} className="px-3 py-1.5 text-xs font-medium text-[#5231FF] border border-[var(--color-primary)] rounded-lg hover:bg-[var(--surface-card)] transition-colors">Replace</button>
                      <button onClick={() => { setUploadedFile(null); setCsvItems([]); }} className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:text-[var(--color-danger)] hover:bg-red-50 transition-colors"><X size={16} /></button>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                  {csvItems.length > 0 && (
                    <div className="border border-[var(--color-gray-200)] rounded-lg overflow-hidden">
                      <div className="grid grid-cols-12 px-3 py-2 bg-[var(--color-gray-50)] border-b border-[var(--color-gray-200)]">
                        <span className="col-span-8 text-xs font-medium text-[var(--color-gray-500)] uppercase tracking-wide">Content Type</span>
                        <span className="col-span-4 text-xs font-medium text-[var(--color-gray-500)] uppercase tracking-wide">Qty</span>
                      </div>
                      <div className="max-h-52 overflow-y-auto divide-y divide-[var(--color-gray-100)]">
                        {csvItems.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 px-3 py-2.5">
                            <span className="col-span-8 text-sm text-[var(--color-gray-900)]">{item.contentType}</span>
                            <span className="col-span-4 text-sm text-[var(--color-gray-500)]">{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-10 flex items-center justify-between px-6 py-4 border-t border-[var(--color-gray-200)] bg-[var(--surface-card)]">
          <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
            <ChevronLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => { setStep(3); setCurrentMonth(dateRange.startDate); }} className="inline-flex items-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
              Skip
            </button>
            <button onClick={() => { setStep(3); setCurrentMonth(dateRange.startDate); }} className="inline-flex items-center gap-2 bg-[#5231FF] text-white px-5 py-2.5 rounded-lg text-sm font-semibold  transition-colors">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
        </>
      )}

      {/* ── STEP 3: Full-screen calendar ── */}
      {step === 3 && (
        <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
          {/* Calendar container fills remaining space */}
          <div className="flex-1 flex flex-col min-h-0 bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">

            {/* Month nav */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-gray-200)] shrink-0">
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                disabled={isBefore(subMonths(currentMonth, 1), subMonths(startOfMonth(dateRange.startDate), 1))}
                className="p-1.5 rounded-lg hover:bg-[var(--color-gray-100)] text-[var(--color-gray-500)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              ><ChevronLeft size={18} /></button>
              <span className="text-sm font-semibold text-[var(--color-gray-900)]">{format(currentMonth, "MMMM yyyy")}</span>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                disabled={!isBefore(currentMonth, endOfMonth(dateRange.endDate))}
                className="p-1.5 rounded-lg hover:bg-[var(--color-gray-100)] text-[var(--color-gray-500)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              ><ChevronRight size={18} /></button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-[var(--color-gray-200)] shrink-0">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-[var(--color-gray-500)]">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-[var(--color-gray-100)] last:border-0" style={{ minHeight: 0 }}>
                  {week.map((day, di) => {
                    const inMonth = day.getMonth() === currentMonth.getMonth();
                    const inRange = isInRange(day);
                    const key = format(day, "yyyy-MM-dd");
                    const items = calendarData[key] || [];
                    const isStart = isSameDay(day, dateRange.startDate);
                    const isEnd = isSameDay(day, dateRange.endDate);

                    return (
                      <div
                        key={di}
                        onClick={() => inRange && openDrawer(day, items.length > 0 ? "view" : "form")}
                        className={`relative group border-r border-[var(--color-gray-100)] last:border-0 p-2 overflow-hidden flex flex-col transition-colors ${
                          !inMonth  ? "bg-[var(--color-gray-50)]"
                          : inRange ? "bg-[rgba(82,49,255,0.04)] hover:bg-[rgba(82,49,255,0.07)] cursor-pointer"
                          : "bg-[var(--surface-card)]"
                        }`}
                      >
                        {/* Date number */}
                        <div className="flex items-center justify-between mb-1 shrink-0">
                          <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday(day) ? "bg-[var(--color-primary)] text-white"
                            : (isStart || isEnd) ? "bg-[var(--color-gray-900)] text-white"
                            : inRange ? "text-[var(--color-gray-900)]"
                            : "text-[var(--color-gray-300)]"
                          }`}>
                            {format(day, "d")}
                          </span>

                          {/* + button on hover — only in range */}
                          {inRange && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openDrawer(day, "form"); }}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center transition-opacity hover:bg-[var(--color-primary-hover)] shrink-0"
                            >
                              <Plus size={12} />
                            </button>
                          )}
                        </div>

                        {/* Items */}
                        <div className="space-y-0.5 flex-1 overflow-hidden">
                          {items.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded font-medium truncate ${CONTENT_TYPE_COLORS[item.contentType] ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {(() => {
                                const qty = parseInt(item.quantity) || 1;
                                const label = item.linkedType ? `${item.contentType} + ${item.linkedType}` : item.contentType;
                                return qty > 1 ? `${qty}× ${label}` : label;
                              })()}
                            </div>
                          ))}
                          {items.length > 3 && (
                            <span className="text-[10px] text-[var(--color-gray-500)] px-1">+{items.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Footer nav */}
          <div className="sticky bottom-0 z-10 flex items-center justify-between px-6 py-4 border-t border-[var(--color-gray-200)] bg-[var(--surface-card)] mt-4 shrink-0">
            <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
              <ChevronLeft size={16} /> Back
            </button>
            <button onClick={saveCampaign} className="inline-flex items-center gap-2 bg-[#5231FF] text-white px-5 py-2.5 rounded-lg text-sm font-semibold  transition-colors">
              Save Campaign <Check size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Side Drawer ── */}
      {/* Overlay */}
      {drawerDay && <div className="fixed inset-0 bg-black/20 z-40" onClick={closeDrawer} />}

      {/* Drawer panel */}
      <div className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${drawerDay ? "translate-x-0" : "translate-x-full"}`}>
        {drawerDay && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-gray-200)] shrink-0">
              <div className="flex items-center gap-2">
                {drawerMode === "form" && (
                  <button onClick={() => { setDrawerMode("view"); setEditItemId(null); setForm(emptyForm); }}
                    className="p-1 rounded-lg hover:bg-[var(--color-gray-100)] text-[var(--color-gray-500)] transition-colors mr-1">
                    <ChevronLeft size={16} />
                  </button>
                )}
                <div>
                  <p className="text-xs text-[var(--color-gray-500)] font-medium uppercase tracking-wide">
                    {drawerMode === "form" ? (editItemId ? "Edit Task" : "Add Task") : format(drawerDay, "EEEE")}
                  </p>
                  <h3 className="text-base font-semibold text-[var(--color-gray-900)] mt-0.5">{format(drawerDay, "MMMM d, yyyy")}</h3>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-lg hover:bg-[var(--color-gray-100)] text-[var(--color-gray-500)] transition-colors"><X size={18} /></button>
            </div>

            {/* ── VIEW MODE ── */}
            {drawerMode === "view" && (() => {
              const key = format(drawerDay, "yyyy-MM-dd");
              const dayItems = calendarData[key] || [];
              return (
                <>
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    {dayItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-center">
                        <p className="text-sm text-[var(--color-gray-500)]">No content added yet</p>
                        <p className="text-xs text-[var(--color-gray-400)] mt-1">Tap "Add Task" to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayItems.map((item) => (
                          <div key={item.id} className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                            {/* Top row */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${CONTENT_TYPE_COLORS[item.contentType] ?? "bg-gray-100 text-gray-600"}`}>
                                  {(() => { const q = parseInt(item.quantity) || 1; const l = item.linkedType ? `${item.contentType} + ${item.linkedType}` : item.contentType; return q > 1 ? `${q}× ${l}` : l; })()}
                                </span>
                                {item.urgency && item.urgency !== "medium" && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_COLORS[item.urgency]}`}>{item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => openDrawer(drawerDay, "form", item.id)} className="px-2 py-1 rounded-lg text-xs font-semibold text-[#5231FF] hover:bg-[var(--color-primary-light)] transition-colors">Edit</button>
                                <button onClick={() => setDeleteConfirm({ dateKey: key, itemId: item.id })} className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:text-[#EF4444] hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                              </div>
                            </div>
                            {/* Task name */}
                            {item.taskName && <p className="text-sm font-semibold text-[var(--color-gray-900)] mb-1">{item.taskName}</p>}
                            {/* Hours and Creator */}
                            <div className="flex items-center justify-between text-xs text-[var(--color-gray-400)]">
                              <span>{item.hours}h estimated</span>
                              {item.creator && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[#5231FF] text-[11px] font-medium">
                                  Assigned: {teamMembers.find(m => m.id === item.creator)?.name || item.creator}
                                </span>
                              )}
                            </div>
                            {/* Artwork copy preview */}
                            {item.caption && <p className="text-xs text-[var(--color-gray-600)] mt-1.5 line-clamp-1 italic">"{item.caption}"</p>}
                          </div>
                        ))}
                        {dayItems.some(i => i.caption || i.note) && (
                          <div className="mt-2 space-y-2">
                            {dayItems.filter(i => i.caption || i.note).map((item) => (
                              <div key={`detail-${item.id}`} className="rounded-lg border border-[var(--color-gray-200)] px-3 py-2.5 space-y-1.5">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CONTENT_TYPE_COLORS[item.contentType] ?? "bg-gray-100 text-gray-600"}`}>
                                  {item.linkedType ? `${item.contentType} + ${item.linkedType}` : item.contentType}
                                </span>
                                {item.caption && (
                                  <div>
                                    <p className="text-[10px] font-medium text-[var(--color-gray-500)] uppercase tracking-wide">Artwork Copy</p>
                                    <p className="text-xs text-[var(--color-gray-700)] mt-0.5">{item.caption}</p>
                                  </div>
                                )}
                                {item.note && (
                                  <div>
                                    <p className="text-[10px] font-medium text-[var(--color-gray-500)] uppercase tracking-wide">Note</p>
                                    <p className="text-xs text-[var(--color-gray-700)] mt-0.5">{item.note}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="px-5 py-4 border-t border-[var(--color-gray-200)] shrink-0">
                    <button
                      onClick={() => { setDrawerMode("form"); setEditItemId(null); setForm(emptyForm); }}
                      className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors">
                      <Plus size={15} /> Add Task
                    </button>
                  </div>
                </>
              );
            })()}

            {/* ── FORM MODE ── */}
            {drawerMode === "form" && (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                  {/* CSV quick-add chips */}
                  {!editItemId && csvItems.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--color-gray-500)] mb-2">From CSV</p>
                      <div className="flex flex-wrap gap-1.5">
                        {csvItems.map((item) => (
                          <button key={item.id}
                            onClick={() => {
                              const h = autoHours(item.contentType, item.quantity);
                              setForm((f) => ({ ...f, contentType: { value: item.contentType, label: item.contentType }, quantity: item.quantity, hours: h, hoursManual: false }));
                            }}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border border-transparent hover:border-current transition-colors ${CONTENT_TYPE_COLORS[item.contentType] ?? "bg-gray-100 text-gray-600"}`}>
                            {item.contentType}{item.quantity ? ` × ${item.quantity}` : ""}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-[var(--color-gray-100)] mt-3" />
                    </div>
                  )}

                  {/* Task Name */}
                  <div>
                    <label className={labelClass}>Task Name <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Xiaomi Product Launch Banner"
                      value={form.taskName}
                      onChange={(e) => setForm((f) => ({ ...f, taskName: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  {/* Content Type */}
                  <div>
                    <label className={labelClass}>Content Type <span className="text-[var(--color-danger)]">*</span></label>
                    <Select
                      instanceId="drawer-content-type"
                      options={CONTENT_TYPES.map((t) => ({ value: t, label: t }))}
                      value={form.contentType}
                      onChange={(opt) => {
                        const h = autoHours(opt?.value || "", form.quantity);
                        setForm((f) => ({ ...f, contentType: opt, hours: f.hoursManual ? f.hours : h, hoursManual: false, createLinked: false }));
                      }}
                      placeholder="Select content type…"
                      styles={selectStyles()}
                      isSearchable
                    />
                  </div>

                  {/* Post ↔ Story checkbox */}
                  {(form.contentType?.value === "Post" || form.contentType?.value === "Story") && (
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${form.createLinked ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-[var(--color-gray-300)] bg-[var(--surface-input)]"}`}
                        onClick={() => setForm((f) => ({ ...f, createLinked: !f.createLinked }))}>
                        {form.createLinked && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm text-[var(--color-gray-700)]">
                        Also create a {form.contentType.value === "Post" ? "Story" : "Post"} <span className="text-[var(--color-gray-500)]">(1 hr combined)</span>
                      </span>
                    </label>
                  )}

                  {/* Quantity + Hours */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Quantity <span className="text-[var(--color-danger)]">*</span></label>
                      <div className="flex items-center gap-0 rounded-full border border-[var(--color-gray-200)] bg-white">
                        <button
                          type="button"
                          onClick={() => {
                            const q = Math.max(1, parseInt(form.quantity) - 1).toString();
                            const h = form.hoursManual ? form.hours : autoHours(form.contentType?.value || "", q);
                            setForm((f) => ({ ...f, quantity: q, hours: h }));
                          }}
                          className="p-2 text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] hover:bg-[var(--color-gray-100)] transition-colors rounded-full"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="flex-1 text-sm font-semibold text-[var(--color-gray-900)] text-center">{form.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const q = (parseInt(form.quantity) + 1).toString();
                            const h = form.hoursManual ? form.hours : autoHours(form.contentType?.value || "", q);
                            setForm((f) => ({ ...f, quantity: q, hours: h }));
                          }}
                          className="p-2 text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] hover:bg-[var(--color-gray-100)] transition-colors rounded-full"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Hours <span className="text-[var(--color-danger)]">*</span></label>
                      <input type="number" min="0.5" step="0.5" placeholder="e.g. 2" value={form.hours}
                        onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value, hoursManual: true }))}
                        className={inputClass} />
                    </div>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className={labelClass}>Deadline <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                    <input type="date" value={form.deadline}
                      onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                      className={inputClass} />
                  </div>

                  {/* Urgency (optional) */}
                  <div>
                    <label className={labelClass}>Urgency <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                    <Select
                      instanceId="drawer-urgency"
                      value={form.urgency}
                      onChange={(opt) => setForm((f) => ({ ...f, urgency: opt as { value: Urgency; label: string } | null }))}
                      options={URGENCY_OPTIONS}
                      styles={selectStyles()}
                      isSearchable={false}
                      isClearable
                    />
                  </div>

                  {/* Artwork Copy */}
                  <div>
                    <label className={labelClass}>Artwork Copy <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                    <textarea placeholder="Write caption here…" value={form.caption}
                      onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                      rows={2} className={`${inputClass} resize-none`} />
                  </div>

                  {/* Creator / Assignee */}
                  <div>
                    <label className={labelClass}>Creator / Assignee <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                    <Select
                      instanceId="drawer-creator"
                      value={form.creator}
                      onChange={(opt) => setForm((f) => ({ ...f, creator: opt }))}
                      options={teamMembers.filter((m) => m.designation?.toLowerCase() !== "manager").map((m) => ({ value: m.id, label: m.name, photo: m.photo }))}
                      styles={selectStyles()}
                      placeholder="Assign to a team member…"
                      isClearable
                      isSearchable={false}
                      formatOptionLabel={(option: any) => option.value ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 overflow-hidden">
                            {option.photo ? <img src={option.photo} alt={option.label} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-[#5231FF]">{option.label.charAt(0).toUpperCase()}</span>}
                          </div>
                          <span>{option.label}</span>
                        </div>
                      ) : option.label}
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className={labelClass}>Note <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                    <textarea placeholder="Any notes for the team…" value={form.note}
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                      rows={2} className={`${inputClass} resize-none`} />
                  </div>

                  {/* Upload References */}
                  <div>
                    <label className={labelClass}>References <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                    <label className="flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-[var(--color-gray-200)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                      <Upload size={18} className="text-[var(--color-gray-400)]" />
                      <span className="text-xs text-[var(--color-gray-500)] font-medium text-center">Click to upload reference images<br /><span className="text-[var(--color-gray-400)]">PNG, JPG, GIF up to 10MB</span></span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.forEach((file) => {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const result = evt.target?.result as string;
                              setForm((f) => ({ ...f, references: [...f.references, result] }));
                            };
                            reader.readAsDataURL(file);
                          });
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {form.references.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.references.map((ref, i) => (
                          <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-[var(--color-gray-200)]">
                            <img src={ref} alt={`ref-${i}`} className="w-full h-full object-cover" />
                            <button
                              onClick={() => setForm((f) => ({ ...f, references: f.references.filter((_, j) => j !== i) }))}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                              <X size={14} className="text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add another checkbox */}
                  {!editItemId && (
                    <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${form.addAnother ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-[var(--color-gray-300)] bg-[var(--surface-input)]"}`}
                        onClick={() => setForm((f) => ({ ...f, addAnother: !f.addAnother }))}>
                        {form.addAnother && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm text-[var(--color-gray-700)]">Add another after saving</span>
                    </label>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-[var(--color-gray-200)] flex items-center gap-3 shrink-0">
                  {editItemId && (
                    <button onClick={() => setDeleteConfirm({ dateKey: format(drawerDay!, "yyyy-MM-dd"), itemId: editItemId })}
                      className="flex-1 px-4 py-2 border border-red-200 text-[var(--color-danger)] rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  )}
                  <button onClick={() => { setDrawerMode("view"); setEditItemId(null); setForm(emptyForm); }} className="flex-1 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveDrawerItem} disabled={!form.contentType}
                    className="flex-1 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {editItemId ? "Update" : "Add"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 z-[110] flex items-center justify-center">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-[var(--color-gray-900)] mb-2">Delete Task?</h3>
            <p className="text-sm text-[var(--color-gray-500)] mb-6">This action cannot be undone. Are you sure you want to delete this task?</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
                Cancel
              </button>
              <button onClick={() => {
                if (deleteConfirm) {
                  removeItem(deleteConfirm.dateKey, deleteConfirm.itemId);
                  setDeleteConfirm(null);
                  if (editItemId === deleteConfirm.itemId) {
                    setDrawerMode("view");
                    setEditItemId(null);
                    setForm(emptyForm);
                  }
                }
              }}
                className="flex-1 bg-[var(--color-danger)] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-right success toast */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 bg-[var(--color-gray-900)] text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-2">
          <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center shrink-0">
            <Check size={11} strokeWidth={3} className="text-white" />
          </div>
          <span>{successMsg}</span>
        </div>
      )}

    </main>
  );
}
