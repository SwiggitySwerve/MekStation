import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { SvgIcon } from '@/components/ui/SvgIcon';

import { ResetConfirmationDialog } from '../dialogs/ResetConfirmationDialog';
import { ColorLegend } from '../shared/ColorLegend';

export interface CriticalSlotsToolbarProps {
  readonly autoFillUnhittables: boolean;
  readonly autoCompact: boolean;
  readonly autoSort: boolean;
  readonly onAutoFillToggle: () => void;
  readonly onAutoCompactToggle: () => void;
  readonly onAutoSortToggle: () => void;
  readonly onFill: () => void;
  readonly onCompact: () => void;
  readonly onSort: () => void;
  readonly onReset: () => void;
  readonly readOnly: boolean;
  readonly placementIssues?: readonly { instanceId: string; message: string }[];
  readonly onSelectIssue?: (id: string) => void;
  readonly notice?: string;
  readonly hasMoreLocationsBelow?: boolean;
  readonly equipmentNames?: readonly string[];
  /** Small muted note about the grid's arrangement, shown in the toolbar row. */
  readonly caption?: string;
}

/**
 * The toolbar's secondary buttons: the standard secondary border with cream
 * text, so enabled tools never read as disabled grey chips.
 */
const TOOL_BUTTON_CLASS = '!h-11 shrink-0 !px-3 !py-0 !text-text-theme-primary';

export function CriticalSlotsToolbar({
  autoFillUnhittables,
  autoCompact,
  autoSort,
  onAutoFillToggle,
  onAutoCompactToggle,
  onAutoSortToggle,
  onFill,
  onCompact,
  onSort,
  onReset,
  readOnly,
  placementIssues = [],
  onSelectIssue,
  notice,
  hasMoreLocationsBelow = false,
  equipmentNames = [],
  caption,
}: CriticalSlotsToolbarProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const move = (): void => {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect)
        setPosition({
          left: Math.max(
            8,
            Math.min(rect.right - 264, window.innerWidth - 272),
          ),
          top: rect.bottom + 4,
        });
    };
    move();
    panel.current
      ?.querySelector<HTMLButtonElement>('button')
      ?.focus({ preventScroll: true });
    const outside = (event: PointerEvent): void => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', move);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', move);
    };
  }, [open]);
  const toggles = [
    {
      label: 'Automatically Fill Slots',
      active: autoFillUnhittables,
      toggle: onAutoFillToggle,
    },
    {
      label: 'Automatically Compact Slots',
      active: autoCompact,
      toggle: onAutoCompactToggle,
    },
    {
      label: 'Automatically Sort Equipment',
      active: autoSort,
      toggle: onAutoSortToggle,
    },
  ];
  return (
    <div className="border-border-theme-subtle bg-surface-base @container flex shrink-0 items-center gap-1 border-b px-3 sm:gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={readOnly}
        onClick={onSort}
        title="Sort equipment by size and compact slots within each location"
        className={TOOL_BUTTON_CLASS}
      >
        Auto-Arrange
      </Button>
      <button
        ref={trigger}
        type="button"
        aria-label="Critical slot tools"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        title="Critical slot tools"
        className="bg-surface-raised hover:bg-border-theme border-border-theme text-text-theme-primary focus-visible:ring-accent inline-flex !h-11 !w-11 shrink-0 items-center justify-center rounded-lg border !p-0 focus-visible:ring-2 focus-visible:outline-none"
      >
        <AppIcon name="chevron-down" size="inline" aria-hidden="true" />
      </button>
      <Button
        size="sm"
        variant="secondary"
        type="button"
        aria-label="Reset slot assignments"
        disabled={readOnly}
        onClick={() => {
          setOpen(false);
          setResetOpen(true);
        }}
        // Destructive: a red outline on hover and keyboard focus.
        className={`${TOOL_BUTTON_CLASS} hover:!border-red-400 focus-visible:!border-red-400`}
      >
        Reset…
      </Button>
      {hasMoreLocationsBelow && (
        <span className="text-text-theme-secondary hidden text-xs sm:block">
          Scroll for more locations
        </span>
      )}
      {/* One line: shown only where the toolbar (the query container) has
          room for it beside the two-row key, so it never wraps, leaves a
          dangling "·" or pushes the key onto extra lines. */}
      {caption && (
        <span
          data-testid="critical-slots-caption"
          className="text-text-theme-secondary hidden shrink-0 text-xs leading-4 whitespace-nowrap @[66rem]:block"
        >
          {caption}
        </span>
      )}
      <ColorLegend
        className="ml-auto min-w-0"
        equipmentNames={equipmentNames}
      />
      <ResetConfirmationDialog
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={async () => {
          onReset();
        }}
        options={[
          {
            id: 'slots',
            title: 'Reset Slot Assignments',
            description: 'Return mounted equipment to the unassigned pool.',
            removes: ['Equipment slot assignments'],
            preserves: [
              'Equipment inventory',
              'Fixed systems',
              'Armor and structure',
            ],
          },
        ]}
      />
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="group"
            aria-label="Critical slot tools"
            className="bg-surface-base border-border-theme fixed z-[70] max-h-[60dvh] w-[264px] max-w-[calc(100vw-1rem)] overflow-auto rounded-lg border p-1 shadow-xl"
            style={{
              ...position,
              maxHeight: `calc(100dvh - ${position.top + 8}px)`,
            }}
          >
            {toggles.map(({ label, active, toggle }) => (
              <button
                key={label}
                type="button"
                disabled={readOnly}
                aria-pressed={active}
                onClick={toggle}
                className="text-text-theme-primary hover:bg-surface-raised focus-visible:outline-accent flex min-h-11 w-full items-center justify-between gap-2 rounded px-3 text-left text-xs focus-visible:outline-2 disabled:opacity-40"
              >
                {label}
                <span
                  aria-hidden="true"
                  className={active ? 'text-accent' : 'text-text-theme-muted'}
                >
                  {active ? (
                    <AppIcon name="check" size="inline" aria-hidden="true" />
                  ) : (
                    <SvgIcon size="inline" aria-hidden="true">
                      <circle cx="12" cy="12" r="8" />
                    </SvgIcon>
                  )}
                </span>
              </button>
            ))}
            {[
              { label: 'Fill', action: onFill },
              { label: 'Compact', action: onCompact },
              { label: 'Sort', action: onSort },
            ].map(({ label, action }) => (
              <button
                key={label}
                type="button"
                disabled={readOnly}
                onClick={() => {
                  action();
                  setOpen(false);
                  trigger.current?.focus();
                }}
                className="text-text-theme-primary hover:bg-surface-raised focus-visible:outline-accent min-h-11 w-full rounded px-3 text-left text-xs focus-visible:outline-2 disabled:opacity-40"
              >
                {label}
              </button>
            ))}
            {placementIssues.length > 0 && (
              <details className="border-border-theme border-t px-2">
                <summary className="flex min-h-11 cursor-pointer items-center text-xs text-yellow-400">
                  {placementIssues.length} placement issues
                </summary>
                {placementIssues.map((issue, index) => (
                  <button
                    key={`${issue.instanceId}-${index}`}
                    type="button"
                    onClick={() => {
                      onSelectIssue?.(issue.instanceId);
                      setOpen(false);
                    }}
                    className="text-text-theme-secondary hover:bg-surface-raised focus-visible:outline-accent min-h-11 w-full rounded px-1 py-2 text-left text-xs focus-visible:outline-2"
                  >
                    {issue.message}
                  </button>
                ))}
              </details>
            )}
            {notice && (
              <p className="text-text-theme-secondary border-border-theme border-t px-3 py-2 text-xs">
                {notice}
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
