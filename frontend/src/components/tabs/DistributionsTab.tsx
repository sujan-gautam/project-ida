import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Analysis } from '../../types';

interface DistributionsTabProps {
  analysis: Analysis;
  data: any[];
}

const DistributionsTab: React.FC<DistributionsTabProps> = ({
  analysis,
  data,
}) => {
  const COLORS = [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#ef4444',
    '#14b8a6',
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white mb-6">
        Data Distributions
      </h2>

      {analysis.categoricalColumns.slice(0, 4).map((col) => {
        const colData = analysis.columns[col];
        if (!colData.valueCounts) return null;

        const chartData = colData.valueCounts.map(([name, value]) => ({
          name: String(name).substring(0, 25),
          count: value,
        }));

        return (
          <div
            key={col}
            className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Count Plot: {col}
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}

      {analysis.numericColumns.slice(0, 4).map((col) => {
        const values = data
          .map((row) => parseFloat(row[col]))
          .filter((v) => !isNaN(v) && isFinite(v));

        if (values.length === 0) return null;

        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = 25;
        const binSize = (max - min) / binCount;

        const bins = Array(binCount).fill(0);
        values.forEach((v) => {
          const binIndex = Math.min(
            Math.floor((v - min) / binSize),
            binCount - 1
          );
          bins[binIndex]++;
        });

        const histData = bins.map((count, i) => ({
          range: `${(min + i * binSize).toFixed(1)}`,
          count,
          density: count / values.length,
        }));

        return (
          <div
            key={col}
            className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Distribution: {col}
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={histData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="range"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {analysis.columns[col].stats && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-gray-600">Skewness</div>
                  <div className="font-bold text-blue-600">
                    {analysis.columns[col].stats!.skewness}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-gray-600">IQR</div>
                  <div className="font-bold text-purple-600">
                    {analysis.columns[col].stats!.iqr}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-gray-600">Median</div>
                  <div className="font-bold text-green-600">
                    {analysis.columns[col].stats!.median}
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-gray-600">Std Dev</div>
                  <div className="font-bold text-orange-600">
                    {analysis.columns[col].stats!.std}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DistributionsTab;

