// CURSOR: Dashboard stat card
// Displays: number + label + icon

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color?: string;
}

export function StatCard({ label, value, icon, color = 'primary' }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-green-500/10 text-green-500',
  };

  return (
    <div className="bg-surface border border-primary/20 rounded-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-primary/60">{label}</span>
        <span className={`text-2xl ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </span>
      </div>
      <div className="text-3xl font-bold text-primary">{value}</div>
    </div>
  );
}
