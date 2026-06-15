const { newDb } = require("pg-mem");
const mem = newDb();
const pg = mem.adapters.createPg();
const pool = new pg.Pool();

async function test() {
  await pool.query(`CREATE TABLE app_state (
    id INT PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}',
    week_menu JSONB NOT NULL DEFAULT '[]',
    monthly_menu JSONB NOT NULL DEFAULT '{}'
  )`);
  await pool.query(`INSERT INTO app_state (id) VALUES (1)`);
  
  try {
    await pool.query("UPDATE app_state SET settings=$1, week_menu=$2 WHERE id=1", [undefined, '[]']);
    console.log("SUCCESS");
  } catch(e) {
    console.error("ERROR:", e.message);
  }
}
test();
