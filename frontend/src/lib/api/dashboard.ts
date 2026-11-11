import { API_BASE } from "@/lib/utils/constants";
import type {
  DashboardStats,
  WardOccupancy,
  DepartmentStat,
  StaffSummary,
  RecentPatient,
} from "@/types/dashboard";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchWardOccupancy(): Promise<WardOccupancy[]> {
  const res = await fetch(`${API_BASE}/dashboard/ward-occupancy`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchDepartmentStats(): Promise<DepartmentStat[]> {
  const res = await fetch(`${API_BASE}/dashboard/department-stats`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchBedStatusBreakdown(): Promise<{ bed_status: string; count: number }[]> {
  const res = await fetch(`${API_BASE}/dashboard/bed-status`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchRecentPatients(limit?: number): Promise<RecentPatient[]> {
  const query = limit !== undefined ? `?limit=${limit}` : "";
  const res = await fetch(`${API_BASE}/dashboard/recent-patients${query}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchStaffSummary(): Promise<StaffSummary> {
  const res = await fetch(`${API_BASE}/dashboard/staff-summary`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
