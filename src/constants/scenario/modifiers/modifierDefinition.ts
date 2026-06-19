import type { IBattleModifier } from '@/types/scenario';

type BattleModifierDefinition = Omit<IBattleModifier, 'description'> & {
  readonly descriptionParts: readonly string[];
};

export function defineBattleModifier(
  definition: BattleModifierDefinition,
): IBattleModifier {
  const { descriptionParts, ...modifier } = definition;
  return {
    ...modifier,
    description: descriptionParts.join(' '),
  };
}
