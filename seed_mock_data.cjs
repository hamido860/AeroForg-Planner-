const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

const db = new Database('aeroforg.db');

console.log("Seeding Helios Orders & Planning Jobs...");

// Create 50 Helios orders
const zones = ['NOSE', 'MAIN_FUSELAGE', 'TAILCONE', 'WING_L', 'WING_R'];
const wcs = ['ST10', 'ST20', 'ST30', 'SE11', 'SE12'];
const supplyStatus = ['AVAILABLE', 'MISSING_PARTIAL', 'MISSING_ALL'];
const types = ['STANDARD', 'URGENT'];

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const baseDate = new Date("2026-05-18T08:00:00Z").getTime();

let countOrders = 0;
let countJobs = 0;

for (let i = 1; i <= 50; i++) {
  const erp_order_id = `1000${1000 + i}`;
  const part_reference = `19F524-71505-${(i % 10).toString().padStart(3, '0')}`;
  const designation = `FRAME ${100 + i} ASSY`;
  const quantity = Math.floor(Math.random() * 50) + 1;
  const estimated_load_hours = Math.floor(Math.random() * 400) + 10;
  
  // Start anywhere from today to +15 days
  const rStartDelay = Math.floor(Math.random() * 15) * MS_PER_DAY;
  
  // Duration anywhere from 1 to 5 days
  const rDuration = (Math.floor(Math.random() * 5) + 1) * MS_PER_DAY;
  
  const planned_start_at = new Date(baseDate + rStartDelay).toISOString();
  const planned_end_at = new Date(baseDate + rStartDelay + rDuration).toISOString();
  
  const hId = randomUUID();
  db.prepare(`
    INSERT INTO helios_orders 
    (id, erp_order_id, erp_status, part_reference, designation, quantity, estimated_load_hours, 
     planned_start_at, planned_end_at, aircraft_zone, work_center_code, order_type, supply_status, order_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    hId, erp_order_id, 'RELEASED', part_reference, designation, quantity, estimated_load_hours,
    planned_start_at, planned_end_at, zones[i % zones.length], wcs[i % wcs.length], types[i % 2], supplyStatus[i % 3], 'IMPORTED'
  );
  countOrders++;

  // Create planning jobs for ~70% of them
  if (Math.random() > 0.3) {
    let status = 'SCHEDULED';
    const r = Math.random();
    if (r < 0.2) status = 'IN_PROGRESS';
    else if (r < 0.4) status = 'BLOCKED';
    else if (r < 0.6) status = 'FINISH';
    else if (r < 0.8) status = 'READY_TO_SCHEDULE';

    let materialRisk = 'NONE';
    if (supplyStatus[i%3] === 'MISSING_PARTIAL') materialRisk = 'PARTIAL';
    if (supplyStatus[i%3] === 'MISSING_ALL') materialRisk = 'MISSING';
    
    let planningRisk = 'LOW';
    if (status === 'BLOCKED') planningRisk = 'HIGH';

    const pId = randomUUID();
    db.prepare(`
      INSERT INTO planning_jobs 
      (id, planning_job_code, helios_order_id, job_status, planning_start_at, planning_end_at, scheduled_start_at, scheduled_end_at, material_risk, planning_risk)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pId, `JOB-${part_reference}-${erp_order_id}`, hId, status, 
      planned_start_at, planned_end_at, planned_start_at, planned_end_at, materialRisk, planningRisk
    );
    countJobs++;
  }
}

console.log(`Created ${countOrders} Helios orders.`);
console.log(`Created ${countJobs} planning jobs.`);
