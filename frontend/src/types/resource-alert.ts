export type ResourceAlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface ResourceAlert {
  alert_type: string;
  severity: ResourceAlertSeverity | string;
  message: string;
  resource_id?: string;
  resource_name?: string;
  resource_type?: string;
  bed_id?: string;
  bed_number?: string;
  bed_type?: string;
  bed_status?: string;
  maintenance_id?: string;
  maintenance_reason?: string;
  available_quantity?: number | string;
}
