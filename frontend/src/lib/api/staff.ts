import { API_BASE } from "@/lib/utils/constants";
import type { Staff } from "@/types/staff";

export async function fetchStaff(filters?: {
  department_id?: number;
  role_id?: number;
  employment_status?: string;
}): Promise<Staff[]> {
  const params = new URLSearchParams();
  if (filters?.department_id !== undefined) params.set("department_id", String(filters.department_id));
  if (filters?.role_id !== undefined) params.set("role_id", String(filters.role_id));
  if (filters?.employment_status) params.set("employment_status", filters.employment_status);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/staff${query}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function searchStaff(term: string): Promise<Staff[]> {
  const res = await fetch(`${API_BASE}/staff/search?q=${encodeURIComponent(term)}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchStaffById(id: number): Promise<Staff> {
  const res = await fetch(`${API_BASE}/staff/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createStaff(data: Partial<Staff>): Promise<Staff> {
  const res = await fetch(`${API_BASE}/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function updateStaff(id: number, data: Partial<Staff>): Promise<Staff> {
  const res = await fetch(`${API_BASE}/staff/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function deactivateStaff(id: number): Promise<Staff> {
  const res = await fetch(`${API_BASE}/staff/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
