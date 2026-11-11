import React from "react";

type BadgeColor = "green" | "red" | "amber" | "blue" | "gray" | "purple" | "teal";

interface BadgeProps {
  label?: string;
  color?: BadgeColor;
  children?: React.ReactNode;
}

const colorMap: Record<BadgeColor, string> = {
  green: "bg-emerald-100 text-emerald-900 border border-emerald-300",
  red: "bg-rose-100 text-rose-900 border border-rose-300",
  amber: "bg-amber-100 text-amber-900 border border-amber-300",
  blue: "bg-blue-100 text-blue-900 border border-blue-300",
  gray: "bg-slate-100 text-slate-800 border border-slate-300",
  purple: "bg-purple-100 text-purple-900 border border-purple-300",
  teal: "bg-teal-100 text-teal-900 border border-teal-300",
};

export default function Badge({ label, color = "gray", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorMap[color]}`}
    >
      {children ?? label}
    </span>
  );
}
