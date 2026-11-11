import { API_BASE } from "@/lib/utils/constants";
import type { Discharge } from "@/types/discharge";

export async function fetchDischarges(): Promise<Discharge[]> {
  const res = await fetch(`${API_BASE}/discharges`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createDischarge(data: {
  admission_id: number;
  discharge_reason: string;
  discharged_by?: number;
  notes?: string;
}): Promise<Discharge> {
  const res = await fetch(`${API_BASE}/discharges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function completeDischarge(id: number): Promise<Discharge> {
  const res = await fetch(`${API_BASE}/discharges/${id}/complete`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function cancelDischarge(id: number): Promise<Discharge> {
  const res = await fetch(`${API_BASE}/discharges/${id}/cancel`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
