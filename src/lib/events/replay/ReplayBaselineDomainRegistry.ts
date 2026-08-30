/**
 * Complete domain registry composition (replay-safety PR 11).
 *
 * Composes the campaign pack and all eight combat packs into one
 * baseline registration set and proves it exactly covers every
 * canonical replay discriminant: the eight `CampaignEventType` members
 * plus the 81 `GameEventType` members (80 frozen + `PhysicalAttackLocked`
 * per the 2026-08-21 schema-pack-inventory amendment).
 *
 * Completeness is guarded twice:
 *
 * - COMPILE TIME - the union of the packs' exported owner types must
 *   equal `GameEventType` exactly (`COMBAT_COMPOSITION_COMPLETENESS`
 *   below fails to typecheck on any missing or extra member), and the
 *   campaign pack already carries `satisfies Record<CampaignEventType,
 *   z.ZodType>`. A brand-new discriminant therefore breaks the build
 *   until a pack claims it.
 * - RUNTIME - `assertReplayBaselineDomainCompleteness` compares the
 *   composed registration set against the live canonical value sets and
 *   throws `ReplayBaselineCompletenessError` naming every missing,
 *   extra, or duplicated discriminant, so a registry built from a
 *   partial composition can never be handed to replay silently.
 *
 * Not wired to production replay: composition here only proves
 * exhaustiveness; production integration stays disabled until the
 * checkpoint/quarantine tasks land.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import type { CampaignEventType } from '@/types/campaign/CampaignSync';

import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';

import type { CombatBattleArmorEventType } from './CombatBattleArmorBaselineSchemaPack';
import type { CombatDamageEventType } from './CombatDamageBaselineSchemaPack';
import type { CombatLifecycleEventType } from './CombatLifecycleBaselineSchemaPack';
import type { CombatMissionEventType } from './CombatMissionBaselineSchemaPack';
import type { CombatMovementEventType } from './CombatMovementBaselineSchemaPack';
import type { CombatPhysicalEventType } from './CombatPhysicalBaselineSchemaPack';
import type { CombatRangedEventType } from './CombatRangedBaselineSchemaPack';
import type { CombatVehicleEventType } from './CombatVehicleBaselineSchemaPack';
import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

import { CAMPAIGN_BASELINE_SCHEMA_PACK } from './CampaignBaselineSchemaPack';
import { COMBAT_BATTLE_ARMOR_BASELINE_SCHEMA_PACK } from './CombatBattleArmorBaselineSchemaPack';
import { COMBAT_DAMAGE_BASELINE_SCHEMA_PACK } from './CombatDamageBaselineSchemaPack';
import { COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK } from './CombatLifecycleBaselineSchemaPack';
import { COMBAT_MISSION_BASELINE_SCHEMA_PACK } from './CombatMissionBaselineSchemaPack';
import { COMBAT_MOVEMENT_BASELINE_SCHEMA_PACK } from './CombatMovementBaselineSchemaPack';
import { COMBAT_PHYSICAL_BASELINE_SCHEMA_PACK } from './CombatPhysicalBaselineSchemaPack';
import { COMBAT_RANGED_BASELINE_SCHEMA_PACK } from './CombatRangedBaselineSchemaPack';
import { COMBAT_VEHICLE_BASELINE_SCHEMA_PACK } from './CombatVehicleBaselineSchemaPack';
import { ReplaySchemaRegistry } from './ReplaySchemaRegistry';

/** Union of every discriminant the eight combat packs claim to own. */
type ComposedCombatEventType =
  | CombatLifecycleEventType
  | CombatMovementEventType
  | CombatRangedEventType
  | CombatDamageEventType
  | CombatPhysicalEventType
  | CombatVehicleEventType
  | CombatMissionEventType
  | CombatBattleArmorEventType;

/**
 * Compile-time completeness guard: both directions must be `never`. A
 * `GameEventType` member no pack owns (or a pack member outside the
 * enum) turns the tuple non-never and this constant fails to typecheck.
 */
const COMBAT_COMPOSITION_COMPLETENESS: [
  Exclude<GameEventType, ComposedCombatEventType>,
  Exclude<ComposedCombatEventType, GameEventType>,
] extends [never, never]
  ? true
  : never = true;
void COMBAT_COMPOSITION_COMPLETENESS;

/**
 * The eight canonical campaign discriminants as runtime values.
 * `CampaignEventType` is a type-only string union with no runtime
 * object, so the values are pinned here; the two `satisfies`/`Exclude`
 * guards make the pin two-way exhaustive against the live union.
 */
const CANONICAL_CAMPAIGN_EVENT_TYPES = [
  'CampaignDayAdvanced',
  'FundsChanged',
  'PilotHired',
  'ContractAccepted',
  'RosterUnitChanged',
  'SalvageAllocated',
  'ParticipantRemoved',
  'CampaignSnapshotPublished',
] as const satisfies readonly CampaignEventType[];

const CAMPAIGN_PIN_COMPLETENESS: Exclude<
  CampaignEventType,
  (typeof CANONICAL_CAMPAIGN_EVENT_TYPES)[number]
> extends never
  ? true
  : never = true;
void CAMPAIGN_PIN_COMPLETENESS;

/** Every canonical replay discriminant, as runtime string values. */
export const REPLAY_BASELINE_CANONICAL_EVENT_TYPES: readonly string[] =
  Object.freeze([
    ...CANONICAL_CAMPAIGN_EVENT_TYPES,
    ...Object.values(GameEventType),
  ]);

/** The composed campaign + combat baseline registration set. */
export const REPLAY_BASELINE_DOMAIN_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] =
  Object.freeze([
    ...CAMPAIGN_BASELINE_SCHEMA_PACK,
    ...COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK,
    ...COMBAT_MOVEMENT_BASELINE_SCHEMA_PACK,
    ...COMBAT_RANGED_BASELINE_SCHEMA_PACK,
    ...COMBAT_DAMAGE_BASELINE_SCHEMA_PACK,
    ...COMBAT_PHYSICAL_BASELINE_SCHEMA_PACK,
    ...COMBAT_VEHICLE_BASELINE_SCHEMA_PACK,
    ...COMBAT_MISSION_BASELINE_SCHEMA_PACK,
    ...COMBAT_BATTLE_ARMOR_BASELINE_SCHEMA_PACK,
  ]);

/**
 * Thrown when a composed registration set does not exactly cover the
 * canonical discriminant sets. Carries the full evidence lists rather
 * than a sample so the failure names every offending discriminant.
 */
export class ReplayBaselineCompletenessError extends Error {
  public readonly missing: readonly string[];
  public readonly extra: readonly string[];
  public readonly duplicated: readonly string[];

  public constructor(
    missing: readonly string[],
    extra: readonly string[],
    duplicated: readonly string[],
  ) {
    super(
      'Replay baseline composition is not exhaustive: ' +
        `missing=[${missing.join(', ')}] extra=[${extra.join(', ')}] ` +
        `duplicated=[${duplicated.join(', ')}]`,
    );
    this.name = 'ReplayBaselineCompletenessError';
    this.missing = Object.freeze([...missing]);
    this.extra = Object.freeze([...extra]);
    this.duplicated = Object.freeze([...duplicated]);
  }
}

/**
 * Runtime completeness guard: the registration set must register every
 * canonical discriminant exactly once - no missing, extra, or
 * duplicated event types. Why a runtime check on top of the
 * compile-time guard: the compile-time guard proves the TYPE union, not
 * that each pack's runtime array actually carries a registration for
 * each claimed member.
 */
export function assertReplayBaselineDomainCompleteness(
  registrations: readonly IReplayEventSchemaRegistration[],
): void {
  const seen = new Set<string>();
  const duplicated: string[] = [];
  for (const registration of registrations) {
    if (seen.has(registration.eventType))
      duplicated.push(registration.eventType);
    seen.add(registration.eventType);
  }
  const canonical = new Set(REPLAY_BASELINE_CANONICAL_EVENT_TYPES);
  const missing = REPLAY_BASELINE_CANONICAL_EVENT_TYPES.filter(
    (eventType) => !seen.has(eventType),
  );
  const extra = Array.from(seen).filter(
    (eventType) => !canonical.has(eventType),
  );
  if (missing.length > 0 || extra.length > 0 || duplicated.length > 0)
    throw new ReplayBaselineCompletenessError(missing, extra, duplicated);
}

/**
 * Builds the complete domain registry, refusing to construct one from
 * an incomplete composition.
 */
export function createReplayBaselineDomainRegistry(): ReplaySchemaRegistry {
  assertReplayBaselineDomainCompleteness(REPLAY_BASELINE_DOMAIN_SCHEMA_PACK);
  return new ReplaySchemaRegistry({
    events: REPLAY_BASELINE_DOMAIN_SCHEMA_PACK,
  });
}
