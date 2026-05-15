'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Calendar, Clock, X, Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  format, eachDayOfInterval, isWithinInterval, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, isBefore, isToday, parseISO,
} from "date-fns";

interface DayItem {
  id: string;
  contentType: string;
  quantity: string;
  hours: string;
  caption: string;
  note: string;
  linkedType?: string;
}

interface Campaign {
  id: string;
  client: string;
  campaignName: string;
  startDate: string;
  endDate: string;
  notes: string;
  items: Record<string, DayItem[]>;
  createdAt: string;
}

const CLIENT_LOGOS: Record<string, string> = {
  "Abans PLC": "/images/client logos/abans plc.png",
  "Xiaomi Sri Lanka": "/images/client logos/xiaomi.png",
  "Moeka": "/images/client logos/moeka.png",
  "Territory London": "/images/client logos/territory london.png",
  "Madara Books": "/images/client logos/madara apps.png",
  "Sri Sri Madara": "/images/client logos/madara apps.png",
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  "Google Ad Set":   "bg-blue-100 text-blue-700",
  "Post":            "bg-purple-100 text-purple-700",
  "Story":           "bg-pink-100 text-pink-700",
  "Paid Ad":         "bg-orange-100 text-orange-700",
  "Album":           "bg-green-100 text-green-700",
  "Animated Videos": "bg-amber-100 text-amber-700",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("campaigns");
    if (stored) {
      const campaigns: Campaign[] = JSON.parse(stored);
      const found = campaigns.find((c) => c.id === params.id);
      if (found) {
        setCampaign(found);
        setCurrentMonth(startOfMonth(parseISO(found.startDate)));
      }
    }
  }, [params.id]);

  if (!campaign) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-sm text-[var(--color-gray-500)]">Campaign not found.</p>
      </main>
    );
  }

  const startDate = parseISO(campaign.startDate);
  const endDate = parseISO(campaign.endDate);

  const isInRange = (d: Date) => isWithinInterval(d, { start: startDate, end: endDate });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const getContentSummary = () => {
    const counts: Record<string, number> = {};
    Object.values(campaign.items || {}).forEach((day) => {
      day.forEach((item) => {
        const type = item.linkedType ? `${item.contentType} + ${item.linkedType}` : item.contentType;
        counts[item.contentType] = (counts[item.contentType] || 0) + (parseInt(item.quantity) || 1);
        if (item.linkedType) counts[item.linkedType] = (counts[item.linkedType] || 0) + (parseInt(item.quantity) || 1);
      });
    });
    return counts;
  };

  const getTotalHours = () => {
    let total = 0;
    Object.values(campaign.items || {}).forEach((day) => {
      day.forEach((item) => { total += parseFloat(item.hours) || 0; });
    });
    return total;
  };

  const deleteCampaign = () => {
    if (!campaign) return;
    try {
      const campaigns: Campaign[] = JSON.parse(localStorage.getItem("campaigns") || "[]");
      const filtered = campaigns.filter((c) => c.id !== campaign.id);
      localStorage.setItem("campaigns", JSON.stringify(filtered));
      router.push("/plans");
    } catch {}
  };

  const totalHours = getTotalHours();
  const contentSummary = getContentSummary();
  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedItems = selectedKey ? (campaign.items[selectedKey] || []) : [];

  const totalDays = Object.keys(campaign.items).filter(k => (campaign.items[k] || []).length > 0).length;

  return (
    <main className="flex-1 bg-[var(--surface-page)] flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-6 border-b border-[var(--color-gray-200)] shrink-0">
        <div className="flex items-start justify-between gap-6">
          {/* Left: logo + name + stats beside */}
          <div className="flex items-center gap-4 flex-1">
            {CLIENT_LOGOS[campaign.client] ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[var(--color-gray-100)]">
                <Image src={CLIENT_LOGOS[campaign.client]} alt={campaign.client} width={56} height={56} className="object-cover w-full h-full" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-[var(--color-primary)]">{campaign.client[0]}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-widest mb-0.5">{campaign.client}</p>
                  <h1 className="text-xl font-bold text-[var(--color-gray-900)] leading-tight truncate">{campaign.campaignName}</h1>
                  {campaign.notes && (
                    <p className="text-xs text-[var(--color-gray-500)] mt-1 line-clamp-1">{campaign.notes}</p>
                  )}
                </div>

                {/* Stats beside name in boxes */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 bg-[var(--color-gray-50)] border border-[var(--color-gray-100)] rounded-lg px-3 py-2">
                    <Calendar size={14} className="text-[var(--color-gray-400)]" />
                    <span className="text-xs font-medium text-[var(--color-gray-700)]">{format(startDate, "MMM d, yyyy")} → {format(endDate, "MMM d, yyyy")}</span>
                  </div>
                  {totalHours > 0 && (
                    <div className="flex items-center gap-2 bg-[var(--color-gray-50)] border border-[var(--color-gray-100)] rounded-lg px-3 py-2">
                      <Clock size={14} className="text-[var(--color-gray-400)]" />
                      <span className="text-xs font-medium text-[var(--color-gray-700)]">{totalHours.toFixed(1).replace(/\.0$/, '')} hrs total</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-[var(--color-gray-50)] border border-[var(--color-gray-100)] rounded-lg px-3 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] inline-block" />
                    <span className="text-xs font-medium text-[var(--color-gray-700)]">{totalDays} active day{totalDays !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: edit + delete buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/plans/new?edit=${campaign.id}`}
              className="inline-flex items-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] hover:bg-[var(--color-gray-100)] rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              <Pencil size={15} />
              Edit Campaign
            </Link>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:text-[#EF4444] hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Content type chips */}
        {Object.keys(contentSummary).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(contentSummary).map(([type, count]) => (
              <span key={type} className={`text-xs px-2.5 py-1 rounded-full font-medium ${CONTENT_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-600"}`}>
                {count} {type}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body: calendar + day panel */}
      <div className="flex-1 flex min-h-0">
        {/* Calendar */}
        <div className="flex-1 flex flex-col min-h-0 p-6">
          <div className="flex-1 flex flex-col min-h-0 bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-gray-200)] shrink-0">
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                disabled={isBefore(subMonths(currentMonth, 1), subMonths(startOfMonth(startDate), 1))}
                className="p-1.5 rounded-lg hover:bg-[var(--color-gray-100)] text-[var(--color-gray-500)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              ><ChevronLeft size={18} /></button>
              <span className="text-sm font-semibold text-[var(--color-gray-900)]">{format(currentMonth, "MMMM yyyy")}</span>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                disabled={!isBefore(currentMonth, endOfMonth(endDate))}
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
                    const items = campaign.items[key] || [];
                    const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                    const isStart = isSameDay(day, startDate);
                    const isEnd = isSameDay(day, endDate);

                    return (
                      <div
                        key={di}
                        onClick={() => inRange && setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                        className={`relative group border-r border-[var(--color-gray-100)] last:border-0 p-2 overflow-hidden flex flex-col transition-colors ${
                          isSelected ? "bg-[rgba(82,49,255,0.08)]"
                          : !inMonth ? "bg-[var(--color-gray-50)]"
                          : inRange ? "bg-[rgba(82,49,255,0.03)] hover:bg-[rgba(82,49,255,0.07)] cursor-pointer"
                          : "bg-[var(--surface-card)]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 shrink-0">
                          <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday(day) ? "bg-[var(--color-primary)] text-white"
                            : (isStart || isEnd) ? "bg-[var(--color-gray-900)] text-white"
                            : isSelected ? "bg-[var(--color-primary)] text-white"
                            : inRange ? "text-[var(--color-gray-900)]"
                            : "text-[var(--color-gray-300)]"
                          }`}>
                            {format(day, "d")}
                          </span>
                          {inRange && items.length === 0 && (
                            <Plus size={11} className="opacity-0 group-hover:opacity-50 text-[var(--color-gray-400)] shrink-0 transition-opacity" />
                          )}
                        </div>

                        <div className="space-y-0.5 flex-1 overflow-hidden">
                          {items.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className={`w-full text-[10px] px-1.5 py-0.5 rounded font-medium truncate ${CONTENT_TYPE_COLORS[item.contentType] ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {item.linkedType ? `${item.contentType} + ${item.linkedType}` : item.contentType}{item.quantity ? ` × ${item.quantity}` : ""}
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
        </div>

        {/* Day detail panel */}
        <div className={`shrink-0 border-l border-[var(--color-gray-200)] bg-[var(--surface-card)] flex flex-col transition-all duration-300 ${selectedDay ? "w-80" : "w-0 overflow-hidden border-l-0"}`}>
          {selectedDay && (
            <>
              <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-gray-200)] shrink-0">
                <div>
                  <p className="text-xs text-[var(--color-gray-500)] font-medium uppercase tracking-wide">{format(selectedDay, "EEEE")}</p>
                  <h3 className="text-sm font-semibold text-[var(--color-gray-900)] mt-0.5">{format(selectedDay, "MMMM d, yyyy")}</h3>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-[var(--color-gray-100)] text-[var(--color-gray-400)] transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                {selectedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <p className="text-sm text-[var(--color-gray-400)]">No tasks for this day</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="border border-[var(--color-card-border)] rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CONTENT_TYPE_COLORS[item.contentType] ?? "bg-gray-100 text-gray-600"}`}>
                            {item.linkedType ? `${item.contentType} + ${item.linkedType}` : item.contentType}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-[var(--color-gray-500)]">
                            <span>Qty: <span className="font-medium text-[var(--color-gray-700)]">{item.quantity}</span></span>
                            {item.hours && <span>· {item.hours} hrs</span>}
                          </div>
                        </div>
                        {item.caption && (
                          <div>
                            <p className="text-[10px] font-semibold text-[var(--color-gray-400)] uppercase tracking-wide">Caption</p>
                            <p className="text-xs text-[var(--color-gray-700)] mt-0.5">{item.caption}</p>
                          </div>
                        )}
                        {item.note && (
                          <div>
                            <p className="text-[10px] font-semibold text-[var(--color-gray-400)] uppercase tracking-wide">Note</p>
                            <p className="text-xs text-[var(--color-gray-700)] mt-0.5">{item.note}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Day summary footer */}
              {selectedItems.length > 0 && (
                <div className="px-4 py-3 border-t border-[var(--color-gray-200)] shrink-0 bg-[var(--color-gray-50)]">
                  <div className="flex items-center justify-between text-xs text-[var(--color-gray-500)]">
                    <span>{selectedItems.length} task{selectedItems.length !== 1 ? 's' : ''}</span>
                    <span>{selectedItems.reduce((s, i) => s + (parseFloat(i.hours) || 0), 0).toFixed(1).replace(/\.0$/, '')} hrs</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--color-gray-900)] mb-2">Delete Campaign?</h3>
            <p className="text-sm text-[var(--color-gray-600)] mb-6">
              This will permanently delete "{campaign?.campaignName}" and all its scheduled tasks. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--color-gray-700)] bg-[var(--color-gray-100)] hover:bg-[var(--color-gray-200)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteCampaign}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#EF4444] hover:bg-red-600 transition-colors"
              >
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
