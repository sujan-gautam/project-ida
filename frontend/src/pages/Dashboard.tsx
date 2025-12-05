import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, LogOut, FileText, Zap, Trash2, X, Settings, Book } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { datasetAPI } from '../services/api';
import { Dataset } from '../types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { sessionStorage } from '../utils/sessionStorage';
import VideoLogo from '../components/VideoLogo';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const data = await datasetAPI.getAll();
      // Ensure preprocessingSteps is always an array
      const datasetsWithDefaults = data.map((dataset: Dataset) => ({
        ...dataset,
        preprocessingSteps: dataset.preprocessingSteps || [],
      }));
      setDatasets(datasetsWithDefaults);
    } catch (error: any) {
      toast.error('Failed to load datasets');
      setDatasets([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNewDataset = () => {
    // Clear any existing analyzer session to start fresh
    sessionStorage.clear();
    navigate('/analyzer');
  };

  const handleDeleteClick = (e: React.MouseEvent, datasetId: string) => {
    e.stopPropagation(); // Prevent card click navigation
    setConfirmDelete(datasetId);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    setDeletingId(confirmDelete);
    try {
      await datasetAPI.delete(confirmDelete);
      setDatasets(datasets.filter(d => d._id !== confirmDelete));
      toast.success('Dataset deleted successfully');
      setConfirmDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete dataset');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-4 md:p-8 pb-20">
      {/* Subtle Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex flex-col items-center gap-1">
              <VideoLogo size="md" />
              <span className="text-xs font-medium bg-gradient-to-r from-white via-slate-100 to-white bg-clip-text text-transparent tracking-wide font-inter antialiased">
                Project <span className="font-bold">IDA</span>
              </span>
            </Link>
            <div className="h-12 w-px bg-slate-700/50"></div>
            <div>
              <p className="text-slate-400 text-sm">Welcome back, {user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/api-docs"
              className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm text-white rounded-lg border border-slate-700/50 hover:bg-slate-800/70 hover:border-emerald-500/30 transition-all flex items-center gap-2 text-sm font-medium"
            >
              <Book className="w-4 h-4" />
              API Docs
            </Link>
            {(user as any)?.isAdmin && (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-4 py-2 bg-emerald-600/20 backdrop-blur-sm text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-600/30 hover:border-emerald-500/50 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
                Admin Panel
              </button>
            )}
            <button
              onClick={handleNewDataset}
              className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm text-white rounded-lg border border-slate-700/50 hover:bg-slate-800/70 hover:border-emerald-500/30 transition-all flex items-center gap-2 text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              New Dataset
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm text-red-400 rounded-lg border border-slate-700/50 hover:bg-red-500/10 hover:border-red-500/30 transition-all flex items-center gap-2 text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/40 backdrop-blur-sm rounded-xl shadow-xl p-6 mb-8 border border-slate-700/50"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Create New Dataset
              </h2>
              <p className="text-slate-400 text-sm">
                Upload and analyze your data with automated ETL pipelines
              </p>
            </div>
            <button
              onClick={handleNewDataset}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload Dataset
            </button>
          </div>
        </motion.div>

        {/* Datasets List */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Your Datasets</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-500"></div>
              <p className="mt-4 text-slate-400">Loading datasets...</p>
            </div>
          ) : datasets.length === 0 ? (
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl shadow-xl p-12 text-center border border-slate-700/50">
              <FileText className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">No datasets yet</p>
              <p className="text-slate-400 text-sm">
                Upload your first dataset to start analyzing
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((dataset) => (
                <motion.div
                  key={dataset._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => navigate(`/analyzer/${dataset._id}`)}
                  className="bg-slate-800/40 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50 cursor-pointer hover:border-emerald-500/30 hover:bg-slate-800/60 transition-all group relative"
                >
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteClick(e, dataset._id)}
                    disabled={deletingId === dataset._id}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                    title="Delete dataset"
                  >
                    {deletingId === dataset._id ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex items-center gap-3 mb-4 pr-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                      <FileText className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{dataset.name}</h3>
                      <p className="text-sm text-slate-400 truncate">{dataset.fileName}</p>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-slate-400">
                      Created: <span className="text-slate-300">{new Date(dataset.createdAt).toLocaleDateString()}</span>
                    </p>
                    {dataset.preprocessingSteps && dataset.preprocessingSteps.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-xs font-medium border border-emerald-500/20">
                          <Zap className="w-3 h-3" />
                          {dataset.preprocessingSteps.length} steps applied
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDeleteCancel}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-w-md w-full p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                    Delete Dataset
                  </h3>
                  <button
                    onClick={handleDeleteCancel}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-slate-300 mb-6">
                  Are you sure you want to delete this dataset? This action cannot be undone and will permanently remove all associated data, analysis, and chat history.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    disabled={deletingId !== null}
                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deletingId !== null}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deletingId ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;

