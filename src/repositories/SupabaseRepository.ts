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
import { IAeroForgRepository } from "./IAeroForgRepository";

/**
 * Placeholder for future Supabase integration.
 * Currently unimplemented as per user request to keep workflow local with SQLite.
 */
export class SupabaseAeroForgRepository implements IAeroForgRepository {
  async getAppUsers(): Promise<AppUser[]> { throw new Error("Method not implemented."); }
  async getAppUserById(id: string): Promise<AppUser | null> { throw new Error("Method not implemented."); }
  async getUsersByRole(role: AeroForgRole): Promise<AppUser[]> { throw new Error("Method not implemented."); }
  async createAppUser(user: Partial<AppUser>): Promise<AppUser> { throw new Error("Method not implemented."); }
  async updateAppUser(userId: string, patch: Partial<AppUser>): Promise<void> { throw new Error("Method not implemented."); }
  async deactivateAppUser(userId: string): Promise<void> { throw new Error("Method not implemented."); }

  async getHeliosOrders(): Promise<HeliosOrder[]> { throw new Error("Method not implemented."); }
  async getHeliosOrderById(id: string): Promise<HeliosOrder | null> { throw new Error("Method not implemented."); }
  async importHeliosOrdersCsv(csvData: string): Promise<void> { throw new Error("Method not implemented."); }
  async importHeliosOrder(orderData: any): Promise<void> { throw new Error("Method not implemented."); }
  async createHeliosOrder(order: Partial<HeliosOrder>): Promise<HeliosOrder> { throw new Error("Method not implemented."); }
  async updateHeliosOrder(id: string, patch: Partial<HeliosOrder>): Promise<void> { throw new Error("Method not implemented."); }
  async deleteHeliosOrder(id: string): Promise<void> { throw new Error("Method not implemented."); }
  async deleteAllHeliosOrders(): Promise<void> { throw new Error("Method not implemented."); }
  
  async getPlanningJobs(): Promise<PlanningJob[]> { throw new Error("Method not implemented."); }
  async getPlanningJobById(id: string): Promise<PlanningJob | null> { throw new Error("Method not implemented."); }
  async createPlanningJob(heliosOrderId: string, createdByUserId?: string): Promise<PlanningJob> { throw new Error("Method not implemented."); }
  async updatePlanningJob(jobId: string, patch: Partial<PlanningJob>): Promise<void> { throw new Error("Method not implemented."); }
  async deletePlanningJob(jobId: string): Promise<void> { throw new Error("Method not implemented."); }
  async getOperators(): Promise<Operator[]> { throw new Error("Method not implemented."); }
  async getTeams(): Promise<Team[]> { throw new Error("Method not implemented."); }
  async getShifts(): Promise<Shift[]> { throw new Error("Method not implemented."); }
  async getPlanningTasks(jobId: string): Promise<PlanningTask[]> { throw new Error("Method not implemented."); }
  async createPlanningTask(task: Partial<PlanningTask>): Promise<PlanningTask> { throw new Error("Method not implemented."); }
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> { throw new Error("Method not implemented."); }
  async assignOperatorToTask(taskId: string, operatorId: string): Promise<void> { throw new Error("Method not implemented."); }

  async getExecutionHistory(jobId: string): Promise<TimeLog[]> { throw new Error("Method not implemented."); }
  
  async assignTeamToJob(jobId: string, teamId: string): Promise<void> { throw new Error("Method not implemented."); }
  async updateJobStatus(jobId: string, status: string): Promise<void> { throw new Error("Method not implemented."); }
  
  async createQualityCheck(jobId: string, status: 'ACCEPTED' | 'REJECTED', checkedBy: string, notes?: string): Promise<void> { throw new Error("Method not implemented."); }
  async createReworkLog(jobId: string, reason: string): Promise<void> { throw new Error("Method not implemented."); }
  
  async calculateJobRealisationMetrics(jobId: string): Promise<OrderRealisationMetrics> { throw new Error("Method not implemented."); }
  
  async getFeedbackMappings(): Promise<HeliosFeedbackMapping[]> { throw new Error("Method not implemented."); }
  async createFeedbackMapping(mapping: Partial<HeliosFeedbackMapping>): Promise<HeliosFeedbackMapping> { throw new Error("Method not implemented."); }
  async updateFeedbackMapping(id: string, patch: Partial<HeliosFeedbackMapping>): Promise<void> { throw new Error("Method not implemented."); }
  async deleteFeedbackMapping(id: string): Promise<void> { throw new Error("Method not implemented."); }
  async saveFeedbackMappings(mappings: HeliosFeedbackMapping[]): Promise<void> { throw new Error("Method not implemented."); }
  async generateHeliosFeedbackQueue(): Promise<any[]> { throw new Error("Method not implemented."); }
  async exportHeliosFeedbackCsv(): Promise<string> { throw new Error("Method not implemented."); }
}
