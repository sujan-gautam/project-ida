import React from 'react';
import { Eye } from 'lucide-react';

interface PreviewTabProps {
  data: any[];
}

const PreviewTab: React.FC<PreviewTabProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No data to preview</p>
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <Eye className="w-8 h-8 text-indigo-600" />
          Data Preview
        </h2>
        <span className="text-sm text-gray-600">Showing first 50 rows</span>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-bold">#</th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left font-bold whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.slice(0, 50).map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-500">
                    {idx + 1}
                  </td>
                  {Object.values(row).map((val, i) => (
                    <td
                      key={i}
                      className="px-4 py-3 text-gray-700 whitespace-nowrap"
                    >
                      {val !== null && val !== undefined && val !== '' ? (
                        String(val)
                      ) : (
                        <span className="text-red-400 italic">null</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PreviewTab;

