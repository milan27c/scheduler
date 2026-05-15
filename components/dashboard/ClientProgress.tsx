interface ClientProgressData {
  clientName: string;
  completed: number;
  total: number;
}

const clientProgress: ClientProgressData[] = [
  { clientName: "ABC Corporation", completed: 42, total: 60 },
  { clientName: "XYZ Marketing", completed: 38, total: 50 },
  { clientName: "Digital Co.", completed: 28, total: 45 },
  { clientName: "Tech Startups Inc.", completed: 15, total: 35 },
];

export default function ClientProgress() {
  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--color-card-border)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
      <h2 className="text-base font-semibold text-[var(--color-gray-900)] mb-6">
        Client Completion Progress
      </h2>

      <div className="space-y-4">
        {clientProgress.map((client, idx) => {
          const percentage = Math.round((client.completed / client.total) * 100);
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[var(--color-gray-900)]">
                  {client.clientName}
                </p>
                <p className="text-xs text-[var(--color-gray-500)]">
                  {client.completed}/{client.total}
                </p>
              </div>
              <div className="w-full h-2 bg-[var(--color-gray-200)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-primary)] transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-[var(--color-gray-500)] mt-1">
                {percentage}% complete
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
