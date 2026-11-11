export type BedStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
export type BedType = "STANDARD" | "ELECTRIC" | "ICU" | "PEDIATRIC" | "BARIATRIC";

export interface Bed {
  bed_id: number;
  bed_number: string;
  bed_type: BedType;
  bed_status: BedStatus;
  description: string | null;
  room_id: number;
  room_number?: string;
  room_type?: string;
  ward_id?: number;
  ward_name?: string;
  department_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
