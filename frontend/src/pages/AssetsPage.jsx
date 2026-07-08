import React, { useState } from 'react';
import { MonitorSmartphone, Plus, Edit2, Trash2 } from 'lucide-react';

export default function AssetsPage() {
  const [assets, setAssets] = useState([
    { id: '1', name: 'MacBook Pro 14"', type: 'Laptop', serial: 'C02XD12345', assignedTo: 'John Doe', status: 'Assigned' },
    { id: '2', name: 'Dell UltraSharp 27"', type: 'Monitor', serial: 'CN-12345', assignedTo: 'Jane Smith', status: 'Assigned' },
    { id: '3', name: 'Logitech MX Master 3', type: 'Mouse', serial: 'SN-98765', assignedTo: 'Unassigned', status: 'Available' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-500">Manage company laptops, monitors, and equipment</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
          <Plus size={18} />
          Add Asset
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
              <th className="p-4 font-semibold">Asset Name</th>
              <th className="p-4 font-semibold">Serial Number</th>
              <th className="p-4 font-semibold">Assigned To</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                    <MonitorSmartphone size={18} />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800 block">{asset.name}</span>
                    <span className="text-xs text-gray-500">{asset.type}</span>
                  </div>
                </td>
                <td className="p-4 text-gray-600 font-mono text-sm">{asset.serial}</td>
                <td className="p-4 text-gray-600">{asset.assignedTo}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    asset.status === 'Assigned' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {asset.status}
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
