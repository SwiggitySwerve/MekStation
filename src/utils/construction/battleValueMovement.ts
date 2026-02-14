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
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

export function calculateTMM(runMP: number, jumpMP: number = 0): number {
  const runTMM = mpToTMM(runMP);
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
  return Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0;
}
