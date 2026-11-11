import { API_BASE } from "@/lib/utils/constants";
import type { Bed } from "@/types/bed";
import type { IcuResource } from "@/types/icu-resource";

export async function fetchIcuResources(): Promise<IcuResource[]> {
  const res = await fetch(`${API_BASE}/icu-resources`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchIcuResourceById(id: number): Promise<IcuResource> {
  const res = await fetch(`${API_BASE}/icu-resources/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createIcuResource(data: {
  bed_id: number;
  resource_type: string;
  resource_name: string;
  quantity: number;
  unit: string;
  notes?: string;
}): Promise<IcuResource> {
  const res = await fetch(`${API_BASE}/icu-resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function updateIcuResource(
  id: number,
  data: Partial<IcuResource>,
): Promise<IcuResource> {
  const res = await fetch(`${API_BASE}/icu-resources/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchIcuBeds(): Promise<Bed[]> {
  const res = await fetch(`${API_BASE}/beds?bed_type=ICU`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
