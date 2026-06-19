import type {
  MovementEnhancementActivationKind,
  StandUpMode,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';
import type {
  Facing,
  IHexCoordinate,
  MovementType,
} from '@/types/gameplay/HexGridInterfaces';
import type { WeaponFireMode } from '@/types/gameplay/IndirectFireInterfaces';
import type {
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

import { GamePhase, GameStatus } from '@/types/gameplay/GameSessionInterfaces';
import { createUnitEjectedEvent } from '@/utils/gameplay/gameEvents';
import {
  activateMovementEnhancement as activateMovementEnhancementAction,
  attemptStandUp as attemptStandUpAction,
  declarePhysicalAttack,
  goProne as goProneAction,
  requestSpot as requestSpotAction,
  torsoTwist as torsoTwistAction,
  type IPhysicalAttackContext,
} from '@/utils/gameplay/gameSession';
import { declarePlayerWithdrawal } from '@/utils/gameplay/morale';

import type { IInteractiveSessionRuntimeContext } from './InteractiveSession.runtime';

import {
  applyInteractiveSessionAttack,
  applyInteractiveSessionMovement,
  applyInteractiveSessionRuntimeMovementState,
} from './InteractiveSession.actions';
import {
  d6RollerForInteractiveSessionResolvers,
  diceRollerForInteractiveSessionResolvers,
  elevationDifferenceBetweenInteractiveSessionUnits,
  physicalContextByInteractiveSessionUnit,
  tryFinalizeAndPublishInteractiveSession,
} from './InteractiveSession.lifecycle';
import { buildJumpJetAttackSessionContext } from './InteractiveSession.physicalAttackContext';
import { appendAndPersistInteractiveSessionEvent } from './InteractiveSession.sessionEvents';

export type ApplyMovementArgs = [
  unitId: string,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  path?: readonly IHexCoordinate[],
  standUpMode?: StandUpMode,
  options?: {
    readonly hullDownEntryAttempt?: boolean;
    readonly goProneAttempt?: boolean;
  },
];

export function applyInteractiveSessionMovementCommand(
  context: IInteractiveSessionRuntimeContext,
  ...args: ApplyMovementArgs
): void {
  const [unitId, to, facing, movementType, path, standUpMode, options] = args;
  context.setSession(
    applyInteractiveSessionMovement({
      session: context.getSession(),
      grid: context.grid,
      movementByUnit: context.movementByUnit,
      unitId,
      to,
      facing,
      movementType,
      path,
      standUpMode,
      hullDownEntryAttempt: options?.hullDownEntryAttempt,
      goProneAttempt: options?.goProneAttempt,
      diceRoller: diceRollerForInteractiveSessionResolvers(context),
    }),
  );
  tryFinalizeAndPublishInteractiveSession(context);
}

export function attemptInteractiveSessionStandUp(
  context: IInteractiveSessionRuntimeContext,
  unitId: string,
  mode?: StandUpMode,
): void {
  const session = context.getSession();
  if (session.currentState.status !== GameStatus.Active) return;
  if (session.currentState.phase !== GamePhase.Movement) return;

  context.setSession(
    attemptStandUpAction(
      session,
      unitId,
      diceRollerForInteractiveSessionResolvers(context),
      mode,
    ),
  );
  tryFinalizeAndPublishInteractiveSession(context);
}

export function goInteractiveSessionProne(
  context: IInteractiveSessionRuntimeContext,
  unitId: string,
): void {
  context.setSession(goProneAction(context.getSession(), unitId));
  tryFinalizeAndPublishInteractiveSession(context);
}

export function activateInteractiveSessionMovementEnhancement(
  context: IInteractiveSessionRuntimeContext,
  unitId: string,
  enhancement: MovementEnhancementActivationKind,
): void {
  context.setSession(
    activateMovementEnhancementAction(
      context.getSession(),
      unitId,
      enhancement,
    ),
  );
  tryFinalizeAndPublishInteractiveSession(context);
}

export function twistInteractiveSessionTorso(
  context: IInteractiveSessionRuntimeContext,
  unitId: string,
  secondaryFacing: Facing,
): void {
  context.setSession(
    torsoTwistAction(context.getSession(), unitId, secondaryFacing),
  );
  tryFinalizeAndPublishInteractiveSession(context);
}

export function applyInteractiveSessionRuntimeMovementStateCommand(
  context: IInteractiveSessionRuntimeContext,
  unitId: string,
  patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
): void {
  context.setSession(
    applyInteractiveSessionRuntimeMovementState({
      session: context.getSession(),
      unitId,
      patch,
      diceRoller: d6RollerForInteractiveSessionResolvers(context),
      tonnageByUnit: context.tonnageByUnit,
    }),
  );
  tryFinalizeAndPublishInteractiveSession(context);
}

export function applyInteractiveSessionAttackCommand(
  context: IInteractiveSessionRuntimeContext,
  attackerId: string,
  targetId: string,
  weaponIds: readonly string[],
  weaponModesByWeaponId?: Readonly<Record<string, WeaponFireMode>>,
  selectedAMSWeaponIds?: Readonly<Record<string, string>>,
): void {
  const targetUnit = context.getSession().currentState.units[targetId];
  context.setSession(
    applyInteractiveSessionAttack({
      session: context.getSession(),
      weaponsByUnit: context.weaponsByUnit,
      attackerId,
      targetId,
      weaponIds,
      weaponModesByWeaponId,
      selectedAMSWeaponIds,
      grid: context.grid,
      targetHex: targetUnit?.position,
    }),
  );
  tryFinalizeAndPublishInteractiveSession(context);
}

export function applyInteractiveSessionPhysicalAttackCommand(
  context: IInteractiveSessionRuntimeContext,
  attackerId: string,
  targetId: string,
  attackType: PhysicalAttackType,
  limb?: PhysicalAttackLimb,
): void {
  const baseContext =
    physicalContextByInteractiveSessionUnit(context).get(attackerId);
  if (!baseContext) return;

  const elevationDifference = elevationDifferenceBetweenInteractiveSessionUnits(
    context,
    attackerId,
    targetId,
  );
  const attackContext: IPhysicalAttackContext = {
    ...baseContext,
    ...buildJumpJetAttackSessionContext({
      attackType,
      limb,
      baseContext,
      elevationDifference,
      jumpMP: context.movementByUnit.get(attackerId)?.jumpMP ?? 0,
    }),
    elevationDifference,
    limb,
    targetMovementComplete: true,
  };

  context.setSession(
    declarePhysicalAttack(
      context.getSession(),
      attackerId,
      targetId,
      attackType,
      attackContext,
    ),
  );
  tryFinalizeAndPublishInteractiveSession(context);
}

export function requestInteractiveSessionSpot(
  context: IInteractiveSessionRuntimeContext,
  unitId: string,
  targetId: string,
): void {
  context.setSession(requestSpotAction(context.getSession(), unitId, targetId));
  tryFinalizeAndPublishInteractiveSession(context);
}

export function declareInteractiveSessionWithdrawal(
  context: IInteractiveSessionRuntimeContext,
  unitId: string,
  edge: 'north' | 'south' | 'east' | 'west',
): void {
  context.setSession(
    declarePlayerWithdrawal(context.getSession(), unitId, edge),
  );
  tryFinalizeAndPublishInteractiveSession(context);
}

export function ejectInteractiveSessionUnit(
  context: IInteractiveSessionRuntimeContext,
  unitId: string,
): void {
  const session = context.getSession();
  if (session.currentState.status !== GameStatus.Active) return;

  const unit = session.currentState.units[unitId];
  if (!unit || unit.destroyed || unit.hasRetreated || unit.hasEjected) return;

  appendAndPersistInteractiveSessionEvent(
    context,
    createUnitEjectedEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      session.currentState.phase,
      unitId,
      'player_declared',
    ),
  );
  tryFinalizeAndPublishInteractiveSession(context);
}
