import type {
  IGameSession,
  IHexGrid,
  IPhysicalAttackDeclaredPayload,
} from '@/types/gameplay';

import { createPhysicalAttackResolvedEvent } from './gameEvents';
import { appendEvent } from './gameSessionCore';
import {
  firedWeaponIdsFromMountedArm,
  firedWeaponIdsFromMountedLeg,
  type IPhysicalAttackContext,
} from './gameSessionPhysicalHelpers';
import {
  isTargetDirectlyAhead,
  isZweihanderPhysicalAttackType,
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  type JumpJetAttackSelectedLeg,
  type PhysicalAttackType,
} from './physicalAttacks';

export function weaponsFiredFromArmForAttack(
  attackerState: IGameSession['currentState']['units'][string],
  attackType: PhysicalAttackType,
  context: IPhysicalAttackContext,
): readonly string[] | undefined {
  if (
    context.twoHandedZweihander === true &&
    isZweihanderPhysicalAttackType(attackType)
  ) {
    return firedWeaponIdsFromMountedArm(attackerState);
  }
  if (context.weaponsFiredFromArm !== undefined) {
    return context.weaponsFiredFromArm;
  }
  if (attackType === 'thrash') return attackerState.weaponsFiredThisTurn ?? [];
  if (attackType === 'grapple') return attackerState.weaponsFiredThisTurn ?? [];
  if (attackType === 'push') return firedWeaponIdsFromMountedArm(attackerState);
  if (
    attackType === 'brush-off' ||
    attackType === 'punch' ||
    (SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES as readonly string[]).includes(
      attackType,
    )
  ) {
    return firedWeaponIdsFromMountedArm(attackerState, context.arm);
  }
  return undefined;
}

export function jumpJetAttackSelectedLegForLimb(
  limb: IPhysicalAttackDeclaredPayload['limb'] | undefined,
  context: IPhysicalAttackContext,
): JumpJetAttackSelectedLeg | undefined {
  if (context.jumpJetAttackSelectedLeg) return context.jumpJetAttackSelectedLeg;
  if (limb === 'leftLeg') return 'left';
  if (limb === 'rightLeg') return 'right';
  return undefined;
}

export function legWeaponFiredThisTurn(
  attackerState: IGameSession['currentState']['units'][string],
  context: IPhysicalAttackContext,
  leg: 'left' | 'right',
): boolean | undefined {
  const explicit =
    leg === 'left'
      ? context.leftLegWeaponFiredThisTurn
      : context.rightLegWeaponFiredThisTurn;
  if (explicit !== undefined) return explicit;
  return firedWeaponIdsFromMountedLeg(attackerState, leg).length > 0;
}

export function isTargetDirectlyBehindFeet(
  attacker: IGameSession['currentState']['units'][string],
  target: IGameSession['currentState']['units'][string],
): boolean {
  const oppositeFacing = ((attacker.facing + 3) % 6) as typeof attacker.facing;
  return isTargetDirectlyAhead(
    attacker.position,
    oppositeFacing,
    target.position,
  );
}

export function terrainAtPosition(
  grid: IHexGrid | undefined,
  position: IGameSession['currentState']['units'][string]['position'],
): string | undefined {
  if (!grid) return undefined;
  return grid.hexes.get(`${position.q},${position.r}`)?.terrain;
}

function canonicalBrushOffTargetUnitType(unitType: string | undefined): string {
  return unitType?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
}

function swarmingHostId(
  target: IGameSession['currentState']['units'][string] | undefined,
): string | undefined {
  if (target?.combatState?.kind !== 'squad') return undefined;
  return target.combatState.state.swarmingUnitId;
}

export function targetIsSwarmingInfantryOnAttacker(
  attackerId: string,
  target: IGameSession['currentState']['units'][string] | undefined,
): boolean | undefined {
  if (!target?.isSwarming) return undefined;
  const targetType = canonicalBrushOffTargetUnitType(target.unitType);
  if (
    targetType !== 'infantry' &&
    targetType !== 'battlearmor' &&
    target.combatState?.kind !== 'squad'
  ) {
    return false;
  }

  const hostId = swarmingHostId(target);
  return hostId === undefined || hostId === attackerId;
}

export function appendInvalidPhysicalResolution(
  session: IGameSession,
  turn: number,
  payload: IPhysicalAttackDeclaredPayload,
  reason: string,
): IGameSession {
  return appendEvent(
    session,
    createPhysicalAttackResolvedEvent(
      session.id,
      session.events.length,
      turn,
      payload.attackerId,
      payload.targetId,
      payload.attackType,
      0,
      Infinity,
      false,
      undefined,
      reason,
    ),
  );
}

export function targetHasINarcPods(
  target: IGameSession['currentState']['units'][string] | undefined,
): boolean {
  return (target?.iNarcPods?.length ?? 0) > 0;
}

export function selectedINarcPodForBrushOff(
  attackType: PhysicalAttackType | string,
  context: IPhysicalAttackContext,
  target: IGameSession['currentState']['units'][string] | undefined,
): IPhysicalAttackDeclaredPayload['selectedINarcPod'] | undefined {
  if (attackType !== 'brush-off') return undefined;
  return context.selectedINarcPod ?? target?.iNarcPods?.[0];
}
