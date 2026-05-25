import {
  Facing,
  GamePhase,
  GameStatus,
  type IGameSession,
  type IUnitGameState,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { getTorsoTwistFromSecondaryFacing } from './firingArc';
import { createFacingChangedEvent } from './gameEvents';
import { appendEvent } from './gameSessionCore';

export const TORSO_TWIST_QUIRK_IDS = {
  EXTENDED: 'ext_twist',
  NO_TWIST: 'no_twist',
} as const;

export type TorsoTwistLegalityReason =
  | 'inactive-session'
  | 'wrong-phase'
  | 'unknown-unit'
  | 'unit-inactive'
  | 'non-battlemech'
  | 'prone'
  | 'bracing'
  | 'already-twisted'
  | 'no-twist-quirk'
  | 'invalid-facing';

export type TorsoTwistLegality =
  | { readonly ok: true; readonly secondaryFacing: Facing }
  | { readonly ok: false; readonly reason: TorsoTwistLegalityReason };

export function torsoTwist(
  session: IGameSession,
  unitId: string,
  secondaryFacing: Facing,
): IGameSession {
  const legality = validateTorsoTwist(session, unitId, secondaryFacing);
  if (!legality.ok) return session;

  const unit = session.currentState.units[unitId];
  const twist = getTorsoTwistFromSecondaryFacing(
    unit.facing,
    legality.secondaryFacing,
  );

  return appendEvent(
    session,
    createFacingChangedEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      session.currentState.phase,
      unitId,
      {
        secondaryFacing: legality.secondaryFacing,
        ...(twist ? { torsoTwist: twist } : {}),
      },
    ),
  );
}

export function validateTorsoTwist(
  session: IGameSession,
  unitId: string,
  secondaryFacing: Facing,
): TorsoTwistLegality {
  const { phase, status } = session.currentState;
  if (status !== GameStatus.Active)
    return { ok: false, reason: 'inactive-session' };
  if (phase !== GamePhase.WeaponAttack)
    return { ok: false, reason: 'wrong-phase' };

  const unit = session.currentState.units[unitId];
  if (!unit) return { ok: false, reason: 'unknown-unit' };
  if (
    unit.destroyed ||
    unit.hasRetreated ||
    unit.hasEjected ||
    !unit.pilotConscious ||
    unit.shutdown
  ) {
    return { ok: false, reason: 'unit-inactive' };
  }
  if (!isBattleMechLike(unit.unitType)) {
    return { ok: false, reason: 'non-battlemech' };
  }
  if (unit.prone) return { ok: false, reason: 'prone' };
  if (unit.isBracing) return { ok: false, reason: 'bracing' };
  if (hasTorsoTwistQuirk(unit.unitQuirks, TORSO_TWIST_QUIRK_IDS.NO_TWIST)) {
    return { ok: false, reason: 'no-twist-quirk' };
  }
  if (isAlreadyTwisted(unit)) {
    return { ok: false, reason: 'already-twisted' };
  }

  const normalized = normalizeFacing(secondaryFacing);
  const maxDistance = hasTorsoTwistQuirk(
    unit.unitQuirks,
    TORSO_TWIST_QUIRK_IDS.EXTENDED,
  )
    ? 2
    : 1;

  if (hexsideDistance(unit.facing, normalized) > maxDistance) {
    return { ok: false, reason: 'invalid-facing' };
  }

  return { ok: true, secondaryFacing: normalized };
}

export function normalizeFacing(facing: number): Facing {
  return (((Math.trunc(facing) % 6) + 6) % 6) as Facing;
}

function isBattleMechLike(unitType: string | undefined): boolean {
  return (
    unitType === undefined ||
    unitType === UnitType.BATTLEMECH ||
    unitType === UnitType.OMNIMECH ||
    unitType === UnitType.INDUSTRIALMECH
  );
}

function isAlreadyTwisted(unit: IUnitGameState): boolean {
  if (unit.torsoTwist !== undefined) return true;
  return (
    unit.secondaryFacing !== undefined &&
    normalizeFacing(unit.secondaryFacing) !== normalizeFacing(unit.facing)
  );
}

function hexsideDistance(from: Facing, to: Facing): number {
  const diff = Math.abs(normalizeFacing(to) - normalizeFacing(from));
  return Math.min(diff, 6 - diff);
}

function hasTorsoTwistQuirk(
  unitQuirks: readonly string[] | undefined,
  quirkId: string,
): boolean {
  return (unitQuirks ?? []).some((quirk) => quirk === quirkId);
}
