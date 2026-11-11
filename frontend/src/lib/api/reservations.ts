import { API_BASE } from "@/lib/utils/constants";
import type { Reservation } from "@/types/reservation";

export async function fetchReservations(): Promise<Reservation[]> {
  const res = await fetch(`${API_BASE}/bed-reservations`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchReservationById(id: number): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/bed-reservations/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createReservation(data: {
  patient_id: number;
  bed_id: number;
  reservation_start: string;
  reservation_end?: string;
  reserved_by?: number;
  reason?: string;
}): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/bed-reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function confirmReservation(id: number): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/bed-reservations/${id}/confirm`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function cancelReservation(id: number): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/bed-reservations/${id}/cancel`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function completeReservation(id: number): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/bed-reservations/${id}/complete`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function expireReservation(id: number): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/bed-reservations/${id}/expire`, { method: "PUT" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
