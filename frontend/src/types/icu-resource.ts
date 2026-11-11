export type ResourceStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE";

export interface IcuResource {
  icu_resource_id: number;
  bed_id: number;
  resource_name: string;
  resource_type: string;
  resource_status: ResourceStatus;
  quantity: number;
  unit: string | null;
  notes: string | null;
  last_checked_at: string | null;
  bed_number: string;
  bed_bed_type: string;
  bed_status: string;
  room_number: string;
  ward_name: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceAllocation {
  allocation_id: number;
  icu_resource_id: number;
  admission_id: number;
  quantity: number;
  allocation_status: "ACTIVE" | "RELEASED" | "CANCELLED";
  allocated_at: string;
  released_at: string | null;
  notes: string | null;
  resource_type: string;
  resource_name: string;
  resource_status: ResourceStatus;
  unit: string | null;
  admission_status: string;
  created_at: string;
  updated_at: string;
}
