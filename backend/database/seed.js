const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seedDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hr_payroll_system',
      port: parseInt(process.env.DB_PORT) || 3306
    });

    console.log('Connected to database');

    const bcrypt = require('bcryptjs');
    const adminPassword = 'Admin@123';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await connection.query(`INSERT IGNORE INTO roles (id, name, description) VALUES
      ('role_super_admin', 'SUPER_ADMIN', 'Full system access'),
      ('role_hr_admin', 'HR_ADMIN', 'HR administrator'),
      ('role_manager', 'MANAGER', 'Department manager'),
      ('role_employee', 'EMPLOYEE', 'Regular employee')`);

    await connection.query(`INSERT IGNORE INTO leave_types (id, name, code, description, days_per_year, is_paid, carry_forward, max_carry_forward) VALUES
      ('lt_annual', 'Annual Leave', 'AL', 'Yearly paid vacation', 18, 1, 1, 10),
      ('lt_casual', 'Casual Leave', 'CL', 'Short notice personal leave', 12, 1, 0, 0),
      ('lt_medical', 'Medical Leave', 'ML', 'Sick leave', 15, 1, 0, 0),
      ('lt_maternity', 'Maternity Leave', 'MAT', 'Maternity leave', 180, 1, 0, 0),
      ('lt_paternity', 'Paternity Leave', 'PAT', 'Paternity leave', 15, 1, 0, 0),
      ('lt_bereavement', 'Bereavement Leave', 'BL', 'Bereavement leave', 5, 1, 0, 0)`);

    await connection.query(`INSERT IGNORE INTO salary_components (id, name, code, type, description, is_taxable, is_default, calculation_type, calculation_value) VALUES
      ('sc_basic', 'Basic Salary', 'BASIC', 'EARNING', 'Base salary', 1, 1, 'FIXED', 0),
      ('sc_hra', 'House Rent Allowance', 'HRA', 'EARNING', 'Housing allowance', 1, 1, 'PERCENTAGE', 40),
      ('sc_da', 'Dearness Allowance', 'DA', 'EARNING', 'Dearness allowance', 1, 1, 'PERCENTAGE', 10),
      ('sc_conveyance', 'Conveyance Allowance', 'CONV', 'EARNING', 'Travel allowance', 0, 1, 'FIXED', 1600),
      ('sc_medical', 'Medical Allowance', 'MED', 'EARNING', 'Medical allowance', 0, 1, 'FIXED', 1250),
      ('sc_special', 'Special Allowance', 'SPECIAL', 'EARNING', 'Special allowance', 1, 1, 'FIXED', 0),
      ('sc_bonus', 'Performance Bonus', 'BONUS', 'EARNING', 'Performance bonus', 1, 0, 'FIXED', 0),
      ('sc_pf', 'Provident Fund', 'PF', 'DEDUCTION', 'PF contribution', 0, 1, 'PERCENTAGE', 12),
      ('sc_esi', 'Employee State Insurance', 'ESI', 'DEDUCTION', 'ESI contribution', 0, 1, 'PERCENTAGE', 0.75),
      ('sc_professional_tax', 'Professional Tax', 'PT', 'DEDUCTION', 'Professional tax', 0, 1, 'FIXED', 200),
      ('sc_income_tax', 'Income Tax', 'IT', 'DEDUCTION', 'TDS on salary', 0, 1, 'FIXED', 0),
      ('sc_loan', 'Loan Deduction', 'LOAN', 'DEDUCTION', 'Loan repayment', 0, 0, 'FIXED', 0)`);

    await connection.query(`INSERT IGNORE INTO settings (id, setting_key, setting_value, setting_group, description) VALUES
      ('set_1', 'company_name', 'Enterprise HRMS Pvt. Ltd.', 'Company', 'Company name'),
      ('set_2', 'company_address', '123 Business Park, Tech City', 'Company', 'Company address'),
      ('set_3', 'company_email', 'contact@enterprisehrms.com', 'Company', 'Company email'),
      ('set_4', 'company_phone', '+91-1234567890', 'Company', 'Company phone'),
      ('set_5', 'office_start_time', '09:30', 'Attendance', 'Office start time'),
      ('set_6', 'office_end_time', '18:30', 'Attendance', 'Office end time'),
      ('set_7', 'late_checkin_grace_period', '30', 'Attendance', 'Grace period'),
      ('set_8', 'half_day_hours', '4', 'Attendance', 'Half day hours'),
      ('set_9', 'full_day_hours', '8', 'Attendance', 'Full day hours'),
      ('set_10', 'payroll_cycle', 'Monthly', 'Payroll', 'Payroll cycle'),
      ('set_11', 'currency', 'INR', 'Payroll', 'Default currency'),
      ('set_12', 'pf_employer_contribution', '13', 'Payroll', 'Employer PF'),
      ('set_13', 'esi_employer_contribution', '3.25', 'Payroll', 'Employer ESI')`);

    await connection.query(`INSERT IGNORE INTO office_locations (id, name, latitude, longitude, radius, address) VALUES
      ('office_1', 'Head Office', 12.9716, 77.5946, 100, '123 Business Park, MG Road, Bangalore - 560001')`);

    await connection.query(`INSERT IGNORE INTO users (id, employee_id, email, password_hash, role_id, is_temp_password, must_change_password, is_active) VALUES
      ('user_admin', 'ADMIN001', 'admin@hrpayroll.com', ?, 'role_super_admin', 0, 0, 1)`, [hashedPassword]);

    const [empCount] = await connection.query('SELECT COUNT(*) as cnt FROM employees');
    const [usrCount] = await connection.query('SELECT COUNT(*) as cnt FROM users');
    const [roles] = await connection.query('SELECT name FROM roles');

    console.log('\n========================================');
    console.log('  Database Seed Complete!');
    console.log('========================================');
    console.log('  Employees:', empCount[0].cnt);
    console.log('  Users:', usrCount[0].cnt);
    console.log('  Roles:', roles.map(r => r.name).join(', '));
    console.log('  Admin Login:');
    console.log('    Employee ID: ADMIN001');
    console.log('    Email: admin@hrpayroll.com');
    console.log('    Password: Admin@123');
    console.log('========================================\n');
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();
