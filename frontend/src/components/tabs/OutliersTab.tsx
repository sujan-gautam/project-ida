import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Analysis } from '../../types';

interface OutliersTabProps {
  analysis: Analysis;
  data: any[];
}

const OutliersTab: React.FC<OutliersTabProps> = ({ analysis, data }) => {
  const renderBoxPlot = (col: string) => {
    const values = data
      .map((row) => parseFloat(row[col]))
      .filter((v) => !isNaN(v) && isFinite(v))
      .sort((a, b) => a - b);

    const stats = analysis.columns[col].stats;
    if (!stats) return null;

    const q1 = parseFloat(stats.q1);
    const median = parseFloat(stats.median);
    const q3 = parseFloat(stats.q3);
    const min = parseFloat(stats.min);
    const max = parseFloat(stats.max);
    const iqr = parseFloat(stats.iqr);

    const lowerWhisker = Math.max(min, q1 - 1.5 * iqr);
    const upperWhisker = Math.min(max, q3 + 1.5 * iqr);

    return (
      <div className="relative h-64 flex items-center justify-center">
        <svg width="300" height="200" className="mx-auto">
          <line
            x1="150"
            y1="20"
            x2="150"
            y2="40"
            stroke="#6366f1"
            strokeWidth="2"
          />
          <line
            x1="150"
            y1="160"
            x2="150"
            y2="180"
            stroke="#6366f1"
            strokeWidth="2"
          />
          <rect
            x="100"
            y="60"
            width="100"
            height="80"
            fill="#e0e7ff"
            stroke="#6366f1"
            strokeWidth="2"
          />
          <line
            x1="100"
            y1="100"
            x2="200"
            y2="100"
            stroke="#6366f1"
            strokeWidth="3"
          />
          <line
            x1="100"
            y1="40"
            x2="200"
            y2="40"
            stroke="#6366f1"
            strokeWidth="2"
          />
          <line
            x1="100"
            y1="180"
            x2="200"
            y2="180"
            stroke="#6366f1"
            strokeWidth="2"
          />
          <text x="210" y="44" fontSize="12" fill="#4b5563">
            Max: {max}
          </text>
          <text x="210" y="64" fontSize="12" fill="#4b5563">
            Q3: {q3}
          </text>
          <text x="210" y="104" fontSize="12" fill="#4b5563">
            Median: {median}
          </text>
          <text x="210" y="144" fontSize="12" fill="#4b5563">
            Q1: {q1}
          </text>
          <text x="210" y="184" fontSize="12" fill="#4b5563">
            Min: {min}
          </text>
        </svg>
        <div className="absolute bottom-0 text-center w-full text-sm text-gray-600">
          {stats.outliers} outliers detected
        </div>
      </div>
    );
  };

  const columnsWithOutliers = analysis.numericColumns.filter(
    (col) => analysis.columns[col].stats && analysis.columns[col].stats!.outliers > 0
  );

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white mb-6">Outlier Detection</h2>

      {columnsWithOutliers.length > 0 ? (
        <>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800 font-medium">
                Outliers detected in {columnsWithOutliers.length} columns using
                IQR method
              </p>
            </div>
          </div>

          {analysis.numericColumns.slice(0, 6).map((col) => {
            const stats = analysis.columns[col].stats;
            if (!stats || stats.outliers === 0) return null;

            return (
              <div
                key={col}
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Box Plot: {col}
                  <span className="ml-3 text-sm font-normal text-red-600">
                    ({stats.outliers} outliers)
                  </span>
                </h3>
                {renderBoxPlot(col)}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-gray-600 text-xs">Min</div>
                    <div className="font-bold text-blue-600">{stats.min}</div>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg text-center">
                    <div className="text-gray-600 text-xs">Q1</div>
                    <div className="font-bold text-indigo-600">{stats.q1}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <div className="text-gray-600 text-xs">Median</div>
                    <div className="font-bold text-purple-600">
                      {stats.median}
                    </div>
                  </div>
                  <div className="bg-pink-50 p-3 rounded-lg text-center">
                    <div className="text-gray-600 text-xs">Q3</div>
                    <div className="font-bold text-pink-600">{stats.q3}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <div className="text-gray-600 text-xs">Max</div>
                    <div className="font-bold text-red-600">{stats.max}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No outliers detected in the dataset</p>
        </div>
      )}
    </div>
  );
};

export default OutliersTab;

