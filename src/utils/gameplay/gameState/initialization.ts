import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  IAmmoSlotState,
  IComponentDamageState,
  IGameState,
  IGameUnit,
  IHexCoordinate,
  IUnitGameState,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import { createBattleArmorCombatState } from '@/utils/gameplay/battlearmor/state';
import { createInfantryCombatStateFromUnit } from '@/utils/gameplay/infantry/state';
import { createProtoMechCombatState } from '@/utils/gameplay/protomech/state';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

export const PLAYER_DEPLOY_ROW = 5;
export const OPPONENT_DEPLOY_ROW = -5;

export const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
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
 * Per-type discriminants that REQUIRE a `combatState` envelope per Council #1
 * (`openspec/council-decisions/2026-05-02-cluster-F-combat-behavior-wiring.md`)
 * and openspec change `wire-combat-behavior-dispatch`. Mech / vehicle / capital
 * unit types intentionally leave `combatState` undefined — vehicles get a
 * `kind: 'vehicle'` envelope in PR9+; capital ships are out of scope.
 */
const PER_TYPE_COMBAT_BEHAVIOR_KINDS: ReadonlySet<UnitType> = new Set([
  UnitType.VEHICLE,
  UnitType.VTOL,
  UnitType.SUPPORT_VEHICLE,
  UnitType.AEROSPACE,
  UnitType.CONVENTIONAL_FIGHTER,
  UnitType.SMALL_CRAFT,
  UnitType.PROTOMECH,
  UnitType.INFANTRY,
  UnitType.BATTLE_ARMOR,
]);

/**
 * Build the per-type `combatState` envelope for a unit, branching on
 * `unit.unitType` and consulting the matching `*Init` block on `IGameUnit`.
 *
 * Returns `undefined` when:
 *   - `unitType` is undefined (legacy path / mech-only stubs).
 *   - `unitType` is mech / vehicle / capital — those don't get an envelope.
 *
 * Throws an `Error` whose message names the unit id and the missing field
 * when `unitType` is one of the four supported per-type discriminants but the
 * matching `*Init` block (or a required field inside it) is absent. Council #1
 * Decision: "Init-time discriminated assertion (throw, do not warn)" — we
 * surface the gap loudly at session creation, never silently fall back.
 */
function buildCombatStateForUnit(
  unit: IGameUnit,
): IUnitGameState['combatState'] {
  const ut = unit.unitType;
  if (ut === undefined) return undefined;
  if (!PER_TYPE_COMBAT_BEHAVIOR_KINDS.has(ut)) return undefined;

  // ---- Vehicle family ----
  if (
    ut === UnitType.VEHICLE ||
    ut === UnitType.VTOL ||
    ut === UnitType.SUPPORT_VEHICLE
  ) {
    const init = unit.vehicleInit;
    if (init === undefined) {
      throw new Error(
        `createInitialUnitState: ${ut} unit '${unit.id}' missing required field(s): vehicleInit`,
      );
    }
    const missing: string[] = [];
    if (init.motionType === undefined) missing.push('vehicleInit.motionType');
    if (init.originalCruiseMP === undefined) {
      missing.push('vehicleInit.originalCruiseMP');
    }
    if (init.armor === undefined) missing.push('vehicleInit.armor');
    if (init.structure === undefined) missing.push('vehicleInit.structure');
    if (missing.length > 0) {
      throw new Error(
        `createInitialUnitState: ${ut} unit '${unit.id}' missing required field(s): ${missing.join(', ')}`,
      );
    }
    return {
      kind: 'vehicle',
      state: createVehicleCombatState({
        unitId: unit.id,
        motionType: init.motionType,
        turretType: init.turretType,
        originalCruiseMP: init.originalCruiseMP,
        armor: init.armor,
        structure: init.structure,
        altitude: init.altitude,
      }),
    };
  }

  // ---- Aerospace family ----
  if (
    ut === UnitType.AEROSPACE ||
    ut === UnitType.CONVENTIONAL_FIGHTER ||
    ut === UnitType.SMALL_CRAFT
  ) {
    const init = unit.aerospaceInit;
    if (init === undefined) {
      throw new Error(
        `createInitialUnitState: ${ut} unit '${unit.id}' missing required field(s): aerospaceInit`,
      );
    }
    const missing: string[] = [];
    if (init.maxSI === undefined) missing.push('aerospaceInit.maxSI');
    if (init.armorByArc === undefined) missing.push('aerospaceInit.armorByArc');
    if (init.heatSinks === undefined) missing.push('aerospaceInit.heatSinks');
    if (init.fuelPoints === undefined) missing.push('aerospaceInit.fuelPoints');
    if (init.safeThrust === undefined) missing.push('aerospaceInit.safeThrust');
    if (init.maxThrust === undefined) missing.push('aerospaceInit.maxThrust');
    if (missing.length > 0) {
      throw new Error(
        `createInitialUnitState: ${ut} unit '${unit.id}' missing required field(s): ${missing.join(', ')}`,
      );
    }
    return {
      kind: 'aero',
      state: createAerospaceCombatState({
        maxSI: init.maxSI,
        armorByArc: init.armorByArc,
        heatSinks: init.heatSinks,
        fuelPoints: init.fuelPoints,
        safeThrust: init.safeThrust,
        maxThrust: init.maxThrust,
        altitude: init.altitude ?? 1,
        currentVelocity: init.currentVelocity,
        nextVelocity: init.nextVelocity,
        airborneState: init.airborneState,
        dogfightWith: init.dogfightWith,
      }),
    };
  }

  // ---- Infantry ----
  if (ut === UnitType.INFANTRY) {
    const init = unit.infantryInit;
    if (init === undefined) {
      throw new Error(
        `createInitialUnitState: ${ut} unit '${unit.id}' missing required field(s): infantryInit`,
      );
    }
    return {
      kind: 'platoon',
      state: createInfantryCombatStateFromUnit(init),
    };
  }

  // ---- ProtoMech ----
  if (ut === UnitType.PROTOMECH) {
    const init = unit.protoMechInit;
    if (init === undefined) {
      throw new Error(
        `createInitialUnitState: ${ut} unit '${unit.id}' missing required field(s): protoMechInit`,
      );
    }
    const missing: string[] = [];
    if (init.chassisType === undefined)
      missing.push('protoMechInit.chassisType');
    if (init.hasMainGun === undefined) missing.push('protoMechInit.hasMainGun');
    if (init.armorByLocation === undefined)
      missing.push('protoMechInit.armorByLocation');
    if (init.structureByLocation === undefined)
      missing.push('protoMechInit.structureByLocation');
    if (missing.length > 0) {
      throw new Error(
        `createInitialUnitState: ${ut} unit '${unit.id}' missing required field(s): ${missing.join(', ')}`,
      );
    }
    return {
      kind: 'proto',
      state: createProtoMechCombatState({
        unitId: unit.id,
        chassisType: init.chassisType,
        hasMainGun: init.hasMainGun,
        armorByLocation: init.armorByLocation,
        structureByLocation: init.structureByLocation,
        altitude:
          init.chassisType === ProtoChassis.GLIDER
            ? (init.altitude ?? 0)
            : init.altitude,
      }),
    };
  }

  // ---- Battle Armor ----
  if (ut === UnitType.BATTLE_ARMOR) {
    const init = unit.battleArmorInit;
    if (init === undefined) {
      throw new Error(
        `createInitialUnitState: ${ut} unit '${unit.id}' missing required field(s): battleArmorInit`,
      );
    }
    const missing: string[] = [];
    if (init.squadSize === undefined) missing.push('battleArmorInit.squadSize');
    if (init.armorPointsPerTrooper === undefined)
      missing.push('battleArmorInit.armorPointsPerTrooper');
    if (missing.length > 0) {
      throw new Error(
        `createInitialUnitState: ${ut} unit '${unit.id}' missing required field(s): ${missing.join(', ')}`,
      );
    }
    return {
      kind: 'squad',
      state: createBattleArmorCombatState({
        unitId: unit.id,
        squadSize: init.squadSize,
        armorPointsPerTrooper: init.armorPointsPerTrooper,
        stealthKind: init.stealthKind,
        hasMagneticClamp: init.hasMagneticClamp,
        hasVibroClaws: init.hasVibroClaws,
        vibroClawCount: init.vibroClawCount,
      }),
    };
  }

  // Defensive: Set membership above already excludes anything that would
  // reach this point. Returning undefined keeps the function total in case
  // the discriminant set is widened later without a matching branch.
  return undefined;
}

export function createInitialUnitState(
  unit: IGameUnit,
  startPosition: IHexCoordinate,
  startFacing: Facing = Facing.North,
): IUnitGameState {
  // Seed ammo bins from the unit's construction data (per
  // `wire-ammo-consumption`). One bin per ton; each starts full. When
  // `unit.ammoConstruction` is absent, the unit has zero bins and any
  // ammo-consuming weapon fire will emit `AttackInvalid { OutOfAmmo }`.
  const ammoState: Record<string, IAmmoSlotState> = {};
  if (unit.ammoConstruction) {
    for (const bin of unit.ammoConstruction) {
      ammoState[bin.binId] = {
        binId: bin.binId,
        weaponType: bin.weaponType,
        location: bin.location,
        remainingRounds: bin.maxRounds,
        maxRounds: bin.maxRounds,
        damagePerRound: bin.damagePerRound,
        isExplosive: bin.isExplosive,
      };
    }
  }

  // Per `wire-combat-behavior-dispatch` task §3.1/§3.2: branch on
  // `unit.unitType` to seed the per-type combat-behavior envelope. Throws
  // when one of the four supported per-type discriminants is missing its
  // construction-input block (Decision: "throw, do not warn").
  const combatState = buildCombatStateForUnit(unit);

  return {
    id: unit.id,
    unitType: unit.unitType,
    ...(unit.tonnage !== undefined ? { tonnage: unit.tonnage } : {}),
    motionType: unit.motionType,
    isQuad: unit.isQuad,
    armsFlipped: unit.armsFlipped,
    isPassenger: unit.isPassenger,
    isSwarming: unit.isSwarming,
    isMakingDFA: unit.isMakingDFA,
    isMakingDisplacementAttack: unit.isMakingDisplacementAttack,
    isPushing: unit.isPushing,
    displacementAttackTargetId: unit.displacementAttackTargetId,
    targetedByDisplacementAttackerId: unit.targetedByDisplacementAttackerId,
    isAirborne: unit.isAirborne,
    occupiedBuildingId: unit.occupiedBuildingId,
    isEvading: unit.isEvading,
    evasionBonus: unit.evasionBonus,
    sprintedThisTurn: unit.sprintedThisTurn,
    isLoadingOrUnloadingCargo: unit.isLoadingOrUnloadingCargo,
    boardId: unit.boardId,
    side: unit.side,
    position: startPosition,
    facing: startFacing,
    secondaryFacing: startFacing,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    // Per `add-encounter-swarm-harness` Phase 1: copy pilot skills from
    // the binding IGameUnit so the AI snapshot (toAIUnitState) reads the
    // real gunnery/piloting instead of DEFAULT_GUNNERY/DEFAULT_PILOTING.
    // These fields never mutate mid-match.
    gunnery: unit.gunnery,
    piloting: unit.piloting,
    pilotSpas: unit.pilotSpas,
    ...(unit.gyroType ? { gyroType: unit.gyroType } : {}),
    heatSinks: unit.heatSinks,
    heatSinkType: unit.heatSinkType,
    hasTSM: unit.hasTSM ?? false,
    hasMASC: unit.hasMASC ?? false,
    hasSupercharger: unit.hasSupercharger ?? false,
    activeMASC: unit.activeMASC ?? false,
    activeSupercharger: unit.activeSupercharger ?? false,
    mascTurnsUsed: unit.mascTurnsUsed,
    superchargerTurnsUsed: unit.superchargerTurnsUsed,
    mascFailureLevelIncreasedLastTurn: unit.mascFailureLevelIncreasedLastTurn,
    superchargerFailureLevelIncreasedLastTurn:
      unit.superchargerFailureLevelIncreasedLastTurn,
    abilities: unit.abilities,
    designatedWeaponType: unit.designatedWeaponType,
    designatedWeaponCategory: unit.designatedWeaponCategory,
    designatedTargetId: unit.designatedTargetId,
    designatedRangeBracket: unit.designatedRangeBracket,
    unitQuirks: unit.unitQuirks,
    weaponQuirks: unit.weaponQuirks,
    initiativeHQBonus: unit.initiativeHQBonus,
    initiativeCommandBonus: unit.initiativeCommandBonus,
    weaponLocationById: unit.weaponLocationById,
    armor: {},
    structure: {},
    // Per `add-bot-retreat-behavior` § 2 (Trigger A): the retreat trigger
    // needs the points-of-internal-structure ratio
    // `sum(starting - current) / sum(starting)`. The base initialization
    // path leaves `structure` empty (production callers, e.g. CompendiumAdapter,
    // override with per-tonnage values); we mirror that here. The damage
    // reducer (`applyDamageApplied`) bootstraps `startingInternalStructure`
    // on first damage to a location when a producer didn't seed it
    // explicitly, so legacy callers keep working without a migration.
    startingInternalStructure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotToughness: unit.pilotToughness,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    isStuck: false,
    shutdown: false,
    ammoState,
    ...(unit.armorTypeByLocation !== undefined
      ? { armorTypeByLocation: unit.armorTypeByLocation }
      : {}),
    ...(unit.caseProtection !== undefined
      ? { caseProtection: unit.caseProtection }
      : {}),
    pendingPSRs: [],
    weaponsFiredThisTurn: [],
    jammedWeapons: [],
    narcedBy: [],
    iNarcPods: [],
    tagDesignated: false,
    // Retreat fields (per `add-bot-retreat-behavior` § 1.2): explicit
    // defaults so replayed states always observe the same shape as
    // freshly constructed ones. `isRetreating`/`hasRetreated` latches
    // flip one-way via RetreatTriggered / UnitRetreated events.
    isRetreating: false,
    retreatTargetEdge: undefined,
    hasRetreated: false,
    hasEjected: false,
    // Per-type combat-behavior envelope (mech / vehicle paths leave undefined).
    combatState,
  };
}

export function createInitialGameState(gameId: string): IGameState {
  return {
    gameId,
    status: GameStatus.Setup,
    turn: 0,
    phase: GamePhase.Initiative,
    activationIndex: 0,
    units: {},
    turnEvents: [],
    // Per `add-combat-morale-and-withdrawal` (D1): in-battle morale
    // starts at `STEADY` for every side. `MoraleShifted` events move
    // it from here; replaying the log reconstructs it exactly.
    battleMorale: {
      [GameSide.Player]: 'STEADY',
      [GameSide.Opponent]: 'STEADY',
    },
  };
}
