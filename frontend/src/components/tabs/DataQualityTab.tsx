import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Maximize2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Analysis } from '../../types';
import FullscreenChartModal from '../FullscreenChartModal';

interface DataQualityTabProps {
  analysis: Analysis;
  data: any[];
}

const DataQualityTab: React.FC<DataQualityTabProps> = ({
  analysis,
  data,
}) => {
  const infiniteValueStats = analysis.infiniteValueStats || {};
  const hasInfiniteValues = analysis.hasInfiniteValues || false;
  const duplicateStats = analysis.duplicateStats || {};
  const [infiniteFullscreen, setInfiniteFullscreen] = useState(false);
  const [missingFullscreen, setMissingFullscreen] = useState(false);
  const [duplicateFullscreen, setDuplicateFullscreen] = useState(false);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
        <AlertTriangle className="w-8 h-8 text-orange-600" />
        Data Quality Analysis
      </h2>

      {/* Infinite Values Section */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200 relative group">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-800">
          Infinite Values Detection
        </h3>
          {hasInfiniteValues && (
            <button
              onClick={() => setInfiniteFullscreen(true)}
              className="p-2 rounded-lg bg-slate-200/50 hover:bg-slate-300/50 border border-slate-300/50 hover:border-emerald-500/50 transition-all opacity-0 group-hover:opacity-100"
              title="View in fullscreen"
            >
              <Maximize2 className="w-4 h-4 text-slate-600" />
            </button>
          )}
        </div>

        {hasInfiniteValues ? (
          <>
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 font-medium">
                  Found infinite values in {Object.keys(infiniteValueStats).length}{' '}
                  column(s)
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-4">
                Infinite Values by Column
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(infiniteValueStats).map(([col, stats]) => ({
                    name: col.substring(0, 20),
                    count: stats.count,
                    percentage: parseFloat(stats.percentage),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {Object.entries(infiniteValueStats).map(([col, stats]) => (
                <div key={col} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-700">{col}</span>
                      <span className="text-sm text-red-600 font-bold">
                        {stats.count} infinite ({stats.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-500 to-red-700 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${stats.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-green-600">
            <div className="text-6xl mb-3">✓</div>
            <p className="text-lg font-semibold">No infinite values detected!</p>
          </div>
        )}
      </div>
      {hasInfiniteValues && (
        <FullscreenChartModal
          isOpen={infiniteFullscreen}
          onClose={() => setInfiniteFullscreen(false)}
          title="Infinite Values Detection"
        >
          <div className="h-full w-full bg-white rounded-lg p-6 overflow-auto">
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-4 text-lg">
                Infinite Values by Column
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={Object.entries(infiniteValueStats).map(([col, stats]) => ({
                    name: col.substring(0, 20),
                    count: stats.count,
                    percentage: parseFloat(stats.percentage),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {Object.entries(infiniteValueStats).map(([col, stats]) => (
                <div key={col} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-700">{col}</span>
                      <span className="text-sm text-red-600 font-bold">
                        {stats.count} infinite ({stats.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-500 to-red-700 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${stats.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FullscreenChartModal>
      )}

      {/* Missing Values Section */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200 relative group">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-800">
          Missing Values Analysis
        </h3>
          {Object.values(analysis.columns).some((info) => info.missing > 0) && (
            <button
              onClick={() => setMissingFullscreen(true)}
              className="p-2 rounded-lg bg-slate-200/50 hover:bg-slate-300/50 border border-slate-300/50 hover:border-emerald-500/50 transition-all opacity-0 group-hover:opacity-100"
              title="View in fullscreen"
            >
              <Maximize2 className="w-4 h-4 text-slate-600" />
            </button>
          )}
        </div>

        {Object.values(analysis.columns).some((info) => info.missing > 0) ? (
          <>
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <p className="text-orange-800 font-medium">
                  Found missing values in{' '}
                  {Object.values(analysis.columns).filter((info) => info.missing > 0)
                    .length}{' '}
                  column(s)
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-4">
                Missing Values by Column
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(analysis.columns)
                    .filter(([_, info]) => info.missing > 0)
                    .map(([col, info]) => ({
                      name: col.substring(0, 20),
                      missing: info.missing,
                      percentage: parseFloat(info.missingPercent),
                    }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="missing" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Missing Values Details</h4>
              {Object.entries(analysis.columns)
                .filter(([_, info]) => info.missing > 0)
                .map(([col, info]) => (
                  <div key={col} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">{col}</span>
                        <span className="text-sm text-orange-600 font-bold">
                          {info.missing} missing ({info.missingPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${info.missingPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-green-600">
            <div className="text-6xl mb-3">✓</div>
            <p className="text-lg font-semibold">No missing values detected!</p>
          </div>
        )}
      </div>
      {Object.values(analysis.columns).some((info) => info.missing > 0) && (
        <FullscreenChartModal
          isOpen={missingFullscreen}
          onClose={() => setMissingFullscreen(false)}
          title="Missing Values Analysis"
        >
          <div className="h-full w-full bg-white rounded-lg p-6 overflow-auto">
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-4 text-lg">
                Missing Values by Column
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={Object.entries(analysis.columns)
                    .filter(([_, info]) => info.missing > 0)
                    .map(([col, info]) => ({
                      name: col.substring(0, 20),
                      missing: info.missing,
                      percentage: parseFloat(info.missingPercent),
                    }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="missing" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Missing Values Details</h4>
              {Object.entries(analysis.columns)
                .filter(([_, info]) => info.missing > 0)
                .map(([col, info]) => (
                  <div key={col} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">{col}</span>
                        <span className="text-sm text-orange-600 font-bold">
                          {info.missing} missing ({info.missingPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${info.missingPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </FullscreenChartModal>
      )}

      {/* Duplicate Values Section */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200 relative group">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-800">
          Duplicate Values Analysis
        </h3>
          {Object.keys(duplicateStats).length > 0 && (
            <button
              onClick={() => setDuplicateFullscreen(true)}
              className="p-2 rounded-lg bg-slate-200/50 hover:bg-slate-300/50 border border-slate-300/50 hover:border-emerald-500/50 transition-all opacity-0 group-hover:opacity-100"
              title="View in fullscreen"
            >
              <Maximize2 className="w-4 h-4 text-slate-600" />
            </button>
          )}
        </div>

        {Object.keys(duplicateStats).length > 0 ? (
          <>
            <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-purple-600" />
                <p className="text-purple-800 font-medium">
                  Found duplicate values in {Object.keys(duplicateStats).length}{' '}
                  column(s)
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-4">
                Duplicate Values by Column
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(duplicateStats).map(([col, stats]) => ({
                    name: col.substring(0, 20),
                    duplicates: stats.duplicateCount,
                    percentage: parseFloat(stats.duplicatePercentage),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="duplicates"
                    fill="#a855f7"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">
                Duplicate Details by Column
              </h4>
              {Object.entries(duplicateStats).map(([col, stats]) => (
                <div
                  key={col}
                  className="bg-purple-50 p-4 rounded-xl border border-purple-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-gray-800 text-lg">{col}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {stats.duplicateCount} duplicate values (
                        {stats.duplicatePercentage}%) | {stats.uniqueValues} unique
                        out of {stats.totalValues} total values
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {stats.duplicatePercentage}%
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
                    <div
                      className="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${stats.duplicatePercentage}%` }}
                    ></div>
                  </div>

                  {stats.topDuplicates && stats.topDuplicates.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-semibold text-gray-700 mb-2">
                        Top Duplicate Values:
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {stats.topDuplicates.map((dup: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center bg-white p-2 rounded border border-purple-200"
                          >
                            <span className="text-sm text-gray-700 font-medium">
                              "{dup.value}"
                            </span>
                            <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
                              appears {dup.count} times
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-green-600">
            <div className="text-6xl mb-3">✓</div>
            <p className="text-lg font-semibold">
              No duplicate values detected!
            </p>
            <p className="text-sm text-gray-600 mt-2">
              All values in each column are unique
            </p>
          </div>
        )}
      </div>
      {Object.keys(duplicateStats).length > 0 && (
        <FullscreenChartModal
          isOpen={duplicateFullscreen}
          onClose={() => setDuplicateFullscreen(false)}
          title="Duplicate Values Analysis"
        >
          <div className="h-full w-full bg-white rounded-lg p-6 overflow-auto">
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-4 text-lg">
                Duplicate Values by Column
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={Object.entries(duplicateStats).map(([col, stats]) => ({
                    name: col.substring(0, 20),
                    duplicates: stats.duplicateCount,
                    percentage: parseFloat(stats.duplicatePercentage),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="duplicates"
                    fill="#a855f7"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">
                Duplicate Details by Column
              </h4>
              {Object.entries(duplicateStats).map(([col, stats]) => (
                <div
                  key={col}
                  className="bg-purple-50 p-4 rounded-xl border border-purple-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-gray-800 text-lg">{col}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {stats.duplicateCount} duplicate values (
                        {stats.duplicatePercentage}%) | {stats.uniqueValues} unique
                        out of {stats.totalValues} total values
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {stats.duplicatePercentage}%
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
                    <div
                      className="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${stats.duplicatePercentage}%` }}
                    ></div>
                  </div>
                  {stats.topDuplicates && stats.topDuplicates.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-semibold text-gray-700 mb-2">
                        Top Duplicate Values:
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {stats.topDuplicates.map((dup: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center bg-white p-2 rounded border border-purple-200"
                          >
                            <span className="text-sm text-gray-700 font-medium">
                              "{dup.value}"
                            </span>
                            <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
                              appears {dup.count} times
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </FullscreenChartModal>
      )}

      {/* Summary Statistics */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Data Quality Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 p-6 rounded-xl border-2 border-red-200">
            <div className="text-4xl font-bold text-red-600">
              {Object.keys(infiniteValueStats).length}
            </div>
            <div className="text-sm text-gray-700 mt-2">
              Columns with Infinite Values
            </div>
          </div>
          <div className="bg-orange-50 p-6 rounded-xl border-2 border-orange-200">
            <div className="text-4xl font-bold text-orange-600">
              {Object.values(analysis.columns).filter((info) => info.missing > 0)
                .length}
            </div>
            <div className="text-sm text-gray-700 mt-2">
              Columns with Missing Values
            </div>
          </div>
          <div className="bg-purple-50 p-6 rounded-xl border-2 border-purple-200">
            <div className="text-4xl font-bold text-purple-600">
              {Object.keys(duplicateStats).length}
            </div>
            <div className="text-sm text-gray-700 mt-2">
              Columns with Duplicate Values
            </div>
          </div>
          <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200">
            <div className="text-4xl font-bold text-green-600">
              {(
                (1 -
                  Object.values(analysis.columns).reduce(
                    (sum, info) => sum + info.missing,
                    0
                  ) /
                    (analysis.rowCount * analysis.columnCount)) *
                100
              ).toFixed(1)}
              %
            </div>
            <div className="text-sm text-gray-700 mt-2">Data Completeness</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataQualityTab;

