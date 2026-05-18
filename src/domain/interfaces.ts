export interface Order {
  id: string;
  label: string;
  part_number: string;
  estimated_hours: number;
  quality_status: string; // 'OPEN', 'ACCEPTED', 'REJECTED'
  rework_count: number;
  raw_helios_row?: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  order_id: string;
  label: string;
  estimated_hours: number;
  is_completed: boolean;
  assigned_operator_id?: string;
  created_at: string;
}

export interface TimeLog {
  id: string;
  task_id: string;
  duration_hours: number;
  is_validated: boolean;
  logged_at: string;
  type: 'PRODUCTION' | 'REWORK';
}

export interface Operator {
  id: string;
  operator_code: string;
  name: string;
  team_id?: string;
  initials: string;
  main_role: string;
  is_active: boolean;
}

export interface Team {
  id: string;
  name: string;
  shift_id?: string;
}

export interface Shift {
  id: string;
  name: string; // e.g. 'Morning', 'Afternoon', 'Night'
}

export interface QualityCheck {
  id: string;
  order_id: string;
  status: 'ACCEPTED' | 'REJECTED';
  checked_by: string;
  checked_at: string;
  notes?: string;
}

export interface ReworkLog {
  id: string;
  order_id: string;
  reason: string;
  created_at: string;
}

export interface HeliosFeedbackMapping {
  id: string;
  aeroforg_field: string;
  helios_field_name: string;
  helios_meaning?: string;
  is_enabled: boolean;
  created_at: string;
}

export interface OrderRealisationMetrics {
  realisation_time_hours: number;
  realisation_progress_percent: number;
  time_consumption_percent: number;
  computed_status: string;
}
