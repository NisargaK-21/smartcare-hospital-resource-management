import { API_BASE } from "@/lib/utils/constants";
import type { Role } from "@/types/role";

export async function fetchRoles(): Promise<Role[]> {
  const res = await fetch(`${API_BASE}/roles`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchRoleById(id: number): Promise<Role> {
  const res = await fetch(`${API_BASE}/roles/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createRole(data: Partial<Role>): Promise<Role> {
  const res = await fetch(`${API_BASE}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function updateRole(id: number, data: Partial<Role>): Promise<Role> {
  const res = await fetch(`${API_BASE}/roles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function deactivateRole(id: number): Promise<Role> {
  const res = await fetch(`${API_BASE}/roles/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
