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
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-200">
        <span className="text-2xl">🏥</span>
        <span className="text-lg font-bold text-gray-900">SmartCare</span>
      </div>

      <nav className="flex-1 px-3 py-3">
        {/* Hospital Management Section */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mt-4 mb-2">
          Hospital Management
        </p>
        {hospitalManagementLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium mb-1 transition-colors ${
                isActive
                  ? "bg-blue-600 text-white font-semibold rounded-lg shadow-sm"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}

        {/* Resource Operations Section */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mt-6 mb-2">
          Resource Operations
        </p>
        {resourceOperationsLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium mb-1 transition-colors ${
                isActive
                  ? "bg-blue-600 text-white font-semibold rounded-lg shadow-sm"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
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
