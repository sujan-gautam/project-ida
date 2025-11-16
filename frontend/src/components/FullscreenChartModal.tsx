import React, { useEffect, useRef, useMemo } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface FullscreenChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const FullscreenChartModal: React.FC<FullscreenChartModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRequestedRef = useRef(false);
  const isClosingRef = useRef(false);
  const reenterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTabSwitchingRef = useRef(false);
  const tabSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maintainIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Memoize children to prevent unnecessary re-renders that might cause fullscreen to exit
  const memoizedChildren = useMemo(() => children, [children]);

  // Helper function to get fullscreen element
  const getFullscreenElement = () => {
    return document.fullscreenElement || 
           (document as any).webkitFullscreenElement || 
           (document as any).mozFullScreenElement || 
           (document as any).msFullscreenElement;
  };

  // Helper function to request fullscreen
  const requestFullscreen = async (element: HTMLElement) => {
    const el = element as any;
    if (el.requestFullscreen) {
      return await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      return await el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      return await el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      return await el.msRequestFullscreen();
    }
    throw new Error('Fullscreen not supported');
  };

  // Handle native fullscreen with aggressive persistence
  useEffect(() => {
    if (!isOpen) {
      // Set closing flag first to prevent re-entry
      isClosingRef.current = true;
      document.body.style.overflow = 'unset';
      fullscreenRequestedRef.current = false;
      
      // Clear all intervals and timeouts
      if (reenterTimeoutRef.current) {
        clearTimeout(reenterTimeoutRef.current);
        reenterTimeoutRef.current = null;
      }
      if (tabSwitchTimeoutRef.current) {
        clearTimeout(tabSwitchTimeoutRef.current);
        tabSwitchTimeoutRef.current = null;
      }
      if (maintainIntervalRef.current) {
        clearInterval(maintainIntervalRef.current);
        maintainIntervalRef.current = null;
      }
      
      // Exit native fullscreen if active
      if (getFullscreenElement()) {
        document.exitFullscreen().catch(() => {});
      }
      
      // Reset closing flag after a brief delay to allow cleanup
      setTimeout(() => {
        isClosingRef.current = false;
      }, 100);
      
      return;
    }

    // Enter fullscreen
    document.body.style.overflow = 'hidden';
    
    const enterFullscreen = async () => {
      if (!containerRef.current) return;
      
      // Check if already in fullscreen
      const currentFullscreen = getFullscreenElement();
      if (currentFullscreen === containerRef.current) {
        fullscreenRequestedRef.current = true;
        return;
      }
      
      try {
        await requestFullscreen(containerRef.current);
        fullscreenRequestedRef.current = true;
      } catch (err) {
        console.log('Fullscreen not available:', err);
        fullscreenRequestedRef.current = false;
      }
    };

    // Reset closing flag when opening
    isClosingRef.current = false;
    
    // Enter fullscreen immediately when DOM is ready
    const timeoutId = setTimeout(() => {
      if (!fullscreenRequestedRef.current && containerRef.current && !isClosingRef.current) {
        enterFullscreen();
      }
    }, 10);
    
    // Also set up a continuous check to maintain fullscreen - more aggressive
    if (maintainIntervalRef.current) {
      clearInterval(maintainIntervalRef.current);
    }
    maintainIntervalRef.current = setInterval(() => {
      // Don't try to maintain fullscreen if we're closing
      if (isClosingRef.current) {
        if (maintainIntervalRef.current) {
          clearInterval(maintainIntervalRef.current);
          maintainIntervalRef.current = null;
        }
        return;
      }
      
      if (isOpen && containerRef.current && fullscreenRequestedRef.current && !isClosingRef.current) {
        const currentFullscreen = getFullscreenElement();
        if (!currentFullscreen || currentFullscreen !== containerRef.current) {
          // Fullscreen was lost, re-enter immediately without any delay
          requestFullscreen(containerRef.current).catch(() => {});
        }
      }
    }, 50) as any; // Check every 50ms for faster response

    return () => {
      clearTimeout(timeoutId);
      if (maintainIntervalRef.current) {
        clearInterval(maintainIntervalRef.current);
        maintainIntervalRef.current = null;
      }
      if (!isOpen) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isOpen]);

  // Handle ESC key and fullscreen change events
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        isClosingRef.current = true;
        fullscreenRequestedRef.current = false;
        if (maintainIntervalRef.current) {
          clearInterval(maintainIntervalRef.current);
          maintainIntervalRef.current = null;
        }
        if (reenterTimeoutRef.current) {
          clearTimeout(reenterTimeoutRef.current);
          reenterTimeoutRef.current = null;
        }
        if (tabSwitchTimeoutRef.current) {
          clearTimeout(tabSwitchTimeoutRef.current);
          tabSwitchTimeoutRef.current = null;
        }
        onClose();
      }
    };

    const handleFullscreenChange = () => {
      // Only handle if we're not in the process of closing
      if (isClosingRef.current) return;

      const isCurrentlyFullscreen = getFullscreenElement() === containerRef.current;
      
      // If fullscreen was exited but modal is still open, re-enter fullscreen IMMEDIATELY
      // This handles cases where tab switching or other events cause fullscreen to exit
      if (isOpen && !isCurrentlyFullscreen && containerRef.current && fullscreenRequestedRef.current) {
        // Clear any existing timeouts
        if (reenterTimeoutRef.current) {
          clearTimeout(reenterTimeoutRef.current);
        }
        if (tabSwitchTimeoutRef.current) {
          clearTimeout(tabSwitchTimeoutRef.current);
        }
        
        // Re-enter fullscreen IMMEDIATELY - synchronous if possible
        // Don't wait for any async operations, just try immediately
        if (containerRef.current) {
          const currentFullscreen = getFullscreenElement();
          if (!currentFullscreen || currentFullscreen !== containerRef.current) {
            // Try immediate re-entry - no delays, no promises, just do it
            requestFullscreen(containerRef.current).catch(() => {
              // If that fails, try on next frame
              requestAnimationFrame(() => {
                if (containerRef.current && isOpen) {
                  requestFullscreen(containerRef.current).catch(() => {});
                }
              });
            });
          }
        }
      } else if (isCurrentlyFullscreen) {
        // We're back in fullscreen, clear any pending timeouts
        isTabSwitchingRef.current = false;
        if (reenterTimeoutRef.current) {
          clearTimeout(reenterTimeoutRef.current);
          reenterTimeoutRef.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (reenterTimeoutRef.current) {
        clearTimeout(reenterTimeoutRef.current);
      }
      if (tabSwitchTimeoutRef.current) {
        clearTimeout(tabSwitchTimeoutRef.current);
      }
    };
  }, [isOpen, onClose]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden"
          style={{ 
            margin: 0, 
            padding: 0,
            width: '100vw',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            willChange: 'auto',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            WebkitBackfaceVisibility: 'hidden',
            WebkitTransform: 'translateZ(0)'
          }}
        >
          {/* Compact Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Maximize2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
            </div>
            <button
              onClick={() => {
                isClosingRef.current = true;
                fullscreenRequestedRef.current = false;
                if (maintainIntervalRef.current) {
                  clearInterval(maintainIntervalRef.current);
                  maintainIntervalRef.current = null;
                }
                if (reenterTimeoutRef.current) {
                  clearTimeout(reenterTimeoutRef.current);
                  reenterTimeoutRef.current = null;
                }
                if (tabSwitchTimeoutRef.current) {
                  clearTimeout(tabSwitchTimeoutRef.current);
                  tabSwitchTimeoutRef.current = null;
                }
                onClose();
              }}
              className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-red-500/50 transition-all group"
              aria-label="Close fullscreen"
            >
              <X className="w-4 h-4 text-slate-300 group-hover:text-red-400 transition-colors" />
            </button>
          </div>

          {/* Content - Takes full remaining height with minimal padding */}
          <div className="flex-1 overflow-auto p-2 md:p-4 bg-slate-900/30 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="h-full w-full">
              {memoizedChildren}
            </div>
          </div>

          {/* Compact Footer Hint - Only show on hover or make it smaller */}
          <div className="px-3 py-1.5 border-t border-slate-700/50 bg-slate-900/90 backdrop-blur-sm flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <p className="text-xs text-center text-slate-400">
              Press <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded border border-slate-600/50 font-mono text-xs">ESC</kbd> to exit
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default FullscreenChartModal;

