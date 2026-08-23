/**
 * Packaging scorecard for the game-agnostic kernel.
 *
 * Rung 0 prove-with-toy-plugin, Rung 1 internal module (current),
 * Rung 2 workspace package, Rung 3 published library.
 * Do not open packages/ until a real second consumer exists.
 */

export const KERNEL_PACKAGING_RUNGS = [
  'prove-in-repo',
  'internal-module',
  'workspace-package',
  'published-library',
] as const;

export type KernelPackagingRung = (typeof KERNEL_PACKAGING_RUNGS)[number];

/** Current honest packaging level. Not a workspace or published package. */
export const KERNEL_PACKAGING_RUNG: KernelPackagingRung = 'internal-module';

export const KERNEL_SCORECARD_DIMENSIONS = [
  'secondConsumer',
  'apiFreezeRisk',
  'consistencyIsolated',
  'dependencyDirection',
  'abstractCases',
  'campBlast',
] as const;

export type KernelScorecardDimension =
  (typeof KERNEL_SCORECARD_DIMENSIONS)[number];

export type KernelScorecardScores = Readonly<
  Record<KernelScorecardDimension, 0 | 1 | 2>
>;

/**
 * Snapshot at kernel introduction. Re-score before any packages/ move.
 * Second consumer stays 0 until another game or executable imports this
 * module; the toy plugin counts for design, not packaging.
 */
export const KERNEL_SCORECARD_AT_INTRODUCTION: KernelScorecardScores = {
  secondConsumer: 0,
  apiFreezeRisk: 1,
  consistencyIsolated: 2,
  dependencyDirection: 2,
  abstractCases: 2,
  campBlast: 2,
};

export function sumKernelScorecard(scores: KernelScorecardScores): number {
  return KERNEL_SCORECARD_DIMENSIONS.reduce(
    (total, dimension) => total + scores[dimension],
    0,
  );
}

export function recommendedKernelPackagingRung(
  scores: KernelScorecardScores,
): KernelPackagingRung {
  const total = sumKernelScorecard(scores);
  if (total >= 10 && scores.secondConsumer === 2) {
    return 'published-library';
  }
  if (total >= 7 && scores.secondConsumer >= 1) {
    return 'workspace-package';
  }
  if (total <= 6) {
    return 'prove-in-repo';
  }
  return 'internal-module';
}
