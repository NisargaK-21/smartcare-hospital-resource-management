import { API_BASE } from "@/lib/utils/constants";
import type { Admission } from "@/types/admission";

export async function fetchAdmissions(): Promise<Admission[]> {
  const res = await fetch(`${API_BASE}/admissions`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchAdmissionById(id: number): Promise<Admission> {
  const res = await fetch(`${API_BASE}/admissions/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createAdmission(data: {
  patient_id: number;
  required_bed_type: string;
  admission_type: string;
  reason?: string;
  admitted_by?: number;
}): Promise<Admission> {
  const res = await fetch(`${API_BASE}/admissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function allocateBed(id: number): Promise<{ admission: Admission; bed: unknown }> {
  const res = await fetch(`${API_BASE}/admissions/${id}/allocate-bed`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function cancelAdmission(id: number): Promise<Admission> {
  const res = await fetch(`${API_BASE}/admissions/${id}/cancel`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
