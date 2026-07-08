const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH || process.env.SQLITE_PATH || path.join(__dirname, '..', '..', 'hr_payroll.sqlite');

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function init() {
  await run(`PRAGMA foreign_keys = ON`);

  await run(`CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS company_settings (
    companyId TEXT PRIMARY KEY,
    logoUrl TEXT,
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'UTC',
    payrollCycle TEXT DEFAULT 'Monthly',
    FOREIGN KEY(companyId) REFERENCES companies(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY(companyId) REFERENCES companies(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    passwordEncrypted TEXT,
    createdAt TEXT NOT NULL,
    UNIQUE(companyId, email),
    FOREIGN KEY(companyId) REFERENCES companies(id)
  )`);
  // Backfill passwordEncrypted column for existing DBs
  await run(`ALTER TABLE users ADD COLUMN passwordEncrypted TEXT`).catch(() => {});

  await run(`CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    headId TEXT,
    budget REAL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS designations (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    departmentId TEXT,
    title TEXT NOT NULL,
    salaryGrade TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id),
    FOREIGN KEY(departmentId) REFERENCES departments(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    departmentId TEXT,
    designationId TEXT,
    department TEXT, -- legacy
    baseSalaryMonthly REAL NOT NULL,
    deductionsMonthly REAL NOT NULL,
    bonusesMonthly REAL NOT NULL,
    dob TEXT,
    gender TEXT,
    bloodGroup TEXT,
    maritalStatus TEXT,
    address TEXT,
    contactNumber TEXT,
    joiningDate TEXT,
    employmentType TEXT,
    reportingManagerId TEXT,
    workLocation TEXT,
    bankDetailsJson TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id),
    FOREIGN KEY(departmentId) REFERENCES departments(id),
    FOREIGN KEY(designationId) REFERENCES designations(id)
  )`);
  
  // Backfill new columns for legacy employees table
  const employeeCols = ['departmentId', 'designationId', 'dob', 'gender', 'bloodGroup', 'maritalStatus', 'address', 'contactNumber', 'joiningDate', 'employmentType', 'reportingManagerId', 'workLocation', 'bankDetailsJson'];
  for(const col of employeeCols) {
    await run(`ALTER TABLE employees ADD COLUMN ${col} TEXT`).catch(() => {});
  }

  await run(`CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    employeeId TEXT NOT NULL,
    date TEXT NOT NULL,
    checkIn TEXT,
    checkOut TEXT,
    breakTimeMinutes INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    workHours REAL,
    FOREIGN KEY(companyId) REFERENCES companies(id),
    FOREIGN KEY(employeeId) REFERENCES employees(id),
    UNIQUE(employeeId, date)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    employeeId TEXT NOT NULL,
    leaveType TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT,
    managerId TEXT,
    hrId TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id),
    FOREIGN KEY(employeeId) REFERENCES employees(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS payrollRuns (
    runId TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    monthKey TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    approvedAt TEXT,
    processedAt TEXT,
    lineItemsJson TEXT NOT NULL,
    totalsJson TEXT NOT NULL,
    UNIQUE(companyId, monthKey)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS salary_components (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- ALLOWANCE or DEDUCTION
    isTaxable INTEGER DEFAULT 1,
    FOREIGN KEY(companyId) REFERENCES companies(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    employeeId TEXT NOT NULL,
    amount REAL NOT NULL,
    emi REAL NOT NULL,
    remainingBalance REAL NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id),
    FOREIGN KEY(employeeId) REFERENCES employees(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS reimbursements (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    employeeId TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    approvedBy TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id),
    FOREIGN KEY(employeeId) REFERENCES employees(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    employeeId TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    serialNumber TEXT,
    status TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id),
    FOREIGN KEY(employeeId) REFERENCES employees(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    employeeId TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    fileUrl TEXT NOT NULL,
    uploadedAt TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id),
    FOREIGN KEY(employeeId) REFERENCES employees(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    userId TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entityId TEXT,
    detailsJson TEXT,
    ipAddress TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS passwordResetTokens (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    email TEXT NOT NULL,
    tokenHash TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    usedAt TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(companyId) REFERENCES companies(id)
  )`);
}

module.exports = {
  dbPath,
  run,
  get,
  all,
  init
};
