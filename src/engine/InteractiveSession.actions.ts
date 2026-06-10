/**
 * Interactive Session — player-action collaborator.
 *
 * Extracted from `InteractiveSession` so the class stays a thin
 * state-machine coordinator. This module owns the declare-then-lock
 * logic for the two human-driven actions: declaring a unit's movement
 * and declaring a weapon attack.
 *
 * Each function is pure with respect to the session: it takes the
 * current `IGameSession` plus the cached lookup maps and returns the
 * next session. The coordinator keeps ownership of the trailing
 * `tryFinalizeAndPublish()` call so the once-per-session outcome guard
 * stays in one place. Behaviour is preserved exactly.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IComponentDamageState } from '@/types/gameplay';
import type {
  ICombatRangeHex,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';
import type {
  IAttackDeclaredPayload,
  IAttackInvalidPayload,
} from '@/types/gameplay/GameSessionAttackEvents';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IMovementInvalidPayload,
  IRuntimeMovementStateChangedPayload,
  StandUpMode,
} from '@/types/gameplay/GameSessionMovementEvents';
import type {
  IIndirectFireResolution,
  WeaponFireMode,
} from '@/types/gameplay/IndirectFireInterfaces';
import type { D6Roller } from '@/utils/gameplay/diceTypes';
import type { DiceRoller } from '@/utils/gameplay/diceTypes';

import { getHeatMovementPenalty } from '@/constants/heat';
import {
  calculateSwarmDamage,
  type IBALegAttackSquadDef,
  type IBASwarmFireSquadDef,
} from '@/lib/combat/baCombat';
import { unitStateToToken } from '@/lib/gameplay/unitStateToToken';
import { GameEventType } from '@/types/gameplay';
import {
  Facing,
  MovementType,
  RangeBracket,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import {
  INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
  groundToAirIndirectWeaponBlockedReason,
} from '@/utils/gameplay/aerospace/groundToAir';
import { applyAirMekLandingControlPSR } from '@/utils/gameplay/airMekLandingPsr';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import {
  determineArc,
  firingArcProjectionLabel,
} from '@/utils/gameplay/firingArcs';
import {
  createAttackInvalidEvent,
  createMovementInvalidEvent,
  createRuntimeMovementStateChangedEvent,
} from '@/utils/gameplay/gameEvents';
import {
  createLegAttackResolvedEvent,
  createSwarmDamageEvent,
} from '@/utils/gameplay/gameEvents/battleArmor';
import {
  declareAttack,
  declareMovement,
  lockAttack,
  lockMovement,
  attemptStandUp,
} from '@/utils/gameplay/gameSession';
import { appendEvent } from '@/utils/gameplay/gameSession';
import { deriveState } from '@/utils/gameplay/gameState';
import { isGyroDestroyedForType } from '@/utils/gameplay/gyroRules';
import { coordToKey, hexDistance, hexEquals } from '@/utils/gameplay/hexMath';
import {
  hullDownLegWeaponBlockedReason,
  hullDownVehicleFrontWeaponBlockedReason,
  isRepresentedVehicleAttacker,
} from '@/utils/gameplay/hullDownRestrictions';
import { semiGuidedTagIndirectFireBlockedReason } from '@/utils/gameplay/indirectFire';
import {
  calculateLOS,
  formatLOSBlockedDetails,
} from '@/utils/gameplay/lineOfSight';
import {
  calculateMovementHeat,
  gridWithUnitOccupants,
  getHullDownEntryCost,
  getHullDownExitCost,
  getMaxMP,
  getStandingCost,
  hullDownSupportDestroyedReason,
  isMekStyleHullDownExitCapability,
  resolveRuntimeMovementCapability,
  validateCommittedMovement,
} from '@/utils/gameplay/movement';
import { pendingAltitudeControlMovementCost } from '@/utils/gameplay/movement/altitudeControlAccounting';
import { automaticWigeLandingRuntimePatch } from '@/utils/gameplay/movement/automaticWigeLanding';
import { pendingConversionMovementCost } from '@/utils/gameplay/movement/conversionAccounting';
import { getWeaponRangeBracket } from '@/utils/gameplay/range';
import {
  gameUnitUsesMekHorizontalCover,
  gameUnitUsesMekWaterCover,
  getTargetCoverInfo,
} from '@/utils/gameplay/terrainCover';
import { calculateTargetTerrainModifierFromHex } from '@/utils/gameplay/toHit';
import {
  representedWaterAttackInvalidState,
  weaponPassesRepresentedWaterAttackRules,
} from '@/utils/gameplay/underwaterAttacks';
import { canPlayerSeeUnit } from '@/utils/gameplay/visibility';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';
import { weaponMountCoversTargetArc } from '@/utils/gameplay/weaponMountArcs';

import {
  prepareAttackContext,
  type IAttackPreResolution,
} from './attackContext';

const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

/**
 * Inputs for `applyInteractiveSessionMovement` — the live session, the
 * grid the pathfinder uses, and the cached per-unit movement maps.
 */
export interface IApplyMovementInput {
  readonly session: IGameSession;
  readonly grid: IHexGrid;
  readonly movementByUnit: Map<string, IMovementCapability>;
  readonly unitId: string;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  /** Optional pre-computed path; built from the grid when omitted. */
  readonly path?: readonly IHexCoordinate[];
  /** Optional authoritative roller for stand-up PSR resolution. */
  readonly diceRoller?: DiceRoller;
  /** Normal GET_UP or TacOps CAREFUL_STAND for prone stand-up attempts. */
  readonly standUpMode?: StandUpMode;
  /** MegaMek HULL_DOWN posture transition for standing Mek-style units. */
  readonly hullDownEntryAttempt?: boolean;
  /** MegaMek GO_PRONE posture transition from hull-down to prone. */
  readonly goProneAttempt?: boolean;
}

/**
 * Declare and lock a unit's movement for the current Movement phase.
 * Returns the unchanged session when the unit id is unknown (callers
 * treat a missing unit as a no-op). When no explicit path is given the
 * event path is rebuilt from the grid so movement costs stay in
 * lockstep with the pathfinder.
 */
export function applyInteractiveSessionMovement(
  input: IApplyMovementInput,
): IGameSession {
  const unit = input.session.currentState.units[input.unitId];
  if (!unit) return input.session;

  const from = unit.position;
  const pendingConversion = pendingConversionMovementCost(unit);
  const pendingAltitudeControl = pendingAltitudeControlMovementCost(unit);
  const gridWithOccupants = gridWithUnitOccupants(
    input.grid,
    input.session.currentState.units,
  );
  const rawMovementCapability = input.movementByUnit.get(input.unitId);
  const movementCapability = rawMovementCapability
    ? (resolveRuntimeMovementCapability(unit, rawMovementCapability) ??
      rawMovementCapability)
    : undefined;
  const validation = validateCommittedMovement({
    grid: gridWithOccupants,
    unit,
    to: input.to,
    facing: input.facing,
    movementType: input.movementType,
    capability: movementCapability,
    path: input.path,
    standUpMode: input.standUpMode,
    optionalRules: input.session.config.optionalRules,
  });

  if (!validation.valid) {
    return appendInteractiveMovementInvalid(
      input.session,
      input.unitId,
      from,
      input.to,
      input.facing,
      input.movementType,
      validation.reason,
      validation.details,
      validation.mpCost,
      validation.heatGenerated,
    );
  }

  if (input.hullDownEntryAttempt === true) {
    const invalidHullDownEntryDetails = hullDownEntryInvalidDetails({
      unit,
      movementCapability,
      from,
      to: input.to,
      facing: input.facing,
      movementType: input.movementType,
      optionalRules: input.session.config.optionalRules,
    });
    const hullDownEntryCost = movementCapability
      ? getHullDownEntryCost(unit, movementCapability)
      : 0;
    if (invalidHullDownEntryDetails) {
      return appendInteractiveMovementInvalid(
        input.session,
        input.unitId,
        from,
        input.to,
        input.facing,
        input.movementType,
        'InvalidDestination',
        invalidHullDownEntryDetails,
        hullDownEntryCost,
        0,
      );
    }

    let session = input.session;
    session = declareMovement(
      session,
      input.unitId,
      from,
      from,
      unit.facing,
      MovementType.Walk,
      hullDownEntryCost,
      calculateMovementHeat(MovementType.Walk, 0, {
        movementMode: movementCapability?.movementMode,
        movementHeatProfile: movementCapability?.movementHeatProfile,
        partialWingJumpBonus: movementCapability?.partialWingJumpBonus,
      }),
      [from],
      { hullDownEntryAttempt: true },
    );
    session = lockMovement(session, input.unitId);
    return session;
  }

  if (input.goProneAttempt === true) {
    const invalidGoProneDetails = hullDownGoProneInvalidDetails({
      unit,
      movementCapability,
      from,
      to: input.to,
      facing: input.facing,
      movementType: input.movementType,
    });
    if (invalidGoProneDetails) {
      return appendInteractiveMovementInvalid(
        input.session,
        input.unitId,
        from,
        input.to,
        input.facing,
        input.movementType,
        'InvalidDestination',
        invalidGoProneDetails,
        0,
        0,
      );
    }

    let session = input.session;
    session = declareMovement(
      session,
      input.unitId,
      from,
      from,
      unit.facing,
      MovementType.Stationary,
      0,
      0,
      [from],
      { goProneAttempt: true },
    );
    session = lockMovement(session, input.unitId);
    return session;
  }

  const standUpAttempt =
    unit.prone === true &&
    movementCapability !== undefined &&
    input.movementType !== MovementType.Jump &&
    input.movementType !== MovementType.Stationary;
  const hullDownExitAttempt =
    movementCapability !== undefined &&
    getHullDownExitCost(unit, movementCapability, input.movementType) > 0;

  let session = input.session;
  let standUpSucceeded: boolean | undefined;
  const standUpMode = input.standUpMode ?? 'normal';
  if (standUpAttempt) {
    const beforeStandEventCount = session.events.length;
    session = attemptStandUp(
      session,
      input.unitId,
      input.diceRoller,
      standUpMode,
      movementCapability,
    );
    standUpSucceeded = session.events
      .slice(beforeStandEventCount)
      .some((event) => event.type === GameEventType.UnitStood);

    if (!standUpSucceeded) {
      session = declareMovement(
        session,
        input.unitId,
        from,
        from,
        unit.facing,
        input.movementType,
        getStandingCost(movementCapability, standUpMode),
        calculateMovementHeat(MovementType.Walk, 0, {
          movementMode: movementCapability.movementMode,
          movementHeatProfile: movementCapability.movementHeatProfile,
          partialWingJumpBonus: movementCapability.partialWingJumpBonus,
        }),
        [from],
        {
          standUpAttempt: true,
          standUpSucceeded: false,
          standUpMode,
          conversionStepCount: pendingConversion.stepCount,
          conversionMpCost: pendingConversion.mpCost,
          altitudeControlStepCount: pendingAltitudeControl.stepCount,
          altitudeControlMpCost: pendingAltitudeControl.mpCost,
        },
      );
      session = lockMovement(session, input.unitId);
      return session;
    }
  }

  session = declareMovement(
    session,
    input.unitId,
    from,
    input.to,
    input.facing,
    input.movementType,
    validation.mpCost,
    validation.heatGenerated,
    validation.path,
    {
      standUpAttempt,
      standUpSucceeded,
      standUpMode,
      hullDownExitAttempt,
      conversionStepCount: pendingConversion.stepCount,
      conversionMpCost: pendingConversion.mpCost,
      altitudeControlStepCount: pendingAltitudeControl.stepCount,
      altitudeControlMpCost: pendingAltitudeControl.mpCost,
    },
  );
  const automaticLandingPatch = automaticWigeLandingRuntimePatch(
    unit,
    input.movementType,
    validation.path,
    input.to,
    { movementMode: movementCapability?.movementMode },
  );
  if (automaticLandingPatch) {
    session = appendEvent(
      session,
      createRuntimeMovementStateChangedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        input.unitId,
        automaticLandingPatch,
      ),
    );
  }
  session = lockMovement(session, input.unitId);
  return session;
}

export interface IApplyRuntimeMovementStateInput {
  readonly session: IGameSession;
  readonly unitId: string;
  readonly patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>;
  readonly diceRoller?: D6Roller;
  readonly tonnageByUnit?: ReadonlyMap<string, number>;
}

export function applyInteractiveSessionRuntimeMovementState(
  input: IApplyRuntimeMovementStateInput,
): IGameSession {
  if (!input.session.currentState.units[input.unitId]) {
    return input.session;
  }

  const session = appendEvent(
    input.session,
    createRuntimeMovementStateChangedEvent(
      input.session.id,
      input.session.events.length,
      input.session.currentState.turn,
      input.unitId,
      input.patch,
    ),
  );
  return applyAirMekLandingControlPSR(
    session,
    input.unitId,
    input.patch,
    input.diceRoller,
    input.tonnageByUnit?.get(input.unitId),
  );
}

function hullDownEntryInvalidDetails(input: {
  readonly unit: IGameSession['currentState']['units'][string];
  readonly movementCapability?: IMovementCapability;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly optionalRules?: readonly string[];
}): string | null {
  if (input.movementType !== MovementType.Walk) {
    return 'Enter hull-down is a same-hex walk posture action';
  }
  if (!hexEquals(input.from, input.to) || input.facing !== input.unit.facing) {
    return 'Enter hull-down must stay in the current hex and facing';
  }
  if (input.unit.hullDown === true) {
    return 'Unit is already hull-down';
  }
  if (
    !input.movementCapability ||
    !isMekStyleHullDownExitCapability(input.movementCapability)
  ) {
    return 'Hull-down entry is only available for Mek-style movement';
  }
  if (
    isGyroDestroyedForType(
      input.unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE,
      input.unit.gyroType,
      { optionalRules: input.optionalRules },
    )
  ) {
    return 'Cannot enter hull-down with a destroyed gyro';
  }

  const destroyedSupportReason = hullDownSupportDestroyedReason(
    input.unit,
    input.movementCapability,
  );
  if (destroyedSupportReason) {
    return destroyedSupportReason;
  }

  const hullDownEntryCost = getHullDownEntryCost(
    input.unit,
    input.movementCapability,
  );
  const heatPenalty = getHeatMovementPenalty(input.unit.heat);
  const effectiveWalkMP = getMaxMP(
    input.movementCapability,
    MovementType.Walk,
    heatPenalty,
  );
  if (effectiveWalkMP < hullDownEntryCost) {
    return heatPenalty > 0
      ? `Needs ${hullDownEntryCost} MP to enter hull-down after heat penalty`
      : `Needs ${hullDownEntryCost} MP to enter hull-down`;
  }

  return null;
}

function hullDownGoProneInvalidDetails(input: {
  readonly unit: IGameSession['currentState']['units'][string];
  readonly movementCapability?: IMovementCapability;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
}): string | null {
  if (input.movementType !== MovementType.Stationary) {
    return 'Go Prone from hull-down is a stationary posture action';
  }
  if (!hexEquals(input.from, input.to) || input.facing !== input.unit.facing) {
    return 'Go Prone from hull-down must stay in the current hex and facing';
  }
  if (input.unit.prone === true) {
    return 'Unit is already prone';
  }
  if (input.unit.hullDown !== true) {
    return 'Unit must be hull-down before going prone';
  }
  if (
    !input.movementCapability ||
    !isMekStyleHullDownExitCapability(input.movementCapability)
  ) {
    return 'Hull-down go-prone is only available for Mek-style movement';
  }
  return null;
}

function appendInteractiveMovementInvalid(
  session: IGameSession,
  unitId: string,
  from: IHexCoordinate,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  reason: IMovementInvalidPayload['reason'],
  details?: string,
  mpCost?: number,
  heatGenerated?: number,
): IGameSession {
  return appendEvent(
    session,
    createMovementInvalidEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      unitId,
      from,
      to,
      facing,
      movementType,
      reason,
      details,
      mpCost,
      heatGenerated,
    ),
  );
}

/**
 * Inputs for `applyInteractiveSessionAttack` — the live session and the
 * cached per-unit weapon map.
 *
 * Wave 8 PR-K5: `grid` and `targetHex` are OPTIONAL fields. When `grid`
 * is supplied, `applyInteractiveSessionAttack` pre-computes the
 * indirect-fire resolution per weapon and threads the first
 * `permitted && isIndirect` result into `declareAttack` (the engine path
 * established by PR-K + PR-K4). When omitted, the function behaves
 * identically to its pre-K5 contract — no resolution computed, no
 * indirect-fire events emitted.
 */
export interface IApplyAttackInput {
  readonly session: IGameSession;
  readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponIds: readonly string[];
  /** Optional requested per-weapon fire modes; invalid Indirect modes resolve to Direct. */
  readonly weaponModesByWeaponId?: Readonly<Record<string, WeaponFireMode>>;
  /** Optional called-shot intent keyed by weapon id. */
  readonly calledShots?: Readonly<Record<string, boolean>>;
  /** Optional teammate-assisted called-shot intent keyed by weapon id. */
  readonly teammateCalledShots?: Readonly<Record<string, boolean>>;
  /** Wave 8 PR-K5: optional grid for indirect-fire LOS + spotter election. */
  readonly grid?: IHexGrid;
  /** Optional unit-id to canonical pilot SPA ids map for indirect-fire SPAs. */
  readonly pilotSpasByUnitId?: Readonly<Record<string, readonly string[]>>;
  /**
   * Wave 8 PR-K5: optional override of the target hex carried on the
   * indirect-fire event payloads. Defaults to the target unit's live
   * position when omitted.
   */
  readonly targetHex?: IHexCoordinate;
}

const ATTACK_RANGE_BRACKET_RANK: Readonly<Record<RangeBracket, number>> = {
  [RangeBracket.Short]: 0,
  [RangeBracket.Medium]: 1,
  [RangeBracket.Long]: 2,
  [RangeBracket.Extreme]: 3,
  [RangeBracket.OutOfRange]: 4,
};

function bestAttackRangeBracket(
  range: number,
  weaponAttacks: readonly IWeaponAttack[],
): RangeBracket {
  if (weaponAttacks.length === 0) return RangeBracket.Short;

  return weaponAttacks.reduce<RangeBracket>((best, weapon) => {
    const bracket = getWeaponRangeBracket(range, {
      short: weapon.shortRange,
      medium: weapon.mediumRange,
      long: weapon.longRange,
      extreme: weapon.extremeRange,
      minimum: weapon.minRange,
    });
    return ATTACK_RANGE_BRACKET_RANK[bracket] < ATTACK_RANGE_BRACKET_RANK[best]
      ? bracket
      : best;
  }, RangeBracket.OutOfRange);
}

function weaponCoversTargetArc(
  weapon: IWeaponAttack,
  targetArc: ReturnType<typeof determineArc>['arc'],
): boolean {
  return weaponMountCoversTargetArc(weapon, targetArc);
}

function indirectInterveningTerrainEffects({
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
  return calculateLOS(spotter.position, targetHex, grid)
    .interveningTerrainEffects;
}

function appendInteractiveAttackInvalid(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  reason: IAttackInvalidPayload['reason'],
  details: string,
  weaponId?: string,
): IGameSession {
  return appendEvent(
    session,
    createAttackInvalidEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      attackerId,
      targetId,
      reason,
      weaponId,
      details,
    ),
  );
}

type TargetStatusUnit = IGameSession['currentState']['units'][string] & {
  readonly tagDesignated?: boolean;
  readonly ecmProtected?: boolean;
};

function semiGuidedTagAttackBlockedDetails({
  targetUnit,
  weaponAttacks,
  losDetails,
}: {
  readonly targetUnit: IGameSession['currentState']['units'][string];
  readonly weaponAttacks: readonly IWeaponAttack[];
  readonly losDetails: string;
}): string {
  const targetStatus = targetUnit as TargetStatusUnit;
  const indirectBlockedReason = weaponAttacks
    .map((weapon) =>
      semiGuidedTagIndirectFireBlockedReason({
        weaponId: weapon.weaponId,
        equipment: { isSemiGuided: false },
        targetStatus: {
          tagDesignated: targetStatus.tagDesignated === true,
          ecmProtected: targetStatus.ecmProtected === true,
        },
      }),
    )
    .find((reason): reason is string => reason !== undefined);

  return indirectBlockedReason
    ? `${indirectBlockedReason}; ${losDetails}`
    : losDetails;
}

function attackVisibilityBlockedReason(
  input: IApplyAttackInput,
  attackerUnit: IGameSession['currentState']['units'][string],
  targetUnit: IGameSession['currentState']['units'][string],
): string | undefined {
  if (input.session.config.fogOfWar !== true) return undefined;
  if (targetUnit.side === attackerUnit.side) return undefined;
  if (!input.grid) {
    return 'Target visibility cannot be verified without the battle map grid';
  }

  const attackerPlayerId =
    input.session.sideOwners?.[attackerUnit.side] ?? attackerUnit.side;
  const visibilityState = {
    ...input.session.currentState,
    sideOwners: input.session.sideOwners ?? null,
    grid: input.grid,
  };

  if (canPlayerSeeUnit(attackerPlayerId, input.targetId, visibilityState)) {
    return undefined;
  }

  return `Target ${input.targetId} is not currently visible to ${attackerUnit.side}`;
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

function deriveCommittedAttackProjection({
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
      spotterGunnery: projection.indirectFireSpotterGunnery,
      spotterSkillModifier: projection.indirectFireSpotterSkillModifier,
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
function enrichAttackDeclaredEventFromProjection({
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
      return {
        ...candidate,
        payload: {
          ...candidate.payload,
          spotterGunnery: projection.indirectFireSpotterGunnery,
          spotterSkillModifier: projection.indirectFireSpotterSkillModifier,
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

/**
 * Declare and lock a weapon attack for the current WeaponAttack phase.
 * Firing arc is intentionally NOT pre-computed here — `resolveAttack`
 * derives it from live positions + target facing at resolve time.
 *
 * Wave 8 PR-K5/K11: when `input.grid` is supplied, delegates to
 * `prepareAttackContext` to derive the indirect-fire pre-resolution
 * union (direct vs indirect+spotter), then threads it into
 * `declareAttack`. LRM volleys share a single spotter election per
 * declaration (matches MegaMek `Compute.findSpottersForArtillery`).
 */
export function applyInteractiveSessionAttack(
  input: IApplyAttackInput,
): IGameSession {
  const unitWeapons = input.weaponsByUnit.get(input.attackerId) ?? [];
  const weaponAttacks: IWeaponAttack[] = buildWeaponAttacks(
    input.weaponIds,
    unitWeapons,
    input.attackerId,
    input.weaponModesByWeaponId,
    {
      calledShots: input.calledShots,
      teammateCalledShots: input.teammateCalledShots,
    },
  );
  const attackerUnit = input.session.currentState.units[input.attackerId];
  const targetUnit = input.session.currentState.units[input.targetId];
  if (!attackerUnit) return input.session;
  const attackerGameUnit = input.session.units.find(
    (unit) => unit.id === input.attackerId,
  );
  const attackerIsRepresentedVehicle = isRepresentedVehicleAttacker({
    unitType: attackerGameUnit?.unitType,
    combatStateKind: attackerUnit.combatState?.kind,
  });
  if (!targetUnit || targetUnit.destroyed) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'InvalidTarget',
      `Target ${input.targetId} is not a live unit`,
      input.weaponIds[0],
    );
  }
  if (weaponAttacks.length === 0) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'InvalidTarget',
      'No valid weapons selected for this attack',
      input.weaponIds[0],
    );
  }
  const visibilityBlockedReason = attackVisibilityBlockedReason(
    input,
    attackerUnit,
    targetUnit,
  );
  if (visibilityBlockedReason) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'TargetNotVisible',
      visibilityBlockedReason,
      input.weaponIds[0],
    );
  }

  const resolvedTargetHex = input.targetHex ?? targetUnit.position;
  const attackRange = hexDistance(attackerUnit.position, resolvedTargetHex);
  if (attackRange === 0) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'SameHex',
      'Attacker and target occupy the same hex',
      input.weaponIds[0],
    );
  }

  const targetArc = determineArc(
    {
      unitId: input.attackerId,
      coord: attackerUnit.position,
      facing: attackerUnit.facing,
      prone: false,
    },
    resolvedTargetHex,
  ).arc;
  const weaponsInRange = weaponAttacks.filter(
    (weapon) =>
      getWeaponRangeBracket(attackRange, {
        short: weapon.shortRange,
        medium: weapon.mediumRange,
        long: weapon.longRange,
        extreme: weapon.extremeRange,
        minimum: weapon.minRange,
      }) !== RangeBracket.OutOfRange,
  );
  const weaponsInArc = weaponAttacks.filter((weapon) =>
    weaponCoversTargetArc(weapon, targetArc),
  );
  const rangeAndArcWeaponAttacks = weaponsInRange.filter((weapon) =>
    weaponCoversTargetArc(weapon, targetArc),
  );
  const waterAttackInvalidState =
    input.grid && resolvedTargetHex
      ? representedWaterAttackInvalidState({
          grid: input.grid,
          attackerPosition: attackerUnit.position,
          targetPosition: resolvedTargetHex,
          weapons: rangeAndArcWeaponAttacks,
        })
      : undefined;
  const groundToAirIndirectInvalidWeapon = rangeAndArcWeaponAttacks.find(
    (weapon) =>
      groundToAirIndirectWeaponBlockedReason(attackerUnit, targetUnit, weapon),
  );
  const hullDownLegWeaponInvalidWeapon = rangeAndArcWeaponAttacks.find(
    (weapon) => hullDownLegWeaponBlockedReason(attackerUnit.hullDown, weapon),
  );
  const hullDownVehicleFrontWeaponInvalidWeapon = rangeAndArcWeaponAttacks.find(
    (weapon) =>
      hullDownVehicleFrontWeaponBlockedReason(
        attackerUnit.hullDown,
        attackerIsRepresentedVehicle,
        weapon,
      ),
  );
  const usableWeaponAttacks = rangeAndArcWeaponAttacks.filter(
    (weapon) =>
      (input.grid && resolvedTargetHex
        ? weaponPassesRepresentedWaterAttackRules({
            grid: input.grid,
            attackerPosition: attackerUnit.position,
            targetPosition: resolvedTargetHex,
            weapon,
          })
        : true) &&
      !hullDownLegWeaponBlockedReason(attackerUnit.hullDown, weapon) &&
      !hullDownVehicleFrontWeaponBlockedReason(
        attackerUnit.hullDown,
        attackerIsRepresentedVehicle,
        weapon,
      ) &&
      !groundToAirIndirectWeaponBlockedReason(attackerUnit, targetUnit, weapon),
  );
  const committedAttackProjection = deriveCommittedAttackProjection({
    input,
    weaponAttacks,
    targetHex: resolvedTargetHex,
  });
  const pilotSpasByUnitId =
    input.pilotSpasByUnitId ?? pilotSpasByUnitIdFromState(input.session);
  const attackPreResolution =
    preResolutionFromProjection(committedAttackProjection) ??
    (committedAttackProjection === undefined &&
    input.grid &&
    usableWeaponAttacks.length > 0
      ? prepareAttackContext(
          input.attackerId,
          usableWeaponAttacks.map((weapon) => weapon.weaponId),
          input.targetId,
          input.session.currentState,
          input.grid,
          pilotSpasByUnitId,
        )
      : undefined);
  const indirectFireResolution: IIndirectFireResolution | undefined =
    attackPreResolution?.kind === 'indirect'
      ? attackPreResolution.resolution
      : undefined;
  if (weaponsInRange.length === 0) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'OutOfRange',
      `Target at ${attackRange} hexes is outside the selected weapons' range`,
      input.weaponIds[0],
    );
  }
  if (weaponsInArc.length === 0 || usableWeaponAttacks.length === 0) {
    if (waterAttackInvalidState) {
      return appendInteractiveAttackInvalid(
        input.session,
        input.attackerId,
        input.targetId,
        waterAttackInvalidState.reason,
        waterAttackInvalidState.details,
        input.weaponIds[0],
      );
    }
    if (hullDownLegWeaponInvalidWeapon) {
      return appendInteractiveAttackInvalid(
        input.session,
        input.attackerId,
        input.targetId,
        'InvalidTarget',
        hullDownLegWeaponBlockedReason(
          attackerUnit.hullDown,
          hullDownLegWeaponInvalidWeapon,
        )!,
        hullDownLegWeaponInvalidWeapon.weaponId,
      );
    }
    if (hullDownVehicleFrontWeaponInvalidWeapon) {
      return appendInteractiveAttackInvalid(
        input.session,
        input.attackerId,
        input.targetId,
        'InvalidTarget',
        hullDownVehicleFrontWeaponBlockedReason(
          attackerUnit.hullDown,
          attackerIsRepresentedVehicle,
          hullDownVehicleFrontWeaponInvalidWeapon,
        )!,
        hullDownVehicleFrontWeaponInvalidWeapon.weaponId,
      );
    }
    if (groundToAirIndirectInvalidWeapon) {
      return appendInteractiveAttackInvalid(
        input.session,
        input.attackerId,
        input.targetId,
        'InvalidTarget',
        INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
        groundToAirIndirectInvalidWeapon.weaponId,
      );
    }
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'OutOfArc',
      `No selected weapons can fire into the ${firingArcProjectionLabel(targetArc)} arc`,
      input.weaponIds[0],
    );
  }

  const attackRangeBracket = bestAttackRangeBracket(
    attackRange,
    usableWeaponAttacks,
  );

  let directLos: ReturnType<typeof calculateLOS> | undefined;
  if (input.grid && resolvedTargetHex) {
    directLos = calculateLOS(
      attackerUnit.position,
      resolvedTargetHex,
      input.grid,
    );
    const indirectAllowed =
      indirectFireResolution?.permitted === true &&
      indirectFireResolution.isIndirect;
    if (!directLos.hasLOS && !indirectAllowed) {
      const losDetails = formatLOSBlockedDetails(directLos);
      return appendInteractiveAttackInvalid(
        input.session,
        input.attackerId,
        input.targetId,
        'NoLineOfSight',
        semiGuidedTagAttackBlockedDetails({
          targetUnit,
          weaponAttacks: usableWeaponAttacks,
          losDetails,
        }),
        input.weaponIds[0],
      );
    }
  }

  const targetPartialCover =
    input.grid && resolvedTargetHex
      ? getTargetCoverInfo(
          input.grid,
          attackerUnit.position,
          resolvedTargetHex,
          {
            horizontalCoverEligible: gameUnitUsesMekHorizontalCover(
              input.session.units.find((unit) => unit.id === input.targetId),
            ),
            targetHexWaterCoverEligible: gameUnitUsesMekWaterCover(
              input.session.units.find((unit) => unit.id === input.targetId),
            ),
          },
        ).partialCover
      : false;
  const targetTerrainModifier =
    input.grid && resolvedTargetHex
      ? calculateTargetTerrainModifierFromHex(
          input.grid.hexes.get(coordToKey(resolvedTargetHex)),
        )
      : null;

  let session = declareAttack(
    input.session,
    input.attackerId,
    input.targetId,
    usableWeaponAttacks,
    attackRange,
    attackRangeBracket,
    attackPreResolution,
    resolvedTargetHex,
    targetPartialCover,
    directLos?.hasLOS
      ? directLos.interveningTerrainEffects
      : input.grid
        ? indirectInterveningTerrainEffects({
            session: input.session,
            grid: input.grid,
            targetHex: resolvedTargetHex,
            indirectFireResolution,
          })
        : [],
    targetTerrainModifier,
  );
  session = enrichAttackDeclaredEventFromProjection({
    session,
    attackerId: input.attackerId,
    targetId: input.targetId,
    projection: committedAttackProjection,
    weaponAttacks: usableWeaponAttacks,
  });
  session = lockAttack(session, input.attackerId);
  return session;
}

// =============================================================================
// PR-L2 §3 — Swarm-fire-while-attached action handler
// =============================================================================

/**
 * Inputs for `applyInteractiveSessionSwarmFire` — fires a BA squad's non-missile
 * non-body-mounted weapons at the host mek it is currently swarm-attached to,
 * auto-hitting (no to-hit roll) per TacticalOperations swarm-fire rules.
 *
 * The caller is responsible for:
 *   1. Confirming the swarm is in fact attached (the action does not re-validate).
 *   2. Building `squadDef.weapons` filtered down to swarm-eligible weapons
 *      (non-missile, non-body-mounted, non-InfantryAttack).  The dispatch
 *      layer that does this filtering lives in PR-L3; this action handler
 *      trusts its caller's filter.
 *   3. Computing `hostLocation` per the mounted-trooper-adapter mapping
 *      established by PR-L §5.1 (RT-front->1, LT-front->2, RT-rear->3,
 *      LT-rear->4, CT-front->6, CT-rear->5).  The action does not pick a
 *      location; it just stamps whatever the caller chose into the event.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Swarm Fire While Attached)
 */
export interface IApplySwarmFireInput {
  readonly session: IGameSession;
  /** Attacker (BA squad) unit id. */
  readonly squadId: string;
  /** Host (mek) unit id being swarmed. */
  readonly hostUnitId: string;
  /** Squad combat state (new IBASquadCombatState shape). */
  readonly squad: import('@/types/gameplay').IBASquadCombatState;
  /** Pre-filtered swarm-eligible weapons + vibroclaw / myomer flags. */
  readonly squadDef: IBASwarmFireSquadDef;
  /**
   * Host location label to stamp on the SwarmDamage event.  Caller picks
   * this via the PR-L mounted-trooper adapter — front-trooper slots resolve
   * to front locations; rear-trooper slots to rear locations.
   */
  readonly hostLocationLabel: string;
}

/**
 * Resolve one tick of swarm fire from `squadId` against `hostUnitId`.
 *
 * Computes damage via `calculateSwarmDamage` and appends a single
 * `SwarmDamage` event (using the established `createSwarmDamageEvent`
 * factory from the prior `add-battlearmor-combat-behavior` change — its
 * `unitId / targetUnitId / damage / locationLabel` shape exactly matches
 * what this action needs).
 *
 * Returns the original session unchanged when:
 *   - the attacking squad is destroyed (0 active troopers; damage = 0),
 *   - OR the host or squad units cannot be found in `session.currentState`.
 *
 * Otherwise returns the session with one new `SwarmDamage` event appended.
 * The action handler is intentionally side-effect-free beyond appending
 * the event; damage application to the host mek's armor pipeline lives
 * downstream (PR-L3 wires the dispatch layer that consumes this event).
 */
export function applyInteractiveSessionSwarmFire(
  input: IApplySwarmFireInput,
): IGameSession {
  const attackerUnit = input.session.currentState.units[input.squadId];
  const hostUnit = input.session.currentState.units[input.hostUnitId];
  if (!attackerUnit || !hostUnit) return input.session;

  const damage = calculateSwarmDamage(input.squad, input.squadDef);
  if (damage <= 0) return input.session;

  const sequence = input.session.events.length;
  const { turn, phase } = input.session.currentState;
  const event = createSwarmDamageEvent(
    input.session.id,
    sequence,
    turn,
    phase,
    input.squadId,
    input.hostUnitId,
    damage,
    input.hostLocationLabel,
  );

  return appendEvent(input.session, event);
}
// =============================================================================
// PR-L3 §3 — BA leg-attack action handler (Mek + Vehicle targets)
// =============================================================================

/**
 * Inputs for `applyInteractiveSessionLegAttack`. The action handler is
 * intentionally thin — it does NOT pick the rolled leg, does NOT compute
 * the firing arc, and does NOT apply damage to the target's armor. Those
 * concerns live in `resolveMekLegAttack` / `resolveVehicleLegAttack`
 * (in `src/utils/gameplay/battlearmor/legAttackResolver.ts`) and the
 * downstream damage pipeline that consumes the emitted
 * `LegAttackResolved` event.
 *
 * Callers (the dispatch layer) MUST:
 *   1. confirm the attack is legal (squad in same hex as target, etc.),
 *   2. build `squadDef` with the squad's vibroclaw / myomer flags,
 *   3. supply the pre-resolved `ILegAttackResolution` from the resolver
 *      (carries hit / damage / hitLocation / critModifier).
 *
 * Pattern mirror: `applyInteractiveSessionSwarmFire` (PR-L2 §3).
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Leg Attack)
 */
export interface IApplyLegAttackInput {
  readonly session: IGameSession;
  /** Attacker (BA squad) unit id. */
  readonly squadId: string;
  /** Target Mek or Vehicle unit id. */
  readonly targetUnitId: string;
  /**
   * Pre-resolved leg-attack outcome from `resolveMekLegAttack` /
   * `resolveVehicleLegAttack`. The action handler stamps these fields
   * onto the emitted `LegAttackResolved` event.
   */
  readonly resolution: import('@/utils/gameplay/battlearmor/legAttackResolver').ILegAttackResolution;
  /** Surviving troopers in the attacking squad after the resolution. */
  readonly survivingTroopers: number;
}

/**
 * Resolve one BA leg attack from `squadId` against `targetUnitId`.
 *
 * Appends a single `LegAttackResolved` event carrying the pre-resolved
 * outcome. Returns the original session unchanged when the attacking
 * squad or target unit cannot be found.
 *
 * The action handler is intentionally side-effect-free beyond appending
 * the event; damage application to the target's armor pipeline (Mek leg
 * armor or Vehicle arc armor) lives downstream in the dispatch layer
 * that consumes this event. The squad's attack action is considered
 * consumed in BOTH the hit and clean-miss cases.
 */
export function applyInteractiveSessionLegAttack(
  input: IApplyLegAttackInput,
): IGameSession {
  const attackerUnit = input.session.currentState.units[input.squadId];
  const targetUnit = input.session.currentState.units[input.targetUnitId];
  if (!attackerUnit || !targetUnit) return input.session;

  const sequence = input.session.events.length;
  const { turn, phase } = input.session.currentState;
  const event = createLegAttackResolvedEvent(
    input.session.id,
    sequence,
    turn,
    phase,
    input.squadId,
    input.targetUnitId,
    input.resolution.hit,
    input.resolution.damage,
    input.resolution.hitLocation,
    input.resolution.critModifier,
    input.survivingTroopers,
  );

  return appendEvent(input.session, event);
}

// Re-export the squad-def type so callers can build it without reaching
// into `@/lib/combat/baCombat` directly. Mirrors the IBASwarmFireSquadDef
// re-export pattern established by PR-L2.
export type { IBALegAttackSquadDef };
