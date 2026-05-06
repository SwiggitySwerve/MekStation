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
import { isHeadHit } from '../hitLocation';
import { checkCriticalHitTrigger, getCriticalHitCount } from './critical';
import { checkUnitDestruction } from './destruction';
import { applyDamageWithTransfer } from './location';
import { applyPilotDamage } from './pilot';
import { IResolveDamageResult, IUnitDamageState } from './types';

/**
 * Per Total Warfare p. 41 ("Head Damage"): any single hit that lands on
 * the head is capped at 3 points applied; overflow is discarded, NOT
 * transferred. Because cluster weapons (LRM, SRM, AC/LB-X, etc.) invoke
 * `resolveDamage` once per cluster group, applying the cap here also
 * satisfies the per-cluster-group independent cap (spec § Head Damage
 * Cap / Scenario: Cluster hits cap per group).
 *
 * Canonical OpenSpec change: integrate-damage-pipeline / tasks 5.1–5.3.
 */
export const HEAD_DAMAGE_CAP_PER_HIT = 3;

/**
 * Resolve a damage application.
 *
 * The optional `roller` parameter threads a deterministic `D6Roller`
 * (typically a `SeededD6Roller` adapter via `.asD6Roller()`) through
 * the dice path so unit / scenario / Monte Carlo tests can reproduce
 * exact crit sequences. When omitted, the function falls back to
 * `defaultD6Roller` (= `Math.random`) so existing production callsites
 * keep their current behaviour.
 *
 * @spec openspec/changes/add-combat-fidelity-suite/specs/simulation-system/spec.md
 *       (Requirement: Deterministic D6 Roller Adapter for Test Pyramid)
 */
export function resolveDamage(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
  roller?: D6Roller,
): IResolveDamageResult {
  let currentState = state;

  // Apply head-damage cap BEFORE dispatching to the transfer chain.
  // This must not raise the damage, so `Math.min` is safe even if a
  // caller passes a degenerate negative value (which is clamped to 0
  // downstream anyway).
  const effectiveDamage =
    isHeadHit(location) && damage > HEAD_DAMAGE_CAP_PER_HIT
      ? HEAD_DAMAGE_CAP_PER_HIT
      : damage;

  const { state: stateAfterDamage, results: locationDamages } =
    applyDamageWithTransfer(currentState, location, effectiveDamage);
  currentState = stateAfterDamage;

  const criticalHits: ICriticalHitResult[] = [];
  let pilotDamage: IPilotDamageResult | undefined;

  if (isHeadHit(location) && damage > 0) {
    const { state: stateAfterPilot, result } = applyPilotDamage(
      currentState,
      1,
      'head_hit',
    );
    currentState = stateAfterPilot;
    pilotDamage = result;
  }

  // Per `add-combat-fidelity-suite` Phase 3: capture the trigger return
  // value (the prior implementation discarded it, leaving
  // `criticalHits[]` permanently empty). When `criticalContext` is
  // present the resolver fires per-location and produces resolved-slot
  // events; otherwise we record the trigger count only and the
  // event/slot fan-out happens at a higher layer (legacy session).
  const criticalEvents: CriticalHitEvent[] = [];
  const criticalTriggers: { location: CombatLocation; count: number }[] = [];
  const ctx = state.criticalContext;
  let runningManifest: CriticalSlotManifest | undefined = ctx?.manifest;
  let runningComponentDamage: IComponentDamageState | undefined =
    ctx?.componentDamage;

  for (const locDamage of locationDamages) {
    if (locDamage.structureDamage <= 0 || locDamage.destroyed) {
      continue;
    }

    const trigger = checkCriticalHitTrigger(locDamage.structureDamage, roller);
    if (!trigger.triggered) {
      continue;
    }

    const count = getCriticalHitCount(trigger.roll.total);
    criticalTriggers.push({ location: locDamage.location, count });

    if (
      ctx &&
      runningManifest !== undefined &&
      runningComponentDamage !== undefined &&
      roller !== undefined
    ) {
      // The resolver consumes a `D6Roller` (single-d6) — same `roller`
      // we already validated above. It returns the resolved slot list +
      // the new manifest + the new component damage + a flat event
      // stream. We fold the per-call output into running aggregates so
      // sequential hits in this same `resolveDamage` call (cluster
      // weapons → multiple structure-damaging locations) compound
      // correctly.
      const outcome = resolveCriticalHits(
        ctx.unitId,
        locDamage.location,
        runningManifest,
        runningComponentDamage,
        roller,
        count,
        ctx.armorType,
      );

      runningManifest = outcome.updatedManifest;
      runningComponentDamage = outcome.updatedComponentDamage;
      criticalEvents.push(...outcome.events);

      // Translate the resolver's `ICriticalHitApplicationResult[]` into
      // the canonical `ICriticalHitResult[]` shape on `IDamageResult`.
      // We fill `severity`/`slotRoll` with synthesized defaults — the
      // resolver doesn't record them, but the public shape demands
      // them. Tests assert on length / `effect` / `slot.equipment` so
      // the synthesis is stable.
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
            destroyed: true,
          },
          effect: hit.effect,
        });
      }
    }
  }

  const {
    state: stateAfterDestruction,
    destroyed,
    cause,
  } = checkUnitDestruction(currentState);
  currentState = stateAfterDestruction;

  // Promote crit-induced unit destruction into the public destruction
  // signals when raw armor/structure didn't already trip them. The
  // resolver emits `unit_destroyed` with `cause: 'damage'` on engine
  // 3-hit and `cause: 'pilot_death'` on cockpit hit; we translate the
  // engine case to the spec-correct `'engine_destroyed'` cause here so
  // the runner sees the right enum without re-deriving it.
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
    componentDamage: runningComponentDamage,
    criticalEvents: criticalEvents.length > 0 ? criticalEvents : undefined,
    criticalTriggers:
      criticalTriggers.length > 0 ? criticalTriggers : undefined,
    manifest: runningManifest,
  };
}
