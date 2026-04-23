/**
 * Session-level physical attack wiring.
 *
 * Bridges the standalone `physicalAttacks/` module (to-hit, damage,
 * restrictions) into the event-sourced session: declarations emit
 * `PhysicalAttackDeclared`; resolution emits `PhysicalAttackResolved`,
 * `DamageApplied` (via `resolveDamagePipeline`), and `PSRTriggered` for
 * post-attack PSR triggers (target on hit; attacker on charge / kick /
 * DFA miss).
 *
 * @spec openspec/changes/implement-physical-attack-phase/tasks.md
 */

import {
  CombatLocation,
  GamePhase,
  GameEventType,
  IGameEvent,
  IGameSession,
  IPhysicalAttackDeclaredPayload,
} from '@/types/gameplay';

import { resolveDamage as resolveDamagePipeline } from './damage';
import { type DiceRoller } from './diceTypes';
import {
  createDamageAppliedEvent,
  createPhysicalAttackDeclaredEvent,
  createPhysicalAttackResolvedEvent,
  createPSRTriggeredEvent,
} from './gameEvents';
import { buildDamageStateFromUnit } from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import { roll2d6 as rollDice } from './hitLocation';
import {
  calculatePhysicalToHit,
  canCharge,
  canDFA,
  canKick,
  canMeleeWeapon,
  canPunch,
  determinePhysicalHitLocation,
  IPhysicalAttackInput,
  IPhysicalAttackRestriction,
  PhysicalAttackLimb,
  PhysicalAttackType,
  resolvePhysicalAttack,
  splitPhysicalDamageIntoClusters,
} from './physicalAttacks';

/**
 * Attacker / target bag passed by callers that supply per-unit static
 * data not stored on `IGameUnit` (tonnage, etc.).
 */
export interface IPhysicalAttackContext {
  readonly attackerTonnage: number;
  readonly targetTonnage?: number;
  readonly pilotingSkill: number;
  readonly arm?: 'left' | 'right';
  readonly hexesMoved?: number;
  readonly weaponsFiredFromArm?: readonly string[];
  /**
   * Per `implement-physical-attack-phase` task 4.3 / 5.3: target movement
   * modifier (TMM). Threaded into punch / kick / melee / DFA to-hit.
   */
  readonly targetMovementModifier?: number;
  /**
   * Per task 6.1: attacker-movement modifier for charge to-hit.
   */
  readonly attackerMovementModifier?: number;
  /**
   * Per task 3.5: limbs already used for physical attacks this turn
   * (same limb cannot punch AND kick in one turn).
   */
  readonly limbsUsedThisTurn?: readonly PhysicalAttackLimb[];
  /**
   * Per task 2.3: the limb this declaration targets (required for punch
   * and kick; optional for club attacks).
   */
  readonly limb?: PhysicalAttackLimb;
  /**
   * Per tasks 3.3 / 3.4: actuator-presence booleans feed the restriction
   * validator — destruction lives in `componentDamage`, but "mech was
   * built without this actuator" is a separate concern.
   */
  readonly lowerArmActuatorPresent?: boolean;
  readonly handActuatorPresent?: boolean;
  readonly upperLegActuatorPresent?: boolean;
  readonly footActuatorPresent?: boolean;
  /**
   * Per tasks 3.6 / 3.7: DFA requires a jump; charge requires a run.
   */
  readonly attackerJumpedThisTurn?: boolean;
  readonly attackerRanThisTurn?: boolean;
  /**
   * Per task 8.5: the destination hex for a push. If `false` the caller
   * has already determined the push target hex is blocked / off-map.
   */
  readonly pushDestinationValid?: boolean;
}

/**
 * Per `implement-physical-attack-phase` task 3.8: project a
 * restriction result's reason code to the canonical trigger source
 * consumed by the PSR queue. Used only for `AttackerProne` and
 * `LimbMissing` today; unknown codes fall through to a generic
 * descriptor.
 */
function buildRestrictionEventReason(
  restriction: IPhysicalAttackRestriction,
): string {
  return (
    restriction.reasonCode ?? restriction.reason ?? 'PhysicalAttackInvalid'
  );
}

/**
 * Per `implement-physical-attack-phase` task 2: declare a physical
 * attack. Validates restrictions; on rejection emits `AttackInvalid`
 * with the restriction reason. On accept emits
 * `PhysicalAttackDeclared`.
 */
export function declarePhysicalAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  attackType: PhysicalAttackType,
  context: IPhysicalAttackContext,
): IGameSession {
  const attackerState = session.currentState.units[attackerId];
  if (!attackerState || attackerState.destroyed) {
    return session;
  }

  const componentDamage = attackerState.componentDamage ?? {
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

  const input: IPhysicalAttackInput = {
    attackerTonnage: context.attackerTonnage,
    pilotingSkill: context.pilotingSkill,
    componentDamage,
    attackType,
    arm: context.arm,
    hexesMoved: context.hexesMoved,
    heat: attackerState.heat,
    isUnderwater: false,
    weaponsFiredFromArm: context.weaponsFiredFromArm,
    attackerProne: attackerState.prone,
    targetTonnage: context.targetTonnage,
    targetMovementModifier: context.targetMovementModifier,
    attackerMovementModifier: context.attackerMovementModifier,
    attackerJumpedThisTurn: context.attackerJumpedThisTurn,
    attackerRanThisTurn: context.attackerRanThisTurn,
    limbsUsedThisTurn: context.limbsUsedThisTurn,
    limb: context.limb,
    lowerArmActuatorPresent: context.lowerArmActuatorPresent,
    handActuatorPresent: context.handActuatorPresent,
    upperLegActuatorPresent: context.upperLegActuatorPresent,
    footActuatorPresent: context.footActuatorPresent,
  };

  // Per task 3.1 / 3.2 / 3.3 / 3.4 / 3.5 / 3.6 / 3.7: restrictions run
  // per attack type. Charge / DFA / melee gate on the same helpers used
  // by the to-hit layer.
  let restriction: IPhysicalAttackRestriction;
  if (attackType === 'punch') {
    restriction = canPunch(input);
  } else if (attackType === 'kick') {
    restriction = canKick(input);
  } else if (attackType === 'charge') {
    restriction = canCharge(input);
  } else if (attackType === 'dfa') {
    restriction = canDFA(input);
  } else if (
    attackType === 'hatchet' ||
    attackType === 'sword' ||
    attackType === 'mace' ||
    attackType === 'lance'
  ) {
    restriction = canMeleeWeapon(input);
  } else {
    restriction = { allowed: true };
  }

  if (!restriction.allowed) {
    // Per spec task 3.8: rejections surface as a
    // `PhysicalAttackResolved { hit:false, roll:0, toHitNumber:Infinity }`
    // event whose `location` field carries the reason code so replay +
    // UI can distinguish rejections from rolled misses. A future change
    // can promote this to a dedicated `PhysicalAttackInvalid` event.
    const sequence = session.events.length;
    const { turn } = session.currentState;
    return appendEvent(
      session,
      createPhysicalAttackResolvedEvent(
        session.id,
        sequence,
        turn,
        attackerId,
        targetId,
        attackType,
        0,
        Infinity,
        false,
        undefined,
        buildRestrictionEventReason(restriction),
      ),
    );
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  // Pre-declaration to-hit calc — the resolver re-rolls, but the
  // declared event carries the calculated TN so UI can show the
  // forecast modal before resolution.
  const declaredTN = context.pilotingSkill;

  return appendEvent(
    session,
    createPhysicalAttackDeclaredEvent(
      session.id,
      sequence,
      turn,
      attackerId,
      targetId,
      attackType as 'punch' | 'kick' | 'charge' | 'dfa' | 'push',
      declaredTN,
    ),
  );
}

/**
 * Resolve all PhysicalAttackDeclared events for the current turn.
 * Each declaration runs through `resolvePhysicalAttack` (to-hit, hit
 * location, damage). On hit emits `PhysicalAttackResolved` +
 * `DamageApplied` chain via the same `resolveDamagePipeline` used by
 * weapon attacks; queues `PhysicalAttackTarget` PSR for the target.
 * On miss for kick / charge / DFA queues an attacker PSR
 * (`KickMiss` / `MissedCharge` / `MissedDFA`).
 *
 * `contextByAttacker` carries the per-unit static data (tonnage,
 * piloting skill, etc.) — callers (InteractiveSession, GameEngine)
 * supply it from catalog data.
 */
export function resolveAllPhysicalAttacks(
  session: IGameSession,
  contextByAttacker: Map<string, IPhysicalAttackContext>,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  const { turn } = session.currentState;
  const declarations = session.events.filter(
    (e: IGameEvent) =>
      e.type === GameEventType.PhysicalAttackDeclared && e.turn === turn,
  );

  let currentSession = session;
  for (const declaration of declarations) {
    const payload = declaration.payload as IPhysicalAttackDeclaredPayload;
    const context = contextByAttacker.get(payload.attackerId);
    if (!context) continue;

    const attackerState = currentSession.currentState.units[payload.attackerId];
    const targetState = currentSession.currentState.units[payload.targetId];
    if (!attackerState || !targetState || targetState.destroyed) {
      continue;
    }

    const componentDamage = attackerState.componentDamage ?? {
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

    const input: IPhysicalAttackInput = {
      attackerTonnage: context.attackerTonnage,
      pilotingSkill: context.pilotingSkill,
      componentDamage,
      attackType: payload.attackType,
      arm: context.arm,
      hexesMoved: context.hexesMoved,
      heat: attackerState.heat,
      isUnderwater: false,
      weaponsFiredFromArm: context.weaponsFiredFromArm,
      attackerProne: attackerState.prone,
      targetTonnage: context.targetTonnage,
    };

    // The standalone module uses a d6 roller; wrap our 2d6 roller's
    // first die value to feed it.
    const d6Roller = () => {
      const roll = diceRoller();
      return roll.dice[0];
    };

    const result = resolvePhysicalAttack(input, d6Roller);

    const resolvedSeq = currentSession.events.length;
    currentSession = appendEvent(
      currentSession,
      createPhysicalAttackResolvedEvent(
        currentSession.id,
        resolvedSeq,
        turn,
        payload.attackerId,
        payload.targetId,
        payload.attackType,
        result.roll,
        result.toHitNumber,
        result.hit,
        result.hit ? result.targetDamage : undefined,
        result.hitLocation,
      ),
    );

    if (result.hit && result.targetDamage > 0 && result.hitLocation) {
      const damageState = buildDamageStateFromUnit(targetState);
      const damageResult = resolveDamagePipeline(
        damageState,
        result.hitLocation as CombatLocation,
        result.targetDamage,
      );
      for (const locationDamage of damageResult.result.locationDamages) {
        const damageSeq = currentSession.events.length;
        currentSession = appendEvent(
          currentSession,
          createDamageAppliedEvent(
            currentSession.id,
            damageSeq,
            turn,
            payload.targetId,
            locationDamage.location,
            locationDamage.damage,
            locationDamage.armorRemaining,
            locationDamage.structureRemaining,
            locationDamage.destroyed,
          ),
        );
      }
    }

    // PSR queueing: target gets PhysicalAttackTarget on hit; attacker
    // gets the per-attack-type miss PSR on miss.
    if (result.hit && result.targetPSR) {
      const psrSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          psrSeq,
          turn,
          GamePhase.PhysicalAttack,
          payload.targetId,
          'Hit by physical attack',
          0,
          'physical_attack_target',
        ),
      );
    }
    if (!result.hit && result.attackerPSR) {
      const triggerSource =
        payload.attackType === 'kick'
          ? 'kick_miss'
          : payload.attackType === 'charge'
            ? 'charge_miss'
            : payload.attackType === 'dfa'
              ? 'dfa_miss'
              : 'physical_miss';
      const psrSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          psrSeq,
          turn,
          GamePhase.PhysicalAttack,
          payload.attackerId,
          `Missed ${payload.attackType}`,
          result.attackerPSRModifier,
          triggerSource,
        ),
      );
    }
  }

  return currentSession;
}
