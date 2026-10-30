import { TMM_BRACKETS } from '@/constants/movement';

export const SPEED_FACTORS: Record<number, number> = {
  0: 1.0,
  1: 1.1,
  2: 1.2,
  3: 1.3,
  4: 1.4,
  5: 1.5,
  6: 1.6,
  7: 1.7,
  8: 1.8,
  9: 1.9,
  10: 2.0,
};

function mpToTMM(mp: number): number {
  // Construction historically uses upper bounds only, including its NaN fallback.
  return (
    TMM_BRACKETS.find((bracket) => mp <= bracket.max)?.tmm ??
    TMM_BRACKETS[TMM_BRACKETS.length - 1].tmm
  );
}

export function calculateTMM(
  runMP: number,
  jumpMP: number = 0,
  runningBonus: number = 0,
): number {
  const runTMM = mpToTMM(runMP) + runningBonus;
  const jumpTMM = jumpMP > 0 ? mpToTMM(jumpMP) + 1 : 0;
  return Math.max(runTMM, jumpTMM);
}

export function calculateSpeedFactor(
  walkMP: number,
  runMP: number,
  jumpMP: number = 0,
): number {
  const tmm = calculateTMM(runMP, jumpMP);
  const baseFactor = SPEED_FACTORS[tmm] ?? 1.0;

  if (jumpMP > walkMP) {
    const jumpBonus = Math.min(0.5, (jumpMP - walkMP) * 0.1);
    return Math.min(2.24, baseFactor + jumpBonus);
  }

  return baseFactor;
}

export function calculateOffensiveSpeedFactor(
  runMP: number,
  jumpMP: number = 0,
  umuMP: number = 0,
): number {
  const mp = runMP + Math.round(Math.max(jumpMP, umuMP) / 2.0);
  return calculateOffensiveSpeedFactorForMP(mp);
}

/** Apply the shared exponent and rounding after the caller selects effective MP. */
export function calculateOffensiveSpeedFactorForMP(mp: number): number {
  return Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0;
}
