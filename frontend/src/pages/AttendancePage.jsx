import React, { useState } from 'react';
import { CalendarClock, CheckCircle, Clock, Search, Filter } from 'lucide-react';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([
    { id: '1', empName: 'John Doe', date: '2026-07-07', checkIn: '09:00 AM', checkOut: '06:00 PM', status: 'Present', workHours: '9h 0m' },
    { id: '2', empName: 'Jane Smith', date: '2026-07-07', checkIn: '09:15 AM', checkOut: '06:30 PM', status: 'Late', workHours: '9h 15m' },
    { id: '3', empName: 'Alice Johnson', date: '2026-07-07', checkIn: '-', checkOut: '-', status: 'Absent', workHours: '0h 0m' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Log</h1>
          <p className="text-gray-500">Track daily employee attendance and work hours</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
            <Filter size={18} />
            Filter
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
            <CheckCircle size={18} />
            Mark Manual Attendance
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search employee by name..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        <input type="date" className="border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue="2026-07-07" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
              <th className="p-4 font-semibold">Employee</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Check In</th>
              <th className="p-4 font-semibold">Check Out</th>
              <th className="p-4 font-semibold">Work Hours</th>
              <th className="p-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {attendance.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-800">{record.empName}</td>
                <td className="p-4 text-gray-600">{record.date}</td>
                <td className="p-4 text-gray-600 flex items-center gap-2">
                  {record.checkIn !== '-' && <Clock size={14} className="text-gray-400" />}
                  {record.checkIn}
                </td>
                <td className="p-4 text-gray-600">{record.checkOut}</td>
                <td className="p-4 font-medium text-gray-700">{record.workHours}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    record.status === 'Present' ? 'bg-green-100 text-green-700' :
                    record.status === 'Late' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
