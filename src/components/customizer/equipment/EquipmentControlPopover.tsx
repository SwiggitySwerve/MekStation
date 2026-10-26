import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';

interface EquipmentControlPopoverProps {
  label: React.ReactNode;
  ariaLabel: string;
  /** Accessible name of the trigger when it differs from the panel name. */
  triggerLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function EquipmentControlPopover({
  label,
  ariaLabel,
  triggerLabel,
  children,
  className = '',
}: EquipmentControlPopoverProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const root = useRef<HTMLDivElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const update = (): void => {
      const box = root.current?.getBoundingClientRect();
      if (box)
        setPosition({
          top: box.bottom + 4,
          left: Math.max(8, Math.min(box.left, window.innerWidth - 344)),
        });
    };
    update();
    panel.current
      ?.querySelector<HTMLElement>('button,input,select')
      ?.focus({ preventScroll: true });
    const outside = (event: PointerEvent): void => {
      if (
        !root.current?.contains(event.target as Node) &&
        !panel.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', update);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', update);
    };
  }, [open]);
  return (
    <div ref={root} className={`shrink-0 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        aria-label={triggerLabel ?? ariaLabel}
        aria-expanded={open}
        aria-controls={id}
        onClick={(event) => {
          trigger.current = event.currentTarget;
          setOpen((value) => !value);
        }}
        className="!px-2 !text-xs"
      >
        {label}
        <AppIcon name="chevron-down" size="inline" aria-hidden="true" />
      </Button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="group"
            aria-label={ariaLabel}
            className="bg-surface-base border-border-theme fixed z-[70] max-h-[60dvh] w-[336px] max-w-[calc(100vw-1rem)] overflow-auto rounded-lg border p-3 shadow-xl"
            style={{
              ...position,
              maxHeight: `calc(100dvh - ${position.top + 8}px)`,
            }}
          >
            <div className="text-text-theme-primary mb-2 flex min-h-11 items-center justify-between text-sm font-semibold">
              {ariaLabel}
              <button
                type="button"
                aria-label={`Close ${ariaLabel.toLowerCase()}`}
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                }}
                className="focus-visible:outline-accent hover:bg-surface-raised min-h-11 min-w-11 rounded text-lg focus-visible:outline-2"
              >
                <AppIcon name="close" size="inline" aria-hidden="true" />
              </button>
            </div>
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}
