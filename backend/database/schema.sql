-- Enterprise HRMS & Payroll Management System
-- MySQL Database Schema
-- Database: hr_payroll_system

CREATE DATABASE IF NOT EXISTS hr_payroll_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hr_payroll_system;

-- ============================================
-- CORE TABLES
-- ============================================

-- Office Locations (for geofence attendance)
CREATE TABLE IF NOT EXISTS office_locations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius INT NOT NULL DEFAULT 100 COMMENT 'Radius in meters',
  address TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  head_id VARCHAR(36) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Designations
CREATE TABLE IF NOT EXISTS designations (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  department_id VARCHAR(36) NOT NULL,
  grade VARCHAR(50),
  min_salary DECIMAL(12, 2) DEFAULT 0,
  max_salary DECIMAL(12, 2) DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  UNIQUE KEY unique_title_dept (title, department_id)
) ENGINE=InnoDB;

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Users (Authentication)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(20) NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  is_temp_password TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL,
  refresh_token TEXT NULL,
  refresh_token_expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL UNIQUE,
  user_id VARCHAR(36) NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  gender ENUM('Male', 'Female', 'Other') NULL,
  date_of_birth DATE NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(100),
  department_id VARCHAR(36) NULL,
  designation_id VARCHAR(36) NULL,
  reporting_manager_id VARCHAR(36) NULL,
  joining_date DATE NULL,
  employment_type ENUM('Full-Time', 'Part-Time', 'Contract', 'Intern', 'Probation') DEFAULT 'Full-Time',
  work_location VARCHAR(255),
  profile_picture VARCHAR(500),
  bank_account_name VARCHAR(255),
  bank_account_number VARCHAR(100),
  bank_name VARCHAR(255),
  bank_ifsc VARCHAR(50),
  bank_branch VARCHAR(255),
  pan_number VARCHAR(20),
  aadhar_number VARCHAR(20),
  uan_number VARCHAR(50),
  pf_number VARCHAR(50),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL,
  FOREIGN KEY (reporting_manager_id) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Add head_id FK to departments
ALTER TABLE departments ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================
-- ATTENDANCE TABLES
-- ============================================

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  check_in_time DATETIME NULL,
  check_out_time DATETIME NULL,
  check_in_latitude DECIMAL(10, 8) NULL,
  check_in_longitude DECIMAL(11, 8) NULL,
  check_out_latitude DECIMAL(10, 8) NULL,
  check_out_longitude DECIMAL(11, 8) NULL,
  status ENUM('Present', 'Late', 'Absent', 'Holiday', 'On Leave', 'Missing Check Out', 'Week Off') NOT NULL DEFAULT 'Absent',
  working_hours DECIMAL(5, 2) DEFAULT 0,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  late_minutes INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_employee_date (employee_id, date)
) ENGINE=InnoDB;

-- Attendance Logs (detailed check-in/out history)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  attendance_id VARCHAR(36) NULL,
  event_type ENUM('CHECK_IN', 'CHECK_OUT') NOT NULL,
  timestamp DATETIME NOT NULL,
  latitude DECIMAL(10, 8) NULL,
  longitude DECIMAL(11, 8) NULL,
  ip_address VARCHAR(45),
  device_info VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- LEAVE TABLES
-- ============================================

-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  days_per_year INT NOT NULL DEFAULT 0,
  is_paid TINYINT(1) NOT NULL DEFAULT 1,
  carry_forward TINYINT(1) NOT NULL DEFAULT 0,
  max_carry_forward INT DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  leave_type_id VARCHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Pending',
  approved_by VARCHAR(36) NULL,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  leave_type_id VARCHAR(36) NOT NULL,
  total_days INT NOT NULL DEFAULT 0,
  used_days INT NOT NULL DEFAULT 0,
  pending_days INT NOT NULL DEFAULT 0,
  remaining_days INT NOT NULL DEFAULT 0,
  year YEAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  UNIQUE KEY unique_emp_leave_year (employee_id, leave_type_id, year)
) ENGINE=InnoDB;

-- ============================================
-- PAYROLL TABLES
-- ============================================

-- Salary Components
CREATE TABLE IF NOT EXISTS salary_components (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  type ENUM('EARNING', 'DEDUCTION') NOT NULL,
  description TEXT,
  is_taxable TINYINT(1) NOT NULL DEFAULT 1,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  calculation_type ENUM('FIXED', 'PERCENTAGE') NOT NULL DEFAULT 'FIXED',
  calculation_value DECIMAL(12, 2) DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Salary Structures
CREATE TABLE IF NOT EXISTS salary_structures (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Salary Structure Components (breakdown)
CREATE TABLE IF NOT EXISTS salary_structure_components (
  id VARCHAR(36) PRIMARY KEY,
  salary_structure_id VARCHAR(36) NOT NULL,
  component_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id) REFERENCES salary_components(id)
) ENGINE=InnoDB;

-- Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
  id VARCHAR(36) PRIMARY KEY,
  month INT NOT NULL,
  year INT NOT NULL,
  status ENUM('DRAFT', 'PROCESSING', 'COMPLETED', 'APPROVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  total_employees INT DEFAULT 0,
  total_gross_pay DECIMAL(14, 2) DEFAULT 0,
  total_deductions DECIMAL(14, 2) DEFAULT 0,
  total_net_pay DECIMAL(14, 2) DEFAULT 0,
  processed_by VARCHAR(36) NULL,
  processed_at TIMESTAMP NULL,
  approved_by VARCHAR(36) NULL,
  approved_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_month_year (month, year)
) ENGINE=InnoDB;

-- Payroll Items (per employee per run)
CREATE TABLE IF NOT EXISTS payroll_items (
  id VARCHAR(36) PRIMARY KEY,
  payroll_run_id VARCHAR(36) NOT NULL,
  employee_id VARCHAR(36) NOT NULL,
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  gross_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  working_days INT DEFAULT 0,
  paid_days INT DEFAULT 0,
  lop_days INT DEFAULT 0,
  earnings_breakdown JSON,
  deductions_breakdown JSON,
  status ENUM('PENDING', 'PROCESSED', 'PAID') NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_employee_run (payroll_run_id, employee_id)
) ENGINE=InnoDB;

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT DEFAULT 0,
  mime_type VARCHAR(100),
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  verified_by VARCHAR(36) NULL,
  verified_at TIMESTAMP NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- HOLIDAYS
-- ============================================

CREATE TABLE IF NOT EXISTS holidays (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type ENUM('National', 'State', 'Company', 'Festival') NOT NULL DEFAULT 'National',
  description TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_holiday_date (date, name)
) ENGINE=InnoDB;

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR') NOT NULL DEFAULT 'INFO',
  category VARCHAR(100) DEFAULT 'General',
  reference_type VARCHAR(100) NULL,
  reference_id VARCHAR(36) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- ACTIVITY LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  employee_id VARCHAR(36) NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(36) NULL,
  description TEXT,
  metadata JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(36) PRIMARY KEY,
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_group VARCHAR(100) DEFAULT 'General',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_designation ON employees(designation_id);
CREATE INDEX idx_employees_manager ON employees(reporting_manager_id);
CREATE INDEX idx_employees_status ON employees(is_active);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_payroll_items_employee ON payroll_items(employee_id);
CREATE INDEX idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX idx_documents_employee ON documents(employee_id);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default roles
INSERT INTO roles (id, name, description) VALUES
('role_super_admin', 'SUPER_ADMIN', 'Full system access with all administrative privileges'),
('role_hr_admin', 'HR_ADMIN', 'Human Resources administrator with employee management access'),
('role_manager', 'MANAGER', 'Department manager with team management access'),
('role_employee', 'EMPLOYEE', 'Regular employee with self-service access')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert default leave types
INSERT INTO leave_types (id, name, code, description, days_per_year, is_paid, carry_forward, max_carry_forward) VALUES
('lt_annual', 'Annual Leave', 'AL', 'Yearly paid vacation leave', 18, 1, 1, 10),
('lt_casual', 'Casual Leave', 'CL', 'Short notice personal leave', 12, 1, 0, 0),
('lt_medical', 'Medical Leave', 'ML', 'Sick leave with medical certificate', 15, 1, 0, 0),
('lt_maternity', 'Maternity Leave', 'MAT', 'Maternity leave as per company policy', 180, 1, 0, 0),
('lt_paternity', 'Paternity Leave', 'PAT', 'Paternity leave as per company policy', 15, 1, 0, 0),
('lt_bereavement', 'Bereavement Leave', 'BL', 'Leave due to family bereavement', 5, 1, 0, 0)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert default salary components (Earnings)
INSERT INTO salary_components (id, name, code, type, description, is_taxable, is_default, calculation_type, calculation_value) VALUES
('sc_basic', 'Basic Salary', 'BASIC', 'EARNING', 'Base salary component', 1, 1, 'FIXED', 0),
('sc_hra', 'House Rent Allowance', 'HRA', 'EARNING', 'Housing allowance', 1, 1, 'PERCENTAGE', 40),
('sc_da', 'Dearness Allowance', 'DA', 'EARNING', 'Dearness allowance', 1, 1, 'PERCENTAGE', 10),
('sc_conveyance', 'Conveyance Allowance', 'CONV', 'EARNING', 'Travel allowance', 0, 1, 'FIXED', 1600),
('sc_medical', 'Medical Allowance', 'MED', 'EARNING', 'Medical expense allowance', 0, 1, 'FIXED', 1250),
('sc_special', 'Special Allowance', 'SPECIAL', 'EARNING', 'Special allowance', 1, 1, 'FIXED', 0),
('sc_bonus', 'Performance Bonus', 'BONUS', 'EARNING', 'Performance-based bonus', 1, 0, 'FIXED', 0)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert default salary components (Deductions)
INSERT INTO salary_components (id, name, code, type, description, is_taxable, is_default, calculation_type, calculation_value) VALUES
('sc_pf', 'Provident Fund', 'PF', 'DEDUCTION', 'Employee provident fund contribution', 0, 1, 'PERCENTAGE', 12),
('sc_esi', 'Employee State Insurance', 'ESI', 'DEDUCTION', 'ESI contribution', 0, 1, 'PERCENTAGE', 0.75),
('sc_professional_tax', 'Professional Tax', 'PT', 'DEDUCTION', 'Professional tax as per state rules', 0, 1, 'FIXED', 200),
('sc_income_tax', 'Income Tax', 'IT', 'DEDUCTION', 'TDS on salary', 0, 1, 'FIXED', 0),
('sc_loan', 'Loan Deduction', 'LOAN', 'DEDUCTION', 'Employee loan repayment', 0, 0, 'FIXED', 0)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert default settings
INSERT INTO settings (id, setting_key, setting_value, setting_group, description) VALUES
('set_1', 'company_name', 'Enterprise HRMS Pvt. Ltd.', 'Company', 'Company name'),
('set_2', 'company_address', '123 Business Park, Tech City', 'Company', 'Company address'),
('set_3', 'company_email', 'contact@enterprisehrms.com', 'Company', 'Company email'),
('set_4', 'company_phone', '+91-1234567890', 'Company', 'Company phone'),
('set_5', 'office_start_time', '09:30', 'Attendance', 'Office start time'),
('set_6', 'office_end_time', '18:30', 'Attendance', 'Office end time'),
('set_7', 'late_checkin_grace_period', '30', 'Attendance', 'Grace period in minutes for late check-in'),
('set_8', 'half_day_hours', '4', 'Attendance', 'Minimum hours for half day'),
('set_9', 'full_day_hours', '8', 'Attendance', 'Minimum hours for full day'),
('set_10', 'payroll_cycle', 'Monthly', 'Payroll', 'Payroll processing cycle'),
('set_11', 'currency', 'INR', 'Payroll', 'Default currency'),
('set_12', 'pf_employer_contribution', '13', 'Payroll', 'Employer PF contribution percentage'),
('set_13', 'esi_employer_contribution', '3.25', 'Payroll', 'Employer ESI contribution percentage')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Insert default office location
INSERT INTO office_locations (id, name, latitude, longitude, radius, address) VALUES
('office_1', 'Head Office', 12.9716, 77.5946, 100, '123 Business Park, MG Road, Bangalore - 560001')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Create default Super Admin user (password: Admin@123)
-- Password hash for 'Admin@123' with bcrypt
INSERT INTO users (id, employee_id, email, password_hash, role_id, is_temp_password, must_change_password, is_active) VALUES
('user_admin', 'ADMIN001', 'admin@hrpayroll.com', '$2a$10$8KzQMGx5C5Kc5Q5Y5Q5Y5u5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y', 'role_super_admin', 0, 0, 1)
ON DUPLICATE KEY UPDATE email = VALUES(email);