/**
 * TacticalUnitInspector - right-tray unit inspector for the Tactical Command Shell.
 *
 * Renders the correct projection tier for the inspected (or selected) unit:
 *
 * - `friendly` - full exact state.
 * - `target` - partial state for a visible opponent.
 * - `redacted` - generic "Unknown Contact" placeholder.
 *
 * The projection itself is derived by `useUnitInspectorProjection`; this
 * component only selects the appropriate view.
 *
 * @spec openspec/changes/add-tactical-unit-inspector-drawers/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-unit-inspector-drawers/tasks.md
 */

import React from 'react';

import type { GameSide } from '@/types/gameplay';
import type { IGameSession } from '@/types/gameplay';
import type {
  OpponentIntelTier,
  PlayerId,
} from '@/types/gameplay/TacticalShellInterfaces';

import {
  useUnitInspectorProjection,
  type IInspectorSupplementalData,
} from '@/hooks/gameplay/useUnitInspectorProjection';

import {
  FriendlyView,
  RedactedView,
  TargetView,
} from './TacticalUnitInspectorViews';

export interface TacticalUnitInspectorProps {
  /**
   * The unit to inspect. When null the component renders an empty
   * "no unit selected" placeholder.
   *
   * Callers MUST bind this to `shellState.inspectedUnit ?? selectedUnitId`.
   * NEVER bind to `activeUnit` - Wave 7.0 Gate 4.
   */
  readonly inspectedUnitId: string | null;
  /** Current game session. */
  readonly session: IGameSession;
  /** Local viewer's player id (from TacticalCommandShell context). */
  readonly viewerPlayerId: PlayerId;
  /** The game side the viewer controls. */
  readonly viewerSide: GameSide;
  /**
   * Per-opponent intel tier map from `ITacticalShellState.opponentVisibilityScopes`.
   * An empty map means no per-opponent redaction policy has been set
   * (single-player default: every opponent defaults to 'rough').
   */
  readonly opponentVisibilityScopes: Readonly<
    Record<PlayerId, OpponentIntelTier>
  >;
  /** Optional supplemental display data (pilot names, weapons, armor max). */
  readonly supplemental?: IInspectorSupplementalData;
  /** Optional extra CSS classes for the root container. */
  readonly className?: string;
}

export function TacticalUnitInspector({
  inspectedUnitId,
  session,
  viewerPlayerId,
  viewerSide,
  opponentVisibilityScopes,
  supplemental,
  className = '',
}: TacticalUnitInspectorProps): React.ReactElement {
  const projection = useUnitInspectorProjection({
    unitId: inspectedUnitId,
    session,
    viewerPlayerId,
    viewerSide,
    opponentVisibilityScopes,
    supplemental,
  });

  if (!projection) {
    return (
      <div
        className={`flex items-center justify-center p-6 text-xs text-gray-400 ${className}`}
        data-testid="inspector-empty"
      >
        Select a unit to inspect
      </div>
    );
  }

  return (
    <div
      className={`h-full overflow-y-auto bg-white ${className}`}
      data-testid="tactical-unit-inspector"
    >
      {projection.kind === 'friendly' && (
        <FriendlyView projection={projection} />
      )}
      {projection.kind === 'target' && <TargetView projection={projection} />}
      {projection.kind === 'redacted' && <RedactedView />}
    </div>
  );
}

export default TacticalUnitInspector;
