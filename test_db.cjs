const Database = require('better-sqlite3');
const db = new Database('aeroforg.db');
const o = db.prepare("SELECT * FROM helios_orders LIMIT 1").get();
console.log("Helios Order:", o);
const p = db.prepare("SELECT * FROM planning_jobs LIMIT 1").get();
console.log("Planning Job:", p);
