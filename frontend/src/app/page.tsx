"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import Badge from "@/components/shared/Badge";
import { fetchDashboardStats, fetchWardOccupancy, fetchDepartmentStats, fetchRecentPatients, fetchStaffSummary } from "@/lib/api/dashboard";
import type { DashboardStats, WardOccupancy, DepartmentStat, RecentPatient, StaffSummary } from "@/types/dashboard";
import { formatDate } from "@/lib/utils/formatDate";

function occupancyColor(rate: number) {
  if (rate < 60) return "text-green-600";
  if (rate <= 80) return "text-amber-500";
  return "text-red-600";
}
function occupancyBg(rate: number) {
  if (rate < 60) return "bg-green-500";
  if (rate <= 80) return "bg-amber-500";
  return "bg-red-500";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [wardOccupancy, setWardOccupancy] = useState<WardOccupancy[]>([]);
  const [deptStats, setDeptStats] = useState<DepartmentStat[]>([]);
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, w, d, p, sf] = await Promise.all([
        fetchDashboardStats(),
        fetchWardOccupancy(),
        fetchDepartmentStats(),
        fetchRecentPatients(8),
        fetchStaffSummary(),
      ]);
      setStats(s);
      setWardOccupancy(w);
      setDeptStats(d);
      setRecentPatients(p);
      setStaffSummary(sf);
    } catch {
      setError("Failed to load dashboard data. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-gray-200 rounded-xl h-24 animate-pulse" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <p className="text-red-600 mb-3">{error}</p>
      <button onClick={load} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm">Retry</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Hospital overview"
        action={
          <button onClick={load} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
            🔄 Refresh
          </button>
        }
      />

      {/* Row 1 — Bed + Patient stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Beds" value={stats?.total_beds ?? 0} icon="🛏️" color="text-blue-700" />
        <StatCard title="Available" value={stats?.available_beds ?? 0} icon="✅" color="text-green-600" />
        <StatCard title="Occupied" value={stats?.occupied_beds ?? 0} icon="🔴" color="text-red-600" />
        <StatCard title="Reserved" value={stats?.reserved_beds ?? 0} icon="⚠️" color="text-amber-600" />
        <StatCard title="Total Patients" value={stats?.total_patients ?? 0} icon="🧑" color="text-purple-600" />
      </div>

      {/* Row 2 — Staff + Structure */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active Staff" value={stats?.total_staff ?? 0} icon="👨‍⚕️" color="text-teal-600" />
        <StatCard title="Departments" value={stats?.total_departments ?? 0} icon="🏥" color="text-indigo-600" />
        <StatCard title="Wards" value={stats?.total_wards ?? 0} icon="🏨" color="text-blue-600" />
        <StatCard title="Occupancy Rate" value={`${stats?.occupancy_rate ?? 0}%`} icon="📊" color={occupancyColor(stats?.occupancy_rate ?? 0)} />
      </div>

      {/* Ward Occupancy + Recent Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ward Occupancy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-700">🏨 Ward Occupancy</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Ward</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Dept</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Avail</th>
                  <th className="text-left px-4 py-3">Occ%</th>
                </tr>
              </thead>
              <tbody>
                {wardOccupancy.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-6 text-gray-400">No ward data</td></tr>
                ) : wardOccupancy.map((w) => (
                  <tr key={w.ward_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{w.ward_name}</td>
                    <td className="px-4 py-3"><Badge label={w.ward_type} color={w.ward_type === "ICU" ? "red" : "blue"} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{w.department_name}</td>
                    <td className="px-4 py-3">{w.total_beds}</td>
                    <td className="px-4 py-3 text-green-600">{w.available_beds}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${occupancyBg(Number(w.occupancy_rate))}`} style={{ width: `${Math.min(Number(w.occupancy_rate), 100)}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${occupancyColor(Number(w.occupancy_rate))}`}>{w.occupancy_rate ?? 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Patients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-700">🧑 Recent Patients</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Patient #</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Gender</th>
                  <th className="text-left px-4 py-3">Blood</th>
                  <th className="text-left px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody>
                {recentPatients.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-gray-400">No patients</td></tr>
                ) : recentPatients.map((p) => (
                  <tr key={p.patient_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.patient_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.first_name} {p.last_name}</td>
                    <td className="px-4 py-3"><Badge label={p.gender} color={p.gender === "MALE" ? "blue" : "purple"} /></td>
                    <td className="px-4 py-3"><span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-xs font-bold">{p.blood_group ?? "—"}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff Summary */}
      {staffSummary && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="font-semibold text-gray-700 mb-4">👨‍⚕️ Staff Summary</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Active", value: staffSummary.total_active, color: "bg-green-100 text-green-700" },
              { label: "On Leave", value: staffSummary.total_on_leave, color: "bg-amber-100 text-amber-700" },
              { label: "Inactive", value: staffSummary.total_inactive, color: "bg-gray-100 text-gray-600" },
              { label: "Terminated", value: staffSummary.total_terminated, color: "bg-red-100 text-red-700" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg px-4 py-3 ${s.color}`}>
                <div className="text-xs font-medium opacity-70">{s.label}</div>
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
