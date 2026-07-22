const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

const db = new Database('aeroforg.db');

const orders = db.prepare("SELECT * FROM helios_orders").all();
console.log(`Found ${orders.length} Helios orders`);

let count = 0;
for(let order of orders) {
    if (Math.random() > 0.3) {
        let status = 'SCHEDULED';
        const r = Math.random();
        if (r < 0.2) status = 'IN_PROGRESS';
        else if (r < 0.4) status = 'BLOCKED';
        else if (r < 0.6) status = 'FINISH';
        else if (r < 0.8) status = 'READY_TO_SCHEDULE';
        
        try {
            const pId = randomUUID();
            db.prepare("INSERT INTO planning_jobs (id, planning_job_code, helios_order_id, job_status) VALUES (?, ?, ?, ?)").run(
                pId,
                "JOB-" + order.part_reference + "-" + count,
                order.id,
                status
            );
            count++;
        } catch (e) {
            // ignore if exists
        }
    }
}
console.log(`Created ${count} planning jobs.`);
