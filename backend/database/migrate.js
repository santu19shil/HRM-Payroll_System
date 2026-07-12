const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigrations() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hr_payroll_system',
      port: parseInt(process.env.DB_PORT) || 3306
    });

    console.log('[migrate] Connected to database');

    const colExists = async (table, col) => {
      const [rows] = await connection.query(
        'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [process.env.DB_NAME || 'hr_payroll_system', table, col]
      );
      return rows.length > 0;
    };

    const addCol = async (table, col, definition, after) => {
      if (!(await colExists(table, col))) {
        const afterSql = after ? ` AFTER ${after}` : '';
        await connection.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}${afterSql}`);
        console.log(`[migrate] Added ${table}.${col}`);
      }
    };

    // salary_components.category
    await addCol('salary_components', 'category', "ENUM('EMPLOYEE','EMPLOYER') NOT NULL DEFAULT 'EMPLOYEE'", 'type');

    // salary_structure_components calc fields
    await addCol('salary_structure_components', 'calculation_type', "ENUM('FIXED','PERCENTAGE') NOT NULL DEFAULT 'FIXED'", 'amount');
    await addCol('salary_structure_components', 'calculation_value', 'DECIMAL(10,2) NOT NULL DEFAULT 0', 'calculation_type');

    // payroll_items employer contributions
    await addCol('payroll_items', 'employer_contributions', 'JSON', 'deductions_breakdown');
    await addCol('payroll_items', 'employer_total', 'DECIMAL(12,2) NOT NULL DEFAULT 0', 'employer_contributions');

    // payroll_runs employer totals
    await addCol('payroll_runs', 'total_employer_contributions', 'DECIMAL(14,2) DEFAULT 0', 'total_net_pay');

    // New salary components (idempotent via INSERT IGNORE)
    await connection.query(`INSERT IGNORE INTO salary_components (id, name, code, type, category, description, is_taxable, is_default, calculation_type, calculation_value) VALUES
      ('sc_basic', 'Basic Salary', 'BASIC', 'EARNING', 'EMPLOYEE', 'Base salary component', 1, 1, 'FIXED', 0),
      ('sc_hra', 'House Rent Allowance', 'HRA', 'EARNING', 'EMPLOYEE', 'Housing allowance', 1, 1, 'PERCENTAGE', 40),
      ('sc_da', 'Dearness Allowance', 'DA', 'EARNING', 'EMPLOYEE', 'Dearness allowance', 1, 1, 'PERCENTAGE', 10),
      ('sc_conveyance', 'Conveyance Allowance', 'CONV', 'EARNING', 'EMPLOYEE', 'Travel allowance', 0, 1, 'FIXED', 1600),
      ('sc_medical', 'Medical Allowance', 'MED', 'EARNING', 'EMPLOYEE', 'Medical expense allowance', 0, 1, 'FIXED', 1250),
      ('sc_special', 'Special Allowance', 'SPECIAL', 'EARNING', 'EMPLOYEE', 'Special allowance', 1, 1, 'FIXED', 0),
      ('sc_bonus', 'Bonus / Special Allowance', 'BONUS', 'EARNING', 'EMPLOYEE', 'Performance/bonus pay', 1, 0, 'FIXED', 0),
      ('sc_overtime', 'Overtime Pay', 'OT', 'EARNING', 'EMPLOYEE', 'Overtime pay', 1, 0, 'FIXED', 0),
      ('sc_pf', 'Provident Fund', 'PF', 'DEDUCTION', 'EMPLOYEE', 'Employee provident fund contribution', 0, 1, 'PERCENTAGE', 12),
      ('sc_esi', 'Employee State Insurance', 'ESI', 'DEDUCTION', 'EMPLOYEE', 'ESI contribution', 0, 1, 'PERCENTAGE', 0.75),
      ('sc_professional_tax', 'Professional Tax', 'PT', 'DEDUCTION', 'EMPLOYEE', 'Professional tax as per state rules', 0, 1, 'FIXED', 200),
      ('sc_income_tax', 'Income Tax (TDS)', 'IT', 'DEDUCTION', 'EMPLOYEE', 'TDS on salary', 0, 1, 'FIXED', 0),
      ('sc_loan', 'Loan / Advance Recovery', 'LOAN', 'DEDUCTION', 'EMPLOYEE', 'Employee loan repayment', 0, 0, 'FIXED', 0),
      ('sc_other_deduction', 'Other Deductions', 'OTHER', 'DEDUCTION', 'EMPLOYEE', 'Miscellaneous deductions', 0, 0, 'FIXED', 0),
      ('sc_pf_er', 'Provident Fund (Employer)', 'PF_ER', 'EARNING', 'EMPLOYER', 'Employer PF share', 0, 1, 'PERCENTAGE', 13),
      ('sc_esi_er', 'ESI (Employer)', 'ESI_ER', 'EARNING', 'EMPLOYER', 'Employer ESI share', 0, 1, 'PERCENTAGE', 3.25),
      ('sc_gratuity', 'Gratuity Accrual', 'GRAT', 'EARNING', 'EMPLOYER', 'Gratuity accrual (4.81% of basic)', 0, 1, 'PERCENTAGE', 4.81)`);
    console.log('[migrate] Ensured salary components');

    // Ensure company_logo setting exists
    await connection.query(`INSERT IGNORE INTO settings (id, setting_key, setting_value, setting_group, description) VALUES
      ('set_14', 'company_logo', '', 'Company', 'Company logo file path')`);
    console.log('[migrate] Ensured company_logo setting');

    // documents.rejection_reason + status (ensure both exist; live DB may lack them)
    await addCol('documents', 'rejection_reason', 'TEXT', 'verified_at');
    await addCol('documents', 'status', "ENUM('Pending','Verified','Rejected') NOT NULL DEFAULT 'Pending'", 'rejection_reason');

    // notifications.link (clickable action url, e.g. attachment)
    await addCol('notifications', 'link', 'VARCHAR(500)', 'reference_id');

    // Notices tables (created before any addCol referencing them)
    await connection.query(`CREATE TABLE IF NOT EXISTS notices (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      target_all TINYINT(1) NOT NULL DEFAULT 0,
      departments JSON,
      designations JSON,
      employees JSON,
      attachment_path VARCHAR(500),
      attachment_name VARCHAR(255),
      attachment_type VARCHAR(100),
      recipient_count INT NOT NULL DEFAULT 0,
      created_by VARCHAR(36) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`);
    console.log('[migrate] Ensured notices table');

    await connection.query(`CREATE TABLE IF NOT EXISTS notice_recipients (
      id VARCHAR(36) PRIMARY KEY,
      notice_id VARCHAR(36) NOT NULL,
      employee_id VARCHAR(36) NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE KEY unique_notice_employee (notice_id, employee_id)
    ) ENGINE=InnoDB`);
    console.log('[migrate] Ensured notice_recipients table');

    console.log('[migrate] Migration completed successfully');
  } catch (error) {
    console.error('[migrate] Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

// Allow running directly: node database/migrate.js
if (require.main === module) {
  runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runMigrations;
