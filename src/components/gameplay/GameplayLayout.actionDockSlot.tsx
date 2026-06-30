import React from 'react';

import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { InteractivePhase } from '@/stores/useGameplayStore';
import type {
  GameSide,
  ITacticalCommandContext,
  IUnitGameState,
  TacticalActionHandler,
} from '@/types/gameplay';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';

import { ActionBar } from './ActionBar';
import { WithdrawalTrailingActions } from './GameplayLayout.sections';
import {
  TacticalActionDock,
  type ICommandPreviewInputs,
  type IGmTacticalInterventionSurface,
} from './TacticalActionDock';
import { ShellSlot } from './TacticalCommandShell';

export function GameplayActionDockSlot({
  actionContext,
  shellMode,
  gmIntervention,
  onAction,
  commandPreviewInputs,
  interactivePhase,
  interactiveSession,
  sessionId,
  playerSide,
  selectedUnit,
  isPlayerTurn,
  canUndo,
}: {
  readonly actionContext: ITacticalCommandContext;
  readonly shellMode: ShellMode;
  readonly gmIntervention: IGmTacticalInterventionSurface | undefined;
  readonly onAction: TacticalActionHandler;
  readonly commandPreviewInputs: ICommandPreviewInputs;
  readonly interactivePhase: InteractivePhase | undefined;
  readonly interactiveSession: InteractiveSession | undefined;
  readonly sessionId: string;
  readonly playerSide: GameSide;
  readonly selectedUnit: IUnitGameState | null;
  readonly isPlayerTurn: boolean;
  readonly canUndo: boolean;
}): React.ReactElement {
  return (
    <ShellSlot id="bottom-dock" ownerId="TacticalActionDock">
      <TacticalActionDock
        ctx={actionContext}
        shellMode={shellMode}
        gmIntervention={gmIntervention}
        onAction={onAction}
        previewInputs={commandPreviewInputs}
        infoText={
          interactivePhase ? `Interactive: ${interactivePhase}` : undefined
        }
        trailingActions={
          interactiveSession ? (
            <WithdrawalTrailingActions
              interactiveSession={interactiveSession}
              sessionId={sessionId}
              playerSide={playerSide}
              selectedUnit={selectedUnit}
              isPlayerTurn={isPlayerTurn}
            />
          ) : undefined
        }
      />
      <div className="hidden" data-testid="legacy-action-bar-mount">
        <ActionBar
          phase={actionContext.phase}
          canUndo={canUndo}
          canAct={isPlayerTurn}
          onAction={onAction}
        />
      </div>
    </ShellSlot>
  );
}
