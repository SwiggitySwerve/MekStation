import React, { useEffect, useId, useRef, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

import type { TabDisplayInfo } from './tabTypes';

import { ToolbarHint } from '../shared/ToolbarHint';

interface UnitActionsMenuProps {
  tabs: readonly TabDisplayInfo[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onImport?: () => void;
  onExport?: () => void;
  canExport: boolean;
  onOpenSavedHistory?: () => void;
  savedHistoryDisabledReason?: string | null;
}

export function UnitActionsMenu({
  tabs,
  activeTabId,
  onSelectTab,
  onImport,
  onExport,
  canExport,
  onOpenSavedHistory,
  savedHistoryDisabledReason = null,
}: UnitActionsMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const historyDisabledId = `${id}-history-disabled`;
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('select,button')?.focus();
    const outside = (event: PointerEvent): void => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const run = (action: () => void): void => {
    setOpen(false);
    action();
  };
  const itemClass =
    'text-text-theme-primary hover:bg-surface-raised focus-visible:outline-accent flex min-h-11 w-full items-center rounded px-3 text-left text-sm focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label="Unit actions"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="group text-text-theme-primary hover:bg-surface-raised focus-visible:outline-accent relative flex h-11 w-11 shrink-0 items-center justify-center rounded !p-0 focus-visible:outline-2"
      >
        <AppIcon
          name="more"
          size="toolbar"
          className="max-sm:!h-5 max-sm:!w-5"
        />
        <ToolbarHint>
          <span className="block font-semibold">Unit actions</span>
          <span className="text-text-theme-secondary block">
            Import, export, saved history
          </span>
        </ToolbarHint>
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          className="bg-surface-base border-border-theme absolute top-full right-0 z-50 mt-1 w-64 max-w-[90vw] rounded-lg border p-1 shadow-xl"
        >
          {tabs.length > 1 && (
            <label className="text-text-theme-secondary block px-3 py-2 text-xs">
              Open units
              <select
                aria-label="Switch open unit"
                value={activeTabId ?? ''}
                onChange={(event) => run(() => onSelectTab(event.target.value))}
                className="bg-surface-raised border-border-theme text-text-theme-primary mt-1 min-h-11 w-full rounded border px-2 text-sm"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.name}
                    {tab.isModified ? ' •' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          {onImport && (
            <button
              type="button"
              onClick={() => run(onImport)}
              className={itemClass}
              title="Import from Bundle"
            >
              Import from bundle
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={() => run(onExport)}
              disabled={!canExport}
              className={itemClass}
              title={canExport ? 'Export Active Unit' : 'No unit to export'}
            >
              Export active unit
            </button>
          )}
          {onOpenSavedHistory && (
            <>
              <button
                type="button"
                onClick={() => run(onOpenSavedHistory)}
                disabled={savedHistoryDisabledReason !== null}
                className={itemClass}
                title={
                  savedHistoryDisabledReason ??
                  'View saved library history for this unit'
                }
                aria-describedby={
                  savedHistoryDisabledReason ? historyDisabledId : undefined
                }
              >
                Saved history
              </button>
              {savedHistoryDisabledReason && (
                <span id={historyDisabledId} className="sr-only">
                  {savedHistoryDisabledReason}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
