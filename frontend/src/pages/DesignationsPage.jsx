import React, { useState } from 'react';
import { Briefcase, Plus, Edit2, Trash2 } from 'lucide-react';

export default function DesignationsPage() {
  const [designations, setDesignations] = useState([
    { id: '1', title: 'Software Engineer', department: 'Engineering', salaryGrade: 'L3', baseSalary: '$80,000' },
    { id: '2', title: 'Senior Software Engineer', department: 'Engineering', salaryGrade: 'L4', baseSalary: '$120,000' },
    { id: '3', title: 'Sales Executive', department: 'Sales', salaryGrade: 'S1', baseSalary: '$50,000' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designations</h1>
          <p className="text-gray-500">Manage job titles, roles, and salary grades</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
          <Plus size={18} />
          Add Designation
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
              <th className="p-4 font-semibold">Job Title</th>
              <th className="p-4 font-semibold">Department</th>
              <th className="p-4 font-semibold">Salary Grade</th>
              <th className="p-4 font-semibold">Base Salary Range</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {designations.map((desig) => (
              <tr key={desig.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Briefcase size={18} />
                  </div>
                  <span className="font-medium text-gray-800">{desig.title}</span>
                </td>
                <td className="p-4 text-gray-600">{desig.department}</td>
                <td className="p-4">
                  <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    Grade {desig.salaryGrade}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{desig.baseSalary}</td>
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
            {designations.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  No designations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
