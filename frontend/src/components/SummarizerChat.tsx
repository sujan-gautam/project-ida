import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Brain, CheckCircle2, Loader2, Database, BarChart3, TrendingUp, AlertTriangle, Activity, FileText, FileDown, ChevronDown, Lightbulb, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { datasetAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ThreadMessage } from '../types';
import { exportToPDF, exportToDOCX } from '../utils/exportUtils';

type ChatMode = 'beginner' | 'intermediate' | 'advanced';

interface SummarizerChatProps {
  datasetId: string;
  analysis: any;
  onAutoSummarize?: () => void;
  isFullscreen?: boolean;
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
  isFullscreen = false,
}) => {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [mode, setMode] = useState<ChatMode>('intermediate');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const workflowSteps = [
    { id: '1', name: 'Analyzing Dataset', icon: Database, status: 'pending' as const },
    { id: '2', name: 'Processing Statistics', icon: BarChart3, status: 'pending' as const },
    { id: '3', name: 'Generating Insights', icon: TrendingUp, status: 'pending' as const },
    { id: '4', name: 'AI Summarization', icon: Brain, status: 'pending' as const },
  ];
  const [workflowStepsState, setWorkflowStepsState] = useState<WorkflowStep[]>(workflowSteps);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userHasScrolledRef = useRef(false);
  const isAutoScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const scrollToBottom = () => {
    isAutoScrollingRef.current = true;
    userHasScrolledRef.current = false;
    setShowScrollToBottom(false);
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => {
        isAutoScrollingRef.current = false;
        // Re-check scroll position after auto-scroll completes
        const container = messagesContainerRef.current;
        if (container) {
          const remainingScroll = container.scrollHeight - container.scrollTop - container.clientHeight;
          setShowScrollToBottom(remainingScroll > 10);
        }
      }, 600);
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

  const loadSuggestions = useCallback(async () => {
    if (!datasetId || !analysis) return;
    setLoadingSuggestions(true);
    try {
      const suggs = await datasetAPI.getSuggestions(datasetId, mode);
      setSuggestions(suggs);
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load suggestions:', error);
      }
      // Fallback suggestions
      setSuggestions([
        'What are the main data quality issues?',
        'Show me key statistical insights',
        'What preprocessing steps do you recommend?',
        'Are there any notable patterns or correlations?',
        'What ML models would work best for this data?'
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [datasetId, mode, analysis]);

  useEffect(() => {
    if (datasetId && analysis) {
      loadThreads();
      loadSuggestions();
    }
  }, [analysis, datasetId, mode, loadThreads, loadSuggestions]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      setShowScrollToBottom(false);
      return;
    }

    // Initialize last scroll position
    lastScrollTopRef.current = container.scrollTop;

    const handleScroll = () => {
      // Skip during auto-scroll
      if (isAutoScrollingRef.current) {
        return;
      }

      if (messages.length === 0) {
        setShowScrollToBottom(false);
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Calculate distance from bottom
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Detect if user scrolled up (current scroll position is less than last)
      const scrolledUp = scrollTop < lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;
      
      // Show button if:
      // 1. User has scrolled up manually (scrolled up), OR
      // 2. Distance from bottom is more than 100px (not at bottom)
      if (scrolledUp || distanceFromBottom > 100) {
        userHasScrolledRef.current = true;
        setShowScrollToBottom(true);
      } else if (distanceFromBottom <= 50) {
        // Hide when very close to bottom
        setShowScrollToBottom(false);
        userHasScrolledRef.current = false;
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    if (messages.length > 0) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollToBottom(distanceFromBottom > 100);
      lastScrollTopRef.current = scrollTop;
    }
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && messages.length > 0) {
      // Only auto-scroll if user hasn't manually scrolled up
      // or if there are very few messages (initial load)
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const isNearBottom = distanceFromBottom < 100;
      
      // Auto-scroll only if:
      // 1. User hasn't manually scrolled up, OR
      // 2. There are very few messages (initial conversation), OR
      // 3. Already near bottom
      if (!userHasScrolledRef.current || messages.length <= 2 || isNearBottom) {
        scrollToBottom();
        // Reset scroll flag when auto-scrolling near bottom
        if (isNearBottom) {
          userHasScrolledRef.current = false;
        }
      } else {
        // User has scrolled up - make sure button is visible
        // Delay to ensure scroll position is stable
        setTimeout(() => {
          if (container && messages.length > 0) {
            const remainingScroll = container.scrollHeight - container.scrollTop - container.clientHeight;
            setShowScrollToBottom(remainingScroll > 50);
          }
        }, 100);
      }
    }
  }, [messages]);

  const runWorkflow = async (apiPromise: Promise<any>) => {
    setShowWorkflow(true);
    setWorkflowStepsState(prev => prev.map(s => ({ ...s, status: 'pending' as const })));

    // Run first 3 steps with animation
    for (let i = 0; i < workflowSteps.length - 1; i++) {
      setWorkflowStepsState(prev => 
        prev.map((s, idx) => 
          idx === i ? { ...s, status: 'running' as const } : 
          idx < i ? { ...s, status: 'completed' as const } : s
        )
      );
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Set the last step (AI Summarization) to running
    setWorkflowStepsState(prev => 
      prev.map((s, idx) => 
        idx < workflowSteps.length - 1 ? { ...s, status: 'completed' as const } :
        idx === workflowSteps.length - 1 ? { ...s, status: 'running' as const } : s
      )
    );

    // Wait for API response before completing the animation
    try {
      const result = await apiPromise;
      // Complete all steps when API response is ready
      setWorkflowStepsState(prev => 
        prev.map(s => ({ ...s, status: 'completed' as const }))
      );
      // Small delay to show completion state
      await new Promise(resolve => setTimeout(resolve, 300));
      // Reload suggestions after response
      loadSuggestions();
      return result;
    } catch (error) {
      // On error, still complete the steps but mark as error
      setWorkflowStepsState(prev => 
        prev.map(s => ({ ...s, status: 'completed' as const }))
      );
      throw error;
    }
  };

  const generateSummary = async (prompt: string, summaryType: string = 'comprehensive') => {
    setInitializing(true);
    setShowSuggestions(false);
    
    try {
      // Start API call immediately
      const apiCall = datasetAPI.summarize(datasetId, prompt, true, mode);
      
      // Run workflow animation that waits for API response and returns the result
      const result = await runWorkflow(apiCall);
      
      // Process the result
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

  const sendMessage = async (message?: string) => {
    const messageToSend = message || input;
    if (!messageToSend.trim() || loading) return;

    const userMessage: ThreadMessage = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!message) setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const result = await datasetAPI.summarize(datasetId, messageToSend, false, mode);
      const sortedThreads = [...result.threads].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedThreads);
      // Reload suggestions after response
      loadSuggestions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send message');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleModeChange = (newMode: ChatMode) => {
    setMode(newMode);
    loadSuggestions();
    toast.success(`Switched to ${newMode} mode`, { duration: 2000 });
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
    <div data-summarizer className={`relative ${isFullscreen ? 'rounded-none border-0' : 'rounded-2xl border border-neutral-800'} bg-neutral-950 text-white ${isFullscreen ? '' : 'shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_30px_80px_rgba(0,0,0,0.9)]'} flex flex-col ${isFullscreen ? 'h-full' : 'h-[700px] md:h-[800px]'} overflow-hidden`}>
      {/* Subtle grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_#ffffff0d_0,_transparent_55%),radial-gradient(circle_at_bottom,_#ffffff08_0,_transparent_55%),linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:400px_400px,400px_400px,64px_64px,64px_64px]" />
      </div>

      <div className={`relative z-10 flex flex-col ${isFullscreen ? 'h-full' : 'h-full'}`}>
        {/* Header - Sticky in fullscreen */}
        <header className={`flex flex-col border-b border-neutral-800 bg-black/60 backdrop-blur ${isFullscreen ? 'sticky top-0 z-20 flex-shrink-0 px-4 py-2' : 'px-6 py-4 gap-4'}`}>
          <div className={`flex flex-wrap items-center justify-between ${isFullscreen ? 'gap-2' : 'gap-4'}`}>
            <div className={`flex items-center ${isFullscreen ? 'gap-2' : 'gap-3'}`}>
              <div className={`flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 ${isFullscreen ? 'h-8 w-8' : 'h-11 w-11'}`}>
                <Brain className={`text-emerald-400 ${isFullscreen ? 'h-4 w-4' : 'h-6 w-6'}`} />
              </div>
              <div>
                <h3 className={`font-semibold tracking-tight ${isFullscreen ? 'text-sm' : 'text-lg'}`}>Data Engineer</h3>
                {!isFullscreen && (
                  <p className="text-xs text-neutral-400">
                    AI-powered analysis assistant • <span className="font-mono text-xs text-neutral-300">#{datasetId?.slice(-8)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Mode Selector */}
              <div className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-1">
                <button
                  onClick={() => handleModeChange('beginner')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    mode === 'beginner'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800'
                  }`}
                  title="Beginner mode - Simple explanations"
                >
                  Beginner
                </button>
                <button
                  onClick={() => handleModeChange('intermediate')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    mode === 'intermediate'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800'
                  }`}
                  title="Intermediate mode - Balanced detail"
                >
                  Intermediate
                </button>
                <button
                  onClick={() => handleModeChange('advanced')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    mode === 'advanced'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800'
                  }`}
                  title="Advanced mode - Expert-level insights"
                >
                  Advanced
                </button>
              </div>

              <div className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400 hidden sm:flex items-center gap-2">
                <Activity className="h-3 w-3 text-emerald-400" />
                {loading || initializing ? 'Processing...' : messages.length > 0 ? `${messages.length} messages` : 'Ready'}
              </div>
              {messages.length === 0 && (
                <button
                  data-auto-summarize
                  onClick={generateInitialSummary}
                  disabled={initializing}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    initializing
                      ? 'cursor-not-allowed border border-neutral-800 bg-neutral-900 text-neutral-500'
                      : 'border border-white/10 bg-white text-black hover:bg-neutral-100'
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
            className={`border-b border-neutral-800 bg-black/40 px-6 py-4 backdrop-blur ${isFullscreen ? 'flex-shrink-0' : ''}`}
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
                    whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', borderColor: 'rgba(55, 65, 81, 0.8)' }}
                    whileTap={{ opacity: 0.8 }}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 shadow-lg`}>
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
            className={`border-b border-neutral-800 bg-black/40 px-6 py-4 backdrop-blur ${isFullscreen ? 'flex-shrink-0' : ''}`}
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs uppercase tracking-[0.18em] text-neutral-500">Generating Summary</h4>
                <span className="text-xs font-mono text-neutral-300">
                  {workflowStepsState.filter(s => s.status === 'completed').length} / {workflowStepsState.length}
                </span>
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                {workflowStepsState.map((step, index) => {
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
                      {index < workflowStepsState.length - 1 && (
                        <div className="flex-1 h-0.5 bg-neutral-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500"
                            initial={{ width: 0 }}
                            animate={{ 
                              width: step.status === 'completed' ? '100%' : 
                                     workflowStepsState[index + 1].status === 'running' ? '50%' : '0%'
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
        <div 
          ref={messagesContainerRef}
          className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent relative ${isFullscreen ? 'p-4 space-y-3' : 'p-6 space-y-4'}`}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-24 h-24 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6"
              >
                <Bot className="w-12 h-12 text-emerald-400" />
              </motion.div>
              <motion.h3 
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
                className="text-lg font-semibold mb-2 text-white"
              >
                No conversation yet
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
                className="text-sm text-center max-w-md text-neutral-500"
              >
                Click "Auto Summarize" to get AI-powered insights about your dataset, or ask questions about the analysis.
              </motion.p>
            </div>
          ) : (
          <>
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={`${message.timestamp}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex gap-3 md:gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className={`flex-shrink-0 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center ${isFullscreen ? 'w-8 h-8' : 'w-10 h-10'}`}>
                    <Bot className={`text-emerald-400 ${isFullscreen ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-xl shadow-sm ${
                    isFullscreen ? 'p-3' : 'p-4'
                  } ${
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
                            whileHover={{ opacity: 0.8 }}
                            whileTap={{ opacity: 0.6 }}
                            onClick={() => handleDownloadPDF(message.content, index)}
                            className="p-1.5 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-emerald-500/50 transition-all duration-200 group"
                            title="Download as PDF"
                          >
                            <FileText className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-400 transition-colors duration-200" />
                          </motion.button>
                          <motion.button
                            whileHover={{ opacity: 0.8 }}
                            whileTap={{ opacity: 0.6 }}
                            onClick={() => handleDownloadDOCX(message.content, index)}
                            className="p-1.5 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-cyan-500/50 transition-all duration-200 group"
                            title="Download as DOCX"
                          >
                            <FileDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-cyan-400 transition-colors duration-200" />
                          </motion.button>
                        </div>
                      </div>
                      <div className={`prose max-w-none dark
                        prose-headings:text-white prose-headings:font-semibold
                        ${isFullscreen 
                          ? 'prose-sm prose-h1:text-lg prose-h1:border-b prose-h1:border-neutral-700 prose-h1:pb-1 prose-h1:mb-2 prose-h2:text-base prose-h2:text-emerald-400 prose-h2:mt-3 prose-h2:mb-2 prose-h3:text-sm prose-h3:mt-2 prose-h3:mb-1 prose-h3:text-neutral-200 prose-p:leading-snug prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:p-2 prose-blockquote:pl-3 prose-blockquote:my-2 prose-hr:my-3 prose-table:my-2 prose-th:p-1.5 prose-td:p-1.5'
                          : 'prose-sm md:prose-base prose-h1:text-xl md:prose-h1:text-2xl prose-h1:border-b prose-h1:border-neutral-700 prose-h1:pb-2 prose-h1:mb-4 prose-h2:text-lg md:prose-h2:text-xl prose-h2:text-emerald-400 prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-base md:prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-neutral-200 prose-p:leading-relaxed prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-pre:p-4 prose-blockquote:pl-4 prose-blockquote:my-4 prose-hr:my-6 prose-table:my-4 prose-th:p-2 prose-td:p-2'
                        }
                        prose-p:text-neutral-300
                        prose-strong:text-white prose-strong:font-semibold
                        prose-code:text-emerald-300 prose-code:bg-emerald-500/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:border prose-code:border-emerald-500/30
                        prose-pre:bg-neutral-950 prose-pre:text-neutral-100 prose-pre:border prose-pre:border-neutral-800 prose-pre:rounded-lg prose-pre:overflow-x-auto
                        prose-ul:text-neutral-300 prose-ul:space-y-1
                        prose-ol:text-neutral-300 prose-ol:space-y-1
                        prose-li:text-neutral-300 prose-li:my-1
                        prose-a:text-cyan-400 prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-cyan-300
                        prose-blockquote:text-neutral-400 prose-blockquote:border-l-emerald-500 prose-blockquote:italic
                        prose-hr:border-neutral-700
                        prose-table:w-full
                        prose-th:bg-neutral-900 prose-th:font-semibold prose-th:border prose-th:border-neutral-800 prose-th:text-neutral-200
                        prose-td:border prose-td:border-neutral-800 prose-td:text-neutral-300`}>
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
                  <div className={`flex-shrink-0 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center ${isFullscreen ? 'w-8 h-8' : 'w-10 h-10'}`}>
                    <User className={`text-neutral-400 ${isFullscreen ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          </>
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
          
          {/* Scroll to Bottom Button - Standard Position (Bottom Right) */}
          {showScrollToBottom && messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={scrollToBottom}
              whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`absolute ${isFullscreen ? 'bottom-4 right-4' : 'bottom-6 right-6'} z-30 rounded-full bg-white border border-neutral-300 shadow-lg hover:shadow-xl transition-shadow backdrop-blur-sm ${isFullscreen ? 'p-2.5' : 'p-3'}`}
              title="Scroll to bottom"
            >
              <ChevronDown className={`text-neutral-900 ${isFullscreen ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </motion.button>
          )}
        </div>

        {/* Input - Sticky in fullscreen, positioned at absolute bottom */}
        <div 
          className={`border-t border-neutral-800 bg-black/60 backdrop-blur ${isFullscreen ? 'sticky bottom-0 z-20 flex-shrink-0' : ''} ${isFullscreen ? 'px-4 py-2' : 'px-6 py-4'}`}
          style={isFullscreen ? { position: 'sticky', bottom: 0, marginTop: 'auto' } : {}}
        >
          {/* Suggestions Panel - Above Input, Inside Container */}
          <AnimatePresence mode="wait">
            {showSuggestions && suggestions.length > 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="mb-3 rounded-lg border border-neutral-700/30 bg-neutral-900/40 backdrop-blur-sm p-2.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 rounded bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                      <Lightbulb className="w-3 h-3 text-amber-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">Suggestions</span>
                    <span className="px-1 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-medium border border-emerald-500/30">
                      {suggestions.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSuggestions(false)}
                    className="p-0.5 rounded hover:bg-neutral-800/50 text-neutral-500 hover:text-neutral-300 transition-colors duration-200"
                    title="Hide suggestions"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                  {suggestions.slice(0, 6).map((suggestion, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02, duration: 0.15, ease: "easeOut" }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={loading}
                      whileHover={{ 
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        borderColor: 'rgba(16, 185, 129, 0.5)',
                      }}
                      whileTap={{ opacity: 0.7 }}
                      className="group relative flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-700/30 bg-neutral-800/10 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] text-neutral-300 hover:text-emerald-300 hover:bg-neutral-800/20 transition-colors duration-200 max-w-full"
                    >
                      <ChevronRight className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      <span className="text-left font-medium truncate">{suggestion}</span>
                    </motion.button>
                  ))}
                </div>
                {loadingSuggestions && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-neutral-500">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                    <span>Updating...</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`flex items-center ${isFullscreen ? 'gap-2' : 'gap-3'}`}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your data analysis..."
              className={`flex-1 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:bg-neutral-950 disabled:text-neutral-600 transition-all ${isFullscreen ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}
              disabled={loading || initializing}
            />
            
            {/* Suggestions Button - Integrated with Input */}
            {!showSuggestions && suggestions.length > 0 && !loading && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => setShowSuggestions(true)}
                whileHover={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
                whileTap={{ scale: 0.95 }}
                className={`relative rounded-xl border border-neutral-700/50 bg-neutral-800/50 hover:bg-neutral-800/70 transition-all duration-200 flex items-center justify-center ${isFullscreen ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}
                title={`Show ${suggestions.length} suggestions`}
              >
                <Lightbulb className={`text-amber-400 ${isFullscreen ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                {suggestions.length > 0 && (
                  <span className={`absolute -top-1 -right-1 rounded-full bg-emerald-500 text-white font-bold border border-emerald-600 ${isFullscreen ? 'text-[8px] px-1 min-w-[14px] h-[14px]' : 'text-[9px] px-1 min-w-[16px] h-[16px]'} flex items-center justify-center`}>
                    {suggestions.length > 9 ? '9+' : suggestions.length}
                  </span>
                )}
              </motion.button>
            )}

            <motion.button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || initializing}
              whileHover={!loading && input.trim() && !initializing ? { backgroundColor: 'rgba(245, 245, 245, 1)' } : {}}
              whileTap={!loading && input.trim() && !initializing ? { opacity: 0.9 } : {}}
              className={`border border-white/10 bg-white text-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium ${isFullscreen ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm'}`}
            >
              <Send className={isFullscreen ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
              <span className="hidden sm:inline">Send</span>
            </motion.button>
          </div>
          {!isFullscreen && (
            <p className="text-xs text-neutral-500 mt-2 text-center font-mono">
              Press Enter to send, Shift+Enter for new line
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummarizerChat;
