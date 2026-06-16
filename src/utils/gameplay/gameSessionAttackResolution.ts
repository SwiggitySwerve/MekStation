import type { IUnitDestroyedPayload } from '@/types/gameplay/GameSessionInterfaces';

import {
  CombatLocation,
  GameEventType,
  GamePhase,
  IAttackDeclaredPayload,
  IGameEvent,
  IGameSession,
  ISelectedAMSWeaponMountData,
  PSRTrigger,
} from '@/types/gameplay';
import { logger } from '@/utils/logger';

import {
  consumeAmmo,
  findAvailableAmmoBin,
  isEnergyWeapon,
} from './ammoTracking';
import { isStreakWeapon, lookupClusterHits } from './clusterWeapons';
import {
  checkTACTrigger,
  processTAC,
  resolveCriticalHits,
  buildDefaultCriticalSlotManifest,
} from './criticalHitResolution';
import { resolveDamage as resolveDamagePipeline } from './damage';
import { type D6Roller, type DiceRoller } from './diceTypes';
import { calculateFiringArc } from './firingArc';
import {
  createAmmoConsumedEvent,
  createAttackInvalidEvent,
  createAttackResolvedEvent,
  createAMSInterceptionEvent,
  createDamageAppliedEvent,
  createIndirectFireSpotterLostEvent,
  createLocationDestroyedEvent,
  createPilotHitEvent,
  createPSRTriggeredEvent,
  createTransferDamageEvent,
  createUnitDestroyedEvent,
} from './gameEvents';
import {
  buildDefaultComponentDamageState,
  buildDamageStateFromUnit,
  buildWeaponAttackDataMap,
  emitCriticalEvents,
  firingArcToString,
} from './gameSessionAttackResolutionHelpers';
import { invalidateSameHexAttack } from './gameSessionAttackResolutionValidation';
import { appendEvent } from './gameSessionCore';
import { tryResolveVehicleAttackHit } from './gameSessionVehicleAttackResolution';
import {
  determineHitLocationFromRoll,
  isHeadHit,
  roll2d6 as rollDice,
} from './hitLocation';
import { isLegLocation } from './pilotingSkillRolls';
import {
  applyLowProfileGlancingDamage,
  getLowProfileGlancingCriticalHitModifier,
  isLowProfileGlancingBlow,
} from './quirkModifiers';
import { isMissileWeapon } from './specialWeaponMechanics';
import { weaponMountCoversTargetArc } from './weaponMountArcs';

type WeaponAttackDataWithToHit = {
  readonly toHitNumber?: number;
};

const PLAYTEST_3_AMS_OPTIONAL_RULES = new Set([
  'playtest_3',
  'playtest-3',
  'playtest3',
  'tacops_playtest_3',
]);

function hasPlaytest3AMSRule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (
    optionalRules?.some((rule) =>
      PLAYTEST_3_AMS_OPTIONAL_RULES.has(rule.toLowerCase()),
    ) ?? false
  );
}

function canSelectedAMSReuseWithinWeaponPhase(
  mount: ISelectedAMSWeaponMountData,
  optionalRules: readonly string[] | undefined,
): boolean {
  return mount.amsMultiUse === true || hasPlaytest3AMSRule(optionalRules);
}

function mountBaseId(weaponId: string): string {
  const match = weaponId.match(/^(.+)-(\d+)$/);
  return match ? match[1] : weaponId;
}

function missileRackSize(weaponId: string, weaponName: string): number | null {
  const candidates = [mountBaseId(weaponId), weaponId, weaponName];
  for (const candidate of candidates) {
    const match = candidate.match(/(?:lrm|srm|mrm|atm|mml)[\s-]?(\d+)/i);
    if (!match) continue;
    const rackSize = Number.parseInt(match[1], 10);
    if (Number.isFinite(rackSize) && rackSize > 0) return rackSize;
  }
  return null;
}

function isMissileClusterAttack(weaponId: string, weaponName: string): boolean {
  return (
    isMissileWeapon(mountBaseId(weaponId)) ||
    isMissileWeapon(weaponName) ||
    /\bmml[\s-]?\d+/i.test(`${weaponId} ${weaponName}`)
  );
}

function canSelectedAMSIntercept(input: {
  readonly mount: ISelectedAMSWeaponMountData;
  readonly targetState: IGameSession['currentState']['units'][string];
  readonly incomingArc: ReturnType<typeof calculateFiringArc>;
  readonly optionalRules: readonly string[] | undefined;
}): boolean {
  const { incomingArc, mount, optionalRules, targetState } = input;
  const alreadyFired =
    targetState.weaponsFiredThisTurn?.includes(mount.weaponId) ?? false;
  if (
    alreadyFired &&
    !canSelectedAMSReuseWithinWeaponPhase(mount, optionalRules)
  ) {
    return false;
  }

  if (!weaponMountCoversTargetArc(mount, incomingArc)) {
    return false;
  }

  if (isEnergyWeapon(mount.weaponName)) {
    return true;
  }

  const ammoWeaponType = mount.ammoWeaponType ?? mountBaseId(mount.weaponId);
  return (
    targetState.ammoState !== undefined &&
    findAvailableAmmoBin(targetState.ammoState, ammoWeaponType) !== null
  );
}

function resolveSelectedAMSCluster(input: {
  readonly session: IGameSession;
  readonly payload: IAttackDeclaredPayload;
  readonly weaponId: string;
  readonly weaponName: string;
  readonly damage: number;
  readonly attackerId: string;
  readonly targetId: string;
  readonly incomingArc: ReturnType<typeof calculateFiringArc>;
  readonly diceRoller: DiceRoller;
}): { readonly session: IGameSession; readonly damage: number } | undefined {
  const selectedAMSWeaponId =
    input.payload.selectedAMSWeaponIds?.[input.weaponId];
  const selectedMount = input.payload.selectedAMSWeaponMounts?.[input.weaponId];
  if (
    selectedAMSWeaponId === undefined ||
    selectedMount === undefined ||
    selectedMount.weaponId !== selectedAMSWeaponId
  ) {
    return undefined;
  }

  const targetState = input.session.currentState.units[input.targetId];
  if (
    !targetState ||
    !isMissileClusterAttack(input.weaponId, input.weaponName) ||
    !canSelectedAMSIntercept({
      mount: selectedMount,
      targetState,
      incomingArc: input.incomingArc,
      optionalRules: input.session.config.optionalRules,
    })
  ) {
    return undefined;
  }

  const rackSize = missileRackSize(input.weaponId, input.weaponName);
  if (rackSize === null) return undefined;

  const streakClusterRoll =
    isStreakWeapon(mountBaseId(input.weaponId)) ||
    /streak/i.test(input.weaponName);
  const clusterDice = streakClusterRoll
    ? ([11] as const)
    : diceRollToArray(input.diceRoller());
  const clusterRoll = clusterDice.reduce((sum, die) => sum + die, 0);
  const incomingProjectiles = streakClusterRoll
    ? rackSize
    : lookupClusterHits(clusterRoll, rackSize);
  const clusterModifier = -4;
  const modifiedClusterRoll = Math.max(2, clusterRoll + clusterModifier);
  const projectilesRemaining = lookupClusterHits(modifiedClusterRoll, rackSize);
  const ammoConsumed = isEnergyWeapon(selectedMount.weaponName) ? 0 : 1;
  let currentSession = input.session;
  let ammoBinId: string | undefined;
  let ammoRemaining: number | undefined;
  const ammoWeaponType =
    selectedMount.ammoWeaponType ?? mountBaseId(selectedMount.weaponId);

  if (ammoConsumed > 0) {
    const ammoResult = targetState.ammoState
      ? consumeAmmo(targetState.ammoState, input.targetId, ammoWeaponType)
      : null;
    if (!ammoResult) return undefined;

    ammoBinId = ammoResult.event.binId;
    ammoRemaining = ammoResult.event.roundsRemaining;
    currentSession = appendEvent(
      currentSession,
      createAmmoConsumedEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        input.targetId,
        ammoResult.event.binId,
        ammoResult.event.weaponType,
        ammoResult.event.roundsConsumed,
        ammoResult.event.roundsRemaining,
      ),
    );
  }

  currentSession = appendEvent(
    currentSession,
    createAMSInterceptionEvent(
      currentSession.id,
      currentSession.events.length,
      currentSession.currentState.turn,
      {
        defenderId: input.targetId,
        targetId: input.targetId,
        attackerId: input.attackerId,
        incomingWeaponId: input.weaponId,
        amsWeaponId: selectedMount.weaponId,
        resolution: 'cluster-table',
        incomingProjectiles,
        projectilesIntercepted: Math.max(
          0,
          incomingProjectiles - projectilesRemaining,
        ),
        projectilesRemaining,
        ammoConsumed,
        roll: clusterDice,
        clusterRoll,
        clusterModifier,
        modifiedClusterRoll,
        ...(ammoBinId !== undefined ? { ammoBinId } : {}),
        ...(ammoRemaining !== undefined ? { ammoRemaining } : {}),
      },
    ),
  );

  return {
    session: currentSession,
    damage: (input.damage / rackSize) * projectilesRemaining,
  };
}

function diceRollToArray(roll: ReturnType<DiceRoller>): readonly number[] {
  return [...roll.dice];
}

export function resolveAttack(
  session: IGameSession,
  attackEvent: IGameEvent,
  diceRoller: DiceRoller = rollDice,
  criticalD6Roller?: D6Roller,
): IGameSession {
  const payload = attackEvent.payload as IAttackDeclaredPayload;
  const { attackerId, targetId, weapons, weaponAttacks, toHitNumber } = payload;

  const weaponDataMap = buildWeaponAttackDataMap(weaponAttacks);

  let currentSession = session;

  const invalidSameHexSession = invalidateSameHexAttack(
    currentSession,
    attackerId,
    targetId,
  );
  if (invalidSameHexSession) {
    return invalidSameHexSession;
  }

  for (const weaponId of weapons) {
    const weaponData = weaponDataMap.get(weaponId);
    if (!weaponData) {
      logger.warn(
        `[resolveAttack] weaponAttacks payload missing entry for weapon "${weaponId}" on attacker "${attackerId}" — skipping. This indicates a malformed AttackDeclared event.`,
      );
      continue;
    }
    const weaponName = weaponData.weaponName;

    let ammoBinIdForResolved: string | null = null;
    const attackerStateForAmmo = currentSession.currentState.units[attackerId];
    const ammoState = attackerStateForAmmo?.ammoState ?? {};
    if (!isEnergyWeapon(weaponName)) {
      const ammoResult = consumeAmmo(ammoState, attackerId, weaponName);
      if (!ammoResult) {
        const invalidSequence = currentSession.events.length;
        const { turn: invalidTurn } = currentSession.currentState;
        currentSession = appendEvent(
          currentSession,
          createAttackInvalidEvent(
            currentSession.id,
            invalidSequence,
            invalidTurn,
            attackerId,
            targetId,
            'OutOfAmmo',
            weaponId,
            `No matching non-empty ammo bin for "${weaponName}"`,
          ),
        );
        continue;
      }
      const ammoSequence = currentSession.events.length;
      const ammoTurn = currentSession.currentState.turn;
      currentSession = appendEvent(
        currentSession,
        createAmmoConsumedEvent(
          currentSession.id,
          ammoSequence,
          ammoTurn,
          GamePhase.WeaponAttack,
          attackerId,
          ammoResult.event.binId,
          ammoResult.event.weaponType,
          ammoResult.event.roundsConsumed,
          ammoResult.event.roundsRemaining,
        ),
      );
      ammoBinIdForResolved = ammoResult.event.binId;
    }

    const weaponToHitNumber =
      (weaponData as WeaponAttackDataWithToHit).toHitNumber ?? toHitNumber;
    const attackRoll = diceRoller();
    let hit = attackRoll.total >= weaponToHitNumber;

    // Wave 8 PR-K6: spotter-liveness mid-resolution re-check.
    // Walk session.events backward to find the IndirectFireSpotterSelected
    // event matching this attacker + weapon (most-recent first). If the
    // elected spotter has been destroyed between attack declaration and
    // resolution, force the attack to auto-miss + emit IndirectFireSpotterLost.
    // Ammo is already consumed above (lines 80-119); heat carries on
    // AttackResolved.heat regardless of hit — both preserved.
    for (let i = currentSession.events.length - 1; i >= 0; i--) {
      const evt = currentSession.events[i];
      if (evt.type !== GameEventType.IndirectFireSpotterSelected) continue;
      const ifPayload = evt.payload as {
        attackerId: string;
        weaponId: string;
        spotterId: string;
        targetHex: { q: number; r: number };
        basis: 'los' | 'narc' | 'inarc' | 'semi-guided-tag';
      };
      if (
        ifPayload.attackerId !== attackerId ||
        ifPayload.weaponId !== weaponId
      ) {
        continue;
      }
      const spotterUnit =
        currentSession.currentState.units[ifPayload.spotterId];
      if (spotterUnit?.destroyed) {
        const lostSequence = currentSession.events.length;
        const lostTurn = currentSession.currentState.turn;
        currentSession = appendEvent(
          currentSession,
          createIndirectFireSpotterLostEvent(
            currentSession.id,
            lostSequence,
            lostTurn,
            attackerId,
            ifPayload.spotterId,
            weaponId,
            ifPayload.targetHex,
            ifPayload.basis,
            'Spotter destroyed before resolution',
            ammoBinIdForResolved ?? undefined,
          ),
        );
        hit = false;
      }
      break; // most-recent spotter selection found — stop walking
    }

    const { turn } = currentSession.currentState;

    const attackerState = currentSession.currentState.units[attackerId];
    const targetState = currentSession.currentState.units[targetId];
    const firingArc = calculateFiringArc(
      attackerState.position,
      targetState.position,
      targetState.facing,
    );
    const arcString = firingArcToString(firingArc);

    if (hit) {
      let resolvedWeaponData = weaponData;
      const selectedAMSResult = resolveSelectedAMSCluster({
        session: currentSession,
        payload,
        weaponId,
        weaponName,
        damage: weaponData.damage,
        attackerId,
        targetId,
        incomingArc: firingArc,
        diceRoller,
      });
      if (selectedAMSResult) {
        currentSession = selectedAMSResult.session;
        resolvedWeaponData = {
          ...weaponData,
          damage: selectedAMSResult.damage,
        };
      }

      const vehicleResolved = tryResolveVehicleAttackHit({
        session: currentSession,
        attackerId,
        targetId,
        weaponId,
        weaponData: resolvedWeaponData,
        attackRollTotal: attackRoll.total,
        toHitNumber: weaponToHitNumber,
        attackDirection: arcString,
        ammoBinId: ammoBinIdForResolved,
        targetState,
        diceRoller,
        d6Roller:
          criticalD6Roller ??
          (() => {
            const roll = diceRoller();
            return roll.dice[0] ?? 1;
          }),
      });
      if (vehicleResolved) {
        currentSession = vehicleResolved;
        continue;
      }

      const locationRoll = diceRoller();
      const hitLocationResult = determineHitLocationFromRoll(
        firingArc,
        locationRoll,
        {
          edge: {
            edgePointsRemaining: targetState.edgePointsRemaining,
            pilotAbilities: targetState.abilities ?? [],
            turn,
            unitId: targetId,
            reroll: diceRoller,
          },
        },
      );
      const location = hitLocationResult.location;
      let damage = resolvedWeaponData.damage;

      if (isHeadHit(location) && damage > 3) {
        damage = 3;
      }

      const lowProfileGlancingBlow = isLowProfileGlancingBlow(
        targetState.unitQuirks,
        attackRoll.total,
        weaponToHitNumber,
      );
      if (lowProfileGlancingBlow) {
        damage = applyLowProfileGlancingDamage(damage);
      }
      const lowProfileCriticalHitModifier =
        getLowProfileGlancingCriticalHitModifier(
          targetState.unitQuirks,
          attackRoll.total,
          weaponToHitNumber,
        );

      const resolvedEvent = createAttackResolvedEvent(
        currentSession.id,
        currentSession.events.length,
        turn,
        attackerId,
        targetId,
        weaponId,
        attackRoll.total,
        weaponToHitNumber,
        true,
        location,
        damage,
        weaponData.heat,
        arcString,
        ammoBinIdForResolved,
        {
          edgeReroll: hitLocationResult.edgeReroll,
          edgeSuperseded: hitLocationResult.edgeSuperseded,
          edgeTrigger: hitLocationResult.edgeTrigger,
          edgePointsRemaining: hitLocationResult.edgePointsRemaining,
          edgeSupersededLocation: hitLocationResult.supersededLocation,
          edgeSupersededRoll: hitLocationResult.supersededRoll?.total,
        },
      );
      currentSession = appendEvent(currentSession, resolvedEvent);

      // Per `integrate-damage-pipeline` task 7: capture the target's
      // pre-attack `damageThisPhase` so we can detect the 20+ crossing
      // and queue a PSR once per crossing (not per-damage-event).
      const preAttackDamageThisPhase =
        currentSession.currentState.units[targetId]?.damageThisPhase ?? 0;

      const targetStateForDamage =
        currentSession.currentState.units[targetId] ?? targetState;
      const buildTargetCriticalEdgeOptions = () => {
        const targetForCritical =
          currentSession.currentState.units[targetId] ?? targetStateForDamage;
        return {
          pilotAbilities: targetForCritical.abilities ?? [],
          edgePointsRemaining: targetForCritical.edgePointsRemaining,
          turn,
          unitId: targetId,
          criticalHitModifier: lowProfileCriticalHitModifier,
          optionalRules: currentSession.config.optionalRules,
        };
      };
      const damageState = {
        ...buildDamageStateFromUnit(targetStateForDamage),
        turn,
      };
      const d6Roller = () => {
        const roll = diceRoller();
        return roll.dice[0];
      };
      const damageResult = resolveDamagePipeline(
        damageState,
        location as CombatLocation,
        damage,
        d6Roller,
        { rollCriticalHits: false },
      );

      // Per `integrate-damage-pipeline` tasks 3-5: emit the ordered event
      // chain `DamageApplied` → (`LocationDestroyed` on structure == 0)
      // → (`TransferDamage` when damage spills to the transfer target).
      // `damageResult.result.locationDamages` is already ordered along
      // the canonical transfer path (original → adjacent → center torso),
      // so walking it in order preserves the replay-visible sequence.
      //
      // Side-torso → arm cascade: `applyDamageToLocation` also zeroes
      // the corresponding arm's armor/structure and pushes it onto
      // `destroyedLocations`. We detect that cascade by diffing the
      // pre- and post-state `destroyedLocations` arrays so the
      // `LocationDestroyed` event carries the `cascadedTo` arm id.
      const preDestroyedSet = new Set<CombatLocation>(
        damageState.destroyedLocations,
      );
      const newlyDestroyed: CombatLocation[] = [];
      for (const loc of damageResult.state.destroyedLocations) {
        if (!preDestroyedSet.has(loc)) {
          newlyDestroyed.push(loc);
        }
      }

      for (const locationDamage of damageResult.result.locationDamages) {
        const damageSequence = currentSession.events.length;
        const damageEvent = createDamageAppliedEvent(
          currentSession.id,
          damageSequence,
          turn,
          targetId,
          locationDamage.location,
          locationDamage.damage,
          locationDamage.armorRemaining,
          locationDamage.structureRemaining,
          locationDamage.destroyed,
        );
        currentSession = appendEvent(currentSession, damageEvent);

        if (locationDamage.destroyed) {
          // The arm cascade (LT → LA, RT → RA) is set by
          // `applyDamageToLocation` but not surfaced on the
          // `ILocationDamage.transferredDamage` field (it's a marker,
          // not a real damage transfer). Detect it via the set diff
          // and attach as `cascadedTo`.
          let cascadedArm: string | undefined;
          if (
            locationDamage.location === 'left_torso' &&
            newlyDestroyed.includes('left_arm' as CombatLocation)
          ) {
            cascadedArm = 'left_arm';
          } else if (
            locationDamage.location === 'right_torso' &&
            newlyDestroyed.includes('right_arm' as CombatLocation)
          ) {
            cascadedArm = 'right_arm';
          }
          const destroyedSequence = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createLocationDestroyedEvent(
              currentSession.id,
              destroyedSequence,
              turn,
              targetId,
              locationDamage.location,
              cascadedArm,
            ),
          );

          // If the arm cascaded, emit a second `LocationDestroyed`
          // event for the arm itself so downstream consumers (UI,
          // replay) don't have to dedupe off the parent event.
          if (cascadedArm) {
            const cascadeSequence = currentSession.events.length;
            currentSession = appendEvent(
              currentSession,
              createLocationDestroyedEvent(
                currentSession.id,
                cascadeSequence,
                turn,
                targetId,
                cascadedArm,
              ),
            );
          }
        }

        if (
          locationDamage.transferredDamage > 0 &&
          locationDamage.transferLocation
        ) {
          const transferSequence = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createTransferDamageEvent(
              currentSession.id,
              transferSequence,
              turn,
              targetId,
              locationDamage.location,
              locationDamage.transferLocation,
              locationDamage.transferredDamage,
            ),
          );
        }
      }

      const manifest = buildDefaultCriticalSlotManifest();
      const targetComponentDamage =
        targetStateForDamage.componentDamage ??
        buildDefaultComponentDamageState();

      for (const locationDamage of damageResult.result.locationDamages) {
        if (locationDamage.structureDamage > 0 && !locationDamage.destroyed) {
          const criticalResult = resolveCriticalHits(
            targetId,
            locationDamage.location as CombatLocation,
            manifest,
            targetComponentDamage,
            d6Roller,
            undefined,
            undefined,
            buildTargetCriticalEdgeOptions(),
          );
          currentSession = emitCriticalEvents(
            currentSession,
            criticalResult.events,
            turn,
            targetId,
          );
        }
      }

      if (hitLocationResult.roll.total === 2) {
        const tacLocation = checkTACTrigger(2, arcString);
        if (tacLocation) {
          const tacResult = processTAC(
            targetId,
            tacLocation,
            manifest,
            targetComponentDamage,
            d6Roller,
            undefined,
            buildTargetCriticalEdgeOptions(),
          );
          currentSession = emitCriticalEvents(
            currentSession,
            tacResult.events,
            turn,
            targetId,
          );
        }
      }

      // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
      // (piloting-skill-rolls delta — PSRTriggered Carries Base Skill):
      // look up the target's base piloting skill once for both the
      // leg-damage and 20+damage PSR triggers below.
      const targetUnit = currentSession.units.find((u) => u.id === targetId);

      for (const locationDamage of damageResult.result.locationDamages) {
        if (
          isLegLocation(locationDamage.location) &&
          locationDamage.structureDamage > 0
        ) {
          const legPSRSequence = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createPSRTriggeredEvent(
              currentSession.id,
              legPSRSequence,
              turn,
              GamePhase.WeaponAttack,
              targetId,
              'Leg damage (internal structure exposed)',
              0,
              'leg_damage',
              targetUnit?.piloting,
              PSRTrigger.LegDamage,
            ),
          );
          break;
        }
      }

      // Per `integrate-damage-pipeline` task 7: queue a PSR when
      // `damageThisPhase` crosses 20 as a result of this weapon hit.
      // The reducer (`applyDamageApplied`) has already accumulated the
      // `DamageApplied.damage` values into `damageThisPhase`, so we
      // read post-attack state and emit exactly once per crossing
      // (pre < 20 && post >= 20). `wire-piloting-skill-rolls` resolves
      // the queued PSR; this task only queues.
      const postAttackDamageThisPhase =
        currentSession.currentState.units[targetId]?.damageThisPhase ?? 0;
      if (preAttackDamageThisPhase < 20 && postAttackDamageThisPhase >= 20) {
        const phaseDamagePSRSequence = currentSession.events.length;
        currentSession = appendEvent(
          currentSession,
          createPSRTriggeredEvent(
            currentSession.id,
            phaseDamagePSRSequence,
            turn,
            GamePhase.WeaponAttack,
            targetId,
            '20+ damage this phase',
            0,
            'phase_damage_20_plus',
            targetUnit?.piloting,
            PSRTrigger.PhaseDamage20Plus,
          ),
        );
      }

      if (damageResult.result.pilotDamage) {
        const pilotDamage = damageResult.result.pilotDamage;
        const pilotSequence = currentSession.events.length;
        const pilotEvent = createPilotHitEvent(
          currentSession.id,
          pilotSequence,
          turn,
          GamePhase.WeaponAttack,
          targetId,
          pilotDamage.woundsInflicted,
          pilotDamage.totalWounds,
          pilotDamage.source as
            | 'head_hit'
            | 'ammo_explosion'
            | 'mech_destruction',
          pilotDamage.consciousnessCheckRequired,
          pilotDamage.conscious,
          {
            edgeReroll: pilotDamage.edgeReroll,
            edgeSuperseded: pilotDamage.edgeSuperseded,
            edgeTrigger: pilotDamage.edgeTrigger,
            edgePointsRemaining: pilotDamage.edgePointsRemaining,
          },
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
          (damageResult.result
            .destructionCause as IUnitDestroyedPayload['cause']) ?? 'damage',
        );
        currentSession = appendEvent(currentSession, destroyEvent);
      }
    } else {
      // Miss — attacker still generates firing heat per canonical rules
      // (TechManual p.68: heat is charged at weapon-firing time, not on
      // hit). Pass weaponData.heat so the heat phase accumulates correctly,
      // arcString so UI consumers see where the attack was fired from, and
      // ammoBinIdForResolved so replay / UI can still trace which bin the
      // shot drew from even on a miss.
      const resolvedEvent = createAttackResolvedEvent(
        currentSession.id,
        currentSession.events.length,
        turn,
        attackerId,
        targetId,
        weaponId,
        attackRoll.total,
        weaponToHitNumber,
        false,
        undefined,
        undefined,
        weaponData.heat,
        arcString,
        ammoBinIdForResolved,
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
  let currentSession = session;
  for (const event of session.events) {
    if (event.type !== GameEventType.AttackDeclared) continue;
    if (event.turn !== session.currentState.turn) continue;
    currentSession = resolveAttack(currentSession, event, diceRoller);
  }
  return currentSession;
}
