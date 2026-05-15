'use client';

import { useEffect, useState, useRef } from "react";
import { Plus, Calendar, X } from "lucide-react";
import { useRouter } from "next/navigation";

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

export default function DashboardHeader({ dateLabel }: { dateLabel: string }) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const handleGo = () => {
    setShowPicker(false);
    router.push(`/schedule/tomorrow?date=${selectedDate}`);
  };

  const fmtDisplay = (iso: string) => {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  };

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-gray-900)]">Dashboard</h1>
        <p className="text-sm text-[var(--color-gray-500)] mt-1">{dateLabel}</p>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <Calendar size={15} /> Create Daily Plan
        </button>

        {showPicker && (
          <div
            ref={modalRef}
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
              value={selectedDate}
              min={todayKey()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2 text-sm text-[var(--color-gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors bg-[var(--surface-input)] mb-2"
            />
            {selectedDate && (
              <p className="text-xs text-[var(--color-gray-500)] mb-3">{fmtDisplay(selectedDate)}</p>
            )}
            <button
              onClick={handleGo}
              disabled={!selectedDate}
              className="w-full bg-[#5231FF] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
