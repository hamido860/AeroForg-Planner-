export type AeroForgRole =
  | "ADMIN"
  | "PLANNER"
  | "SUPERVISOR"
  | "TEAM_LEADER"
  | "QUALITY_AGENT"
  | "OPERATOR"
  | "MATERIAL_RESPONSIBLE";

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: AeroForgRole;
  team_id?: string | null;
  operator_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HeliosOrder {
  id: string; // Internal or ERP id
  erp_order_id?: string;
  part_reference: string;
  designation: string;
  quantity: number;
  estimated_load_hours: number;
  aircraft_zone?: string;
  work_center_code?: string;
  order_status: "IMPORTED" | "REVIEWED" | "IGNORED" | "ARCHIVED";
  raw_helios_row?: string; // JSON string
  created_at: string;
  updated_at: string;
}

export type PlanningJobStatus = "DRAFT" | "READY_TO_SCHEDULE" | "SCHEDULED" | "IN_PROGRESS" | "BLOCKED" | "FINISH" | "CANCELLED";

export interface PlanningJob {
  id: string;
  planning_job_code: string;
  helios_order_id: string;
  assigned_team_id?: string | null;
  job_status: PlanningJobStatus;
  planning_start_at?: string | null;
  planning_end_at?: string | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  planning_risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  material_risk: "NONE" | "PARTIAL" | "MISSING";
  is_schedulable: boolean;
  planning_comment?: string | null;
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 
  | "OPEN" 
  | "ASSIGNED" 
  | "OUT_START" 
  | "IN_PROGRESS" 
  | "DONE" 
  | "QUALITY_PENDING" 
  | "REWORK_REQUESTED" 
  | "FINISH";

export type TaskQualityStatus = "OPEN" | "ACCEPTED" | "REJECTED" | "REWORK_REQUESTED";

export interface PlanningTask {
  id: string;
  planning_job_id: string;
  task_code: string;
  label: string;
  task_type: "FABRICATION_TASK";
  sequence_order: number;
  estimated_hours: number;
  planned_start_at?: string;
  planned_end_at?: string;
  scheduled_start_at?: string;
  scheduled_end_at?: string;
  assigned_operator_id?: string;
  assigned_team_id?: string;
  task_status: TaskStatus;
  quality_status: TaskQualityStatus;
  created_at: string;
  updated_at: string;
}

export interface TimeLog {
  id: string;
  planning_task_id: string;
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
  
  // Computed experience / versatility metrics
  same_part_success_count?: number;
  same_designation_success_count?: number;
  same_zone_success_count?: number;
  same_work_center_success_count?: number;
  fabrication_task_success_count?: number;
  rework_rate?: number;
  last_accepted_fabrication_task_at?: string;
  available_hours?: number;
  experience_level?: string;
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

export interface SchedulerJob {
  id: string;
  planning_job_code: string;

  helios_order_id: string;
  erp_order_id: string;

  designation: string;
  part_reference: string;
  aircraft_zone: string;
  work_center_code: string;
  quantity: number;
  estimated_load_hours: number;

  planned_start_at: string | null;
  planned_end_at: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;

  assigned_team_id: string | null;
  assigned_team_name: string | null;

  material_risk: "NONE" | "PARTIAL" | "MISSING";
  planning_risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  job_status: "DRAFT" | "READY_TO_SCHEDULE" | "SCHEDULED" | "IN_PROGRESS" | "BLOCKED" | "FINISH";

  realisation_time_hours: number;
  realisation_progress_percent: number;
  time_consumption_percent: number;

  quality_status: string;
  rework_count: number;
  raw_helios_row?: string | null;
}

export type EnrichedOrder = HeliosOrder & OrderRealisationMetrics;
