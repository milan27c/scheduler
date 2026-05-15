import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ListTodo,
} from "lucide-react";

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  iconColor: string;
  trend?: string;
}

const stats: StatCard[] = [
  {
    label: "Total Tasks This Month",
    value: 248,
    icon: <ListTodo size={24} />,
    iconColor: "text-[var(--color-gray-500)]",
  },
  {
    label: "Completed Today",
    value: 12,
    icon: <CheckCircle2 size={24} />,
    iconColor: "text-[var(--color-success)]",
    trend: "+3 from yesterday",
  },
  {
    label: "Overdue",
    value: 5,
    icon: <AlertCircle size={24} />,
    iconColor: "text-[var(--color-danger)]",
  },
  {
    label: "In Progress",
    value: 34,
    icon: <Clock size={24} />,
    iconColor: "text-[var(--color-warning)]",
  },
];

export default function StatsCards() {
  return (
    <div className="grid grid-cols-4 gap-6 mb-8">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={stat.iconColor}>{stat.icon}</div>
            {stat.trend && (
              <span className="text-xs font-medium text-[var(--color-success)] bg-green-50 px-2 py-1 rounded">
                {stat.trend}
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-[var(--color-gray-900)] mb-1">
            {stat.value}
          </p>
          <p className="text-sm text-[var(--color-gray-500)]">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
