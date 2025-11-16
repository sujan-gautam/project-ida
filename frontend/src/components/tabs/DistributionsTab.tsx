import React, { useState } from 'react';
import { BarChart3, TrendingUp, Maximize2 } from 'lucide-react';
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
import FullscreenChartModal from '../FullscreenChartModal';

interface DistributionsTabProps {
  analysis: Analysis;
  data: any[];
}

interface ChartCardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  fullscreenContent: React.ReactNode;
  fullscreenTitle: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  icon: Icon,
  iconColor,
  children,
  fullscreenContent,
  fullscreenTitle,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200 relative group">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Icon className={`w-5 h-5 ${iconColor}`} />
            {title}
          </h3>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-2 rounded-lg bg-slate-200/50 hover:bg-slate-300/50 border border-slate-300/50 hover:border-emerald-500/50 transition-all opacity-0 group-hover:opacity-100"
            title="View in fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        {children}
      </div>
      <FullscreenChartModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={fullscreenTitle}
      >
        <div className="h-full w-full bg-white rounded-lg p-6">
          {fullscreenContent}
        </div>
      </FullscreenChartModal>
    </>
  );
};

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
          <ChartCard
            key={col}
            title={`Count Plot: ${col}`}
            icon={BarChart3}
            iconColor="text-indigo-600"
            fullscreenTitle={`Count Plot: ${col}`}
            fullscreenContent={
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    tick={{ fontSize: 14 }}
                  />
                  <YAxis tick={{ fontSize: 14 }} />
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
            }
          >
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
          </ChartCard>
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
          <ChartCard
            key={col}
            title={`Distribution: ${col}`}
            icon={TrendingUp}
            iconColor="text-green-600"
            fullscreenTitle={`Distribution: ${col}`}
            fullscreenContent={
              <>
                <ResponsiveContainer width="100%" height="70%">
                  <BarChart data={histData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="range"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      tick={{ fontSize: 14 }}
                    />
                    <YAxis tick={{ fontSize: 14 }} />
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
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-gray-600 mb-1">Skewness</div>
                      <div className="font-bold text-blue-600 text-lg">
                        {analysis.columns[col].stats!.skewness}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-gray-600 mb-1">IQR</div>
                      <div className="font-bold text-purple-600 text-lg">
                        {analysis.columns[col].stats!.iqr}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-gray-600 mb-1">Median</div>
                      <div className="font-bold text-green-600 text-lg">
                        {analysis.columns[col].stats!.median}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-gray-600 mb-1">Std Dev</div>
                      <div className="font-bold text-orange-600 text-lg">
                        {analysis.columns[col].stats!.std}
                      </div>
                    </div>
                  </div>
                )}
              </>
            }
          >
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
          </ChartCard>
        );
      })}
    </div>
  );
};

export default DistributionsTab;

