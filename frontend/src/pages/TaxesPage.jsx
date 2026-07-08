import React, { useState } from 'react';
import { Landmark, Plus, Edit2, Trash2 } from 'lucide-react';

export default function TaxesPage() {
  const [taxes, setTaxes] = useState([
    { id: '1', name: 'Income Tax (TDS)', rate: 'Variable', type: 'Deduction' },
    { id: '2', name: 'Provident Fund (PF)', rate: '12%', type: 'Deduction' },
    { id: '3', name: 'Professional Tax', rate: '$200 Fixed', type: 'Deduction' },
    { id: '4', name: 'Health Insurance', rate: '$50 Fixed', type: 'Deduction' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Taxes & Deductions</h1>
          <p className="text-gray-500">Manage tax brackets, provident funds, and global deductions</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
          <Plus size={18} />
          Add Tax Rule
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
              <th className="p-4 font-semibold">Tax / Deduction Name</th>
              <th className="p-4 font-semibold">Rate / Amount</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {taxes.map((tax) => (
              <tr key={tax.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <Landmark size={18} />
                  </div>
                  <span className="font-medium text-gray-800">{tax.name}</span>
                </td>
                <td className="p-4 text-gray-600 font-medium">{tax.rate}</td>
                <td className="p-4">
                  <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {tax.type}
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
