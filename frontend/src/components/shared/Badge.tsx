type BadgeColor = "green" | "red" | "amber" | "blue" | "gray" | "purple" | "teal";

interface BadgeProps {
  label: string;
  color?: BadgeColor;
}

const colorMap: Record<BadgeColor, string> = {
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  gray: "bg-gray-100 text-gray-600",
  purple: "bg-purple-100 text-purple-700",
  teal: "bg-teal-100 text-teal-700",
};

export default function Badge({ label, color = "gray" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color]}`}
    >
      {label}
    </span>
  );
}
