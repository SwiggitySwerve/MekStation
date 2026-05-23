import React from 'react';

import type { ICombatRangeHex, IToHitModifier } from '@/types/gameplay';

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

export function CombatToHitModifierRows({
  combatInfo,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly testId: string;
}): React.ReactElement | null {
  const modifiers = combatInfo.toHitModifiers ?? [];
  if (modifiers.length === 0) return null;

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      data-combat-to-hit-number={combatInfo.toHitNumber}
      data-combat-to-hit-modifier-count={modifiers.length}
      data-combat-to-hit-modifier-names={modifierNamesAttribute(modifiers)}
      data-combat-to-hit-modifier-values={modifierValuesAttribute(modifiers)}
      data-combat-to-hit-modifier-sources={modifierSourcesAttribute(modifiers)}
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
        >
          {modifier.name} {formatSignedModifier(modifier.value)}
        </div>
      ))}
    </div>
  );
}
