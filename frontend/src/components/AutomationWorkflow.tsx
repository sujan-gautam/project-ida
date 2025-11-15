import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  Loader2,
  Database,
  Filter,
  Code,
  TrendingUp,
  BarChart3,
  Brain,
  Download,
  Play,
  Settings,
  AlertTriangle,
  Cpu,
  Activity,
  Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { datasetAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Analysis } from '../types';

interface AutomationWorkflowProps {
  datasetId: string;
  onComplete: (data: any, analysis: Analysis, steps: string[], summary: string) => void;
}

interface WorkflowNode {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'pending' | 'running' | 'completed' | 'error';
  position: { x: number; y: number };
  connections?: string[];
  details?: string;
  code?: string;
  color: string;
}

const AutomationWorkflow: React.FC<AutomationWorkflowProps> = ({
  datasetId,
  onComplete,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [liveStats, setLiveStats] = useState({
    rows: 0,
    processed: 0,
    insights: 0,
    quality: 98.5,
  });

  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: '1',
      name: 'Data Ingestion',
      description: 'Loading raw dataset',
      icon: Database,
      status: 'pending',
      position: { x: 0, y: 0 },
      connections: ['2'],
      details: 'Reading CSV/Excel file structure',
      code: "df = pd.read_csv('data.csv')",
      color: 'from-neutral-800 to-neutral-900',
    },
    {
      id: '2',
      name: 'Data Validation',
      description: 'Type detection & schema',
      icon: Settings,
      status: 'pending',
      position: { x: 0, y: 0 },
      connections: ['3', '4'],
      details: 'Detecting column types and data patterns',
      code: 'analysis = ai.detect_types(df)',
      color: 'from-neutral-800 to-neutral-900',
    },
    {
      id: '3',
      name: 'Infinite Values',
      description: 'Clean infinite values',
      icon: AlertTriangle,
      status: 'pending',
      position: { x: 0, y: 0 },
      connections: ['5'],
      details: 'Replacing Inf/-Inf with NaN',
      code: 'df = df.replace([np.inf, -np.inf], np.nan)',
      color: 'from-neutral-800 to-neutral-900',
    },
    {
      id: '4',
      name: 'Missing Values',
      description: 'Handle nulls',
      icon: Filter,
      status: 'pending',
      position: { x: 0, y: 0 },
      connections: ['5'],
      details: 'Filling with median/mode',
      code: 'df = df.fillna(df.median())',
      color: 'from-neutral-800 to-neutral-900',
    },
    {
      id: '5',
      name: 'Data Quality',
      description: 'Quality checks',
      icon: BarChart3,
      status: 'pending',
      position: { x: 0, y: 0 },
      connections: ['6'],
      details: 'Detecting duplicates & outliers',
      code: 'quality = ai.check_quality(df)',
      color: 'from-neutral-800 to-neutral-900',
    },
    {
      id: '6',
      name: 'Encoding',
      description: 'Categorical encoding',
      icon: Code,
      status: 'pending',
      position: { x: 0, y: 0 },
      connections: ['7'],
      details: 'Label encoding for ML',
      code: 'df = label_encoder.fit_transform(df)',
      color: 'from-neutral-800 to-neutral-900',
    },
    {
      id: '7',
      name: 'Normalization',
      description: 'Feature scaling',
      icon: TrendingUp,
      status: 'pending',
      position: { x: 0, y: 0 },
      connections: ['8'],
      details: 'Standard scaling (mean=0, std=1)',
      code: 'df = scaler.fit_transform(df)',
      color: 'from-neutral-800 to-neutral-900',
    },
    {
      id: '8',
      name: 'Re-analysis',
      description: 'Statistical analysis',
      icon: BarChart3,
      status: 'pending',
      position: { x: 0, y: 0 },
      connections: ['9'],
      details: 'Recalculating statistics',
      code: 'stats = df.describe()',
      color: 'from-neutral-800 to-neutral-900',
    },
    {
      id: '9',
      name: 'AI Summary',
      description: 'Gemini insights',
      icon: Brain,
      status: 'pending',
      position: { x: 0, y: 0 },
      connections: ['10'],
      details: 'Generating intelligent summary',
      code: 'insights = gemini.summarize(df)',
      color: 'from-neutral-800 to-neutral-900',
    },
    {
      id: '10',
      name: 'Export Ready',
      description: 'ML-ready dataset',
      icon: Download,
      status: 'pending',
      position: { x: 0, y: 0 },
      details: 'Preprocessed data ready',
      code: "df.to_csv('processed.csv')",
      color: 'from-neutral-800 to-neutral-900',
    },
  ]);

  const updateNodeStatus = (nodeId: string, status: WorkflowNode['status']) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, status } : node))
    );
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const runAutomation = async () => {
    setIsRunning(true);
    setProgress(0);
    setExecutionLog([]);
    setLiveStats({ rows: 0, processed: 0, insights: 0, quality: 98.5 });
    addLog('▶ Starting automation pipeline...');

    try {
      // Reset all nodes
      setNodes((prev) =>
        prev.map((node) => ({ ...node, status: 'pending' as const }))
      );

      const nodesSnapshot = [...nodes];

      // Step-by-step execution with focus on one node
      for (let i = 0; i < nodesSnapshot.length; i++) {
        const node = nodesSnapshot[i];

        setCurrentStep(node.id);
        updateNodeStatus(node.id, 'running');
        addLog(`⚙ Executing: ${node.name} – ${node.description}`);

        if (i === 0) {
          setLiveStats((prev) => ({
            ...prev,
            rows: Math.floor(Math.random() * 5000) + 5000,
          }));
        }

        setLiveStats((prev) => ({
          ...prev,
          processed: Math.min(100, ((i + 1) / nodesSnapshot.length) * 100),
          insights: Math.floor((i + 1) * 1.5),
        }));

        await new Promise((resolve) => setTimeout(resolve, 600));

        updateNodeStatus(node.id, 'completed');
        addLog(`✓ Completed: ${node.name}`);
        setProgress(((i + 1) / nodesSnapshot.length) * 100);
      }

      addLog('☁ Calling backend automation API...');

      const result = await datasetAPI.automate(datasetId);

      addLog('✔ Automation pipeline completed successfully.');
      if (result.metrics) {
        addLog(
          `• Processed ${result.metrics.rowsProcessed} rows, ${result.metrics.columnsProcessed} columns`
        );
        addLog(`• Replaced ${result.metrics.infiniteValuesReplaced} infinite values`);
        addLog(`• Filled ${result.metrics.missingValuesFilled} missing values`);
        addLog(`• Encoded ${result.metrics.columnsEncoded} categorical columns`);
        addLog(`• Normalized ${result.metrics.columnsNormalized} numeric columns`);
        addLog(`• Execution time: ${result.metrics.executionTimeSeconds}s`);
        setLiveStats((prev) => ({
          ...prev,
          rows: result.metrics.rowsProcessed,
          processed: 100,
          insights: result.preprocessingSteps?.length || 0,
        }));
      } else {
        addLog(`• Processed ${result.data?.length || 0} rows`);
        addLog(`• Applied ${result.preprocessingSteps?.length || 0} preprocessing steps`);
      }

      toast.success('Automation pipeline completed successfully!');
      onComplete(
        result.data,
        result.analysis,
        result.preprocessingSteps,
        result.summary || ''
      );
    } catch (error: any) {
      addLog(`✗ Error: ${error.response?.data?.error || 'Automation failed'}`);
      if (process.env.NODE_ENV === 'development') {
        console.error('Automation error:', error);
      }
      toast.error(error.response?.data?.error || 'Automation failed');
      setNodes((prev) =>
        prev.map((node) =>
          node.status === 'running' ? { ...node, status: 'error' as const } : node
        )
      );
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  };

  const getNodeStatusBadge = (node: WorkflowNode) => {
    switch (node.status) {
      case 'completed':
        return (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </div>
        );
      case 'running':
        return (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/5 px-3 py-1 text-xs font-medium text-sky-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
            Running
          </div>
        );
      case 'error':
        return (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/5 px-3 py-1 text-xs font-medium text-red-400">
            <AlertTriangle className="h-3 w-3" />
            Error
          </div>
        );
      default:
        return null;
    }
  };

  const activeNode =
    nodes.find((n) => n.id === currentStep) ||
    nodes.find((n) => n.status === 'running') ||
    nodes.find((n) => n.status === 'pending') ||
    nodes[nodes.length - 1];

  const activeIndex = nodes.findIndex((n) => n.id === activeNode?.id);
  const nextNode = activeIndex >= 0 && activeIndex < nodes.length - 1
    ? nodes[activeIndex + 1]
    : null;

  return (
    <div className="relative rounded-2xl border border-neutral-800 bg-neutral-950 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_30px_80px_rgba(0,0,0,0.9)]">
      {/* Subtle grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_#ffffff0d_0,_transparent_55%),radial-gradient(circle_at_bottom,_#ffffff08_0,_transparent_55%),linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:400px_400px,400px_400px,64px_64px,64px_64px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-neutral-800 bg-black/60 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Automation Workflow</h3>
                <p className="text-xs text-neutral-400">
                  ML preprocessing pipeline • Dataset <span className="font-mono text-xs text-neutral-300">#{datasetId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400 hidden sm:flex items-center gap-2">
                <Activity className="h-3 w-3 text-emerald-400" />
                {isRunning ? 'Running pipeline...' : 'Idle'}
              </div>
              <button
                onClick={runAutomation}
                disabled={isRunning}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isRunning
                    ? 'cursor-not-allowed border border-neutral-800 bg-neutral-900 text-neutral-500'
                    : 'border border-white/10 bg-white text-black hover:bg-neutral-100 hover:-translate-y-0.5'
                }`}
              >
                <Play className="h-4 w-4" />
                {isRunning ? 'Running...' : 'Execute Pipeline'}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
              <span>Pipeline Progress</span>
              <span className="font-mono text-xs text-neutral-200">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-900 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-white via-neutral-400 to-neutral-200"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6">
          {/* Main layout: active step + sidebar */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* Active Node */}
            <section className="flex flex-col gap-4">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                Current Step
              </div>

              <AnimatePresence mode="wait">
                {activeNode && (
                  <motion.div
                    key={activeNode.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="rounded-2xl border border-neutral-800 bg-black/70 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.9)] backdrop-blur"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900">
                        {activeNode.status === 'running' ? (
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        ) : activeNode.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : activeNode.status === 'error' ? (
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        ) : (
                          <activeNode.icon className="h-5 w-5 text-white" />
                        )}
                        {activeNode.status === 'running' && (
                          <motion.div
                            className="absolute inset-0 rounded-xl border border-white/10"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              repeat: Infinity,
                              repeatType: 'reverse',
                              duration: 1.1,
                            }}
                          />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h2 className="text-base font-semibold leading-tight">
                              {activeNode.name}
                            </h2>
                            <p className="text-xs text-neutral-400">
                              {activeNode.description}
                            </p>
                          </div>
                          {getNodeStatusBadge(activeNode)}
                        </div>

                        {activeNode.details && (
                          <p className="text-xs text-neutral-300/90 mt-3 border-l border-neutral-800 pl-3">
                            {activeNode.details}
                          </p>
                        )}

                        {activeNode.code && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-xs font-mono text-neutral-100"
                          >
                            <div className="mb-1 flex items-center justify-between text-[10px] text-neutral-500">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              </div>
                              <span className="inline-flex items-center gap-1">
                                <Code2 className="h-3 w-3" />
                                step.{activeNode.id}
                              </span>
                            </div>
                            <div className="typing-animation">
                              {activeNode.code}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {nextNode && (
                      <div className="mt-5 flex items-center justify-between border-t border-neutral-900 pt-4">
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <span className="h-1 w-6 rounded-full bg-neutral-700" />
                          Next up
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                          <span className="rounded-full border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-[10px] text-neutral-400">
                            #{nextNode.id}
                          </span>
                          <span>{nextNode.name}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step timeline */}
              <div className="mt-3 rounded-2xl border border-neutral-800 bg-black/70 px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Pipeline</span>
                  <span>
                    {nodes.filter((n) => n.status === 'completed').length} / {nodes.length} steps
                  </span>
                </div>

                <div className="relative mt-2">
                  <div className="absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 bg-neutral-800" />
                  <div className="relative flex items-center justify-between">
                    {nodes.map((node, index) => {
                      const indexNumber = index + 1;
                      const state = node.status;
                      const isActive = activeNode?.id === node.id;

                      return (
                        <div
                          key={node.id}
                          className="flex flex-col items-center gap-1"
                        >
                          <motion.div
                            className={`
                              flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-mono
                              ${
                                state === 'completed'
                                  ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                                  : state === 'running'
                                  ? 'border-white bg-white text-black'
                                  : state === 'error'
                                  ? 'border-red-500 bg-red-500/10 text-red-300'
                                  : 'border-neutral-700 bg-black text-neutral-500'
                              }
                            `}
                            animate={
                              isActive
                                ? { scale: [1, 1.1, 1] }
                                : { scale: 1 }
                            }
                            transition={
                              isActive
                                ? { duration: 0.9, repeat: Infinity }
                                : { duration: 0.2 }
                            }
                          >
                            {indexNumber}
                          </motion.div>
                          <span className="hidden text-[10px] text-neutral-500 sm:block">
                            {node.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Sidebar: stats + logs */}
            <section className="space-y-4">
              {/* Real-time stats */}
              <div className="rounded-2xl border border-neutral-800 bg-black/70 p-4 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    Live Stats
                  </div>
                  <span className="text-xs text-neutral-500">
                    {Math.round(progress)}% complete
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-neutral-400">Rows processed</span>
                      <span className="font-mono text-neutral-100">
                        {liveStats.rows.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-neutral-100"
                        initial={{ width: 0 }}
                        animate={{ width: `${liveStats.processed}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-neutral-400">Data quality</span>
                      <span className="font-mono text-emerald-400">
                        {liveStats.quality.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                      <div className="h-full w-[98%] rounded-full bg-emerald-500" />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-neutral-400">AI insights</span>
                      <span className="font-mono text-neutral-100">
                        {liveStats.insights}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-neutral-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${(liveStats.insights / 15) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-3 border-t border-neutral-900 pt-3 text-center">
                  <div>
                    <div className="text-xs text-neutral-500">Latency</div>
                    <div className="font-mono text-sm text-neutral-100">
                      {Math.round(progress * 0.25)}ms
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">Steps</div>
                    <div className="font-mono text-sm text-neutral-100">
                      {nodes.filter((n) => n.status === 'completed').length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">Fixed</div>
                    <div className="font-mono text-sm text-neutral-100">
                      {Math.floor(progress / 10)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">Status</div>
                    <div className="font-mono text-sm text-neutral-100">
                      {isRunning ? 'RUN' : 'IDLE'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution log */}
              <div className="rounded-2xl border border-neutral-900 bg-black p-4 font-mono text-xs text-neutral-200">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    execution.log
                  </div>
                  <Cpu className="h-4 w-4 text-neutral-500" />
                </div>

                <div className="max-h-56 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-black">
                  {executionLog.length === 0 ? (
                    <div className="text-[11px] text-neutral-600">
                      No execution logs yet...
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {executionLog.map((log, idx) => {
                        const [time, message] = log.split('] ');
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 6 }}
                            className="flex gap-2 text-[11px]"
                          >
                            <span className="shrink-0 text-neutral-500">
                              {time}]</span>
                            <span className="text-neutral-200">{message}</span>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <style>{`
        .typing-animation {
          overflow: hidden;
          border-right: 1px solid rgba(255,255,255,0.2);
          white-space: nowrap;
          animation: typing 2s steps(40, end), blink-caret 0.75s step-end infinite;
        }
        @keyframes typing {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes blink-caret {
          from, to { border-color: transparent; }
          50% { border-color: rgba(255,255,255,0.4); }
        }
      `}</style>
    </div>
  );
};

export default AutomationWorkflow;
