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
  const buttonClass =
    'group text-text-theme-primary bg-surface-raised border-border-theme-strong hover:bg-surface-base focus-visible:outline-accent relative ml-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded border !p-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] md:flex';
  const content = (
    <>
      {wide && (
        <button
          type="button"
          aria-label="Open loadout drawer"
          onClick={onOpenLoadout}
          className={buttonClass}
        >
          <AppIcon name="list" size="toolbar" />
          <ToolbarHint>
            <span className="block font-semibold">Open loadout drawer</span>
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
        aria-label="Hide loadout panel"
        onClick={onToggle}
        className={`${buttonClass} aria-pressed:border-accent aria-pressed:bg-accent/15`}
        data-testid="customizer-workspace-toggle"
      >
        <AppIcon
          name={wide ? 'panel-right-open' : 'panel-right-close'}
          size="toolbar"
        />
        <ToolbarHint>
          <span className="block font-semibold">
            {wide ? 'Show loadout panel' : 'Hide loadout panel'}
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
