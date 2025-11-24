'use client';

import React from 'react';
import { CustomizerTabId, useCustomizerStore } from '../store/useCustomizerStore';

interface TabNavigationProps {
  tabs: Array<{ id: CustomizerTabId; label: string }>;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ tabs }) => {
  const activeTab = useCustomizerStore(state => state.activeTab);
  const setActiveTab = useCustomizerStore(state => state.setActiveTab);

  return (
    <div className="flex border-b border-slate-800 bg-slate-900/70">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`px-6 py-3 text-sm font-semibold transition-colors ${
            tab.id === activeTab
              ? 'text-slate-100 border-b-2 border-blue-500 bg-slate-800/80'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

