'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Plus, Search, Trash2 } from "lucide-react";
import Select from "react-select";
import EmptyState from "@/components/EmptyState";

interface Campaign {
  id: string;
  client: string;
  campaignName: string;
  startDate: string;
  endDate: string;
  notes: string;
  items: Record<string, any>;
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

export default function MonthlyPlansPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "hours">("newest");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("campaigns");
    if (stored) {
      setCampaigns(JSON.parse(stored));
    }
  }, []);

  if (!mounted) return null;

  const getContentSummary = (campaign: Campaign) => {
    const counts: Record<string, number> = {};
    Object.values(campaign.items || {}).forEach((day: any) => {
      if (Array.isArray(day)) {
        day.forEach((item: any) => {
          const type = item.contentType;
          counts[type] = (counts[type] || 0) + (parseInt(item.quantity) || 1);
        });
      }
    });
    return counts;
  };

  const getTotalHours = (campaign: Campaign) => {
    let total = 0;
    Object.values(campaign.items || {}).forEach((day: any) => {
      if (Array.isArray(day)) {
        day.forEach((item: any) => {
          total += parseFloat(item.hours) || 0;
        });
      }
    });
    return total;
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((campaign) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      campaign.campaignName.toLowerCase().includes(searchLower) ||
      campaign.client.toLowerCase().includes(searchLower)
    );
  });

  // Sort campaigns
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "hours":
        return getTotalHours(b) - getTotalHours(a);
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const deleteCampaign = (id: string) => {
    const filtered = campaigns.filter((c) => c.id !== id);
    setCampaigns(filtered);
    localStorage.setItem("campaigns", JSON.stringify(filtered));
    setDeleteConfirm(null);
  };

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

  return (
    <main className="flex-1">
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-gray-900)]">
              Campaign Plans
            </h1>
            <p className="text-sm text-[var(--color-gray-500)] mt-1">
              Manage campaign content plans for your clients
            </p>
          </div>
          {campaigns.length > 0 && (
            <Link href="/plans/new" className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors shrink-0">
              <Plus size={16} />
              Create Plan
            </Link>
          )}
        </div>

        {/* Search and Sort */}
        {campaigns.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-gray-400)] pointer-events-none" size={16} />
              <input
                type="text"
                placeholder="Search by campaign name or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-[var(--color-gray-200)] rounded-lg px-3 py-2.5 pl-10 text-sm text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <Select
              instanceId="sort-select"
              value={{ value: sortBy, label: sortBy === "newest" ? "Newest First" : sortBy === "oldest" ? "Oldest First" : "Most Hours" }}
              onChange={(opt) => setSortBy(opt?.value as any)}
              options={[
                { value: "newest", label: "Newest First" },
                { value: "oldest", label: "Oldest First" },
                { value: "hours", label: "Most Hours" },
              ]}
              styles={selectStyles}
              isSearchable={false}
              className="ml-auto w-48 shrink-0"
            />
            <span className="text-sm text-[var(--color-gray-500)] font-medium shrink-0">{sortedCampaigns.length} result{sortedCampaigns.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] min-h-96 flex items-center justify-center">
            <EmptyState
              icon={<Image src="/images/empty campaign plan.svg" alt="No campaigns" width={96} height={96} />}
              heading="No Campaign Plans Yet!"
              description="Create your first campaign plan to get started."
              buttonLabel="Create New Campaign Plan"
              href="/plans/new"
              iconBgColor="bg-transparent"
            />
          </div>
        ) : sortedCampaigns.length === 0 ? (
          <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] min-h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-[var(--color-gray-500)]">No campaigns found</p>
              <p className="text-xs text-[var(--color-gray-400)] mt-1">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCampaigns.map((campaign) => {
              const contentSummary = getContentSummary(campaign);
              const totalHours = getTotalHours(campaign);
              const contentTypes = Object.entries(contentSummary)
                .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
                .join(", ");

              return (
                <div key={campaign.id} className="group relative">
                  <Link href={`/plans/${campaign.id}`}>
                    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:border-[var(--color-primary)] transition-all duration-200 cursor-pointer h-full flex flex-col p-6">
                      {/* Header with client logo */}
                      <div className="mb-5 flex items-center gap-3">
                      {CLIENT_LOGOS[campaign.client] && (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <Image
                            src={CLIENT_LOGOS[campaign.client]}
                            alt={campaign.client}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-tight">{campaign.client}</p>
                        <h3 className="text-base font-bold text-[var(--color-gray-900)] line-clamp-2">{campaign.campaignName}</h3>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-[var(--color-gray-100)] mb-5" />

                    {/* Date and time */}
                    <div className="space-y-3 mb-5">
                      <div className="flex items-start gap-3">
                        <Calendar size={16} className="text-[var(--color-gray-400)] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-[var(--color-gray-400)] font-medium">Campaign Period</p>
                          <p className="text-sm text-[var(--color-gray-700)]">{campaign.startDate} → {campaign.endDate}</p>
                        </div>
                      </div>

                      {totalHours > 0 && (
                        <div className="flex items-start gap-3">
                          <Clock size={16} className="text-[var(--color-gray-400)] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-[var(--color-gray-400)] font-medium">Total Hours</p>
                            <p className="text-sm text-[var(--color-gray-700)] font-medium">{totalHours.toFixed(1).replace(/\.0$/, '')} hrs</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content types */}
                    {contentTypes && (
                      <div className="mb-5">
                        <p className="text-xs text-[var(--color-gray-500)] font-medium mb-2 uppercase tracking-wide">Content Summary</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(contentSummary).map(([type, count]) => (
                            <span key={type} className="bg-[var(--color-gray-100)] text-[var(--color-gray-700)] text-xs px-3 py-1.5 rounded-full font-medium">
                              {count} {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes if any */}
                    {campaign.notes && (
                      <>
                        <div className="h-px bg-[var(--color-gray-100)] mb-3" />
                        <p className="text-xs text-[var(--color-gray-500)] line-clamp-2">{campaign.notes}</p>
                      </>
                    )}
                    </div>
                  </Link>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteConfirm(campaign.id);
                    }}
                    className="absolute top-8 right-6 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--color-gray-400)] hover:text-[#EF4444] hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--color-gray-900)] mb-2">Delete Campaign?</h3>
            <p className="text-sm text-[var(--color-gray-600)] mb-6">
              This will permanently delete this campaign and all its scheduled tasks. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--color-gray-700)] bg-[var(--color-gray-100)] hover:bg-[var(--color-gray-200)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteCampaign(deleteConfirm)}
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
