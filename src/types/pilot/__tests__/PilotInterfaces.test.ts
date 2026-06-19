import {
  AbilityEffectType,
  getTypedEffectParams,
  type AbilityEffectParams,
} from '@/types/pilot/PilotInterfaces';

describe('getTypedEffectParams', () => {
  const cases: readonly {
    readonly effectType: AbilityEffectType;
    readonly params: AbilityEffectParams;
    readonly expectedType: string;
  }[] = [
    {
      effectType: AbilityEffectType.ToHitModifier,
      params: { modifier: -1 },
      expectedType: 'ToHitModifier',
    },
    {
      effectType: AbilityEffectType.DamageModifier,
      params: { multiplier: 1.5 },
      expectedType: 'DamageModifier',
    },
    {
      effectType: AbilityEffectType.PilotingModifier,
      params: { modifier: -2 },
      expectedType: 'PilotingModifier',
    },
    {
      effectType: AbilityEffectType.TMMModifier,
      params: { modifier: 1 },
      expectedType: 'TMMModifier',
    },
    {
      effectType: AbilityEffectType.ConsciousnessModifier,
      params: { modifier: -1 },
      expectedType: 'ConsciousnessModifier',
    },
    {
      effectType: AbilityEffectType.HeatModifier,
      params: { heatReduction: 2 },
      expectedType: 'HeatModifier',
    },
    {
      effectType: AbilityEffectType.InitiativeModifier,
      params: { modifier: 1 },
      expectedType: 'InitiativeModifier',
    },
    {
      effectType: AbilityEffectType.Special,
      params: { rerollsPerGame: 1 },
      expectedType: 'Special',
    },
  ];

  it.each(cases)(
    'wraps $effectType params as $expectedType',
    ({ effectType, params, expectedType }) => {
      expect(getTypedEffectParams(effectType, params)).toEqual({
        type: expectedType,
        params,
      });
    },
  );

  it('falls back to special params for unknown effect types', () => {
    const params: AbilityEffectParams = { rerollsPerGame: 1 };

    expect(
      getTypedEffectParams('legacy_unknown' as AbilityEffectType, params),
    ).toEqual({
      type: 'Special',
      params,
    });
  });
});
