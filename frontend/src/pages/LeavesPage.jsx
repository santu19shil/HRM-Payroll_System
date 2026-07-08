import React, { useState } from 'react';
import { CalendarRange, Plus, Check, X } from 'lucide-react';

export default function LeavesPage() {
  const [requests, setRequests] = useState([
    { id: '1', empName: 'John Doe', type: 'Sick Leave', startDate: '2026-07-10', endDate: '2026-07-12', days: 3, status: 'Pending', reason: 'Fever' },
    { id: '2', empName: 'Jane Smith', type: 'Casual Leave', startDate: '2026-07-20', endDate: '2026-07-20', days: 1, status: 'Approved', reason: 'Personal' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-gray-500">Manage employee leave applications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Pending Requests</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">1</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Approved This Month</p>
          <p className="text-2xl font-bold text-green-600 mt-1">14</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Employees on Leave Today</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">4</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
              <th className="p-4 font-semibold">Employee</th>
              <th className="p-4 font-semibold">Leave Type</th>
              <th className="p-4 font-semibold">Dates</th>
              <th className="p-4 font-semibold">Days</th>
              <th className="p-4 font-semibold">Reason</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-800">{req.empName}</td>
                <td className="p-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <CalendarRange size={14} className="text-gray-400" />
                    {req.type}
                  </div>
                </td>
                <td className="p-4 text-gray-600">{req.startDate} to {req.endDate}</td>
                <td className="p-4 text-gray-600">{req.days}</td>
                <td className="p-4 text-gray-500 max-w-xs truncate">{req.reason}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    req.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="p-4 flex justify-end gap-2">
                  {req.status === 'Pending' && (
                    <>
                      <button className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors" title="Approve">
                        <Check size={16} />
                      </button>
                      <button className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors" title="Reject">
                        <X size={16} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
