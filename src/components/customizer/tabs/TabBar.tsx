/**
 * Tab Bar Component
 * 
 * Horizontal tab bar with tab management.
 * 
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import React from 'react';
import { UnitTab as UnitTabComponent } from './UnitTab';

/**
 * Minimal tab info needed for display in tab bar
 */
export interface TabDisplayInfo {
  readonly id: string;
  readonly name: string;
  readonly isModified?: boolean;
}

interface TabBarProps {
  /** Array of tabs */
  tabs: readonly TabDisplayInfo[];
  /** Currently active tab ID */
  activeTabId: string | null;
  /** Called when a tab is selected */
  onSelectTab: (tabId: string) => void;
  /** Called when a tab is closed */
  onCloseTab: (tabId: string) => void;
  /** Called when a tab is renamed */
  onRenameTab: (tabId: string, name: string) => void;
  /** Called when new unit button is clicked */
  onNewTab: () => void;
  /** Called when load unit button is clicked */
  onLoadUnit: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Horizontal tab bar component
 */
export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onRenameTab,
  onNewTab,
  onLoadUnit,
  className = '',
}: TabBarProps): React.ReactElement {
  return (
    <div className={`flex items-center bg-slate-800 border-b border-slate-700 ${className}`}>
      {/* Tab list */}
      <div className="flex-1 flex items-center overflow-x-auto">
        {tabs.map((tab) => (
          <UnitTabComponent
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            canClose={true}
            onSelect={() => onSelectTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
            onRename={(name) => onRenameTab(tab.id, name)}
          />
        ))}
      </div>
      
      {/* Toolbar icons - MegaMekLab style */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2 border-l border-slate-700">
        {/* New Unit - Document icon */}
        <button
          onClick={onNewTab}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          title="Create New Unit (Ctrl+N)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        
        {/* Load Unit - Folder icon */}
        <button
          onClick={onLoadUnit}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          title="Load Unit from Library (Ctrl+O)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

