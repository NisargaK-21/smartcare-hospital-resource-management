import { API_BASE } from "@/lib/utils/constants";
import type { Ward } from "@/types/ward";

export async function fetchWards(filters?: {
  department_id?: number;
  ward_type?: string;
  is_active?: string;
}): Promise<Ward[]> {
  const params = new URLSearchParams();
  if (filters?.department_id !== undefined) params.set("department_id", String(filters.department_id));
  if (filters?.ward_type) params.set("ward_type", filters.ward_type);
  if (filters?.is_active) params.set("is_active", filters.is_active);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/wards${query}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchWardById(id: number): Promise<Ward> {
  const res = await fetch(`${API_BASE}/wards/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createWard(data: Partial<Ward>): Promise<Ward> {
  const res = await fetch(`${API_BASE}/wards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function updateWard(id: number, data: Partial<Ward>): Promise<Ward> {
  const res = await fetch(`${API_BASE}/wards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function deactivateWard(id: number): Promise<Ward> {
  const res = await fetch(`${API_BASE}/wards/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
