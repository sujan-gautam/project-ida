import React, { useState } from 'react';
import {
  AlertTriangle,
  Filter,
  Code,
  TrendingUp,
  Download,
} from 'lucide-react';
import { Analysis } from '../../types';
import { datasetAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface PreprocessingTabProps {
  datasetId: string;
  analysis: Analysis;
  onPreprocess: (data: any, analysis: Analysis, steps: string[]) => void;
  onReset: () => void;
}

const PreprocessingTab: React.FC<PreprocessingTabProps> = ({
  datasetId,
  analysis,
  onPreprocess,
  onReset,
}) => {
  const [missingValueMethod, setMissingValueMethod] = useState('none');
  const [encodingMethod, setEncodingMethod] = useState('none');
  const [normalizationMethod, setNormalizationMethod] = useState('none');
  const [hasAppliedInfinite, setHasAppliedInfinite] = useState(false);
  const [hasAppliedMissing, setHasAppliedMissing] = useState(false);
  const [hasAppliedEncoding, setHasAppliedEncoding] = useState(false);
  const [hasAppliedNormalization, setHasAppliedNormalization] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasInfiniteValues = analysis.hasInfiniteValues || false;
  const infiniteValueStats = analysis.infiniteValueStats || {};

  const handleInfinite = async () => {
    setLoading(true);
    try {
      const result = await datasetAPI.preprocess(datasetId, {
        handleInfinite: true,
      });
      setHasAppliedInfinite(true);
      onPreprocess(result.data, result.analysis, result.preprocessingSteps);
      toast.success('Infinite values replaced successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to handle infinite values');
    } finally {
      setLoading(false);
    }
  };

  const handleMissing = async () => {
    if (missingValueMethod === 'none') return;
    setLoading(true);
    try {
      const result = await datasetAPI.preprocess(datasetId, {
        missingValueMethod,
      });
      setHasAppliedMissing(true);
      onPreprocess(result.data, result.analysis, result.preprocessingSteps);
      toast.success('Missing values handled successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to handle missing values');
    } finally {
      setLoading(false);
    }
  };

  const handleEncoding = async () => {
    if (encodingMethod === 'none') return;
    setLoading(true);
    try {
      const result = await datasetAPI.preprocess(datasetId, {
        encodingMethod,
      });
      setHasAppliedEncoding(true);
      onPreprocess(result.data, result.analysis, result.preprocessingSteps);
      toast.success('Encoding applied successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to apply encoding');
    } finally {
      setLoading(false);
    }
  };

  const handleNormalization = async () => {
    if (normalizationMethod === 'none') return;
    setLoading(true);
    try {
      const result = await datasetAPI.preprocess(datasetId, {
        normalizationMethod,
      });
      setHasAppliedNormalization(true);
      onPreprocess(result.data, result.analysis, result.preprocessingSteps);
      toast.success('Normalization applied successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to apply normalization');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await datasetAPI.download(datasetId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `refined_dataset.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Dataset downloaded successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to download dataset');
    }
  };

  const getMethodName = (method: string) => {
    const names: Record<string, string> = {
      dropRows: 'Drop Rows',
      dropColumns: 'Drop Columns',
      fillMean: 'Fill with Mean',
      fillMedian: 'Fill with Median',
      fillMode: 'Fill with Mode',
      fillZero: 'Fill with Zero',
    };
    return names[method] || method;
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white mb-6">Data Preprocessing</h2>

      {/* Step 1: Handle Infinite Values */}
      {hasInfiniteValues && !hasAppliedInfinite && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-red-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Step 1: Handle Infinite Values
          </h3>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-4">
            <p className="text-red-800 font-medium mb-2">
              ⚠️ Your dataset contains infinite values in{' '}
              {Object.keys(infiniteValueStats).length} column(s)
            </p>
            <p className="text-red-700 text-sm">
              These should be replaced with NaN before further preprocessing
            </p>
          </div>
          <button
            onClick={handleInfinite}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
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
                <p className="text-green-800 font-medium">
                  Missing values handled successfully!
                </p>
                <p className="text-green-700 text-sm">
                  Method applied: {getMethodName(missingValueMethod)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              Choose a method to handle missing values in your dataset
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[
                { value: 'dropRows', label: 'Drop Rows', color: 'red' },
                { value: 'dropColumns', label: 'Drop Columns', color: 'red' },
                { value: 'fillMean', label: 'Fill with Mean', color: 'blue' },
                { value: 'fillMedian', label: 'Fill with Median', color: 'indigo' },
                { value: 'fillMode', label: 'Fill with Mode', color: 'purple' },
                { value: 'fillZero', label: 'Fill with Zero', color: 'green' },
              ].map((method) => (
                <div
                  key={method.value}
                  onClick={() => setMissingValueMethod(method.value)}
                  className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 text-left ${
                    missingValueMethod === method.value
                      ? `bg-${method.color}-50 border-${method.color}-500`
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      checked={missingValueMethod === method.value}
                      onChange={() => setMissingValueMethod(method.value)}
                      className="w-4 h-4"
                    />
                    <div className={`font-bold text-${method.color}-700`}>
                      {method.label}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {method.value === 'dropRows' && 'Remove all rows with any missing values'}
                    {method.value === 'dropColumns' && 'Remove columns with any missing values'}
                    {method.value === 'fillMean' && 'Replace missing numeric values with column mean'}
                    {method.value === 'fillMedian' && 'Replace missing values with column median'}
                    {method.value === 'fillMode' && 'Replace missing values with most frequent value'}
                    {method.value === 'fillZero' && 'Replace all missing values with 0'}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleMissing}
              disabled={missingValueMethod === 'none' || loading}
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                missingValueMethod === 'none' || loading
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
                  <p className="text-green-800 font-medium">
                    Categorical encoding applied successfully!
                  </p>
                  <p className="text-green-700 text-sm">
                    Method applied:{' '}
                    {encodingMethod === 'label' ? 'Label Encoding' : 'One-Hot Encoding'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                Encode categorical variables for machine learning (
                {analysis.categoricalColumns.length} categorical columns detected)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                  {
                    value: 'label',
                    label: 'Label Encoding',
                    desc: 'Convert categories to integers (0, 1, 2, ...)',
                    note: 'Best for ordinal data',
                  },
                  {
                    value: 'onehot',
                    label: 'One-Hot Encoding',
                    desc: 'Create binary columns for each category',
                    note: 'Best for nominal data',
                  },
                ].map((method) => (
                  <div
                    key={method.value}
                    onClick={() => setEncodingMethod(method.value)}
                    className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 ${
                      encodingMethod === method.value
                        ? 'bg-purple-50 border-purple-500'
                        : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        checked={encodingMethod === method.value}
                        onChange={() => setEncodingMethod(method.value)}
                        className="w-4 h-4"
                      />
                      <div className="font-bold text-purple-700">{method.label}</div>
                    </div>
                    <div className="text-sm text-gray-600">{method.desc}</div>
                    <div className="text-xs text-gray-500 mt-2">{method.note}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleEncoding}
                disabled={encodingMethod === 'none' || loading}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  encodingMethod === 'none' || loading
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
                <p className="text-green-800 font-medium">
                  Normalization applied successfully!
                </p>
                <p className="text-green-700 text-sm">
                  Method applied:{' '}
                  {normalizationMethod === 'minmax'
                    ? 'Min-Max Scaling (0-1 range)'
                    : 'Standard Scaling (mean=0, std=1)'}
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
              {[
                {
                  value: 'minmax',
                  label: 'Min-Max Scaler',
                  desc: 'Scales values to range [0, 1]',
                  formula: 'x_scaled = (x - min) / (max - min)',
                  bestFor: 'Decision trees, K-nearest neighbors, Support vector machines',
                },
                {
                  value: 'standard',
                  label: 'Standard Scaler',
                  desc: 'Standardizes to mean=0, std=1',
                  formula: 'x_scaled = (x - mean) / std',
                  bestFor: 'SVM, Logistic regression, Neural networks',
                },
              ].map((method) => (
                <div
                  key={method.value}
                  onClick={() => setNormalizationMethod(method.value)}
                  className={`p-6 cursor-pointer border-2 rounded-xl transition-all duration-200 ${
                    normalizationMethod === method.value
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      checked={normalizationMethod === method.value}
                      onChange={() => setNormalizationMethod(method.value)}
                      className="w-4 h-4"
                    />
                    <div className="font-bold text-green-700">{method.label}</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{method.desc}</div>
                  <div className="text-xs text-gray-500 bg-white p-2 rounded border border-green-200 font-mono mb-2">
                    {method.formula}
                  </div>
                  <div className="text-xs text-gray-500">
                    <strong>Best for:</strong> {method.bestFor}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleNormalization}
              disabled={normalizationMethod === 'none' || loading}
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                normalizationMethod === 'none' || loading
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
          onClick={onReset}
          className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-all"
        >
          Reset to Original Data
        </button>

        <button
          onClick={handleDownload}
          className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-xl text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download Refined Dataset
        </button>
      </div>
    </div>
  );
};

export default PreprocessingTab;

