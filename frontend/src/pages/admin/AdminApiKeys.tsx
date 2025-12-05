import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Key,
  Plus,
  Search,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api';
import { ApiKey } from '../../types';
import toast from 'react-hot-toast';

const AdminApiKeys: React.FC = () => {
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState<ApiKey | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getApiKeys({ limit: 100 });
      setApiKeys(response.data.apiKeys);
    } catch (error: any) {
      toast.error('Failed to load API keys');
      console.error('API keys error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData: any) => {
    try {
      setCreating(true);
      const response = await adminAPI.createApiKey(formData);
      setShowCreateModal(false);
      toast.success('API key created successfully');
      setShowKeyModal(response.data.data);
      loadApiKeys();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await adminAPI.updateApiKey(id, { isActive: !isActive });
      toast.success(`API key ${!isActive ? 'activated' : 'deactivated'}`);
      loadApiKeys();
    } catch (error: any) {
      toast.error('Failed to update API key');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await adminAPI.deleteApiKey(id);
      toast.success('API key deleted successfully');
      loadApiKeys();
    } catch (error: any) {
      toast.error('Failed to delete API key');
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const filteredKeys = apiKeys.filter((key) =>
    key.name.toLowerCase().includes(search.toLowerCase()) ||
    key.key.toLowerCase().includes(search.toLowerCase())
  );

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
              <h1 className="text-4xl font-bold text-white mb-2">API Keys Management</h1>
              <p className="text-slate-400">Manage API keys for external integration</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create API Key
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search API keys..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/40 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* API Keys List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-4 border-emerald-500"></div>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No API keys found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredKeys.map((key) => (
              <motion.div
                key={key._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{key.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${key.isActive
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700 text-slate-400'
                        }`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {key.description && (
                      <p className="text-slate-400 text-sm mb-3">{key.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <code className="text-xs text-slate-400 font-mono bg-slate-900/50 px-2 py-1 rounded">
                        {selectedKey === key._id ? key.key : `${key.key.substring(0, 20)}...`}
                      </code>
                      <button
                        onClick={() => setSelectedKey(selectedKey === key._id ? null : key._id)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      >
                        {selectedKey === key._id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleCopyKey(key.key)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Copy API key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Rate Limit</p>
                        <p className="text-white font-medium">{key.rateLimit.requests}/{key.rateLimit.window}s</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Quota</p>
                        <p className="text-white font-medium">
                          {key.quota.total ? `${key.quota.used}/${key.quota.total}` : 'Unlimited'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Usage</p>
                        <p className="text-white font-medium">{key.usage?.total || key.usageCount || 0} calls</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Last Used</p>
                        <p className="text-white font-medium text-xs">
                          {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(key._id, key.isActive)}
                      className={`p-2 rounded-lg transition-colors ${key.isActive
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      title={key.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {key.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(key._id)}
                      className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <CreateApiKeyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          loading={creating}
        />

        {/* Show Key Modal */}
        <AnimatePresence>
          {showKeyModal && (
            <ShowApiKeyModal
              apiKey={showKeyModal}
              onClose={() => setShowKeyModal(null)}
              onCopy={handleCopyKey}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Create API Key Modal Component
const CreateApiKeyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
  loading: boolean;
}> = ({ isOpen, onClose, onCreate, loading }) => {
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    description: '',
    rateLimit: { requests: 100, window: 60 },
    quota: { total: null as number | null },
    permissions: {
      analyze: true,
      preprocess: true,
      summarize: true,
      export: true,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Create API Key</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">User ID</label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              placeholder="User MongoDB ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              placeholder="Production API Key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Rate Limit (requests)</label>
              <input
                type="number"
                value={formData.rateLimit.requests}
                onChange={(e) => setFormData({
                  ...formData,
                  rateLimit: { ...formData.rateLimit, requests: parseInt(e.target.value) },
                })}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Window (seconds)</label>
              <input
                type="number"
                value={formData.rateLimit.window}
                onChange={(e) => setFormData({
                  ...formData,
                  rateLimit: { ...formData.rateLimit, window: parseInt(e.target.value) },
                })}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Quota (leave empty for unlimited)</label>
            <input
              type="number"
              value={formData.quota.total || ''}
              onChange={(e) => setFormData({
                ...formData,
                quota: { total: e.target.value ? parseInt(e.target.value) : null },
              })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              placeholder="Unlimited"
            />
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create API Key'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Show API Key Modal
const ShowApiKeyModal: React.FC<{
  apiKey: ApiKey;
  onClose: () => void;
  onCopy: (key: string) => void;
}> = ({ apiKey, onClose, onCopy }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-w-lg w-full p-6"
      >
        <h2 className="text-2xl font-bold text-white mb-4">API Key Created!</h2>
        <p className="text-slate-400 mb-4">
          Make sure to copy this API key now. You won't be able to see it again!
        </p>
        <div className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-4 mb-4">
          <code className="text-emerald-400 font-mono text-sm break-all">{apiKey.key}</code>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onCopy(apiKey.key)}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy API Key
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminApiKeys;

