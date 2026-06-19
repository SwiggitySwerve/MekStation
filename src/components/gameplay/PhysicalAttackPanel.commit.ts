import type { InteractiveSession } from '@/engine/GameEngine';
import type { ISelectedUnitProjection } from '@/stores/useGameplayStore';
import type {
  ICommitPhysicalAttackArgs,
  IPhysicalAttackPlan,
} from '@/stores/useGameplayStore.combatFlows';

import {
  MovementType,
  type IGameSession,
  type IUnitGameState,
} from '@/types/gameplay';

import type { MeleeTarget } from './PhysicalAttackPanel.renderers';

import { attackTypeLabel } from './PhysicalAttackPanel.helpers';
import {
  buildOptionalElevationContext,
  buildOptionalTerrainContext,
  findSessionUnit,
} from './PhysicalAttackPanel.model';

type PhysicalGrid = ReturnType<InteractiveSession['getGrid']>;

interface PhysicalAttackCommitArgs {
  selected: ISelectedUnitProjection | null;
  session: IGameSession | null;
  targetState: IUnitGameState | null;
  physicalGrid: PhysicalGrid | null;
  physicalAttackPlan: IPhysicalAttackPlan;
  interactiveSession: InteractiveSession | null;
  attackerTonnage: number;
  commitPhysicalAttack: (
    args: ICommitPhysicalAttackArgs,
  ) => IGameSession | null;
  meleeTargets: readonly MeleeTarget[];
  selectedMeleeTarget: MeleeTarget | null;
}

export interface PhysicalAttackCommitResult {
  nextSession: IGameSession | null;
  summary: string | null;
}

export function commitPhysicalAttackSelection({
  selected,
  session,
  targetState,
  physicalGrid,
  physicalAttackPlan,
  interactiveSession,
  attackerTonnage,
  commitPhysicalAttack,
  meleeTargets,
  selectedMeleeTarget,
}: PhysicalAttackCommitArgs): PhysicalAttackCommitResult {
  const commitArgs = buildCommitArgs({
    selected,
    session,
    targetState,
    physicalGrid,
    physicalAttackPlan,
    interactiveSession,
    attackerTonnage,
  });
  if (!commitArgs) return { nextSession: null, summary: null };

  const nextSession = commitPhysicalAttack(commitArgs);
  return {
    nextSession,
    summary: nextSession
      ? committedPhysicalAttackSummary({
          physicalAttackPlan,
          meleeTargets,
          selectedMeleeTarget,
        })
      : null,
  };
}

function buildCommitArgs({
  selected,
  session,
  targetState,
  physicalGrid,
  physicalAttackPlan,
  interactiveSession,
  attackerTonnage,
}: Omit<
  PhysicalAttackCommitArgs,
  'commitPhysicalAttack' | 'meleeTargets' | 'selectedMeleeTarget'
>): ICommitPhysicalAttackArgs | null {
  if (!interactiveSession || !selected) return null;

  const targetUnit = findSessionUnit(session, physicalAttackPlan.targetUnitId);
  return {
    interactiveSession,
    attackerId: selected.id,
    attackerPiloting: selected.unit.piloting,
    attackerTonnage,
    attackerUnitType: selected.unit.unitType,
    attackerMovementMode: selected.unit.movementMode,
    optionalRules: session?.config.optionalRules,
    targetUnitType: targetUnit?.unitType,
    hexesMoved: selected.state.hexesMovedThisTurn,
    weaponsFiredFromLeftArm: selected.state.weaponsFiredThisTurn,
    weaponsFiredFromRightArm: selected.state.weaponsFiredThisTurn,
    attackerRanThisTurn: selected.state.movementThisTurn === MovementType.Run,
    attackerJumpedThisTurn:
      selected.state.movementThisTurn === MovementType.Jump,
    elevationContext: buildOptionalElevationContext({
      selected,
      targetState,
      physicalGrid,
      targetUnit,
    }),
    terrainContext: buildOptionalTerrainContext({
      selected,
      targetState,
      physicalGrid,
    }),
  };
}

function committedPhysicalAttackSummary({
  physicalAttackPlan,
  meleeTargets,
  selectedMeleeTarget,
}: Pick<
  PhysicalAttackCommitArgs,
  'physicalAttackPlan' | 'meleeTargets' | 'selectedMeleeTarget'
>): string {
  const target = meleeTargets.find((t) => t.id === selectedMeleeTarget?.id);
  return `Declared ${attackTypeLabel(
    physicalAttackPlan.attackType ?? 'punch',
    physicalAttackPlan.limb ?? undefined,
  )} vs ${target?.name ?? 'target'}`;
}

export function applyPhysicalAttackCommitResult(
  result: PhysicalAttackCommitResult,
  setSession: (session: IGameSession) => void,
  setCommittedSummary: (summary: string) => void,
): void {
  if (result.nextSession) setSession(result.nextSession);
  if (result.summary) setCommittedSummary(result.summary);
}
