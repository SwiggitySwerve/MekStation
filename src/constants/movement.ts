/** Standard movement brackets shared by construction and combat.
 * See src/utils/construction/BATTLE_VALUE_MOVEMENT.md for caller contracts.
 */
export const TMM_BRACKETS: readonly {
  min: number;
  max: number;
  tmm: number;
}[] = [
  { min: 0, max: 2, tmm: 0 },
  { min: 3, max: 4, tmm: 1 },
  { min: 5, max: 6, tmm: 2 },
  { min: 7, max: 9, tmm: 3 },
  { min: 10, max: 17, tmm: 4 },
  { min: 18, max: 24, tmm: 5 },
  { min: 25, max: Infinity, tmm: 6 },
];

/** Upper-bound BV lookup; NaN retains the historical final-bracket fallback. */
export function getTMMByUpperBound(mp: number): number {
  return (
    TMM_BRACKETS.find((bracket) => mp <= bracket.max)?.tmm ??
    TMM_BRACKETS[TMM_BRACKETS.length - 1].tmm
  );
}
