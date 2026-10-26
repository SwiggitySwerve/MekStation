import { describeHeat, getHeatNote } from '../unitStatStatus';

it.each([
  ['running', 2, 33],
  ['jumping', 5, 36],
] as const)(
  'explains weapon heat and %s heat using the calculated subtotals',
  (movementMode, movementHeat, generated) => {
    const generation = { alphaStrikeHeat: 31, movementHeat, movementMode };
    expect(getHeatNote(generated, 22, generation)?.message).toBe(
      `Heat ${generated} at full fire (31 weapons + ${movementHeat} ${movementMode}) vs 22 dissipation: ${generated - 22} over.`,
    );
    expect(describeHeat(generated, 22, generation)).toContain(
      `31 weapons + ${movementHeat} ${movementMode}`,
    );
  },
);

it('keeps an in-budget build free of heat warnings', () => {
  expect(
    getHeatNote(20, 22, {
      alphaStrikeHeat: 18,
      movementHeat: 2,
      movementMode: 'running',
    }),
  ).toBeNull();
});
