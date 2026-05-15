import { ChevronRight } from "lucide-react";

interface CreatorTask {
  id: string;
  name: string;
  role: string;
  avatar: string;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    statusColor: string;
  }>;
  taskCount: number;
}

const creators: CreatorTask[] = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "Senior Creative Executive",
    avatar: "SC",
    tasks: [
      {
        id: "t1",
        title: "Logo Redesign - ABC Corp",
        status: "In Progress",
        statusColor: "bg-blue-50 text-blue-600",
      },
      {
        id: "t2",
        title: "Brand Guidelines",
        status: "Internal Review",
        statusColor: "bg-purple-50 text-purple-600",
      },
    ],
    taskCount: 2,
  },
  {
    id: "2",
    name: "Marcus Johnson",
    role: "Video Designer",
    avatar: "MJ",
    tasks: [
      {
        id: "t3",
        title: "Product Demo Video",
        status: "Work in Progress",
        statusColor: "bg-blue-50 text-blue-600",
      },
    ],
    taskCount: 1,
  },
  {
    id: "3",
    name: "Emma Rodriguez",
    role: "Content Writer",
    avatar: "ER",
    tasks: [
      {
        id: "t4",
        title: "Blog Post: Q2 Insights",
        status: "Internal Review",
        statusColor: "bg-purple-50 text-purple-600",
      },
      {
        id: "t5",
        title: "Social Media Captions",
        status: "Work in Progress",
        statusColor: "bg-blue-50 text-blue-600",
      },
      {
        id: "t6",
        title: "Campaign Copy",
        status: "Unassigned",
        statusColor: "bg-gray-100 text-gray-500",
      },
    ],
    taskCount: 3,
  },
];

export default function TodaySchedule() {
  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[var(--color-gray-900)]">
          Today's Schedule
        </h2>
        <a
          href="/schedule"
          className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
        >
          View Full <ChevronRight size={16} />
        </a>
      </div>

      <div className="space-y-4">
        {creators.map((creator) => (
          <div
            key={creator.id}
            className="flex items-start gap-4 pb-4 border-b border-[var(--color-gray-100)] last:border-b-0"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {creator.avatar}
            </div>
            <div className="flex-1">
              <p className="font-medium text-[var(--color-gray-900)]">
                {creator.name}
              </p>
              <p className="text-xs text-[var(--color-gray-500)] mb-2">
                {creator.role}
              </p>
              <div className="flex flex-wrap gap-2">
                {creator.tasks.map((task) => (
                  <span
                    key={task.id}
                    className={`inline-block text-xs px-2 py-1 rounded-full ${task.statusColor}`}
                  >
                    {task.status}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-[var(--color-gray-900)]">
                {creator.taskCount}
              </p>
              <p className="text-xs text-[var(--color-gray-500)]">tasks</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
