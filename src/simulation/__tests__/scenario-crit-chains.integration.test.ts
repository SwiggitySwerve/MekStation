/**
 * Phase 3 of `add-combat-fidelity-suite` — scenario-level crit-chain
 * integration tests.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/combat-resolution/spec.md
 *     - "Critical Hit Events Emitted by Runner"
 *       (Scenarios: gyro destruction event chain, engine-3-hit triggers
 *       UnitDestroyed)
 *
 * Determinism strategy:
 *   These scenarios sequence multiple `resolveDamage` calls against
 *   the same target, threading the post-resolution `manifest` and
 *   `componentDamage` from each call into the `criticalContext` of
 *   the next. A scripted `D6Roller` returns a deterministic sequence
 *   so the slot-selection roll picks the desired component every
 *   shot. This emulates what `runAttackPhase` does over multiple
 *   weapon mounts but isolates the test from the AI's RNG-coupled
 *   hit-location and to-hit logic.
 *
 *   Layer-1 tests at `src/simulation/runner/__tests__/criticalHitEvents.test.ts`
 *   cover single-call dispatch + runner-side event emission.
 */

import type { IComponentDamageState } from '@/types/gameplay/GameSessionInterfaces';
import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';
import type { IUnitDamageState } from '@/utils/gameplay/damage';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { CombatLocation } from '@/types/gameplay';
import { buildDefaultCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import { resolveDamage } from '@/utils/gameplay/damage';

import { DEFAULT_COMPONENT_DAMAGE } from '../runner/SimulationRunnerConstants';

// =============================================================================
// Test fixture builders
// =============================================================================

/**
 * Build a primed `IUnitDamageState` with armor stripped at the target
 * location so a single shot reaches structure and triggers a crit
 * roll. Other locations stay full so the structure-damage chain
 * terminates after one hit (no transfer cascade).
 */
function buildPrimed(targetLoc: CombatLocation): IUnitDamageState {
  const baseArmor = {
    head: 9,
    center_torso: 47,
    center_torso_rear: 14,
    left_torso: 32,
    left_torso_rear: 10,
    right_torso: 32,
    right_torso_rear: 10,
    left_arm: 34,
    right_arm: 34,
    left_leg: 41,
    right_leg: 41,
  } as const;
  // Structure has no rear sub-locations in BattleTech, but the
  // `CombatLocation` union includes the rear keys for armor parity —
  // populate them with 0 so the type checker accepts the record.
  const baseStructure = {
    head: 3,
    center_torso: 31,
    center_torso_rear: 0,
    left_torso: 21,
    left_torso_rear: 0,
    right_torso: 21,
    right_torso_rear: 0,
    left_arm: 17,
    right_arm: 17,
    left_leg: 21,
    right_leg: 21,
  } as const;

  return {
    armor: { ...baseArmor, [targetLoc]: 0 },
    rearArmor: { center_torso: 14, left_torso: 10, right_torso: 10 },
    structure: { ...baseStructure },
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
  };
}

/**
 * Scripted d6 roller — returns the supplied sequence in order, then
 * falls back to `1` once exhausted.
 */
function scripted(values: readonly number[]): D6Roller {
  let i = 0;
  return () => {
    const v = i < values.length ? values[i] : 1;
    i++;
    return v;
  };
}

/**
 * Sequencer — runs a single damage application on the running state +
 * manifest + componentDamage and returns the new state for the next
 * shot. Mirrors what `runAttackPhase` does between mounts.
 */
function applyShot(options: {
  state: IUnitDamageState;
  manifest: CriticalSlotManifest;
  componentDamage: IComponentDamageState;
  location: CombatLocation;
  damage: number;
  roller: D6Roller;
  unitId: string;
}): {
  state: IUnitDamageState;
  manifest: CriticalSlotManifest;
  componentDamage: IComponentDamageState;
  unitDestroyed: boolean;
  destructionCause: string | undefined;
  events: ReadonlyArray<{ readonly type: string; readonly payload: unknown }>;
  criticalHits: readonly unknown[];
} {
  const stateWithCtx: IUnitDamageState = {
    ...options.state,
    criticalContext: {
      unitId: options.unitId,
      manifest: options.manifest,
      componentDamage: options.componentDamage,
    },
  };
  const result = resolveDamage(
    stateWithCtx,
    options.location,
    options.damage,
    options.roller,
  );
  return {
    state: result.state,
    manifest: result.manifest ?? options.manifest,
    componentDamage: result.componentDamage ?? options.componentDamage,
    unitDestroyed: result.result.unitDestroyed,
    destructionCause: result.result.destructionCause,
    events: (result.criticalEvents ?? []).map((e) => ({
      type: e.type,
      payload: e.payload,
    })),
    criticalHits: result.result.criticalHits,
  };
}

// =============================================================================
// Scenario: gyro destruction sequence
// =============================================================================

describe('Scenario: gyro destruction sequence (Phase 3, combat-resolution + piloting-skill-rolls)', () => {
  it('two CT structure crits selecting gyro slots → gyroHits=2 → cannot-stand penalty', () => {
    // GIVEN a fresh Atlas-like target with stripped CT armor
    // AND scripted rolls: 4+4=8 (trigger), then 4 (slot pick → gyro
    //     slot at index 3 in CT manifest [engine, engine, engine,
    //     gyro, gyro, gyro, gyro]; available list = full, idx
    //     (4-1) % 7 = 3 → gyro)
    // WHEN resolveDamage is called twice with structure damage to CT
    // THEN both gyro hits resolve, gyroHits=2, and the second hit
    //      attaches a `psr_triggered` event with cumulative
    //      `additionalModifier`.
    let state = buildPrimed('center_torso');
    let manifest = buildDefaultCriticalSlotManifest();
    let componentDamage: IComponentDamageState = {
      ...DEFAULT_COMPONENT_DAMAGE,
    };

    // Shot 1: 4+4 (trigger) + 4 (gyro slot 3) — picks gyro at idx 3.
    const shot1 = applyShot({
      state,
      manifest,
      componentDamage,
      location: 'center_torso',
      damage: 5,
      roller: scripted([4, 4, 1, 4]),
      unitId: 'opponent-1',
    });
    state = shot1.state;
    manifest = shot1.manifest;
    componentDamage = shot1.componentDamage;

    expect(componentDamage.gyroHits).toBe(1);
    expect(shot1.criticalHits).toHaveLength(1);
    const psrEvent1 = shot1.events.find((e) => e.type === 'psr_triggered');
    expect(psrEvent1).toBeDefined();

    // Shot 2: 5+4=9 (trigger), pick another gyro slot. Gyro at slot
    // index 3 already destroyed → available = [engine, engine,
    // engine, gyro, gyro, gyro] (size 6); roll 4 → idx (4-1) % 6 = 3
    // → first surviving gyro slot.
    const shot2 = applyShot({
      state,
      manifest,
      componentDamage,
      location: 'center_torso',
      damage: 5,
      roller: scripted([5, 4, 1, 5]),
      unitId: 'opponent-1',
    });
    componentDamage = shot2.componentDamage;
    expect(componentDamage.gyroHits).toBe(2);
    const psrEvent2 = shot2.events.find((e) => e.type === 'psr_triggered');
    expect(psrEvent2).toBeDefined();
    // The PSR cumulative modifier is gyroHits * 3 = 6 by the second
    // hit (per `engineEffects.applyGyroHit`).
    const psrPayload2 = psrEvent2!.payload as { additionalModifier: number };
    expect(psrPayload2.additionalModifier).toBe(6);
  });
});

// =============================================================================
// Scenario: engine destruction sequence
// =============================================================================

describe('Scenario: engine destruction sequence (Phase 3, combat-resolution)', () => {
  it('three engine crits across three shots → unit destroyed with cause engine_destroyed', () => {
    let state = buildPrimed('center_torso');
    let manifest = buildDefaultCriticalSlotManifest();
    let componentDamage: IComponentDamageState = {
      ...DEFAULT_COMPONENT_DAMAGE,
    };

    // Shot 1: 4+4=8 trigger, slot d6=1 → idx 0 → engine slot 0.
    const shot1 = applyShot({
      state,
      manifest,
      componentDamage,
      location: 'center_torso',
      damage: 5,
      roller: scripted([4, 4, 1, 1]),
      unitId: 'opponent-1',
    });
    state = shot1.state;
    manifest = shot1.manifest;
    componentDamage = shot1.componentDamage;
    expect(componentDamage.engineHits).toBe(1);
    expect(shot1.unitDestroyed).toBe(false);

    // Shot 2: 5+4=9 trigger, slot d6=1 → idx 0 → next surviving slot.
    // Available = [engine 1, engine 2, gyro, gyro, gyro, gyro] (6);
    // idx (1-1) % 6 = 0 → engine 1.
    const shot2 = applyShot({
      state,
      manifest,
      componentDamage,
      location: 'center_torso',
      damage: 5,
      roller: scripted([5, 4, 1, 2]),
      unitId: 'opponent-1',
    });
    state = shot2.state;
    manifest = shot2.manifest;
    componentDamage = shot2.componentDamage;
    expect(componentDamage.engineHits).toBe(2);
    expect(shot2.unitDestroyed).toBe(false);

    // Shot 3: 4+4=8 trigger, slot d6=1 → idx 0 → engine 2 (last
    // surviving engine slot in CT). engineHits 2→3 → engine destroyed
    // → unit_destroyed with translated cause `'engine_destroyed'`.
    const shot3 = applyShot({
      state,
      manifest,
      componentDamage,
      location: 'center_torso',
      damage: 5,
      roller: scripted([4, 4, 1, 3]),
      unitId: 'opponent-1',
    });
    expect(shot3.componentDamage.engineHits).toBe(3);
    expect(shot3.unitDestroyed).toBe(true);
    expect(shot3.destructionCause).toBe('engine_destroyed');

    // The `unit_destroyed` event must appear in the resolver's stream
    // for shot 3.
    const destroyEvent = shot3.events.find((e) => e.type === 'unit_destroyed');
    expect(destroyEvent).toBeDefined();
  });

  it('manifest persistence: destroyed slots from shot 1 are NOT re-rolled in shot 2', () => {
    // Sanity check: after shot 1 destroys engine slot 0, the post-
    // resolution manifest's CT engine 0 is marked destroyed. Shot 2
    // with the SAME slot-selection roll (1) must pick engine slot 1
    // instead — proving the manifest carries forward.
    let state = buildPrimed('center_torso');
    let manifest = buildDefaultCriticalSlotManifest();
    let componentDamage: IComponentDamageState = {
      ...DEFAULT_COMPONENT_DAMAGE,
    };

    const shot1 = applyShot({
      state,
      manifest,
      componentDamage,
      location: 'center_torso',
      damage: 5,
      roller: scripted([4, 4, 1, 1]),
      unitId: 'opponent-1',
    });
    expect(manifest.center_torso[0].destroyed).toBe(false);
    expect(shot1.manifest.center_torso[0].destroyed).toBe(true);
    state = shot1.state;
    manifest = shot1.manifest;
    componentDamage = shot1.componentDamage;

    const shot2 = applyShot({
      state,
      manifest,
      componentDamage,
      location: 'center_torso',
      damage: 5,
      roller: scripted([4, 4, 1, 2]),
      unitId: 'opponent-1',
    });

    // The crit-resolved event for shot 2 must reference a DIFFERENT
    // slot index than shot 1 (slot 0 is already destroyed).
    const resolved2 = shot2.events.find(
      (e) => e.type === 'critical_hit_resolved',
    );
    expect(resolved2).toBeDefined();
    const payload2 = resolved2!.payload as {
      slotIndex: number;
      componentType: string;
    };
    expect(payload2.slotIndex).not.toBe(0);
    // Engine slots are at indices 0/1/2 — slot 1 is the next surviving
    // engine slot.
    expect(payload2.slotIndex).toBe(1);
    expect(payload2.componentType).toBe('engine');
  });
});

// =============================================================================
// Scenario: causal-ordering invariant
// =============================================================================

describe('Scenario: crit-chain causal ordering invariant', () => {
  it('within a single shot: critical_hit_resolved precedes psr_triggered when gyro is hit', () => {
    const state = buildPrimed('center_torso');
    const manifest = buildDefaultCriticalSlotManifest();
    const componentDamage: IComponentDamageState = {
      ...DEFAULT_COMPONENT_DAMAGE,
    };
    const shot = applyShot({
      state,
      manifest,
      componentDamage,
      location: 'center_torso',
      damage: 5,
      roller: scripted([4, 4, 1, 4]),
      unitId: 'opponent-1',
    });

    const idx = (type: string) => shot.events.findIndex((e) => e.type === type);
    expect(idx('critical_hit_resolved')).toBeGreaterThanOrEqual(0);
    expect(idx('psr_triggered')).toBeGreaterThan(idx('critical_hit_resolved'));
  });
});
