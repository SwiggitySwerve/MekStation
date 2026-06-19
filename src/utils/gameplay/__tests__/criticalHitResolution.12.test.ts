import {
  ArmorTypeEnum,
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  buildDefaultCriticalSlotManifest,
  processTAC,
} from './criticalHitResolution.test-helpers';

describe('hardened armor TAC prevention', () => {
  it('hardened armor prevents TAC entirely', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    const roller = makeDiceRoller([6, 6, 1]);
    const result = processTAC(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      ArmorTypeEnum.HARDENED,
    );

    expect(result.hits.length).toBe(0);
    expect(result.events.length).toBe(0);
    expect(result.unitDestroyed).toBe(false);
  });

  it('standard armor still processes TAC normally', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Roll 4+4=8 → 1 crit, slot selection: 1
    const roller = makeDiceRoller([4, 4, 1]);
    const result = processTAC(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
      ArmorTypeEnum.STANDARD,
    );

    expect(result.hits.length).toBe(1);
  });

  it('no armorType param processes TAC normally (backward compat)', () => {
    const manifest = buildDefaultCriticalSlotManifest();
    // Roll 4+4=8 → 1 crit, slot selection: 1
    const roller = makeDiceRoller([4, 4, 1]);
    const result = processTAC(
      'unit-1',
      'center_torso',
      manifest,
      DEFAULT_COMPONENT_DAMAGE,
      roller,
    );

    expect(result.hits.length).toBe(1);
  });
});
