/**
 * Game Session Management
 * Create and manage game sessions.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import {
  ENGINE_HIT_HEAT,
  getShutdownTN,
  getAmmoExplosionTN,
  getPilotHeatDamage,
} from '@/constants/heat';
import {
  IGameSession,
  IGameEvent,
  IGameState,
  IGameConfig,
  IGameUnit,
  IUnitGameState,
  GameStatus,
  GamePhase,
  GameSide,
  IWeaponAttackData,
} from '@/types/gameplay';
import {
  IHexCoordinate,
  Facing,
  MovementType,
  RangeBracket,
  FiringArc,
  GameEventType,
  IAttackDeclaredPayload,
  IWeaponAttack,
  IToHitModifier,
  IMovementDeclaredPayload,
} from '@/types/gameplay';
import { CombatLocation } from '@/types/gameplay';

import {
  consumeAmmo,
  isEnergyWeapon,
  resolveAmmoExplosion,
} from './ammoTracking';
import {
  resolveCriticalHits,
  checkTACTrigger,
  processTAC,
  buildDefaultCriticalSlotManifest,
  CriticalSlotManifest,
  CriticalHitEvent,
} from './criticalHitResolution';
import {
  resolveDamage as resolveDamagePipeline,
  IUnitDamageState,
} from './damage';
import { type DiceRoller, type D6Roller, defaultD6Roller } from './diceTypes';
import { resolveFall } from './fallMechanics';
import { calculateFiringArc } from './firingArc';
import {
  createGameCreatedEvent,
  createGameStartedEvent,
  createGameEndedEvent,
  createPhaseChangedEvent,
  createInitiativeRolledEvent,
  createMovementDeclaredEvent,
  createMovementLockedEvent,
  createAttackDeclaredEvent,
  createAttackLockedEvent,
  createAttackResolvedEvent,
  createDamageAppliedEvent,
  createPilotHitEvent,
  createUnitDestroyedEvent,
  createHeatDissipatedEvent,
  createHeatGeneratedEvent,
  createCriticalHitResolvedEvent,
  createPSRTriggeredEvent,
  createPSRResolvedEvent,
  createUnitFellEvent,
  createAmmoConsumedEvent,
  createShutdownCheckEvent,
  createStartupAttemptEvent,
} from './gameEvents';
import { deriveState, allUnitsLocked } from './gameState';
import {
  roll2d6 as rollDice,
  determineHitLocationFromRoll,
  isHeadHit,
} from './hitLocation';
export { type DiceRoller } from './diceTypes';
import {
  resolveAllPSRs,
  checkPhaseDamagePSR,
  isLegLocation,
  isGyroDestroyed,
} from './pilotingSkillRolls';
import { calculateToHit } from './toHit';

// =============================================================================
// Session Creation
// =============================================================================

/**
 * Create a new game session.
 */
export function createGameSession(
  config: IGameConfig,
  units: readonly IGameUnit[],
): IGameSession {
  const id = uuidv4();
  const now = new Date().toISOString();

  // Create the initial event
  const createdEvent = createGameCreatedEvent(id, config, units);
  const events: IGameEvent[] = [createdEvent];

  // Derive initial state
  const currentState = deriveState(id, events);

  return {
    id,
    createdAt: now,
    updatedAt: now,
    config,
    units,
    events,
    currentState,
  };
}

/**
 * Start a game session.
 */
export function startGame(
  session: IGameSession,
  firstSide: GameSide,
): IGameSession {
  if (session.currentState.status !== GameStatus.Setup) {
    throw new Error('Game is not in setup state');
  }

  const sequence = session.events.length;
  const event = createGameStartedEvent(session.id, sequence, firstSide);

  return appendEvent(session, event);
}

/**
 * End a game session.
 */
export function endGame(
  session: IGameSession,
  winner: GameSide | 'draw',
  reason: 'destruction' | 'concede' | 'turn_limit' | 'objective',
): IGameSession {
  if (session.currentState.status !== GameStatus.Active) {
    throw new Error('Game is not active');
  }

  const { turn, phase } = session.currentState;
  const sequence = session.events.length;
  const event = createGameEndedEvent(
    session.id,
    sequence,
    turn,
    phase,
    winner,
    reason,
  );

  return appendEvent(session, event);
}

// =============================================================================
// Event Management
// =============================================================================

/**
 * Append an event to the session (immutable).
 */
export function appendEvent(
  session: IGameSession,
  event: IGameEvent,
): IGameSession {
  const events = [...session.events, event];
  const currentState = deriveState(session.id, events);

  return {
    ...session,
    events,
    currentState,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get events for a specific turn.
 */
export function getEventsForTurn(
  session: IGameSession,
  turn: number,
): readonly IGameEvent[] {
  return session.events.filter((e) => e.turn === turn);
}

/**
 * Get events for a specific phase.
 */
export function getEventsForPhase(
  session: IGameSession,
  turn: number,
  phase: GamePhase,
): readonly IGameEvent[] {
  return session.events.filter((e) => e.turn === turn && e.phase === phase);
}

// =============================================================================
// Phase Management
// =============================================================================

/**
 * Get the next phase in sequence.
 */
export function getNextPhase(currentPhase: GamePhase): GamePhase {
  const phaseOrder: GamePhase[] = [
    GamePhase.Initiative,
    GamePhase.Movement,
    GamePhase.WeaponAttack,
    GamePhase.PhysicalAttack,
    GamePhase.Heat,
    GamePhase.End,
  ];

  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
    return GamePhase.Initiative; // Wrap to next turn
  }

  return phaseOrder[currentIndex + 1];
}

/**
 * Advance to the next phase.
 */
export function advancePhase(session: IGameSession): IGameSession {
  const { phase, turn } = session.currentState;
  const nextPhase = getNextPhase(phase);

  // If wrapping to initiative, increment turn
  const nextTurn =
    nextPhase === GamePhase.Initiative && phase !== GamePhase.Initiative
      ? turn + 1
      : turn;

  const sequence = session.events.length;
  const event = createPhaseChangedEvent(
    session.id,
    sequence,
    nextTurn,
    phase,
    nextPhase,
  );

  return appendEvent(session, event);
}

/**
 * Check if the current phase can advance.
 */
export function canAdvancePhase(session: IGameSession): boolean {
  const { phase, status } = session.currentState;

  if (status !== GameStatus.Active) {
    return false;
  }

  // Movement, Weapon Attack, and Physical Attack phases require all units to be locked
  if (
    phase === GamePhase.Movement ||
    phase === GamePhase.WeaponAttack ||
    phase === GamePhase.PhysicalAttack
  ) {
    return allUnitsLocked(session.currentState);
  }

  // Other phases can advance freely
  return true;
}

// =============================================================================
// Initiative Phase
// =============================================================================

/**
 * Roll 2d6.
 */
export function roll2d6(diceRoller: D6Roller = defaultD6Roller): number {
  return diceRoller() + diceRoller();
}

/**
 * Roll initiative for both sides.
 */
export function rollInitiative(
  session: IGameSession,
  movesFirst?: GameSide,
): IGameSession {
  if (session.currentState.phase !== GamePhase.Initiative) {
    throw new Error('Not in initiative phase');
  }

  const playerRoll = roll2d6();
  const opponentRoll = roll2d6();

  let winner: GameSide;
  if (playerRoll > opponentRoll) {
    winner = GameSide.Player;
  } else if (opponentRoll > playerRoll) {
    winner = GameSide.Opponent;
  } else {
    // Tie - re-roll (for simplicity, player wins ties)
    winner = GameSide.Player;
  }

  // Winner chooses who moves first (default: winner moves second for tactical advantage)
  const actualMovesFirst =
    movesFirst ??
    (winner === GameSide.Player ? GameSide.Opponent : GameSide.Player);

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createInitiativeRolledEvent(
    session.id,
    sequence,
    turn,
    playerRoll,
    opponentRoll,
    winner,
    actualMovesFirst,
  );

  return appendEvent(session, event);
}

// =============================================================================
// Movement Phase
// =============================================================================

/**
 * Declare movement for a unit.
 */
export function declareMovement(
  session: IGameSession,
  unitId: string,
  from: IHexCoordinate,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  mpUsed: number,
  heatGenerated: number,
): IGameSession {
  if (session.currentState.phase !== GamePhase.Movement) {
    throw new Error('Not in movement phase');
  }

  const unit = session.currentState.units[unitId];
  if (!unit) {
    throw new Error(`Unit ${unitId} not found`);
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createMovementDeclaredEvent(
    session.id,
    sequence,
    turn,
    unitId,
    from,
    to,
    facing,
    movementType,
    mpUsed,
    heatGenerated,
  );

  return appendEvent(session, event);
}

/**
 * Lock movement for a unit.
 */
export function lockMovement(
  session: IGameSession,
  unitId: string,
): IGameSession {
  if (session.currentState.phase !== GamePhase.Movement) {
    throw new Error('Not in movement phase');
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createMovementLockedEvent(session.id, sequence, turn, unitId);

  return appendEvent(session, event);
}

// =============================================================================
// Weapon Attack Phase
// =============================================================================

export function declareAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  weapons: readonly IWeaponAttack[],
  range: number,
  rangeBracket: RangeBracket,
  _firingArc: FiringArc,
): IGameSession {
  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    throw new Error('Not in weapon attack phase');
  }

  const attackerUnit = session.currentState.units[attackerId];
  const targetUnit = session.currentState.units[targetId];

  if (!attackerUnit) {
    throw new Error(`Attacker unit ${attackerId} not found`);
  }
  if (!targetUnit) {
    throw new Error(`Target unit ${targetId} not found`);
  }

  const attacker = session.units.find((u) => u.id === attackerId);
  if (!attacker) {
    throw new Error(`Attacker ${attackerId} not found in units`);
  }

  const toHitCalc = calculateToHit(
    {
      gunnery: attacker.gunnery,
      movementType: attackerUnit.movementThisTurn,
      heat: attackerUnit.heat,
      damageModifiers: [],
    },
    {
      movementType: targetUnit.movementThisTurn,
      hexesMoved: targetUnit.hexesMovedThisTurn,
      prone: false,
      immobile: false,
      partialCover: false,
    },
    rangeBracket,
    range,
  );

  const modifiers: IToHitModifier[] = toHitCalc.modifiers.map((m) => ({
    name: m.name,
    value: m.value,
    source: m.source,
  }));

  const weaponIds = weapons.map((w) => w.weaponId);
  const weaponAttackData: IWeaponAttackData[] = weapons.map((w) => ({
    weaponId: w.weaponId,
    weaponName: w.weaponName,
    damage: w.damage,
    heat: w.heat,
  }));

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createAttackDeclaredEvent(
    session.id,
    sequence,
    turn,
    attackerId,
    targetId,
    weaponIds,
    toHitCalc.finalToHit,
    modifiers,
    weaponAttackData,
  );

  return appendEvent(session, event);
}

export function lockAttack(
  session: IGameSession,
  unitId: string,
): IGameSession {
  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    throw new Error('Not in weapon attack phase');
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createAttackLockedEvent(session.id, sequence, turn, unitId);

  return appendEvent(session, event);
}

function firingArcToString(
  arc: FiringArc,
): 'front' | 'rear' | 'left' | 'right' {
  switch (arc) {
    case FiringArc.Front:
      return 'front';
    case FiringArc.Rear:
      return 'rear';
    case FiringArc.Left:
      return 'left';
    case FiringArc.Right:
      return 'right';
    default:
      return 'front';
  }
}

function emitCriticalEvents(
  session: IGameSession,
  events: readonly CriticalHitEvent[],
  turn: number,
  unitId: string,
): IGameSession {
  let currentSession = session;
  for (const evt of events) {
    const seq = currentSession.events.length;
    if (evt.type === 'critical_hit_resolved') {
      const p = evt.payload;
      currentSession = appendEvent(
        currentSession,
        createCriticalHitResolvedEvent(
          currentSession.id,
          seq,
          turn,
          GamePhase.WeaponAttack,
          p.unitId,
          p.location,
          p.slotIndex,
          p.componentType,
          p.componentName,
          p.effect,
          p.destroyed,
        ),
      );
    } else if (evt.type === 'psr_triggered') {
      const p = evt.payload;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          seq,
          turn,
          GamePhase.WeaponAttack,
          p.unitId,
          p.reason,
          p.additionalModifier,
          p.triggerSource,
        ),
      );
    } else if (evt.type === 'unit_destroyed') {
      const p = evt.payload;
      currentSession = appendEvent(
        currentSession,
        createUnitDestroyedEvent(
          currentSession.id,
          seq,
          turn,
          GamePhase.WeaponAttack,
          unitId,
          p.cause as 'damage' | 'ammo_explosion' | 'pilot_death' | 'shutdown',
        ),
      );
    } else if (evt.type === 'pilot_hit') {
      const p = evt.payload;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          seq,
          turn,
          GamePhase.WeaponAttack,
          p.unitId,
          p.wounds,
          p.totalWounds,
          p.source,
          p.consciousnessCheckRequired,
          p.consciousnessCheckPassed,
        ),
      );
    }
  }
  return currentSession;
}

const DEFAULT_REAR_ARMOR: Record<
  'center_torso' | 'left_torso' | 'right_torso',
  number
> = {
  center_torso: 10,
  left_torso: 7,
  right_torso: 7,
};

function buildDamageStateFromUnit(
  unit: IUnitGameState,
  tonnage: number = 50,
): IUnitDamageState {
  const armorRecord = unit.armor as Record<CombatLocation, number>;
  const structureRecord = unit.structure as Record<CombatLocation, number>;
  const rearArmor: Record<
    'center_torso' | 'left_torso' | 'right_torso',
    number
  > = {
    center_torso:
      armorRecord.center_torso_rear ?? DEFAULT_REAR_ARMOR.center_torso,
    left_torso: armorRecord.left_torso_rear ?? DEFAULT_REAR_ARMOR.left_torso,
    right_torso: armorRecord.right_torso_rear ?? DEFAULT_REAR_ARMOR.right_torso,
  };

  return {
    armor: armorRecord,
    rearArmor,
    structure: structureRecord,
    destroyedLocations: unit.destroyedLocations as CombatLocation[],
    pilotWounds: unit.pilotWounds,
    pilotConscious: unit.pilotConscious,
    destroyed: unit.destroyed,
  };
}

export function resolveAttack(
  session: IGameSession,
  attackEvent: IGameEvent,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  const payload = attackEvent.payload as IAttackDeclaredPayload;
  const { attackerId, targetId, weapons, weaponAttacks, toHitNumber } = payload;

  const weaponDataMap = new Map<string, IWeaponAttackData>();
  if (weaponAttacks) {
    for (const wa of weaponAttacks) {
      weaponDataMap.set(wa.weaponId, wa);
    }
  }

  let currentSession = session;

  for (const weaponId of weapons) {
    const weaponData = weaponDataMap.get(weaponId);
    const weaponName = weaponData?.weaponName ?? weaponId;

    // Task 6.12: Consume ammo before firing (non-energy weapons)
    const attackerStateForAmmo = currentSession.currentState.units[attackerId];
    const ammoState = attackerStateForAmmo?.ammoState ?? {};
    if (!isEnergyWeapon(weaponName) && Object.keys(ammoState).length > 0) {
      const ammoResult = consumeAmmo(ammoState, attackerId, weaponName);
      if (ammoResult) {
        const ammoSeq = currentSession.events.length;
        const ammoTurn = currentSession.currentState.turn;
        currentSession = appendEvent(
          currentSession,
          createAmmoConsumedEvent(
            currentSession.id,
            ammoSeq,
            ammoTurn,
            GamePhase.WeaponAttack,
            attackerId,
            ammoResult.event.binId,
            ammoResult.event.weaponType,
            ammoResult.event.roundsConsumed,
            ammoResult.event.roundsRemaining,
          ),
        );
      }
    }

    const attackRoll = diceRoller();
    const hit = attackRoll.total >= toHitNumber;

    const sequence = currentSession.events.length;
    const { turn } = currentSession.currentState;

    if (hit) {
      const attackerState = currentSession.currentState.units[attackerId];
      const targetState = currentSession.currentState.units[targetId];
      const firingArc = calculateFiringArc(
        attackerState.position,
        targetState.position,
        targetState.facing,
      );
      const locationRoll = diceRoller();
      const hitLocationResult = determineHitLocationFromRoll(
        firingArc,
        locationRoll,
      );
      const location = hitLocationResult.location;
      let damage = weaponData?.damage ?? 5;

      // Task 3.5: Head-capping rule — max 3 damage from single standard weapon
      if (isHeadHit(location) && damage > 3) {
        damage = 3;
      }

      const resolvedEvent = createAttackResolvedEvent(
        currentSession.id,
        sequence,
        turn,
        attackerId,
        targetId,
        weaponId,
        attackRoll.total,
        toHitNumber,
        true,
        location,
        damage,
      );
      currentSession = appendEvent(currentSession, resolvedEvent);

      // Task 3.1: Use full damage pipeline from damage.ts
      const damageState = buildDamageStateFromUnit(targetState);
      const damageResult = resolveDamagePipeline(
        damageState,
        location as CombatLocation,
        damage,
      );

      // Emit DamageApplied events with actual armor/structure values
      for (const locDamage of damageResult.result.locationDamages) {
        const damageSequence = currentSession.events.length;
        const damageEvent = createDamageAppliedEvent(
          currentSession.id,
          damageSequence,
          turn,
          targetId,
          locDamage.location,
          locDamage.damage,
          locDamage.armorRemaining,
          locDamage.structureRemaining,
          locDamage.destroyed,
        );
        currentSession = appendEvent(currentSession, damageEvent);
      }

      // Phase 5: Critical hit resolution when internal structure exposed
      const d6Roller = () => {
        const r = diceRoller();
        return r.dice[0];
      };
      const manifest = buildDefaultCriticalSlotManifest();
      const targetCompDamage =
        targetState.componentDamage ??
        ({
          engineHits: 0,
          gyroHits: 0,
          sensorHits: 0,
          lifeSupport: 0,
          cockpitHit: false,
          actuators: {},
          weaponsDestroyed: [],
          heatSinksDestroyed: 0,
          jumpJetsDestroyed: 0,
        } as const);

      for (const locDamage of damageResult.result.locationDamages) {
        if (locDamage.structureDamage > 0 && !locDamage.destroyed) {
          const critResult = resolveCriticalHits(
            targetId,
            locDamage.location as CombatLocation,
            manifest,
            targetCompDamage,
            d6Roller,
          );
          currentSession = emitCriticalEvents(
            currentSession,
            critResult.events,
            turn,
            targetId,
          );
        }
      }

      // TAC: hit location roll of 2 triggers Through-Armor Critical
      if (locationRoll.total === 2) {
        const arcStr = firingArcToString(firingArc);
        const tacLocation = checkTACTrigger(2, arcStr);
        if (tacLocation) {
          const tacResult = processTAC(
            targetId,
            tacLocation,
            manifest,
            targetCompDamage,
            d6Roller,
          );
          currentSession = emitCriticalEvents(
            currentSession,
            tacResult.events,
            turn,
            targetId,
          );
        }
      }

      // Task 8.6: Leg structure damage PSR trigger
      for (const locDamage of damageResult.result.locationDamages) {
        if (
          isLegLocation(locDamage.location) &&
          locDamage.structureDamage > 0
        ) {
          const legPsrSeq = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createPSRTriggeredEvent(
              currentSession.id,
              legPsrSeq,
              turn,
              GamePhase.WeaponAttack,
              targetId,
              'Leg damage (internal structure exposed)',
              0,
              'leg_damage',
            ),
          );
          break;
        }
      }

      if (damageResult.result.pilotDamage) {
        const pd = damageResult.result.pilotDamage;
        const pilotSequence = currentSession.events.length;
        const pilotEvent = createPilotHitEvent(
          currentSession.id,
          pilotSequence,
          turn,
          GamePhase.WeaponAttack,
          targetId,
          pd.woundsInflicted,
          pd.totalWounds,
          pd.source as 'head_hit' | 'ammo_explosion' | 'mech_destruction',
          pd.consciousnessCheckRequired,
          pd.conscious,
        );
        currentSession = appendEvent(currentSession, pilotEvent);
      }

      if (damageResult.result.unitDestroyed) {
        const destroySequence = currentSession.events.length;
        const destroyEvent = createUnitDestroyedEvent(
          currentSession.id,
          destroySequence,
          turn,
          GamePhase.WeaponAttack,
          targetId,
          (damageResult.result.destructionCause as
            | 'damage'
            | 'ammo_explosion'
            | 'pilot_death'
            | 'shutdown') ?? 'damage',
        );
        currentSession = appendEvent(currentSession, destroyEvent);
      }
    } else {
      const resolvedEvent = createAttackResolvedEvent(
        currentSession.id,
        sequence,
        turn,
        attackerId,
        targetId,
        weaponId,
        attackRoll.total,
        toHitNumber,
        false,
      );
      currentSession = appendEvent(currentSession, resolvedEvent);
    }
  }

  return currentSession;
}

export function resolveAllAttacks(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  const { turn } = session.currentState;

  const attackEvents = session.events.filter(
    (e) => e.type === GameEventType.AttackDeclared && e.turn === turn,
  );

  let currentSession = session;

  for (const attackEvent of attackEvents) {
    currentSession = resolveAttack(currentSession, attackEvent, diceRoller);
  }

  return currentSession;
}

// =============================================================================
// PSR Resolution (End of Phase)
// =============================================================================

/**
 * Check for 20+ damage PSR triggers and queue them.
 * Called at end of weapon attack phase.
 */
export function checkAndQueueDamagePSRs(session: IGameSession): IGameSession {
  let currentSession = session;
  const { turn, phase } = currentSession.currentState;
  const unitIds = Object.keys(currentSession.currentState.units);

  for (const unitId of unitIds) {
    const unitState = currentSession.currentState.units[unitId];
    if (unitState.destroyed || !unitState.pilotConscious) continue;

    const damagePSR = checkPhaseDamagePSR(unitState);
    if (damagePSR) {
      const seq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          seq,
          turn,
          phase,
          unitId,
          damagePSR.reason,
          damagePSR.additionalModifier,
          damagePSR.triggerSource,
        ),
      );
    }
  }

  return currentSession;
}

/**
 * Resolve all pending PSRs for all units.
 * Implements first-failure-clears-remaining rule.
 * On failure, triggers fall mechanics (damage, prone, pilot damage).
 */
export function resolvePendingPSRs(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  let currentSession = session;
  const { turn, phase } = currentSession.currentState;
  const unitIds = Object.keys(currentSession.currentState.units);

  for (const unitId of unitIds) {
    const unitState = currentSession.currentState.units[unitId];
    if (unitState.destroyed || !unitState.pilotConscious) continue;

    const pendingPSRs = unitState.pendingPSRs ?? [];
    if (pendingPSRs.length === 0) continue;

    const unit = currentSession.units.find((u) => u.id === unitId);
    if (!unit) continue;

    const componentDamage = unitState.componentDamage ?? {
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

    // Check for automatic fall (gyro destroyed)
    if (isGyroDestroyed(componentDamage)) {
      // Auto-fall — no roll needed, emit UnitFell event directly
      const d6Roller = () => {
        const r = diceRoller();
        return r.dice[0];
      };
      const fallResult = resolveFall(50, unitState.facing, 0, d6Roller);

      // Clear all PSRs via resolved events
      for (const psr of pendingPSRs) {
        const resSeq = currentSession.events.length;
        currentSession = appendEvent(
          currentSession,
          createPSRResolvedEvent(
            currentSession.id,
            resSeq,
            turn,
            phase,
            unitId,
            Infinity,
            0,
            0,
            false,
            psr.reason,
          ),
        );
      }

      // Emit UnitFell
      const fellSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createUnitFellEvent(
          currentSession.id,
          fellSeq,
          turn,
          phase,
          unitId,
          fallResult.totalDamage,
          fallResult.newFacing,
          fallResult.pilotDamage,
        ),
      );

      // Pilot damage from fall
      const currentUnitState = currentSession.currentState.units[unitId];
      const totalWounds = currentUnitState.pilotWounds + 1;
      const pilotSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          pilotSeq,
          turn,
          phase,
          unitId,
          1,
          totalWounds,
          'head_hit',
          true,
          totalWounds < 6,
        ),
      );

      continue;
    }

    // Normal PSR resolution with dice
    const d6Roller = () => {
      const r = diceRoller();
      return r.dice[0];
    };

    const batchResult = resolveAllPSRs(
      unit.piloting,
      pendingPSRs,
      componentDamage,
      unitState.pilotWounds,
      d6Roller,
    );

    // Emit PSRResolved events for each rolled PSR
    for (const result of batchResult.results) {
      const resSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRResolvedEvent(
          currentSession.id,
          resSeq,
          turn,
          phase,
          unitId,
          result.targetNumber,
          result.roll,
          result.modifiers.reduce((s, m) => s + m.value, 0),
          result.passed,
          result.psr.reason,
        ),
      );
    }

    // Emit PSRResolved events for cleared PSRs (not rolled, auto-cleared)
    for (const cleared of batchResult.clearedPSRs) {
      const resSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRResolvedEvent(
          currentSession.id,
          resSeq,
          turn,
          phase,
          unitId,
          0,
          0,
          0,
          false,
          cleared.reason,
        ),
      );
    }

    // On failure, resolve fall
    if (batchResult.unitFell) {
      const fallResult = resolveFall(50, unitState.facing, 0, d6Roller);

      const fellSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createUnitFellEvent(
          currentSession.id,
          fellSeq,
          turn,
          phase,
          unitId,
          fallResult.totalDamage,
          fallResult.newFacing,
          fallResult.pilotDamage,
        ),
      );

      // Pilot damage from fall
      const currentUnitState = currentSession.currentState.units[unitId];
      const totalWounds = currentUnitState.pilotWounds + 1;
      const pilotSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          pilotSeq,
          turn,
          phase,
          unitId,
          1,
          totalWounds,
          'head_hit',
          true,
          totalWounds < 6,
        ),
      );
    }
  }

  return currentSession;
}

// =============================================================================
// Heat Phase
// =============================================================================

export function resolveHeatPhase(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  if (session.currentState.phase !== GamePhase.Heat) {
    throw new Error('Not in heat phase');
  }

  const { turn } = session.currentState;
  let currentSession = session;

  const turnEvents = session.events.filter((e) => e.turn === turn);

  const unitIds = Object.keys(session.currentState.units);

  for (const unitId of unitIds) {
    const unitState = currentSession.currentState.units[unitId];
    const unit = currentSession.units.find((u) => u.id === unitId);

    if (!unit || unitState.destroyed) {
      continue;
    }

    // --- Heat Generation ---

    let heatFromMovement = 0;
    const movementEvent = turnEvents.find(
      (e) => e.type === GameEventType.MovementDeclared && e.actorId === unitId,
    );
    if (movementEvent) {
      const payload = movementEvent.payload as IMovementDeclaredPayload;
      heatFromMovement = payload.heatGenerated;
    }

    let heatFromWeapons = 0;
    const attackEvents = turnEvents.filter(
      (e) => e.type === GameEventType.AttackDeclared && e.actorId === unitId,
    );
    for (const attackEvent of attackEvents) {
      const atkPayload = attackEvent.payload as IAttackDeclaredPayload;
      if (atkPayload.weaponAttacks && atkPayload.weaponAttacks.length > 0) {
        for (const wa of atkPayload.weaponAttacks) {
          heatFromWeapons += wa.heat;
        }
      } else {
        heatFromWeapons += atkPayload.weapons.length * 3;
      }
    }

    // Task 7.9: Engine critical hit heat generation (+5 per engine hit)
    const compDamage = unitState.componentDamage;
    const engineHits = compDamage?.engineHits ?? 0;
    const heatFromEngine = engineHits * ENGINE_HIT_HEAT;

    const totalHeatGenerated =
      heatFromMovement + heatFromWeapons + heatFromEngine;

    if (totalHeatGenerated > 0) {
      const heatGenSequence = currentSession.events.length;
      const heatGenEvent = createHeatGeneratedEvent(
        currentSession.id,
        heatGenSequence,
        turn,
        GamePhase.Heat,
        unitId,
        totalHeatGenerated,
        heatFromEngine > 0 ? 'external' : 'weapons',
        unitState.heat + totalHeatGenerated,
      );
      currentSession = appendEvent(currentSession, heatGenEvent);
    }

    // --- Heat Dissipation ---
    // Task 7.10/7.11: Consolidated dissipation with heat sink crit reduction
    const currentHeatBeforeDissipation =
      currentSession.currentState.units[unitId].heat;

    const unitHeatSinks = unit.heatSinks ?? 10;
    const heatSinksDestroyed = compDamage?.heatSinksDestroyed ?? 0;
    // Each destroyed heat sink reduces dissipation by 1 (single) — doubles tracked as 2 per sink
    const totalDissipation = Math.max(0, unitHeatSinks - heatSinksDestroyed);

    const newHeat = Math.max(
      0,
      currentHeatBeforeDissipation - totalDissipation,
    );

    const dissipationSequence = currentSession.events.length;
    const dissipationEvent = createHeatDissipatedEvent(
      currentSession.id,
      dissipationSequence,
      turn,
      unitId,
      totalDissipation,
      newHeat,
    );
    currentSession = appendEvent(currentSession, dissipationEvent);

    // --- Post-dissipation heat for checks ---
    const finalHeat = currentSession.currentState.units[unitId].heat;

    // Task 7.5: Automatic shutdown at heat >= 30
    if (finalHeat >= 30) {
      const shutdownSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createShutdownCheckEvent(
          currentSession.id,
          shutdownSeq,
          turn,
          GamePhase.Heat,
          unitId,
          finalHeat,
          Infinity,
          0,
          true,
        ),
      );

      // Task 7.7: PSR at TN 3 on shutdown
      const psrSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          psrSeq,
          turn,
          GamePhase.Heat,
          unitId,
          'Reactor shutdown',
          0,
          'heat_shutdown',
        ),
      );
    }
    // Task 7.4: Shutdown check at heat >= 14
    else {
      const shutdownTN = getShutdownTN(finalHeat);
      if (shutdownTN > 0) {
        const shutdownRoll = diceRoller();
        const shutdownAvoided = shutdownRoll.total >= shutdownTN;

        const shutdownSeq = currentSession.events.length;
        currentSession = appendEvent(
          currentSession,
          createShutdownCheckEvent(
            currentSession.id,
            shutdownSeq,
            turn,
            GamePhase.Heat,
            unitId,
            finalHeat,
            shutdownTN,
            shutdownRoll.total,
            !shutdownAvoided,
          ),
        );

        if (!shutdownAvoided) {
          // Task 7.7: PSR at TN 3 on shutdown
          const psrSeq = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createPSRTriggeredEvent(
              currentSession.id,
              psrSeq,
              turn,
              GamePhase.Heat,
              unitId,
              'Reactor shutdown',
              0,
              'heat_shutdown',
            ),
          );
        }
      }
    }

    // Task 7.10: Heat-induced ammo explosion check
    const ammoExplosionTN = getAmmoExplosionTN(finalHeat);
    if (ammoExplosionTN > 0) {
      const unitAmmoState =
        currentSession.currentState.units[unitId].ammoState ?? {};
      const hasAmmo = Object.values(unitAmmoState).some(
        (bin) => bin.remainingRounds > 0 && bin.isExplosive,
      );

      if (hasAmmo) {
        if (ammoExplosionTN === Infinity) {
          // Auto-explode at 30+ — all ammo explodes
          for (const bin of Object.values(unitAmmoState)) {
            if (bin.remainingRounds > 0 && bin.isExplosive) {
              const explosionResult = resolveAmmoExplosion(
                unitAmmoState,
                bin.binId,
                bin.remainingRounds,
                'none',
              );
              if (explosionResult && explosionResult.totalDamage > 0) {
                const destroySeq = currentSession.events.length;
                currentSession = appendEvent(
                  currentSession,
                  createUnitDestroyedEvent(
                    currentSession.id,
                    destroySeq,
                    turn,
                    GamePhase.Heat,
                    unitId,
                    'ammo_explosion',
                  ),
                );
                break;
              }
            }
          }
        } else {
          const ammoRoll = diceRoller();
          if (ammoRoll.total < ammoExplosionTN) {
            // Failed ammo explosion check — find first explosive ammo bin
            const explosiveBin = Object.values(unitAmmoState).find(
              (bin) => bin.remainingRounds > 0 && bin.isExplosive,
            );
            if (explosiveBin) {
              const explosionResult = resolveAmmoExplosion(
                unitAmmoState,
                explosiveBin.binId,
                explosiveBin.remainingRounds,
                'none',
              );
              if (explosionResult && explosionResult.totalDamage > 0) {
                const destroySeq = currentSession.events.length;
                currentSession = appendEvent(
                  currentSession,
                  createUnitDestroyedEvent(
                    currentSession.id,
                    destroySeq,
                    turn,
                    GamePhase.Heat,
                    unitId,
                    'ammo_explosion',
                  ),
                );
              }
            }
          }
        }
      }
    }

    // Task 7.11: Pilot heat damage
    const lifeSupportHits = compDamage?.lifeSupport ?? 0;
    const pilotDamage = getPilotHeatDamage(finalHeat, lifeSupportHits);
    if (pilotDamage > 0) {
      const currentUnitState = currentSession.currentState.units[unitId];
      const totalWounds = currentUnitState.pilotWounds + pilotDamage;
      const pilotSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          pilotSeq,
          turn,
          GamePhase.Heat,
          unitId,
          pilotDamage,
          totalWounds,
          'head_hit',
          true,
          totalWounds < 6,
        ),
      );
    }
  }

  return currentSession;
}

// =============================================================================
// Replay
// =============================================================================

/**
 * Get state at a specific event sequence.
 */
export function replayToSequence(
  session: IGameSession,
  sequence: number,
): IGameState {
  const eventsUpTo = session.events.filter((e) => e.sequence <= sequence);
  return deriveState(session.id, eventsUpTo);
}

/**
 * Get state at a specific turn.
 */
export function replayToTurn(session: IGameSession, turn: number): IGameState {
  const eventsUpTo = session.events.filter((e) => e.turn <= turn);
  return deriveState(session.id, eventsUpTo);
}

/**
 * Generate a text log of game events.
 */
export function generateGameLog(session: IGameSession): string {
  const lines: string[] = [];

  for (const event of session.events) {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const prefix = `[Turn ${event.turn}/${event.phase}] ${timestamp}:`;

    switch (event.type) {
      case 'game_created':
        lines.push(`${prefix} Game created`);
        break;
      case 'game_started':
        lines.push(`${prefix} Game started`);
        break;
      case 'game_ended':
        lines.push(`${prefix} Game ended`);
        break;
      case 'phase_changed':
        lines.push(`${prefix} Phase changed to ${event.phase}`);
        break;
      case 'initiative_rolled':
        lines.push(`${prefix} Initiative rolled`);
        break;
      case 'movement_declared':
        lines.push(`${prefix} Unit ${event.actorId} moved`);
        break;
      case 'movement_locked':
        lines.push(`${prefix} Unit ${event.actorId} locked movement`);
        break;
      case 'attack_declared':
        lines.push(`${prefix} Unit ${event.actorId} declared attack`);
        break;
      case 'attack_resolved':
        lines.push(`${prefix} Attack resolved`);
        break;
      case 'damage_applied':
        lines.push(`${prefix} Damage applied`);
        break;
      case 'unit_destroyed':
        lines.push(`${prefix} Unit ${event.actorId} destroyed`);
        break;
      default:
        lines.push(`${prefix} ${event.type}`);
    }
  }

  return lines.join('\n');
}
