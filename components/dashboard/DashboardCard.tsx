interface DashboardCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function DashboardCard({
  title,
  description,
  children,
}: DashboardCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-lg">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}
