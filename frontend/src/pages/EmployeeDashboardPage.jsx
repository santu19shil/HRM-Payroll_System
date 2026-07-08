import React from 'react';
import { CalendarRange, CalendarClock, Briefcase, FileText } from 'lucide-react';

export default function EmployeeDashboardPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here is your quick overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <CalendarClock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Present Days</p>
            <p className="text-2xl font-bold text-gray-900">18</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <CalendarRange size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Leaves Available</p>
            <p className="text-2xl font-bold text-gray-900">12</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pending Approvals</p>
            <p className="text-2xl font-bold text-gray-900">1</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Upcoming Holidays</p>
            <p className="text-2xl font-bold text-gray-900">2</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Holidays</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-800 font-medium">Independence Day</span>
              <span className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded">Aug 15, 2026</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-800 font-medium">Christmas</span>
              <span className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded">Dec 25, 2026</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
              <CalendarRange size={20} className="text-blue-600 mb-2" />
              <div className="font-medium text-gray-800">Apply for Leave</div>
              <div className="text-xs text-gray-500">Submit a new request</div>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left">
              <FileText size={20} className="text-purple-600 mb-2" />
              <div className="font-medium text-gray-800">Download Payslip</div>
              <div className="text-xs text-gray-500">Latest: June 2026</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
