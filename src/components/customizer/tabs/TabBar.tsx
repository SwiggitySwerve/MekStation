/**
 * Tab Bar Component
 *
 * Horizontal tab bar with tab management.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import React from 'react';

import type { TabDisplayInfo } from './tabTypes';

import { UnitTab as UnitTabComponent } from './UnitTab';

export type { TabDisplayInfo } from './tabTypes';

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
  /** Called when export button is clicked */
  onExport?: () => void;
  /** Called when import button is clicked */
  onImport?: () => void;
  /** Whether export is available (has active unit) */
  canExport?: boolean;
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
  onExport,
  onImport,
  canExport = false,
  className = '',
}: TabBarProps): React.ReactElement {
  return (
    <div
      className={`bg-surface-base border-border-theme flex items-center border-b ${className}`}
    >
      {/* Tab list - scrollable on mobile */}
      <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
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

      {/* Toolbar icons - MegaMekLab style, touch-friendly */}
      <div className="border-border-theme flex flex-shrink-0 items-center gap-0.5 border-l px-1 sm:gap-1 sm:px-2">
        {/* New Unit - Document icon */}
        <button
          onClick={onNewTab}
          className="text-text-theme-secondary hover:bg-surface-raised flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 transition-colors hover:text-white sm:min-h-0 sm:min-w-0 sm:p-1.5"
          title="Create New Unit (Ctrl+N)"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>

        {/* Load Unit - Folder icon */}
        <button
          onClick={onLoadUnit}
          className="text-text-theme-secondary hover:bg-surface-raised flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 transition-colors hover:text-white sm:min-h-0 sm:min-w-0 sm:p-1.5"
          title="Load Unit from Library (Ctrl+O)"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
            />
          </svg>
        </button>

        {onImport && (
          <button
            onClick={onImport}
            className="text-text-theme-secondary hover:bg-surface-raised flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 transition-colors hover:text-white sm:min-h-0 sm:min-w-0 sm:p-1.5"
            title="Import from Bundle"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            disabled={!canExport}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 transition-colors sm:min-h-0 sm:min-w-0 sm:p-1.5 ${
              canExport
                ? 'text-text-theme-secondary hover:bg-surface-raised hover:text-white'
                : 'text-text-theme-muted cursor-not-allowed opacity-50'
            }`}
            title={canExport ? 'Export Active Unit' : 'No unit to export'}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
