export type TransferStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface Transfer {
  transfer_id: number;
  admission_id: number;
  patient_id: number;
  patient_name: string;
  patient_number: string;
  from_bed_id: number | null;
  from_bed_number: string | null;
  from_bed_type: string | null;
  to_bed_id: number;
  to_bed_number: string;
  to_bed_type: string;
  transfer_date: string | null;
  transfer_reason: string;
  transfer_status: TransferStatus;
  transferred_by: number | null;
  created_at: string;
  updated_at: string;
}
