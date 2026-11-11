import { API_BASE } from "@/lib/utils/constants";
import type { MaintenanceRecord } from "@/types/maintenance";

export async function fetchMaintenance(): Promise<MaintenanceRecord[]> {
  const res = await fetch(`${API_BASE}/maintenance`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createMaintenance(data: {
  bed_id?: number;
  icu_resource_id?: number;
  maintenance_reason: string;
  notes?: string;
}): Promise<MaintenanceRecord> {
  const res = await fetch(`${API_BASE}/maintenance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function startMaintenance(id: number): Promise<MaintenanceRecord> {
  const res = await fetch(`${API_BASE}/maintenance/${id}/start`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function completeMaintenance(id: number): Promise<MaintenanceRecord> {
  const res = await fetch(`${API_BASE}/maintenance/${id}/complete`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function cancelMaintenance(id: number): Promise<MaintenanceRecord> {
  const res = await fetch(`${API_BASE}/maintenance/${id}/cancel`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
