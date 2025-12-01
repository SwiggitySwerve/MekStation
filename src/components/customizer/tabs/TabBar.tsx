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
  /** Called when add button is clicked */
  onNewTab: () => void;
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
  className = '',
}: TabBarProps) {
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
      
      {/* Add button */}
      <button
        onClick={onNewTab}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors mx-1"
        title="New Unit"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

