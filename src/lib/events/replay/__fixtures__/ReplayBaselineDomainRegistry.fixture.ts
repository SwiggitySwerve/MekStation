/**
 * Composed valid-payload fixture index for the complete domain registry
 * (replay-safety PR 11): every canonical campaign + combat discriminant
 * maps to the valid v1 fixture its owning pack ships. The composition
 * test proves this index covers EXACTLY the canonical discriminant set,
 * so a new discriminant fails until its pack registers a schema AND a
 * fixture.
 */

import { VALID_CAMPAIGN_EVENT_PAYLOADS } from './CampaignBaselineSchemaPack.fixture';
import { VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS } from './CombatBattleArmorBaselineSchemaPack.fixture';
import { VALID_COMBAT_DAMAGE_EVENT_PAYLOADS } from './CombatDamageBaselineSchemaPack.fixture';
import { VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS } from './CombatLifecycleBaselineSchemaPack.fixture';
import { VALID_COMBAT_MISSION_EVENT_PAYLOADS } from './CombatMissionBaselineSchemaPack.fixture';
import { VALID_COMBAT_MOVEMENT_EVENT_PAYLOADS } from './CombatMovementBaselineSchemaPack.fixture';
import { VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS } from './CombatPhysicalBaselineSchemaPack.fixture';
import { VALID_COMBAT_RANGED_EVENT_PAYLOADS } from './CombatRangedBaselineSchemaPack.fixture';
import { VALID_COMBAT_VEHICLE_EVENT_PAYLOADS } from './CombatVehicleBaselineSchemaPack.fixture';

export const VALID_REPLAY_BASELINE_EVENT_PAYLOADS: Readonly<
  Record<string, unknown>
> = Object.freeze({
  ...VALID_CAMPAIGN_EVENT_PAYLOADS,
  ...VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS,
  ...VALID_COMBAT_MOVEMENT_EVENT_PAYLOADS,
  ...VALID_COMBAT_RANGED_EVENT_PAYLOADS,
  ...VALID_COMBAT_DAMAGE_EVENT_PAYLOADS,
  ...VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS,
  ...VALID_COMBAT_VEHICLE_EVENT_PAYLOADS,
  ...VALID_COMBAT_MISSION_EVENT_PAYLOADS,
  ...VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS,
});
