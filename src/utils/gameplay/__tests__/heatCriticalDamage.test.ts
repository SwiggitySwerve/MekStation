import { buildDefaultCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import { buildDefaultComponentDamageState } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';
import {
  getMaxTechHeatCriticalLocation,
  resolveMaxTechHeatCriticalDamage,
} from '@/utils/gameplay/heatCriticalDamage';

describe('MaxTech heat critical damage', () => {
  it('maps MegaMek random Mek location indexes to BattleMech locations', () => {
    expect(getMaxTechHeatCriticalLocation(0)).toBe('head');
    expect(getMaxTechHeatCriticalLocation(1)).toBe('center_torso');
    expect(getMaxTechHeatCriticalLocation(2)).toBe('right_torso');
    expect(getMaxTechHeatCriticalLocation(3)).toBe('left_torso');
    expect(getMaxTechHeatCriticalLocation(4)).toBe('right_arm');
    expect(getMaxTechHeatCriticalLocation(5)).toBe('left_arm');
    expect(getMaxTechHeatCriticalLocation(6)).toBe('right_leg');
    expect(getMaxTechHeatCriticalLocation(7)).toBe('left_leg');
  });

  it('routes failed optional MaxTech heat critical checks through one forced critical slot', () => {
    const dice = [3, 3, 1];
    const d6Roller = () => dice.shift() ?? 1;

    const result = resolveMaxTechHeatCriticalDamage({
      unitId: 'player-1',
      heat: 36,
      manifest: buildDefaultCriticalSlotManifest(),
      componentDamage: buildDefaultComponentDamageState(),
      d6Roller,
      locationIndexRoller: () => 2,
    });

    expect(result).toMatchObject({
      targetNumber: 8,
      roll: 6,
      applied: true,
      location: 'right_torso',
      updatedComponentDamage: { engineHits: 1 },
    });
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'critical_hit_resolved',
          payload: expect.objectContaining({
            unitId: 'player-1',
            location: 'right_torso',
            componentType: 'engine',
          }),
        }),
      ]),
    );
  });

  it('applies Hot Dog target-number relief to the optional critical avoid roll', () => {
    const dice = [3, 4];
    const d6Roller = () => dice.shift() ?? 1;

    const result = resolveMaxTechHeatCriticalDamage({
      unitId: 'player-1',
      heat: 36,
      manifest: buildDefaultCriticalSlotManifest(),
      componentDamage: buildDefaultComponentDamageState(),
      d6Roller,
      locationIndexRoller: () => 2,
      targetNumberModifier: -1,
    });

    expect(result).toMatchObject({
      targetNumber: 7,
      roll: 7,
      applied: false,
      updatedComponentDamage: { engineHits: 0 },
    });
    expect(result.events).toHaveLength(0);
  });
});
