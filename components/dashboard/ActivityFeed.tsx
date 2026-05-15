import { CheckCircle2, Edit3, Upload, UserCheck } from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  user: string;
  time: string;
  icon: React.ReactNode;
}

const activities: ActivityItem[] = [
  {
    id: "1",
    action: "Completed task: Logo Redesign - ABC Corp",
    user: "Sarah Chen",
    time: "2h ago",
    icon: <CheckCircle2 size={16} />,
  },
  {
    id: "2",
    action: "Updated status: Brand Guidelines to Internal Review",
    user: "Marcus Johnson",
    time: "4h ago",
    icon: <Edit3 size={16} />,
  },
  {
    id: "3",
    action: "Uploaded monthly content plan for May",
    user: "Admin User",
    time: "1d ago",
    icon: <Upload size={16} />,
  },
  {
    id: "4",
    action: "Assigned 3 new tasks to Emma Rodriguez",
    user: "Manager Sarah",
    time: "1d ago",
    icon: <UserCheck size={16} />,
  },
  {
    id: "5",
    action: "Completed task: Product Demo Video",
    user: "Marcus Johnson",
    time: "2d ago",
    icon: <CheckCircle2 size={16} />,
  },
];

export default function ActivityFeed() {
  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
      <h2 className="text-base font-semibold text-[var(--color-gray-900)] mb-4">
        Recent Activity
      </h2>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            <div className="text-[var(--color-gray-500)] flex-shrink-0 mt-0.5">
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-gray-900)]">
                <span className="font-medium">{activity.user}</span>{" "}
                <span className="text-[var(--color-gray-500)]">
                  {activity.action}
                </span>
              </p>
              <p className="text-xs text-[var(--color-gray-500)] mt-1">
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
