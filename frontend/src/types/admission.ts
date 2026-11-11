export type AdmissionStatus = "PENDING" | "ACTIVE" | "CANCELLED" | "DISCHARGED";
export type RequiredBedType = "GENERAL" | "ICU" | "EMERGENCY" | "PRIVATE";
export type AdmissionType = "PLANNED" | "EMERGENCY" | "TRANSFER";

export interface Admission {
  admission_id: number;
  patient_id: number;
  patient_name: string;
  medical_record_number: string;
  required_bed_type: RequiredBedType;
  admission_type: AdmissionType;
  admission_status: AdmissionStatus;
  reason: string | null;
  admitted_by: number | null;
  bed_id: number | null;
  bed_number: string | null;
  bed_type: string | null;
  bed_status: string | null;
  admission_date: string;
  created_at: string;
  updated_at: string;
}
