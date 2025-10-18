import React, { useState, useEffect } from 'react';
import { Upload, Download, BarChart3, Activity, AlertCircle, TrendingUp, Filter, Eye, Zap, Code, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, LineChart, Line, Cell, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import _ from 'lodash';

const App = () => {
  const [data, setData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasInfiniteValues, setHasInfiniteValues] = useState(false);
  const [infiniteValueStats, setInfiniteValueStats] = useState({});
  const [encodingMethod, setEncodingMethod] = useState('none');
  const [missingValueMethod, setMissingValueMethod] = useState('none');
  const [normalizationMethod, setNormalizationMethod] = useState('none');
  const [preprocessingSteps, setPreprocessingSteps] = useState([]);
  const [hasAppliedInfinite, setHasAppliedInfinite] = useState(false);
  const [hasAppliedMissing, setHasAppliedMissing] = useState(false);
  const [hasAppliedEncoding, setHasAppliedEncoding] = useState(false);
  const [hasAppliedNormalization, setHasAppliedNormalization] = useState(false);
  const [duplicateStats, setDuplicateStats] = useState({});

  const detectColumnType = (values) => {
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonNull.length === 0) return 'empty';
    
    const numericValues = nonNull.filter(v => !isNaN(v) && v !== '' && isFinite(v));
    if (numericValues.length / nonNull.length > 0.8) return 'numeric';
    
    const datePattern = /^\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/;
    const dateValues = nonNull.filter(v => datePattern.test(String(v)));
    if (dateValues.length / nonNull.length > 0.7) return 'datetime';
    
    const uniqueRatio = new Set(nonNull).size / nonNull.length;
    if (uniqueRatio < 0.5) return 'categorical';
    
    return 'text';
  };

  const detectInfiniteValues = (parsedData) => {
    const columns = Object.keys(parsedData[0]);
    const infStats = {};
    let hasInf = false;

    columns.forEach(col => {
      const values = parsedData.map(row => row[col]);
      const infCount = values.filter(v => typeof v === 'number' && !isFinite(v)).length;
      if (infCount > 0) {
        hasInf = true;
        infStats[col] = {
          count: infCount,
          percentage: ((infCount / values.length) * 100).toFixed(1)
        };
      }
    });

    setInfiniteValueStats(infStats);
    return hasInf;
  };

  const detectDuplicates = (parsedData) => {
    const columns = Object.keys(parsedData[0]);
    const dupStats = {};

    columns.forEach(col => {
      const values = parsedData.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
      const uniqueValues = new Set(values);
      const duplicateCount = values.length - uniqueValues.size;
      const duplicatePercentage = values.length > 0 ? ((duplicateCount / values.length) * 100).toFixed(1) : 0;

      if (duplicateCount > 0) {
        // Find most frequent duplicate values
        const valueCounts = {};
        values.forEach(val => {
          valueCounts[val] = (valueCounts[val] || 0) + 1;
        });
        
        const topDuplicates = Object.entries(valueCounts)
          .filter(([_, count]) => count > 1)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([value, count]) => ({ value: String(value).substring(0, 30), count }));

        dupStats[col] = {
          duplicateCount,
          duplicatePercentage,
          totalValues: values.length,
          uniqueValues: uniqueValues.size,
          topDuplicates
        };
      }
    });

    setDuplicateStats(dupStats);
  };

  const replaceInfiniteWithNaN = () => {
    const cleanedData = data.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        const val = row[key];
        newRow[key] = (typeof val === 'number' && !isFinite(val)) ? null : val;
      });
      return newRow;
    });
    
    setData(cleanedData);
    const analysisResults = analyzeData(cleanedData);
    setAnalysis(analysisResults);
    setHasInfiniteValues(false);
    setInfiniteValueStats({});
    setHasAppliedInfinite(true);
    detectDuplicates(cleanedData);
    addPreprocessingStep('Replaced infinite values with NaN');
  };

  const calculateStats = (values) => {
    const numeric = values.filter(v => !isNaN(v) && v !== null && v !== '' && isFinite(v)).map(Number);
    if (numeric.length === 0) return null;

    const sorted = numeric.sort((a, b) => a - b);
    const sum = numeric.reduce((a, b) => a + b, 0);
    const mean = sum / numeric.length;
    const variance = numeric.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numeric.length;
    const std = Math.sqrt(variance);
    
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    const outliers = numeric.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
    
    const skewness = numeric.reduce((acc, val) => acc + Math.pow((val - mean) / std, 3), 0) / numeric.length;
    
    return {
      count: numeric.length,
      mean: mean.toFixed(2),
      median: sorted[Math.floor(sorted.length / 2)].toFixed(2),
      min: sorted[0].toFixed(2),
      max: sorted[sorted.length - 1].toFixed(2),
      std: std.toFixed(2),
      q1: q1.toFixed(2),
      q3: q3.toFixed(2),
      iqr: iqr.toFixed(2),
      outliers: outliers.length,
      skewness: skewness.toFixed(2)
    };
  };

  const analyzeData = (parsedData) => {
    const columns = Object.keys(parsedData[0]);
    const columnAnalysis = {};

    columns.forEach(col => {
      const values = parsedData.map(row => row[col]);
      const type = detectColumnType(values);
      const missing = values.filter(v => v === null || v === undefined || v === '').length;
      
      columnAnalysis[col] = {
        type,
        missing,
        missingPercent: ((missing / values.length) * 100).toFixed(1),
        stats: type === 'numeric' ? calculateStats(values) : null,
        unique: new Set(values.filter(v => v !== null && v !== '')).size
      };

      if (type === 'categorical' && columnAnalysis[col].unique < 50) {
        const counts = _.countBy(values.filter(v => v !== null && v !== ''));
        columnAnalysis[col].valueCounts = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15);
      }
    });

    const numericColumns = columns.filter(col => columnAnalysis[col].type === 'numeric');
    const correlations = calculateCorrelations(parsedData, numericColumns);

    return {
      rowCount: parsedData.length,
      columnCount: columns.length,
      columns: columnAnalysis,
      correlations,
      numericColumns,
      categoricalColumns: columns.filter(col => columnAnalysis[col].type === 'categorical'),
      dateColumns: columns.filter(col => columnAnalysis[col].type === 'datetime')
    };
  };

  const calculateCorrelations = (data, numericCols) => {
    if (numericCols.length < 2) return [];
    
    const correlations = [];
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const col1 = numericCols[i];
        const col2 = numericCols[j];
        
        const pairs = data
          .map(row => [parseFloat(row[col1]), parseFloat(row[col2])])
          .filter(([a, b]) => !isNaN(a) && !isNaN(b) && isFinite(a) && isFinite(b));
        
        if (pairs.length > 0) {
          const corr = calculatePearsonCorrelation(pairs);
          correlations.push({ col1, col2, correlation: corr.toFixed(3) });
        }
      }
    }
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  };

  const calculatePearsonCorrelation = (pairs) => {
    const n = pairs.length;
    const sum1 = pairs.reduce((s, [x]) => s + x, 0);
    const sum2 = pairs.reduce((s, [, y]) => s + y, 0);
    const sum1Sq = pairs.reduce((s, [x]) => s + x * x, 0);
    const sum2Sq = pairs.reduce((s, [, y]) => s + y * y, 0);
    const pSum = pairs.reduce((s, [x, y]) => s + x * y, 0);
    
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
    
    return den === 0 ? 0 : num / den;
  };

  const addPreprocessingStep = (step) => {
    setPreprocessingSteps(prev => [...prev, step]);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setPreprocessingSteps([]);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          setOriginalData(jsonData);
          setData(jsonData);
          const analysisResults = analyzeData(jsonData);
          setAnalysis(analysisResults);
          
          const hasInf = detectInfiniteValues(jsonData);
          setHasInfiniteValues(hasInf);
          detectDuplicates(jsonData);
          
          setLoading(false);
        } catch (error) {
          alert('Error parsing Excel file: ' + error.message);
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          setOriginalData(results.data);
          setData(results.data);
          const analysisResults = analyzeData(results.data);
          setAnalysis(analysisResults);
          
          const hasInf = detectInfiniteValues(results.data);
          setHasInfiniteValues(hasInf);
          detectDuplicates(results.data);
          
          setLoading(false);
        },
        error: (error) => {
          alert('Error parsing CSV file: ' + error.message);
          setLoading(false);
        }
      });
    }
  };

  const handleMissingValues = () => {
    if (!data || missingValueMethod === 'none') return;
    
    let cleanedData = [...data];
    const method = missingValueMethod;
    
    if (method === 'dropRows') {
      cleanedData = cleanedData.filter(row => {
        return Object.values(row).every(val => val !== null && val !== undefined && val !== '');
      });
      addPreprocessingStep('Dropped rows with missing values');
    } else if (method === 'dropColumns') {
      const columns = Object.keys(data[0]);
      const columnsToKeep = columns.filter(col => {
        const values = data.map(row => row[col]);
        return values.every(val => val !== null && val !== undefined && val !== '');
      });
      
      cleanedData = cleanedData.map(row => {
        const newRow = {};
        columnsToKeep.forEach(col => {
          newRow[col] = row[col];
        });
        return newRow;
      });
      addPreprocessingStep('Dropped columns with missing values');
    } else if (method === 'fillMean') {
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        const values = data.map(row => row[col]).filter(v => !isNaN(v) && v !== null && v !== '' && isFinite(v));
        if (values.length > 0) {
          const mean = values.reduce((a, b) => Number(a) + Number(b), 0) / values.length;
          cleanedData = cleanedData.map(row => ({
            ...row,
            [col]: (row[col] === null || row[col] === undefined || row[col] === '') ? mean : row[col]
          }));
        }
      });
      addPreprocessingStep('Filled missing values with mean');
    } else if (method === 'fillMedian') {
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        const values = data.map(row => row[col]).filter(v => !isNaN(v) && v !== null && v !== '' && isFinite(v)).sort((a, b) => a - b);
        if (values.length > 0) {
          const median = values[Math.floor(values.length / 2)];
          cleanedData = cleanedData.map(row => ({
            ...row,
            [col]: (row[col] === null || row[col] === undefined || row[col] === '') ? median : row[col]
          }));
        }
      });
      addPreprocessingStep('Filled missing values with median');
    } else if (method === 'fillMode') {
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
        if (values.length > 0) {
          const counts = _.countBy(values);
          const mode = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
          cleanedData = cleanedData.map(row => ({
            ...row,
            [col]: (row[col] === null || row[col] === undefined || row[col] === '') ? mode : row[col]
          }));
        }
      });
      addPreprocessingStep('Filled missing values with mode');
    } else if (method === 'fillZero') {
      cleanedData = cleanedData.map(row => {
        const newRow = {};
        Object.keys(row).forEach(key => {
          newRow[key] = (row[key] === null || row[key] === undefined || row[key] === '') ? 0 : row[key];
        });
        return newRow;
      });
      addPreprocessingStep('Filled missing values with zero');
    }
    
    setData(cleanedData);
    const analysisResults = analyzeData(cleanedData);
    setAnalysis(analysisResults);
    setHasAppliedMissing(true);
    detectDuplicates(cleanedData);
  };

  const applyCategoricalEncoding = () => {
    if (!data || encodingMethod === 'none') return;
    
    let encodedData = [...data];
    const categoricalCols = analysis.categoricalColumns;
    
    if (encodingMethod === 'label') {
      categoricalCols.forEach(col => {
        const uniqueValues = [...new Set(data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== ''))];
        const labelMap = {};
        uniqueValues.forEach((val, idx) => {
          labelMap[val] = idx;
        });
        
        encodedData = encodedData.map(row => ({
          ...row,
          [col]: row[col] !== null && row[col] !== undefined && row[col] !== '' ? labelMap[row[col]] : null
        }));
      });
      addPreprocessingStep(`Applied Label Encoding to ${categoricalCols.length} categorical columns`);
    } else if (encodingMethod === 'onehot') {
      categoricalCols.forEach(col => {
        const uniqueValues = [...new Set(data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== ''))];
        
        encodedData = encodedData.map(row => {
          const newRow = { ...row };
          delete newRow[col];
          
          uniqueValues.forEach(val => {
            newRow[`${col}_${val}`] = (row[col] === val) ? 1 : 0;
          });
          
          return newRow;
        });
      });
      addPreprocessingStep(`Applied One-Hot Encoding to ${categoricalCols.length} categorical columns`);
    }
    
    setData(encodedData);
    const analysisResults = analyzeData(encodedData);
    setAnalysis(analysisResults);
    setHasAppliedEncoding(true);
    detectDuplicates(encodedData);
  };

  const applyNormalization = () => {
    if (!data || normalizationMethod === 'none') return;
    
    let normalizedData = [...data];
    const numericCols = analysis.numericColumns;
    
    if (normalizationMethod === 'minmax') {
      // Min-Max Scaling: scales to [0, 1]
      numericCols.forEach(col => {
        const values = data.map(row => row[col]).filter(v => !isNaN(v) && v !== null && v !== '' && isFinite(v)).map(Number);
        if (values.length > 0) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min;
          
          if (range > 0) {
            normalizedData = normalizedData.map(row => ({
              ...row,
              [col]: (!isNaN(row[col]) && row[col] !== null && row[col] !== '' && isFinite(row[col])) 
                ? ((Number(row[col]) - min) / range) 
                : row[col]
            }));
          }
        }
      });
      addPreprocessingStep(`Normalized ${numericCols.length} numeric columns using Min-Max Scaling (0-1 range)`);
    } else if (normalizationMethod === 'standard') {
      // Standard Scaling: scales to mean=0, std=1
      numericCols.forEach(col => {
        const values = data.map(row => row[col]).filter(v => !isNaN(v) && v !== null && v !== '' && isFinite(v)).map(Number);
        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
          const std = Math.sqrt(variance);
          
          if (std > 0) {
            normalizedData = normalizedData.map(row => ({
              ...row,
              [col]: (!isNaN(row[col]) && row[col] !== null && row[col] !== '' && isFinite(row[col])) 
                ? ((Number(row[col]) - mean) / std) 
                : row[col]
            }));
          }
        }
      });
      addPreprocessingStep(`Normalized ${numericCols.length} numeric columns using Standard Scaling (mean=0, std=1)`);
    }
    
    setData(normalizedData);
    const analysisResults = analyzeData(normalizedData);
    setAnalysis(analysisResults);
    setHasAppliedNormalization(true);
    detectDuplicates(normalizedData);
  };

  const resetData = () => {
    if (originalData) {
      setData(originalData);
      const analysisResults = analyzeData(originalData);
      setAnalysis(analysisResults);
      setPreprocessingSteps([]);
      setEncodingMethod('none');
      setMissingValueMethod('none');
      setNormalizationMethod('none');
      setHasAppliedInfinite(false);
      setHasAppliedMissing(false);
      setHasAppliedEncoding(false);
      setHasAppliedNormalization(false);
      
      const hasInf = detectInfiniteValues(originalData);
      setHasInfiniteValues(hasInf);
      detectDuplicates(originalData);
    }
  };

  const downloadRefinedData = () => {
    if (!data) return;
    
    try {
      // Create CSV from current refined data
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = 'refined_' + fileName.replace(/\.[^/.]+$/, "") + '.csv';
      link.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      
      // Show success message and reset to homepage after longer delay
      setTimeout(() => {
        alert('✓ Dataset downloaded successfully! Redirecting to upload new dataset...');
        
        // Reset everything to initial state
        setData(null);
        setOriginalData(null);
        setAnalysis(null);
        setFileName('');
        setPreprocessingSteps([]);
        setEncodingMethod('none');
        setMissingValueMethod('none');
        setNormalizationMethod('none');
        setHasAppliedInfinite(false);
        setHasAppliedMissing(false);
        setHasAppliedEncoding(false);
        setHasAppliedNormalization(false);
        setHasInfiniteValues(false);
        setInfiniteValueStats({});
        setDuplicateStats({});
        setActiveTab('overview');
      }, 1500);
      
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const getCorrelationColor = (corr) => {
    const value = parseFloat(corr);
    if (value > 0) {
      const intensity = Math.floor(value * 255);
      return `rgb(${intensity}, 0, 0)`;
    } else {
      const intensity = Math.floor(Math.abs(value) * 255);
      return `rgb(0, 0, ${intensity})`;
    }
  };

  const getCorrelationBadgeColor = (corr) => {
    const value = Math.abs(parseFloat(corr));
    if (value > 0.7) return 'bg-red-100 text-red-800 border-red-200';
    if (value > 0.4) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const renderCorrelationHeatmap = () => {
    if (!analysis || analysis.numericColumns.length < 2) return null;

    const cols = analysis.numericColumns.slice(0, 8);
    const matrix = [];

    for (let i = 0; i < cols.length; i++) {
      const row = [];
      for (let j = 0; j < cols.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const corr = analysis.correlations.find(
            c => (c.col1 === cols[i] && c.col2 === cols[j]) || 
                 (c.col1 === cols[j] && c.col2 === cols[i])
          );
          row.push(corr ? parseFloat(corr.correlation) : 0);
        }
      }
      matrix.push(row);
    }

    return (
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="w-32"></div>
            {cols.map((col, i) => (
              <div key={i} className="w-24 text-center text-xs font-medium text-gray-700 p-2">
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
                  style={{ backgroundColor: getCorrelationColor(val) }}
                  title={`${cols[i]} × ${cols[j]}: ${val.toFixed(3)}`}
                >
                  <span className="text-white">
                    {val.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderScatterPlot = (col1, col2) => {
    const scatterData = data
      .map(row => ({
        x: parseFloat(row[col1]),
        y: parseFloat(row[col2])
      }))
      .filter(point => !isNaN(point.x) && !isNaN(point.y) && isFinite(point.x) && isFinite(point.y))
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

  const renderBoxPlot = (col) => {
    const values = data
      .map(row => parseFloat(row[col]))
      .filter(v => !isNaN(v) && isFinite(v))
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

    const outliers = values.filter(v => v < lowerWhisker || v > upperWhisker);

    return (
      <div className="relative h-64 flex items-center justify-center">
        <svg width="300" height="200" className="mx-auto">
          <line x1="150" y1="20" x2="150" y2="40" stroke="#6366f1" strokeWidth="2" />
          <line x1="150" y1="160" x2="150" y2="180" stroke="#6366f1" strokeWidth="2" />
          
          <rect x="100" y="60" width="100" height="80" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2" />
          
          <line x1="100" y1="100" x2="200" y2="100" stroke="#6366f1" strokeWidth="3" />
          
          <line x1="100" y1="40" x2="200" y2="40" stroke="#6366f1" strokeWidth="2" />
          <line x1="100" y1="180" x2="200" y2="180" stroke="#6366f1" strokeWidth="2" />
          
          <text x="210" y="44" fontSize="12" fill="#4b5563">Max: {max}</text>
          <text x="210" y="64" fontSize="12" fill="#4b5563">Q3: {q3}</text>
          <text x="210" y="104" fontSize="12" fill="#4b5563">Median: {median}</text>
          <text x="210" y="144" fontSize="12" fill="#4b5563">Q1: {q1}</text>
          <text x="210" y="184" fontSize="12" fill="#4b5563">Min: {min}</text>
          
          {outliers.slice(0, 10).map((outlier, idx) => (
            <circle key={idx} cx={150 + (idx - 5) * 8} cy="10" r="3" fill="#ef4444" />
          ))}
        </svg>
        <div className="absolute bottom-0 text-center w-full text-sm text-gray-600">
          {stats.outliers} outliers detected
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
            <Activity className="w-10 h-10 text-indigo-600" />
            Advanced Data Analyzer Pro
          </h1>
          <p className="text-gray-600 text-lg">Upload CSV or Excel files for comprehensive automated analysis</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 border border-indigo-100">
          <label className="flex flex-col items-center justify-center border-3 border-dashed border-indigo-300 rounded-xl p-12 cursor-pointer hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 transition-all duration-300">
            <Upload className="w-16 h-16 text-indigo-500 mb-4 animate-bounce" />
            <span className="text-lg font-semibold text-gray-700 mb-2">
              {fileName || 'Drop your data file here or click to browse'}
            </span>
            <span className="text-sm text-gray-500">Supports CSV and Excel (.xlsx, .xls)</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
            <p className="mt-6 text-xl text-gray-600 font-medium">Analyzing your data...</p>
          </div>
        )}

        {analysis && !loading && (
          <>
            {preprocessingSteps.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-green-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  Preprocessing Steps Applied
                </h3>
                <div className="space-y-2">
                  {preprocessingSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-gray-700 bg-green-50 p-3 rounded-lg">
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-xl mb-8 border border-indigo-100 overflow-hidden">
              <div className="flex overflow-x-auto bg-gradient-to-r from-indigo-600 to-purple-600 p-1">
                {['overview', 'distributions', 'correlations', 'outliers', 'data-quality', 'preprocessing', 'preview'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-white text-indigo-600 rounded-lg shadow-lg'
                        : 'text-white hover:bg-white/20 rounded-lg'
                    }`}
                  >
                    {tab === 'data-quality' ? 'Data Quality' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-6 md:p-8">
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center">
                      <h2 className="text-3xl font-bold text-gray-800">Dataset Overview</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
                        <div className="text-4xl font-bold">{analysis.rowCount.toLocaleString()}</div>
                        <div className="text-sm opacity-90 mt-1">Total Rows</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
                        <div className="text-4xl font-bold">{analysis.columnCount}</div>
                        <div className="text-sm opacity-90 mt-1">Columns</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
                        <div className="text-4xl font-bold">{analysis.numericColumns.length}</div>
                        <div className="text-sm opacity-90 mt-1">Numeric</div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl text-white shadow-lg">
                        <div className="text-4xl font-bold">{analysis.categoricalColumns.length}</div>
                        <div className="text-sm opacity-90 mt-1">Categorical</div>
                      </div>
                      <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-xl text-white shadow-lg">
                        <div className="text-4xl font-bold">{analysis.dateColumns.length}</div>
                        <div className="text-sm opacity-90 mt-1">DateTime</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">Column Analysis</h3>
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                              <th className="px-6 py-4 text-left font-bold text-gray-700">Column Name</th>
                              <th className="px-6 py-4 text-left font-bold text-gray-700">Data Type</th>
                              <th className="px-6 py-4 text-left font-bold text-gray-700">Unique Values</th>
                              <th className="px-6 py-4 text-left font-bold text-gray-700">Missing</th>
                              <th className="px-6 py-4 text-left font-bold text-gray-700">Statistics</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {Object.entries(analysis.columns).map(([col, info]) => (
                              <tr key={col} className="hover:bg-blue-50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-gray-800">{col}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    info.type === 'numeric' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                    info.type === 'categorical' ? 'bg-green-100 text-green-700 border border-green-200' :
                                    info.type === 'datetime' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                    'bg-gray-100 text-gray-700 border border-gray-200'
                                  }`}>
                                    {info.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600 font-medium">{info.unique.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                  <span className={`font-medium ${info.missing > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {info.missing} ({info.missingPercent}%)
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600 text-xs">
                                  {info.stats && (
                                    <div className="space-y-1">
                                      <div>μ: {info.stats.mean} | σ: {info.stats.std}</div>
                                      <div>Range: [{info.stats.min}, {info.stats.max}]</div>
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
                )}

                {activeTab === 'distributions' && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">Data Distributions</h2>
                    
                    {analysis.categoricalColumns.slice(0, 4).map(col => {
                      const colData = analysis.columns[col];
                      if (!colData.valueCounts) return null;
                      
                      const chartData = colData.valueCounts.map(([name, value]) => ({
                        name: String(name).substring(0, 25),
                        count: value
                      }));

                      const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

                      return (
                        <div key={col} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
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
                                tick={{fontSize: 12}}
                              />
                              <YAxis tick={{fontSize: 12}} />
                              <Tooltip 
                                contentStyle={{backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px'}}
                              />
                              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}

                    {analysis.numericColumns.slice(0, 4).map(col => {
                      const values = data
                        .map(row => parseFloat(row[col]))
                        .filter(v => !isNaN(v) && isFinite(v));
                      
                      if (values.length === 0) return null;
                      
                      const min = Math.min(...values);
                      const max = Math.max(...values);
                      const binCount = 25;
                      const binSize = (max - min) / binCount;
                      
                      const bins = Array(binCount).fill(0);
                      values.forEach(v => {
                        const binIndex = Math.min(Math.floor((v - min) / binSize), binCount - 1);
                        bins[binIndex]++;
                      });
                      
                      const histData = bins.map((count, i) => ({
                        range: `${(min + i * binSize).toFixed(1)}`,
                        count,
                        density: count / values.length
                      }));

                      return (
                        <div key={col} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
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
                                tick={{fontSize: 11}}
                              />
                              <YAxis tick={{fontSize: 12}} />
                              <Tooltip 
                                contentStyle={{backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px'}}
                              />
                              <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                          {analysis.columns[col].stats && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="text-gray-600">Skewness</div>
                                <div className="font-bold text-blue-600">{analysis.columns[col].stats.skewness}</div>
                              </div>
                              <div className="bg-purple-50 p-3 rounded-lg">
                                <div className="text-gray-600">IQR</div>
                                <div className="font-bold text-purple-600">{analysis.columns[col].stats.iqr}</div>
                              </div>
                              <div className="bg-green-50 p-3 rounded-lg">
                                <div className="text-gray-600">Median</div>
                                <div className="font-bold text-green-600">{analysis.columns[col].stats.median}</div>
                              </div>
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <div className="text-gray-600">Std Dev</div>
                                <div className="font-bold text-orange-600">{analysis.columns[col].stats.std}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'correlations' && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">Correlation Analysis</h2>
                    
                    {analysis.correlations.length > 0 ? (
                      <>
                        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
                          <h3 className="text-xl font-bold text-gray-800 mb-4">Correlation Heatmap</h3>
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
                          <h3 className="text-xl font-bold text-gray-800 mb-4">Top Correlations</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {analysis.correlations.slice(0, 12).map((corr, idx) => (
                              <div key={idx} className={`p-4 rounded-xl border-2 ${getCorrelationBadgeColor(corr.correlation)}`}>
                                <div className="font-semibold text-sm mb-1">{corr.col1} × {corr.col2}</div>
                                <div className="text-3xl font-bold">{corr.correlation}</div>
                                <div className="text-xs mt-1 opacity-75">
                                  {Math.abs(parseFloat(corr.correlation)) > 0.7 ? 'Strong' : 
                                   Math.abs(parseFloat(corr.correlation)) > 0.4 ? 'Moderate' : 'Weak'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {analysis.numericColumns.length >= 2 && (
                          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Scatter Plot Analysis</h3>
                            {renderScatterPlot(analysis.numericColumns[0], analysis.numericColumns[1])}
                            <p className="text-center text-sm text-gray-600 mt-2">
                              {analysis.numericColumns[0]} vs {analysis.numericColumns[1]} (first 500 points)
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Not enough numeric columns for correlation analysis</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'outliers' && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">Outlier Detection</h2>
                    
                    {analysis.numericColumns.filter(col => analysis.columns[col].stats && analysis.columns[col].stats.outliers > 0).length > 0 ? (
                      <>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                            <p className="text-yellow-800 font-medium">
                              Outliers detected in {analysis.numericColumns.filter(col => analysis.columns[col].stats && analysis.columns[col].stats.outliers > 0).length} columns using IQR method
                            </p>
                          </div>
                        </div>

                        {analysis.numericColumns.slice(0, 6).map(col => {
                          const stats = analysis.columns[col].stats;
                          if (!stats || stats.outliers === 0) return null;

                          return (
                            <div key={col} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
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
                                  <div className="font-bold text-purple-600">{stats.median}</div>
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
                )}

                {activeTab === 'data-quality' && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-orange-600" />
                      Data Quality Analysis
                    </h2>

                    {/* Infinite Values Section */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">Infinite Values Detection</h3>
                      
                      {hasInfiniteValues ? (
                        <>
                          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                              <p className="text-red-800 font-medium">
                                Found infinite values in {Object.keys(infiniteValueStats).length} column(s)
                              </p>
                            </div>
                          </div>

                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 mb-4">Infinite Values by Column</h4>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={Object.entries(infiniteValueStats).map(([col, stats]) => ({
                                name: col.substring(0, 20),
                                count: stats.count,
                                percentage: parseFloat(stats.percentage)
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
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

                    {/* Missing Values Section */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">Missing Values Analysis</h3>
                      
                      {Object.values(analysis.columns).some(info => info.missing > 0) ? (
                        <>
                          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg mb-6">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-orange-600" />
                              <p className="text-orange-800 font-medium">
                                Found missing values in {Object.values(analysis.columns).filter(info => info.missing > 0).length} column(s)
                              </p>
                            </div>
                          </div>

                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 mb-4">Missing Values by Column</h4>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={Object.entries(analysis.columns)
                                .filter(([_, info]) => info.missing > 0)
                                .map(([col, info]) => ({
                                  name: col.substring(0, 20),
                                  missing: info.missing,
                                  percentage: parseFloat(info.missingPercent)
                                }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
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

                          {/* Missing Data Pattern Heatmap */}
                          <div className="mt-8">
                            <h4 className="font-semibold text-gray-800 mb-4">Missing Data Pattern (First 50 rows)</h4>
                            <div className="overflow-x-auto bg-white p-4 rounded-lg border border-gray-200">
                              <div className="inline-block">
                                <div className="flex gap-1 mb-2">
                                  <div className="w-12"></div>
                                  {Object.keys(analysis.columns).filter(col => analysis.columns[col].missing > 0).slice(0, 10).map(col => (
                                    <div key={col} className="w-8 text-xs text-center transform -rotate-45 origin-left" style={{height: '60px'}}>
                                      {col.substring(0, 10)}
                                    </div>
                                  ))}
                                </div>
                                {data.slice(0, 50).map((row, idx) => (
                                  <div key={idx} className="flex gap-1 mb-1">
                                    <div className="w-12 text-xs text-gray-500 flex items-center">{idx + 1}</div>
                                    {Object.keys(analysis.columns).filter(col => analysis.columns[col].missing > 0).slice(0, 10).map(col => (
                                      <div 
                                        key={col}
                                        className="w-8 h-4 rounded"
                                        style={{
                                          backgroundColor: (row[col] === null || row[col] === undefined || row[col] === '') ? '#ef4444' : '#10b981'
                                        }}
                                        title={`Row ${idx + 1}, ${col}: ${row[col] === null || row[col] === undefined || row[col] === '' ? 'Missing' : 'Present'}`}
                                      ></div>
                                    ))}
                                  </div>
                                ))}
                                <div className="flex gap-4 mt-4 text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                    <span>Present</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                                    <span>Missing</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-green-600">
                          <div className="text-6xl mb-3">✓</div>
                          <p className="text-lg font-semibold">No missing values detected!</p>
                        </div>
                      )}
                    </div>

                    {/* Duplicate Values Section */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">Duplicate Values Analysis</h3>
                      
                      {Object.keys(duplicateStats).length > 0 ? (
                        <>
                          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-lg mb-6">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-purple-600" />
                              <p className="text-purple-800 font-medium">
                                Found duplicate values in {Object.keys(duplicateStats).length} column(s)
                              </p>
                            </div>
                          </div>

                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 mb-4">Duplicate Values by Column</h4>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={Object.entries(duplicateStats).map(([col, stats]) => ({
                                name: col.substring(0, 20),
                                duplicates: stats.duplicateCount,
                                percentage: parseFloat(stats.duplicatePercentage)
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="duplicates" fill="#a855f7" radius={[8, 8, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-800">Duplicate Details by Column</h4>
                            {Object.entries(duplicateStats).map(([col, stats]) => (
                              <div key={col} className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <div className="font-bold text-gray-800 text-lg">{col}</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      {stats.duplicateCount} duplicate values ({stats.duplicatePercentage}%) | 
                                      {stats.uniqueValues} unique out of {stats.totalValues} total values
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

                                {stats.topDuplicates.length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-sm font-semibold text-gray-700 mb-2">Top Duplicate Values:</div>
                                    <div className="grid grid-cols-1 gap-2">
                                      {stats.topDuplicates.map((dup, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-purple-200">
                                          <span className="text-sm text-gray-700 font-medium">"{dup.value}"</span>
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

                          <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                            <p className="text-blue-800 text-sm">
                              <strong>💡 Note:</strong> Duplicate values within columns are normal for categorical data but may indicate data quality issues 
                              in columns that should have unique values (like IDs). High duplication in numeric columns might suggest limited variability.
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-green-600">
                          <div className="text-6xl mb-3">✓</div>
                          <p className="text-lg font-semibold">No duplicate values detected!</p>
                          <p className="text-sm text-gray-600 mt-2">All values in each column are unique</p>
                        </div>
                      )}
                    </div>

                    {/* Summary Statistics */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">Data Quality Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-red-50 p-6 rounded-xl border-2 border-red-200">
                          <div className="text-4xl font-bold text-red-600">
                            {Object.keys(infiniteValueStats).length}
                          </div>
                          <div className="text-sm text-gray-700 mt-2">Columns with Infinite Values</div>
                        </div>
                        <div className="bg-orange-50 p-6 rounded-xl border-2 border-orange-200">
                          <div className="text-4xl font-bold text-orange-600">
                            {Object.values(analysis.columns).filter(info => info.missing > 0).length}
                          </div>
                          <div className="text-sm text-gray-700 mt-2">Columns with Missing Values</div>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-xl border-2 border-purple-200">
                          <div className="text-4xl font-bold text-purple-600">
                            {Object.keys(duplicateStats).length}
                          </div>
                          <div className="text-sm text-gray-700 mt-2">Columns with Duplicate Values</div>
                        </div>
                        <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200">
                          <div className="text-4xl font-bold text-green-600">
                            {((1 - (Object.values(analysis.columns).reduce((sum, info) => sum + info.missing, 0) / 
                              (analysis.rowCount * analysis.columnCount))) * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-700 mt-2">Data Completeness</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'preprocessing' && (
                  <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">Data Preprocessing</h2>
                    
                    {/* Step 1: Handle Infinite Values */}
                    {hasInfiniteValues && !hasAppliedInfinite && (
                      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-red-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          Step 1: Handle Infinite Values
                        </h3>
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-4">
                          <p className="text-red-800 font-medium mb-2">
                            ⚠️ Your dataset contains infinite values in {Object.keys(infiniteValueStats).length} column(s)
                          </p>
                          <p className="text-red-700 text-sm">
                            These should be replaced with NaN before further preprocessing
                          </p>
                        </div>
                        <button
                          onClick={replaceInfiniteWithNaN}
                          className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                        >
                          Replace Infinite Values with NaN
                        </button>
                      </div>
                    )}

                    {/* Step 2: Handle Missing Values */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-indigo-600" />
                        Step 2: Handle Missing Values
                      </h3>
                      
                      {hasAppliedMissing ? (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="text-2xl">✓</div>
                            <div>
                              <p className="text-green-800 font-medium">Missing values handled successfully!</p>
                              <p className="text-green-700 text-sm">Method applied: {missingValueMethod === 'dropRows' ? 'Drop Rows' : 
                                missingValueMethod === 'dropColumns' ? 'Drop Columns' :
                                missingValueMethod === 'fillMean' ? 'Fill with Mean' :
                                missingValueMethod === 'fillMedian' ? 'Fill with Median' :
                                missingValueMethod === 'fillMode' ? 'Fill with Mode' : 'Fill with Zero'}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-600 mb-6">Choose a method to handle missing values in your dataset</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            <div
                              onClick={() => setMissingValueMethod('dropRows')}
                              className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 text-left ${
                                missingValueMethod === 'dropRows'
                                  ? 'bg-red-50 border-red-500'
                                  : 'bg-gray-50 border-gray-200 hover:border-red-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="radio"
                                  checked={missingValueMethod === 'dropRows'}
                                  onChange={() => setMissingValueMethod('dropRows')}
                                  className="w-4 h-4"
                                />
                                <div className="font-bold text-red-700">Drop Rows</div>
                              </div>
                              <div className="text-sm text-gray-600">Remove all rows with any missing values</div>
                            </div>
                            
                            <div
                              onClick={() => setMissingValueMethod('dropColumns')}
                              className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 text-left ${
                                missingValueMethod === 'dropColumns'
                                  ? 'bg-red-50 border-red-500'
                                  : 'bg-gray-50 border-gray-200 hover:border-red-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="radio"
                                  checked={missingValueMethod === 'dropColumns'}
                                  onChange={() => setMissingValueMethod('dropColumns')}
                                  className="w-4 h-4"
                                />
                                <div className="font-bold text-red-700">Drop Columns</div>
                              </div>
                              <div className="text-sm text-gray-600">Remove columns with any missing values</div>
                            </div>
                            
                            <div
                              onClick={() => setMissingValueMethod('fillMean')}
                              className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 text-left ${
                                missingValueMethod === 'fillMean'
                                  ? 'bg-blue-50 border-blue-500'
                                  : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="radio"
                                  checked={missingValueMethod === 'fillMean'}
                                  onChange={() => setMissingValueMethod('fillMean')}
                                  className="w-4 h-4"
                                />
                                <div className="font-bold text-blue-700">Fill with Mean</div>
                              </div>
                              <div className="text-sm text-gray-600">Replace missing numeric values with column mean</div>
                            </div>

                            <div
                              onClick={() => setMissingValueMethod('fillMedian')}
                              className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 text-left ${
                                missingValueMethod === 'fillMedian'
                                  ? 'bg-indigo-50 border-indigo-500'
                                  : 'bg-gray-50 border-gray-200 hover:border-indigo-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="radio"
                                  checked={missingValueMethod === 'fillMedian'}
                                  onChange={() => setMissingValueMethod('fillMedian')}
                                  className="w-4 h-4"
                                />
                                <div className="font-bold text-indigo-700">Fill with Median</div>
                              </div>
                              <div className="text-sm text-gray-600">Replace missing values with column median</div>
                            </div>

                            <div
                              onClick={() => setMissingValueMethod('fillMode')}
                              className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 text-left ${
                                missingValueMethod === 'fillMode'
                                  ? 'bg-purple-50 border-purple-500'
                                  : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="radio"
                                  checked={missingValueMethod === 'fillMode'}
                                  onChange={() => setMissingValueMethod('fillMode')}
                                  className="w-4 h-4"
                                />
                                <div className="font-bold text-purple-700">Fill with Mode</div>
                              </div>
                              <div className="text-sm text-gray-600">Replace missing values with most frequent value</div>
                            </div>
                            
                            <div
                              onClick={() => setMissingValueMethod('fillZero')}
                              className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 text-left ${
                                missingValueMethod === 'fillZero'
                                  ? 'bg-green-50 border-green-500'
                                  : 'bg-gray-50 border-gray-200 hover:border-green-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="radio"
                                  checked={missingValueMethod === 'fillZero'}
                                  onChange={() => setMissingValueMethod('fillZero')}
                                  className="w-4 h-4"
                                />
                                <div className="font-bold text-green-700">Fill with Zero</div>
                              </div>
                              <div className="text-sm text-gray-600">Replace all missing values with 0</div>
                            </div>
                          </div>

                          <button
                            onClick={handleMissingValues}
                            disabled={missingValueMethod === 'none'}
                            className={`w-full py-3 rounded-lg font-medium transition-all ${
                              missingValueMethod === 'none'
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg'
                            }`}
                          >
                            Apply Missing Value Handling
                          </button>
                        </>
                      )}
                    </div>

                    {/* Step 3: Categorical Encoding */}
                    {analysis.categoricalColumns.length > 0 && (
                      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <Code className="w-5 h-5 text-purple-600" />
                          Step 3: Categorical Encoding
                        </h3>
                        
                        {hasAppliedEncoding ? (
                          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="text-2xl">✓</div>
                              <div>
                                <p className="text-green-800 font-medium">Categorical encoding applied successfully!</p>
                                <p className="text-green-700 text-sm">Method applied: {encodingMethod === 'label' ? 'Label Encoding' : 'One-Hot Encoding'}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-600 mb-6">
                              Encode categorical variables for machine learning ({analysis.categoricalColumns.length} categorical columns detected)
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div 
                                onClick={() => setEncodingMethod('label')}
                                className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 ${
                                  encodingMethod === 'label' 
                                    ? 'bg-purple-50 border-purple-500' 
                                    : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <input 
                                    type="radio" 
                                    checked={encodingMethod === 'label'} 
                                    onChange={() => setEncodingMethod('label')}
                                    className="w-4 h-4"
                                  />
                                  <div className="font-bold text-purple-700">Label Encoding</div>
                                </div>
                                <div className="text-sm text-gray-600">Convert categories to integers (0, 1, 2, ...)</div>
                                <div className="text-xs text-gray-500 mt-2">Best for ordinal data</div>
                              </div>

                              <div 
                                onClick={() => setEncodingMethod('onehot')}
                                className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 ${
                                  encodingMethod === 'onehot' 
                                    ? 'bg-blue-50 border-blue-500' 
                                    : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <input 
                                    type="radio" 
                                    checked={encodingMethod === 'onehot'} 
                                    onChange={() => setEncodingMethod('onehot')}
                                    className="w-4 h-4"
                                  />
                                  <div className="font-bold text-blue-700">One-Hot Encoding</div>
                                </div>
                                <div className="text-sm text-gray-600">Create binary columns for each category</div>
                                <div className="text-xs text-gray-500 mt-2">Best for nominal data</div>
                              </div>
                            </div>

                            <button
                              onClick={applyCategoricalEncoding}
                              disabled={encodingMethod === 'none'}
                              className={`w-full py-3 rounded-lg font-medium transition-all ${
                                encodingMethod === 'none'
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
                              }`}
                            >
                              Apply Encoding
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 4: Normalization */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-200">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        Step 4: Normalization
                      </h3>
                      
                      {hasAppliedNormalization ? (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="text-2xl">✓</div>
                            <div>
                              <p className="text-green-800 font-medium">Normalization applied successfully!</p>
                              <p className="text-green-700 text-sm">
                                Method applied: {normalizationMethod === 'minmax' ? 'Min-Max Scaling (0-1 range)' : 'Standard Scaling (mean=0, std=1)'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-600 mb-6">
                            Choose a scaling method to normalize numeric features
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div 
                              onClick={() => setNormalizationMethod('minmax')}
                              className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 ${
                                normalizationMethod === 'minmax' 
                                  ? 'bg-green-50 border-green-500' 
                                  : 'bg-gray-50 border-gray-200 hover:border-green-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <input 
                                  type="radio" 
                                  checked={normalizationMethod === 'minmax'} 
                                  onChange={() => setNormalizationMethod('minmax')}
                                  className="w-4 h-4"
                                />
                                <div className="font-bold text-green-700">Min-Max Scaler</div>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">Scales values to range [0, 1]</div>
                              <div className="text-xs text-gray-500 bg-white p-2 rounded border border-green-200 font-mono">
                                x_scaled = (x - min) / (max - min)
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                <strong>Best for:</strong> Decision trees, K-nearest neighbors, Support vector machines
                              </div>
                            </div>

                            <div 
                              onClick={() => setNormalizationMethod('standard')}
                              className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 ${
                                normalizationMethod === 'standard' 
                                  ? 'bg-teal-50 border-teal-500' 
                                  : 'bg-gray-50 border-gray-200 hover:border-teal-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <input 
                                  type="radio" 
                                  checked={normalizationMethod === 'standard'} 
                                  onChange={() => setNormalizationMethod('standard')}
                                  className="w-4 h-4"
                                />
                                <div className="font-bold text-teal-700">Standard Scaler</div>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">Standardizes to mean=0, std=1</div>
                              <div className="text-xs text-gray-500 bg-white p-2 rounded border border-teal-200 font-mono">
                                x_scaled = (x - mean) / std
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                <strong>Best for:</strong> SVM, Logistic regression, Neural networks
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={applyNormalization}
                            disabled={normalizationMethod === 'none'}
                            className={`w-full py-3 rounded-lg font-medium transition-all ${
                              normalizationMethod === 'none'
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:shadow-lg'
                            }`}
                          >
                            Apply Normalization
                          </button>
                        </>
                      )}
                    </div>

                    {/* Final Actions */}
                    <div className="flex gap-4">
                      <button
                        onClick={resetData}
                        className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-all"
                      >
                        Reset to Original Data
                      </button>
                      
                      <button
                        onClick={downloadRefinedData}
                        className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-xl text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Download Refined Dataset
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <Eye className="w-8 h-8 text-indigo-600" />
                        Data Preview
                      </h2>
                      <span className="text-sm text-gray-600">
                        Showing first 50 rows
                      </span>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                            <tr>
                              <th className="px-4 py-3 text-left font-bold">#</th>
                              {Object.keys(data[0]).map(col => (
                                <th key={col} className="px-4 py-3 text-left font-bold whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {data.slice(0, 50).map((row, idx) => (
                              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-500">{idx + 1}</td>
                                {Object.values(row).map((val, i) => (
                                  <td key={i} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                    {val !== null && val !== undefined && val !== '' ? String(val) : (
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
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
