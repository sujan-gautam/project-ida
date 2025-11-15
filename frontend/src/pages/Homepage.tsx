import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Zap, 
  BarChart3, 
  Brain, 
  TrendingUp, 
  Shield, 
  Sparkles,
  ArrowRight,
  Play
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import HomepageWorkflow from '../components/HomepageWorkflow';

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Zap,
      title: 'Automated ETL Pipeline',
      description: 'End-to-end data processing with intelligent type inference and schema validation',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Natural language summaries with contextual understanding of data patterns',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: BarChart3,
      title: 'Statistical Analysis',
      description: 'Comprehensive correlation matrices, distribution analysis, and outlier detection',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      icon: TrendingUp,
      title: 'Feature Engineering',
      description: 'Automated encoding, normalization, and transformation for ML readiness',
      color: 'from-teal-500 to-emerald-500',
    },
    {
      icon: Shield,
      title: 'Data Quality Assurance',
      description: 'Comprehensive validation: missing values, duplicates, infinite values, and anomalies',
      color: 'from-slate-500 to-gray-600',
    },
    {
      icon: Sparkles,
      title: 'Production Ready',
      description: 'Export clean, normalized datasets optimized for machine learning workflows',
      color: 'from-cyan-500 to-blue-500',
    },
  ];

  const steps = [
    'Upload your CSV or Excel file',
    'Automated analysis runs instantly',
    'AI generates insights and recommendations',
    'Download preprocessed, ML-ready data',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 overflow-hidden relative">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
      
      {/* Subtle Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-xl rounded-full"></div>
                <Activity className="w-10 h-10 text-emerald-400 relative z-10" />
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Data Analyzer Pro
              </span>
            </div>
            <div className="flex gap-4">
              {isAuthenticated ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all"
                >
                  Dashboard
                </motion.button>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/login')}
                    className="px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all"
                  >
                    Login
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/signup')}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all font-medium"
                  >
                    Get Started
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/20 mb-8"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300 text-sm font-medium">
                Enterprise-Grade Data Science Automation
              </span>
            </motion.div>

            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              Replace Manual Data Science
              <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                with Intelligent Automation
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto font-light">
              Production-ready ETL pipelines that transform raw datasets into ML-ready features.
              <span className="block mt-2 text-lg text-slate-400">
                What takes data scientists hours, we do in seconds.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(isAuthenticated ? '/analyzer' : '/signup')}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-emerald-500/25 transition-all flex items-center gap-2 group"
              >
                <Play className="w-5 h-5" />
                Launch Pipeline
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 bg-slate-800/50 backdrop-blur-sm text-white rounded-xl font-semibold text-lg border border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all"
              >
                View Dashboard
              </motion.button>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-emerald-500/30 hover:bg-slate-800/60 transition-all group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* How It Works - Automation Workflow */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-32"
          >
            <HomepageWorkflow />
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-32 text-center"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Automate Your Data Pipeline?
            </h2>
            <p className="text-slate-400 mb-8 text-lg">
              Join data scientists who've replaced hours of manual work with intelligent automation
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(isAuthenticated ? '/analyzer' : '/signup')}
              className="px-10 py-5 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-xl font-semibold text-xl hover:shadow-2xl hover:shadow-emerald-500/25 transition-all inline-flex items-center gap-3"
            >
              <Zap className="w-6 h-6" />
              Start Free Trial
              <ArrowRight className="w-6 h-6" />
            </motion.button>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Homepage;

