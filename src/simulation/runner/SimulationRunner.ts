import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import {
  GamePhase,
  GameEventType,
  IGameState,
  IUnitGameState,
  IGameEvent,
  Facing,
  IHexGrid,
  MovementType,
  RangeBracket,
} from '@/types/gameplay';
import { CombatLocation, IAttackerState, ITargetState } from '@/types/gameplay';
import { resolveDamage, IUnitDamageState } from '@/utils/gameplay/damage';
import { calculateFiringArc } from '@/utils/gameplay/firingArc';
import { hexDistance } from '@/utils/gameplay/hexMath';
import {
  determineHitLocation,
  isHeadHit,
  D6Roller,
} from '@/utils/gameplay/hitLocation';
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

import type { BattleState as AnomalyBattleState } from '../detectors/HeatSuicideDetector';
import type { BattleState as KeyMomentBattleState } from '../detectors/KeyMomentDetector';

import { BotPlayer } from '../ai/BotPlayer';
import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { IViolation } from '../invariants/types';
import {
  BASE_HEAT_SINKS,
  DAMAGE_PSR_THRESHOLD,
  DEFAULT_COMPONENT_DAMAGE,
  DEFAULT_GUNNERY,
  DEFAULT_PILOTING,
  DEFAULT_TONNAGE,
  ENGINE_HEAT_PER_CRITICAL,
  HEAD_HIT_DAMAGE_CAP,
  JUMP_HEAT,
  LETHAL_PILOT_WOUNDS,
  MAX_TURNS,
  MEDIUM_LASER_HEAT,
  RUN_HEAT,
  WALK_HEAT,
} from './SimulationRunnerConstants';
import {
  createAnomalyDetectors,
  createKeyMomentDetector,
  type IAnomalyDetectors,
  buildAnomalyBattleState as buildAnomalyBattleStateFromState,
  buildKeyMomentBattleState as buildKeyMomentBattleStateFromState,
  convertAnomaliesToViolations as convertAnomaliesToViolationsFromDetectors,
  runAllAnomalyDetectors as runAllAnomalyDetectorsFromDetectors,
} from './SimulationRunnerDetection';
import {
  applyDamageResultToState as applyDamageResultToStateFromState,
  applyMovementEvent as applyMovementEventFromState,
  buildDamageState as buildDamageStateFromState,
  createInitialState as createInitialStateFromConfig,
  determineWinner as determineWinnerFromState,
  isGameOver as isGameOverFromState,
  isUnitOperable as isUnitOperableFromState,
  resetTurnState as resetTurnStateFromState,
} from './SimulationRunnerState';
import {
  createMinimalGrid,
  createMinimalWeapon,
  createMovementCapability,
  getRangeBracket,
  toAIUnitState,
} from './SimulationRunnerSupport';
import { ISimulationRunResult, IDetectorConfig } from './types';

export class SimulationRunner {
  private readonly random: SeededRandom;
  private readonly invariantRunner: InvariantRunner;
  private readonly detectorConfig: IDetectorConfig;
  private readonly keyMomentDetector = createKeyMomentDetector();
  private readonly anomalyDetectors: IAnomalyDetectors =
    createAnomalyDetectors();

  constructor(
    seed: number,
    invariantRunner?: InvariantRunner,
    detectorConfig?: IDetectorConfig,
  ) {
    this.random = new SeededRandom(seed);
    this.invariantRunner = invariantRunner ?? new InvariantRunner();
    this.detectorConfig = detectorConfig ?? {};
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
    return runAllAnomalyDetectorsFromDetectors(
      events,
      battleState,
      this.anomalyDetectors,
      this.detectorConfig,
    );
  }

  /**
   * Converts anomalies to the IViolation format for the violation log.
   */
  private convertAnomaliesToViolations(
    anomalies: readonly IAnomaly[],
  ): IViolation[] {
    return convertAnomaliesToViolationsFromDetectors(anomalies);
  }

  /**
   * Builds a BattleState suitable for the KeyMomentDetector from game state.
   */
  private buildKeyMomentBattleState(state: IGameState): KeyMomentBattleState {
    return buildKeyMomentBattleStateFromState(state);
  }

  /**
   * Builds a BattleState suitable for anomaly detectors from game state.
   */
  private buildAnomalyBattleState(state: IGameState): AnomalyBattleState {
    return buildAnomalyBattleStateFromState(state);
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
          gunnery: DEFAULT_GUNNERY,
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
          if (isHeadHit(location) && damage > HEAD_HIT_DAMAGE_CAP) {
            damage = HEAD_HIT_DAMAGE_CAP;
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
            (targetPostDamage.damageThisPhase ?? 0) >= DAMAGE_PSR_THRESHOLD
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
                    pendingPSRs: [...existingPSRs, createDamagePSR(targetId)],
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
        if (isHeadHit(result.hitLocation) && damage > HEAD_HIT_DAMAGE_CAP) {
          damage = HEAD_HIT_DAMAGE_CAP;
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
          const existingPSRs = currentState.units[target.id].pendingPSRs ?? [];
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
          newPilotWounds < LETHAL_PILOT_WOUNDS && currentUnit.pilotConscious;

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
    for (const unitId of Object.keys(currentState.units)) {
      const unit = currentState.units[unitId];
      if (unit.destroyed) continue;

      const weaponsFired = unit.weaponsFiredThisTurn ?? [];
      const weaponHeat = weaponsFired.length * MEDIUM_LASER_HEAT;

      let movementHeat = 0;
      if (unit.movementThisTurn === MovementType.Walk) movementHeat = WALK_HEAT;
      else if (unit.movementThisTurn === MovementType.Run)
        movementHeat = RUN_HEAT;
      else if (unit.movementThisTurn === MovementType.Jump)
        movementHeat = JUMP_HEAT;

      const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
      const engineHeat = componentDamage.engineHits * ENGINE_HEAT_PER_CRITICAL;

      const heatSinksLost = componentDamage.heatSinksDestroyed ?? 0;
      const dissipation = Math.max(0, BASE_HEAT_SINKS - heatSinksLost);

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

  private createInitialState(config: ISimulationConfig): IGameState {
    return createInitialStateFromConfig(config);
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
    return applyMovementEventFromState(state, unitId, payload);
  }

  private buildDamageState(unit: IUnitGameState): IUnitDamageState {
    return buildDamageStateFromState(unit);
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
    return applyDamageResultToStateFromState(
      state,
      targetId,
      damageState,
      damageResult,
    );
  }

  private isUnitOperable(u: IUnitGameState): boolean {
    return isUnitOperableFromState(u);
  }

  private isGameOver(state: IGameState): boolean {
    return isGameOverFromState(state);
  }

  private determineWinner(
    state: IGameState,
  ): 'player' | 'opponent' | 'draw' | null {
    return determineWinnerFromState(state);
  }
}
