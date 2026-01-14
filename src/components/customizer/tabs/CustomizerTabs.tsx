/**
 * Customizer Tabs Component
 * 
 * Tabbed navigation for unit configuration sections.
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useState } from 'react';
import { useTabKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

/**
 * Customizer tab configuration
 */
export interface CustomizerTabConfig {
  /** Tab identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Icon (optional) */
  icon?: React.ReactNode;
  /** Is tab disabled */
  disabled?: boolean;
}

interface CustomizerTabsProps {
  /** Tab configurations */
  tabs: CustomizerTabConfig[];
  /** Currently active tab ID */
  activeTab: string;
  /** Called when tab changes */
  onTabChange: (tabId: string) => void;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Simple SVG icons for mobile view
const TabIcons: Record<string, React.ReactNode> = {
  overview: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  structure: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  armor: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  equipment: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  criticals: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  fluff: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  preview: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
};

/**
 * Default customizer tabs
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 * Note: Weapons tab merged into Equipment tab per unify-equipment-tab change
 * Note: Preview tab added for record sheet generation per add-record-sheet-pdf-export change
 */
export const DEFAULT_CUSTOMIZER_TABS: CustomizerTabConfig[] = [
  { id: 'overview', label: 'Overview', icon: TabIcons.overview },
  { id: 'structure', label: 'Structure', icon: TabIcons.structure },
  { id: 'armor', label: 'Armor', icon: TabIcons.armor },
  { id: 'equipment', label: 'Equipment', icon: TabIcons.equipment },
  { id: 'criticals', label: 'Critical Slots', icon: TabIcons.criticals },
  { id: 'fluff', label: 'Fluff', icon: TabIcons.fluff },
  { id: 'preview', label: 'Preview', icon: TabIcons.preview },
];

/**
 * Customizer section tabs
 */
export function CustomizerTabs({
  tabs,
  activeTab,
  onTabChange,
  readOnly = false,
  className = '',
}: CustomizerTabsProps): React.ReactElement {
  const handleKeyDown = useTabKeyboardNavigation(tabs, activeTab, onTabChange);
  
  return (
    <div
      className={`flex overflow-x-auto scrollbar-thin scrollbar-thumb-border-theme bg-surface-base border-b border-border-theme-subtle ${className}`}
      role="tablist"
      aria-label="Unit configuration tabs"
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTab}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={tab.id === activeTab ? 0 : -1}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          disabled={tab.disabled}
          className={`
            flex-shrink-0 flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 text-sm font-medium
            border-b-2 transition-colors whitespace-nowrap
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset
            ${tab.id === activeTab
              ? 'text-accent border-accent'
              : 'text-text-theme-secondary border-transparent hover:text-white hover:border-border-theme-subtle'
            }
            ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${readOnly ? 'pointer-events-none' : ''}
          `}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Hook for managing customizer tab state
 */
export function useCustomizerTabs(
  initialTab: string = 'overview',
  tabs: CustomizerTabConfig[] = DEFAULT_CUSTOMIZER_TABS
): {
  tabs: CustomizerTabConfig[];
  activeTab: string;
  currentTab: CustomizerTabConfig;
  setActiveTab: (tabId: string) => void;
} {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];
  
  return {
    tabs,
    activeTab,
    currentTab,
    setActiveTab,
  };
}

