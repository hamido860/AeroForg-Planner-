const Database = require('better-sqlite3');
const db = new Database('aeroforg.db');
const orders = db.prepare("SELECT planned_start_at, planned_end_at FROM helios_orders LIMIT 5").all();
console.log(orders);
