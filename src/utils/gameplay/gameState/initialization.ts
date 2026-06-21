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

import { buildCombatStateForUnit } from './combatStateInitialization';

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
  superCooledMyomerHits: 0,
  emergencyCoolantSystemDamaged: false,
  playtestAutocannonFirstCrits: [],
  breachedLocations: [],
};

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
    hasDroneOS: unit.hasDroneOS ?? false,
    activeMASC: unit.activeMASC ?? false,
    activeSupercharger: unit.activeSupercharger ?? false,
    mascTurnsUsed: unit.mascTurnsUsed,
    superchargerTurnsUsed: unit.superchargerTurnsUsed,
    mascFailureLevelIncreasedLastTurn: unit.mascFailureLevelIncreasedLastTurn,
    superchargerFailureLevelIncreasedLastTurn:
      unit.superchargerFailureLevelIncreasedLastTurn,
    abilities: unit.abilities,
    neuralInterfaceActive: unit.neuralInterfaceActive,
    edgePointsRemaining: unit.edgePointsRemaining,
    designatedWeaponType: unit.designatedWeaponType,
    designatedWeaponCategory: unit.designatedWeaponCategory,
    designatedTargetId: unit.designatedTargetId,
    designatedRangeBracket: unit.designatedRangeBracket,
    designatedEnvironment: unit.designatedEnvironment,
    unitQuirks: unit.unitQuirks,
    weaponQuirks: unit.weaponQuirks,
    leftArmCarryingCargo: unit.leftArmCarryingCargo,
    rightArmCarryingCargo: unit.rightArmCarryingCargo,
    initiativeHQBonus: unit.initiativeHQBonus,
    initiativeCommandBonus: unit.initiativeCommandBonus,
    initiativeEquipment: unit.initiativeEquipment,
    c3Equipment: unit.c3Equipment,
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
    empInterferenceTurns: 0,
    empShutdownTurns: 0,
    ammoState,
    ...(unit.criticalSlotManifest !== undefined
      ? { criticalSlotManifest: unit.criticalSlotManifest }
      : {}),
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
    infernoBurning: false,
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
