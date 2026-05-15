'use client';

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2, Clock, User, X, Upload, MessageSquare,
  ChevronRight, FileImage, Download, ZoomIn, Edit2, Send,
} from "lucide-react";
import Image from "next/image";
import { getTaskImages, type UploadedImage } from "@/lib/imageStore";

interface ReviewTask {
  id: string;
  name: string;
  client?: string;
  contentType: string;
  hours: number;
  priority?: string;
  assigneeId: string;
  assigneeName: string;
  assigneePhoto?: string;
  planDate: string;
  deadline?: string;
  source?: string;
  copy?: string;
  note?: string;
  notes?: string;
  parentTaskId?: string;
  captionWriterId?: string;
  captionWriterName?: string;
  reviewStatus: "internal-review" | "client-review";
}

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  photo?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

function Avatar({ name, photo, size = 8 }: { name: string; photo?: string; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 overflow-hidden`}>
      {photo
        ? <Image src={photo} alt={name} width={40} height={40} className="w-full h-full object-cover" />
        : <span className="text-xs font-bold text-[#5231FF]">{name.charAt(0).toUpperCase()}</span>}
    </div>
  );
}

function ArtworkGrid({ images, onZoom }: { images: UploadedImage[]; onZoom: (src: string) => void }) {
  if (images.length === 0) return (
    <p className="text-sm text-[var(--color-gray-400)] italic bg-[var(--color-gray-50)] border border-dashed border-[var(--color-gray-200)] rounded-xl px-4 py-5 text-center">
      No artwork uploaded yet.
    </p>
  );
  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((img, i) => (
        <button
          key={i}
          onClick={() => onZoom(img.dataUrl)}
          className="relative aspect-square rounded-xl overflow-hidden border border-[var(--color-gray-200)] bg-[var(--color-gray-50)] group/img hover:border-[#5231FF] transition-colors"
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
  );
}

export default function InReviewPanel() {
  const [internalTasks, setInternalTasks] = useState<ReviewTask[]>([]);
  const [clientTasks, setClientTasks] = useState<ReviewTask[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [drawerTask, setDrawerTask] = useState<ReviewTask | null>(null);
  const [mounted, setMounted] = useState(false);

  // Drawer state
  const [feedback, setFeedback] = useState("");
  const [captionWriterId, setCaptionWriterId] = useState("");
  const [managerUploads, setManagerUploads] = useState<{ name: string; dataUrl: string }[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]); // creator artwork
  const [captionText, setCaptionText] = useState(""); // writer's submitted caption
  const [captionEdit, setCaptionEdit] = useState(""); // manager editing caption
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); load(); }, []);

  function load() {
    const plans = JSON.parse(localStorage.getItem("daily-plans") || "[]");
    const team: TeamMember[] = JSON.parse(localStorage.getItem("team-members") || "[]");
    setMembers(team);

    const internal: ReviewTask[] = [];
    const clientReview: ReviewTask[] = [];
    const seen = new Set<string>();

    plans.forEach((plan: any) => {
      Object.entries(plan.distribution || {}).forEach(([memberId, taskList]) => {
        const member = team.find((m) => m.id === memberId);
        (taskList as any[]).forEach((t) => {
          if (seen.has(t.id)) return;
          const base = { ...t, assigneeId: memberId, assigneeName: member?.name ?? "Unknown", assigneePhoto: member?.photo, planDate: plan.date };
          if (t.status === "internal-review") {
            seen.add(t.id);
            if (t.captionWriterId) {
              // Caption phase: writer submitted — show writer as the submitter
              const writer = team.find((m) => m.id === t.captionWriterId);
              internal.push({
                ...base,
                assigneeName: writer?.name ?? t.captionWriterName ?? "Unknown",
                captionWriterId: t.captionWriterId,
                captionWriterName: t.captionWriterName ?? writer?.name,
                reviewStatus: "internal-review",
              });
            } else {
              // Artwork phase: designer submitted
              internal.push({ ...base, reviewStatus: "internal-review" });
            }
          } else if (t.status === "client-review") {
            seen.add(t.id);
            clientReview.push({ ...base, captionWriterId: t.captionWriterId, captionWriterName: t.captionWriterName, reviewStatus: "client-review" });
          }
        });
      });
    });
    setInternalTasks(internal);
    setClientTasks(clientReview);
  }

  async function openDrawer(task: ReviewTask) {
    setDrawerTask(task);
    setFeedback("");
    setCaptionWriterId("");
    setManagerUploads([]);
    setIsEditingCaption(false);

    // Load artwork: for caption tasks use parentTaskId, else use task.id
    const artworkId = task.parentTaskId ?? task.id;
    const imgs = await getTaskImages(artworkId).catch(() => [] as UploadedImage[]);
    setUploadedImages(imgs);

    // Load writer's submitted caption
    const captions: Record<string, { text: string }> = JSON.parse(localStorage.getItem("task-captions") || "{}");
    const cap = captions[task.id]?.text ?? "";
    setCaptionText(cap);
    setCaptionEdit(cap);
  }

  function closeDrawer() {
    setDrawerTask(null);
    setUploadedImages([]);
    setLightboxSrc(null);
    setIsEditingCaption(false);
  }

  function saveFeedback(taskId: string, text: string) {
    const entry = { author: "Manager", text: text.trim(), createdAt: new Date().toISOString() };
    const stored = JSON.parse(localStorage.getItem("task-feedback") || "{}");
    stored[taskId] = [entry];
    localStorage.setItem("task-feedback", JSON.stringify(stored));
  }

  function sendBack() {
    if (!drawerTask) return;
    if (feedback.trim()) saveFeedback(drawerTask.id, feedback);
    const backStatus = "work-in-progress";
    updateTaskStatus(drawerTask.id, backStatus);
    closeDrawer();
  }

  function approveArtwork() {
    if (!drawerTask) return;
    // If a writer is assigned, put task back to "assigned" for the writer; else internally approve
    const newStatus = captionWriterId ? "assigned" : "internal-approved";
    updateTaskStatus(drawerTask.id, newStatus, captionWriterId || undefined);
    closeDrawer();
  }

  function markInClientReview() {
    if (!drawerTask) return;
    // If manager edited caption, save it
    if (isEditingCaption && captionEdit.trim()) {
      const captions: Record<string, { text: string }> = JSON.parse(localStorage.getItem("task-captions") || "{}");
      captions[drawerTask.id] = { text: captionEdit.trim() };
      localStorage.setItem("task-captions", JSON.stringify(captions));
    }
    updateTaskStatus(drawerTask.id, "client-review");
    closeDrawer();
  }

  function markClientApproved() {
    if (!drawerTask) return;
    updateTaskStatus(drawerTask.id, "client-approved");
    closeDrawer();
  }

  function updateTaskStatus(taskId: string, newStatus: string, writerIdArg?: string) {
    const plans = JSON.parse(localStorage.getItem("daily-plans") || "[]");
    let writerNotified = false;

    const updated = plans.map((plan: any) => {
      const newDist: Record<string, any[]> = {};

      Object.entries(plan.distribution || {}).forEach(([memberId, taskList]) => {
        newDist[memberId] = (taskList as any[]).map((t) => {
          if (t.id !== taskId) return t;
          // Assign writer to this task in-place — set captionWriter fields, status → "assigned"
          if (writerIdArg && newStatus === "assigned") {
            const writer = members.find((m) => m.id === writerIdArg);
            return {
              ...t,
              status: newStatus,
              captionWriterId: writerIdArg,
              captionWriterName: writer?.name ?? "",
            };
          }
          return { ...t, status: newStatus };
        });
      });

      // Notify the caption writer (once per plan that contains the task)
      if (writerIdArg && newStatus === "assigned" && !writerNotified) {
        const taskObj = Object.values(plan.distribution || {}).flat().find((t: any) => t.id === taskId);
        if (taskObj) {
          try {
            const writer = members.find((m) => m.id === writerIdArg);
            const notif = {
              id: `assign-caption-${taskId}-${Date.now()}`,
              type: "task-assigned",
              title: `Caption task: ${(taskObj as any).name}`,
              message: `You've been assigned to write the caption for "${(taskObj as any).name}" (${(taskObj as any).client ?? ""})`,
              taskId,
              writerId: writerIdArg,
              writerName: writer?.name ?? "",
              read: false,
              createdAt: new Date().toISOString(),
            };
            const notifs = JSON.parse(localStorage.getItem("notifications") || "[]");
            localStorage.setItem("notifications", JSON.stringify([notif, ...notifs]));
            writerNotified = true;
          } catch {}
        }
      }

      return { ...plan, distribution: newDist };
    });

    localStorage.setItem("daily-plans", JSON.stringify(updated));

    // Mark notification read
    try {
      const notifs = JSON.parse(localStorage.getItem("notifications") || "[]");
      localStorage.setItem("notifications", JSON.stringify(
        notifs.map((n: any) => n.taskId === taskId ? { ...n, read: true } : n)
      ));
    } catch {}

    load();
  }

  function handleManagerUpload(files: FileList) {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setManagerUploads((prev) => [...prev, { name: file.name, dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
  }

  const contentWriters = members.filter((m) =>
    m.designation?.toLowerCase().includes("content") || m.designation?.toLowerCase().includes("writer")
  );
  const captionCandidates = contentWriters.length > 0 ? contentWriters : members;

  const isCaptionTask = (task: ReviewTask) => !!task.captionWriterId;

  if (!mounted || (internalTasks.length === 0 && clientTasks.length === 0)) return null;

  return (
    <>
      <div className="mb-6 space-y-4">

        {/* Internal Review section */}
        {internalTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <h2 className="text-sm font-bold text-[var(--color-gray-900)]">Pending Internal Review</h2>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{internalTasks.length}</span>
            </div>
            <div className="space-y-2">
              {internalTasks.map((task) => (
                <TaskRow key={task.id} task={task} isCaptionTask={isCaptionTask(task)} onClick={() => openDrawer(task)} />
              ))}
            </div>
          </div>
        )}

        {/* In Client Review section */}
        {clientTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <h2 className="text-sm font-bold text-[var(--color-gray-900)]">In Client Review</h2>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{clientTasks.length}</span>
            </div>
            <div className="space-y-2">
              {clientTasks.map((task) => (
                <TaskRow key={task.id} task={task} isCaptionTask={isCaptionTask(task)} onClick={() => openDrawer(task)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerTask && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closeDrawer} />
          <div className="w-[560px] bg-[var(--surface-card)] h-full shadow-2xl flex flex-col">

            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--color-gray-200)] shrink-0">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: drawerTask.reviewStatus === "client-review" ? "#A16207" : "#7C3AED" }}>
                  {drawerTask.reviewStatus === "client-review" ? "In Client Review" : isCaptionTask(drawerTask) ? "Caption Review" : "Internal Review"}
                </p>
                <h3 className="text-base font-bold text-[var(--color-gray-900)] leading-tight">{drawerTask.name}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-[var(--color-gray-500)]">{drawerTask.client}</span>
                  <span className="text-[var(--color-gray-300)]">·</span>
                  <span className="text-xs text-[var(--color-gray-500)]">{drawerTask.contentType}</span>
                  {drawerTask.priority && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[drawerTask.priority] || ""}`}>
                      {drawerTask.priority}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:bg-[var(--color-gray-100)] transition-colors shrink-0 mt-0.5">
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Submitted by */}
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: drawerTask.reviewStatus === "client-review" ? "#FEFCE8" : "#F5F3FF", border: "1px solid", borderColor: drawerTask.reviewStatus === "client-review" ? "#FEF08A" : "#EDE9FE" }}>
                <Avatar name={drawerTask.assigneeName} photo={drawerTask.assigneePhoto} size={9} />
                <div>
                  <p className="text-xs font-semibold text-[var(--color-gray-900)]">{drawerTask.assigneeName}</p>
                  <p className="text-[11px] text-[var(--color-gray-500)]">
                    {drawerTask.reviewStatus === "client-review" ? "Sent to client review" : "Submitted for review"} · {new Date(drawerTask.planDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Artwork */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-2.5 flex items-center gap-1.5">
                  <FileImage size={12} /> {isCaptionTask(drawerTask) ? "Reference Artwork" : "Submitted Artwork"}
                </p>
                <ArtworkGrid images={uploadedImages} onZoom={setLightboxSrc} />
              </div>

              {/* Caption task: show writer's caption + allow edit */}
              {isCaptionTask(drawerTask) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] flex items-center gap-1.5">
                      <MessageSquare size={12} /> Writer&apos;s Caption
                    </p>
                    {!isEditingCaption && captionText && (
                      <button
                        onClick={() => setIsEditingCaption(true)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#5231FF] hover:underline"
                      >
                        <Edit2 size={11} /> Edit
                      </button>
                    )}
                  </div>
                  {isEditingCaption ? (
                    <div>
                      <textarea
                        rows={4}
                        value={captionEdit}
                        onChange={(e) => setCaptionEdit(e.target.value)}
                        className="w-full border border-[var(--color-primary)] rounded-xl px-4 py-3 text-sm text-[var(--color-gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none bg-[var(--surface-input)]"
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setIsEditingCaption(false)} className="text-xs text-[var(--color-gray-500)] hover:text-[var(--color-gray-900)] px-3 py-1.5 rounded-lg border border-[var(--color-gray-200)] hover:bg-[var(--color-gray-100)] transition-colors">Cancel</button>
                        <button
                          onClick={() => {
                            const captions: Record<string, { text: string }> = JSON.parse(localStorage.getItem("task-captions") || "{}");
                            captions[drawerTask.id] = { text: captionEdit.trim() };
                            localStorage.setItem("task-captions", JSON.stringify(captions));
                            setCaptionText(captionEdit.trim());
                            setIsEditingCaption(false);
                          }}
                          className="text-xs font-semibold text-white bg-[#5231FF] px-3 py-1.5 rounded-lg hover:bg-[#3D1FE8] transition-colors flex items-center gap-1"
                        >
                          <Send size={11} /> Save Caption
                        </button>
                      </div>
                    </div>
                  ) : captionText ? (
                    <p className="text-sm text-[var(--color-gray-800)] bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">{captionText}</p>
                  ) : (
                    <p className="text-sm text-[var(--color-gray-400)] italic bg-[var(--color-gray-50)] border border-dashed border-[var(--color-gray-200)] rounded-xl px-4 py-4 text-center">No caption submitted yet.</p>
                  )}
                </div>
              )}

              {/* Artwork copy (original brief) */}
              {(drawerTask.copy) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-2">Artwork Brief</p>
                  <p className="text-sm text-[var(--color-gray-800)] bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">{drawerTask.copy}</p>
                </div>
              )}

              {/* Feedback textarea — only for internal review, not client review */}
              {drawerTask.reviewStatus === "internal-review" && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-1.5 flex items-center gap-1.5">
                    <MessageSquare size={12} /> {isCaptionTask(drawerTask) ? "Feedback for Writer" : "Feedback for Designer"}
                  </p>
                  <p className="text-[11px] text-[var(--color-gray-400)] mb-2">Sent when you click &ldquo;Send Back&rdquo;.</p>
                  <textarea
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={isCaptionTask(drawerTask) ? "Add feedback for the writer…" : "Add feedback for the designer…"}
                    className="w-full border border-[var(--color-gray-200)] rounded-xl px-4 py-3 text-sm text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none bg-[var(--surface-input)]"
                  />
                </div>
              )}

              {/* Manager reference uploads */}
              {drawerTask.reviewStatus === "internal-review" && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-2.5 flex items-center gap-1.5">
                    <Upload size={12} /> Attach References
                  </p>
                  {managerUploads.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {managerUploads.map((f, i) => (
                        <button key={i} onClick={() => setLightboxSrc(f.dataUrl)} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--color-gray-200)] group/img hover:border-[#5231FF] transition-colors">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.dataUrl} alt={f.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn size={14} className="text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-3 border border-dashed border-[var(--color-gray-300)] rounded-xl px-4 py-3 cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors group/ul">
                    <Upload size={16} className="text-[var(--color-gray-400)] group-hover/ul:text-[#5231FF] shrink-0" />
                    <span className="text-sm text-[var(--color-gray-500)] group-hover/ul:text-[#5231FF]">Click to attach images or files</span>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleManagerUpload(e.target.files)} />
                  </label>
                </div>
              )}

              {/* Caption writer assignment — only for artwork tasks on first review */}
              {drawerTask.reviewStatus === "internal-review" && !isCaptionTask(drawerTask) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)] mb-2">
                    Assign Caption Writer <span className="font-normal normal-case text-[var(--color-gray-400)]">(on approval)</span>
                  </p>
                  <select
                    value={captionWriterId}
                    onChange={(e) => setCaptionWriterId(e.target.value)}
                    className="w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-gray-900)] bg-[var(--surface-input)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  >
                    <option value="">— No caption task —</option>
                    {captionCandidates.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} · {m.designation}</option>
                    ))}
                  </select>
                </div>
              )}

            </div>

            {/* Footer actions */}
            <div className="shrink-0 border-t border-[var(--color-gray-200)] px-6 py-4 flex gap-3">
              {drawerTask.reviewStatus === "client-review" ? (
                // Client review → only approve
                <>
                  <button onClick={closeDrawer} className="flex-1 inline-flex items-center justify-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
                    Close
                  </button>
                  <button onClick={markClientApproved} className="flex-1 inline-flex items-center justify-center gap-2 bg-[#10B981] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <CheckCircle2 size={14} /> Mark Client Approved
                  </button>
                </>
              ) : isCaptionTask(drawerTask) ? (
                // Caption task review → send back / in client review
                <>
                  <button onClick={sendBack} className="flex-1 inline-flex items-center justify-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
                    <ChevronRight size={14} className="rotate-180" /> Send Back to Writer
                  </button>
                  <button onClick={markInClientReview} className="flex-1 inline-flex items-center justify-center gap-2 bg-[#5231FF] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#3D1FE8] transition-colors">
                    <Send size={14} /> Mark In Client Review
                  </button>
                </>
              ) : (
                // Artwork review → send back / internally approve
                <>
                  <button onClick={sendBack} className="flex-1 inline-flex items-center justify-center gap-2 border border-[var(--color-gray-200)] text-[var(--color-gray-700)] bg-[var(--surface-card)] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-gray-100)] transition-colors">
                    <ChevronRight size={14} className="rotate-180" /> Send Back to Designer
                  </button>
                  <button onClick={approveArtwork} className="flex-1 inline-flex items-center justify-center gap-2 bg-[#10B981] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                    <CheckCircle2 size={14} /> Mark Internally Approved
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Fullscreen lightbox */}
          {lightboxSrc && (
            <div className="fixed inset-0 z-[200] flex flex-col bg-black" onClick={() => setLightboxSrc(null)}>
              <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm font-semibold text-white/80">Artwork Preview</span>
                <div className="flex items-center gap-2">
                  <a href={lightboxSrc} download={`artwork-${Date.now()}.png`} className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" onClick={(e) => e.stopPropagation()}>
                    <Download size={13} /> Download
                  </a>
                  <button onClick={() => setLightboxSrc(null)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-6 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lightboxSrc} alt="Artwork" className="max-w-full max-h-full object-contain" style={{ userSelect: "none" }} />
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

function TaskRow({ task, isCaptionTask, onClick }: { task: ReviewTask; isCaptionTask: boolean; onClick: () => void }) {
  const borderColor = task.reviewStatus === "client-review" ? "border-yellow-200 hover:border-yellow-400" : "border-purple-200 hover:border-purple-400";
  const shadow = task.reviewStatus === "client-review" ? "hover:shadow-[0_2px_12px_rgba(202,138,4,0.1)]" : "hover:shadow-[0_2px_12px_rgba(124,58,237,0.1)]";
  const badge = task.reviewStatus === "client-review"
    ? "bg-yellow-100 text-yellow-700"
    : "bg-purple-100 text-purple-700";
  const badgeLabel = task.reviewStatus === "client-review" ? "In Client Review" : isCaptionTask ? "Caption Review" : "In Internal Review";

  return (
    <div
      onClick={onClick}
      className={`bg-[var(--surface-card)] border ${borderColor} ${shadow} rounded-xl px-5 py-3.5 flex items-center gap-4 cursor-pointer transition-all group`}
    >
      <div className={`w-${9} h-${9} rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 overflow-hidden`}>
        <span className="text-xs font-bold text-[#5231FF]">{task.assigneeName.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-[var(--color-gray-900)] truncate">{task.name}</p>
          {task.priority && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] || ""}`}>
              {task.priority}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-xs text-[var(--color-gray-500)]">
          <span>{task.client}</span>
          <span>·</span><span>{task.contentType}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5"><Clock size={10} />{task.hours}h</span>
          <span>·</span>
          <span className="flex items-center gap-0.5"><User size={10} />{task.assigneeName}</span>
        </div>
      </div>
      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge}`}>{badgeLabel}</span>
      <ChevronRight size={15} className="text-[var(--color-gray-400)] group-hover:text-purple-500 transition-colors shrink-0" />
    </div>
  );
}
