import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2 } from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([
    { id: '1', name: 'Engineering', head: 'John Doe', budget: '$500,000', count: 45 },
    { id: '2', name: 'Sales', head: 'Jane Smith', budget: '$200,000', count: 30 },
    { id: '3', name: 'Marketing', head: 'Alice Johnson', budget: '$150,000', count: 15 },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500">Manage company departments and budgets</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
          <Plus size={18} />
          Add Department
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
              <th className="p-4 font-semibold">Department Name</th>
              <th className="p-4 font-semibold">Department Head</th>
              <th className="p-4 font-semibold">Budget</th>
              <th className="p-4 font-semibold">Employees</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {departments.map((dept) => (
              <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Building2 size={18} />
                  </div>
                  <span className="font-medium text-gray-800">{dept.name}</span>
                </td>
                <td className="p-4 text-gray-600">{dept.head}</td>
                <td className="p-4 text-gray-600">{dept.budget}</td>
                <td className="p-4">
                  <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {dept.count} Members
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
            {departments.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  No departments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
