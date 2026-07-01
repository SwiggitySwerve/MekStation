import React from 'react';

import type { IInspectorSupplementalData } from '@/hooks/gameplay/useUnitInspectorProjection';
import type { GameSide, IGameSession } from '@/types/gameplay';

import { ShellSlot, useTacticalShell } from './TacticalCommandShell';
import { TacticalUnitInspector } from './TacticalUnitInspector';

interface DesktopRightTrayProps {
  readonly selectedUnitId: string | null;
  readonly session: IGameSession;
  readonly viewerPlayerId: string;
  readonly viewerSide: GameSide;
  readonly mapPanelWidth: number;
  readonly supplemental: IInspectorSupplementalData;
  /**
   * The legacy rich `RecordSheetBody` rendered as the friendly-unit
   * detail surface. Opponent units use `TacticalUnitInspector` so its
   * redaction policy remains centralized.
   */
  readonly friendlyRecordSheet: React.ReactNode;
}

export function DesktopRightTray({
  selectedUnitId,
  session,
  viewerPlayerId,
  viewerSide,
  mapPanelWidth,
  supplemental,
  friendlyRecordSheet,
}: DesktopRightTrayProps): React.ReactElement {
  const { state } = useTacticalShell();
  const inspectedUnitId = state.inspectedUnit ?? selectedUnitId;
  const inspectedUnitSide = inspectedUnitId
    ? session.currentState.units[inspectedUnitId]?.side
    : null;
  const isFriendly = inspectedUnitSide === viewerSide;

  return (
    <ShellSlot id="right-tray" ownerId="RecordSheetPanel">
      <div
        // INSTRUMENT rail. `min-h-0 overflow-y-auto` keeps the full
        // armor/structure/heat table reachable by scrolling within the
        // rail once the FOCUS row is height-bounded (tactical-map-flex-basis)
        // — every location stays glanceable instead of clipping below the
        // map band's bottom edge.
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ width: `${100 - mapPanelWidth}%` }}
        data-testid="record-sheet-panel"
      >
        {isFriendly || inspectedUnitId === null ? (
          friendlyRecordSheet
        ) : (
          <TacticalUnitInspector
            inspectedUnitId={inspectedUnitId}
            session={session}
            viewerPlayerId={viewerPlayerId}
            viewerSide={viewerSide}
            opponentVisibilityScopes={state.opponentVisibilityScopes}
            supplemental={supplemental}
          />
        )}
      </div>
    </ShellSlot>
  );
}
