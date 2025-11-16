import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Try to enter native fullscreen, but don't force it
      // This allows tab switching without breaking fullscreen
      if (containerRef.current && containerRef.current.requestFullscreen && !fullscreenRequestedRef.current) {
        fullscreenRequestedRef.current = true;
        containerRef.current.requestFullscreen().catch((err) => {
          console.log('Fullscreen not supported or failed:', err);
          fullscreenRequestedRef.current = false;
        });
      }
    } else {
      document.body.style.overflow = 'unset';
      fullscreenRequestedRef.current = false;
      // Exit native fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.log('Exit fullscreen failed:', err);
        });
      }
    }
    return () => {
      if (!isOpen) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    // Track fullscreen state but don't auto-close on changes
    // This prevents closing when tabs switch or React re-renders
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        // We're in fullscreen, ensure flag is set
        fullscreenRequestedRef.current = true;
      }
      // Don't auto-close on fullscreen exit - let user close via button or ESC
      // This prevents the bug where tab switching closes fullscreen
    };
    window.addEventListener('keydown', handleEscape);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
          className="fixed inset-0 z-[9999] flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden"
          style={{ margin: 0, padding: 0 }}
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
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-red-500/50 transition-all group"
              aria-label="Close fullscreen"
            >
              <X className="w-4 h-4 text-slate-300 group-hover:text-red-400 transition-colors" />
            </button>
          </div>

          {/* Content - Takes full remaining height with minimal padding */}
          <div className="flex-1 overflow-auto p-2 md:p-4 bg-slate-900/30 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="h-full w-full">
              {children}
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

