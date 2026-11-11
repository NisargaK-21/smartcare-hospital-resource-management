import { API_BASE } from "@/lib/utils/constants";
import type { ResourceAllocation } from "@/types/icu-resource";

export async function fetchResourceAllocations(): Promise<ResourceAllocation[]> {
  const res = await fetch(`${API_BASE}/resource-allocations`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createResourceAllocation(data: {
  icu_resource_id: number;
  admission_id: number;
  quantity: number;
  notes?: string;
}): Promise<ResourceAllocation> {
  const res = await fetch(`${API_BASE}/resource-allocations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function releaseResourceAllocation(
  id: number,
): Promise<ResourceAllocation> {
  const res = await fetch(`${API_BASE}/resource-allocations/${id}/release`, {
    method: "PUT",
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function cancelResourceAllocation(
  id: number,
): Promise<ResourceAllocation> {
  const res = await fetch(`${API_BASE}/resource-allocations/${id}/cancel`, {
    method: "PUT",
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
