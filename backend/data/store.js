const { nanoid } = require('nanoid');

// In-memory store (resets on server restart)
const db = {
  employees: [],
  payrollRuns: []
};

function seedIfEmpty() {
  if (db.employees.length > 0) return;

  db.employees.push(
    {
      id: nanoid(),
      name: 'Asha Kumar',
      email: 'asha@example.com',
      department: 'Engineering',
      baseSalaryMonthly: 8500,
      deductionsMonthly: 500,
      bonusesMonthly: 300
    },
    {
      id: nanoid(),
      name: 'Ravi Sharma',
      email: 'ravi@example.com',
      department: 'Finance',
      baseSalaryMonthly: 7200,
      deductionsMonthly: 650,
      bonusesMonthly: 450
    }
  );
}

seedIfEmpty();

module.exports = {
  db,
  seedIfEmpty
};

