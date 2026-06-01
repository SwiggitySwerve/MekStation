import React from 'react';

import type { ICombatRangeHex, IToHitModifier } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

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
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      data-tactical-projection-source={
        combatProjectionChannel ? 'shared-tactical-map-projection' : undefined
      }
      data-tactical-projection-channel={combatProjectionChannel}
      data-tactical-rules-surface={combatProjectionChannel}
      data-combat-to-hit-number={combatInfo.toHitNumber}
      data-combat-to-hit-modifier-count={modifiers.length}
      data-combat-to-hit-modifier-names={modifierNamesAttribute(modifiers)}
      data-combat-to-hit-modifier-values={modifierValuesAttribute(modifiers)}
      data-combat-to-hit-modifier-sources={modifierSourcesAttribute(modifiers)}
      data-combat-to-hit-modifier-descriptions={modifierDescriptionsAttribute(
        modifiers,
      )}
      data-combat-to-hit-modifier-source-refs={combatSourceRefsAttribute}
      data-combat-to-hit-modifier-rule-refs={combatRuleRefsAttribute}
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
          data-tactical-projection-source={
            combatProjectionChannel
              ? 'shared-tactical-map-projection'
              : undefined
          }
          data-tactical-projection-channel={combatProjectionChannel}
          data-tactical-rules-surface={combatProjectionChannel}
          data-combat-to-hit-modifier-source-refs={combatSourceRefsAttribute}
          data-combat-to-hit-modifier-rule-refs={combatRuleRefsAttribute}
        >
          {modifier.name} {formatSignedModifier(modifier.value)}
        </div>
      ))}
    </div>
  );
}
