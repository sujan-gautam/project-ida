import React, { useState, useEffect } from 'react';
import {
  Database,
  Settings,
  AlertTriangle,
  Filter,
  BarChart3,
  Code,
  TrendingUp,
  Brain,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkflowNode {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'pending' | 'running' | 'completed';
  color: string;
}

const HomepageWorkflow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const nodes: WorkflowNode[] = [
    {
      id: '1',
      name: 'Data Ingestion',
      description: 'Upload CSV/Excel files',
      icon: Database,
      status: 'pending',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: '2',
      name: 'Data Validation',
      description: 'Type detection & schema',
      icon: Settings,
      status: 'pending',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: '3',
      name: 'Infinite Values',
      description: 'Clean infinite values',
      icon: AlertTriangle,
      status: 'pending',
      color: 'from-amber-500 to-orange-500',
    },
    {
      id: '4',
      name: 'Missing Values',
      description: 'Handle nulls',
      icon: Filter,
      status: 'pending',
      color: 'from-slate-500 to-gray-600',
    },
    {
      id: '5',
      name: 'Data Quality',
      description: 'Quality checks',
      icon: BarChart3,
      status: 'pending',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      id: '6',
      name: 'Encoding',
      description: 'Categorical encoding',
      icon: Code,
      status: 'pending',
      color: 'from-teal-500 to-cyan-500',
    },
    {
      id: '7',
      name: 'Normalization',
      description: 'Feature scaling',
      icon: TrendingUp,
      status: 'pending',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: '8',
      name: 'Re-analysis',
      description: 'Statistical analysis',
      icon: BarChart3,
      status: 'pending',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      id: '9',
      name: 'AI Summary',
      description: 'Gemini insights',
      icon: Brain,
      status: 'pending',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      id: '10',
      name: 'Export Ready',
      description: 'ML-ready dataset',
      icon: Download,
      status: 'pending',
      color: 'from-emerald-500 to-cyan-500',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setCurrentStep((prev) => {
        const next = (prev + 1) % nodes.length;
        return next;
      });
      setTimeout(() => setIsAnimating(false), 2000);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getNodeStatus = (index: number): WorkflowNode['status'] => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'running';
    return 'pending';
  };

  return (
    <div className="w-full">
      <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-slate-700/50 overflow-hidden">
        <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4 tracking-tight">
          Automated Pipeline Architecture
        </h2>
        <p className="text-center text-slate-400 mb-12 text-lg font-light">
          Ten-stage ETL process that transforms raw data into production-ready features
        </p>

        {/* Workflow Steps - Horizontal Scroll on Mobile, Grid on Desktop */}
        <div className="relative">
          {/* Connection Lines - Desktop Only */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 opacity-30" />
          
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4 md:gap-6 relative">
            {nodes.map((node, index) => {
              const Icon = node.icon;
              const status = getNodeStatus(index);
              const isActive = index === currentStep;

              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={{ 
                    delay: index * 0.1,
                    duration: 0.3,
                  }}
                  className="flex flex-col items-center gap-3 relative"
                >
                  {/* Connector Arrow - Mobile/Tablet */}
                  {index < nodes.length - 1 && (
                    <div className="absolute top-6 -right-3 md:-right-6 lg:hidden z-0">
                      <ArrowRight className="w-4 h-4 md:w-6 md:h-6 text-white/30" />
                    </div>
                  )}

                  {/* Node Circle */}
                  <motion.div
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${node.color} flex items-center justify-center relative shadow-lg ${
                      status === 'running' ? 'ring-4 ring-white/50 ring-offset-2 ring-offset-transparent' : ''
                    }`}
                    animate={status === 'running' ? {
                      scale: [1, 1.1, 1],
                      boxShadow: [
                        '0 10px 25px rgba(0,0,0,0.3)',
                        '0 15px 35px rgba(255,255,255,0.2)',
                        '0 10px 25px rgba(0,0,0,0.3)',
                      ],
                    } : {}}
                    transition={status === 'running' ? {
                      duration: 1.5,
                      repeat: Infinity,
                    } : {}}
                  >
                    {status === 'running' ? (
                      <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-white animate-spin" />
                    ) : status === 'completed' ? (
                      <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    ) : (
                      <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    )}
                    
                    {/* Pulse effect for active node */}
                    {status === 'running' && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-white/30"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                        }}
                      />
                    )}
                  </motion.div>

                  {/* Node Info */}
                  <div className="text-center">
                    <h3 className="text-sm md:text-base font-bold text-white mb-1">
                      {node.name}
                    </h3>
                    <p className="text-xs text-slate-400 hidden md:block">
                      {node.description}
                    </p>
                    {status === 'running' && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-emerald-400 font-medium mt-1 block"
                      >
                        Processing...
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-12">
          <div className="flex items-center justify-between text-sm text-slate-300 mb-3">
            <span>Pipeline Progress</span>
            <span className="font-mono text-white font-bold">
              {Math.round(((currentStep + 1) / nodes.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / nodes.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-slate-800/40 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="text-2xl font-bold text-white mb-1 font-mono">
              {Math.floor(Math.random() * 5000) + 5000}
            </div>
            <div className="text-xs text-slate-400 font-medium">Rows Processed</div>
          </div>
          <div className="bg-slate-800/40 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="text-2xl font-bold text-emerald-400 mb-1 font-mono">98.5%</div>
            <div className="text-xs text-slate-400 font-medium">Data Quality</div>
          </div>
          <div className="bg-slate-800/40 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="text-2xl font-bold text-white mb-1 font-mono">
              {currentStep + 1}/{nodes.length}
            </div>
            <div className="text-xs text-slate-400 font-medium">Steps Complete</div>
          </div>
          <div className="bg-slate-800/40 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="text-2xl font-bold text-cyan-400 mb-1 font-mono">2.3s</div>
            <div className="text-xs text-slate-400 font-medium">Avg Time</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomepageWorkflow;

