import { 
  HeliosOrder,
  PlanningJob,
  PlanningTask,
  TaskStatus,
  TimeLog, 
  Operator, 
  Team, 
  Shift, 
  OrderRealisationMetrics,
  HeliosFeedbackMapping,
  AppUser,
  AeroForgRole
} from "../domain/interfaces";

export interface IAeroForgRepository {
  // User Management
  getAppUsers(): Promise<AppUser[]>;
  getAppUserById(id: string): Promise<AppUser | null>;
  getUsersByRole(role: AeroForgRole): Promise<AppUser[]>;
  createAppUser(user: Partial<AppUser>): Promise<AppUser>;
  updateAppUser(userId: string, patch: Partial<AppUser>): Promise<void>;
  deactivateAppUser(userId: string): Promise<void>;

  // Helios Orders (ERP integration layer)
  getHeliosOrders(): Promise<HeliosOrder[]>;
  getHeliosOrderById(id: string): Promise<HeliosOrder | null>;
  importHeliosOrdersCsv(csvData: string): Promise<void>;
  importHeliosOrder(orderData: any): Promise<void>;
  createHeliosOrder(orderData: any): Promise<HeliosOrder>;
  updateHeliosOrder(id: string, patch: any): Promise<void>;
  deleteHeliosOrder(id: string): Promise<void>;
  deleteAllHeliosOrders(): Promise<void>;
  
  // Planning Jobs (editable AeroForg layer)
  getPlanningJobs(): Promise<PlanningJob[]>;
  getPlanningJobById(id: string): Promise<PlanningJob | null>;
  createPlanningJob(heliosOrderId: string, createdByUserId?: string): Promise<PlanningJob>;
  updatePlanningJob(jobId: string, patch: Partial<PlanningJob>): Promise<void>;
  deletePlanningJob(jobId: string): Promise<void>;

  getOperators(): Promise<Operator[]>;
  getTeams(): Promise<Team[]>;
  getShifts(): Promise<Shift[]>;
  
  // Planning Tasks
  getPlanningTasks(jobId: string): Promise<PlanningTask[]>;
  createPlanningTask(task: Partial<PlanningTask>): Promise<PlanningTask>;
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  assignOperatorToTask(taskId: string, operatorId: string): Promise<void>;

  getExecutionHistory(jobId: string): Promise<TimeLog[]>;
  
  assignTeamToJob(jobId: string, teamId: string): Promise<void>;
  updateJobStatus(jobId: string, status: string): Promise<void>;
  
  createQualityCheck(jobId: string, status: 'ACCEPTED' | 'REJECTED', checkedBy: string, notes?: string): Promise<void>;
  createReworkLog(jobId: string, reason: string): Promise<void>;
  
  calculateJobRealisationMetrics(jobId: string): Promise<OrderRealisationMetrics>;
  
  getFeedbackMappings(): Promise<HeliosFeedbackMapping[]>;
  createFeedbackMapping(mapping: Partial<HeliosFeedbackMapping>): Promise<HeliosFeedbackMapping>;
  updateFeedbackMapping(id: string, patch: Partial<HeliosFeedbackMapping>): Promise<void>;
  deleteFeedbackMapping(id: string): Promise<void>;
  saveFeedbackMappings(mappings: HeliosFeedbackMapping[]): Promise<void>;
  generateHeliosFeedbackQueue(): Promise<any[]>;
  exportHeliosFeedbackCsv(): Promise<string>;
}
