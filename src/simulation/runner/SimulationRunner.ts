import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import {
  GamePhase,
  GameSide,
  GameStatus,
  GameEventType,
  IGameState,
  IUnitGameState,
  IGameEvent,
  LockState,
  IComponentDamageState,
  RangeBracket,
} from '@/types/gameplay';
import {
  Facing,
  MovementType,
  IHexCoordinate,
  IHexGrid,
  IHex,
  IMovementCapability,
} from '@/types/gameplay';
import { CombatLocation, IAttackerState, ITargetState } from '@/types/gameplay';
import { resolveDamage, IUnitDamageState } from '@/utils/gameplay/damage';
import { calculateFiringArc } from '@/utils/gameplay/firingArc';
import {
  determineHitLocation,
  isHeadHit,
  D6Roller,
} from '@/utils/gameplay/hitLocation';
import { hexDistance } from '@/utils/gameplay/hexMath';
import {
  chooseBestPhysicalAttack,
  resolvePhysicalAttack,
  IPhysicalAttackInput,
} from '@/utils/gameplay/physicalAttacks';
import {
  resolveAllPSRs,
  createDamagePSR,
  createKickedPSR,
  IPSRBatchResult,
} from '@/utils/gameplay/pilotingSkillRolls';
import { calculateToHit } from '@/utils/gameplay/toHit';

import type { IAIUnitState, IWeapon } from '../ai/types';
import type { BattleState as AnomalyBattleState } from '../detectors/HeatSuicideDetector';
import type { BattleState as KeyMomentBattleState } from '../detectors/KeyMomentDetector';

import { BotPlayer } from '../ai/BotPlayer';
import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { HeatSuicideDetector } from '../detectors/HeatSuicideDetector';
import { KeyMomentDetector } from '../detectors/KeyMomentDetector';
import { LongGameDetector } from '../detectors/LongGameDetector';
import { NoProgressDetector } from '../detectors/NoProgressDetector';
import { PassiveUnitDetector } from '../detectors/PassiveUnitDetector';
import { StateCycleDetector } from '../detectors/StateCycleDetector';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { IViolation } from '../invariants/types';
import { ISimulationRunResult, IDetectorConfig } from './types';

const MAX_TURNS = 10;

/** Default tonnage for simulation minimal units */
const DEFAULT_TONNAGE = 65;
/** Default piloting skill */
const DEFAULT_PILOTING = 5;

/** Default component damage state (no damage) */
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
 * Determine range bracket from weapon ranges and distance.
 */
function getRangeBracket(
  distance: number,
  shortRange: number,
  mediumRange: number,
  longRange: number,
): RangeBracket {
  if (distance <= shortRange) return RangeBracket.Short;
  if (distance <= mediumRange) return RangeBracket.Medium;
  if (distance <= longRange) return RangeBracket.Long;
  return RangeBracket.OutOfRange;
}

function createMinimalGrid(radius: number): IHexGrid {
  const hexes = new Map<string, IHex>();

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const key = `${q},${r}`;
        hexes.set(key, {
          coord: { q, r },
          occupantId: null,
          terrain: 'clear',
          elevation: 0,
        });
      }
    }
  }

  return {
    config: { radius },
    hexes,
  };
}

function createMinimalWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function createMinimalUnitState(
  id: string,
  side: GameSide,
  position: IHexCoordinate,
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
  };
}

function toAIUnitState(unit: IUnitGameState): IAIUnitState {
  return {
    unitId: unit.id,
    position: unit.position,
    facing: unit.facing,
    heat: unit.heat,
    weapons: [createMinimalWeapon(`${unit.id}-weapon-1`)],
    ammo: {},
    destroyed: unit.destroyed,
    gunnery: 4,
    movementType: unit.movementThisTurn,
    hexesMoved: unit.hexesMovedThisTurn,
  };
}

function createMovementCapability(): IMovementCapability {
  return {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

export class SimulationRunner {
  private readonly random: SeededRandom;
  private readonly invariantRunner: InvariantRunner;
  private readonly detectorConfig: IDetectorConfig;
  private readonly keyMomentDetector: KeyMomentDetector;
  private readonly anomalyDetectors: {
    readonly heatSuicide: HeatSuicideDetector;
    readonly passiveUnit: PassiveUnitDetector;
    readonly noProgress: NoProgressDetector;
    readonly longGame: LongGameDetector;
    readonly stateCycle: StateCycleDetector;
  };

  constructor(
    seed: number,
    invariantRunner?: InvariantRunner,
    detectorConfig?: IDetectorConfig,
  ) {
    this.random = new SeededRandom(seed);
    this.invariantRunner = invariantRunner ?? new InvariantRunner();
    this.detectorConfig = detectorConfig ?? {};
    this.keyMomentDetector = new KeyMomentDetector();
    this.anomalyDetectors = {
      heatSuicide: new HeatSuicideDetector(),
      passiveUnit: new PassiveUnitDetector(),
      noProgress: new NoProgressDetector(),
      longGame: new LongGameDetector(),
      stateCycle: new StateCycleDetector(),
    };
  }

  private createD6Roller(): D6Roller {
    return () => Math.floor(this.random.next() * 6) + 1;
  }

  /**
   * Runs a single simulation with integrated anomaly and key-moment detection.
   *
   * Phase order per turn: Initiative -> Movement -> WeaponAttack -> PSR ->
   * PhysicalAttack -> PSR -> Heat -> End
   *
   * Detectors are run after the game loop on the full event stream.
   * When `haltOnCritical` is enabled, the StateCycleDetector is checked
   * per-turn to allow early termination on critical anomalies.
   */
  run(config: ISimulationConfig): ISimulationRunResult {
    const startTime = Date.now();
    const violations: IViolation[] = [];
    const events: IGameEvent[] = [];
    let eventSequence = 0;
    const gameId = `sim-${config.seed}`;

    const grid = createMinimalGrid(config.mapRadius);
    const state = this.createInitialState(config);
    const botPlayer = new BotPlayer(this.random);

    let currentState = state;
    let turn = 1;
    const turnLimit =
      config.turnLimit > 0 ? Math.min(config.turnLimit, MAX_TURNS) : MAX_TURNS;
    let haltedByCriticalAnomaly = false;

    while (turn <= turnLimit) {
      currentState = { ...currentState, turn };
      currentState = this.resetTurnState(currentState);

      // Movement Phase
      currentState = this.runMovementPhase(
        currentState,
        botPlayer,
        grid,
        violations,
        events,
        eventSequence,
        gameId,
      );
      eventSequence = events.length;

      // Weapon Attack Phase
      currentState = this.runAttackPhase(
        currentState,
        botPlayer,
        violations,
        events,
        eventSequence,
        gameId,
      );
      eventSequence = events.length;

      // PSR Resolution (post-weapon-attack)
      currentState = this.runPSRPhase(currentState, events, gameId);
      eventSequence = events.length;

      if (this.isGameOver(currentState)) {
        break;
      }

      // Physical Attack Phase
      currentState = this.runPhysicalAttackPhase(
        currentState,
        violations,
        events,
        gameId,
      );
      eventSequence = events.length;

      // PSR Resolution (post-physical-attack)
      currentState = this.runPSRPhase(currentState, events, gameId);
      eventSequence = events.length;

      if (this.isGameOver(currentState)) {
        break;
      }

      // Heat Phase
      currentState = this.runHeatPhase(currentState);

      currentState = { ...currentState, phase: GamePhase.End };
      violations.push(...this.invariantRunner.runAll(currentState));

      // Emit TurnEnded event for detector consumption
      events.push(
        this.createGameEvent(
          gameId,
          events.length,
          GameEventType.TurnEnded,
          turn,
          currentState.phase,
          { _type: 'turn_ended' as const },
        ),
      );

      // Per-turn critical anomaly check (StateCycleDetector only)
      if (this.detectorConfig.haltOnCritical) {
        const anomalyBattleState = this.buildAnomalyBattleState(currentState);
        const cycleAnomalies = this.anomalyDetectors.stateCycle.detect(
          events,
          anomalyBattleState,
          this.detectorConfig.stateCycleLength,
        );
        const hasCritical = cycleAnomalies.some(
          (a) => a.severity === 'critical',
        );
        if (hasCritical) {
          haltedByCriticalAnomaly = true;
          break;
        }
      }

      turn++;
    }

    const durationMs = Date.now() - startTime;
    const winner = this.determineWinner(currentState);

    // Run all detectors on the complete event stream
    const keyMomentBattleState = this.buildKeyMomentBattleState(currentState);
    const anomalyBattleState = this.buildAnomalyBattleState(currentState);

    const keyMoments = this.keyMomentDetector.detect(
      events,
      keyMomentBattleState,
    );
    const anomalies = this.runAllAnomalyDetectors(events, anomalyBattleState);

    // Convert anomalies to violations for the violation log
    violations.push(...this.convertAnomaliesToViolations(anomalies));

    return {
      seed: config.seed,
      winner,
      turns: currentState.turn,
      durationMs,
      events,
      violations,
      keyMoments,
      anomalies,
      haltedByCriticalAnomaly,
    };
  }

  /**
   * Runs all five anomaly detectors on the complete event stream.
   */
  private runAllAnomalyDetectors(
    events: readonly IGameEvent[],
    battleState: AnomalyBattleState,
  ): IAnomaly[] {
    const cfg = this.detectorConfig;
    return [
      ...this.anomalyDetectors.heatSuicide.detect(
        events,
        battleState,
        cfg.heatSuicideThreshold,
      ),
      ...this.anomalyDetectors.passiveUnit.detect(
        events,
        battleState,
        cfg.passiveUnitTurns,
      ),
      ...this.anomalyDetectors.noProgress.detect(
        events,
        battleState,
        cfg.noProgressTurns,
      ),
      ...this.anomalyDetectors.longGame.detect(events, cfg.longGameTurns),
      ...this.anomalyDetectors.stateCycle.detect(
        events,
        battleState,
        cfg.stateCycleLength,
      ),
    ];
  }

  /**
   * Converts anomalies to the IViolation format for the violation log.
   */
  private convertAnomaliesToViolations(
    anomalies: readonly IAnomaly[],
  ): IViolation[] {
    return anomalies.map((anomaly) => ({
      invariant: `detector:${anomaly.type}`,
      severity:
        anomaly.severity === 'critical'
          ? ('critical' as const)
          : ('warning' as const),
      message: anomaly.message,
      context: {
        anomalyId: anomaly.id,
        turn: anomaly.turn,
        unitId: anomaly.unitId,
        thresholdUsed: anomaly.thresholdUsed,
        actualValue: anomaly.actualValue,
      },
    }));
  }

  /**
   * Builds a BattleState suitable for the KeyMomentDetector from game state.
   */
  private buildKeyMomentBattleState(state: IGameState): KeyMomentBattleState {
    const units = Object.values(state.units).map((unit) => ({
      id: unit.id,
      name: unit.id,
      side: unit.side,
      bv: 1000,
      weaponIds: [`${unit.id}-weapon-1`],
      initialArmor: { ...unit.armor },
      initialStructure: { ...unit.structure },
    }));
    return { units };
  }

  /**
   * Builds a BattleState suitable for anomaly detectors from game state.
   */
  private buildAnomalyBattleState(state: IGameState): AnomalyBattleState {
    const units = Object.values(state.units).map((unit) => ({
      id: unit.id,
      name: unit.id,
      side: unit.side,
    }));
    return { units };
  }

  private createGameEvent(
    gameId: string,
    sequence: number,
    type: GameEventType,
    turn: number,
    phase: GamePhase,
    payload: IGameEvent['payload'],
    actorId?: string,
  ): IGameEvent {
    return {
      id: `${gameId}-evt-${sequence}`,
      gameId,
      sequence,
      timestamp: new Date().toISOString(),
      type,
      turn,
      phase,
      payload,
      ...(actorId !== undefined ? { actorId } : {}),
    };
  }

  private runMovementPhase(
    state: IGameState,
    botPlayer: BotPlayer,
    grid: IHexGrid,
    violations: IViolation[],
    events: IGameEvent[],
    _seqStart: number,
    gameId: string,
  ): IGameState {
    let currentState = { ...state, phase: GamePhase.Movement };
    violations.push(...this.invariantRunner.runAll(currentState));

    for (const unitId of Object.keys(currentState.units)) {
      const unit = currentState.units[unitId];
      if (unit.destroyed) continue;

      const aiUnit = toAIUnitState(unit);
      const capability = createMovementCapability();
      const moveEvent = botPlayer.playMovementPhase(aiUnit, grid, capability);

      if (moveEvent) {
        currentState = this.applyMovementEvent(
          currentState,
          unitId,
          moveEvent.payload,
        );

        events.push(
          this.createGameEvent(
            gameId,
            events.length,
            GameEventType.MovementDeclared,
            currentState.turn,
            GamePhase.Movement,
            {
              unitId,
              from: unit.position,
              to: moveEvent.payload.to,
              facing: moveEvent.payload.facing as Facing,
              movementType: moveEvent.payload.movementType,
              mpUsed: moveEvent.payload.mpUsed,
              heatGenerated: 0,
            },
            unitId,
          ),
        );
      }
    }
    violations.push(...this.invariantRunner.runAll(currentState));

    return currentState;
  }

  private resetTurnState(state: IGameState): IGameState {
    const updatedUnits: Record<string, IUnitGameState> = {};
    for (const [id, unit] of Object.entries(state.units)) {
      updatedUnits[id] = {
        ...unit,
        damageThisPhase: 0,
        weaponsFiredThisTurn: [],
        pendingPSRs: [],
      };
    }
    return { ...state, units: updatedUnits };
  }

  private runAttackPhase(
    state: IGameState,
    botPlayer: BotPlayer,
    violations: IViolation[],
    events: IGameEvent[],
    _seqStart: number,
    gameId: string,
  ): IGameState {
    let currentState = { ...state, phase: GamePhase.WeaponAttack };
    violations.push(...this.invariantRunner.runAll(currentState));

    const d6Roller = this.createD6Roller();

    const allAIUnits = Object.values(currentState.units).map(toAIUnitState);
    for (const unitId of Object.keys(currentState.units)) {
      const unit = currentState.units[unitId];
      if (unit.destroyed || unit.shutdown) continue;

      const aiUnit = toAIUnitState(unit);
      const enemyUnits = allAIUnits.filter(
        (u) => !u.destroyed && currentState.units[u.unitId].side !== unit.side,
      );

      const attackEvent = botPlayer.playAttackPhase(aiUnit, enemyUnits);

      if (attackEvent) {
        const targetId = attackEvent.payload.targetId;
        const target = currentState.units[targetId];
        if (!target || target.destroyed) continue;

        const weapon = createMinimalWeapon(`${unitId}-weapon-1`);
        const distance = hexDistance(unit.position, target.position);
        const rangeBracket = getRangeBracket(
          distance,
          weapon.shortRange,
          weapon.mediumRange,
          weapon.longRange,
        );

        if (rangeBracket === RangeBracket.OutOfRange) continue;

        const attackerState: IAttackerState = {
          gunnery: 4,
          movementType: unit.movementThisTurn,
          heat: unit.heat,
          damageModifiers: [],
        };
        const targetState: ITargetState = {
          movementType: target.movementThisTurn,
          hexesMoved: target.hexesMovedThisTurn,
          prone: target.prone ?? false,
          immobile: target.shutdown ?? false,
          partialCover: false,
        };

        const toHitCalc = calculateToHit(
          attackerState,
          targetState,
          rangeBracket,
          distance,
          weapon.minRange,
        );

        const die1 = d6Roller();
        const die2 = d6Roller();
        const attackRoll = die1 + die2;
        const hit = attackRoll >= toHitCalc.finalToHit;

        if (hit) {
          const firingArc = calculateFiringArc(
            unit.position,
            target.position,
            target.facing,
          );
          const hitLocationResult = determineHitLocation(firingArc, d6Roller);
          const location = hitLocationResult.location;

          let damage = weapon.damage;
          if (isHeadHit(location) && damage > 3) {
            damage = 3;
          }

          const targetBefore = currentState.units[targetId];
          const damageState = this.buildDamageState(targetBefore);
          const result = resolveDamage(damageState, location, damage);

          currentState = this.applyDamageResultToState(
            currentState,
            targetId,
            result.state,
            result.result,
          );
          const targetAfter = currentState.units[targetId];

          // Track damage this phase for 20+ PSR
          const prevDamage = targetAfter.damageThisPhase ?? 0;
          currentState = {
            ...currentState,
            units: {
              ...currentState.units,
              [targetId]: {
                ...targetAfter,
                damageThisPhase: prevDamage + damage,
              },
            },
          };

          // Record weapons fired
          const attackerAfter = currentState.units[unitId];
          currentState = {
            ...currentState,
            units: {
              ...currentState.units,
              [unitId]: {
                ...attackerAfter,
                weaponsFiredThisTurn: [
                  ...(attackerAfter.weaponsFiredThisTurn ?? []),
                  weapon.id,
                ],
              },
            },
          };

          events.push(
            this.createGameEvent(
              gameId,
              events.length,
              GameEventType.DamageApplied,
              currentState.turn,
              GamePhase.WeaponAttack,
              {
                unitId: targetId,
                location,
                damage,
                armorRemaining:
                  currentState.units[targetId].armor[location] ?? 0,
                structureRemaining:
                  currentState.units[targetId].structure[location] ?? 0,
                locationDestroyed: (
                  currentState.units[targetId].destroyedLocations as string[]
                ).includes(location),
                sourceUnitId: unitId,
              },
              unitId,
            ),
          );

          if (
            currentState.units[targetId].destroyed &&
            !targetBefore.destroyed
          ) {
            events.push(
              this.createGameEvent(
                gameId,
                events.length,
                GameEventType.UnitDestroyed,
                currentState.turn,
                GamePhase.WeaponAttack,
                {
                  unitId: targetId,
                  cause: 'damage' as const,
                  killerUnitId: unitId,
                },
              ),
            );
          }

          // 20+ damage PSR trigger
          const targetPostDamage = currentState.units[targetId];
          if (
            !targetPostDamage.destroyed &&
            (targetPostDamage.damageThisPhase ?? 0) >= 20
          ) {
            const existingPSRs = targetPostDamage.pendingPSRs ?? [];
            const hasDamagePSR = existingPSRs.some(
              (p) => p.triggerSource === '20+_damage',
            );
            if (!hasDamagePSR) {
              currentState = {
                ...currentState,
                units: {
                  ...currentState.units,
                  [targetId]: {
                    ...targetPostDamage,
                    pendingPSRs: [
                      ...existingPSRs,
                      createDamagePSR(targetId),
                    ],
                  },
                },
              };
            }
          }
        }
      }
    }
    violations.push(...this.invariantRunner.runAll(currentState));

    return currentState;
  }

  private runPhysicalAttackPhase(
    state: IGameState,
    violations: IViolation[],
    events: IGameEvent[],
    gameId: string,
  ): IGameState {
    let currentState = { ...state, phase: GamePhase.PhysicalAttack };
    violations.push(...this.invariantRunner.runAll(currentState));

    const d6Roller = this.createD6Roller();

    for (const unitId of Object.keys(currentState.units)) {
      const unit = currentState.units[unitId];
      if (unit.destroyed || unit.shutdown || (unit.prone ?? false)) continue;

      const enemies = Object.values(currentState.units).filter(
        (u) =>
          !u.destroyed &&
          u.side !== unit.side &&
          hexDistance(unit.position, u.position) <= 1,
      );
      if (enemies.length === 0) continue;

      const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
      const weaponsFired = unit.weaponsFiredThisTurn ?? [];

      const bestAttack = chooseBestPhysicalAttack(
        DEFAULT_TONNAGE,
        DEFAULT_PILOTING,
        componentDamage,
        {
          attackerProne: unit.prone ?? false,
          weaponsFiredFromLeftArm: weaponsFired,
          weaponsFiredFromRightArm: weaponsFired,
          heat: unit.heat,
        },
      );

      if (!bestAttack) continue;
      if (bestAttack !== 'punch' && bestAttack !== 'kick') continue;

      const targetIdx = this.random.nextInt(enemies.length);
      const target = enemies[targetIdx];

      const attackInput: IPhysicalAttackInput = {
        attackerTonnage: DEFAULT_TONNAGE,
        pilotingSkill: DEFAULT_PILOTING,
        componentDamage,
        attackType: bestAttack,
        arm: 'right',
        attackerProne: unit.prone ?? false,
        weaponsFiredFromArm: bestAttack === 'punch' ? weaponsFired : undefined,
        heat: unit.heat,
      };

      const result = resolvePhysicalAttack(attackInput, d6Roller);

      events.push(
        this.createGameEvent(
          gameId,
          events.length,
          GameEventType.PhysicalAttackDeclared,
          currentState.turn,
          GamePhase.PhysicalAttack,
          {
            attackerId: unitId,
            targetId: target.id,
            attackType: bestAttack,
            toHitNumber: result.toHitNumber,
          },
          unitId,
        ),
      );

      if (result.hit && result.targetDamage > 0 && result.hitLocation) {
        const targetBefore = currentState.units[target.id];
        const damageState = this.buildDamageState(targetBefore);

        let damage = result.targetDamage;
        if (isHeadHit(result.hitLocation) && damage > 3) {
          damage = 3;
        }

        const dmgResult = resolveDamage(
          damageState,
          result.hitLocation,
          damage,
        );
        currentState = this.applyDamageResultToState(
          currentState,
          target.id,
          dmgResult.state,
          dmgResult.result,
        );
        const targetAfter = currentState.units[target.id];

        events.push(
          this.createGameEvent(
            gameId,
            events.length,
            GameEventType.DamageApplied,
            currentState.turn,
            GamePhase.PhysicalAttack,
            {
              unitId: target.id,
              location: result.hitLocation,
              damage,
              armorRemaining: targetAfter.armor[result.hitLocation] ?? 0,
              structureRemaining:
                targetAfter.structure[result.hitLocation] ?? 0,
              locationDestroyed: (
                targetAfter.destroyedLocations as string[]
              ).includes(result.hitLocation),
              sourceUnitId: unitId,
            },
            unitId,
          ),
        );

        if (targetAfter.destroyed && !targetBefore.destroyed) {
          events.push(
            this.createGameEvent(
              gameId,
              events.length,
              GameEventType.UnitDestroyed,
              currentState.turn,
              GamePhase.PhysicalAttack,
              {
                unitId: target.id,
                cause: 'damage' as const,
                killerUnitId: unitId,
              },
            ),
          );
        }

        if (result.targetPSR && !targetAfter.destroyed) {
          const existingPSRs =
            currentState.units[target.id].pendingPSRs ?? [];
          currentState = {
            ...currentState,
            units: {
              ...currentState.units,
              [target.id]: {
                ...currentState.units[target.id],
                pendingPSRs: [...existingPSRs, createKickedPSR(target.id)],
              },
            },
          };
        }
      }

      if (!result.hit && result.attackerPSR) {
        const attackerUnit = currentState.units[unitId];
        const existingPSRs = attackerUnit.pendingPSRs ?? [];
        currentState = {
          ...currentState,
          units: {
            ...currentState.units,
            [unitId]: {
              ...attackerUnit,
              pendingPSRs: [
                ...existingPSRs,
                {
                  entityId: unitId,
                  reason: `${bestAttack} missed`,
                  additionalModifier: result.attackerPSRModifier,
                  triggerSource: `${bestAttack}_miss`,
                },
              ],
            },
          },
        };
      }

      events.push(
        this.createGameEvent(
          gameId,
          events.length,
          GameEventType.PhysicalAttackResolved,
          currentState.turn,
          GamePhase.PhysicalAttack,
          {
            attackerId: unitId,
            targetId: target.id,
            attackType: bestAttack,
            toHitNumber: result.toHitNumber,
            hit: result.hit,
            damage: result.targetDamage,
            roll: result.roll,
          },
          unitId,
        ),
      );
    }
    violations.push(...this.invariantRunner.runAll(currentState));

    return currentState;
  }

  private runPSRPhase(
    state: IGameState,
    events: IGameEvent[],
    gameId: string,
  ): IGameState {
    let currentState = state;
    const d6Roller = this.createD6Roller();

    for (const unitId of Object.keys(currentState.units)) {
      const unit = currentState.units[unitId];
      if (unit.destroyed) continue;

      const pendingPSRs = unit.pendingPSRs ?? [];
      if (pendingPSRs.length === 0) continue;

      const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;

      const batchResult: IPSRBatchResult = resolveAllPSRs(
        DEFAULT_PILOTING,
        pendingPSRs,
        componentDamage,
        unit.pilotWounds,
        d6Roller,
      );

      for (const psrResult of batchResult.results) {
        events.push(
          this.createGameEvent(
            gameId,
            events.length,
            GameEventType.PSRResolved,
            currentState.turn,
            currentState.phase,
            {
              unitId,
              reason: psrResult.psr.reason,
              targetNumber: psrResult.targetNumber,
              roll: psrResult.roll,
              passed: psrResult.passed,
            },
            unitId,
          ),
        );
      }

      if (batchResult.unitFell) {
        const currentUnit = currentState.units[unitId];
        const newPilotWounds = currentUnit.pilotWounds + 1;
        const pilotConscious =
          newPilotWounds < 6 && currentUnit.pilotConscious;

        currentState = {
          ...currentState,
          units: {
            ...currentState.units,
            [unitId]: {
              ...currentUnit,
              prone: true,
              pilotWounds: newPilotWounds,
              pilotConscious,
              destroyed: !pilotConscious ? true : currentUnit.destroyed,
              pendingPSRs: [],
            },
          },
        };

        events.push(
          this.createGameEvent(
            gameId,
            events.length,
            GameEventType.UnitFell,
            currentState.turn,
            currentState.phase,
            {
              unitId,
              pilotDamage: 1,
            },
            unitId,
          ),
        );

        if (!pilotConscious && !currentUnit.destroyed) {
          events.push(
            this.createGameEvent(
              gameId,
              events.length,
              GameEventType.UnitDestroyed,
              currentState.turn,
              currentState.phase,
              {
                unitId,
                cause: 'pilot_death' as const,
              },
            ),
          );
        }
      } else {
        currentState = {
          ...currentState,
          units: {
            ...currentState.units,
            [unitId]: {
              ...currentState.units[unitId],
              pendingPSRs: [],
            },
          },
        };
      }
    }

    return currentState;
  }

  private runHeatPhase(state: IGameState): IGameState {
    let currentState = { ...state, phase: GamePhase.Heat };
    const baseHeatSinks = 10;

    for (const unitId of Object.keys(currentState.units)) {
      const unit = currentState.units[unitId];
      if (unit.destroyed) continue;

      const weaponsFired = unit.weaponsFiredThisTurn ?? [];
      const weaponHeat = weaponsFired.length * 3;

      let movementHeat = 0;
      if (unit.movementThisTurn === MovementType.Walk) movementHeat = 1;
      else if (unit.movementThisTurn === MovementType.Run) movementHeat = 2;
      else if (unit.movementThisTurn === MovementType.Jump) movementHeat = 3;

      const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
      const engineHeat = componentDamage.engineHits * 5;

      const heatSinksLost = componentDamage.heatSinksDestroyed ?? 0;
      const dissipation = Math.max(0, baseHeatSinks - heatSinksLost);

      const newHeat = Math.max(
        0,
        unit.heat + weaponHeat + movementHeat + engineHeat - dissipation,
      );

      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...unit,
            heat: newHeat,
          },
        },
      };
    }

    return currentState;
  }

  private createSideUnits(
    units: Record<string, IUnitGameState>,
    config: ISimulationConfig,
    side: GameSide,
    rowPosition: number,
  ): void {
    const count =
      side === GameSide.Player
        ? config.unitCount.player
        : config.unitCount.opponent;
    const prefix = side === GameSide.Player ? 'player' : 'opponent';

    for (let i = 0; i < count; i++) {
      const id = `${prefix}-${i + 1}`;
      const position: IHexCoordinate = { q: i - 1, r: rowPosition };
      units[id] = createMinimalUnitState(id, side, position);
    }
  }

  private createInitialState(config: ISimulationConfig): IGameState {
    const units: Record<string, IUnitGameState> = {};

    this.createSideUnits(units, config, GameSide.Player, -config.mapRadius + 1);
    this.createSideUnits(
      units,
      config,
      GameSide.Opponent,
      config.mapRadius - 1,
    );

    return {
      gameId: `sim-${config.seed}`,
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Initiative,
      activationIndex: 0,
      units,
      turnEvents: [],
    };
  }

  private applyMovementEvent(
    state: IGameState,
    unitId: string,
    payload: {
      to: { q: number; r: number };
      facing: number;
      movementType: MovementType;
      mpUsed: number;
    },
  ): IGameState {
    const unit = state.units[unitId];
    if (!unit) return state;

    const updatedUnit: IUnitGameState = {
      ...unit,
      position: payload.to,
      facing: payload.facing as Facing,
      movementThisTurn: payload.movementType,
      hexesMovedThisTurn: payload.mpUsed,
    };

    return {
      ...state,
      units: {
        ...state.units,
        [unitId]: updatedUnit,
      },
    };
  }

  private buildDamageState(unit: IUnitGameState): IUnitDamageState {
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
      pilotConscious: unit.pilotConscious,
      destroyed: unit.destroyed,
    };
  }

  private applyDamageResultToState(
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
    },
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
          newArmor['left_arm'] = 0;
          newStructure['left_arm'] = 0;
        }
        if (
          locDamage.location === 'right_torso' &&
          !newDestroyedLocations.includes('right_arm')
        ) {
          newDestroyedLocations.push('right_arm');
          newArmor['right_arm'] = 0;
          newStructure['right_arm'] = 0;
        }
      }
    }

    const updatedUnit: IUnitGameState = {
      ...target,
      armor: newArmor,
      structure: newStructure,
      destroyedLocations: newDestroyedLocations,
      pilotWounds: damageState.pilotWounds,
      pilotConscious: damageState.pilotConscious,
      destroyed: damageResult.unitDestroyed,
    };

    return {
      ...state,
      units: {
        ...state.units,
        [targetId]: updatedUnit,
      },
    };
  }

  private isUnitOperable(u: IUnitGameState): boolean {
    return !u.destroyed && u.pilotConscious !== false;
  }

  private isGameOver(state: IGameState): boolean {
    const playerAlive = Object.values(state.units).some(
      (u) => u.side === GameSide.Player && this.isUnitOperable(u),
    );
    const opponentAlive = Object.values(state.units).some(
      (u) => u.side === GameSide.Opponent && this.isUnitOperable(u),
    );
    return !playerAlive || !opponentAlive;
  }

  private determineWinner(
    state: IGameState,
  ): 'player' | 'opponent' | 'draw' | null {
    const playerAlive = Object.values(state.units).some(
      (u) => u.side === GameSide.Player && this.isUnitOperable(u),
    );
    const opponentAlive = Object.values(state.units).some(
      (u) => u.side === GameSide.Opponent && this.isUnitOperable(u),
    );

    if (!playerAlive && !opponentAlive) return 'draw';
    if (!playerAlive) return 'opponent';
    if (!opponentAlive) return 'player';
    return null;
  }
}
