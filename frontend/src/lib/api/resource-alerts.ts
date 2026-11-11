import { API_BASE } from "@/lib/utils/constants";
import type { ResourceAlert } from "@/types/resource-alert";

export async function fetchResourceAlerts(): Promise<ResourceAlert[]> {
  const res = await fetch(`${API_BASE}/resource-alerts`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
