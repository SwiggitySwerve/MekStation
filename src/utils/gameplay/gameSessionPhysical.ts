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
  PSRTrigger,
} from '@/types/gameplay';

import type { IPhysicalAttackContext } from './gameSessionPhysicalHelpers';

import { resolveDamage as resolveDamagePipeline } from './damage';
import { type DiceRoller } from './diceTypes';
import {
  createDamageAppliedEvent,
  createPhysicalAttackDeclaredEvent,
  createPhysicalAttackResolvedEvent,
  createPSRTriggeredEvent,
} from './gameEvents';
import {
  buildDefaultComponentDamageState,
  buildDamageStateFromUnit,
} from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import {
  appendPhysicalAttackRestrictionResolution,
  physicalAttackRestrictionForType,
  physicalTargetRangeRestriction,
} from './gameSessionPhysicalHelpers';
import { roll2d6 as rollDice } from './hitLocation';
import {
  determinePhysicalHitLocation,
  IPhysicalAttackInput,
  isAirborneVTOLOrWiGEForPhysicalAttack,
  isVehicleCrewStunned,
  PhysicalAttackType,
  resolvePhysicalAttack,
  selectPhysicalHitTable,
  splitPhysicalDamageIntoClusters,
} from './physicalAttacks';

/**
 * Per `implement-physical-attack-phase` task 2: declare a physical
 * attack. Validates restrictions; on rejection emits `AttackInvalid`
 * with the restriction reason. On accept emits
 * `PhysicalAttackDeclared`.
 */
export { type IPhysicalAttackContext } from './gameSessionPhysicalHelpers';

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
  const targetState = session.currentState.units[targetId];
  if (!targetState || targetState.destroyed) {
    return session;
  }

  const componentDamage =
    attackerState.componentDamage ?? buildDefaultComponentDamageState();
  const attackerUnit = session.units.find((unit) => unit.id === attackerId);
  const targetUnit = session.units.find((unit) => unit.id === targetId);
  const attackerMovementMode =
    context.attackerMovementMode ?? attackerUnit?.movementMode;

  const targetRangeRestriction = physicalTargetRangeRestriction(
    attackerState,
    targetState,
  );
  if (!targetRangeRestriction.allowed) {
    return appendPhysicalAttackRestrictionResolution(
      session,
      attackerId,
      targetId,
      attackType,
      targetRangeRestriction,
    );
  }

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
    attackerHullDown: attackerState.hullDown,
    targetTonnage: context.targetTonnage,
    targetMovementModifier: context.targetMovementModifier,
    attackerMovementModifier: context.attackerMovementModifier,
    attackerJumpedThisTurn: context.attackerJumpedThisTurn,
    attackerRanThisTurn: context.attackerRanThisTurn,
    attackerUnitType: context.attackerUnitType ?? attackerUnit?.unitType,
    attackerMovementMode,
    attackerConversionMode:
      context.attackerConversionMode ?? attackerState.conversionMode,
    attackerIsAirborneVTOLOrWiGE:
      context.attackerIsAirborneVTOLOrWiGE ??
      isAirborneVTOLOrWiGEForPhysicalAttack(
        attackerState,
        attackerMovementMode,
      ),
    attackerVehicleCrewStunned: isVehicleCrewStunned(attackerState),
    optionalRules: context.optionalRules ?? session.config.optionalRules,
    attackerDestroyedLocations: attackerState.destroyedLocations,
    targetUnitType: context.targetUnitType ?? targetUnit?.unitType,
    attackerPosition: attackerState.position,
    targetPosition: targetState.position,
    attackerFacing: attackerState.facing,
    targetProne: context.targetProne ?? targetState.prone,
    targetIsAirborne:
      context.targetIsAirborne ??
      ((targetState.combatState?.kind === 'aero' ||
        targetState.combatState?.kind === 'proto') &&
        (targetState.combatState.state.altitude ?? 0) > 0),
    limbsUsedThisTurn: context.limbsUsedThisTurn,
    limb: context.limb,
    lowerArmActuatorPresent: context.lowerArmActuatorPresent,
    handActuatorPresent: context.handActuatorPresent,
    upperLegActuatorPresent: context.upperLegActuatorPresent,
    footActuatorPresent: context.footActuatorPresent,
    elevationContext: context.elevationContext,
    terrainContext: context.terrainContext,
  };

  const restriction = physicalAttackRestrictionForType(attackType, input);

  if (!restriction.allowed) {
    // Per spec task 3.8: rejections surface as a
    // `PhysicalAttackResolved { hit:false, roll:0, toHitNumber:Infinity }`
    // event whose `location` field carries the reason code so replay +
    // UI can distinguish rejections from rolled misses. A future change
    // can promote this to a dedicated `PhysicalAttackInvalid` event.
    return appendPhysicalAttackRestrictionResolution(
      session,
      attackerId,
      targetId,
      attackType,
      restriction,
    );
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  // Pre-declaration to-hit calc — the resolver re-rolls, but the
  // declared event carries the calculated TN so UI can show the
  // forecast modal before resolution.
  const declaredTN = context.pilotingSkill;
  const hitTable = selectPhysicalHitTable(input);

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
      context.limb,
      hitTable,
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

    const componentDamage =
      attackerState.componentDamage ?? buildDefaultComponentDamageState();
    const attackerUnit = currentSession.units.find(
      (unit) => unit.id === payload.attackerId,
    );
    const targetUnit = currentSession.units.find(
      (unit) => unit.id === payload.targetId,
    );
    const attackerMovementMode =
      context.attackerMovementMode ?? attackerUnit?.movementMode;

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
      attackerHullDown: attackerState.hullDown,
      targetTonnage: context.targetTonnage,
      attackerJumpedThisTurn: context.attackerJumpedThisTurn,
      attackerRanThisTurn: context.attackerRanThisTurn,
      attackerUnitType: context.attackerUnitType,
      attackerMovementMode,
      attackerConversionMode:
        context.attackerConversionMode ?? attackerState.conversionMode,
      attackerIsAirborneVTOLOrWiGE:
        context.attackerIsAirborneVTOLOrWiGE ??
        isAirborneVTOLOrWiGEForPhysicalAttack(
          attackerState,
          attackerMovementMode,
        ),
      attackerVehicleCrewStunned: isVehicleCrewStunned(attackerState),
      optionalRules: context.optionalRules ?? session.config.optionalRules,
      targetUnitType: context.targetUnitType ?? targetUnit?.unitType,
      limb: payload.limb ?? context.limb,
      elevationContext: context.elevationContext,
      terrainContext: context.terrainContext,
      hitTableOverride: payload.hitTable,
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
      // Per `implement-physical-attack-phase` tasks 6.4 / 7.4: charge +
      // DFA damage SHALL split into 5-point clusters with a hit-location
      // roll per cluster. Punch / kick / push / club apply as a single
      // chunk via the existing damage pipeline (their damage is rarely
      // > 5 and tabletop applies them as one cluster).
      const usesClusters =
        payload.attackType === 'charge' || payload.attackType === 'dfa';
      const clusters: readonly number[] = usesClusters
        ? splitPhysicalDamageIntoClusters(result.targetDamage)
        : [result.targetDamage];

      for (const clusterDamage of clusters) {
        // Per task 6.5 / 7.4-7.5: each cluster rolls its own hit-location
        // (using the same hit-table the resolver already chose). The first
        // cluster reuses the hit-location the resolver computed; later
        // clusters re-roll.
        const clusterIndex = clusters.indexOf(clusterDamage);
        const clusterHitLocation =
          clusterIndex === 0
            ? result.hitLocation
            : determinePhysicalHitLocation(
                result.hitTable ??
                  (payload.attackType === 'kick' ? 'kick' : 'punch'),
                d6Roller,
              );

        const damageState = buildDamageStateFromUnit(targetState);
        const damageResult = resolveDamagePipeline(
          damageState,
          clusterHitLocation as CombatLocation,
          clusterDamage,
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
    }

    // Per task 7.4 / 7.5: DFA also damages the attacker's legs. Split
    // attacker leg damage into 5-point clusters; alternate legs.
    if (
      result.hit &&
      payload.attackType === 'dfa' &&
      result.attackerLegDamagePerLeg > 0
    ) {
      const legClusters = splitPhysicalDamageIntoClusters(
        result.attackerLegDamagePerLeg * 2,
      );
      let legIndex = 0;
      for (const clusterDamage of legClusters) {
        const leg = legIndex % 2 === 0 ? 'left_leg' : 'right_leg';
        legIndex += 1;
        const damageState = buildDamageStateFromUnit(attackerState);
        const damageResult = resolveDamagePipeline(
          damageState,
          leg as CombatLocation,
          clusterDamage,
        );
        for (const locationDamage of damageResult.result.locationDamages) {
          const damageSeq = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createDamageAppliedEvent(
              currentSession.id,
              damageSeq,
              turn,
              payload.attackerId,
              locationDamage.location,
              locationDamage.damage,
              locationDamage.armorRemaining,
              locationDamage.structureRemaining,
              locationDamage.destroyed,
            ),
          );
        }
      }
    }

    // Per task 6.3: charge also damages the attacker. Apply as clusters.
    if (
      result.hit &&
      payload.attackType === 'charge' &&
      result.attackerDamage > 0
    ) {
      const attackerClusters = splitPhysicalDamageIntoClusters(
        result.attackerDamage,
      );
      for (const clusterDamage of attackerClusters) {
        const hitLocation = determinePhysicalHitLocation('punch', d6Roller);
        const damageState = buildDamageStateFromUnit(attackerState);
        const damageResult = resolveDamagePipeline(
          damageState,
          hitLocation as CombatLocation,
          clusterDamage,
        );
        for (const locationDamage of damageResult.result.locationDamages) {
          const damageSeq = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createDamageAppliedEvent(
              currentSession.id,
              damageSeq,
              turn,
              payload.attackerId,
              locationDamage.location,
              locationDamage.damage,
              locationDamage.armorRemaining,
              locationDamage.structureRemaining,
              locationDamage.destroyed,
            ),
          );
        }
      }
    }

    // PSR queueing: target gets PhysicalAttackTarget on hit; attacker
    // gets the per-attack-type miss PSR on miss. Per task 6.6 / 7.5,
    // charge + DFA hits queue PSRs for BOTH attacker and target.
    //
    // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
    // (piloting-skill-rolls delta — PSRTriggered Carries Base Skill):
    // pass the unit's base piloting skill (looked up from `IGameUnit`).
    // For the attacker the runner already has `context.pilotingSkill`;
    // for the target we look it up from `currentSession.units`.
    if (result.hit && result.targetPSR) {
      // Per `structure-psr-reason-as-discriminated-code` (PR E): map the
      // generic `physical_attack_target` trigger source to the canonical
      // `PSRTrigger` matching the originating attack type so consumers
      // can filter target PSRs by attack family.
      const targetReasonCode =
        payload.attackType === 'kick'
          ? PSRTrigger.Kicked
          : payload.attackType === 'charge'
            ? PSRTrigger.Charged
            : payload.attackType === 'dfa'
              ? PSRTrigger.DFATarget
              : payload.attackType === 'push'
                ? PSRTrigger.Pushed
                : undefined;
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
          targetUnit?.piloting,
          targetReasonCode,
        ),
      );
    }
    if (result.hit && result.attackerPSR) {
      // Per task 6.6 / 7.5: on charge / DFA hit the attacker also rolls a
      // PSR. Use a typed trigger source so the PSR resolver can apply the
      // attack-specific modifier table.
      const attackerHitTrigger =
        payload.attackType === 'charge'
          ? 'charge_attacker_hit'
          : payload.attackType === 'dfa'
            ? 'dfa_attacker_hit'
            : 'physical_attacker_hit';
      // Attacker-on-hit PSRs share the canonical movement codes for the
      // attack family — Charged / DFATarget mirror the target codes per
      // the PSR Trigger Catalog. Kept undefined when no canonical code
      // applies (e.g. generic `physical_attacker_hit`).
      const attackerHitReasonCode =
        payload.attackType === 'charge'
          ? PSRTrigger.Charged
          : payload.attackType === 'dfa'
            ? PSRTrigger.DFATarget
            : undefined;
      const psrSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          psrSeq,
          turn,
          GamePhase.PhysicalAttack,
          payload.attackerId,
          `Hit ${payload.attackType}`,
          result.attackerPSRModifier,
          attackerHitTrigger,
          context.pilotingSkill,
          attackerHitReasonCode,
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
      const missReasonCode =
        payload.attackType === 'kick'
          ? PSRTrigger.KickMiss
          : payload.attackType === 'charge'
            ? PSRTrigger.ChargeMiss
            : payload.attackType === 'dfa'
              ? PSRTrigger.DFAMiss
              : undefined;
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
          context.pilotingSkill,
          missReasonCode,
        ),
      );
    }
  }

  return currentSession;
}
