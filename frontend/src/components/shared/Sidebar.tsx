"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const hospitalManagementLinks = [
  { icon: "🏠", label: "Dashboard", href: "/" },
  { icon: "🧑", label: "Patients", href: "/patients" },
  { icon: "🏥", label: "Departments", href: "/departments" },
  { icon: "🏨", label: "Wards", href: "/wards" },
  { icon: "🚪", label: "Rooms", href: "/rooms" },
  { icon: "🛏️", label: "Beds", href: "/beds" },
  { icon: "👨‍⚕️", label: "Staff", href: "/staff" },
  { icon: "🔑", label: "Roles", href: "/roles" },
];

const resourceOperationsLinks = [
  { icon: "📋", label: "Admissions", href: "/admissions" },
  { icon: "📅", label: "Reservations", href: "/reservations" },
  { icon: "🔄", label: "Transfers", href: "/transfers" },
  { icon: "🏃", label: "Discharges", href: "/discharges" },
  { icon: "🫁", label: "ICU Resources", href: "/icu-resources" },
  { icon: "🔧", label: "Maintenance", href: "/maintenance" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-200 flex flex-col overflow-y-auto z-50">
      {/* Logo / Title */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <span className="text-2xl">🏥</span>
        <span className="text-lg font-bold text-gray-800">SmartCare</span>
      </div>

      <nav className="flex-1 px-3 py-3">
        {/* Hospital Management Section */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mt-5 mb-1">
          Hospital Management
        </p>
        {hospitalManagementLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-2 text-sm mb-0.5 ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold rounded-lg"
                  : "text-gray-600 hover:bg-gray-100 rounded-lg"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}

        {/* Resource Operations Section */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mt-5 mb-1">
          Resource Operations
        </p>
        {resourceOperationsLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-2 text-sm mb-0.5 ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold rounded-lg"
                  : "text-gray-600 hover:bg-gray-100 rounded-lg"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
