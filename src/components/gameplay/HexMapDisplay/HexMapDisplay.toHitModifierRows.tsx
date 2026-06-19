import React from 'react';

import type { ICombatRangeHex, IToHitModifier } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  combatProjectionSourceMetadata,
  tacticalProjectionDataAttributes,
} from './HexMapDisplay.tacticalProjectionAttributes';

function formatSignedModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function modifierNamesAttribute(
  modifiers: readonly IToHitModifier[],
): string | undefined {
  return modifiers.length > 0
    ? modifiers.map((modifier) => modifier.name).join('|')
    : undefined;
}

function modifierValuesAttribute(
  modifiers: readonly IToHitModifier[],
): string | undefined {
  return modifiers.length > 0
    ? modifiers.map((modifier) => `${modifier.value}`).join('|')
    : undefined;
}

function modifierSourcesAttribute(
  modifiers: readonly IToHitModifier[],
): string | undefined {
  return modifiers.length > 0
    ? modifiers.map((modifier) => modifier.source).join('|')
    : undefined;
}

function modifierDescriptionsAttribute(
  modifiers: readonly IToHitModifier[],
): string | undefined {
  const descriptions = modifiers.map((modifier) => modifier.description ?? '');
  return descriptions.some((description) => description.length > 0)
    ? descriptions.join('|')
    : undefined;
}

export function CombatToHitModifierRows({
  combatInfo,
  projection,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  const modifiers = combatInfo.toHitModifiers ?? [];
  if (modifiers.length === 0) return null;

  const source = combatProjectionSourceMetadata(projection?.sourceReferences);
  const projectionAttributes = tacticalProjectionDataAttributes(source);

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      {...projectionAttributes}
      data-combat-to-hit-number={combatInfo.toHitNumber}
      data-combat-to-hit-modifier-count={modifiers.length}
      data-combat-to-hit-modifier-names={modifierNamesAttribute(modifiers)}
      data-combat-to-hit-modifier-values={modifierValuesAttribute(modifiers)}
      data-combat-to-hit-modifier-sources={modifierSourcesAttribute(modifiers)}
      data-combat-to-hit-modifier-descriptions={modifierDescriptionsAttribute(
        modifiers,
      )}
      data-combat-to-hit-modifier-source-refs={source.sourceRefs}
      data-combat-to-hit-modifier-rule-refs={source.ruleRefs}
    >
      <div data-testid={`${testId}-title`}>
        To-hit modifiers
        {combatInfo.toHitNumber !== undefined
          ? ` TN${combatInfo.toHitNumber}`
          : ''}
        :
      </div>
      {modifiers.map((modifier, index) => (
        <div
          key={`${modifier.name}-${modifier.source}-${index}`}
          data-testid={`${testId}-modifier-${index}`}
          data-combat-to-hit-modifier-name={modifier.name}
          data-combat-to-hit-modifier-value={modifier.value}
          data-combat-to-hit-modifier-source={modifier.source}
          data-combat-to-hit-modifier-description={modifier.description}
          {...projectionAttributes}
          data-combat-to-hit-modifier-source-refs={source.sourceRefs}
          data-combat-to-hit-modifier-rule-refs={source.ruleRefs}
        >
          {modifier.name} {formatSignedModifier(modifier.value)}
        </div>
      ))}
    </div>
  );
}
