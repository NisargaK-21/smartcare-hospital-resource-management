export type MaintenanceStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface MaintenanceRecord {
  maintenance_id: number;
  bed_id: number | null;
  icu_resource_id: number | null;
  maintenance_reason: string;
  maintenance_status: MaintenanceStatus;
  notes: string | null;
  maintenance_start: string | null;
  maintenance_completed_at: string | null;
  created_at: string;
  updated_at: string;
  bed_number: string | null;
  bed_type: string | null;
  resource_name: string | null;
  resource_type: string | null;
}
