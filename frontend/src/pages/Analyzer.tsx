import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Activity,
  Zap,
  Download,
  Sparkles,
  Brain,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { datasetAPI } from '../services/api';
import { Analysis, Dataset } from '../types';
import toast from 'react-hot-toast';
import { sessionStorage } from '../utils/sessionStorage';

import FileUpload from '../components/FileUpload';
import Tabs from '../components/Tabs';
import OverviewTab from '../components/tabs/OverviewTab';
import DistributionsTab from '../components/tabs/DistributionsTab';
import CorrelationsTab from '../components/tabs/CorrelationsTab';
import OutliersTab from '../components/tabs/OutliersTab';
import DataQualityTab from '../components/tabs/DataQualityTab';
import PreprocessingTab from '../components/tabs/PreprocessingTab';
import PreviewTab from '../components/tabs/PreviewTab';
import AutomationWorkflow from '../components/AutomationWorkflow';
import SummarizerChat from '../components/SummarizerChat';

const Analyzer: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [preprocessingSteps, setPreprocessingSteps] = useState<string[]>([]);
  const [sessionRestored, setSessionRestored] = useState(false);

  const tabs = [
    'overview',
    'distributions',
    'correlations',
    'outliers',
    'data-quality',
    'preprocessing',
    'preview',
  ];

  // Restore session on mount (only if no ID and session exists)
  useEffect(() => {
    const savedSession = sessionStorage.load();
    if (savedSession && !id) {
      // Only restore if session has a valid datasetId
      // If session was cleared (null datasetId), start fresh
      if (savedSession.datasetId) {
        navigate(`/analyzer/${savedSession.datasetId}`, { replace: true });
        setActiveTab(savedSession.activeTab);
        setPreprocessingSteps(savedSession.preprocessingSteps);
        setFileName(savedSession.fileName);
        toast.success('Session restored!', { icon: '💾' });
      } else {
        // Session was cleared, start fresh
        setSessionRestored(true);
      }
    } else {
      // No session or has ID, proceed normally
      setSessionRestored(true);
    }
  }, [id, navigate]);

  // Save session when state changes
  useEffect(() => {
    if (sessionRestored && dataset?._id) {
      sessionStorage.save({
        datasetId: dataset._id,
        activeTab,
        preprocessingSteps,
        fileName,
        timestamp: Date.now(),
      });
    }
  }, [dataset?._id, activeTab, preprocessingSteps, fileName, sessionRestored]);

  useEffect(() => {
    if (id) {
      loadDataset(id);
    }
  }, [id]);

  const loadDataset = async (datasetId: string) => {
    setLoading(true);
    try {
      const loadedDataset = await datasetAPI.getById(datasetId);
      setDataset(loadedDataset);
      setData(loadedDataset.preprocessedData || loadedDataset.rawData);
      setAnalysis(loadedDataset.analysis);
      setFileName(loadedDataset.fileName);
      setPreprocessingSteps(loadedDataset.preprocessingSteps || []);
    } catch (error: any) {
      toast.error('Failed to load dataset');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setFileName(file.name);

    try {
      const result = await datasetAPI.upload(file);
      setDataset({ _id: result.datasetId } as Dataset);
      setAnalysis(result.analysis);
      setData(result.analysis ? [] : []);
      setPreprocessingSteps([]);
      toast.success('Dataset uploaded and analyzed successfully!');
      navigate(`/analyzer/${result.datasetId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePreprocess = (newData: any, newAnalysis: Analysis, steps: string[]) => {
    setData(newData);
    setAnalysis(newAnalysis);
    setPreprocessingSteps(steps);
    if (dataset) {
      setDataset({ ...dataset, preprocessedData: newData, analysis: newAnalysis, preprocessingSteps: steps });
    }
    // Update session
    sessionStorage.updatePreprocessingSteps(steps);
  };

  const handleReset = async () => {
    if (!dataset) return;
    try {
      const loadedDataset = await datasetAPI.getById(dataset._id);
      setData(loadedDataset.rawData);
      setAnalysis(loadedDataset.analysis);
      setPreprocessingSteps([]);
      toast.success('Data reset to original');
    } catch (error: any) {
      toast.error('Failed to reset data');
    }
  };

  const handleAutomationComplete = (
    newData: any,
    newAnalysis: Analysis,
    steps: string[],
    summary: string
  ) => {
    handlePreprocess(newData, newAnalysis, steps);
    if (dataset) {
      loadDataset(dataset._id); // Reload to get updated threads
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    sessionStorage.updateTab(tab);
  };

  if (loading && !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500"></div>
          <p className="mt-6 text-xl text-slate-300 font-medium">
            {dataset ? 'Loading dataset...' : 'Analyzing your data...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-4 md:p-8 pb-20">
      {/* Subtle Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Compact Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-xl rounded-full"></div>
              <Activity className="w-8 h-8 text-emerald-400 relative z-10" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Data Analyzer Pro
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Enterprise-grade ETL pipeline with AI-powered insights
          </p>
        </div>

        {/* File Upload */}
        {!dataset && (
          <FileUpload
            onFileUpload={handleFileUpload}
            fileName={fileName}
            loading={loading}
          />
        )}

        {/* Main Content */}
        {analysis && !loading && (
          <>
            {/* Compact Header with Preprocessing Steps */}
            {preprocessingSteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-4 border border-emerald-500/20"
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">
                      {preprocessingSteps.length} Preprocessing Steps Applied
                    </span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {preprocessingSteps.slice(0, 3).map((step, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-md border border-emerald-500/30"
                      >
                        {step.substring(0, 30)}...
                      </span>
                    ))}
                    {preprocessingSteps.length > 3 && (
                      <span className="text-xs text-slate-400">+{preprocessingSteps.length - 3} more</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Automation Workflow - Collapsible */}
            <div className="mb-6">
              <AutomationWorkflow
                datasetId={dataset!._id}
                onComplete={handleAutomationComplete}
              />
            </div>

            {/* Tabs and Content - Compact */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl shadow-lg mb-6 border border-slate-700/50 overflow-hidden">
              <Tabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                tabs={tabs}
              />

              <div className="p-4 md:p-6 max-h-[600px] overflow-y-auto">
                {activeTab === 'overview' && <OverviewTab analysis={analysis} />}
                {activeTab === 'distributions' && (
                  <DistributionsTab analysis={analysis} data={data} />
                )}
                {activeTab === 'correlations' && (
                  <CorrelationsTab analysis={analysis} data={data} />
                )}
                {activeTab === 'outliers' && (
                  <OutliersTab analysis={analysis} data={data} />
                )}
                {activeTab === 'data-quality' && (
                  <DataQualityTab analysis={analysis} data={data} />
                )}
                {activeTab === 'preprocessing' && (
                  <PreprocessingTab
                    datasetId={dataset!._id}
                    analysis={analysis}
                    onPreprocess={handlePreprocess}
                    onReset={handleReset}
                  />
                )}
                {activeTab === 'preview' && <PreviewTab data={data} />}
              </div>
            </div>

            {/* AI Summarizer Chat - Compact */}
            <div className="mb-6">
              <SummarizerChat 
                datasetId={dataset!._id} 
                analysis={analysis}
                onAutoSummarize={() => {
                  // Scroll to summarizer when auto-summarize is triggered
                  setTimeout(() => {
                    const summarizerElement = document.querySelector('[data-summarizer]');
                    summarizerElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 500);
                }}
              />
            </div>
          </>
        )}

        {/* Floating Auto Summarize Button */}
        {analysis && !loading && dataset && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const summarizerElement = document.querySelector('[data-summarizer]');
              summarizerElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Trigger auto summarize after scroll
              setTimeout(() => {
                const autoButton = document.querySelector('[data-auto-summarize]') as HTMLButtonElement;
                autoButton?.click();
              }, 800);
            }}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-2xl hover:shadow-emerald-500/50 transition-all flex items-center justify-center group"
            title="Auto Summarize Dataset"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Brain className="w-8 h-8 md:w-10 md:h-10" />
            </motion.div>
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </span>
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Auto Summarize
            </div>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default Analyzer;

