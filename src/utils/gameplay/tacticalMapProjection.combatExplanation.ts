import type {
  ICombatRangeHex,
  ICombatWeaponImpact,
  ICombatWeaponRangeOption,
} from '@/types/gameplay';

import type {
  ITacticalMapCombatLosBlockerReference,
  ProjectionExplanationInput,
} from './tacticalMapProjection.types';

import { formatSignedCost } from './tacticalMapProjection.movementFormatting';

export function appendCombatProjectionExplanation(
  parts: string[],
  { combat }: ProjectionExplanationInput,
): void {
  if (!combat) {
    return;
  }

  parts.push(
    `combat ${combat.rangeBracket} ${combat.distance} hexes LOS ${combat.losState}`,
  );
  parts.push(`arc ${combat.firingArc}`);
  appendCombatTargetProjectionExplanation(parts, combat);
  appendCombatWeaponProjectionExplanation(parts, combat);
  appendCombatCoverProjectionExplanation(parts, combat);
  if (combat.minimumRangeReason) {
    parts.push(combat.minimumRangeReason);
  }
  appendCombatC3ProjectionExplanation(parts, combat);
  if (combat.toHitNumber !== undefined) {
    parts.push(
      combat.toHitReason ?? `to-hit target number ${combat.toHitNumber}`,
    );
  }
  if (combat.indirectFireReason) {
    parts.push(combat.indirectFireReason);
  }
}

function appendCombatTargetProjectionExplanation(
  parts: string[],
  combat: ICombatRangeHex,
): void {
  if (combat.hasTarget && combat.targetUnitIds.length > 0) {
    parts.push(`targets ${combat.targetUnitIds.join(',')}`);
  }
  if (combat.targetVisibilityState !== 'none') {
    parts.push(`visibility ${combat.targetVisibilityState}`);
  }
}

function appendCombatWeaponProjectionExplanation(
  parts: string[],
  combat: ICombatRangeHex,
): void {
  if (combat.weaponIdsAvailable.length > 0) {
    parts.push(`weapons ${combat.weaponIdsAvailable.join(',')}`);
    appendCombatWeaponImpactProjectionExplanation(parts, combat);
  } else if (
    combat.weaponIdsInRange.length > 0 ||
    combat.weaponIdsInArc.length > 0
  ) {
    parts.push('weapons none available');
  }

  if (combat.weaponRangeOptions.length > 0) {
    parts.push(
      `weapon options ${combat.weaponRangeOptions
        .map(formatCombatWeaponOption)
        .join(', ')}`,
    );
  }
}

function appendCombatWeaponImpactProjectionExplanation(
  parts: string[],
  combat: ICombatRangeHex,
): void {
  if (!combat.hasTarget) {
    return;
  }

  parts.push(`weapon heat ${formatSignedCost(combat.availableWeaponHeat)}`);
  appendCombatDamageProjectionExplanation(parts, combat);
  const ammoImpacts = formatCombatAmmoImpacts(combat);
  if (ammoImpacts.length > 0) {
    parts.push(`ammo ${ammoImpacts.join(', ')}`);
  }
}

function appendCombatDamageProjectionExplanation(
  parts: string[],
  combat: ICombatRangeHex,
): void {
  if (combat.availableWeaponDamage <= 0) {
    return;
  }

  parts.push(
    `damage ${formatDamageValue(combat.availableWeaponDamage)} listed`,
  );
  if (combat.expectedDamage !== undefined) {
    parts.push(`expected damage ${formatDamageValue(combat.expectedDamage)}`);
  }
}

type AmmoRemainingStyle = 'space' | 'parenthetical';

export function ammoRemainingAfterImpact(
  impact: Pick<ICombatWeaponImpact, 'ammoRemaining' | 'ammoConsumed'>,
): number | undefined {
  if (impact.ammoRemaining === undefined) return undefined;
  return Math.max(0, impact.ammoRemaining - impact.ammoConsumed);
}

export function formatCombatAmmoImpact(
  impact: Pick<
    ICombatWeaponImpact,
    'ammoRemaining' | 'ammoConsumed' | 'weaponName'
  >,
  remainingStyle: AmmoRemainingStyle = 'space',
): string {
  return `${impact.weaponName} ${formatCombatAmmoDelta(
    impact,
    remainingStyle,
  )}`;
}

export function formatCombatAmmoDelta(
  impact: Pick<ICombatWeaponImpact, 'ammoRemaining' | 'ammoConsumed'>,
  remainingStyle: AmmoRemainingStyle = 'space',
): string {
  const remaining = ammoRemainingAfterImpact(impact);
  const remainingLabel =
    remaining === undefined
      ? ''
      : remainingStyle === 'parenthetical'
        ? ` (${remaining} left)`
        : ` ${remaining} left`;
  return `-${impact.ammoConsumed}${remainingLabel}`;
}

function formatCombatAmmoImpacts(combat: ICombatRangeHex): string[] {
  return combat.availableWeaponImpacts
    .filter((impact) => impact.ammoConsumed > 0)
    .map((impact) => formatCombatAmmoImpact(impact));
}

function appendCombatCoverProjectionExplanation(
  parts: string[],
  combat: ICombatRangeHex,
): void {
  if (combat.targetCoverModifier > 0) {
    parts.push(
      combat.targetCoverReason ??
        `cover ${combat.targetCoverLevel} +${combat.targetCoverModifier}`,
    );
  }
}

function appendCombatC3ProjectionExplanation(
  parts: string[],
  combat: ICombatRangeHex,
): void {
  if (!combat.c3BenefitApplied) {
    return;
  }

  const spotter = combat.c3SpotterId ?? 'unknown';
  const spotterRange =
    combat.c3SpotterRange === null || combat.c3SpotterRange === undefined
      ? 'unknown'
      : `${combat.c3SpotterRange}`;
  parts.push(
    `C3 spotter ${spotter} range ${spotterRange} effective ${combat.rangeBracket}`,
  );
}

export function appendCombatLosBlockerProjectionExplanation(
  parts: string[],
  combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[],
): void {
  if (combatLosBlockerFor.length > 0) {
    const targets = combatLosBlockerFor.map(
      (ref) => `${ref.targetHex.q},${ref.targetHex.r}`,
    );
    const reasons = Array.from(
      new Set(combatLosBlockerFor.map((ref) => ref.blocker.reason)),
    );
    parts.push(`LOS blocker for ${targets.join(',')}: ${reasons.join('; ')}`);
  }
}

function formatDamageValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatCombatWeaponOption(option: ICombatWeaponRangeOption): string {
  const arc = option.inArc ? 'in arc' : 'out of arc';
  const environment = option.environmentLegal ? '' : ' environment blocked';
  const minimumRange =
    option.minimumRangePenalty === undefined
      ? ''
      : ` min +${option.minimumRangePenalty}`;
  const toHit =
    option.toHitNumber === undefined ? '' : ` to-hit ${option.toHitNumber}`;
  const expectedDamage =
    option.expectedDamage === undefined
      ? ''
      : ` expected ${formatDamageValue(option.expectedDamage)} damage`;
  const blocked = option.available
    ? 'available'
    : `blocked${option.blockedReason ? `: ${option.blockedReason}` : ''}`;
  return `${option.weaponId} ${option.rangeBracket} range ${arc}${environment}${minimumRange}${toHit}${expectedDamage} ${blocked}`;
}
