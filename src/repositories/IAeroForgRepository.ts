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

export interface IAeroForgRepository {
  getHeliosOrders(): Promise<Order[]>;
  getHeliosOrderById(id: string): Promise<Order | null>;
  importHeliosOrdersCsv(csvData: string): Promise<void>;
  
  getOperators(): Promise<Operator[]>;
  getTeams(): Promise<Team[]>;
  getShifts(): Promise<Shift[]>;
  
  getPlanningTasks(orderId: string): Promise<Task[]>;
  getExecutionHistory(orderId: string): Promise<TimeLog[]>;
  
  assignTeamToOrder(orderId: string, teamId: string): Promise<void>;
  assignOperatorToTask(taskId: string, operatorId: string): Promise<void>;
  
  updatePlanningStatus(orderId: string, status: string): Promise<void>;
  updateTaskStatus(taskId: string, isCompleted: boolean): Promise<void>;
  
  createQualityCheck(orderId: string, status: 'ACCEPTED' | 'REJECTED', checkedBy: string, notes?: string): Promise<void>;
  createReworkLog(orderId: string, reason: string): Promise<void>;
  
  calculateOrderRealisationMetrics(orderId: string): Promise<OrderRealisationMetrics>;
  
  getFeedbackMappings(): Promise<HeliosFeedbackMapping[]>;
  generateHeliosFeedbackQueue(): Promise<any[]>;
  exportHeliosFeedbackCsv(): Promise<string>;
}
