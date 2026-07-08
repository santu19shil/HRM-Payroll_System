import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Users, UserCheck, CalendarClock, Banknote } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Dark theme chart defaults
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = 'rgba(148, 163, 184, 0.08)';

export default function AdminDashboardPage() {
  const stats = [
    { label: 'Total Employees', value: '142', icon: <Users size={22} />, color: 'blue' },
    { label: 'Present Today', value: '138', icon: <UserCheck size={22} />, color: 'green' },
    { label: 'On Leave', value: '4', icon: <CalendarClock size={22} />, color: 'orange' },
    { label: 'Payroll This Month', value: '$245,000', icon: <Banknote size={22} />, color: 'purple' },
  ];

  const salaryData = {
    labels: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'],
    datasets: [
      {
        label: 'Salary Distribution ($)',
        data: [120000, 60000, 30000, 15000, 20000],
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(139, 92, 246, 0.6)',
          'rgba(236, 72, 153, 0.6)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const attendanceData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      {
        label: 'Attendance %',
        data: [98, 97, 95, 96, 99],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#10b981',
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const departmentData = {
    labels: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'],
    datasets: [
      {
        label: 'Employees',
        data: [45, 30, 15, 5, 8],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(236, 72, 153, 0.7)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
    },
  };

  const activities = [
    { text: 'Payroll generated for June 2026', meta: 'By Super Admin • 2 hours ago' },
    { text: 'New employee John Doe onboarded', meta: 'By HR Team • 5 hours ago' },
    { text: 'Leave approved for Sarah Smith', meta: 'By Manager • Yesterday' },
    { text: 'Department "Design" created', meta: 'By Super Admin • 2 days ago' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome to the Enterprise HR Payroll System</p>
      </div>

      <div className="grid grid4" style={{ marginBottom: 24 }}>
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card">
            <div className={`stat-icon ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <p>{stat.label}</p>
              <p>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid2" style={{ marginBottom: 24 }}>
        <div className="chart-card">
          <h2>Department Salary Expense</h2>
          <Bar data={salaryData} options={chartOptions} />
        </div>
        <div className="chart-card">
          <h2>Weekly Attendance Trend</h2>
          <Line data={attendanceData} options={chartOptions} />
        </div>
      </div>

      <div className="grid grid3">
        <div className="chart-card">
          <h2>Headcount by Department</h2>
          <Doughnut data={departmentData} options={{ ...chartOptions, cutout: '65%' }} />
        </div>
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h2>Recent Activities</h2>
          {activities.map((act, i) => (
            <div key={i} className="activity-item">
              <div className="activity-dot" />
              <div>
                <div className="activity-text">{act.text}</div>
                <div className="activity-meta">{act.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
