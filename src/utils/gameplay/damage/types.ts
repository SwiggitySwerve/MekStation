import type { IComponentDamageState } from '@/types/gameplay/GameSessionInterfaces';

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  CombatLocation,
  IDamageResult,
  ILocationDamage,
  IPilotDamageResult,
} from '@/types/gameplay';

import type {
  CriticalHitEvent,
  CriticalSlotManifest,
} from '../criticalHitResolution/types';

import { roll2d6 } from '../hitLocation';

export type RearArmorLocation = 'center_torso' | 'left_torso' | 'right_torso';

/**
 * Optional crit-resolution context attached to `IUnitDamageState`.
 *
 * Per `add-combat-fidelity-suite` Phase 3: when present, `resolveDamage`
 * dispatches `resolveCriticalHits()` on every triggered crit roll and
 * populates `IDamageResult.criticalHits[]` with the resolved slots. When
 * absent (legacy callers, low-level damage tests), the trigger fires
 * but slot resolution is deferred to the runner — `criticalHits[]`
 * stays empty in that case.
 *
 * The fields mirror the `resolveCriticalHits` parameter list. Held here as a
 * single bundle so callers don't have to thread positional arguments through
 * every helper.
 */
export interface ICriticalContext {
  readonly unitId: string;
  readonly manifest: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly armorType?: ArmorTypeEnum;
  readonly criticalHitModifier?: number;
  readonly optionalRules?: readonly string[];
}

export interface IUnitDamageState {
  readonly armor: Readonly<Record<CombatLocation, number>>;
  readonly rearArmor: Readonly<Record<RearArmorLocation, number>>;
  readonly structure: Readonly<Record<CombatLocation, number>>;
  readonly destroyedLocations: readonly CombatLocation[];
  readonly pilotWounds: number;
  readonly pilotConscious: boolean;
  readonly pilotAbilities?: readonly string[];
  /**
   * Source-backed RPG Toughness numeric crew value. Undefined preserves the
   * default MegaMek behavior when the RPG Toughness option is absent or not
   * hydrated; ability aliases named "toughness" do not imply this value.
   */
  readonly pilotToughness?: number;
  /** Remaining Edge points available to source-backed trigger consumers. */
  readonly edgePointsRemaining?: number;
  /** Unit id used when trigger consumers record Edge usage history. */
  readonly unitId?: string;
  /** Current turn used when trigger consumers record Edge usage history. */
  readonly turn?: number;
  readonly destroyed: boolean;
  readonly destructionCause?:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed'
    | 'impossible_displacement'
    | 'ct_destroyed'
    | 'head_destroyed';
  /**
   * Per `add-combat-fidelity-suite` Phase 3: when supplied, `resolveDamage`
   * dispatches `resolveCriticalHits` per location where the trigger
   * fires. Optional + last so existing callers compile unchanged.
   */
  readonly criticalContext?: ICriticalContext;
}

export interface ILocationDamageResult {
  state: IUnitDamageState;
  result: ILocationDamage;
}

export interface IDamageWithTransferResult {
  state: IUnitDamageState;
  results: ILocationDamage[];
}

export interface IPilotDamageResultWithState {
  state: IUnitDamageState;
  result: IPilotDamageResult;
}

export interface IDestructionCheckResult {
  state: IUnitDamageState;
  destroyed: boolean;
  cause?:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed'
    | 'impossible_displacement'
    | 'ct_destroyed'
    | 'head_destroyed';
}

export interface IResolveDamageResult {
  state: IUnitDamageState;
  result: IDamageResult;
  /**
   * Source-backed VDNI/BVDNI neural-feedback pilot damage resolved during
   * this damage application. Kept outside `IDamageResult.pilotDamage` so
   * legacy head-hit consumers do not conflate the two pilot-wound sources.
   */
  neuralFeedbackPilotDamage?: IPilotDamageResult;
  /**
   * Per `add-combat-fidelity-suite` Phase 3: when `state.criticalContext`
   * was populated and at least one crit triggered, this carries the
   * post-resolution `IComponentDamageState` for the runner to apply to
   * `IUnitGameState.componentDamage`. Undefined when no crits fired or
   * no context was supplied.
   */
  componentDamage?: IComponentDamageState;
  /**
   * Per `add-combat-fidelity-suite` Phase 3: events produced by the
   * crit-resolver (`critical_hit_resolved` / `unit_destroyed` /
   * `pilot_hit` / `psr_triggered`) in causal order. The runner
   * translates these into game events and emits them after the
   * `LocationDestroyed` events for the same location. Undefined when
   * no context was supplied.
   */
  criticalEvents?: readonly CriticalHitEvent[];
  /**
   * Per `add-combat-fidelity-suite` Phase 3: per-location crit-trigger
   * count. Maps a `CombatLocation` (the location that took structure
   * damage) to the number of crits that triggered there in this single
   * `resolveDamage` call. The runner emits one `CriticalHit` event per
   * unit (location, count) entry. Undefined when no context was
   * supplied.
   */
  criticalTriggers?: ReadonlyArray<{
    readonly location: CombatLocation;
    readonly count: number;
  }>;
  /**
   * Per `add-combat-fidelity-suite` Phase 3: post-resolution slot
   * manifest with destroyed flags applied. The runner threads this
   * into the unit's persistent `criticalSlotManifest` so subsequent
   * shots see the already-destroyed slots and don't re-roll them.
   */
  manifest?: CriticalSlotManifest;
}

export interface ITerrainDamageResult extends IResolveDamageResult {
  terrainEffects?: {
    drowningCheckTriggered: boolean;
    drowningRoll?: ReturnType<typeof roll2d6>;
    drowningCheckPassed?: boolean;
    drowningDamage?: number;
  };
}

export type PilotDamageSource =
  | 'head_hit'
  | 'ammo_explosion'
  | 'mech_destruction'
  | 'fall'
  | 'physical_attack'
  | 'heat'
  | 'neural_feedback';
