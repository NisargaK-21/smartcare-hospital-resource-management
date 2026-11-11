export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "EXPIRED";

export interface Reservation {
  reservation_id: number;
  patient_id: number;
  patient_name: string;
  patient_number: string;
  bed_id: number;
  bed_number: string;
  bed_type: string;
  reservation_start: string;
  reservation_end: string | null;
  reservation_status: ReservationStatus;
  reserved_by: number | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}
