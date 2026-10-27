import React, { useEffect, useId, useRef, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { SvgIcon } from '@/components/ui/SvgIcon';

import type { RecordSheetPreviewZoomMode } from './recordSheetPreviewZoom';

import { PREVIEW_CONTROL_CLASS } from './previewToolbarStyles';
import { formatZoomPercent } from './recordSheetPreviewZoom';

interface RecordSheetPreviewZoomControlsProps {
  readonly zoom: number;
  readonly mode: RecordSheetPreviewZoomMode;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFitToWidth: () => void;
  readonly onFitToPage: () => void;
  readonly onActualSize: () => void;
  readonly className?: string;
}

const STEP_BUTTON_CLASS = `${PREVIEW_CONTROL_CLASS} inline-flex w-11 min-w-11 shrink-0 items-center justify-center px-0!`;

/** One zoom control: step down, current mode and percentage menu, step up. */
export function RecordSheetPreviewZoomControls({
  zoom,
  mode,
  onZoomIn,
  onZoomOut,
  onFitToWidth,
  onFitToPage,
  onActualSize,
  className = '',
}: RecordSheetPreviewZoomControlsProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const options = [
    { mode: 'fit-page', label: 'Fit page', action: onFitToPage },
    { mode: 'fit-width', label: 'Fit width', action: onFitToWidth },
    { mode: 'actual', label: '100%', action: onActualSize },
  ] as const;
  const modeLabel =
    mode === 'fit-page'
      ? 'Fit page'
      : mode === 'fit-width'
        ? 'Fit width'
        : null;

  useEffect(() => {
    if (!open) return;
    (
      menu.current?.querySelector<HTMLElement>('[aria-checked="true"]') ??
      menu.current?.querySelector<HTMLElement>('[role="menuitemradio"]')
    )?.focus();
    const outside = (event: PointerEvent): void => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return (
    <div
      ref={root}
      className={`relative flex w-full min-w-0 items-center gap-1 sm:w-auto ${className}`}
      role="group"
      aria-label="Record sheet zoom controls"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom out"
        className={STEP_BUTTON_CLASS}
      >
        <SvgIcon size="inline" aria-hidden="true">
          <circle cx="10" cy="10" r="7" />
          <path d="m15 15 7 7M7 10h6" />
        </SvgIcon>
      </button>
      <button
        ref={trigger}
        type="button"
        aria-label="Zoom options"
        aria-describedby={`${id}-state`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className={`${PREVIEW_CONTROL_CLASS} inline-flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap tabular-nums sm:min-w-44`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span id={`${id}-state`}>
          {modeLabel && (
            <>
              {modeLabel} {'\u00b7'}{' '}
            </>
          )}
          <output aria-live="polite" aria-label="Current zoom">
            {formatZoomPercent(zoom)}
          </output>
        </span>
        <AppIcon name="chevron-down" size="inline" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom in"
        className={STEP_BUTTON_CLASS}
      >
        <SvgIcon size="inline" aria-hidden="true">
          <circle cx="10" cy="10" r="7" />
          <path d="m15 15 7 7M7 10h6M10 7v6" />
        </SvgIcon>
      </button>
      {open && (
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label="Sheet size"
          className="bg-surface-base border-border-theme absolute top-full right-11 left-11 z-50 mt-1 min-w-40 rounded-md border p-1 shadow-xl"
          onKeyDown={(event) => {
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitemradio"]',
              ),
            );
            const index = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : event.key === 'ArrowDown'
                    ? (index + 1) % items.length
                    : event.key === 'ArrowUp'
                      ? (index - 1 + items.length) % items.length
                      : null;
            if (next !== null) {
              event.preventDefault();
              items[next]?.focus();
            }
            if (event.key === 'Tab') setOpen(false);
          }}
        >
          {options.map((option) => (
            <button
              key={option.mode}
              type="button"
              role="menuitemradio"
              aria-checked={mode === option.mode}
              tabIndex={-1}
              className="text-text-theme-primary hover:bg-surface-raised focus-visible:outline-accent flex min-h-11 w-full items-center justify-between gap-2 rounded px-3! text-left text-sm! focus-visible:outline-2 aria-checked:font-semibold"
              onClick={() => {
                option.action();
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              {option.label}
              {mode === option.mode && (
                <AppIcon name="check" size="inline" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
