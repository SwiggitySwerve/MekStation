import React from 'react';

import type { ICombatRangeHex, ICombatWeaponImpact } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

function formatDamageValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function ammoRemainingAfterImpact(
  impact: ICombatWeaponImpact,
): number | undefined {
  if (impact.ammoRemaining === undefined) return undefined;
  return Math.max(0, impact.ammoRemaining - impact.ammoConsumed);
}

function formatWeaponImpact(impact: ICombatWeaponImpact): string {
  const ammoRemainingAfter = ammoRemainingAfterImpact(impact);
  const ammo =
    impact.ammoConsumed > 0
      ? `, ammo -${impact.ammoConsumed}${
          ammoRemainingAfter === undefined
            ? ''
            : ` (${ammoRemainingAfter} left)`
        }`
      : '';
  return `${impact.weaponName}: +${impact.heat} heat, ${formatDamageValue(
    impact.damage,
  )} damage${ammo}`;
}

function joinedImpactAttribute(
  impacts: readonly ICombatWeaponImpact[],
  readValue: (impact: ICombatWeaponImpact) => string | number | undefined,
): string | undefined {
  if (impacts.length === 0) return undefined;
  const values = impacts.map(readValue);
  return values.some((value) => value !== undefined)
    ? values.map((value) => value ?? '').join('|')
    : undefined;
}

function impactTestIdSuffix(
  impact: ICombatWeaponImpact,
  index: number,
): string {
  return `${impact.weaponId.replace(/[^A-Za-z0-9_-]/g, '-')}-${index}`;
}

export function CombatWeaponImpactRows({
  combatInfo,
  projection,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  if (!combatInfo.hasTarget || combatInfo.availableWeaponImpacts.length === 0) {
    return null;
  }

  const impacts = combatInfo.availableWeaponImpacts;
  const combatSourceReferences =
    projection?.sourceReferences.filter(
      (source) => source.channel === 'combat',
    ) ?? [];
  const combatSourceRefsAttribute =
    formatTacticalProjectionSourceReferences(combatSourceReferences) ||
    undefined;
  const combatRuleRefsAttribute =
    formatTacticalProjectionRuleReferences(combatSourceReferences) || undefined;
  const combatProjectionChannel =
    combatSourceReferences.length > 0 ? 'combat' : undefined;

  return (
    <div
      data-testid={testId}
      data-tactical-projection-source={
        combatProjectionChannel ? 'shared-tactical-map-projection' : undefined
      }
      data-tactical-projection-channel={combatProjectionChannel}
      data-tactical-rules-surface={combatProjectionChannel}
      data-combat-weapon-impact-ids={joinedImpactAttribute(
        impacts,
        (impact) => impact.weaponId,
      )}
      data-combat-weapon-impact-names={joinedImpactAttribute(
        impacts,
        (impact) => impact.weaponName,
      )}
      data-combat-weapon-impact-heats={joinedImpactAttribute(
        impacts,
        (impact) => impact.heat,
      )}
      data-combat-weapon-impact-damages={joinedImpactAttribute(
        impacts,
        (impact) => impact.damage,
      )}
      data-combat-weapon-impact-ammo-consumed={joinedImpactAttribute(
        impacts,
        (impact) => impact.ammoConsumed,
      )}
      data-combat-weapon-impact-ammo-remaining-after={joinedImpactAttribute(
        impacts,
        ammoRemainingAfterImpact,
      )}
      data-combat-weapon-impact-source-refs={combatSourceRefsAttribute}
      data-combat-weapon-impact-rule-refs={combatRuleRefsAttribute}
    >
      Weapon impact detail:{' '}
      {impacts.map((impact, index) => (
        <React.Fragment key={`${impact.weaponId}-${index}`}>
          {index > 0 ? '; ' : ''}
          <span
            data-testid={`${testId}-impact-${impactTestIdSuffix(
              impact,
              index,
            )}`}
            data-tactical-projection-source={
              combatProjectionChannel
                ? 'shared-tactical-map-projection'
                : undefined
            }
            data-tactical-projection-channel={combatProjectionChannel}
            data-tactical-rules-surface={combatProjectionChannel}
            data-combat-weapon-impact-source-refs={combatSourceRefsAttribute}
            data-combat-weapon-impact-rule-refs={combatRuleRefsAttribute}
            data-combat-weapon-impact-id={impact.weaponId}
            data-combat-weapon-impact-name={impact.weaponName}
            data-combat-weapon-impact-heat={impact.heat}
            data-combat-weapon-impact-damage={impact.damage}
            data-combat-weapon-impact-ammo-consumed={impact.ammoConsumed}
            data-combat-weapon-impact-ammo-remaining-after={ammoRemainingAfterImpact(
              impact,
            )}
          >
            {formatWeaponImpact(impact)}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
