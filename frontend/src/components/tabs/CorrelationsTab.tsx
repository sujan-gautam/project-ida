import React, { useState } from 'react';
import { AlertCircle, Maximize2 } from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Analysis } from '../../types';
import FullscreenChartModal from '../FullscreenChartModal';

interface CorrelationsTabProps {
  analysis: Analysis;
  data: any[];
}

const CorrelationsTab: React.FC<CorrelationsTabProps> = ({
  analysis,
  data,
}) => {
  const getCorrelationColor = (corr: string) => {
    const value = parseFloat(corr);
    if (value > 0) {
      const intensity = Math.floor(value * 255);
      return `rgb(${intensity}, 0, 0)`;
    } else {
      const intensity = Math.floor(Math.abs(value) * 255);
      return `rgb(0, 0, ${intensity})`;
    }
  };

  const getCorrelationBadgeColor = (corr: string) => {
    const value = Math.abs(parseFloat(corr));
    if (value > 0.7) return 'bg-red-100 text-red-800 border-red-200';
    if (value > 0.4) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const renderCorrelationHeatmap = () => {
    if (!analysis || analysis.numericColumns.length < 2) return null;

    const cols = analysis.numericColumns.slice(0, 8);
    const matrix: number[][] = [];

    for (let i = 0; i < cols.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const corr = analysis.correlations.find(
            (c) =>
              (c.col1 === cols[i] && c.col2 === cols[j]) ||
              (c.col1 === cols[j] && c.col2 === cols[i])
          );
          row.push(corr ? parseFloat(corr.correlation) : 0);
        }
      }
      matrix.push(row);
    }

    return (
      <div className="overflow-x-auto scrollbar-hide">
        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="w-32"></div>
            {cols.map((col, i) => (
              <div
                key={i}
                className="w-24 text-center text-xs font-medium text-gray-700 p-2"
              >
                {col.substring(0, 10)}
              </div>
            ))}
          </div>
          {matrix.map((row, i) => (
            <div key={i} className="flex">
              <div className="w-32 text-right pr-4 py-2 text-xs font-medium text-gray-700">
                {cols[i].substring(0, 15)}
              </div>
              {row.map((val, j) => (
                <div
                  key={j}
                  className="w-24 h-16 border border-gray-200 flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: getCorrelationColor(val.toString()) }}
                  title={`${cols[i]} × ${cols[j]}: ${val.toFixed(3)}`}
                >
                  <span className="text-white">{val.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderScatterPlot = (col1: string, col2: string) => {
    const scatterData = data
      .map((row) => ({
        x: parseFloat(row[col1]),
        y: parseFloat(row[col2]),
      }))
      .filter(
        (point) =>
          !isNaN(point.x) &&
          !isNaN(point.y) &&
          isFinite(point.x) &&
          isFinite(point.y)
      )
      .slice(0, 500);

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={col1} />
          <YAxis type="number" dataKey="y" name={col2} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Data Points" data={scatterData} fill="#8b5cf6" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  const [heatmapFullscreen, setHeatmapFullscreen] = useState(false);
  const [scatterFullscreen, setScatterFullscreen] = useState(false);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white mb-6">
        Correlation Analysis
      </h2>

      {analysis.correlations.length > 0 ? (
        <>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200 relative group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
              Correlation Heatmap
            </h3>
              <button
                onClick={() => setHeatmapFullscreen(true)}
                className="p-2 rounded-lg bg-slate-200/50 hover:bg-slate-300/50 border border-slate-300/50 hover:border-emerald-500/50 transition-all opacity-0 group-hover:opacity-100"
                title="View in fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            {renderCorrelationHeatmap()}
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 bg-red-600"></div>
                <span>Positive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 bg-blue-600"></div>
                <span>Negative</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Top Correlations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis.correlations.slice(0, 12).map((corr, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border-2 ${getCorrelationBadgeColor(
                    corr.correlation
                  )}`}
                >
                  <div className="font-semibold text-sm mb-1">
                    {corr.col1} × {corr.col2}
                  </div>
                  <div className="text-3xl font-bold">{corr.correlation}</div>
                  <div className="text-xs mt-1 opacity-75">
                    {Math.abs(parseFloat(corr.correlation)) > 0.7
                      ? 'Strong'
                      : Math.abs(parseFloat(corr.correlation)) > 0.4
                      ? 'Moderate'
                      : 'Weak'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <FullscreenChartModal
            isOpen={heatmapFullscreen}
            onClose={() => setHeatmapFullscreen(false)}
            title="Correlation Heatmap"
          >
            <div className="h-full w-full bg-white rounded-lg p-6 overflow-auto">
              {renderCorrelationHeatmap()}
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-4 bg-red-600"></div>
                  <span>Positive</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-4 bg-blue-600"></div>
                  <span>Negative</span>
                </div>
              </div>
            </div>
          </FullscreenChartModal>

          {analysis.numericColumns.length >= 2 && (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200 relative group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                Scatter Plot Analysis
              </h3>
                <button
                  onClick={() => setScatterFullscreen(true)}
                  className="p-2 rounded-lg bg-slate-200/50 hover:bg-slate-300/50 border border-slate-300/50 hover:border-emerald-500/50 transition-all opacity-0 group-hover:opacity-100"
                  title="View in fullscreen"
                >
                  <Maximize2 className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              {renderScatterPlot(
                analysis.numericColumns[0],
                analysis.numericColumns[1]
              )}
              <p className="text-center text-sm text-gray-600 mt-2">
                {analysis.numericColumns[0]} vs {analysis.numericColumns[1]}{' '}
                (first 500 points)
              </p>
            </div>
          )}
          <FullscreenChartModal
            isOpen={scatterFullscreen}
            onClose={() => setScatterFullscreen(false)}
            title={`Scatter Plot: ${analysis.numericColumns[0]} vs ${analysis.numericColumns[1]}`}
          >
            <div className="h-full w-full bg-white rounded-lg p-6">
              {renderScatterPlot(
                analysis.numericColumns[0],
                analysis.numericColumns[1]
              )}
              <p className="text-center text-sm text-gray-600 mt-4">
                {analysis.numericColumns[0]} vs {analysis.numericColumns[1]}{' '}
                (first 500 points)
              </p>
            </div>
          </FullscreenChartModal>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">
            Not enough numeric columns for correlation analysis
          </p>
        </div>
      )}
    </div>
  );
};

export default CorrelationsTab;

