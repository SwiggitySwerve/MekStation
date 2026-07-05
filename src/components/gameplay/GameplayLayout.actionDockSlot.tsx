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

import type { IAttackComposerContext } from './AttackIntentComposer';
import type { IMovementComposerContext } from './MovementIntentComposer';

import { ActionBar } from './ActionBar';
import { WithdrawalTrailingActions } from './GameplayLayout.sections';
import {
  TacticalActionDock,
  type ICommandPreviewInputs,
  type IGmTacticalInterventionSurface,
} from './TacticalActionDock';
import { ShellSlot } from './TacticalCommandShell';

const INTERACTIVE_SESSION_SUPPRESSED_COMMANDS = ['utility.concede'] as const;

export function GameplayActionDockSlot({
  actionContext,
  shellMode,
  gmIntervention,
  onAction,
  commandPreviewInputs,
  composerDockContext,
  attackComposerContext,
  interactivePhase,
  isPlayerTurn,
  canUndo,
  interactiveSession,
  sessionId,
  playerSide,
  selectedUnit,
}: {
  readonly actionContext: ITacticalCommandContext;
  readonly shellMode: ShellMode;
  readonly gmIntervention: IGmTacticalInterventionSurface | undefined;
  readonly onAction: TacticalActionHandler;
  readonly commandPreviewInputs: ICommandPreviewInputs;
  readonly composerDockContext: IMovementComposerContext | undefined;
  readonly attackComposerContext: IAttackComposerContext | undefined;
  readonly interactivePhase: InteractivePhase | undefined;
  readonly isPlayerTurn: boolean;
  readonly canUndo: boolean;
  readonly interactiveSession: InteractiveSession | undefined;
  readonly sessionId: string;
  readonly playerSide: GameSide;
  readonly selectedUnit: IUnitGameState | null | undefined;
}): React.ReactElement {
  return (
    <ShellSlot id="bottom-dock" ownerId="TacticalActionDock">
      <TacticalActionDock
        ctx={actionContext}
        shellMode={shellMode}
        gmIntervention={gmIntervention}
        onAction={onAction}
        previewInputs={commandPreviewInputs}
        intentComposer={composerDockContext}
        attackComposer={attackComposerContext}
        suppressCommandIds={
          interactiveSession
            ? INTERACTIVE_SESSION_SUPPRESSED_COMMANDS
            : undefined
        }
        infoText={
          interactivePhase
            ? formatInteractivePhaseLabel(interactivePhase)
            : undefined
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

function formatInteractivePhaseLabel(phase: InteractivePhase): string {
  const labelByPhase: Readonly<Record<string, string>> = {
    none: 'Awaiting tactical command',
    select_unit: 'Select a unit',
    select_movement: 'Pick a movement path',
    select_target: 'Select a target',
    select_weapons: 'Choose weapons',
    ai_turn: 'Opponent turn',
    game_over: 'Battle complete',
  };
  return labelByPhase[phase] ?? 'Tactical command active';
}
