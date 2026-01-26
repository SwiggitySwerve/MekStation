import {
  PartQuality,
  QUALITY_TN_MODIFIER,
  degradeQuality,
  improveQuality,
} from '@/types/campaign/quality/PartQuality';
import { MAINTENANCE_THRESHOLDS } from '@/types/campaign/quality/IUnitQuality';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IPerson } from '@/types/campaign/Person';

export type RandomFn = () => number;

export interface MaintenanceCheckInput {
  readonly unitId: string;
  readonly quality: PartQuality;
  readonly techSkillValue: number;
  readonly modePenalty: number;
  readonly quirksModifier: number;
  readonly overtimeModifier: number;
  readonly shorthandedModifier: number;
}

export interface ModifierEntry {
  readonly name: string;
  readonly value: number;
}

export interface MaintenanceCheckResult {
  readonly unitId: string;
  readonly roll: number;
  readonly targetNumber: number;
  readonly margin: number;
  readonly outcome: 'success' | 'failure' | 'critical_success' | 'critical_failure';
  readonly qualityBefore: PartQuality;
  readonly qualityAfter: PartQuality;
  readonly modifierBreakdown: readonly ModifierEntry[];
}

export function roll2d6(random: RandomFn): number {
  return Math.floor(random() * 6) + 1 + Math.floor(random() * 6) + 1;
}

function buildModifierBreakdown(input: MaintenanceCheckInput): ModifierEntry[] {
  return [
    { name: 'Tech Skill', value: input.techSkillValue },
    { name: 'Quality', value: QUALITY_TN_MODIFIER[input.quality] },
    { name: 'Mode', value: input.modePenalty },
    { name: 'Quirks', value: input.quirksModifier },
    { name: 'Overtime', value: input.overtimeModifier },
    { name: 'Shorthanded', value: input.shorthandedModifier },
  ];
}

export function calculateMaintenanceTN(input: MaintenanceCheckInput): number {
  return (
    input.techSkillValue +
    QUALITY_TN_MODIFIER[input.quality] +
    input.modePenalty +
    input.quirksModifier +
    input.overtimeModifier +
    input.shorthandedModifier
  );
}

function determineOutcome(
  margin: number,
): 'success' | 'failure' | 'critical_success' | 'critical_failure' {
  if (margin >= MAINTENANCE_THRESHOLDS.QUALITY_IMPROVE_MARGIN) return 'critical_success';
  if (margin >= 0) return 'success';
  if (margin <= MAINTENANCE_THRESHOLDS.CRITICAL_FAILURE_MARGIN) return 'critical_failure';
  return 'failure';
}

function determineQualityAfter(
  quality: PartQuality,
  margin: number,
): PartQuality {
  if (margin >= MAINTENANCE_THRESHOLDS.QUALITY_IMPROVE_MARGIN) return improveQuality(quality);
  if (margin <= MAINTENANCE_THRESHOLDS.QUALITY_DEGRADE_MARGIN) return degradeQuality(quality);
  return quality;
}

export function performMaintenanceCheck(
  input: MaintenanceCheckInput,
  random: RandomFn,
): MaintenanceCheckResult {
  const targetNumber = calculateMaintenanceTN(input);
  const diceRoll = roll2d6(random);
  const margin = diceRoll - targetNumber;
  const outcome = determineOutcome(margin);
  const qualityAfter = determineQualityAfter(input.quality, margin);

  return {
    unitId: input.unitId,
    roll: diceRoll,
    targetNumber,
    margin,
    outcome,
    qualityBefore: input.quality,
    qualityAfter,
    modifierBreakdown: buildModifierBreakdown(input),
  };
}

/** @stub Returns 0. Needs era system. */
export function getEraModifier(_campaign: ICampaign): number {
  return 0;
}

/** @stub Returns 0. Needs planetary system. */
export function getPlanetaryModifier(_campaign: ICampaign): number {
  return 0;
}

/** @stub Returns 0. Needs tech specialization system. */
export function getTechSpecialtiesModifier(_tech: IPerson): number {
  return 0;
}
