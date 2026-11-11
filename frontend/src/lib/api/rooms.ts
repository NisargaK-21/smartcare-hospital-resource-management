import { API_BASE } from "@/lib/utils/constants";
import type { Room } from "@/types/room";

export async function fetchRooms(filters?: {
  ward_id?: number;
  room_type?: string;
  is_active?: string;
}): Promise<Room[]> {
  const params = new URLSearchParams();
  if (filters?.ward_id !== undefined) params.set("ward_id", String(filters.ward_id));
  if (filters?.room_type) params.set("room_type", filters.room_type);
  if (filters?.is_active) params.set("is_active", filters.is_active);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/rooms${query}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchRoomById(id: number): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createRoom(data: Partial<Room>): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function updateRoom(id: number, data: Partial<Room>): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function deactivateRoom(id: number): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
