import {
  getHeatThresholdTransition,
  getHeatTransitionFromPayload,
  getHeatVisualMap,
  isAmmoExplosionDangerHeat,
} from '../heatVisualMap';

describe('heatVisualMap', () => {
  it.each([
    [0, 'normal', '#94a3b8', false, null],
    [4, 'normal', '#94a3b8', false, null],
    [5, 'warm', '#f59e0b', false, null],
    [9, 'warm', '#f59e0b', false, null],
    [10, 'hot', '#f97316', false, 'HOT'],
    [14, 'hot', '#f97316', false, 'HOT'],
    [15, 'overheat', '#dc2626', false, 'OVERHEAT'],
    [19, 'overheat', '#dc2626', false, 'OVERHEAT'],
    [20, 'critical', '#fff1f2', true, 'CRITICAL'],
    [30, 'critical', '#fff1f2', true, 'CRITICAL'],
  ] as const)('maps heat %i to %s', (heat, threshold, color, pulse, badge) => {
    expect(getHeatVisualMap(heat)).toMatchObject({
      threshold,
      color,
      pulse,
      badge,
    });
  });

  it('keeps intensity monotonic across threshold starts', () => {
    const intensities = [0, 5, 10, 15, 20].map(
      (heat) => getHeatVisualMap(heat).intensity,
    );

    expect(intensities).toEqual([...intensities].sort((a, b) => a - b));
  });

  it('normalizes invalid or negative heat to neutral', () => {
    expect(getHeatVisualMap(-3).threshold).toBe('normal');
    expect(getHeatVisualMap(Number.NaN).threshold).toBe('normal');
  });

  it('marks ammo explosion danger heat from existing heat rules', () => {
    expect(isAmmoExplosionDangerHeat(18)).toBe(false);
    expect(isAmmoExplosionDangerHeat(19)).toBe(true);
    expect(isAmmoExplosionDangerHeat(30)).toBe(true);
  });

  it('derives threshold transitions from heat totals', () => {
    expect(getHeatThresholdTransition(9, 20)).toEqual({
      previousHeat: 9,
      currentHeat: 20,
      previousThreshold: 'warm',
      currentThreshold: 'critical',
      ammoExplosionRisk: true,
    });
  });

  it('honors threshold metadata already present on heat events', () => {
    expect(
      getHeatTransitionFromPayload({
        previousTotal: 4,
        newTotal: 16,
        previousThreshold: 'normal',
        currentThreshold: 'overheat',
        ammoExplosionRisk: false,
      }),
    ).toEqual({
      previousHeat: 4,
      currentHeat: 16,
      previousThreshold: 'normal',
      currentThreshold: 'overheat',
      ammoExplosionRisk: false,
    });
  });
});
