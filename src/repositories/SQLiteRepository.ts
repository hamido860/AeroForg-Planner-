import Database from "better-sqlite3";
import fs from "fs";
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
import { randomUUID as nodeRandomUUID } from "crypto";

const randomUUID = () => {
  if (typeof nodeRandomUUID === 'function') return nodeRandomUUID();
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export class SQLiteAeroForgRepository implements IAeroForgRepository {
  private db!: Database.Database;

  constructor(dbPath: string) {
    try {
      this.db = new Database(dbPath);
      this.initializeSchema();
    } catch (err: any) {
      if (err?.code === "SQLITE_CORRUPT" || err?.message?.includes("malformed") || err?.message?.includes("corrupt")) {
        console.warn(`Database file at ${dbPath} is corrupted (${err?.message}). Resetting database file...`);
        try {
          if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
          }
        } catch (unlinkErr) {
          console.error("Failed to remove corrupt database file:", unlinkErr);
        }
        this.db = new Database(dbPath);
        this.initializeSchema();
      } else {
        throw err;
      }
    }
  }

  private initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS helios_orders (
        id TEXT PRIMARY KEY,
        erp_order_id TEXT,
        erp_status TEXT,
        part_reference TEXT NOT NULL,
        designation TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        estimated_load_hours REAL DEFAULT 0,
        planned_start_at DATETIME,
        planned_end_at DATETIME,
        revised_start_at DATETIME,
        revised_end_at DATETIME,
        aircraft_zone TEXT,
        work_center_code TEXT,
        order_type TEXT,
        planner_name TEXT,
        production_site TEXT,
        material_mode TEXT,
        supply_status TEXT,
        order_status TEXT DEFAULT 'IMPORTED',
        raw_helios_row TEXT,
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_erp_update_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS planning_jobs (
        id TEXT PRIMARY KEY,
        planning_job_code TEXT NOT NULL,
        helios_order_id TEXT NOT NULL,
        assigned_team_id TEXT,
        job_status TEXT DEFAULT 'DRAFT',
        planning_start_at DATETIME,
        planning_end_at DATETIME,
        scheduled_start_at DATETIME,
        scheduled_end_at DATETIME,
        planning_risk TEXT DEFAULT 'LOW',
        material_risk TEXT DEFAULT 'NONE',
        is_schedulable BOOLEAN DEFAULT 0,
        planning_comment TEXT,
        created_by_user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (helios_order_id) REFERENCES helios_orders(id),
        FOREIGN KEY (assigned_team_id) REFERENCES teams(id),
        FOREIGN KEY (created_by_user_id) REFERENCES app_users(id)
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

      CREATE TABLE IF NOT EXISTS planning_tasks (
        id TEXT PRIMARY KEY,
        planning_job_id TEXT NOT NULL,
        task_code TEXT NOT NULL,
        label TEXT NOT NULL,
        task_type TEXT DEFAULT 'FABRICATION_TASK',
        sequence_order INTEGER DEFAULT 1,
        estimated_hours REAL DEFAULT 0,
        planned_start_at DATETIME,
        planned_end_at DATETIME,
        scheduled_start_at DATETIME,
        scheduled_end_at DATETIME,
        assigned_operator_id TEXT,
        assigned_team_id TEXT,
        task_status TEXT DEFAULT 'OPEN',
        quality_status TEXT DEFAULT 'OPEN',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (planning_job_id) REFERENCES planning_jobs(id),
        FOREIGN KEY (assigned_operator_id) REFERENCES operators(id),
        FOREIGN KEY (assigned_team_id) REFERENCES teams(id)
      );

      CREATE TABLE IF NOT EXISTS time_logs (
        id TEXT PRIMARY KEY,
        planning_task_id TEXT NOT NULL,
        duration_hours REAL NOT NULL,
        is_validated BOOLEAN DEFAULT 0,
        type TEXT DEFAULT 'PRODUCTION',
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (planning_task_id) REFERENCES planning_tasks(id)
      );

      CREATE TABLE IF NOT EXISTS quality_checks (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        status TEXT NOT NULL,
        checked_by TEXT NOT NULL,
        notes TEXT,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES planning_jobs(id)
      );

      CREATE TABLE IF NOT EXISTS rework_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES planning_jobs(id)
      );

      CREATE TABLE IF NOT EXISTS helios_feedback_field_mapping (
        id TEXT PRIMARY KEY,
        aeroforg_field TEXT NOT NULL,
        helios_field_name TEXT NOT NULL,
        helios_meaning TEXT,
        is_enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        team_id TEXT,
        operator_id TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (operator_id) REFERENCES operators(id)
      );
    `);
    
    this.seedIfNeeded();
  }

  private seedIfNeeded() {
    const orderCount = this.db.prepare("SELECT COUNT(*) as count FROM helios_orders").get() as { count: number };
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

      // Seed App Users
      const rawAppUsers = [
        ["257","Latrache Hamid","ADMIN","","","true"],
        ["258","Nadia El Mansouri","PLANNER","","","true"],
        ["259","Youssef Bennani","PLANNER","","","true"],
        ["260","Malika El Moklaa","PLANNER","","","true"],
        ["261","Karima Lahrache","SUPERVISOR","","","true"],
        ["262","Samir El Fassi","SUPERVISOR","","","true"],
        ["263","Omar Bennis","SUPERVISOR","","","true"],
        ["264","Rachida Amrani","TEAM_LEADER","Team A","","true"],
        ["265","Mourad Berrada","TEAM_LEADER","Team B","","true"],
        ["266","Hicham Alaoui","TEAM_LEADER","Team C","","true"],
        ["267","Imane Chraibi","QUALITY_AGENT","","","true"],
        ["268","Oumaima Idrissi","QUALITY_AGENT","","","true"],
        ["269","Sofia Tazi","QUALITY_AGENT","","","true"],
        ["270","Khalid Tazi","MATERIAL_RESPONSIBLE","","","true"],
        ["271","Salma Benkirane","MATERIAL_RESPONSIBLE","","","true"],
        ["272","Anas El Idrissi","MATERIAL_RESPONSIBLE","","","true"],
        ["273","Yassine El Amrani","OPERATOR","Team A","OP-001","true"],
        ["274","Mehdi Benkirane","OPERATOR","Team A","OP-002","true"],
        ["275","Othmane Raji","OPERATOR","Team A","OP-003","true"],
        ["276","Hamza Berrada","OPERATOR","Team A","OP-004","true"],
        ["277","Ayoub Lahlou","OPERATOR","Team B","OP-011","true"],
        ["278","Marouane Ziani","OPERATOR","Team B","OP-012","true"],
        ["279","Younes El Harrak","OPERATOR","Team B","OP-013","true"],
        ["280","Rachid El Malki","OPERATOR","Team C","OP-021","true"],
        ["281","Ismail Benali","OPERATOR","Team C","OP-022","true"]
      ];

      rawAppUsers.forEach(row => {
        const [matricule, fullName, role, teamName, opCode, active] = row;
        const email = `${fullName.toLowerCase().replace(/ /g, '.').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${matricule}@aeroforg.com`;
        
        let teamId = null;
        if (teamName) {
          const t = this.db.prepare("SELECT id FROM teams WHERE name = ?").get(teamName) as { id: string };
          if (t) teamId = t.id;
        }

        let operatorId = null;
        if (opCode) {
          const o = this.db.prepare("SELECT id FROM operators WHERE operator_code = ?").get(opCode) as { id: string };
          if (o) operatorId = o.id;
        }

        this.db.prepare("INSERT INTO app_users (id, full_name, email, role, team_id, operator_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(randomUUID(), fullName, email, role, teamId, operatorId, active === "true" ? 1 : 0);
      });

      // Seed Orders
      const hId1 = randomUUID();
      const now = new Date();
      const start = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();
      const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3).toISOString();
      
      this.db.prepare("INSERT INTO helios_orders (id, erp_order_id, part_reference, designation, quantity, estimated_load_hours, aircraft_zone, work_center_code, order_status, planned_start_at, planned_end_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(hId1, "110000001", "PN-FUS-1", "Assembly Task 1", 1, 40, "Z1", "WC1", "REVIEWED", start, end);
      
      const pId1 = randomUUID();
      const user = this.db.prepare("SELECT id FROM app_users WHERE role='PLANNER' LIMIT 1").get() as { id: string };
      this.db.prepare("INSERT INTO planning_jobs (id, planning_job_code, helios_order_id, created_by_user_id, job_status, planning_start_at, planning_end_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(pId1, "JOB-PN-FUS-1-1234", hId1, user?.id || null, "IN_PROGRESS", start, end);

      const firstOpId = this.db.prepare("SELECT id FROM operators LIMIT 1").get() as { id: string };
      const taskId1 = randomUUID();
      this.db.prepare("INSERT INTO planning_tasks (id, planning_job_id, task_code, label, estimated_hours, task_status, assigned_operator_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(taskId1, pId1, "FAB-001", "Fabrication Task", 10, "DONE", firstOpId.id);
      
      this.db.prepare("INSERT INTO time_logs (id, planning_task_id, duration_hours, is_validated) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), taskId1, 12, 1);

      // Seed mapping
      this.db.prepare("INSERT INTO helios_feedback_field_mapping (id, aeroforg_field, helios_field_name, helios_meaning) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), "REALISATION_TIME_HOURS", "ACT_TIME", "Total actual hours consumed");
      this.db.prepare("INSERT INTO helios_feedback_field_mapping (id, aeroforg_field, helios_field_name, helios_meaning) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), "REALISATION_PROGRESS_PERCENT", "COMP_PCT", "Physical progress percentage");
    }
  }

  async getAppUsers(): Promise<AppUser[]> {
    return this.db.prepare("SELECT * FROM app_users").all() as AppUser[];
  }

  async getAppUserById(id: string): Promise<AppUser | null> {
    const user = this.db.prepare("SELECT * FROM app_users WHERE id = ?").get(id);
    return (user as AppUser) || null;
  }

  async getUsersByRole(role: AeroForgRole): Promise<AppUser[]> {
    return this.db.prepare("SELECT * FROM app_users WHERE role = ?").all(role) as AppUser[];
  }

  async createAppUser(user: Partial<AppUser>): Promise<AppUser> {
    const id = randomUUID();
    this.db.prepare("INSERT INTO app_users (id, full_name, email, role, team_id, operator_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, user.full_name, user.email, user.role, user.team_id || null, user.operator_id || null);
    return (await this.getAppUserById(id))!;
  }

  async updateAppUser(userId: string, patch: Partial<AppUser>): Promise<void> {
    const fields = Object.keys(patch).map(k => `${k} = ?`).join(", ");
    const values = Object.values(patch);
    this.db.prepare(`UPDATE app_users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(...values, userId);
  }

  async deactivateAppUser(userId: string): Promise<void> {
    this.db.prepare("UPDATE app_users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
  }

  async getHeliosOrders(): Promise<HeliosOrder[]> {
    return this.db.prepare("SELECT * FROM helios_orders").all() as HeliosOrder[];
  }

  async getHeliosOrderById(id: string): Promise<HeliosOrder | null> {
    const order = this.db.prepare("SELECT * FROM helios_orders WHERE id = ?").get(id);
    return (order as HeliosOrder) || null;
  }

  async importHeliosOrdersCsv(csvData: string): Promise<void> {
    // Placeholder for CSV parsing logic
    console.log("Importing CSV data...");
  }

  async importHeliosOrder(orderData: any): Promise<void> {
    const existing = this.db.prepare("SELECT id FROM helios_orders WHERE erp_order_id = ?").get(orderData.erp_order_id) as any;
    
    // Attempt to extract numeric quantity or hours
    const quantity = parseInt(orderData.quantity) || 1;
    const estLoadHours = parseFloat(orderData.estimated_load_hours) || 0;

    const rawStr = JSON.stringify(orderData._raw || orderData);

    const safeDate = (val: any) => typeof val === 'string' && val.trim() !== '' ? val : null;

    if (existing) {
       this.db.prepare(`UPDATE helios_orders SET 
         quantity = ?, estimated_load_hours = ?, designation = ?, part_reference = ?, aircraft_zone = ?, work_center_code = ?,
         erp_status = ?, planned_start_at = ?, planned_end_at = ?, revised_start_at = ?, revised_end_at = ?, 
         order_type = ?, planner_name = ?, production_site = ?, material_mode = ?, supply_status = ?, last_erp_update_at = ?,
         order_status = ?, raw_helios_row = ?
         WHERE erp_order_id = ?
       `).run(
         quantity, 
         estLoadHours,
         orderData.designation || orderData.part_name || 'Unknown',
         orderData.part_reference || orderData.part_number || 'Unknown',
         orderData.aircraft_zone || 'Z1',
         orderData.work_center_code || 'WC1',
         orderData.erp_status || null,
         safeDate(orderData.planned_start_at),
         safeDate(orderData.planned_end_at),
         safeDate(orderData.revised_start_at),
         safeDate(orderData.revised_end_at),
         orderData.order_type || null,
         orderData.planner_name || null,
         orderData.production_site || null,
         orderData.material_mode || null,
         orderData.supply_status || null,
         safeDate(orderData.last_erp_update_at),
         'IMPORTED',
         rawStr,
         orderData.erp_order_id
       );
    } else {
       const id = randomUUID();
       this.db.prepare(`INSERT INTO helios_orders 
         (id, erp_order_id, part_reference, designation, quantity, estimated_load_hours, aircraft_zone, work_center_code, 
          erp_status, planned_start_at, planned_end_at, revised_start_at, revised_end_at, order_type, planner_name, 
          production_site, material_mode, supply_status, last_erp_update_at, order_status, raw_helios_row)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `).run(
         id, 
         orderData.erp_order_id,
         orderData.part_reference || orderData.part_number || 'Unknown',
         orderData.designation || orderData.part_name || 'Unknown',
         quantity, 
         estLoadHours,
         orderData.aircraft_zone || 'Z1',
         orderData.work_center_code || 'WC1',
         orderData.erp_status || null,
         safeDate(orderData.planned_start_at),
         safeDate(orderData.planned_end_at),
         safeDate(orderData.revised_start_at),
         safeDate(orderData.revised_end_at),
         orderData.order_type || null,
         orderData.planner_name || null,
         orderData.production_site || null,
         orderData.material_mode || null,
         orderData.supply_status || null,
         safeDate(orderData.last_erp_update_at),
         'IMPORTED',
         rawStr
       );
    }
  }

  async createHeliosOrder(orderData: any): Promise<HeliosOrder> {
    const id = randomUUID();
    const erp_order_id = orderData.erp_order_id || `OF-${Date.now().toString().slice(-6)}`;
    const quantity = parseInt(orderData.quantity) || 1;
    const estLoadHours = parseFloat(orderData.estimated_load_hours) || 0;
    const rawStr = JSON.stringify(orderData);
    const safeDate = (val: any) => typeof val === 'string' && val.trim() !== '' ? val : null;

    this.db.prepare(`INSERT INTO helios_orders 
      (id, erp_order_id, part_reference, designation, quantity, estimated_load_hours, aircraft_zone, work_center_code, 
       erp_status, planned_start_at, planned_end_at, revised_start_at, revised_end_at, order_type, planner_name, 
       production_site, material_mode, supply_status, last_erp_update_at, order_status, raw_helios_row)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      erp_order_id,
      orderData.part_reference || 'REF-GENERIC',
      orderData.designation || 'Manual Aero Part',
      quantity,
      estLoadHours,
      orderData.aircraft_zone || 'Z1',
      orderData.work_center_code || 'WC1',
      orderData.erp_status || 'MANUAL',
      safeDate(orderData.planned_start_at),
      safeDate(orderData.planned_end_at),
      safeDate(orderData.revised_start_at),
      safeDate(orderData.revised_end_at),
      orderData.order_type || 'STANDARD',
      orderData.planner_name || 'Planner',
      orderData.production_site || 'Main Site',
      orderData.material_mode || 'STANDARD',
      orderData.supply_status || 'OK',
      new Date().toISOString(),
      'IMPORTED',
      rawStr
    );
    return (await this.getHeliosOrderById(id))!;
  }

  async updateHeliosOrder(id: string, patch: any): Promise<void> {
    const fields = Object.keys(patch).map(k => `${k} = ?`).join(", ");
    const values = Object.values(patch);
    this.db.prepare(`UPDATE helios_orders SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(...values, id);
  }

  async deleteHeliosOrder(id: string): Promise<void> {
    const jobs = this.db.prepare("SELECT id FROM planning_jobs WHERE helios_order_id = ?").all(id) as { id: string }[];
    for (const job of jobs) {
      await this.deletePlanningJob(job.id);
    }
    this.db.prepare("DELETE FROM helios_orders WHERE id = ?").run(id);
  }

  async deleteAllHeliosOrders(): Promise<void> {
    const jobs = this.db.prepare("SELECT id FROM planning_jobs").all() as { id: string }[];
    for (const job of jobs) {
      await this.deletePlanningJob(job.id);
    }
    this.db.prepare("DELETE FROM helios_orders").run();
  }

  async getPlanningJobs(): Promise<PlanningJob[]> {
    return this.db.prepare("SELECT * FROM planning_jobs").all() as PlanningJob[];
  }

  async getPlanningJobById(id: string): Promise<PlanningJob | null> {
    const job = this.db.prepare("SELECT * FROM planning_jobs WHERE id = ?").get(id);
    return (job as PlanningJob) || null;
  }

  async createPlanningJob(heliosOrderId: string, createdByUserId?: string): Promise<PlanningJob> {
    const id = randomUUID();
    const helios = await this.getHeliosOrderById(heliosOrderId);
    if (!helios) throw new Error("Helios order not found");
    const code = `JOB-${helios.part_reference || "XXX"}-${Date.now().toString().slice(-4)}`;
    this.db.prepare("INSERT INTO planning_jobs (id, planning_job_code, helios_order_id, created_by_user_id) VALUES (?, ?, ?, ?)")
      .run(id, code, heliosOrderId, createdByUserId || null);
    return (await this.getPlanningJobById(id))!;
  }

  async updatePlanningJob(jobId: string, patch: Partial<PlanningJob>): Promise<void> {
    const fields = Object.keys(patch).map(k => `${k} = ?`).join(", ");
    const values = Object.values(patch);
    this.db.prepare(`UPDATE planning_jobs SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(...values, jobId);
  }

  async deletePlanningJob(jobId: string): Promise<void> {
    this.db.prepare(`
      DELETE FROM time_logs 
      WHERE planning_task_id IN (
        SELECT id FROM planning_tasks WHERE planning_job_id = ?
      )
    `).run(jobId);
    this.db.prepare("DELETE FROM planning_tasks WHERE planning_job_id = ?").run(jobId);
    this.db.prepare("DELETE FROM quality_checks WHERE order_id = ?").run(jobId);
    this.db.prepare("DELETE FROM rework_logs WHERE order_id = ?").run(jobId);
    this.db.prepare("DELETE FROM planning_jobs WHERE id = ?").run(jobId);
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

  async getPlanningTasks(jobId: string): Promise<PlanningTask[]> {
    return this.db.prepare("SELECT * FROM planning_tasks WHERE planning_job_id = ?").all(jobId) as PlanningTask[];
  }

  async createPlanningTask(task: Partial<PlanningTask>): Promise<PlanningTask> {
    const id = randomUUID();
    this.db.prepare(`INSERT INTO planning_tasks (id, planning_job_id, task_code, label, task_type, sequence_order, estimated_hours) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, task.planning_job_id, task.task_code || "TSK", task.label || "Fabrication Task", task.task_type || "FABRICATION_TASK", task.sequence_order || 1, task.estimated_hours || 0);
    return this.db.prepare("SELECT * FROM planning_tasks WHERE id = ?").get(id) as PlanningTask;
  }

  async getExecutionHistory(jobId: string): Promise<TimeLog[]> {
    return this.db.prepare(`
      SELECT tl.* FROM time_logs tl
      JOIN planning_tasks t ON tl.planning_task_id = t.id
      WHERE t.planning_job_id = ?
    `).all(jobId) as TimeLog[];
  }

  async assignTeamToJob(jobId: string, teamId: string): Promise<void> {
    this.db.prepare("UPDATE planning_jobs SET assigned_team_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(teamId, jobId);
  }

  async assignOperatorToTask(taskId: string, operatorId: string): Promise<void> {
    this.db.prepare("UPDATE planning_tasks SET assigned_operator_id = ? WHERE id = ?").run(operatorId, taskId);
  }

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    this.db.prepare("UPDATE planning_jobs SET job_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, jobId);
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    this.db.prepare("UPDATE planning_tasks SET task_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, taskId);
  }

  async createQualityCheck(jobId: string, status: 'ACCEPTED' | 'REJECTED', checkedBy: string, notes?: string): Promise<void> {
    this.db.prepare("INSERT INTO quality_checks (id, order_id, status, checked_by, notes) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), jobId, status, checkedBy, notes || null);
  }

  async createReworkLog(jobId: string, reason: string): Promise<void> {
    this.db.prepare("INSERT INTO rework_logs (id, order_id, reason) VALUES (?, ?, ?)")
      .run(randomUUID(), jobId, reason);
  }

  async calculateJobRealisationMetrics(jobId: string): Promise<OrderRealisationMetrics> {
    const job = await this.getPlanningJobById(jobId);
    if (!job) throw new Error("Job not found");

    const timeLogs = this.db.prepare(`
      SELECT SUM(tl.duration_hours) as total 
      FROM time_logs tl
      JOIN planning_tasks t ON tl.planning_task_id = t.id
      WHERE t.planning_job_id = ? AND tl.is_validated = 1
    `).get(jobId) as { total: number };
    const realisation_time_hours = timeLogs.total || 0;

    const tasks = await this.getPlanningTasks(jobId);
    let progress = 0;
    if (tasks.length > 0) {
      const totalEst = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
      const completedEst = tasks.reduce((sum, t) => sum + (['DONE', 'FINISH', 'QUALITY_PENDING', 'ACCEPTED'].includes(t.task_status) ? (t.estimated_hours || 0) : 0), 0);
      if (totalEst > 0) {
        progress = (completedEst / totalEst) * 100;
      } else {
        const completedCount = tasks.filter(t => ['DONE', 'FINISH', 'QUALITY_PENDING', 'ACCEPTED'].includes(t.task_status)).length;
        progress = (completedCount / tasks.length) * 100;
      }
    }
    const realisation_progress_percent = Math.min(100, Math.max(0, Number(progress.toFixed(2))));

    const order = await this.getHeliosOrderById(job.helios_order_id);
    const estLoad = order?.estimated_load_hours || 0;

    const time_consumption_percent = estLoad > 0 
      ? (realisation_time_hours / estLoad) * 100 
      : 0;

    return {
      realisation_time_hours,
      realisation_progress_percent,
      time_consumption_percent: Number(time_consumption_percent.toFixed(2)),
      computed_status: job.job_status
    };
  }

  async getFeedbackMappings(): Promise<HeliosFeedbackMapping[]> {
    return this.db.prepare("SELECT * FROM helios_feedback_field_mapping").all() as HeliosFeedbackMapping[];
  }

  async createFeedbackMapping(mapping: Partial<HeliosFeedbackMapping>): Promise<HeliosFeedbackMapping> {
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO helios_feedback_field_mapping (id, aeroforg_field, helios_field_name, helios_meaning, is_enabled)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, mapping.aeroforg_field, mapping.helios_field_name, mapping.helios_meaning || '', mapping.is_enabled !== false ? 1 : 0);
    return (this.db.prepare("SELECT * FROM helios_feedback_field_mapping WHERE id = ?").get(id) as HeliosFeedbackMapping);
  }

  async updateFeedbackMapping(id: string, patch: Partial<HeliosFeedbackMapping>): Promise<void> {
    const fields = Object.keys(patch).map(k => `${k} = ?`).join(", ");
    const values = Object.values(patch);
    this.db.prepare(`UPDATE helios_feedback_field_mapping SET ${fields} WHERE id = ?`)
      .run(...values, id);
  }

  async deleteFeedbackMapping(id: string): Promise<void> {
    this.db.prepare("DELETE FROM helios_feedback_field_mapping WHERE id = ?").run(id);
  }

  async saveFeedbackMappings(mappings: HeliosFeedbackMapping[]): Promise<void> {
    const deleteStmt = this.db.prepare("DELETE FROM helios_feedback_field_mapping");
    const insertStmt = this.db.prepare(`
      INSERT INTO helios_feedback_field_mapping (id, aeroforg_field, helios_field_name, helios_meaning, is_enabled)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    this.db.transaction(() => {
      deleteStmt.run();
      for (const m of mappings) {
        insertStmt.run(m.id || randomUUID(), m.aeroforg_field, m.helios_field_name, m.helios_meaning || '', m.is_enabled ? 1 : 0);
      }
    })();
  }

  async generateHeliosFeedbackQueue(): Promise<any[]> {
    // Collect all orders that need feedback
    const orders = await this.getHeliosOrders();
    const feedback = [];
    for (const order of orders) {
      const metrics = await this.calculateJobRealisationMetrics(order.id);
      feedback.push({
        ERP_ORDER_ID: order.id,
        REAL_START_AT: order.created_at, // Placeholder
        REAL_FINISH_AT: metrics.computed_status === 'FINISH' ? order.updated_at : null,
        REALISATION_TIME_HOURS: metrics.realisation_time_hours,
        REALISATION_PROGRESS_PERCENT: metrics.realisation_progress_percent,
        TIME_CONSUMPTION_PERCENT: metrics.time_consumption_percent,
        ORDER_STATUS: metrics.computed_status,
        QUALITY_STATUS: (order as any).quality_status || 'OPEN',
        REWORK_COUNT: (order as any).rework_count || 0,
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
