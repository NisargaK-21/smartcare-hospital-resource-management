interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: string;
}

export default function StatCard({ title, value, icon, color = "text-gray-800" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      {icon && <span className="text-2xl">{icon}</span>}
      <p className="text-sm text-gray-500 mt-1">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
