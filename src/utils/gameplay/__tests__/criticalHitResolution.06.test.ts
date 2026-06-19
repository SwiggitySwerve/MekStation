import {
  DEFAULT_COMPONENT_DAMAGE,
  makeDiceRoller,
  buildDefaultCriticalSlotManifest,
  resolveCriticalHits,
} from './criticalHitResolution.test-helpers';

describe('deterministic behavior', () => {
  it('identical inputs and seeds produce identical outcomes', () => {
    const manifest = buildDefaultCriticalSlotManifest();

    const run = () => {
      const roller = makeDiceRoller([5, 5, 1, 2]); // Roll 10 → 2 crits
      return resolveCriticalHits(
        'unit-1',
        'center_torso',
        manifest,
        DEFAULT_COMPONENT_DAMAGE,
        roller,
      );
    };

    const result1 = run();
    const result2 = run();

    expect(result1.hits.length).toBe(result2.hits.length);
    expect(result1.events.length).toBe(result2.events.length);
    expect(result1.updatedComponentDamage).toEqual(
      result2.updatedComponentDamage,
    );
  });
});
