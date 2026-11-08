import type {
  IComponentDamageState,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';
import type { IUnitDamageState } from '@/utils/gameplay/damage';
import type { IElectronicWarfareState } from '@/utils/gameplay/electronicWarfare';

import {
  CombatLocation,
  GamePhase,
  GameSide,
  GameStatus,
  IGameState,
  IMovementStep,
  IUnitGameState,
  MovementType,
} from '@/types/gameplay';
import { ScenarioObjectiveType } from '@/types/scenario/ScenarioInterfaces';
import { clearAttackLinks } from '@/utils/gameplay/attackLinks';
import { buildConservativeC3NetworkStateFromUnits } from '@/utils/gameplay/c3Network';
import { resetPerTurnMovementState } from '@/utils/gameplay/movement/perTurnMovementState';
import {
  movementStepsUseBackwardMovement,
  movementStepsUseMechanicalJumpBooster,
} from '@/utils/gameplay/movement/stepPredicates';
import { applyJumpUnstick } from '@/utils/gameplay/movement/stuckState';
import {
  deriveObjectivePlacementConfig,
  placeObjectives,
} from '@/utils/gameplay/objectives';
import { evaluateObjectiveOutcome } from '@/utils/gameplay/objectives/objectiveEngine';
import { applyDestroyedLocationPhysicalEquipmentState } from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';
import { advanceEmpShutdownTurns } from '@/utils/gameplay/shutdownStartup';
import { hasSPA } from '@/utils/gameplay/spaModifiers';
import { getUnitOperability } from '@/utils/gameplay/unitOperability';
import { advanceVehicleCrewStun } from '@/utils/gameplay/vehicleCrewStun';

import type { ISimulationConfig } from '../core/types';

import {
  nativeRunnerConstruction,
  runnerUnitId,
  runnerPilotRef,
  type IRunnerHydratedUnitData,
} from './SimulationRunner.nativeUnits';
import { DEFAULT_GUNNERY, DEFAULT_PILOTING } from './SimulationRunnerConstants';
import { createMinimalUnitState } from './SimulationRunnerSupport';
import {
  createHydratedUnitState,
  hydrateC3EquipmentFromFullUnit,
  hydrateActiveProbesFromFullUnit,
  hydrateEdgePointsFromFullUnit,
  hydrateECMSuitesFromFullUnit,
  hydrateHeatSinksFromFullUnit,
  hydratePilotAbilitiesFromFullUnit,
  hydrateTargetingComputerEquipmentFromFullUnit,
  weaponLocationByIdFromWeapons,
} from './UnitHydration';

/**
 * Hydration map keyed by runner unit id (`player-1`, `opponent-2`, …).
 * Per `add-combat-fidelity-suite` Phase 1: when present, `createInitialState`
 * routes per-slot construction through `createHydratedUnitState` so units
 * carry real catalog armor + structure (and pilot skills); when absent,
 * the legacy synthetic `createMinimalUnitState` path is used.
 */
export type UnitHydrationMap = ReadonlyMap<string, IRunnerHydratedUnitData>;

function createSideUnits(
  units: Record<string, IUnitGameState>,
  config: ISimulationConfig,
  side: GameSide,
  rowPosition: number,
  hydration: UnitHydrationMap | undefined,
): void {
  const count =
    side === GameSide.Player
      ? config.unitCount.player
      : config.unitCount.opponent;

  for (let i = 0; i < count; i++) {
    const id = runnerUnitId(side, i);
    const position = { q: i - 1, r: rowPosition };
    const hydrated = hydration?.get(id);
    if (hydrated) {
      // Hydrated path: copy the spawn position from the runner's grid layout
      // (the runner controls placement; the hydration data carries armor /
      // weapons / pilot skills, not position). This keeps map-radius-driven
      // formation logic in one place — the runner — instead of forking it
      // into the hydration-data builder.
      const data = {
        ...hydrated,
        runnerUnitId: id,
        side,
        position,
      };
      units[id] =
        nativeRunnerConstruction(data)?.state ?? createHydratedUnitState(data);
    } else {
      units[id] = createMinimalUnitState(id, side, position);
    }
  }
}

function buildElectronicWarfareState(
  units: Readonly<Record<string, IUnitGameState>>,
  hydration: UnitHydrationMap | undefined,
): IElectronicWarfareState | undefined {
  if (!hydration) return undefined;

  const ecmSuites: IElectronicWarfareState['ecmSuites'] = Object.entries(
    units,
  ).flatMap(([unitId, unit]) => {
    const hydrated = hydration.get(unitId);
    if (!hydrated) return [];

    return hydrateECMSuitesFromFullUnit(hydrated.fullUnit).map(
      (suite, index) => ({
        type: suite.type,
        mode: suite.mode ?? 'ecm',
        operational: true,
        entityId: `${unitId}:${suite.sourceEquipmentId}:${index}`,
        teamId: unit.side,
        position: { ...unit.position },
      }),
    );
  });
  const activeProbes: IElectronicWarfareState['activeProbes'] = Object.entries(
    units,
  ).flatMap(([unitId, unit]) => {
    const hydrated = hydration.get(unitId);
    if (!hydrated) return [];

    const fullUnitAbilities =
      hydratePilotAbilitiesFromFullUnit(hydrated.fullUnit) ?? [];
    const eagleEyesRangeBonus = hasSPA(
      [...(unit.abilities ?? []), ...fullUnitAbilities],
      'eagle_eyes',
    );

    return hydrateActiveProbesFromFullUnit(hydrated.fullUnit).map((probe) => ({
      type: probe.type,
      operational: true,
      entityId: unitId,
      teamId: unit.side,
      position: { ...unit.position },
      ...(eagleEyesRangeBonus ? { eagleEyesRangeBonus: true } : {}),
    }));
  });

  return ecmSuites.length > 0 || activeProbes.length > 0
    ? {
        ecmSuites,
        activeProbes,
      }
    : undefined;
}

export function createInitialState(
  config: ISimulationConfig,
  hydration?: UnitHydrationMap,
): IGameState {
  const units: Record<string, IUnitGameState> = {};

  createSideUnits(
    units,
    config,
    GameSide.Player,
    -config.mapRadius + 1,
    hydration,
  );
  createSideUnits(
    units,
    config,
    GameSide.Opponent,
    config.mapRadius - 1,
    hydration,
  );

  // Per `add-scenario-objective-engine` (task 2 + task 5): a runner
  // config carrying an objective type seeds the objective map so the
  // simulation loop can be won by holding / capturing / breaking
  // through, not only by destruction. Markerless configs leave
  // `objectives` undefined and behave exactly as before.
  const objectives = buildObjectivesForConfig(config);
  const electronicWarfare = buildElectronicWarfareState(units, hydration);
  const c3Network = buildConservativeC3NetworkStateFromUnits(units);

  return {
    gameId: `sim-${config.seed}`,
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Initiative,
    activationIndex: 0,
    units,
    turnEvents: [],
    ...(Object.keys(objectives).length > 0 ? { objectives } : {}),
    ...(electronicWarfare ? { electronicWarfare } : {}),
    ...(c3Network ? { c3Network } : {}),
  };
}

/**
 * Per `add-scenario-objective-engine`: derives the objective marker map
 * for a runner config. Mirrors `ScenarioGenerator`'s deployment-row
 * convention (`createSideUnits` places the player at `-mapRadius + 1`
 * and the opponent at `mapRadius - 1`). Returns `{}` for a markerless
 * (`destroy` / unset) config.
 */
export function buildObjectivesForConfig(
  config: ISimulationConfig,
): Record<string, IObjectiveMarker> {
  const objectiveType = config.objectiveType;
  if (
    objectiveType === undefined ||
    objectiveType === ScenarioObjectiveType.Destroy
  ) {
    return {};
  }

  const placementConfig = deriveObjectivePlacementConfig(
    objectiveType,
    config.victoryConditions ?? [],
  );
  if (placementConfig === null) return {};

  const radius = config.mapRadius;
  return placeObjectives(
    placementConfig,
    {
      radius,
      playerRow: -radius + 1,
      opponentRow: radius - 1,
    },
    config.seed,
  );
}

/**
 * Per `emit-game-created-from-runner` (`simulation-system` delta — "Runner
 * Emits GameCreated as Seed Event"): synthesize the `IGameUnit[]` roster
 * from the runner's allocation walk so `SimulationRunner.run()` can emit
 * `GameCreated` as `events[0]`. The walk is intentionally identical to
 * `createSideUnits` so the per-slot ids stay in lock-step (`player-N`,
 * `opponent-N`).
 *
 * Hydrated path: pulls `name`, `unitRef`, `pilotRef`, `gunnery`, `piloting`
 * from `IHydratedUnitData` (chassis + model joined for the display name).
 *
 * Synthetic path (no hydration map): name = id, unitRef / pilotRef
 * synthetic placeholders, skills fall back to `DEFAULT_GUNNERY` /
 * `DEFAULT_PILOTING`. The replay viewer's reducer renders these as
 * Mech-default tokens; cosmetic placeholder data, full functional render.
 */
export function synthesizeGameUnits(
  config: ISimulationConfig,
  hydration: UnitHydrationMap | undefined,
): readonly IGameUnit[] {
  const result: IGameUnit[] = [];

  for (const side of [GameSide.Player, GameSide.Opponent]) {
    const count =
      side === GameSide.Player
        ? config.unitCount.player
        : config.unitCount.opponent;

    for (let i = 0; i < count; i++) {
      const id = runnerUnitId(side, i);
      const hydrated = hydration?.get(id);
      if (hydrated !== undefined) {
        const native = nativeRunnerConstruction({
          ...hydrated,
          runnerUnitId: id,
          side,
        });
        if (native) {
          result.push(native.unit);
          continue;
        }
        // Hydrated path: real catalog data on the unit.
        const fullUnit = hydrated.fullUnit as {
          chassis?: string;
          model?: string;
          unitRef?: string;
        };
        const chassis = fullUnit.chassis ?? id;
        const model = fullUnit.model ?? '';
        const name = model.length > 0 ? `${chassis} ${model}` : chassis;
        const heatSinks = hydrateHeatSinksFromFullUnit(hydrated.fullUnit);
        const abilities = hydratePilotAbilitiesFromFullUnit(hydrated.fullUnit);
        const edgePointsRemaining = hydrateEdgePointsFromFullUnit(
          hydrated.fullUnit,
        );
        const c3Equipment = hydrateC3EquipmentFromFullUnit(hydrated.fullUnit);
        const targetingComputerEquipment =
          hydrateTargetingComputerEquipmentFromFullUnit(hydrated.fullUnit);
        result.push({
          ...hydrated.sourceUnit,
          id,
          name: hydrated.sourceUnit?.name ?? name,
          side,
          unitRef: hydrated.sourceUnit?.unitRef ?? fullUnit.unitRef ?? id,
          pilotRef: hydrated.sourceUnit?.pilotRef ?? runnerPilotRef(id),
          gunnery: hydrated.gunnery ?? DEFAULT_GUNNERY,
          piloting: hydrated.piloting ?? DEFAULT_PILOTING,
          heatSinks: heatSinks.count,
          heatSinkType: heatSinks.kind,
          ...(abilities !== undefined ? { abilities } : {}),
          ...(edgePointsRemaining !== undefined ? { edgePointsRemaining } : {}),
          ...(c3Equipment.length > 0 ? { c3Equipment } : {}),
          ...(targetingComputerEquipment ? { targetingComputerEquipment } : {}),
          weaponLocationById: weaponLocationByIdFromWeapons(hydrated.aiWeapons),
        });
      } else {
        // Synthetic minimal-unit fallback path: no catalog data
        // available. Use the slot id as both the display name and the
        // unitRef so the replay viewer still produces a stable token
        // identity even without hydration.
        result.push({
          id,
          name: id,
          side,
          unitRef: id,
          pilotRef: `synthetic-pilot-${id}`,
          gunnery: DEFAULT_GUNNERY,
          piloting: DEFAULT_PILOTING,
        });
      }
    }
  }

  return result;
}

export function resetTurnState(state: IGameState): IGameState {
  const updatedUnits: Record<string, IUnitGameState> = {};
  for (const [id, unit] of Object.entries(state.units)) {
    const updatedUnit: IUnitGameState = {
      ...unit,
      damageThisPhase: 0,
      weaponsFiredThisTurn: [],
      pendingPSRs: [],
      tagDesignated: false,
      externalHeatThisTurn: 0,
      pendingExternalHeat: 0,
      ...(unit.empShutdownTurns !== undefined
        ? { empShutdownTurns: advanceEmpShutdownTurns(unit.empShutdownTurns) }
        : {}),
    };

    updatedUnits[id] = advanceVehicleCrewStun(
      resetPerTurnMovementState(updatedUnit),
    );
  }

  return { ...state, units: updatedUnits };
}

export function applyMovementEvent(
  state: IGameState,
  unitId: string,
  payload: {
    to: { q: number; r: number };
    facing: number;
    movementType: IUnitGameState['movementThisTurn'];
    mpUsed: number;
    hexesMoved?: number;
    steps?: readonly IMovementStep[];
  },
): IGameState {
  const unit = state.units[unitId];
  if (!unit) return state;
  const wentProne =
    payload.steps?.some((step) => step.kind === 'goProne') ?? false;
  const isEvadeMovement = payload.movementType === MovementType.Evade;
  const isSprintMovement = payload.movementType === MovementType.Sprint;

  const updatedUnit: IUnitGameState = {
    ...applyJumpUnstick(unit, payload.movementType),
    position: payload.to,
    facing: payload.facing,
    movementThisTurn: payload.movementType,
    hexesMovedThisTurn: payload.hexesMoved ?? payload.mpUsed,
    movedBackwardThisTurn: movementStepsUseBackwardMovement(payload.steps),
    usedMechanicalJumpBoosterThisTurn: movementStepsUseMechanicalJumpBooster(
      payload.steps,
    ),
    isEvading: isEvadeMovement,
    evasionBonus: isEvadeMovement ? 1 : undefined,
    sprintedThisTurn: isSprintMovement,
    prone: wentProne ? true : unit.prone,
    ...(wentProne ? { hullDown: false } : {}),
    ...(wentProne ? { infernoBurning: false } : {}),
  };

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: updatedUnit,
    },
  };
}

export function buildDamageState(unit: IUnitGameState): IUnitDamageState {
  const armorRecord = unit.armor as Record<CombatLocation, number>;
  const rearArmor: Record<
    'center_torso' | 'left_torso' | 'right_torso',
    number
  > = {
    center_torso: armorRecord.center_torso_rear ?? 10,
    left_torso: armorRecord.left_torso_rear ?? 7,
    right_torso: armorRecord.right_torso_rear ?? 7,
  };

  return {
    armor: armorRecord,
    rearArmor,
    structure: unit.structure as Record<CombatLocation, number>,
    destroyedLocations: unit.destroyedLocations as CombatLocation[],
    pilotWounds: unit.pilotWounds,
    pilotToughness: unit.pilotToughness,
    pilotConscious: unit.pilotConscious,
    pilotAbilities: unit.abilities,
    edgePointsRemaining: unit.edgePointsRemaining,
    unitId: unit.id,
    destroyed: unit.destroyed,
    destructionCause: unit.destructionCause,
  };
}

export function applyDamageResultToState(
  state: IGameState,
  targetId: string,
  damageState: IUnitDamageState,
  damageResult: {
    readonly locationDamages: readonly {
      readonly location: CombatLocation;
      readonly armorRemaining: number;
      readonly structureRemaining: number;
      readonly destroyed: boolean;
    }[];
    readonly unitDestroyed: boolean;
    readonly destructionCause?: IUnitGameState['destructionCause'];
  },
  /**
   * Per `add-combat-fidelity-suite` Phase 3: when the runner threaded a
   * `criticalContext` into `resolveDamage`, the resulting
   * `IComponentDamageState` propagates back here so the post-crit
   * engine/gyro/sensor/cockpit/actuator/weapon/heat-sink/jump-jet/ammo
   * mutations land on `IUnitGameState.componentDamage`. Optional + last
   * so existing callsites (legacy session twin, P0/P1/P2 fixtures,
   * physical-attack phase) compile unchanged.
   */
  componentDamage?: IComponentDamageState,
): IGameState {
  const target = state.units[targetId];
  if (!target) return state;

  const newArmor = { ...target.armor };
  const newStructure = { ...target.structure };
  const newDestroyedLocations = [...target.destroyedLocations];

  for (const locDamage of damageResult.locationDamages) {
    newArmor[locDamage.location] = locDamage.armorRemaining;
    newStructure[locDamage.location] = locDamage.structureRemaining;
    if (
      locDamage.destroyed &&
      !newDestroyedLocations.includes(locDamage.location)
    ) {
      newDestroyedLocations.push(locDamage.location);
      if (
        locDamage.location === 'left_torso' &&
        !newDestroyedLocations.includes('left_arm')
      ) {
        newDestroyedLocations.push('left_arm');
        newArmor.left_arm = 0;
        newStructure.left_arm = 0;
      }
      if (
        locDamage.location === 'right_torso' &&
        !newDestroyedLocations.includes('right_arm')
      ) {
        newDestroyedLocations.push('right_arm');
        newArmor.right_arm = 0;
        newStructure.right_arm = 0;
      }
    }
  }

  newArmor.center_torso_rear = damageState.rearArmor.center_torso;
  newArmor.left_torso_rear = damageState.rearArmor.left_torso;
  newArmor.right_torso_rear = damageState.rearArmor.right_torso;
  if (damageState.structure.center_torso !== undefined) {
    newStructure.center_torso = damageState.structure.center_torso;
    newStructure.center_torso_rear = damageState.structure.center_torso;
  }
  if (damageState.structure.left_torso !== undefined) {
    newStructure.left_torso = damageState.structure.left_torso;
    newStructure.left_torso_rear = damageState.structure.left_torso;
  }
  if (damageState.structure.right_torso !== undefined) {
    newStructure.right_torso = damageState.structure.right_torso;
    newStructure.right_torso_rear = damageState.structure.right_torso;
  }

  const destructionCause = damageResult.unitDestroyed
    ? (damageResult.destructionCause ?? target.destructionCause ?? 'damage')
    : target.destructionCause;

  const updatedUnit: IUnitGameState =
    applyDestroyedLocationPhysicalEquipmentState(
      {
        ...target,
        armor: newArmor,
        structure: newStructure,
        destroyedLocations: newDestroyedLocations,
        pilotWounds: damageState.pilotWounds,
        pilotConscious: damageState.pilotConscious,
        edgePointsRemaining:
          damageState.edgePointsRemaining ?? target.edgePointsRemaining,
        destroyed: damageResult.unitDestroyed,
        ...(destructionCause !== undefined ? { destructionCause } : {}),
        // When the runner supplied post-crit component damage, persist it.
        // Engine/gyro hits drive PSR + heat thresholds + walk-MP penalties
        // downstream; without persistence the runner re-rolls a fresh
        // component-damage block every shot and crit-cascade scenarios
        // (3 engine hits → destruction) can never accumulate.
        ...(componentDamage !== undefined ? { componentDamage } : {}),
      },
      newDestroyedLocations,
    );

  return clearAttackLinks(
    {
      ...state,
      units: {
        ...state.units,
        [targetId]: updatedUnit,
      },
    },
    targetId,
  );
}

export function isUnitOperable(unit: IUnitGameState): boolean {
  return getUnitOperability(unit).crewActive;
}

export function isGameOver(state: IGameState, turnLimit = 0): boolean {
  // Per `add-scenario-objective-engine` (task 5): an objective win
  // ends the simulation even with units alive on both sides. A
  // markerless state routes through `destroy` and returns null until
  // a side is eliminated, so the legacy check below still governs
  // destruction-only runs.
  if (evaluateObjectiveOutcome(state, turnLimit) !== null) {
    return true;
  }

  const playerAlive = Object.values(state.units).some(
    (unit) => unit.side === GameSide.Player && isUnitOperable(unit),
  );
  const opponentAlive = Object.values(state.units).some(
    (unit) => unit.side === GameSide.Opponent && isUnitOperable(unit),
  );
  return !playerAlive || !opponentAlive;
}

export function determineWinner(
  state: IGameState,
  turnLimit = 0,
): 'player' | 'opponent' | 'draw' | null {
  // Per `add-scenario-objective-engine` (task 5): an objective outcome
  // takes precedence over the destruction comparison below.
  const objectiveOutcome = evaluateObjectiveOutcome(state, turnLimit);
  if (objectiveOutcome !== null) {
    return objectiveOutcome.winningSide === GameSide.Player
      ? 'player'
      : 'opponent';
  }

  const playerAlive = Object.values(state.units).some(
    (unit) => unit.side === GameSide.Player && isUnitOperable(unit),
  );
  const opponentAlive = Object.values(state.units).some(
    (unit) => unit.side === GameSide.Opponent && isUnitOperable(unit),
  );

  if (!playerAlive && !opponentAlive) return 'draw';
  if (!playerAlive) return 'opponent';
  if (!opponentAlive) return 'player';
  return null;
}
