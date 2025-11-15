import React from 'react';
import { motion } from 'framer-motion';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: string[];
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="flex overflow-x-auto bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-6 py-3 font-medium transition-all duration-200 whitespace-nowrap relative text-sm ${
            activeTab === tab
              ? 'text-white'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          {activeTab === tab && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-lg border-b-2 border-emerald-400"
              initial={false}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">
            {tab === 'data-quality' ? 'Data Quality' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Tabs;

