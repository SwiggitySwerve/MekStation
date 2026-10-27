import React, { useEffect, useRef } from 'react';
/**
 * Tab Bar Component
 *
 * Horizontal tab bar with tab management.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import { AppIcon } from '@/components/ui/AppIcon';
import { useTabKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

import type { TabDisplayInfo } from './tabTypes';

import { ToolbarHint } from '../shared/ToolbarHint';
import { UnitActionsMenu } from './UnitActionsMenu';
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
  /** Called when load unit button is clicked */
  onLoadUnit: () => void;
  /** Called when export button is clicked */
  onExport?: () => void;
  /** Called when import button is clicked */
  onImport?: () => void;
  /** Whether export is available (has active unit) */
  canExport?: boolean;
  /** Open saved library history for the active unit */
  onOpenSavedHistory?: () => void;
  /** Why saved history is unavailable, if it is */
  savedHistoryDisabledReason?: string | null;
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
  onLoadUnit,
  onExport,
  onImport,
  canExport = false,
  onOpenSavedHistory,
  savedHistoryDisabledReason = null,
  className = '',
}: TabBarProps): React.ReactElement {
  const tabList = useRef<HTMLDivElement>(null);
  const handleKeyDown = useTabKeyboardNavigation(
    tabs,
    activeTabId ?? '',
    onSelectTab,
  );
  useEffect(() => {
    const selected = tabList.current?.querySelector<HTMLButtonElement>(
      '[role="tab"][aria-selected="true"]',
    );
    if (tabList.current?.contains(document.activeElement)) selected?.focus();
    selected?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  return (
    <div className={`bg-surface-base flex min-w-0 items-center ${className}`}>
      <div
        ref={tabList}
        className="flex min-w-0 flex-1 items-center overflow-x-auto"
        role="tablist"
        aria-label="Open units"
        onKeyDown={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.getAttribute('role') === 'tab'
          )
            handleKeyDown(event);
        }}
      >
        {tabs.map((tab) => (
          <UnitTabComponent
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            canClose
            onSelect={() => onSelectTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
            onRename={(name) => onRenameTab(tab.id, name)}
          />
        ))}
      </div>
      {/* Secondary unit commands; Save and its state sit apart as the
          primary group. */}
      <div
        className="flex shrink-0 items-center gap-0.5 pl-2 max-sm:gap-0 max-sm:pl-0"
        data-testid="unit-command-group"
      >
        <button
          type="button"
          onClick={onLoadUnit}
          className="group text-text-theme-primary hover:bg-surface-raised focus-visible:outline-accent relative flex h-11 min-w-11 items-center justify-center gap-2 rounded !p-0 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 xl:!pr-3 xl:!pl-2"
          aria-label="Add unit (Ctrl+O)"
        >
          <AppIcon name="add" size="toolbar" />
          <span aria-hidden="true" className="hidden xl:inline">
            Add unit
          </span>
          <ToolbarHint>
            Open or create a unit{' '}
            <kbd className="text-text-theme-secondary font-sans">Ctrl+O</kbd>
          </ToolbarHint>
        </button>
        <UnitActionsMenu
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={onSelectTab}
          onImport={onImport}
          onExport={onExport}
          canExport={canExport}
          onOpenSavedHistory={onOpenSavedHistory}
          savedHistoryDisabledReason={savedHistoryDisabledReason}
        />
      </div>
    </div>
  );
}
