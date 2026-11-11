import { API_BASE } from "@/lib/utils/constants";
import type { Department } from "@/types/department";

export async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch(`${API_BASE}/departments`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchDepartmentById(id: number): Promise<Department> {
  const res = await fetch(`${API_BASE}/departments/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createDepartment(data: Partial<Department>): Promise<Department> {
  const res = await fetch(`${API_BASE}/departments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function updateDepartment(id: number, data: Partial<Department>): Promise<Department> {
  const res = await fetch(`${API_BASE}/departments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function deactivateDepartment(id: number): Promise<Department> {
  const res = await fetch(`${API_BASE}/departments/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
