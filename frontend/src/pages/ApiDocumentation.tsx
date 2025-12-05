import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book,
  Code,
  Key,
  ChevronRight,
  Copy,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowLeft,
  Terminal,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ApiDocumentation: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('quickstart');
  
  const handleGetApiKey = async () => {
    if (!isAuthenticated) {
      // Not logged in, go to login
      navigate('/login');
      toast('Please log in to get your API key', { icon: 'ℹ️' });
      return;
    }

    // Check if user is admin by trying to access admin endpoint
    // This is more reliable than checking localStorage user object
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${API_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // User is admin, go to admin API keys page
        navigate('/admin/api-keys');
      } else if (response.status === 403) {
        // User is not admin
        navigate('/dashboard');
        toast('Admin access required. Please contact an administrator to get an API key.', { icon: 'ℹ️' });
      } else {
        // Other error, go to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      // Error checking, try based on user object or default to dashboard
      if ((user as any)?.isAdmin) {
        navigate('/admin/api-keys');
      } else {
        navigate('/dashboard');
        toast('Please log out and log back in to refresh your permissions.', { icon: 'ℹ️' });
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const codeSnippets = {
    curl: `curl -X POST https://api.example.com/api/v1/analyze \\
  -H "X-API-Key: ida_your_api_key_here" \\
  -F "file=@dataset.csv" \\
  -F "name=My Dataset"`,
    javascript: `const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'My Dataset');

const response = await fetch('https://api.example.com/api/v1/analyze', {
  method: 'POST',
  headers: {
    'X-API-Key': 'ida_your_api_key_here'
  },
  body: formData
});

const data = await response.json();
console.log(data);`,
    python: `import requests

url = 'https://api.example.com/api/v1/analyze'
headers = {
    'X-API-Key': 'ida_your_api_key_here'
}

files = {
    'file': ('dataset.csv', open('dataset.csv', 'rb'), 'text/csv'),
    'name': (None, 'My Dataset')
}

response = requests.post(url, headers=headers, files=files)
data = response.json()
print(data)`,
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/api/v1/analyze',
      description: 'Analyze uploaded dataset',
      auth: 'Required',
      rateLimit: '100 requests/minute',
    },
    {
      method: 'GET',
      path: '/api/v1/datasets',
      description: 'List all datasets',
      auth: 'Required',
      rateLimit: '100 requests/minute',
    },
    {
      method: 'GET',
      path: '/api/v1/datasets/:id/analysis',
      description: 'Get analysis results',
      auth: 'Required',
      rateLimit: '100 requests/minute',
    },
    {
      method: 'POST',
      path: '/api/v1/datasets/:id/preprocess',
      description: 'Preprocess dataset',
      auth: 'Required',
      rateLimit: '100 requests/minute',
    },
    {
      method: 'POST',
      path: '/api/v1/datasets/:id/summarize',
      description: 'Generate AI summary',
      auth: 'Required',
      rateLimit: '100 requests/minute',
    },
    {
      method: 'GET',
      path: '/api/v1/usage',
      description: 'Get usage statistics',
      auth: 'Required',
      rateLimit: '100 requests/minute',
    },
    {
      method: 'GET',
      path: '/api/v1/health',
      description: 'Health check',
      auth: 'Not required',
      rateLimit: 'Unlimited',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div className="flex items-center gap-2">
                <Book className="w-6 h-6 text-emerald-400" />
                <h1 className="text-2xl font-bold text-white">API Documentation</h1>
              </div>
            </div>
            <button
              onClick={handleGetApiKey}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              Get API Key
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 sticky top-24">
              <nav className="space-y-2">
                {[
                  { id: 'quickstart', label: 'Quick Start', icon: Zap },
                  { id: 'authentication', label: 'Authentication', icon: Key },
                  { id: 'endpoints', label: 'Endpoints', icon: Terminal },
                  { id: 'errors', label: 'Error Codes', icon: AlertCircle },
                  { id: 'rate-limits', label: 'Rate Limits', icon: Clock },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        activeTab === item.id
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Quick Start */}
            {activeTab === 'quickstart' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-8 h-8 text-emerald-400" />
                    Quick Start
                  </h2>
                  <p className="text-slate-300 text-lg mb-6">
                    Get started with our API in minutes. Analyze datasets, generate insights, and integrate AI-powered data analysis into your applications.
                  </p>
                </div>

                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-emerald-400" />
                    1. Get Your API Key
                  </h3>
                  <p className="text-slate-300 mb-4">
                    Sign up or log in to your account and navigate to the Dashboard to generate your API key.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Get API Key
                  </button>
                </div>

                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Code className="w-5 h-5 text-cyan-400" />
                    2. Make Your First Request
                  </h3>
                  <p className="text-slate-300 mb-4">
                    Use your API key to authenticate requests. Here's an example in cURL:
                  </p>
                  <CodeBlock
                    code={codeSnippets.curl}
                    language="bash"
                    onCopy={() => copyToClipboard(codeSnippets.curl, 'curl')}
                    copied={copiedCode === 'curl'}
                  />
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-emerald-400 mb-2">Base URL</h4>
                      <code className="text-emerald-300 font-mono">https://api.example.com/api/v1</code>
                      <p className="text-slate-300 text-sm mt-2">
                        Replace <code className="text-emerald-400">example.com</code> with your actual API domain.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Authentication */}
            {activeTab === 'authentication' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
                    <Key className="w-8 h-8 text-emerald-400" />
                    Authentication
                  </h2>
                  <p className="text-slate-300 text-lg">
                    All API requests require authentication using your API key. Include it in the request headers.
                  </p>
                </div>

                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-white mb-4">Using X-API-Key Header (Recommended)</h3>
                  <CodeBlock
                    code={`X-API-Key: ida_your_api_key_here`}
                    language="bash"
                    onCopy={() => copyToClipboard('X-API-Key: ida_your_api_key_here', 'header')}
                    copied={copiedCode === 'header'}
                  />
                </div>

                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-white mb-4">Using Authorization Header</h3>
                  <CodeBlock
                    code={`Authorization: Bearer ida_your_api_key_here`}
                    language="bash"
                    onCopy={() => copyToClipboard('Authorization: Bearer ida_your_api_key_here', 'auth')}
                    copied={copiedCode === 'auth'}
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-yellow-400 mb-2">Security Best Practices</h4>
                      <ul className="text-slate-300 text-sm space-y-2">
                        <li>• Never expose your API key in client-side code</li>
                        <li>• Store API keys securely in environment variables</li>
                        <li>• Rotate your API keys regularly</li>
                        <li>• Use different API keys for different environments</li>
                        <li>• Monitor your API usage regularly</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Endpoints */}
            {activeTab === 'endpoints' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
                    <Terminal className="w-8 h-8 text-emerald-400" />
                    API Endpoints
                  </h2>
                  <p className="text-slate-300 text-lg">
                    Complete reference for all available API endpoints.
                  </p>
                </div>

                <div className="space-y-6">
                  {endpoints.map((endpoint, index) => (
                    <EndpointCard key={index} endpoint={endpoint} codeSnippets={codeSnippets} copyToClipboard={copyToClipboard} copiedCode={copiedCode} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Error Codes */}
            {activeTab === 'errors' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    Error Codes
                  </h2>
                  <p className="text-slate-300 text-lg">
                    Understanding error responses and how to handle them.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { code: 400, title: 'Bad Request', description: 'Invalid request parameters or body' },
                    { code: 401, title: 'Unauthorized', description: 'Missing or invalid API key' },
                    { code: 403, title: 'Forbidden', description: 'API key does not have permission for this operation' },
                    { code: 404, title: 'Not Found', description: 'Resource not found' },
                    { code: 429, title: 'Rate Limit Exceeded', description: 'Too many requests. Check rate limit headers' },
                    { code: 500, title: 'Internal Server Error', description: 'Server error. Please try again later' },
                  ].map((error) => (
                    <div key={error.code} className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                      <div className="flex items-start gap-4">
                        <span className="text-2xl font-bold text-red-400">{error.code}</span>
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">{error.title}</h3>
                          <p className="text-slate-300">{error.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Rate Limits */}
            {activeTab === 'rate-limits' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-8 h-8 text-emerald-400" />
                    Rate Limits & Quotas
                  </h2>
                  <p className="text-slate-300 text-lg">
                    Understanding rate limits and usage quotas.
                  </p>
                </div>

                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-white mb-4">Default Rate Limits</h3>
                  <ul className="space-y-2 text-slate-300">
                    <li>• <strong className="text-white">100 requests per 60 seconds</strong> per endpoint</li>
                    <li>• Rate limits are applied per API key</li>
                    <li>• Different endpoints may have different limits</li>
                  </ul>
                </div>

                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-white mb-4">Usage Quotas</h3>
                  <ul className="space-y-2 text-slate-300">
                    <li>• Monthly quota per API key (configurable)</li>
                    <li>• Quota resets at the beginning of each month</li>
                    <li>• Check your usage with <code className="text-emerald-400">GET /api/v1/usage</code></li>
                  </ul>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-blue-400 mb-2">Rate Limit Headers</h4>
                      <p className="text-slate-300 text-sm mb-2">
                        All API responses include rate limit information in headers:
                      </p>
                      <ul className="text-slate-300 text-sm space-y-1 font-mono">
                        <li>X-RateLimit-Limit: Maximum requests allowed</li>
                        <li>X-RateLimit-Remaining: Requests remaining in window</li>
                        <li>X-RateLimit-Reset: Time when limit resets (Unix timestamp)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Code Block Component
const CodeBlock: React.FC<{
  code: string;
  language: string;
  onCopy: () => void;
  copied: boolean;
}> = ({ code, language, onCopy, copied }) => {
  return (
    <div className="relative">
      <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
        <pre className="text-sm text-slate-300 font-mono">
          <code>{code}</code>
        </pre>
      </div>
      <button
        onClick={onCopy}
        className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
        title="Copy code"
      >
        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
      <div className="absolute top-2 left-2">
        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 font-mono">{language}</span>
      </div>
    </div>
  );
};

// Endpoint Card Component
const EndpointCard: React.FC<{
  endpoint: any;
  codeSnippets: any;
  copyToClipboard: (code: string, id: string) => void;
  copiedCode: string | null;
}> = ({ endpoint, codeSnippets, copyToClipboard, copiedCode }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div
        className="p-6 cursor-pointer hover:bg-slate-800/60 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded font-mono text-sm font-bold ${
              endpoint.method === 'POST' ? 'bg-green-500/20 text-green-400' :
              endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
              'bg-purple-500/20 text-purple-400'
            }`}>
              {endpoint.method}
            </span>
            <code className="text-white font-mono">{endpoint.path}</code>
          </div>
          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
        <p className="text-slate-300 mt-2">{endpoint.description}</p>
        <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
          <span>Auth: {endpoint.auth}</span>
          <span>•</span>
          <span>Rate Limit: {endpoint.rateLimit}</span>
        </div>
      </div>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-slate-700/50 p-6"
        >
          <div className="mb-4">
            <div className="flex gap-2 mb-4">
              {(['curl', 'javascript', 'python'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLanguage(lang);
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedLanguage === lang
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {lang === 'curl' ? 'cURL' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
            <CodeBlock
              code={codeSnippets[selectedLanguage]}
              language={selectedLanguage}
              onCopy={() => copyToClipboard(codeSnippets[selectedLanguage], `${endpoint.path}-${selectedLanguage}`)}
              copied={copiedCode === `${endpoint.path}-${selectedLanguage}`}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ApiDocumentation;

