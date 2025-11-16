import React from 'react';
import { Analysis } from '../../types';

interface OverviewTabProps {
  analysis: Analysis;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ analysis }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Dataset Overview</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-4 rounded-lg text-white shadow-lg">
          <div className="text-2xl font-bold font-mono">
            {analysis.rowCount.toLocaleString()}
          </div>
          <div className="text-xs opacity-90 mt-1">Total Rows</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-4 rounded-lg text-white shadow-lg">
          <div className="text-2xl font-bold font-mono">{analysis.columnCount}</div>
          <div className="text-xs opacity-90 mt-1">Columns</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-500 p-4 rounded-lg text-white shadow-lg">
          <div className="text-2xl font-bold font-mono">{analysis.numericColumns.length}</div>
          <div className="text-xs opacity-90 mt-1">Numeric</div>
        </div>
        <div className="bg-gradient-to-br from-teal-500 to-cyan-500 p-4 rounded-lg text-white shadow-lg">
          <div className="text-2xl font-bold font-mono">
            {analysis.categoricalColumns.length}
          </div>
          <div className="text-xs opacity-90 mt-1">Categorical</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-blue-500 p-4 rounded-lg text-white shadow-lg">
          <div className="text-2xl font-bold font-mono">{analysis.dateColumns.length}</div>
          <div className="text-xs opacity-90 mt-1">DateTime</div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          Column Analysis
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-700/50 max-h-[400px] overflow-y-auto bg-slate-900/30 scrollbar-hide">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/50 sticky top-0 border-b border-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Column Name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Data Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Unique Values
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Missing
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Statistics
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {Object.entries(analysis.columns).map(([col, info]) => (
                <tr key={col} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{col}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-semibold ${
                        info.type === 'numeric'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : info.type === 'categorical'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : info.type === 'datetime'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
                      }`}
                    >
                      {info.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-medium font-mono">
                    {info.unique.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        info.missing > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {info.missing} ({info.missingPercent}%)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                    {info.stats && (
                      <div className="space-y-1">
                        <div>
                          μ: {info.stats.mean} | σ: {info.stats.std}
                        </div>
                        <div>
                          Range: [{info.stats.min}, {info.stats.max}]
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
