import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

import { GroupingMode } from './GlobalLoadoutTray.helpers';

/**
 * Icon buttons show an immediate, styled tooltip (hover or keyboard focus)
 * from `data-tip`, in addition to their accessible name.
 */
const ICON_BUTTON_CLASS =
  'text-text-theme-primary focus-visible:ring-accent hover:bg-surface-raised relative flex h-11 w-11 shrink-0 items-center justify-center rounded !p-0 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ' +
  'after:bg-surface-deep after:border-border-theme after:text-text-theme-primary after:pointer-events-none after:absolute after:top-full after:right-0 after:z-50 after:mt-1 after:hidden after:rounded after:border after:px-2 after:py-1 after:text-xs after:font-medium after:whitespace-nowrap after:shadow-lg after:content-[attr(data-tip)] ' +
  'hover:after:block focus-visible:after:block aria-expanded:after:!hidden';

interface LoadoutTrayHeaderProps {
  equipmentCount: number;
  grouping: GroupingMode;
  removableCount: number;
  isActionsOpen: boolean;
  actionsRef: React.RefObject<HTMLDivElement | null>;
  onGroupingChange: (grouping: GroupingMode) => void;
  onToggleActions: () => void;
  onRemoveAll: () => void;
  onToggleExpand: () => void;
}

export function GlobalLoadoutTrayHeader({
  equipmentCount,
  grouping,
  removableCount,
  isActionsOpen,
  actionsRef,
  onGroupingChange,
  onToggleActions,
  onRemoveAll,
  onToggleExpand,
}: LoadoutTrayHeaderProps): React.ReactElement {
  return (
    <header className="border-border-theme h-12 shrink-0 border-b">
      <div className="flex h-full items-center justify-between px-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <div>
            <h3 className="text-text-theme-primary text-xs font-semibold tracking-[0.12em] uppercase">
              Loadout
            </h3>
            <p className="text-text-theme-secondary text-xs">By {grouping}</p>
          </div>
          <span
            className="border-border-theme bg-surface-raised text-text-theme-secondary rounded-full border px-1.5 py-0.5 text-xs tabular-nums"
            title={`${equipmentCount} items in loadout`}
          >
            {equipmentCount}
          </span>
        </div>
        <div className="relative flex items-center gap-0.5" ref={actionsRef}>
          <button
            type="button"
            onClick={onToggleActions}
            aria-expanded={isActionsOpen}
            aria-controls="loadout-actions"
            aria-label="More loadout actions"
            data-tip="Loadout options"
            className={ICON_BUTTON_CLASS}
          >
            <AppIcon name="more" size="toolbar" />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label="Collapse loadout"
            data-tip="Collapse loadout"
            className={ICON_BUTTON_CLASS}
          >
            <AppIcon name="chevrons-right" size="toolbar" />
          </button>

          {isActionsOpen && (
            <div
              id="loadout-actions"
              className="bg-surface-base border-border-theme absolute top-full right-0 z-50 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border p-1 shadow-xl"
            >
              <div
                className="border-border-theme-subtle flex flex-col gap-1 border-b p-1"
                role="group"
                aria-label="Group loadout equipment by"
              >
                {(['category', 'location'] as const).map((mode) => {
                  const isActive = grouping === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => onGroupingChange(mode)}
                      className={`focus-visible:ring-accent flex min-h-11 w-full min-w-0 items-center gap-3 rounded px-3 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${
                        isActive
                          ? 'bg-accent/15 text-accent'
                          : 'text-text-theme-secondary hover:bg-surface-raised hover:text-text-theme-primary'
                      }`}
                    >
                      <AppIcon
                        name={mode === 'category' ? 'category' : 'location'}
                      />
                      <span className="min-w-0 flex-1 capitalize">{mode}</span>
                      {isActive && <AppIcon name="check" size="inline" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-text-theme-secondary px-2 py-1 text-xs font-medium tracking-[0.14em] uppercase">
                Loadout actions
              </p>
              <button
                type="button"
                disabled={removableCount === 0}
                onClick={onRemoveAll}
                className="focus-visible:ring-accent flex min-h-11 w-full items-center gap-3 rounded px-3 text-left text-sm text-red-300 transition-colors hover:bg-red-900/30 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-40"
              >
                <AppIcon name="trash" />
                <span>Remove all removable ({removableCount})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
