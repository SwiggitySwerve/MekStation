import type { IComponentDamageState } from '@/types/gameplay/GameSessionInterfaces';

import {
  CombatLocation,
  CriticalSeverity,
  ICriticalHitResult,
  IPilotDamageResult,
} from '@/types/gameplay';

import type {
  CriticalHitEvent,
  CriticalSlotManifest,
} from '../criticalHitResolution/types';
import type { D6Roller } from '../diceTypes';

import { resolveCriticalHits } from '../criticalHitResolution';
import { isHeadHit, roll2d6 } from '../hitLocation';
import { checkCriticalHitTrigger, getCriticalHitCount } from './critical';
import { checkUnitDestruction } from './destruction';
import {
  applyDamageWithTransfer,
  applyInternalDamageWithTransfer,
} from './location';
import { applyPilotDamage } from './pilot';
import {
  IPilotDamageResultWithState,
  IResolveDamageResult,
  IUnitDamageState,
} from './types';

/**
 * Per Total Warfare p. 41 ("Head Damage"): any single hit that lands on
 * the head is capped at 3 points applied; overflow is discarded, NOT
 * transferred. Because cluster weapons (LRM, SRM, AC/LB-X, etc.) invoke
 * `resolveDamage` once per cluster group, applying the cap here also
 * satisfies the per-cluster-group independent cap.
 */
export const HEAD_DAMAGE_CAP_PER_HIT = 3;
const DERMAL_ARMOR_PILOT_ABILITY_ID = 'dermal_armor';
const VDNI_PILOT_ABILITY_ID = 'vdni';
const BUFFERED_VDNI_PILOT_ABILITY_ID = 'bvdni';
const ARTIFICIAL_PAIN_SHUNT_PILOT_ABILITY_ID = 'artificial_pain_shunt';
const NEURAL_FEEDBACK_TARGET_NUMBER = 8;

function hasDermalArmorHeadHitProtection(state: IUnitDamageState): boolean {
  return state.pilotAbilities?.includes(DERMAL_ARMOR_PILOT_ABILITY_ID) ?? false;
}

function hasPilotAbility(state: IUnitDamageState, abilityId: string): boolean {
  return state.pilotAbilities?.includes(abilityId) ?? false;
}

function tookInternalStructureDamage(
  locationDamages: IResolveDamageResult['result']['locationDamages'],
): boolean {
  return locationDamages.some((locDamage) => locDamage.structureDamage > 0);
}

function resolvedCriticalSlotHit(
  criticalEvents: readonly CriticalHitEvent[],
): boolean {
  return criticalEvents.some((event) => event.type === 'critical_hit_resolved');
}

function resolveNeuralFeedbackPilotDamage(options: {
  readonly state: IUnitDamageState;
  readonly locationDamages: IResolveDamageResult['result']['locationDamages'];
  readonly criticalEvents: readonly CriticalHitEvent[];
  readonly roller?: D6Roller;
}): IPilotDamageResultWithState | undefined {
  const { criticalEvents, locationDamages, roller, state } = options;
  if (hasPilotAbility(state, ARTIFICIAL_PAIN_SHUNT_PILOT_ABILITY_ID)) {
    return undefined;
  }

  const hasVdni = hasPilotAbility(state, VDNI_PILOT_ABILITY_ID);
  const hasBufferedVdni = hasPilotAbility(
    state,
    BUFFERED_VDNI_PILOT_ABILITY_ID,
  );
  const shouldRollForVdni =
    hasVdni && !hasBufferedVdni && tookInternalStructureDamage(locationDamages);
  const shouldRollForBufferedVdni =
    hasBufferedVdni && resolvedCriticalSlotHit(criticalEvents);
  if (!shouldRollForVdni && !shouldRollForBufferedVdni) {
    return undefined;
  }

  const feedbackRoll = roll2d6(roller);
  if (feedbackRoll.total < NEURAL_FEEDBACK_TARGET_NUMBER) {
    return undefined;
  }

  return applyPilotDamage(state, 1, 'neural_feedback', roller);
}

function finalizeDamageResolution(options: {
  readonly initialState: IUnitDamageState;
  readonly stateAfterDamage: IUnitDamageState;
  readonly location: CombatLocation;
  readonly originalDamage: number;
  readonly locationDamages: IResolveDamageResult['result']['locationDamages'];
  readonly roller?: D6Roller;
  readonly applyHeadPilotDamage: boolean;
  readonly rollCriticalHits: boolean;
}): IResolveDamageResult {
  const {
    applyHeadPilotDamage,
    initialState,
    location,
    locationDamages,
    originalDamage,
    roller,
    rollCriticalHits,
    stateAfterDamage,
  } = options;
  let currentState = stateAfterDamage;

  const criticalHits: ICriticalHitResult[] = [];
  let pilotDamage: IPilotDamageResult | undefined;

  if (
    applyHeadPilotDamage &&
    isHeadHit(location) &&
    originalDamage > 0 &&
    !hasDermalArmorHeadHitProtection(initialState)
  ) {
    const { state: stateAfterPilot, result } = applyPilotDamage(
      currentState,
      1,
      'head_hit',
      roller,
    );
    currentState = stateAfterPilot;
    pilotDamage = result;
  }

  const criticalEvents: CriticalHitEvent[] = [];
  const criticalTriggers: { location: CombatLocation; count: number }[] = [];
  const ctx = initialState.criticalContext;
  let runningManifest: CriticalSlotManifest | undefined = ctx?.manifest;
  let runningComponentDamage: IComponentDamageState | undefined =
    ctx?.componentDamage;

  if (rollCriticalHits) {
    for (const locDamage of locationDamages) {
      if (locDamage.structureDamage <= 0 || locDamage.destroyed) {
        continue;
      }

      const trigger = checkCriticalHitTrigger(
        locDamage.structureDamage,
        roller,
        ctx?.criticalHitModifier,
      );
      if (!trigger.triggered) {
        continue;
      }

      const count = getCriticalHitCount(
        trigger.roll.total + (ctx?.criticalHitModifier ?? 0),
      );
      criticalTriggers.push({ location: locDamage.location, count });

      if (
        ctx &&
        runningManifest !== undefined &&
        runningComponentDamage !== undefined &&
        roller !== undefined
      ) {
        const outcome = resolveCriticalHits(
          ctx.unitId,
          locDamage.location,
          runningManifest,
          runningComponentDamage,
          roller,
          count,
          ctx.armorType,
          {
            pilotAbilities: initialState.pilotAbilities ?? [],
            edgePointsRemaining: currentState.edgePointsRemaining,
            turn: initialState.turn,
            unitId: initialState.unitId,
            criticalHitModifier: ctx.criticalHitModifier,
            optionalRules: ctx.optionalRules,
          },
        );

        runningManifest = outcome.updatedManifest;
        runningComponentDamage = outcome.updatedComponentDamage;
        if (outcome.edgePointsRemaining !== undefined) {
          currentState = {
            ...currentState,
            edgePointsRemaining: outcome.edgePointsRemaining,
          };
        }
        criticalEvents.push(...outcome.events);

        for (const hit of outcome.hits) {
          criticalHits.push({
            location: locDamage.location,
            severity: outcome.locationBlownOff
              ? CriticalSeverity.LimbBlownOff
              : CriticalSeverity.Standard,
            slotRoll: {
              dice: [0, 0],
              total: 0,
              isSnakeEyes: false,
              isBoxcars: false,
            },
            slot: {
              slotIndex: hit.slot.slotIndex,
              equipment: hit.slot.componentName,
              destroyed: hit.slotDestroyed !== false,
            },
            effect: hit.effect,
          });
        }
      }
    }
  }

  const neuralFeedbackPilotDamage = resolveNeuralFeedbackPilotDamage({
    state: currentState,
    locationDamages,
    criticalEvents,
    roller,
  });
  if (neuralFeedbackPilotDamage !== undefined) {
    currentState = neuralFeedbackPilotDamage.state;
  }

  const {
    state: stateAfterDestruction,
    destroyed,
    cause,
  } = checkUnitDestruction(currentState);
  currentState = stateAfterDestruction;

  let resolvedDestroyed = destroyed;
  let resolvedCause = cause;
  if (!resolvedDestroyed) {
    for (const event of criticalEvents) {
      if (event.type === 'unit_destroyed') {
        resolvedDestroyed = true;
        if (event.payload.cause === 'damage') {
          resolvedCause = 'engine_destroyed';
        } else if (event.payload.cause === 'pilot_death') {
          resolvedCause = 'pilot_death';
        } else {
          resolvedCause = event.payload.cause;
        }
        break;
      }
    }
  }

  if (resolvedDestroyed && currentState.destroyed === false) {
    currentState = {
      ...currentState,
      destroyed: true,
      destructionCause: resolvedCause,
    };
  }

  return {
    state: currentState,
    result: {
      locationDamages,
      criticalHits,
      pilotDamage,
      unitDestroyed: resolvedDestroyed,
      destructionCause: resolvedCause,
    },
    neuralFeedbackPilotDamage: neuralFeedbackPilotDamage?.result,
    componentDamage: runningComponentDamage,
    criticalEvents: criticalEvents.length > 0 ? criticalEvents : undefined,
    criticalTriggers:
      criticalTriggers.length > 0 ? criticalTriggers : undefined,
    manifest: runningManifest,
  };
}

/**
 * Resolve a damage application.
 *
 * The optional `roller` parameter threads a deterministic `D6Roller`
 * through the dice path so unit/scenario tests can reproduce exact crit
 * sequences. When omitted, the function falls back to production random
 * behavior inside the lower-level roll helpers.
 */
export function resolveDamage(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
  roller?: D6Roller,
  options: { readonly rollCriticalHits?: boolean } = {},
): IResolveDamageResult {
  const effectiveDamage =
    isHeadHit(location) && damage > HEAD_DAMAGE_CAP_PER_HIT
      ? HEAD_DAMAGE_CAP_PER_HIT
      : damage;

  const { state: stateAfterDamage, results: locationDamages } =
    applyDamageWithTransfer(state, location, effectiveDamage);

  return finalizeDamageResolution({
    initialState: state,
    stateAfterDamage,
    location,
    originalDamage: damage,
    locationDamages,
    roller,
    applyHeadPilotDamage: true,
    rollCriticalHits: options.rollCriticalHits ?? true,
  });
}

/**
 * Resolve damage that bypasses armor and starts at internal structure.
 * Ammo explosions use this path: MegaMek marks ammo-explosion damage as
 * direct-to-IS and handles armor blowout separately from the structure
 * cascade.
 */
export function resolveInternalDamage(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
  roller?: D6Roller,
  options: {
    readonly applyHeadPilotDamage?: boolean;
    readonly rollCriticalHits?: boolean;
  } = {},
): IResolveDamageResult {
  const { state: stateAfterDamage, results: locationDamages } =
    applyInternalDamageWithTransfer(state, location, damage);

  return finalizeDamageResolution({
    initialState: state,
    stateAfterDamage,
    location,
    originalDamage: damage,
    locationDamages,
    roller,
    applyHeadPilotDamage: options.applyHeadPilotDamage ?? true,
    rollCriticalHits: options.rollCriticalHits ?? true,
  });
}
