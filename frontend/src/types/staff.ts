export interface Staff {
  staff_id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  role_id: number;
  role_name?: string;
  department_id: number;
  department_name?: string;
  designation: string | null;
  phone: string;
  email: string | null;
  hire_date: string;
  employment_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
