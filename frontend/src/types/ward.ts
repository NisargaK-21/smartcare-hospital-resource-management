export interface Ward {
  ward_id: number;
  ward_name: string;
  ward_code: string;
  ward_type: "GENERAL" | "ICU";
  capacity: number;
  department_id: number;
  department_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
