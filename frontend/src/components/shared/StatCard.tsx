interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: string;
}

export default function StatCard({ title, value, icon, color = "text-slate-900" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <p className={`text-3xl font-extrabold mt-2 tracking-tight ${color}`}>{value}</p>
    </div>
  );
}
