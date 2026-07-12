const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function clearMysqlTables() {
  const database = process.env.DB_NAME || 'hr_payroll_system';

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    waitForConnections: true,
    connectionLimit: 10
  });

  let conn;
  try {
    conn = await pool.getConnection();

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    const [tables] = await conn.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [database]
    );

    for (const row of tables) {
      const t = row.table_name || row.TABLE_NAME;
      const sql = 'TRUNCATE TABLE `' + t.replace(/`/g, '``') + '`';
      await conn.query(sql);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('All MySQL table data cleared (schema preserved).');
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

clearMysqlTables().catch(err => {
  console.error('clearTables failed:', err);
  process.exit(1);
});

