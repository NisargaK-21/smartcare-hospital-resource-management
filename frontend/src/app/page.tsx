"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import Badge from "@/components/shared/Badge";
import {
  fetchDashboardStats,
  fetchWardOccupancy,
  fetchDepartmentStats,
  fetchRecentPatients,
  fetchStaffSummary,
} from "@/lib/api/dashboard";
import type {
  DashboardStats,
  WardOccupancy,
  DepartmentStat,
  RecentPatient,
  StaffSummary,
} from "@/types/dashboard";
import { formatDate } from "@/lib/utils/formatDate";

function occupancyColor(rate: number) {
  if (rate < 60) return "text-emerald-700";
  if (rate <= 80) return "text-amber-700";
  return "text-rose-700";
}
function occupancyBg(rate: number) {
  if (rate < 60) return "bg-emerald-600";
  if (rate <= 80) return "bg-amber-500";
  return "bg-rose-600";
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
      setError("Failed to load dashboard data. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-slate-200 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
        <p className="text-rose-800 font-semibold mb-3">{error}</p>
        <button
          onClick={load}
          className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 transition"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Dashboard"
        subtitle="Live operational metrics & hospital resource utilization"
        action={
          <button
            onClick={load}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
          >
            🔄 Refresh
          </button>
        }
      />

      {/* Row 1 — Bed + Patient stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Beds" value={stats?.total_beds ?? 0} icon="🛏️" color="text-blue-700" />
        <StatCard title="Available Beds" value={stats?.available_beds ?? 0} icon="✅" color="text-emerald-700" />
        <StatCard title="Occupied Beds" value={stats?.occupied_beds ?? 0} icon="🔴" color="text-rose-700" />
        <StatCard title="Reserved Beds" value={stats?.reserved_beds ?? 0} icon="⚠️" color="text-amber-700" />
        <StatCard title="Total Patients" value={stats?.total_patients ?? 0} icon="🧑" color="text-purple-700" />
      </div>

      {/* Row 2 — Staff + Structure */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active Staff" value={stats?.total_staff ?? 0} icon="👨‍⚕️" color="text-teal-700" />
        <StatCard title="Departments" value={stats?.total_departments ?? 0} icon="🏥" color="text-indigo-700" />
        <StatCard title="Total Wards" value={stats?.total_wards ?? 0} icon="🏨" color="text-sky-700" />
        <StatCard
          title="Occupancy Rate"
          value={`${stats?.occupancy_rate ?? 0}%`}
          icon="📊"
          color={occupancyColor(Number(stats?.occupancy_rate ?? 0))}
        />
      </div>

      {/* Ward Occupancy + Recent Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ward Occupancy */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 font-bold text-slate-900 bg-slate-50 flex items-center justify-between">
            <span>🏨 Ward Occupancy</span>
            <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
              {wardOccupancy.length} wards
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3">Ward</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Dept</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Avail</th>
                  <th className="text-left px-4 py-3">Occ %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wardOccupancy.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                      No ward records found in database
                    </td>
                  </tr>
                ) : (
                  wardOccupancy.map((w) => (
                    <tr key={w.ward_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{w.ward_name}</td>
                      <td className="px-4 py-3">
                        <Badge label={w.ward_type} color={w.ward_type === "ICU" ? "red" : "blue"} />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 text-xs">{w.department_name}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{w.total_beds}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{w.available_beds}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${occupancyBg(Number(w.occupancy_rate))}`}
                              style={{ width: `${Math.min(Number(w.occupancy_rate), 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${occupancyColor(Number(w.occupancy_rate))}`}>
                            {w.occupancy_rate ?? 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Patients */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 font-bold text-slate-900 bg-slate-50 flex items-center justify-between">
            <span>🧑 Recent Patients</span>
            <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
              Latest registrations
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3">Patient #</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Gender</th>
                  <th className="text-left px-4 py-3">Blood</th>
                  <th className="text-left px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPatients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 font-medium">
                      No patients registered yet
                    </td>
                  </tr>
                ) : (
                  recentPatients.map((p) => (
                    <tr key={p.patient_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 bg-slate-50 rounded">
                        {p.patient_number}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {p.first_name} {p.last_name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={p.gender} color={p.gender === "MALE" ? "blue" : "purple"} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-rose-100 text-rose-900 border border-rose-200 px-2 py-0.5 rounded text-xs font-extrabold">
                          {p.blood_group ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                        {formatDate(p.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff Summary */}
      {staffSummary && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="font-bold text-slate-900 mb-4 text-base">👨‍⚕️ Staff Employment Breakdown</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Active", value: staffSummary.total_active, color: "bg-emerald-50 text-emerald-950 border border-emerald-200" },
              { label: "On Leave", value: staffSummary.total_on_leave, color: "bg-amber-50 text-amber-950 border border-amber-200" },
              { label: "Inactive", value: staffSummary.total_inactive, color: "bg-slate-100 text-slate-950 border border-slate-300" },
              { label: "Terminated", value: staffSummary.total_terminated, color: "bg-rose-50 text-rose-950 border border-rose-200" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80">{s.label}</div>
                <div className="text-3xl font-extrabold mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
