import type {
  ICombatRangeHex,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';
import type { IAttackDeclaredPayload } from '@/types/gameplay/GameSessionAttackEvents';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import { unitStateToToken } from '@/lib/gameplay/unitStateToToken';
import { GameEventType } from '@/types/gameplay';
import { RangeBracket } from '@/types/gameplay/HexGridInterfaces';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import { deriveState } from '@/utils/gameplay/gameState';
import { hexEquals } from '@/utils/gameplay/hexMath';
import {
  calculateLOS,
  lineOfSightOptionsFromOptionalRules,
} from '@/utils/gameplay/lineOfSight';

import type { IApplyAttackInput } from './InteractiveSession.actions.attackTypes';

import {
  prepareAttackContext,
  type IAttackPreResolution,
} from './attackContext';

export function indirectInterveningTerrainEffects({
  session,
  grid,
  targetHex,
  indirectFireResolution,
}: {
  readonly session: IGameSession;
  readonly grid: IHexGrid;
  readonly targetHex: IHexCoordinate;
  readonly indirectFireResolution?: IIndirectFireResolution;
}): ReturnType<typeof calculateLOS>['interveningTerrainEffects'] {
  if (
    indirectFireResolution?.permitted !== true ||
    indirectFireResolution.isIndirect !== true ||
    !indirectFireResolution.spotterId
  ) {
    return [];
  }

  const spotter = session.currentState.units[indirectFireResolution.spotterId];
  if (!spotter) return [];
  return calculateLOS(
    spotter.position,
    targetHex,
    grid,
    undefined,
    undefined,
    lineOfSightOptionsFromOptionalRules(session.config.optionalRules),
  ).interveningTerrainEffects;
}

type UnitStateWithPilotSpas = IGameSession['currentState']['units'][string] & {
  readonly abilities?: readonly string[];
  readonly pilotSpas?: readonly string[];
};

function pilotSpasByUnitIdFromState(
  session: IGameSession,
): Readonly<Record<string, readonly string[]>> {
  const pilotSpasByUnitId: Record<string, readonly string[]> = {};
  for (const [unitId, unit] of Object.entries(session.currentState.units)) {
    const state = unit as UnitStateWithPilotSpas;
    const spas = state.pilotSpas ?? state.abilities;
    if (spas) pilotSpasByUnitId[unitId] = spas;
  }
  return pilotSpasByUnitId;
}

function projectionTokensForSession(
  session: IGameSession,
  attackerId: string,
  targetId: string,
): readonly IUnitToken[] {
  const unitsById = new Map(session.units.map((unit) => [unit.id, unit]));
  const attackerSide = session.currentState.units[attackerId]?.side;

  return Object.entries(session.currentState.units).map(([unitId, state]) => {
    const unit = unitsById.get(unitId);
    return unitStateToToken(
      unitId,
      state,
      {
        name: unit?.name ?? unitId,
        side: state.side,
      },
      {
        isSelected: unitId === attackerId,
        isValidTarget:
          unitId === targetId ||
          (attackerSide !== undefined &&
            state.side !== attackerSide &&
            !state.destroyed),
        isActiveTarget: unitId === targetId,
      },
    );
  });
}

function weaponStatusForAttack(weapon: IWeaponAttack): IWeaponStatus {
  return {
    id: weapon.weaponId,
    name: weapon.weaponName,
    mode: weapon.mode,
    location: weapon.location ?? weapon.vehicleMountLocation ?? 'unknown',
    mountingArc: weapon.mountingArc,
    mountingArcs: weapon.mountingArcs,
    vehicleMountLocation: weapon.vehicleMountLocation,
    vehicleIsTurretMounted: weapon.vehicleIsTurretMounted,
    destroyed: false,
    firedThisTurn: false,
    heat: weapon.heat,
    damage: weapon.damage,
    ranges: {
      short: weapon.shortRange,
      medium: weapon.mediumRange,
      long: weapon.longRange,
      ...(weapon.extremeRange !== undefined
        ? { extreme: weapon.extremeRange }
        : {}),
      ...(weapon.minRange > 0 ? { minimum: weapon.minRange } : {}),
    },
    isTorpedo: weapon.isTorpedo,
    // Audit B-1 (W1.1): carry the called-shot election into the committed
    // projection so its hydrated attacker state matches declareAttack's and
    // the enrichment below never stamps a number missing the +3 modifier.
    calledShot: weapon.calledShot,
    teammateCalledShot: weapon.teammateCalledShot,
  };
}

export function deriveCommittedAttackProjection({
  input,
  weaponAttacks,
  targetHex,
}: {
  readonly input: IApplyAttackInput;
  readonly weaponAttacks: readonly IWeaponAttack[];
  readonly targetHex: IHexCoordinate;
}): ICombatRangeHex | undefined {
  if (!input.grid) return undefined;

  const tokens = projectionTokensForSession(
    input.session,
    input.attackerId,
    input.targetId,
  );
  const attacker = tokens.find((token) => token.unitId === input.attackerId);
  if (!attacker) return undefined;

  return deriveCombatRangeHexes({
    attacker,
    targetUnitId: input.targetId,
    hexes: Array.from(input.grid.hexes.values(), (hex) => hex.coord),
    grid: input.grid,
    tokens,
    weapons: weaponAttacks.map(weaponStatusForAttack),
    combatState: input.session.currentState,
  }).find((hex) => hexEquals(hex.hex, targetHex));
}

function preResolutionFromProjection(
  projection: ICombatRangeHex | undefined,
): IAttackPreResolution | undefined {
  if (
    projection?.indirectFireAvailable !== true ||
    projection.indirectFireBasis === undefined
  ) {
    return undefined;
  }

  return {
    kind: 'indirect',
    resolution: {
      permitted: true,
      isIndirect: true,
      spotterId: projection.indirectFireSpotterId ?? null,
      basis: projection.indirectFireBasis,
      toHitPenalty: projection.indirectFireToHitPenalty ?? 0,
      forwardObserverApplied: projection.indirectFireForwardObserver,
      // Audit C-5: the spotter-attacked flag replaces the retired
      // spotterGunnery/spotterSkillModifier fields (artillery-only rule).
      spotterAttackedThisTurn: projection.indirectFireSpotterAttacked,
      spotterMovementPenaltyCancelled: projection.indirectFirePenaltyCancelled,
    },
  };
}

function enrichedWeaponAttackData({
  payload,
  projection,
  weaponAttacks,
}: {
  readonly payload: IAttackDeclaredPayload;
  readonly projection: ICombatRangeHex;
  readonly weaponAttacks: readonly IWeaponAttack[];
}): IAttackDeclaredPayload['weaponAttacks'] {
  const projectionByWeaponId = new Map(
    projection.weaponRangeOptions.map((option) => [option.weaponId, option]),
  );
  const attacksByWeaponId = new Map(
    weaponAttacks.map((weapon) => [weapon.weaponId, weapon]),
  );

  return (payload.weaponAttacks ?? []).map((attack) => {
    const projected = projectionByWeaponId.get(attack.weaponId);
    const source = attacksByWeaponId.get(attack.weaponId);
    return {
      ...attack,
      ...(source?.mode ? { mode: source.mode } : {}),
      ...(projected?.rangeBracket
        ? { rangeBracket: projected.rangeBracket }
        : {}),
      ...(projected?.toHitNumber !== undefined
        ? { toHitNumber: projected.toHitNumber }
        : {}),
      ...(projected?.toHitModifiers
        ? { modifiers: projected.toHitModifiers }
        : {}),
    };
  });
}

/**
 * Stamps the committed-attack projection's to-hit data onto the AttackDeclared
 * payload that `resolveAttack` rolls against.
 *
 * Audit B-1 (W1.1) invariant: this stamp is only legal because the projection
 * hydrates attacker/target state through the SAME
 * buildWeaponAttackAttackerToHitState / buildWeaponAttackTargetToHitState
 * builders declareAttack uses (see combatProjection.toHit.ts), so the stamped
 * number contains the engine's full hydrated modifier set (pilot wounds,
 * sensor hits, actuator damage, SPAs, quirks, evasion, called shot) PLUS
 * projection-only context the engine cannot derive here (C3 bracket election,
 * ground-to-air altitude, vehicle turret pivot, per-weapon brackets). It must
 * never regress to a hand-built subset of the engine's state.
 */
export function enrichAttackDeclaredEventFromProjection({
  session,
  attackerId,
  targetId,
  projection,
  weaponAttacks,
}: {
  readonly session: IGameSession;
  readonly attackerId: string;
  readonly targetId: string;
  readonly projection: ICombatRangeHex | undefined;
  readonly weaponAttacks: readonly IWeaponAttack[];
}): IGameSession {
  if (!projection?.attackable || projection.toHitNumber === undefined) {
    return session;
  }

  const eventIndex = session.events.findLastIndex((event) => {
    if (event.type !== GameEventType.AttackDeclared) return false;
    const payload = event.payload as IAttackDeclaredPayload;
    return payload.attackerId === attackerId && payload.targetId === targetId;
  });
  if (eventIndex === -1) return session;

  const event = session.events[eventIndex];
  const payload = event.payload as IAttackDeclaredPayload;
  const range =
    projection.rangeBracket === RangeBracket.OutOfRange
      ? payload.range
      : projection.rangeBracket;
  const enrichedPayload: IAttackDeclaredPayload = {
    ...payload,
    range,
    toHitNumber: projection.toHitNumber,
    modifiers: projection.toHitModifiers ?? payload.modifiers,
    weaponAttacks: enrichedWeaponAttackData({
      payload,
      projection,
      weaponAttacks,
    }),
  };
  const events = session.events.map((candidate, index) => {
    if (index === eventIndex) {
      return {
        ...candidate,
        payload: enrichedPayload,
      };
    }
    if (
      index > eventIndex &&
      candidate.type === GameEventType.IndirectFireSpotterSelected &&
      projection.indirectFireSpotterId
    ) {
      // Audit C-5: stamp the spotter-attacked flag (the retired
      // spotterGunnery/spotterSkillModifier stamps described an
      // artillery-only modifier that never applied to LRM indirect fire).
      return {
        ...candidate,
        payload: {
          ...candidate.payload,
          spotterAttackedThisTurn: projection.indirectFireSpotterAttacked,
        },
      };
    }
    return candidate;
  });

  return {
    ...session,
    events,
    currentState: deriveState(session.id, events),
  };
}

export function attackPreResolutionForInteractiveAttack({
  input,
  committedAttackProjection,
  usableWeaponAttacks,
}: {
  readonly input: IApplyAttackInput;
  readonly committedAttackProjection: ICombatRangeHex | undefined;
  readonly usableWeaponAttacks: readonly IWeaponAttack[];
}): IAttackPreResolution | undefined {
  const projectedPreResolution = preResolutionFromProjection(
    committedAttackProjection,
  );
  if (projectedPreResolution) return projectedPreResolution;
  if (committedAttackProjection !== undefined) return undefined;
  if (!input.grid || usableWeaponAttacks.length === 0) return undefined;

  const pilotSpasByUnitId =
    input.pilotSpasByUnitId ?? pilotSpasByUnitIdFromState(input.session);
  return prepareAttackContext(
    input.attackerId,
    usableWeaponAttacks.map((weapon) => weapon.weaponId),
    input.targetId,
    input.session.currentState,
    input.grid,
    pilotSpasByUnitId,
    input.session.config.optionalRules,
  );
}
