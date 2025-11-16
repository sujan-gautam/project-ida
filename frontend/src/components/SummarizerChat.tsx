import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Brain, CheckCircle2, Loader2, Database, BarChart3, TrendingUp, AlertTriangle, Activity, Download, FileText, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { datasetAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ThreadMessage } from '../types';
import { exportToPDF, exportToDOCX } from '../utils/exportUtils';

interface SummarizerChatProps {
  datasetId: string;
  analysis: any;
  onAutoSummarize?: () => void;
}

interface WorkflowStep {
  id: string;
  name: string;
  icon: React.ElementType;
  status: 'pending' | 'running' | 'completed';
}

const SummarizerChat: React.FC<SummarizerChatProps> = ({
  datasetId,
  analysis,
  onAutoSummarize,
}) => {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { id: '1', name: 'Analyzing Dataset', icon: Database, status: 'pending' },
    { id: '2', name: 'Processing Statistics', icon: BarChart3, status: 'pending' },
    { id: '3', name: 'Generating Insights', icon: TrendingUp, status: 'pending' },
    { id: '4', name: 'AI Summarization', icon: Brain, status: 'pending' },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const loadThreads = useCallback(async () => {
    if (!datasetId) return;
    
    try {
      const threads = await datasetAPI.getThreads(datasetId);
      const sortedThreads = [...threads].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedThreads);
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load threads:', error);
      }
    }
  }, [datasetId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (datasetId && analysis) {
      loadThreads();
    }
  }, [analysis, datasetId, loadThreads]);

  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom || messages.length <= 2) {
        scrollToBottom();
      }
    }
  }, [messages]);

  const runWorkflow = async () => {
    setShowWorkflow(true);
    setWorkflowSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })));

    for (let i = 0; i < workflowSteps.length; i++) {
      setWorkflowSteps(prev => 
        prev.map((s, idx) => 
          idx === i ? { ...s, status: 'running' as const } : 
          idx < i ? { ...s, status: 'completed' as const } : s
        )
      );
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Final step - generate summary
    setWorkflowSteps(prev => 
      prev.map(s => ({ ...s, status: 'completed' as const }))
    );
  };

  const generateSummary = async (prompt: string, summaryType: string = 'comprehensive') => {
    setInitializing(true);
    await runWorkflow();
    
    try {
      const result = await datasetAPI.summarize(datasetId, prompt, true);
      const sortedThreads = [...result.threads].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedThreads);
      setShowWorkflow(false);
      toast.success(`${summaryType} summary generated successfully!`);
      if (onAutoSummarize) {
        onAutoSummarize();
      }
    } catch (error: any) {
      setShowWorkflow(false);
      toast.error(error.response?.data?.error || 'Failed to generate summary');
    } finally {
      setInitializing(false);
    }
  };

  const generateInitialSummary = async () => {
    // Use empty prompt to trigger default comprehensive summary
    await generateSummary(
      '', // Empty prompt triggers default comprehensive summary in backend
      'Comprehensive'
    );
  };

  const quickActions = [
    {
      label: 'Quick Summary',
      prompt: 'Generate a brief, concise summary highlighting the most important insights from this dataset in 3-4 bullet points.',
      icon: Sparkles,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Data Quality',
      prompt: 'Focus on data quality analysis: missing values, duplicates, infinite values, completeness, and data quality score with recommendations.',
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Statistical Insights',
      prompt: 'Provide detailed statistical insights: distributions, correlations, outliers, and key patterns in the data.',
      icon: BarChart3,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'ML Recommendations',
      prompt: 'Generate recommendations for machine learning: feature engineering suggestions, preprocessing steps, and model preparation advice.',
      icon: Brain,
      color: 'from-cyan-500 to-blue-500',
    },
  ];

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ThreadMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await datasetAPI.summarize(datasetId, input, false);
      const sortedThreads = [...result.threads].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedThreads);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send message');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDownloadPDF = async (content: string, index: number) => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `data-scientist-analysis-${timestamp}-${index + 1}.pdf`;
      await exportToPDF(content, filename);
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      toast.error('Failed to download PDF');
      console.error(error);
    }
  };

  const handleDownloadDOCX = async (content: string, index: number) => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `data-scientist-analysis-${timestamp}-${index + 1}.docx`;
      await exportToDOCX(content, filename);
      toast.success('DOCX downloaded successfully!');
    } catch (error: any) {
      toast.error('Failed to download DOCX');
      console.error(error);
    }
  };

  return (
    <div data-summarizer className="relative rounded-2xl border border-neutral-800 bg-neutral-950 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_30px_80px_rgba(0,0,0,0.9)] flex flex-col h-[700px] md:h-[800px] overflow-hidden">
      {/* Subtle grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_#ffffff0d_0,_transparent_55%),radial-gradient(circle_at_bottom,_#ffffff08_0,_transparent_55%),linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:400px_400px,400px_400px,64px_64px,64px_64px]" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-neutral-800 bg-black/60 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900">
                <Brain className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Data Engineer</h3>
                <p className="text-xs text-neutral-400">
                  AI-powered analysis assistant • <span className="font-mono text-xs text-neutral-300">#{datasetId?.slice(-8)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400 hidden sm:flex items-center gap-2">
                <Activity className="h-3 w-3 text-emerald-400" />
                {loading || initializing ? 'Processing...' : messages.length > 0 ? `${messages.length} messages` : 'Ready'}
              </div>
              {messages.length === 0 && (
                <button
                  data-auto-summarize
                  onClick={generateInitialSummary}
                  disabled={initializing}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    initializing
                      ? 'cursor-not-allowed border border-neutral-800 bg-neutral-900 text-neutral-500'
                      : 'border border-white/10 bg-white text-black hover:bg-neutral-100 hover:-translate-y-0.5'
                  }`}
                >
                  {initializing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Auto Summarize
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Quick Action Buttons */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-neutral-800 bg-black/40 px-6 py-4 backdrop-blur"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => generateSummary(action.prompt, action.label)}
                    disabled={initializing}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 hover:bg-neutral-900 hover:border-neutral-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-neutral-300 text-left">{action.label}</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Workflow Visualization */}
        {showWorkflow && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-neutral-800 bg-black/40 px-6 py-4 backdrop-blur"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs uppercase tracking-[0.18em] text-neutral-500">Generating Summary</h4>
                <span className="text-xs font-mono text-neutral-300">
                  {workflowSteps.filter(s => s.status === 'completed').length} / {workflowSteps.length}
                </span>
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <motion.div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border ${
                            step.status === 'completed'
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg'
                              : step.status === 'running'
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-lg scale-110'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                          }`}
                          animate={step.status === 'running' ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 0.6, repeat: step.status === 'running' ? Infinity : 0 }}
                        >
                          {step.status === 'completed' ? (
                            <CheckCircle2 className="w-6 h-6" />
                          ) : step.status === 'running' ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <Icon className="w-6 h-6" />
                          )}
                        </motion.div>
                        <span className="text-xs text-center text-neutral-400 font-medium hidden sm:block">
                          {step.name}
                        </span>
                      </div>
                      {index < workflowSteps.length - 1 && (
                        <div className="flex-1 h-0.5 bg-neutral-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500"
                            initial={{ width: 0 }}
                            animate={{ 
                              width: step.status === 'completed' ? '100%' : 
                                     workflowSteps[index + 1].status === 'running' ? '50%' : '0%'
                            }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6"
              >
                <Bot className="w-12 h-12 text-emerald-400" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2 text-white">No conversation yet</h3>
              <p className="text-sm text-center max-w-md text-neutral-500">
                Click "Auto Summarize" to get AI-powered insights about your dataset, or ask questions about the analysis.
              </p>
            </div>
          ) : (
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={`${message.timestamp}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-3 md:gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-xl p-4 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-white text-black border border-neutral-800'
                      : 'bg-neutral-900/70 border border-neutral-800 text-neutral-100 backdrop-blur'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400 font-mono">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDownloadPDF(message.content, index)}
                            className="p-1.5 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-emerald-500/50 transition-all group"
                            title="Download as PDF"
                          >
                            <FileText className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-400 transition-colors" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDownloadDOCX(message.content, index)}
                            className="p-1.5 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-cyan-500/50 transition-all group"
                            title="Download as DOCX"
                          >
                            <FileDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-cyan-400 transition-colors" />
                          </motion.button>
                        </div>
                      </div>
                      <div className="prose prose-sm md:prose-base max-w-none dark
                        prose-headings:text-white prose-headings:font-semibold
                        prose-h1:text-xl md:prose-h1:text-2xl prose-h1:border-b prose-h1:border-neutral-700 prose-h1:pb-2 prose-h1:mb-4
                        prose-h2:text-lg md:prose-h2:text-xl prose-h2:text-emerald-400 prose-h2:mt-6 prose-h2:mb-3
                        prose-h3:text-base md:prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-neutral-200
                        prose-p:text-neutral-300 prose-p:leading-relaxed prose-p:my-3
                        prose-strong:text-white prose-strong:font-semibold
                        prose-code:text-emerald-300 prose-code:bg-emerald-500/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:border prose-code:border-emerald-500/30
                        prose-pre:bg-neutral-950 prose-pre:text-neutral-100 prose-pre:border prose-pre:border-neutral-800 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
                        prose-ul:text-neutral-300 prose-ul:my-3 prose-ul:space-y-1
                        prose-ol:text-neutral-300 prose-ol:my-3 prose-ol:space-y-1
                        prose-li:text-neutral-300 prose-li:my-1
                        prose-a:text-cyan-400 prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-cyan-300
                        prose-blockquote:text-neutral-400 prose-blockquote:border-l-emerald-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-4
                        prose-hr:border-neutral-700 prose-hr:my-6
                        prose-table:w-full prose-table:my-4
                        prose-th:bg-neutral-900 prose-th:font-semibold prose-th:p-2 prose-th:border prose-th:border-neutral-800 prose-th:text-neutral-200
                        prose-td:p-2 prose-td:border prose-td:border-neutral-800 prose-td:text-neutral-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap text-sm md:text-base">{message.content}</div>
                      <div className="text-xs mt-3 font-mono text-neutral-600">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-neutral-400" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
          {loading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-neutral-800 bg-black/60 px-6 py-4 backdrop-blur">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your data analysis..."
              className="flex-1 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm disabled:bg-neutral-950 disabled:text-neutral-600 transition-all"
              disabled={loading || initializing}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || initializing}
              className="px-6 py-3 border border-white/10 bg-white text-black rounded-xl hover:bg-neutral-100 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-2 text-center font-mono">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummarizerChat;
