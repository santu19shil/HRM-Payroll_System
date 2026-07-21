import React, { useState } from 'react';
import {
  Briefcase, Users, UserCheck, Clock, CalendarClock, CalendarX, Wallet, AlertTriangle,
  FileText, Megaphone, LayoutDashboard, Building2, Settings, LogOut, Search,
  Activity, Plus, Filter, MoreHorizontal, Phone, Mail, MapPin, Download, Calendar,
  CheckCircle2, XCircle, CreditCard, Bell, ShieldCheck, PieChart, ListChecks
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const MOCK_USER = { first_name: 'Santu', last_name: 'Shil', email: 'admin@hrpayroll.com', role_name: 'SUPER_ADMIN' };

const NAV = [
  { id: 'dash', section: 'Main', items: [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Employees', icon: Users },
    { label: 'Departments', icon: Building2 },
  ]},
  { id: 'ops', section: 'Operations', items: [
    { label: 'Attendance', icon: Clock, badge: 4 },
    { label: 'Leave Management', icon: CalendarClock, badge: 7 },
    { label: 'Payroll', icon: Wallet },
    { label: 'Documents', icon: FileText, badge: 2 },
    { label: 'Notices', icon: Megaphone },
  ]},
  { id: 'acct', section: 'Account', items: [
    { label: 'Settings', icon: Settings },
    { label: 'Logout', icon: LogOut, action: true },
  ]},
];

const TONE = { blue: 'blue', green: 'green', yellow: 'yellow', red: 'red', purple: 'purple', indigo: 'indigo' };

const EMPLOYEES = [
  { id: 'E001', name: 'Aarav Sharma', dept: 'Engineering', desig: 'Senior Dev', email: 'aarav@hrpayroll.com', phone: '+91 98765 43210', location: 'Bangalore', status: 'Active' },
  { id: 'E002', name: 'Riya Iyer', dept: 'Sales', desig: 'Account Exec', email: 'riya@hrpayroll.com', phone: '+91 98112 22334', location: 'Mumbai', status: 'Active' },
  { id: 'E003', name: 'Karan Nair', dept: 'Operations', desig: 'Coordinator', email: 'karan@hrpayroll.com', phone: '+91 97654 32109', location: 'Bangalore', status: 'Active' },
  { id: 'E004', name: 'Meera Das', dept: 'Finance', desig: 'Analyst', email: 'meera@hrpayroll.com', phone: '+91 99001 12233', location: 'Kolkata', status: 'Active' },
  { id: 'E005', name: 'Dev Malhotra', dept: 'Engineering', desig: 'Tech Lead', email: 'dev@hrpayroll.com', phone: '+91 98456 78901', location: 'Pune', status: 'On Leave' },
  { id: 'E006', name: 'Sara Menon', dept: 'HR', desig: 'HR Partner', email: 'sara@hrpayroll.com', phone: '+91 99321 45678', location: 'Bangalore', status: 'Active' },
];

const DEPARTMENTS = [
  { id: 'D01', name: 'Engineering', head: 'Dev Malhotra', employees: 142, status: 'Active' },
  { id: 'D02', name: 'Sales', head: 'Priya Nair', employees: 88, status: 'Active' },
  { id: 'D03', name: 'Operations', head: 'Karan Nair', employees: 64, status: 'Active' },
  { id: 'D04', name: 'Finance', head: 'Meera Das', employees: 31, status: 'Active' },
  { id: 'D05', name: 'Human Resources', head: 'Sara Menon', employees: 19, status: 'Active' },
];

const LEAVES = [
  { id: 'L01', emp: 'Riya Iyer', type: 'Annual Leave', from: '12 Aug', to: '16 Aug', days: 5, status: 'Pending', tone: 'yellow' },
  { id: 'L02', emp: 'Karan Nair', type: 'Casual Leave', from: '03 Sep', to: '03 Sep', days: 1, status: 'Pending', tone: 'yellow' },
  { id: 'L03', emp: 'Aarav Sharma', type: 'Annual Leave', from: '21 Jul', to: '25 Jul', days: 5, status: 'Approved', tone: 'green' },
  { id: 'L04', emp: 'Meera Das', type: 'Sick Leave', from: '08 Jul', to: '09 Jul', days: 2, status: 'Approved', tone: 'green' },
  { id: 'L05', emp: 'Dev Malhotra', type: 'Paternity', from: '01 Aug', to: '15 Aug', days: 15, status: 'Rejected', tone: 'red' },
];

const ATTENDANCE = [
  { id: 'A01', emp: 'Aarav Sharma', dept: 'Engineering', date: '16 Jul', checkin: '09:24', checkOut: '18:31', hours: '8.1', status: 'Present' },
  { id: 'A02', emp: 'Riya Iyer', dept: 'Sales', date: '16 Jul', checkin: '09:52', checkOut: '18:40', hours: '7.8', status: 'Late' },
  { id: 'A03', emp: 'Karan Nair', dept: 'Operations', date: '16 Jul', checkin: '—', checkOut: '—', hours: '0.0', status: 'Absent' },
  { id: 'A04', emp: 'Meera Das', dept: 'Finance', date: '16 Jul', checkin: '09:18', checkOut: '18:22', hours: '8.1', status: 'Present' },
  { id: 'A05', emp: 'Sara Menon', dept: 'HR', date: '16 Jul', checkin: '09:31', checkOut: '18:05', hours: '7.6', status: 'Present' },
];

const PAYROLL = [
  { id: 'P01', emp: 'Aarav Sharma', month: 'Jul 2026', gross: '₹92,400', deductions: '₹14,200', net: '₹78,200', status: 'Paid' },
  { id: 'P02', emp: 'Riya Iyer', month: 'Jul 2026', gross: '₹71,800', deductions: '₹10,300', net: '₹61,500', status: 'Paid' },
  { id: 'P03', emp: 'Karan Nair', month: 'Jul 2026', gross: '₹61,200', deductions: '₹8,400', net: '₹52,800', status: 'Pending' },
  { id: 'P04', emp: 'Meera Das', month: 'Jul 2026', gross: '₹84,900', deductions: '₹11,800', net: '₹73,100', status: 'Paid' },
];

const DOCUMENTS = [
  { id: 'DOC1', name: 'Aarav_Sharma_Offer.pdf', emp: 'Aarav Sharma', type: 'Offer Letter', size: '248 KB', status: 'Verified', tone: 'green' },
  { id: 'DOC2', name: 'Riya_Iyer_PAN.pdf', emp: 'Riya Iyer', type: 'PAN Card', size: '112 KB', status: 'Pending', tone: 'yellow' },
  { id: 'DOC3', name: 'Karan_Nair_Aadhaar.pdf', emp: 'Karan Nair', type: 'Aadhaar', size: '196 KB', status: 'Verified', tone: 'green' },
  { id: 'DOC4', name: 'Meera_Das_Bank.pdf', emp: 'Meera Das', type: 'Bank Proof', size: '88 KB', status: 'Rejected', tone: 'red' },
];

const NOTICES = [
  { id: 'N1', title: 'Q2 All-Hands Meeting', body: 'Join us on 25 July for the quarterly all-hands. Agenda and calendar invite attached.', audience: 'All Employees', date: '14 Jul 2026', pinned: true },
  { id: 'N2', title: 'Payroll Cut-off Reminder', body: 'Submit timesheets by 20 July to be included in the July run.', audience: 'Engineering', date: '12 Jul 2026', pinned: false },
  { id: 'N3', title: 'New Health Insurance Tier', body: 'Updated ESI coverage is now active for all full-time staff.', audience: 'All Employees', date: '08 Jul 2026', pinned: false },
];

const SETTINGS = [
  { group: 'Company', rows: [
    { key: 'company_name', label: 'Company Name', value: 'Enterprise HRMS Pvt. Ltd.' },
    { key: 'company_email', label: 'Company Email', value: 'contact@enterprisehrms.com' },
    { key: 'currency', label: 'Default Currency', value: 'INR' },
  ]},
  { group: 'Attendance', rows: [
    { key: 'office_start', label: 'Office Start Time', value: '09:30' },
    { key: 'office_end', label: 'Office End Time', value: '18:30' },
    { key: 'grace', label: 'Late Grace Period', value: '30 mins' },
  ]},
  { group: 'Payroll', rows: [
    { key: 'cycle', label: 'Payroll Cycle', value: 'Monthly' },
    { key: 'pf', label: 'Employer PF', value: '13%' },
    { key: 'esi', label: 'Employer ESI', value: '3.25%' },
  ]},
];

const RECENT = [
  { name: 'Aarav Sharma', dept: 'Engineering', status: 'Present', tone: 'green' },
  { name: 'Riya Iyer', dept: 'Sales', status: 'Late', tone: 'yellow' },
  { name: 'Karan Nair', dept: 'Operations', status: 'Absent', tone: 'red' },
  { name: 'Meera Das', dept: 'Finance', status: 'Present', tone: 'green' },
  { name: 'Dev Malhotra', dept: 'Engineering', status: 'Present', tone: 'green' },
];

const DONUT = {
  labels: ['Present', 'Late', 'Absent'],
  datasets: [{ data: [892, 64, 28], backgroundColor: ['#16a34a', '#d97706', '#dc2626'], borderWidth: 0, hoverOffset: 6 }],
};

const ADMIN_STATS = [
  { label: 'Total Employees', value: '1,284', icon: Users, tone: 'blue' },
  { label: 'Present Today', value: '1,042', icon: UserCheck, tone: 'green' },
  { label: 'Pending Leaves', value: '17', icon: CalendarX, tone: 'yellow' },
  { label: 'Pending Payroll', value: '3', icon: Wallet, tone: 'red' },
];

const EMP_STATS = [
  { label: 'My Attendance', value: '98.2%', icon: UserCheck, tone: 'green' },
  { label: 'Leaves Left', value: '14', icon: CalendarX, tone: 'yellow' },
  { label: 'Next Payroll', value: '₹84,200', icon: Wallet, tone: 'blue' },
  { label: 'Documents', value: '6', icon: FileText, tone: 'purple' },
];

const EMP_LEAVES = [
  { type: 'Annual Leave', from: '12 Aug', to: '16 Aug', days: 5, status: 'Approved', tone: 'green' },
  { type: 'Casual Leave', from: '03 Sep', to: '03 Sep', days: 1, status: 'Pending', tone: 'yellow' },
  { type: 'Sick Leave', from: '21 Jul', to: '22 Jul', days: 2, status: 'Approved', tone: 'green' },
];

const TITLE = {
  dash: 'Dashboard', employees: 'Employees', departments: 'Departments',
  attendance: 'Attendance', leaves: 'Leave Management', payroll: 'Payroll',
  documents: 'Documents', notices: 'Company Notices', settings: 'Settings', profile: 'My Profile',
};

function Badge({ tone, children }) {
  const map = { green: 'success', yellow: 'warning', red: 'danger', blue: 'primary', purple: 'info', gray: 'gray' };
  return <span className={`badge badge-${map[tone] || 'gray'}`}>{children}</span>;
}

function StatGrid({ stats }) {
  return (
    <div className="grid-stat">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${TONE[s.tone]}`}><Icon size={22} strokeWidth={2} /></div>
            <div className="stat-content">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Toolbar({ left, right }) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">{left}</div>
      <div className="toolbar-right">{right}</div>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="search-bar">
      <span className="search-bar-icon"><Search size={16} color="var(--muted)" /></span>
      <input value={value} onChange={onChange} placeholder={placeholder || 'Search...'} />
    </div>
  );
}

/* ---------- Views ---------- */

function AdminDashboard() {
  const [month] = useState('July');
  const [year] = useState(2026);
  const att = { present: 892, late: 64, absent: 28 };
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1>Workforce Overview</h1>
        <p>Live snapshot of your organization — {month} {year}.</p>
      </div>

      <StatGrid stats={ADMIN_STATS} />

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Workforce Insights</div>
              <div className="card-subtitle">{month} {year} attendance distribution</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ width: 190, height: 190, flexShrink: 0 }}>
              <Doughnut data={DONUT} options={{ cutout: '68%', plugins: { legend: { display: false } } }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Present', value: att.present, color: '#16a34a' },
                { label: 'Late', value: att.late, color: '#d97706' },
                { label: 'Absent', value: att.absent, color: '#dc2626' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }}></span>
                  <span style={{ fontSize: 14, fontWeight: 600, minWidth: 64 }}>{s.label}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{s.value} days</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Today's Activity</div>
              <div className="card-subtitle">Real-time attendance feed</div>
            </div>
            <Activity size={18} color="var(--muted)" />
          </div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table>
              <thead><tr><th>Employee</th><th>Department</th><th>Status</th></tr></thead>
              <tbody>
                {RECENT.map((r) => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.dept}</td>
                    <td><Badge tone={r.tone}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Welcome to Enterprise HRMS</div>
            <div className="card-subtitle">HR Administration Dashboard</div>
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          Use the sidebar to navigate through the system. You can manage employees,
          departments, designations, attendance, leaves, payroll, and holidays from here.
        </p>
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1>Welcome back, {MOCK_USER.first_name}</h1>
        <p>Here's your personal workspace.</p>
      </div>

      <StatGrid stats={EMP_STATS} />

      <div className="grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">My Leave Balance</div>
              <div className="card-subtitle">Current cycle</div>
            </div>
            <CalendarClock size={18} color="var(--muted)" />
          </div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table>
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
              <tbody>
                {EMP_LEAVES.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{l.type}</td>
                    <td>{l.from}</td>
                    <td>{l.to}</td>
                    <td>{l.days}</td>
                    <td><Badge tone={l.tone}>{l.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Employees() {
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('All');
  const filtered = EMPLOYEES.filter((e) =>
    (dept === 'All' || e.dept === dept) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()))
  );
  const depts = ['All', ...new Set(EMPLOYEES.map((e) => e.dept))];
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Employees</h1>
        <p>Manage your organization's workforce.</p>
      </div>
      <Toolbar
        left={<><SearchBox value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." />
          <select className="form-select" value={dept} onChange={(e) => setDept(e.target.value)} style={{ width: 180 }}>
            {depts.map((d) => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select></>}
        right={<button className="btn btn-primary btn-sm"><Plus size={16} /> Add Employee</button>}
      />
      <div className="table-container">
        <table>
          <thead><tr><th>ID</th><th>Employee</th><th>Department</th><th>Designation</th><th>Contact</th><th>Location</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td className="mono" style={{ color: 'var(--text-secondary)' }}>{e.id}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="topbar-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{e.name.split(' ').map((n) => n[0]).join('')}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.email}</div>
                    </div>
                  </div>
                </td>
                <td>{e.dept}</td>
                <td>{e.desig}</td>
                <td>
                  <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} color="var(--muted)" /> {e.phone}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} color="var(--muted)" /> {e.email}</div>
                </td>
                <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={13} color="var(--muted)" /> {e.location}</span></td>
                <td><Badge tone={e.status === 'Active' ? 'green' : 'yellow'}>{e.status}</Badge></td>
                <td><button className="btn btn-icon btn-sm"><MoreHorizontal size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Departments() {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Departments</h1>
        <p>Organize your workforce into departments.</p>
      </div>
      <Toolbar right={<button className="btn btn-primary btn-sm"><Plus size={16} /> Add Department</button>} />
      <div className="table-container">
        <table>
          <thead><tr><th>ID</th><th>Department</th><th>Head</th><th>Employees</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {DEPARTMENTS.map((d) => (
              <tr key={d.id}>
                <td className="mono" style={{ color: 'var(--text-secondary)' }}>{d.id}</td>
                <td style={{ fontWeight: 600 }}>{d.name}</td>
                <td>{d.head}</td>
                <td>{d.employees}</td>
                <td><Badge tone="green">{d.status}</Badge></td>
                <td><button className="btn btn-icon btn-sm"><MoreHorizontal size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Attendance() {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Attendance</h1>
        <p>Track daily check-in and check-out across the organization.</p>
      </div>
      <Toolbar
        left={<><SearchBox placeholder="Search employee..." /><input type="date" className="form-input" style={{ width: 160 }} /></>}
        right={<button className="btn btn-primary btn-sm"><Download size={16} /> Export</button>}
      />
      <div className="table-container">
        <table>
          <thead><tr><th>ID</th><th>Employee</th><th>Department</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
          <tbody>
            {ATTENDANCE.map((a) => (
              <tr key={a.id}>
                <td className="mono" style={{ color: 'var(--text-secondary)' }}>{a.id}</td>
                <td style={{ fontWeight: 600 }}>{a.emp}</td>
                <td>{a.dept}</td>
                <td>{a.date}</td>
                <td>{a.checkin}</td>
                <td>{a.checkOut}</td>
                <td>{a.hours}</td>
                <td><Badge tone={a.status === 'Present' ? 'green' : a.status === 'Late' ? 'yellow' : 'red'}>{a.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Leaves() {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Leave Management</h1>
        <p>Review and act on leave requests.</p>
      </div>
      <Toolbar right={<button className="btn btn-primary btn-sm"><Plus size={16} /> New Request</button>} />
      <div className="table-container">
        <table>
          <thead><tr><th>ID</th><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {LEAVES.map((l) => (
              <tr key={l.id}>
                <td className="mono" style={{ color: 'var(--text-secondary)' }}>{l.id}</td>
                <td style={{ fontWeight: 600 }}>{l.emp}</td>
                <td>{l.type}</td>
                <td>{l.from}</td>
                <td>{l.to}</td>
                <td>{l.days}</td>
                <td><Badge tone={l.tone}>{l.status}</Badge></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {l.status === 'Pending' && <>
                    <button className="btn btn-sm btn-success" style={{ marginRight: 6 }}><CheckCircle2 size={14} /> Approve</button>
                    <button className="btn btn-sm btn-danger"><XCircle size={14} /> Reject</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Payroll() {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Payroll</h1>
        <p>Process salaries and generate payslips.</p>
      </div>
      <Toolbar
        left={<><SearchBox placeholder="Search employee..." /><select className="form-select" style={{ width: 160 }}><option>Jul 2026</option><option>Jun 2026</option></select></>}
        right={<button className="btn btn-primary btn-sm"><Wallet size={16} /> Run Payroll</button>}
      />
      <div className="table-container">
        <table>
          <thead><tr><th>ID</th><th>Employee</th><th>Month</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {PAYROLL.map((p) => (
              <tr key={p.id}>
                <td className="mono" style={{ color: 'var(--text-secondary)' }}>{p.id}</td>
                <td style={{ fontWeight: 600 }}>{p.emp}</td>
                <td>{p.month}</td>
                <td>{p.gross}</td>
                <td>{p.deductions}</td>
                <td style={{ fontWeight: 700 }}>{p.net}</td>
                <td><Badge tone={p.status === 'Paid' ? 'green' : 'yellow'}>{p.status}</Badge></td>
                <td><button className="btn btn-icon btn-sm"><Download size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Documents() {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Documents</h1>
        <p>Verify and manage employee documents.</p>
      </div>
      <Toolbar right={<button className="btn btn-primary btn-sm"><Plus size={16} /> Upload</button>} />
      <div className="table-container">
        <table>
          <thead><tr><th>File</th><th>Employee</th><th>Type</th><th>Size</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {DOCUMENTS.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} color="var(--primary)" /> {d.name}</td>
                <td>{d.emp}</td>
                <td>{d.type}</td>
                <td>{d.size}</td>
                <td><Badge tone={d.tone}>{d.status}</Badge></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {d.status === 'Pending' && <>
                    <button className="btn btn-sm btn-success" style={{ marginRight: 6 }}><CheckCircle2 size={14} /> Verify</button>
                    <button className="btn btn-sm btn-danger"><XCircle size={14} /> Reject</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Notices() {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Company Notices</h1>
        <p>Broadcast announcements to your teams.</p>
      </div>
      <Toolbar right={<button className="btn btn-primary btn-sm"><Plus size={16} /> New Notice</button>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {NOTICES.map((n) => (
          <div key={n.id} className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Megaphone size={18} color="var(--primary)" />
                <div>
                  <div className="card-title">{n.title}</div>
                  <div className="card-subtitle">To: {n.audience} · {n.date}</div>
                </div>
              </div>
              {n.pinned && <Badge tone="blue">Pinned</Badge>}
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Settings</h1>
        <p>Configure company and system preferences.</p>
      </div>
      {SETTINGS.map((g) => (
        <div key={g.group} className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">{g.group}</div></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {g.rows.map((r, i) => (
              <div key={r.key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0', borderBottom: i < g.rows.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{r.label}</span>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {r.value}
                  <button className="btn btn-sm"><Settings size={14} /></button>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const VIEWS = {
  dash: { role: 'admin', Comp: AdminDashboard },
  employees: { role: 'admin', Comp: Employees },
  departments: { role: 'admin', Comp: Departments },
  attendance: { role: 'admin', Comp: Attendance },
  leaves: { role: 'admin', Comp: Leaves },
  payroll: { role: 'admin', Comp: Payroll },
  documents: { role: 'admin', Comp: Documents },
  notices: { role: 'admin', Comp: Notices },
  settings: { role: 'admin', Comp: Settings },
  profile: { role: 'emp', Comp: EmployeeDashboard },
};

export default function PreviewPage() {
  const [view, setView] = useState('dash');
  const [role, setRole] = useState('admin');
  const initials = (MOCK_USER.first_name[0] + MOCK_USER.last_name[0]).toUpperCase();
  const Active = (VIEWS[view] || VIEWS.dash).Comp;

  const onNav = (item) => {
    if (item.action) return;
    if (item.id === 'profile') { setRole('emp'); setView('profile'); return; }
    setRole('admin');
    setView(item.id);
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo"><Briefcase size={20} color="#fff" strokeWidth={2.2} /></div>
          <div>
            <h2>Enterprise HRMS</h2>
            <p>Payroll Management System</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((sec, i) => (
            <div key={i}>
              <div className="sidebar-section">{sec.section}</div>
              {sec.items.map((it) => {
                const Icon = it.icon;
                const active = (VIEWS[it.id]?.role === role) && view === it.id;
                return (
                  <div key={it.label} className={`sidebar-link${active ? ' active' : ''}`} onClick={() => onNav(it)} style={{ cursor: 'pointer' }}>
                    <span className="sidebar-icon"><Icon size={18} /></span>
                    <span className="sidebar-label">{it.label}</span>
                    {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">© 2026 Enterprise HRMS v1.0</div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">{TITLE[view] || 'Dashboard'}</h1>
            <div className="topbar-search">
              <span className="search-bar-icon"><Search size={16} color="var(--muted)" /></span>
              <input placeholder="Search employees, documents, payroll..." />
            </div>
          </div>
          <div className="topbar-right">
            <span className="role-pill">{role === 'admin' ? 'Super Admin' : 'Employee'}</span>
            <div className="topbar-avatar" title={MOCK_USER.email}>{initials}</div>
            <button className="btn btn-sm">Logout</button>
          </div>
        </header>

        <div className="page-content">
          <Active />
          <div style={{ marginTop: 24, padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} color="var(--warning)" />
            Preview mode — real UI rendered with sample data. Start the MySQL backend and seed the admin for the live system.
          </div>
        </div>
      </div>
    </div>
  );
}
