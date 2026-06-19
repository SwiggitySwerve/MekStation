import React from 'react';

import type {
  ICombatRangeHex,
  ICombatWeaponRangeOption,
} from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  combatProjectionSourceMetadata,
  tacticalProjectionDataAttributes,
} from './HexMapDisplay.tacticalProjectionAttributes';

function formatRangeLabel(option: ICombatWeaponRangeOption): string {
  return option.rangeBracket.replace(/_/g, ' ');
}

function formatRangeState(option: ICombatWeaponRangeOption): string {
  const label = formatRangeLabel(option);
  return option.inRange ? `${label} range` : label;
}

function formatArcLabel(option: ICombatWeaponRangeOption): string {
  return option.inArc ? 'in arc' : 'out of arc';
}

function formatEnvironmentLabel(option: ICombatWeaponRangeOption): string {
  return option.environmentLegal ? '' : '; environment blocked';
}

function formatMinimumRangeLabel(option: ICombatWeaponRangeOption): string {
  return option.minimumRangePenalty === undefined
    ? ''
    : `; minimum +${option.minimumRangePenalty}`;
}

function formatToHitLabel(option: ICombatWeaponRangeOption): string {
  return option.toHitNumber === undefined ? '' : `; TN ${option.toHitNumber}`;
}

function formatDamageValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatExpectedDamageLabel(option: ICombatWeaponRangeOption): string {
  return option.expectedDamage === undefined
    ? ''
    : `; expected ${formatDamageValue(option.expectedDamage)} damage`;
}

function formatAvailabilityLabel(option: ICombatWeaponRangeOption): string {
  const status = option.available ? 'available' : 'blocked';
  const reason = option.blockedReason ? ` - ${option.blockedReason}` : '';
  return `${status}${reason}`;
}

function formatWeaponOption(option: ICombatWeaponRangeOption): string {
  return `${option.weaponId}: ${formatRangeState(option)}, ${formatArcLabel(
    option,
  )}${formatEnvironmentLabel(option)}${formatMinimumRangeLabel(
    option,
  )}${formatToHitLabel(option)}${formatExpectedDamageLabel(
    option,
  )}; ${formatAvailabilityLabel(option)}`;
}

function optionTestIdSuffix(
  option: ICombatWeaponRangeOption,
  index: number,
): string {
  return `${option.weaponId.replace(/[^A-Za-z0-9_-]/g, '-')}-${index}`;
}

export function CombatWeaponOptionRows({
  combatInfo,
  projection,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  if (combatInfo.weaponRangeOptions.length === 0) return null;

  const source = combatProjectionSourceMetadata(projection?.sourceReferences);
  const projectionAttributes = tacticalProjectionDataAttributes(source);

  return (
    <div
      data-testid={testId}
      {...projectionAttributes}
      data-combat-weapon-option-source-refs={source.sourceRefs}
      data-combat-weapon-option-rule-refs={source.ruleRefs}
    >
      Weapon options:{' '}
      {combatInfo.weaponRangeOptions.map((option, index) => (
        <React.Fragment key={`${option.weaponId}-${index}`}>
          {index > 0 ? '; ' : ''}
          <span
            data-testid={`${testId}-option-${optionTestIdSuffix(
              option,
              index,
            )}`}
            {...projectionAttributes}
            data-combat-weapon-option-source-refs={source.sourceRefs}
            data-combat-weapon-option-rule-refs={source.ruleRefs}
            data-combat-weapon-option-id={option.weaponId}
            data-combat-weapon-option-range={option.rangeBracket}
            data-combat-weapon-option-arc-state={
              option.inArc ? 'in-arc' : 'out-of-arc'
            }
            data-combat-weapon-option-availability={
              option.available ? 'available' : 'blocked'
            }
            data-combat-weapon-option-blocked-reason={option.blockedReason}
          >
            {formatWeaponOption(option)}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
