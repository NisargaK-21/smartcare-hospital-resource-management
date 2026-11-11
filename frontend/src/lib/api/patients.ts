import { API_BASE } from "@/lib/utils/constants";
import type { Patient } from "@/types/patient";

export async function fetchPatients(filters?: {
  is_active?: string;
  gender?: string;
  blood_group?: string;
}): Promise<Patient[]> {
  const params = new URLSearchParams();
  if (filters?.is_active) params.set("is_active", filters.is_active);
  if (filters?.gender) params.set("gender", filters.gender);
  if (filters?.blood_group) params.set("blood_group", filters.blood_group);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/patients${query}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function searchPatients(term: string): Promise<Patient[]> {
  const res = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(term)}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchPatientById(id: number): Promise<Patient> {
  const res = await fetch(`${API_BASE}/patients/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createPatient(data: Partial<Patient>): Promise<Patient> {
  const res = await fetch(`${API_BASE}/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function updatePatient(id: number, data: Partial<Patient>): Promise<Patient> {
  const res = await fetch(`${API_BASE}/patients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function deactivatePatient(id: number): Promise<Patient> {
  const res = await fetch(`${API_BASE}/patients/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
