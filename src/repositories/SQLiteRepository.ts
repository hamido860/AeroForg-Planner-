import Database from "better-sqlite3";
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
import { randomUUID as nodeRandomUUID } from "crypto";

const randomUUID = () => {
  if (typeof nodeRandomUUID === 'function') return nodeRandomUUID();
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export class SQLiteAeroForgRepository implements IAeroForgRepository {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        part_number TEXT NOT NULL,
        estimated_hours REAL DEFAULT 0,
        quality_status TEXT DEFAULT 'OPEN',
        rework_count INTEGER DEFAULT 0,
        raw_helios_row TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        shift_id TEXT,
        FOREIGN KEY (shift_id) REFERENCES shifts(id)
      );

      CREATE TABLE IF NOT EXISTS operators (
        id TEXT PRIMARY KEY,
        operator_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        main_role TEXT,
        is_active BOOLEAN DEFAULT 1,
        team_id TEXT,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        label TEXT NOT NULL,
        estimated_hours REAL DEFAULT 0,
        is_completed BOOLEAN DEFAULT 0,
        assigned_operator_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (assigned_operator_id) REFERENCES operators(id)
      );

      CREATE TABLE IF NOT EXISTS time_logs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        duration_hours REAL NOT NULL,
        is_validated BOOLEAN DEFAULT 0,
        type TEXT DEFAULT 'PRODUCTION',
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS quality_checks (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        status TEXT NOT NULL,
        checked_by TEXT NOT NULL,
        notes TEXT,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );

      CREATE TABLE IF NOT EXISTS rework_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );

      CREATE TABLE IF NOT EXISTS helios_feedback_field_mapping (
        id TEXT PRIMARY KEY,
        aeroforg_field TEXT NOT NULL,
        helios_field_name TEXT NOT NULL,
        helios_meaning TEXT,
        is_enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    this.seedIfNeeded();
  }

  private seedIfNeeded() {
    const orderCount = this.db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
    if (orderCount.count === 0) {
      // Seed Shifts
      const shifts = ["Shift 1", "Shift 2", "Shift 3"];
      const shiftMap = new Map<string, string>();
      shifts.forEach(s => {
        const id = randomUUID();
        this.db.prepare("INSERT INTO shifts (id, name) VALUES (?, ?)").run(id, s);
        shiftMap.set(s, id);
      });

      // Seed Teams
      const teams = [
        { name: "Team A", shift: "Shift 1" },
        { name: "Team B", shift: "Shift 2" },
        { name: "Team C", shift: "Shift 3" }
      ];
      const teamMap = new Map<string, string>();
      teams.forEach(t => {
        const id = randomUUID();
        this.db.prepare("INSERT INTO teams (id, name, shift_id) VALUES (?, ?, ?)")
          .run(id, t.name, shiftMap.get(t.shift));
        teamMap.set(t.name, id);
      });

      // Seed Operators
      const rawOperators = [
        ["OP-001","Yassine El Amrani","Team A","Shift 1","Ajusteur Monteur Aérostructure","true"],
        ["OP-002","Mehdi Benkirane","Team A","Shift 1","Ajusteur Monteur Aérostructure","true"],
        ["OP-003","Othmane Raji","Team A","Shift 1","Ajusteur Monteur Aérostructure","true"],
        ["OP-004","Hamza Berrada","Team A","Shift 1","Ajusteur Monteur Aérostructure","true"],
        ["OP-005","Amine Chraibi","Team A","Shift 1","Ajusteur Monteur Aérostructure","true"],
        ["OP-006","Karim El Fassi","Team A","Shift 1","Ajusteur Monteur Aérostructure","true"],
        ["OP-007","Nabil Mansouri","Team A","Shift 1","Ajusteur Monteur Aérostructure","true"],
        ["OP-008","Soufiane Alaoui","Team A","Shift 1","Ajusteur Monteur Aérostructure","true"],
        ["OP-009","Anas El Idrissi","Team A","Shift 1","Ajusteur Monteur Aérostructure","true"],
        ["OP-010","Reda Tazi","Team A","Shift 1","Ajusteur Monteur Aérostructure","true"],
        ["OP-011","Ayoub Lahlou","Team B","Shift 2","Ajusteur Monteur Aérostructure","true"],
        ["OP-012","Marouane Ziani","Team B","Shift 2","Ajusteur Monteur Aérostructure","true"],
        ["OP-013","Younes El Harrak","Team B","Shift 2","Ajusteur Monteur Aérostructure","true"],
        ["OP-014","Hicham Boulahcen","Team B","Shift 2","Ajusteur Monteur Aérostructure","true"],
        ["OP-015","Adil Serghini","Team B","Shift 2","Ajusteur Monteur Aérostructure","true"],
        ["OP-016","Imad El Khatib","Team B","Shift 2","Ajusteur Monteur Aérostructure","true"],
        ["OP-017","Said Bouziane","Team B","Shift 2","Ajusteur Monteur Aérostructure","true"],
        ["OP-018","Walid Ait Omar","Team B","Shift 2","Ajusteur Monteur Aérostructure","true"],
        ["OP-019","Samir El Ghazi","Team B","Shift 2","Ajusteur Monteur Aérostructure","true"],
        ["OP-020","Mourad El Bahri","Team B","Shift 2","Ajusteur Monteur Aérostructure","true"],
        ["OP-021","Rachid El Malki","Team C","Shift 3","Ajusteur Monteur Aérostructure","true"],
        ["OP-022","Ismail Benali","Team C","Shift 3","Ajusteur Monteur Aérostructure","true"],
        ["OP-023","Badr El Ouardi","Team C","Shift 3","Ajusteur Monteur Aérostructure","true"],
        ["OP-024","Fouad Naciri","Team C","Shift 3","Ajusteur Monteur Aérostructure","true"],
        ["OP-025","Tarik El Haddad","Team C","Shift 3","Ajusteur Monteur Aérostructure","true"],
        ["OP-026","Khalid El Youssfi","Team C","Shift 3","Ajusteur Monteur Aérostructure","true"],
        ["OP-027","Mustapha Azzouzi","Team C","Shift 3","Ajusteur Monteur Aérostructure","true"],
        ["OP-028","Jalal El Amine","Team C","Shift 3","Ajusteur Monteur Aérostructure","true"],
        ["OP-029","Abdelilah Rahmani","Team C","Shift 3","Ajusteur Monteur Aérostructure","true"],
        ["OP-030","Noureddine Kabbaj","Team C","Shift 3","Ajusteur Monteur Aérostructure","true"]
      ];

      rawOperators.forEach(op => {
        const [code, name, teamName, _shiftName, role, active] = op;
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        this.db.prepare("INSERT INTO operators (id, operator_code, name, initials, main_role, is_active, team_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(randomUUID(), code, name, initials, role, active === "true" ? 1 : 0, teamMap.get(teamName));
      });

      // Seed Orders
      const hId1 = "110000001";
      this.db.prepare("INSERT INTO orders (id, label, part_number, estimated_hours, quality_status) VALUES (?, ?, ?, ?, ?)")
        .run(hId1, "Order 110000001", "PN-FUS-1", 40, "OPEN");
      
      const firstOpId = this.db.prepare("SELECT id FROM operators LIMIT 1").get() as { id: string };
      const taskId1 = randomUUID();
      this.db.prepare("INSERT INTO tasks (id, order_id, label, estimated_hours, is_completed, assigned_operator_id) VALUES (?, ?, ?, ?, ?, ?)")
        .run(taskId1, hId1, "Preparation", 10, 1, firstOpId.id);
      
      this.db.prepare("INSERT INTO time_logs (id, task_id, duration_hours, is_validated) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), taskId1, 12, 1);

      // Seed mapping
      this.db.prepare("INSERT INTO helios_feedback_field_mapping (id, aeroforg_field, helios_field_name, helios_meaning) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), "REALISATION_TIME_HOURS", "ACT_TIME", "Total actual hours consumed");
      this.db.prepare("INSERT INTO helios_feedback_field_mapping (id, aeroforg_field, helios_field_name, helios_meaning) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), "REALISATION_PROGRESS_PERCENT", "COMP_PCT", "Physical progress percentage");
    }
  }

  async getHeliosOrders(): Promise<Order[]> {
    return this.db.prepare("SELECT * FROM orders").all() as Order[];
  }

  async getHeliosOrderById(id: string): Promise<Order | null> {
    const order = this.db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
    return (order as Order) || null;
  }

  async importHeliosOrdersCsv(csvData: string): Promise<void> {
    // Placeholder for CSV parsing logic
    console.log("Importing CSV data...");
  }

  async getOperators(): Promise<Operator[]> {
    return this.db.prepare("SELECT * FROM operators").all() as Operator[];
  }

  async getTeams(): Promise<Team[]> {
    return this.db.prepare("SELECT * FROM teams").all() as Team[];
  }

  async getShifts(): Promise<Shift[]> {
    return this.db.prepare("SELECT * FROM shifts").all() as Shift[];
  }

  async getPlanningTasks(orderId: string): Promise<Task[]> {
    return this.db.prepare("SELECT * FROM tasks WHERE order_id = ?").all() as Task[];
  }

  async getExecutionHistory(orderId: string): Promise<TimeLog[]> {
    return this.db.prepare(`
      SELECT tl.* FROM time_logs tl
      JOIN tasks t ON tl.task_id = t.id
      WHERE t.order_id = ?
    `).all(orderId) as TimeLog[];
  }

  async assignTeamToOrder(orderId: string, teamId: string): Promise<void> {
    // Assuming a simplified mapping where we update all tasks for now or a different structure
    // In a real app we'd have an order_teams table
  }

  async assignOperatorToTask(taskId: string, operatorId: string): Promise<void> {
    this.db.prepare("UPDATE tasks SET assigned_operator_id = ? WHERE id = ?").run(operatorId, taskId);
  }

  async updatePlanningStatus(orderId: string, status: string): Promise<void> {
    // This could update quality_status or a different status field
    this.db.prepare("UPDATE orders SET quality_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, orderId);
  }

  async updateTaskStatus(taskId: string, isCompleted: boolean): Promise<void> {
    this.db.prepare("UPDATE tasks SET is_completed = ? WHERE id = ?").run(isCompleted ? 1 : 0, taskId);
  }

  async createQualityCheck(orderId: string, status: 'ACCEPTED' | 'REJECTED', checkedBy: string, notes?: string): Promise<void> {
    this.db.prepare("INSERT INTO quality_checks (id, order_id, status, checked_by, notes) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), orderId, status, checkedBy, notes || null);
    
    this.db.prepare("UPDATE orders SET quality_status = ? WHERE id = ?").run(status, orderId);
  }

  async createReworkLog(orderId: string, reason: string): Promise<void> {
    this.db.prepare("INSERT INTO rework_logs (id, order_id, reason) VALUES (?, ?, ?)")
      .run(randomUUID(), orderId, reason);
    this.db.prepare("UPDATE orders SET rework_count = rework_count + 1 WHERE id = ?").run(orderId);
  }

  async calculateOrderRealisationMetrics(orderId: string): Promise<OrderRealisationMetrics> {
    const order = await this.getHeliosOrderById(orderId);
    if (!order) throw new Error("Order not found");

    const timeLogs = this.db.prepare(`
      SELECT SUM(tl.duration_hours) as total 
      FROM time_logs tl
      JOIN tasks t ON tl.task_id = t.id
      WHERE t.order_id = ? AND tl.is_validated = 1
    `).get(orderId) as { total: number };
    const realisation_time_hours = timeLogs.total || 0;

    const tasks = await this.getPlanningTasks(orderId);
    let progress = 0;
    if (tasks.length > 0) {
      const totalEst = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
      const completedEst = tasks.reduce((sum, t) => sum + (t.is_completed ? (t.estimated_hours || 0) : 0), 0);
      if (totalEst > 0) {
        progress = (completedEst / totalEst) * 100;
      } else {
        const completedCount = tasks.filter(t => t.is_completed).length;
        progress = (completedCount / tasks.length) * 100;
      }
    }
    const realisation_progress_percent = Math.min(100, Math.max(0, Number(progress.toFixed(2))));

    const time_consumption_percent = order.estimated_hours > 0 
      ? (realisation_time_hours / order.estimated_hours) * 100 
      : 0;

    // Status logic
    let status = "OPEN";
    const hasStarted = realisation_time_hours > 0;
    const tasksPrepared = tasks.length > 0;
    const isComplete = realisation_progress_percent === 100;
    const isAccepted = order.quality_status === "ACCEPTED";

    if (!hasStarted) {
      status = tasksPrepared ? "OUT START" : "OPEN";
    } else if (realisation_progress_percent < 100) {
      status = "IN PROGRESS";
    } else if (isComplete && !isAccepted) {
      status = "IN PROGRESS";
    } else if (isComplete && isAccepted) {
      status = "FINISH";
    }

    return {
      realisation_time_hours,
      realisation_progress_percent,
      time_consumption_percent: Number(time_consumption_percent.toFixed(2)),
      computed_status: status
    };
  }

  async getFeedbackMappings(): Promise<HeliosFeedbackMapping[]> {
    return this.db.prepare("SELECT * FROM helios_feedback_field_mapping").all() as HeliosFeedbackMapping[];
  }

  async generateHeliosFeedbackQueue(): Promise<any[]> {
    // Collect all orders that need feedback
    const orders = await this.getHeliosOrders();
    const feedback = [];
    for (const order of orders) {
      const metrics = await this.calculateOrderRealisationMetrics(order.id);
      feedback.push({
        ERP_ORDER_ID: order.id,
        REAL_START_AT: order.created_at, // Placeholder
        REAL_FINISH_AT: metrics.computed_status === 'FINISH' ? order.updated_at : null,
        REALISATION_TIME_HOURS: metrics.realisation_time_hours,
        REALISATION_PROGRESS_PERCENT: metrics.realisation_progress_percent,
        TIME_CONSUMPTION_PERCENT: metrics.time_consumption_percent,
        ORDER_STATUS: metrics.computed_status,
        QUALITY_STATUS: order.quality_status,
        REWORK_COUNT: order.rework_count,
        UPDATED_AT: order.updated_at
      });
    }
    return feedback;
  }

  async exportHeliosFeedbackCsv(): Promise<string> {
    const data = await this.generateHeliosFeedbackQueue();
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");
    return `${headers}\n${rows}`;
  }
}
