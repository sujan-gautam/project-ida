import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Key,
  Database,
  TrendingUp,
  Activity,
  AlertCircle,
  Clock,
  BarChart3,
  ArrowRight,
  Zap,
  Terminal,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/api';
import { AdminDashboard as AdminDashboardType } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboardType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin (you may need to add isAdmin to User type)
    if (!user) {
      navigate('/dashboard');
      return;
    }

    loadDashboard();
  }, [navigate, user]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboard();
      setDashboard(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Admin access required');
        navigate('/dashboard');
      } else {
        toast.error('Failed to load dashboard');
        console.error('Dashboard error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500"></div>
          <p className="mt-6 text-xl text-slate-300 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const statCards = [
    {
      title: 'Total Users',
      value: dashboard.overview.totalUsers,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      change: dashboard.growth.users > 0 ? `+${dashboard.growth.users.toFixed(1)}%` : null,
      link: '/admin/users',
    },
    {
      title: 'API Keys',
      value: dashboard.overview.totalApiKeys,
      icon: Key,
      color: 'from-emerald-500 to-teal-500',
      subtitle: `${dashboard.overview.activeApiKeys} active`,
      link: '/admin/api-keys',
    },
    {
      title: 'Total Datasets',
      value: dashboard.overview.totalDatasets,
      icon: Database,
      color: 'from-purple-500 to-pink-500',
      link: '/admin/datasets',
    },
    {
      title: 'API Calls',
      value: dashboard.overview.totalApiCalls.toLocaleString(),
      icon: Activity,
      color: 'from-orange-500 to-red-500',
      subtitle: `${dashboard.today.apiCalls.toLocaleString()} today`,
      change: dashboard.growth.apiCalls > 0 ? `+${dashboard.growth.apiCalls.toFixed(1)}%` : null,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-slate-400">Monitor and manage your API platform</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/api-keys')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              Manage API Keys
            </button>
            <button
              onClick={() => navigate('/admin/sandbox')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Terminal className="w-4 h-4" />
              API Sandbox
            </button>
            <button
              onClick={() => navigate('/admin/analytics')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 border border-slate-700"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => stat.link && navigate(stat.link)}
                className={`bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-emerald-500/30 transition-all cursor-pointer ${
                  stat.link ? 'hover:bg-slate-800/60' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {stat.change && (
                    <span className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {stat.change}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-slate-400 text-sm">{stat.title}</p>
                  {stat.subtitle && (
                    <p className="text-slate-500 text-xs mt-1">{stat.subtitle}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Performance Metrics
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Average Response Time</span>
                </div>
                <span className="text-xl font-bold text-white">
                  {dashboard.metrics.averageResponseTime.toFixed(0)}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Error Rate</span>
                </div>
                <span className={`text-xl font-bold ${
                  dashboard.metrics.errorRate < 5 ? 'text-emerald-400' : 
                  dashboard.metrics.errorRate < 10 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {dashboard.metrics.errorRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </motion.div>

          {/* Top Endpoints */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Top Endpoints
            </h2>
            <div className="space-y-3">
              {dashboard.topEndpoints.slice(0, 5).map((endpoint, index) => (
                <div key={endpoint._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm w-6">{index + 1}.</span>
                    <code className="text-sm text-slate-300 font-mono">{endpoint._id}</code>
                  </div>
                  <span className="text-emerald-400 font-semibold">{endpoint.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Recent Users
              </h2>
              <button
                onClick={() => navigate('/admin/users')}
                className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {dashboard.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-slate-400 text-sm">{user.email}</p>
                  </div>
                  <span className="text-slate-500 text-xs">
                    {new Date((user as any).createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent API Keys */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                Recent API Keys
              </h2>
              <button
                onClick={() => navigate('/admin/api-keys')}
                className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {dashboard.recentApiKeys.map((key) => (
                <div key={key._id} className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{key.name}</p>
                    <p className="text-slate-400 text-sm font-mono text-xs">
                      {key.key.substring(0, 20)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      key.isActive 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {key.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

