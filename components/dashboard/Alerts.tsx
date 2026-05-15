import { AlertCircle, Calendar, Clock } from "lucide-react";

interface Alert {
  id: string;
  type: "overdue" | "leave" | "deadline";
  title: string;
  description: string;
  badgeColor: string;
  icon: React.ReactNode;
}

const alerts: Alert[] = [
  {
    id: "1",
    type: "overdue",
    title: "5 Overdue Tasks",
    description: "Tasks past their due date need attention",
    badgeColor: "bg-red-100 text-red-700",
    icon: <AlertCircle size={16} />,
  },
  {
    id: "2",
    type: "leave",
    title: "Sarah Chen - On Leave Tomorrow",
    description: "Tasks need to be redistributed",
    badgeColor: "bg-yellow-100 text-yellow-700",
    icon: <Calendar size={16} />,
  },
  {
    id: "3",
    type: "deadline",
    title: "Urgent Deadline - ABC Corp",
    description: "Brand Guidelines due today at 5 PM",
    badgeColor: "bg-blue-100 text-blue-700",
    icon: <Clock size={16} />,
  },
];

export default function Alerts() {
  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
      <h2 className="text-base font-semibold text-[var(--color-gray-900)] mb-4">
        Alerts
      </h2>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-3 rounded-lg border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:bg-[var(--color-gray-50)] transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 ${alert.badgeColor} p-1.5 rounded`}>
                {alert.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-gray-900)]">
                  {alert.title}
                </p>
                <p className="text-xs text-[var(--color-gray-500)]">
                  {alert.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
