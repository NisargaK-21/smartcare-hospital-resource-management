"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import SearchBar from "@/components/shared/SearchBar";
import Badge from "@/components/shared/Badge";
import { fetchStaff, searchStaff, deactivateStaff } from "@/lib/api/staff";
import type { Staff } from "@/types/staff";
import { EMPLOYMENT_STATUSES } from "@/lib/utils/constants";

const statusColor: Record<string, "green" | "amber" | "gray" | "red"> = {
  ACTIVE: "green", ON_LEAVE: "amber", INACTIVE: "gray", TERMINATED: "red",
};

export default function StaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchStaff().catch(() => []);
    setStaff(data); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (search.trim()) {
        const data = await searchStaff(search.trim()).catch(() => []);
        setStaff(data);
      } else { load(); }
    }, 300);
  }, [search, load]);

  const handleDeactivate = async (id: number) => {
    if (!window.confirm("Deactivate this staff member?")) return;
    await deactivateStaff(id).catch(() => {}); load();
  };

  const uniqueDepts = [...new Set(staff.map(s => s.department_name).filter(Boolean))];

  const filtered = staff.filter(s => {
    if (deptFilter !== "ALL" && s.department_name !== deptFilter) return false;
    if (statusFilter !== "ALL" && s.employment_status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Staff" subtitle={`${filtered.length} staff members`} action={
        <button onClick={() => router.push("/staff/register")} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Register Staff</button>
      } />
      <div className="flex gap-3 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or employee number..." />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="ALL">All Departments</option>
          {uniqueDepts.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="ALL">All Statuses</option>
          {EMPLOYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Employee #</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">No staff found</td></tr>
                : filtered.map(s => (
                  <tr key={s.staff_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.employee_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.first_name} {s.last_name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.role_name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.department_name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.phone}</td>
                    <td className="px-4 py-3"><Badge label={s.employment_status} color={statusColor[s.employment_status] ?? "gray"} /></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => router.push(`/staff/${s.staff_id}`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">View</button>
                      {s.is_active && <button onClick={() => handleDeactivate(s.staff_id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium">Deactivate</button>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

