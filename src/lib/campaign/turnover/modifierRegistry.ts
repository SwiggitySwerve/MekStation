/**
 * Turnover modifier registry
 *
 * Single source of truth for which modifiers contribute to a turnover check,
 * in what order, and how each is labelled. Replaces the former 100-line
 * hand-rolled `buildModifier(...)` block in `turnoverCheck.ts` — adding a new
 * modifier is now one table entry instead of an edit to the check logic (OCP).
 *
 * The underlying modifier functions keep their natural arity; each registry
 * entry wraps its function in a uniform `(entry, pilot, campaign) => number`
 * evaluator so the consumer can iterate the table without per-modifier
 * dispatch. Campaign-only modifiers simply ignore `entry`/`pilot`.
 *
 * @module campaign/turnover/modifierRegistry
 */
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import {
  getAgeModifier,
  getBaseTargetModifier,
  getFactionCampaignModifier,
  getFactionOriginModifier,
  getFamilyModifier,
  getFatigueModifier,
  getFounderModifier,
  getHostileTerritoryModifier,
  getHRStrainModifier,
  getInjuryModifier,
  getLoyaltyModifier,
  getManagementSkillModifier,
  getMissionStatusModifier,
  getOfficerModifier,
  getRecentPromotionModifier,
  getServiceContractModifier,
  getSharesModifier,
  getSkillDesirabilityModifier,
  getUnitRatingModifier,
} from './modifiers';

/** Uniform evaluator signature — campaign-only modifiers ignore entry/pilot. */
export type TurnoverModifierEvaluator = (
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  campaign: ICampaign,
) => number;

/**
 * One row of the turnover modifier table.
 *
 * `isStub` flags modifiers whose underlying system is not yet implemented
 * (they currently evaluate to 0); the flag is surfaced on the result so the
 * UI can render them distinctly.
 */
export interface TurnoverModifierDefinition {
  /** Stable identifier (e.g. 'founder', 'age'). */
  readonly id: string;
  /** Human-readable label for display (e.g. 'Founder', 'Age'). */
  readonly displayName: string;
  /** True when the underlying system is a not-yet-implemented stub. */
  readonly isStub: boolean;
  /** Wrapped evaluator producing the numeric modifier value. */
  readonly evaluate: TurnoverModifierEvaluator;
}

/**
 * The ordered turnover modifier table.
 *
 * Order is preserved exactly from the legacy `calculateModifiers` block so the
 * `modifiers` array on every `TurnoverCheckResult` is byte-for-byte unchanged.
 * The sum that forms the target number is order-independent, but the array is
 * also surfaced verbatim in the result, so order is part of the contract.
 */
export const TURNOVER_MODIFIER_REGISTRY: readonly TurnoverModifierDefinition[] =
  [
    {
      id: 'baseTarget',
      displayName: 'Base Target',
      isStub: false,
      evaluate: (_entry, _pilot, campaign) => getBaseTargetModifier(campaign),
    },
    {
      id: 'founder',
      displayName: 'Founder',
      isStub: false,
      evaluate: (entry, pilot) => getFounderModifier(entry, pilot),
    },
    {
      id: 'serviceContract',
      displayName: 'Service Contract',
      isStub: false,
      evaluate: (entry, pilot) => getServiceContractModifier(entry, pilot),
    },
    {
      id: 'skillDesirability',
      displayName: 'Skill Desirability',
      isStub: false,
      evaluate: (entry, pilot, campaign) =>
        getSkillDesirabilityModifier(entry, pilot, campaign),
    },
    {
      id: 'recentPromotion',
      displayName: 'Recent Promotion',
      isStub: false,
      evaluate: (entry, pilot, campaign) =>
        getRecentPromotionModifier(entry, pilot, campaign),
    },
    {
      id: 'fatigue',
      displayName: 'Fatigue',
      isStub: true,
      evaluate: (entry, pilot) => getFatigueModifier(entry, pilot),
    },
    {
      id: 'hrStrain',
      displayName: 'HR Strain',
      isStub: true,
      evaluate: (_entry, _pilot, campaign) => getHRStrainModifier(campaign),
    },
    {
      id: 'managementSkill',
      displayName: 'Management Skill',
      isStub: true,
      evaluate: (_entry, _pilot, campaign) =>
        getManagementSkillModifier(campaign),
    },
    {
      id: 'shares',
      displayName: 'Shares',
      isStub: true,
      evaluate: (entry, pilot, campaign) =>
        getSharesModifier(entry, pilot, campaign),
    },
    {
      id: 'unitRating',
      displayName: 'Unit Rating',
      isStub: true,
      evaluate: (_entry, _pilot, campaign) => getUnitRatingModifier(campaign),
    },
    {
      id: 'hostileTerritory',
      displayName: 'Hostile Territory',
      isStub: true,
      evaluate: (_entry, _pilot, campaign) =>
        getHostileTerritoryModifier(campaign),
    },
    {
      id: 'missionStatus',
      displayName: 'Mission Status',
      isStub: false,
      evaluate: (_entry, _pilot, campaign) =>
        getMissionStatusModifier(campaign),
    },
    {
      id: 'loyalty',
      displayName: 'Loyalty',
      isStub: true,
      evaluate: (entry, pilot) => getLoyaltyModifier(entry, pilot),
    },
    {
      id: 'factionCampaign',
      displayName: 'Faction (Campaign)',
      isStub: true,
      evaluate: (_entry, _pilot, campaign) =>
        getFactionCampaignModifier(campaign),
    },
    {
      id: 'factionOrigin',
      displayName: 'Faction (Origin)',
      isStub: true,
      evaluate: (entry, pilot) => getFactionOriginModifier(entry, pilot),
    },
    {
      id: 'age',
      displayName: 'Age',
      isStub: false,
      evaluate: (entry, pilot, campaign) =>
        getAgeModifier(entry, pilot, campaign),
    },
    {
      id: 'family',
      displayName: 'Family',
      isStub: true,
      evaluate: (entry, pilot, campaign) =>
        getFamilyModifier(entry, pilot, campaign),
    },
    {
      id: 'injuries',
      displayName: 'Injuries',
      isStub: false,
      evaluate: (entry, pilot) => getInjuryModifier(entry, pilot),
    },
    {
      id: 'officer',
      displayName: 'Officer Status',
      isStub: false,
      evaluate: (entry, pilot) => getOfficerModifier(entry, pilot),
    },
  ];
