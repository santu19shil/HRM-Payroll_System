import React, { useState } from 'react';
import { CalendarDays, Plus, Edit2, Trash2 } from 'lucide-react';

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState([
    { id: '1', name: 'New Year', date: '2027-01-01', type: 'Public Holiday' },
    { id: '2', name: 'Christmas', date: '2026-12-25', type: 'Public Holiday' },
    { id: '3', name: 'Company Anniversary', date: '2026-08-15', type: 'Company Holiday' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holidays</h1>
          <p className="text-gray-500">Manage company and public holidays</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
          <Plus size={18} />
          Add Holiday
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
              <th className="p-4 font-semibold">Holiday Name</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {holidays.map((holiday) => (
              <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                    <CalendarDays size={18} />
                  </div>
                  <span className="font-medium text-gray-800">{holiday.name}</span>
                </td>
                <td className="p-4 text-gray-600">{holiday.date}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    holiday.type === 'Public Holiday' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {holiday.type}
                  </span>
                </td>
                <td className="p-4 flex justify-end gap-3">
                  <button className="text-gray-400 hover:text-blue-600 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button className="text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
