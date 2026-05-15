import Link from "next/link";

interface EmptyStateProps {
  icon: React.ReactNode;
  heading: string;
  description: string;
  buttonLabel: string;
  href?: string;
  onClick?: () => void;
  iconBgColor?: string;
}

export default function EmptyState({
  icon,
  heading,
  description,
  buttonLabel,
  href,
  onClick,
  iconBgColor = "bg-blue-100",
}: EmptyStateProps) {
  const buttonClass =
    "flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[var(--color-primary-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className={`${iconBgColor} rounded-full p-6 mb-6`}>
        <div className="text-blue-600">{icon}</div>
      </div>
      <h2 className="text-xl font-semibold text-[var(--color-gray-900)] mb-2">
        {heading}
      </h2>
      <p className="text-sm text-[var(--color-gray-500)] text-center max-w-sm mb-8">
        {description}
      </p>
      {href ? (
        <Link href={href} className={buttonClass}>
          {buttonLabel}
        </Link>
      ) : onClick ? (
        <button onClick={onClick} className={buttonClass}>
          {buttonLabel}
        </button>
      ) : null}
    </div>
  );
}
