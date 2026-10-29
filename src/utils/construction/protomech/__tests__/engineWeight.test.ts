import { computeProtoEngineWeight } from '@/utils/construction/protomech';

describe('ProtoMech engine mass consolidation', () => {
  it.each([
    [0, 0, 0],
    [1, 0.025, 0.5],
    [21, 0.525, 1],
    [40, 1, 1],
    [45, 1.125, 1.5],
    [-4, -0.1, -0],
    [500, 12.5, 12.5],
  ])('preserves both former policies for rating %s', (rating, raw, rounded) => {
    expect(computeProtoEngineWeight(rating, 'unrounded')).toBe(raw);
    expect(computeProtoEngineWeight(rating)).toBe(rounded);
  });
});
