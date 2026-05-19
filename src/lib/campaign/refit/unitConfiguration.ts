/**
 * Unit Configuration Resolution — campaign-side current build lookup
 *
 * The refit launch flow needs a unit's *current* `MechBuildConfig` to diff
 * against the target. Per `add-campaign-refit-and-prestige` design D5 the
 * campaign stores per-unit configurations on
 * `campaign.unitConfigurations[unitId]` once a refit completes. Before any
 * refit has run a unit has no stored config — `resolveUnitConfiguration`
 * falls back to a standard medium-mech baseline so the launch flow always
 * has a current build to diff against.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module lib/campaign/refit/unitConfiguration
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

/**
 * Standard 50-ton baseline build — a valid medium mech. Used as the
 * fallback "current configuration" for a unit that has not yet been
 * refit (and therefore has no stored campaign configuration).
 */
export const DEFAULT_UNIT_CONFIGURATION: MechBuildConfig = {
  tonnage: 50,
  engineRating: 250,
  engineType: EngineType.STANDARD,
  gyroType: GyroType.STANDARD,
  internalStructureType: InternalStructureType.STANDARD,
  armorType: ArmorTypeEnum.STANDARD,
  totalArmorPoints: 160,
  cockpitType: CockpitType.STANDARD,
  heatSinkType: HeatSinkType.SINGLE,
  totalHeatSinks: 10,
  jumpMP: 0,
};

/**
 * Resolve the current campaign configuration for a unit.
 *
 * Returns the stored configuration when the campaign has one (a previous
 * refit completed for this unit), otherwise the standard baseline.
 *
 * @param campaign - the campaign to read
 * @param unitId - the unit whose configuration is wanted
 * @returns the unit's current `MechBuildConfig`
 */
export function resolveUnitConfiguration(
  campaign: ICampaign,
  unitId: string,
): MechBuildConfig {
  return campaign.unitConfigurations?.[unitId] ?? DEFAULT_UNIT_CONFIGURATION;
}
