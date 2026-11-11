import { API_BASE } from "@/lib/utils/constants";
import type { Transfer } from "@/types/transfer";

export async function fetchTransfers(): Promise<Transfer[]> {
  const res = await fetch(`${API_BASE}/transfers`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createTransfer(data: {
  admission_id: number;
  to_bed_id: number;
  transfer_reason: string;
  transferred_by?: number;
}): Promise<Transfer> {
  const res = await fetch(`${API_BASE}/transfers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function completeTransfer(id: number): Promise<Transfer> {
  const res = await fetch(`${API_BASE}/transfers/${id}/complete`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function cancelTransfer(id: number): Promise<Transfer> {
  const res = await fetch(`${API_BASE}/transfers/${id}/cancel`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
