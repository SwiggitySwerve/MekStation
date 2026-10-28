import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { AppIcon } from '@/components/ui/AppIcon';

import { ToolbarHint } from './shared/ToolbarHint';

export function CustomizerWorkspaceControls({
  wide,
  onToggle,
  onOpenLoadout,
}: {
  wide: boolean;
  onToggle: () => void;
  onOpenLoadout: () => void;
}): React.ReactElement {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(document.getElementById('customizer-workspace-controls'));
  }, []);
  // Ghost icon buttons like Add Unit and the unit menu: no box at rest. The
  // 2px margin puts this glyph 24px past the unit menu's, and the last
  // button's right edge on the Loadout rail's controls below.
  const buttonClass =
    'group text-text-theme-primary hover:bg-surface-raised focus-visible:outline-text-theme-primary relative ml-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded !p-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] md:flex';
  const content = (
    <>
      {wide && (
        <button
          type="button"
          aria-label="Open Loadout Drawer"
          onClick={onOpenLoadout}
          className={buttonClass}
        >
          <AppIcon name="list" size="toolbar" />
          <ToolbarHint>
            <span className="block font-semibold">Open Loadout Drawer</span>
            <span className="text-text-theme-secondary block">
              Mounted and unassigned equipment
            </span>
          </ToolbarHint>
        </button>
      )}
      {/* A toggle: the name says what pressing does; pressed = panel hidden. */}
      <button
        type="button"
        aria-pressed={wide}
        aria-label="Hide Loadout Panel"
        onClick={onToggle}
        className={`${buttonClass} aria-pressed:bg-accent/15 aria-pressed:text-accent`}
        data-testid="customizer-workspace-toggle"
      >
        <AppIcon
          name={wide ? 'panel-right-open' : 'panel-right-close'}
          size="toolbar"
        />
        <ToolbarHint>
          <span className="block font-semibold">
            {wide ? 'Show Loadout Panel' : 'Hide Loadout Panel'}
          </span>
          <span className="text-text-theme-secondary block">
            {wide
              ? 'The panel is hidden for a wider workspace'
              : 'Widens the workspace; the loadout opens as a drawer'}
          </span>
        </ToolbarHint>
      </button>
    </>
  );
  return host ? createPortal(content, host) : content;
}
