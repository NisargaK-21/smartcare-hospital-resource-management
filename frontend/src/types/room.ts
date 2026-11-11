export interface Room {
  room_id: number;
  room_number: string;
  room_type: string;
  capacity: number;
  description: string | null;
  ward_id: number;
  ward_name?: string;
  ward_code?: string;
  department_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
