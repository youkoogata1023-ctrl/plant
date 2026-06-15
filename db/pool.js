/* PostgreSQL 接続プール
   - DATABASE_URL あり: 本物の PostgreSQL に接続（Render / ローカルのPostgres）
   - DATABASE_URL なし: 開発用インメモリDB(pg-mem)にフォールバック
     ※ プロセス再起動でデータは消えます。お試し/ローカル確認用。 */
const connectionString = process.env.DATABASE_URL;

let pool;

if (connectionString) {
  const { Pool } = require("pg");
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }, // Render の Postgres は SSL 必須
    max: 10,
    idleTimeoutMillis: 30000,
  });
  pool.on("error", (err) => console.error("[pg] idle client error:", err.message));
} else {
  console.warn("[pg] DATABASE_URL 未設定 → 開発用インメモリDB(pg-mem)で起動（データは再起動で消えます）");
  const { newDb } = require("pg-mem");
  const mem = newDb();
  const pg = mem.adapters.createPg();
  pool = new pg.Pool();
}

module.exports = pool;
