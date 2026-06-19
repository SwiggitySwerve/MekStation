import React from 'react';

import type { IGameEvent } from '@/types/gameplay';

import { EventLogDisplay } from './EventLogDisplay';
import { RecordSheetDrawer } from './GameplayLayout.sections';
import { ShellSlot } from './TacticalCommandShell';

export function GameplayMobileRecordSheetDrawer({
  isNarrow,
  drawerOpen,
  onToggleDrawer,
  children,
}: {
  readonly isNarrow: boolean;
  readonly drawerOpen: boolean;
  readonly onToggleDrawer: () => void;
  readonly children: React.ReactNode;
}): React.ReactElement | null {
  if (!isNarrow) return null;
  return (
    <ShellSlot id="mobile-drawer" ownerId="RecordSheetDrawer">
      <RecordSheetDrawer open={drawerOpen} onToggle={onToggleDrawer}>
        {children}
      </RecordSheetDrawer>
    </ShellSlot>
  );
}

export function GameplayEventLogSlot({
  visibleEvents,
  collapsed,
  onCollapsedChange,
  actorLookup,
  weaponLookup,
}: {
  readonly visibleEvents: readonly IGameEvent[];
  readonly collapsed: boolean;
  readonly onCollapsedChange: (collapsed: boolean) => void;
  readonly actorLookup: Record<string, string>;
  readonly weaponLookup: Record<string, string>;
}): React.ReactElement {
  return (
    <ShellSlot id="feed" ownerId="EventLogDisplay">
      <EventLogDisplay
        events={visibleEvents}
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
        maxHeight={150}
        actorLookup={actorLookup}
        weaponLookup={weaponLookup}
      />
    </ShellSlot>
  );
}
