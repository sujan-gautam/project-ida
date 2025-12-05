import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Code,
  Key,
  ArrowLeft,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Terminal,
  FileText,
  Loader2,
  RefreshCw,
  Download,
  Upload,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/api';
import { ApiKey } from '../../types';
import toast from 'react-hot-toast';
import axios from 'axios';

const AdminApiSandbox: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/v1/analyze');
  const [method, setMethod] = useState<string>('POST');
  const [requestBody, setRequestBody] = useState<string>('{}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [requestHeaders, setRequestHeaders] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);

  const endpoints = [
    { path: '/api/v1/analyze', method: 'POST', description: 'Analyze uploaded dataset' },
    { path: '/api/v1/datasets', method: 'GET', description: 'List all datasets' },
    { path: '/api/v1/datasets/:id/analysis', method: 'GET', description: 'Get analysis results' },
    { path: '/api/v1/datasets/:id/preprocess', method: 'POST', description: 'Preprocess dataset' },
    { path: '/api/v1/datasets/:id/summarize', method: 'POST', description: 'Generate AI summary' },
    { path: '/api/v1/usage', method: 'GET', description: 'Get usage statistics' },
    { path: '/api/v1/health', method: 'GET', description: 'Health check' },
  ];

  useEffect(() => {
    loadApiKeys();
  }, []);

  useEffect(() => {
    // Update endpoint details when selection changes
    const endpoint = endpoints.find((e) => e.path === selectedEndpoint);
    if (endpoint) {
      setMethod(endpoint.method);
      // Set default request body for certain endpoints
      if (endpoint.path === '/api/v1/datasets/:id/summarize') {
        setRequestBody(JSON.stringify({ mode: 'intermediate' }, null, 2));
      } else if (endpoint.path === '/api/v1/datasets/:id/preprocess') {
        setRequestBody(JSON.stringify({
          handleInfinite: true,
          missingValueMethod: 'mean',
        }, null, 2));
      } else if (endpoint.method === 'GET') {
        setRequestBody('{}');
      }
    }
  }, [selectedEndpoint]);

  const loadApiKeys = async () => {
    try {
      const response = await adminAPI.getApiKeys({ limit: 100 });
      setApiKeys(response.data.apiKeys || []);
      if (response.data.apiKeys && response.data.apiKeys.length > 0) {
        setSelectedApiKey(response.data.apiKeys[0]._id);
      }
    } catch (error: any) {
      toast.error('Failed to load API keys');
      console.error('API keys error:', error);
    }
  };

  const handleTestApi = async () => {
    if (!selectedApiKey) {
      toast.error('Please select an API key');
      return;
    }

    const apiKey = apiKeys.find((k) => k._id === selectedApiKey);
    if (!apiKey) {
      toast.error('Selected API key not found');
      return;
    }

    const startTime = Date.now();
    
    try {
      setLoading(true);
      setResponse(null);
      setStatusCode(null);
      setResponseTime(null);

      // Get base API URL - handle both with and without /api suffix
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Remove trailing /api if present since endpoints already include /api/v1
      let API_BASE = baseUrl.replace(/\/api\/?$/, '');
      // Ensure base URL doesn't have trailing slash
      API_BASE = API_BASE.replace(/\/$/, '');
      
      // Build URL - endpoints already include /api/v1, so just append to base
      // Example: 'http://localhost:5000' + '/api/v1/analyze' = 'http://localhost:5000/api/v1/analyze'
      let url = `${API_BASE}${selectedEndpoint}`;
      if (selectedEndpoint.includes(':id')) {
        // Extract dataset ID from request body if it's JSON, or prompt for it
        try {
          const body = JSON.parse(requestBody);
          if (body.datasetId) {
            url = url.replace(':id', body.datasetId);
          } else {
            toast.error('Please provide datasetId in request body for this endpoint');
            setLoading(false);
            return;
          }
        } catch {
          toast.error('Invalid JSON in request body. Provide datasetId in body.');
          setLoading(false);
          return;
        }
      }

      // Prepare request config
      const config: any = {
        method: method,
        url: url,
        headers: {
          'X-API-Key': apiKey.key,
          ...requestHeaders,
        },
      };

      // Handle file upload
      if (method === 'POST' && selectedFile && selectedEndpoint === '/api/v1/analyze') {
        const formData = new FormData();
        formData.append('file', selectedFile);
        try {
          const body = JSON.parse(requestBody);
          if (body.name) {
            formData.append('name', body.name);
          }
        } catch {
          // Body might not be JSON for file upload
        }
        config.data = formData;
        delete config.headers['Content-Type']; // Let browser set it for FormData
      } else if (method !== 'GET' && requestBody && requestBody !== '{}') {
        try {
          config.data = JSON.parse(requestBody);
          config.headers['Content-Type'] = 'application/json';
        } catch (e) {
          toast.error('Invalid JSON in request body');
          setLoading(false);
          return;
        }
      }

      // Make request
      const axiosResponse = await axios(config);
      const endTime = Date.now();
      const time = endTime - startTime;

      setResponse(axiosResponse.data);
      setStatusCode(axiosResponse.status);
      setResponseTime(time);

      // Add to history
      const historyItem = {
        timestamp: new Date().toISOString(),
        endpoint: selectedEndpoint,
        method: method,
        statusCode: axiosResponse.status,
        responseTime: time,
        success: true,
      };
      setRequestHistory((prev) => [historyItem, ...prev.slice(0, 9)]); // Keep last 10

      toast.success(`Request successful! (${time}ms)`);
    } catch (error: any) {
      const endTime = Date.now();
      const time = Date.now() - startTime;

      setStatusCode(error.response?.status || 500);
      setResponseTime(time);
      setResponse({
        error: error.response?.data?.error || 'Request failed',
        message: error.response?.data?.message || error.message,
        details: error.response?.data,
      });

      // Add to history
      const historyItem = {
        timestamp: new Date().toISOString(),
        endpoint: selectedEndpoint,
        method: method,
        statusCode: error.response?.status || 500,
        responseTime: time,
        success: false,
      };
      setRequestHistory((prev) => [historyItem, ...prev.slice(0, 9)]);

      toast.error(`Request failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      toast.success('Response copied to clipboard');
    }
  };

  const handleCopyApiKey = () => {
    const apiKey = apiKeys.find((k) => k._id === selectedApiKey);
    if (apiKey) {
      navigator.clipboard.writeText(apiKey.key);
      toast.success('API key copied to clipboard');
    }
  };

  const formatJSON = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const getEndpointExample = () => {
    const endpoint = endpoints.find((e) => e.path === selectedEndpoint);
    if (!endpoint) return '';

    const apiKey = apiKeys.find((k) => k._id === selectedApiKey);
    const key = apiKey?.key || 'ida_your_api_key_here';
    
    // Get base URL for examples - remove /api suffix if present
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    let API_BASE = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    // Build full URL
    const fullUrl = `${API_BASE}${endpoint.path}`;

    if (endpoint.path === '/api/v1/analyze') {
      return `curl -X POST ${fullUrl} \\
  -H "X-API-Key: ${key}" \\
  -F "file=@dataset.csv" \\
  -F "name=My Dataset"`;
    } else if (endpoint.method === 'GET') {
      return `curl -X GET ${fullUrl} \\
  -H "X-API-Key: ${key}"`;
    } else {
      return `curl -X ${endpoint.method} ${fullUrl} \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '${requestBody}'`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Terminal className="w-8 h-8 text-emerald-400" />
                API Key Sandbox
              </h1>
              <p className="text-slate-400">Test API keys and endpoints in real-time</p>
            </div>
            <button
              onClick={loadApiKeys}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Keys
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* API Key Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                Select API Key
              </h2>
              <div className="space-y-4">
                <select
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                >
                  <option value="">-- Select API Key --</option>
                  {apiKeys.map((key) => (
                    <option key={key._id} value={key._id}>
                      {key.name} {key.isActive ? '(Active)' : '(Inactive)'}
                    </option>
                  ))}
                </select>
                {selectedApiKey && (
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">API Key:</span>
                      <button
                        onClick={handleCopyApiKey}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Copy API key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <code className="text-xs text-emerald-400 font-mono break-all">
                      {apiKeys.find((k) => k._id === selectedApiKey)?.key}
                    </code>
                    <div className="mt-3 flex gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Rate Limit:</span>
                        <span className="text-white ml-2">
                          {apiKeys.find((k) => k._id === selectedApiKey)?.rateLimit.requests}/
                          {apiKeys.find((k) => k._id === selectedApiKey)?.rateLimit.window}s
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Quota:</span>
                        <span className="text-white ml-2">
                          {apiKeys.find((k) => k._id === selectedApiKey)?.quota.total
                            ? `${apiKeys.find((k) => k._id === selectedApiKey)?.quota.used}/${apiKeys.find((k) => k._id === selectedApiKey)?.quota.total}`
                            : 'Unlimited'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Endpoint Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-cyan-400" />
                Endpoint Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Endpoint</label>
                  <select
                    value={selectedEndpoint}
                    onChange={(e) => setSelectedEndpoint(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  >
                    {endpoints.map((endpoint) => (
                      <option key={endpoint.path} value={endpoint.path}>
                        {endpoint.method} {endpoint.path} - {endpoint.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                {selectedEndpoint === '/api/v1/analyze' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">File Upload</label>
                    <div className="flex items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {selectedFile ? selectedFile.name : 'Select File'}
                      </button>
                      {selectedFile && (
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {method !== 'GET' && selectedEndpoint !== '/api/v1/analyze' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Request Body (JSON)</label>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      className="w-full h-48 px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-none"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                )}
                {selectedEndpoint === '/api/v1/analyze' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Dataset Name (Optional)</label>
                    <input
                      type="text"
                      value={JSON.parse(requestBody || '{}').name || ''}
                      onChange={(e) => {
                        try {
                          const body = JSON.parse(requestBody || '{}');
                          body.name = e.target.value;
                          setRequestBody(JSON.stringify(body, null, 2));
                        } catch {
                          setRequestBody(JSON.stringify({ name: e.target.value }, null, 2));
                        }
                      }}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                      placeholder="My Dataset"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Additional Headers (JSON)</label>
                  <textarea
                    value={JSON.stringify(requestHeaders, null, 2)}
                    onChange={(e) => {
                      try {
                        setRequestHeaders(JSON.parse(e.target.value || '{}'));
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="w-full h-24 px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-none"
                    placeholder='{"Custom-Header": "value"}'
                  />
                </div>
                <button
                  onClick={handleTestApi}
                  disabled={loading || !selectedApiKey}
                  className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Test API Request
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* cURL Example */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-purple-400" />
                  cURL Example
                </h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getEndpointExample());
                    toast.success('cURL command copied!');
                  }}
                  className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Copy cURL command"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <pre className="text-xs text-slate-300 font-mono overflow-x-auto">
                  <code>{getEndpointExample()}</code>
                </pre>
              </div>
            </motion.div>
          </div>

          {/* Right Panel - Response */}
          <div className="lg:col-span-1 space-y-6">
            {/* Response Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Response
                </h2>
                {response && (
                  <button
                    onClick={handleCopyResponse}
                    className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Copy response"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
              {statusCode && (
                <div className="mb-4 flex items-center gap-4">
                  <div className={`px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-2 ${
                    statusCode >= 200 && statusCode < 300
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {statusCode >= 200 && statusCode < 300 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {statusCode} {statusCode >= 200 && statusCode < 300 ? 'Success' : 'Error'}
                  </div>
                  {responseTime !== null && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      {responseTime}ms
                    </div>
                  )}
                </div>
              )}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 min-h-[400px] max-h-[600px] overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
                      <p className="text-slate-400">Sending request...</p>
                    </div>
                  </div>
                ) : response ? (
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                    <code>{formatJSON(response)}</code>
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No response yet</p>
                      <p className="text-sm mt-2">Click "Test API Request" to test</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Request History */}
            {requestHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Request History
                </h2>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {requestHistory.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          item.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                          item.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {item.method}
                        </span>
                        <span className={`text-xs font-medium ${
                          item.success ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {item.statusCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{item.endpoint}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                        <span>{item.responseTime}ms</span>
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminApiSandbox;

