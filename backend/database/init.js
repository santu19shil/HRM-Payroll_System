const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function initializeDatabase() {
  let connection;
  try {
    // Connect without database to create it
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT) || 3306,
      multipleStatements: true
    });

    console.log('Connected to MySQL server');

    // Read and execute schema.
    // Make schema apply safer for repeated runs (CRUD-friendly workflow):
    // - The main schema uses CREATE TABLE IF NOT EXISTS for idempotency.
    // - But schema.sql also contains ALTER TABLE ... ADD CONSTRAINT without IF NOT EXISTS.
    //   Remove duplicate FK constraint additions by skipping those ALTER statements.
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const schemaStatements = schema
      .split(/;\s*\n/g)
      .map(s => s.trim())
      .filter(Boolean)
      .filter(stmt => {
        // Skip FK constraint additions that don't have an IF NOT EXISTS guard.
        // This prevents errors like: Duplicate foreign key constraint name 'fk_dept_head'
        return !/^ALTER TABLE\s+departments\s+ADD\s+CONSTRAINT\s+fk_dept_head/i.test(stmt);
      })
      .map(stmt => (stmt.endsWith(';') ? stmt : stmt + ';'));

    for (const statement of schemaStatements) {
      await connection.query(statement);
    }

    console.log('Database schema applied successfully');
    console.log('Seed data inserted successfully (ON DUPLICATE KEY handles repeats)');


    // Update admin password with proper bcrypt hash
    const bcrypt = require('bcryptjs');
    const adminPassword = 'Admin@123';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await connection.query(`UPDATE hr_payroll_system.users SET password_hash = ? WHERE id = 'user_admin'`, [hashedPassword]);

    console.log('\n========================================');
    console.log('  Database Initialization Complete!');
    console.log('========================================');
    console.log('  Database: hr_payroll_system');
    console.log('  Admin Login:');
    console.log('    Employee ID: ADMIN001');
    console.log('    Email: admin@hrpayroll.com');
    console.log('    Password: Admin@123');
    console.log('========================================\n');

  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();