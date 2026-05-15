'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, LayoutGrid, List, Upload, AlertCircle, Zap } from "lucide-react";
import Select from "react-select";
import EmptyState from "@/components/EmptyState";

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  email: string;
  photo?: string;
  assignedTasks: number;
  completedTasks: number;
  workload: number; // 0-100 percentage
}

const DESIGNATIONS = [
  { value: "Senior Creative Executive", label: "Senior Creative Executive" },
  { value: "Creative Executive", label: "Creative Executive" },
  { value: "Video Designer", label: "Video Designer" },
  { value: "Content Writer", label: "Content Writer" },
  { value: "Marketing Specialist", label: "Marketing Specialist" },
];

const selectStyles = {
  control: (base: any) => ({
    ...base, borderColor: "var(--color-gray-200)", borderRadius: "8px",
    minHeight: "auto", fontSize: "14px", boxShadow: "none",
    "&:hover": { borderColor: "#9ca3af" },
    "&:focus-within": { borderColor: "var(--color-primary)", boxShadow: "0 0 0 2px rgba(82,49,255,0.12)" },
  }),
  input: (base: any) => ({ ...base, padding: "6px 8px", margin: "2px", fontSize: "14px" }),
  option: (base: any, { isSelected, isFocused }: any) => ({
    ...base,
    backgroundColor: isSelected ? "#5231FF" : isFocused ? "#f3f4f6" : "white",
    color: isSelected ? "white" : "#111118",
    fontSize: "14px", padding: "8px 12px", cursor: "pointer",
  }),
  menuList: (base: any) => ({ ...base, padding: "0", borderRadius: "8px" }),
  menu: (base: any) => ({ ...base, borderRadius: "8px", marginTop: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 60 }),
};

const DEFAULT_MEMBERS: TeamMember[] = [
  { id: "1", name: "Sanjaya Samaratunga", designation: "Manager", email: "sanjaya@test.com", assignedTasks: 0, completedTasks: 0, workload: 0 },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({ name: "", designation: null as any, email: "", photo: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const inputClass = "w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2 text-sm text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors bg-[var(--surface-input)]";
  const labelClass = "block text-xs font-medium text-[var(--color-gray-700)] mb-1.5";

  useEffect(() => {
    setMounted(true);

    // Clean up old data to free space
    try {
      localStorage.removeItem("task-uploads");
      localStorage.removeItem("task-upload-meta");
    } catch {}

    const SEED_VERSION = "v2";
    const stored = localStorage.getItem("team-members");
    const seeded = localStorage.getItem("team-members-seed");
    if (stored && seeded === SEED_VERSION) {
      setMembers(JSON.parse(stored));
    } else {
      setMembers(DEFAULT_MEMBERS);
      try {
        localStorage.setItem("team-members", JSON.stringify(DEFAULT_MEMBERS));
        localStorage.setItem("team-members-seed", SEED_VERSION);
      } catch {}
    }
  }, []);

  if (!mounted) return null;

  // Filter out managers — only show creators
  const creators = members.filter((m) => m.designation.toLowerCase() !== "manager");

  const saveMember = () => {
    if (!newMember.name || !newMember.designation || !newMember.email) return;

    if (editingId) {
      // Update existing member
      const updated = members.map((m) =>
        m.id === editingId
          ? { ...m, name: newMember.name, designation: newMember.designation.value, email: newMember.email, photo: newMember.photo || undefined }
          : m
      );
      setMembers(updated);
      try {
        localStorage.setItem("team-members", JSON.stringify(updated));
      } catch (e) {
        if (e instanceof Error && e.message.includes("quota")) {
          try {
            const compactMembers = updated.map(({ photo, ...rest }) => rest);
            localStorage.setItem("team-members", JSON.stringify(compactMembers));
          } catch {
            console.error("Could not save to localStorage");
          }
        }
      }
      setEditingId(null);
    } else {
      // Add new member
      const member: TeamMember = {
        id: crypto.randomUUID(),
        name: newMember.name,
        designation: newMember.designation.value,
        email: newMember.email,
        photo: newMember.photo || undefined,
        assignedTasks: 0,
        completedTasks: 0,
        workload: 0,
      };
      const updated = [...members, member];
      setMembers(updated);

      try {
        localStorage.setItem("team-members", JSON.stringify(updated));
      } catch (e) {
        // If quota exceeded, clear unnecessary data and try again
        if (e instanceof Error && e.message.includes("quota")) {
          try {
            // Clear upload metadata and old data
            localStorage.removeItem("task-upload-meta");
            localStorage.removeItem("task-uploads");
            // Store member without photos to reduce size
            const compactMembers = updated.map(({ photo, ...rest }) => rest);
            localStorage.setItem("team-members", JSON.stringify(compactMembers));
          } catch {
            // If still failing, just keep in memory
            console.error("Could not save to localStorage, keeping in memory only");
          }
        }
      }
    }

    setShowAddModal(false);
    setNewMember({ name: "", designation: null, email: "", photo: "" });
  };

  const deleteMember = (id: string) => {
    const updated = members.filter((m) => m.id !== id);
    setMembers(updated);
    try {
      localStorage.setItem("team-members", JSON.stringify(updated));
    } catch (e) {
      // If quota exceeded, try with compact version
      if (e instanceof Error && e.message.includes("quota")) {
        try {
          const compactMembers = updated.map(({ photo, ...rest }) => rest);
          localStorage.setItem("team-members", JSON.stringify(compactMembers));
        } catch {
          console.error("Could not save to localStorage");
        }
      }
    }
    setDeleteConfirm(null);
  };

  const getWorkloadStatus = (workload: number) => {
    if (workload >= 90) {
      return {
        icon: <AlertCircle size={16} className="text-[#EF4444]" />,
        message: "I'm running on fumes! 😅",
        color: "text-[#EF4444]",
      };
    } else if (workload >= 25) {
      return {
        icon: <Zap size={16} className="text-[#F59E0B]" />,
        message: "Bring it on! 💪",
        color: "text-[#F59E0B]",
      };
    } else {
      return {
        icon: <Plus size={16} className="text-[#3B82F6]" />,
        message: "Add more tasks for me! 🚀",
        color: "text-[#3B82F6]",
      };
    }
  };

  const getWorkloadColor = (workload: number) => {
    if (workload >= 85) return "bg-[#EF4444]";
    if (workload >= 70) return "bg-[#F59E0B]";
    if (workload >= 50) return "bg-[#3B82F6]";
    return "bg-[#10B981]";
  };

  return (
    <main className="flex-1 bg-white">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-gray-900)]">Team Members</h1>
            <p className="text-sm text-[var(--color-gray-500)] mt-1">Manage your creative team and their workload</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors shrink-0"
          >
            <Plus size={16} />
            Add Member
          </button>
        </div>

        {creators.length === 0 ? (
          <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] min-h-96 flex items-center justify-center">
            <EmptyState
              icon={<Image src="/images/team.svg" alt="No team members" width={96} height={96} />}
              heading="No Team Members Yet!"
              description="Add your first team member to get started with scheduling."
              buttonLabel="Add Team Member"
              onClick={() => setShowAddModal(true)}
              iconBgColor="bg-transparent"
            />
          </div>
        ) : (
          <>
            {/* View Toggle */}
            <div className="mb-6 flex items-center gap-3">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "card"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-gray-100)] text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]"
                }`}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-gray-100)] text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]"
                }`}
              >
                <List size={18} />
              </button>
              <span className="text-sm text-[var(--color-gray-500)] font-medium ml-auto">{creators.length} member{creators.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Members */}
            {viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {creators.map((member) => {
              const status = getWorkloadStatus(member.workload);
              return (
                <div key={member.id} className="relative bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 transition-all duration-200">
                  {/* Action Buttons */}
                  <div className="absolute top-6 right-6 flex items-center gap-1">
                    <button
                      onClick={() => { setEditingId(member.id); setNewMember({ name: member.name, designation: { value: member.designation, label: member.designation }, email: member.email, photo: member.photo || "" }); }}
                      className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:text-[#5231FF] hover:bg-blue-50 transition-colors"
                      title="Edit member"
                    >
                      <svg size={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(member.id)}
                      className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:text-[#EF4444] hover:bg-red-50 transition-colors"
                      title="Delete member"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Profile */}
                  <div className="flex items-center gap-3 mb-5 pr-12">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 overflow-hidden border border-[var(--color-primary)]">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-[var(--color-primary)]">{member.name.split(" ").map(n => n.charAt(0)).join("").slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-[var(--color-gray-900)] line-clamp-1">{member.name}</h3>
                      <p className="text-xs text-[var(--color-gray-500)] mt-0.5 line-clamp-1">{member.designation}</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[var(--color-gray-100)] mb-5" />

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg p-3">
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-tight">Assigned</p>
                      <p className="text-xl font-bold text-[#111118] mt-1">{member.assignedTasks}</p>
                    </div>
                    <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg p-3">
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-tight">Completed</p>
                      <p className="text-xl font-bold text-[#10B981] mt-1">{member.completedTasks}</p>
                    </div>
                  </div>

                  {/* Workload */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-[var(--color-gray-500)] font-medium">Workload</p>
                      <p className="text-sm font-semibold text-[var(--color-gray-900)]">{member.workload}%</p>
                    </div>
                    <div className="w-full bg-[var(--color-gray-100)] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getWorkloadColor(member.workload)}`}
                        style={{ width: `${member.workload}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className="flex items-center gap-2 p-3 bg-[var(--color-gray-50)] rounded-lg">
                    {status.icon}
                    <span className={`text-xs font-medium ${status.color}`}>{status.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="divide-y divide-[var(--color-gray-200)]">
              {creators.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-6 hover:bg-[var(--color-gray-50)] transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 overflow-hidden border border-[var(--color-primary)]">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-[var(--color-primary)]">{member.name.split(" ").map(n => n.charAt(0)).join("").slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[var(--color-gray-900)]">{member.name}</h3>
                      <p className="text-xs text-[var(--color-gray-500)] mt-0.5">{member.designation}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-16 shrink-0 ml-4">
                    <div className="text-right w-20">
                      <p className="text-xs text-[var(--color-gray-500)] font-medium">Assigned</p>
                      <p className="text-sm font-semibold text-[var(--color-gray-900)]">{member.assignedTasks}</p>
                    </div>
                    <div className="text-right w-20">
                      <p className="text-xs text-[var(--color-gray-500)] font-medium">Completed</p>
                      <p className="text-sm font-semibold text-[var(--color-success)]">{member.completedTasks}</p>
                    </div>
                    <div className="w-40">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-[var(--color-gray-500)] font-medium">Workload</p>
                        <p className="text-xs font-semibold text-[var(--color-gray-900)]">{member.workload}%</p>
                      </div>
                      <div className="w-full bg-[var(--color-gray-100)] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${getWorkloadColor(member.workload)}`}
                          style={{ width: `${member.workload}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteConfirm(member.id)}
                    className="p-1.5 rounded-lg text-[var(--color-gray-400)] hover:text-[#EF4444] hover:bg-red-50 transition-colors shrink-0 ml-4"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Member Modal */}
      {(showAddModal || editingId) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--color-gray-900)] mb-6">{editingId ? "Edit Team Member" : "Add Team Member"}</h3>
            <div className="space-y-5 mb-6">
              {/* Photo Upload */}
              <div>
                <label className={labelClass}>Profile Photo <span className="text-[var(--color-gray-500)] font-normal">(optional)</span></label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0 border-2 border-[var(--color-primary)]">
                    {newMember.photo ? (
                      <img src={newMember.photo} alt="Preview" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-lg font-bold text-[var(--color-primary)]">{newMember.name.split(" ").map(n => n.charAt(0)).join("").slice(0, 2).toUpperCase() || "?"}</span>
                    )}
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center px-3 py-2 border-2 border-dashed border-[var(--color-gray-300)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                    <Upload size={18} className="text-[var(--color-gray-400)]" />
                    <span className="text-xs font-medium text-[var(--color-gray-500)] mt-1">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setNewMember({ ...newMember, photo: evt.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={labelClass}>Name <span className="text-[var(--color-danger)]">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Johnson"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* Designation */}
              <div>
                <label className={labelClass}>Designation <span className="text-[var(--color-danger)]">*</span></label>
                <Select
                  instanceId="designation-select"
                  value={newMember.designation}
                  onChange={(opt) => setNewMember({ ...newMember, designation: opt })}
                  options={DESIGNATIONS}
                  placeholder="Select designation…"
                  styles={selectStyles}
                  isSearchable
                />
              </div>

              {/* Email */}
              <div>
                <label className={labelClass}>Email <span className="text-[var(--color-danger)]">*</span></label>
                <input
                  type="email"
                  placeholder="e.g. sarah@agency.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setShowAddModal(false); setEditingId(null); setNewMember({ name: "", designation: null, email: "", photo: "" }); }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--color-gray-700)] bg-[var(--color-gray-100)] hover:bg-[var(--color-gray-200)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveMember}
                disabled={!newMember.name || !newMember.designation || !newMember.email}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingId ? "Save Member" : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--color-gray-900)] mb-2">Delete Team Member?</h3>
            <p className="text-sm text-[var(--color-gray-600)] mb-6">
              This will permanently remove this team member. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--color-gray-700)] bg-[var(--color-gray-100)] hover:bg-[var(--color-gray-200)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMember(deleteConfirm)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#EF4444] hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
