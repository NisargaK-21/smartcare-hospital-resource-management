export interface DashboardStats {
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  reserved_beds: number;
  maintenance_beds: number;
  total_patients: number;
  total_staff: number;
  total_departments: number;
  total_wards: number;
  occupancy_rate: number;
}

export interface WardOccupancy {
  ward_id: number;
  ward_name: string;
  ward_type: string;
  department_name: string;
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  occupancy_rate: number;
}

export interface DepartmentStat {
  department_id: number;
  department_name: string;
  department_code: string;
  total_wards: number;
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  active_staff: number;
  occupancy_rate: number;
}

export interface StaffSummary {
  total_active: number;
  total_on_leave: number;
  total_inactive: number;
  total_terminated: number;
  total_all: number;
}

export interface RecentPatient {
  patient_id: number;
  patient_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  blood_group: string | null;
  created_at: string;
}
