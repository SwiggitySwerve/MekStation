import React from 'react';

import type { ICombatRangeHex, ICombatWeaponImpact } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  ammoRemainingAfterImpact,
  formatCombatAmmoDelta,
} from '@/utils/gameplay/tacticalMapProjection.combatExplanation';

import {
  combatProjectionSourceMetadata,
  tacticalProjectionDataAttributes,
} from './HexMapDisplay.tacticalProjectionAttributes';

function formatDamageValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatWeaponImpact(impact: ICombatWeaponImpact): string {
  const ammo =
    impact.ammoConsumed > 0
      ? `, ammo ${formatCombatAmmoDelta(impact, 'parenthetical')}`
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
  const source = combatProjectionSourceMetadata(projection?.sourceReferences);
  const projectionAttributes = tacticalProjectionDataAttributes(source);

  return (
    <div
      data-testid={testId}
      {...projectionAttributes}
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
      data-combat-weapon-impact-source-refs={source.sourceRefs}
      data-combat-weapon-impact-rule-refs={source.ruleRefs}
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
            {...projectionAttributes}
            data-combat-weapon-impact-source-refs={source.sourceRefs}
            data-combat-weapon-impact-rule-refs={source.ruleRefs}
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
