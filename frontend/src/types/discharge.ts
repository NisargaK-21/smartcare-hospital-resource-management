export type DischargeStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface Discharge {
  discharge_id: number;
  admission_id: number;
  patient_id: number;
  patient_name: string;
  patient_number: string;
  bed_id: number | null;
  discharge_date: string | null;
  discharge_reason: string;
  discharge_status: DischargeStatus;
  discharged_by: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
