import { 
  Order, 
  Task, 
  TimeLog, 
  Operator, 
  Team, 
  Shift, 
  OrderRealisationMetrics,
  HeliosFeedbackMapping
} from "../domain/interfaces";
import { IAeroForgRepository } from "./IAeroForgRepository";

/**
 * Placeholder for future Supabase integration.
 * Currently unimplemented as per user request to keep workflow local with SQLite.
 */
export class SupabaseAeroForgRepository implements IAeroForgRepository {
  async getHeliosOrders(): Promise<Order[]> { throw new Error("Method not implemented."); }
  async getHeliosOrderById(id: string): Promise<Order | null> { throw new Error("Method not implemented."); }
  async importHeliosOrdersCsv(csvData: string): Promise<void> { throw new Error("Method not implemented."); }
  async getOperators(): Promise<Operator[]> { throw new Error("Method not implemented."); }
  async getTeams(): Promise<Team[]> { throw new Error("Method not implemented."); }
  async getShifts(): Promise<Shift[]> { throw new Error("Method not implemented."); }
  async getPlanningTasks(orderId: string): Promise<Task[]> { throw new Error("Method not implemented."); }
  async getExecutionHistory(orderId: string): Promise<TimeLog[]> { throw new Error("Method not implemented."); }
  async assignTeamToOrder(orderId: string, teamId: string): Promise<void> { throw new Error("Method not implemented."); }
  async assignOperatorToTask(taskId: string, operatorId: string): Promise<void> { throw new Error("Method not implemented."); }
  async updatePlanningStatus(orderId: string, status: string): Promise<void> { throw new Error("Method not implemented."); }
  async updateTaskStatus(taskId: string, isCompleted: boolean): Promise<void> { throw new Error("Method not implemented."); }
  async createQualityCheck(orderId: string, status: 'ACCEPTED' | 'REJECTED', checkedBy: string, notes?: string): Promise<void> { throw new Error("Method not implemented."); }
  async createReworkLog(orderId: string, reason: string): Promise<void> { throw new Error("Method not implemented."); }
  async calculateOrderRealisationMetrics(orderId: string): Promise<OrderRealisationMetrics> { throw new Error("Method not implemented."); }
  async getFeedbackMappings(): Promise<HeliosFeedbackMapping[]> { throw new Error("Method not implemented."); }
  async generateHeliosFeedbackQueue(): Promise<any[]> { throw new Error("Method not implemented."); }
  async exportHeliosFeedbackCsv(): Promise<string> { throw new Error("Method not implemented."); }
}
