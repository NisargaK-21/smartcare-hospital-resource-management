import { API_BASE } from "@/lib/utils/constants";
import type { Bed } from "@/types/bed";

export async function fetchBeds(filters?: {
  ward_id?: number;
  room_id?: number;
  bed_type?: string;
  bed_status?: string;
  is_active?: string;
}): Promise<Bed[]> {
  const params = new URLSearchParams();
  if (filters?.ward_id !== undefined) params.set("ward_id", String(filters.ward_id));
  if (filters?.room_id !== undefined) params.set("room_id", String(filters.room_id));
  if (filters?.bed_type) params.set("bed_type", filters.bed_type);
  if (filters?.bed_status) params.set("bed_status", filters.bed_status);
  if (filters?.is_active) params.set("is_active", filters.is_active);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/beds${query}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchBedById(id: number): Promise<Bed> {
  const res = await fetch(`${API_BASE}/beds/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createBed(data: Partial<Bed>): Promise<Bed> {
  const res = await fetch(`${API_BASE}/beds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function updateBed(id: number, data: Partial<Bed>): Promise<Bed> {
  const res = await fetch(`${API_BASE}/beds/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function deactivateBed(id: number): Promise<Bed> {
  const res = await fetch(`${API_BASE}/beds/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function activateBed(id: number): Promise<Bed> {
  const res = await fetch(`${API_BASE}/beds/${id}/activate`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
