import React from 'react';

import type { IGameSession } from '@/types/gameplay';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';

import { MoraleIndicator } from './MoraleIndicator';
import { ShellSlot } from './TacticalCommandShell';
import {
  TacticalTurnRail,
  type PhaseAdvanceControlProps,
} from './TacticalTurnRail';

type PhaseQueueProjection = React.ComponentProps<
  typeof TacticalTurnRail
>['projection'];

export function GameplayTopBand({
  projection,
  session,
  shellMode,
  selectedUnitId,
  onUnitSelect,
  isNarrow,
  drawerOpen,
  onToggleDrawer,
  phaseAdvanceControl,
}: {
  readonly projection: PhaseQueueProjection;
  readonly session: IGameSession;
  readonly shellMode: ShellMode;
  readonly selectedUnitId: string | null;
  readonly onUnitSelect: (unitId: string | null) => void;
  readonly isNarrow: boolean;
  readonly drawerOpen: boolean;
  readonly onToggleDrawer: () => void;
  readonly phaseAdvanceControl?: PhaseAdvanceControlProps;
}): React.ReactElement {
  return (
    <ShellSlot id="top-band" ownerId="TacticalTurnRail">
      <TacticalTurnRail
        projection={projection}
        gameUnits={session.units}
        unitStates={session.currentState.units}
        shellMode={shellMode}
        turn={session.currentState.turn}
        phase={session.currentState.phase}
        selectedUnitId={selectedUnitId}
        onUnitSelect={onUnitSelect}
        drawer={
          isNarrow
            ? {
                isDrawerOpen: drawerOpen,
                onToggleDrawer,
              }
            : undefined
        }
        phaseAdvanceControl={phaseAdvanceControl}
      />
    </ShellSlot>
  );
}

export function GameplayMoraleBand({
  session,
}: {
  readonly session: IGameSession;
}): React.ReactElement | null {
  if (!session.currentState.battleMorale) return null;

  return (
    <ShellSlot id="morale-band" ownerId="MoraleIndicator">
      <MoraleIndicator
        battleMorale={session.currentState.battleMorale}
        className="mx-2 mt-1"
      />
    </ShellSlot>
  );
}
