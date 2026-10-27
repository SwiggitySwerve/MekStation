import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';

import workbenchStyles from '../CustomizerWorkbench.module.css';

export function CatalogAddAction({
  name,
  readOnly,
  onAdd,
  onAddAndPlace,
}: {
  name: string;
  readOnly: boolean;
  onAdd: () => void;
  onAddAndPlace?: () => void;
}): React.ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const available = open && !readOnly && Boolean(onAddAndPlace);
  useLayoutEffect(() => {
    if (!available) return;
    const panel = menu.current;
    const button = trigger.current;
    if (!panel || !button) return;
    // Portal keeps the last row's menu outside the catalog scroll clip.
    const anchor = button.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(anchor.right - box.width, window.innerWidth - box.width - 8))}px`;
    panel.style.top = `${Math.max(8, anchor.bottom + box.height + 8 <= window.innerHeight ? anchor.bottom + 4 : anchor.top - box.height - 4)}px`;
    panel
      .querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });
    const outside = (event: PointerEvent): void => {
      if (
        !root.current?.contains(event.target as Node) &&
        !panel.contains(event.target as Node)
      )
        setOpen(false);
    };
    const dismiss = (): void => {
      if (panel.contains(document.activeElement))
        button.focus({ preventScroll: true });
      setOpen(false);
    };
    const dismissIfMoved = (): void => {
      // A queued scroll from revealing the trigger must not close a menu
      // positioned after that scroll. Only dismiss when its anchor moves.
      const current = button.getBoundingClientRect();
      if (current.top !== anchor.top || current.left !== anchor.left) dismiss();
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismissIfMoved, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismissIfMoved, true);
    };
  }, [available]);
  const run = (action: () => void): void => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
    action();
  };
  return (
    <div
      ref={root}
      data-catalog-column="actions"
      className={workbenchStyles.catalogActions}
    >
      <Button
        size="sm"
        variant="ghost"
        disabled={readOnly}
        onClick={onAdd}
        title="Add to unassigned"
        aria-label={`Add ${name}`}
        aria-description="Add to unassigned in the Loadout"
        className={workbenchStyles.catalogAddHit}
      >
        <AppIcon name="add" size="inline" aria-hidden="true" />
        <span>Add</span>
      </Button>
      {onAddAndPlace && (
        <Button
          size="sm"
          variant="ghost"
          disabled={readOnly}
          aria-label={`Add options for ${name}`}
          title="More ways to add"
          aria-haspopup="menu"
          aria-expanded={available}
          aria-controls={available ? id : undefined}
          className={workbenchStyles.catalogAddOptions}
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setOpen(!open);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              trigger.current = event.currentTarget;
              setOpen(true);
            }
          }}
        >
          <AppIcon name="more" size="inline" aria-hidden="true" />
        </Button>
      )}
      {available &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="menu"
            aria-label={`Add options for ${name}`}
            className={workbenchStyles.catalogAddMenu}
            onBlur={(event) => {
              if (
                event.relatedTarget !== trigger.current &&
                !event.currentTarget.contains(event.relatedTarget)
              )
                setOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' || event.key === 'Tab') {
                if (event.key === 'Escape') event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                trigger.current?.focus({ preventScroll: true });
              } else if (
                ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
              ) {
                event.preventDefault();
                const items = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    '[role="menuitem"]',
                  ),
                );
                const current = items.indexOf(
                  document.activeElement as HTMLElement,
                );
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? items.length - 1
                      : (current +
                          (event.key === 'ArrowDown' ? 1 : -1) +
                          items.length) %
                        items.length;
                items[next]?.focus();
              }
            }}
          >
            <Button
              variant="ghost"
              role="menuitem"
              tabIndex={-1}
              onClick={() => run(onAdd)}
            >
              Add to unassigned
            </Button>
            <Button
              variant="ghost"
              role="menuitem"
              tabIndex={-1}
              aria-label={`Add and place ${name}`}
              onClick={() => onAddAndPlace && run(onAddAndPlace)}
            >
              Add and choose location…
            </Button>
          </div>,
          document.body,
        )}
    </div>
  );
}
