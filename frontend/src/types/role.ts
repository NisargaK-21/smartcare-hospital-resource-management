export interface Role {
  role_id: number;
  role_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
