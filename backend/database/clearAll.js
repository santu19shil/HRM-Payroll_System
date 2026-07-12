const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function clearAllTables() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hr_payroll_system',
      port: parseInt(process.env.DB_PORT) || 3306,
      multipleStatements: true
    });

    console.log('Connected to database');

    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [process.env.DB_NAME || 'hr_payroll_system']
    );

    const tableNames = tables.map(t => t.TABLE_NAME);
    console.log(`Found ${tableNames.length} tables:`, tableNames.join(', '));

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tableNames) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
      console.log(`Truncated: ${table}`);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\nAll tables cleared successfully');
  } catch (error) {
    console.error('Error clearing tables:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

clearAllTables();
