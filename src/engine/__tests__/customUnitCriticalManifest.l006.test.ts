/**
 * L0-06 (v2.1.0 L0): the saved custom HBK-4G-L0 (Standard Fusion) took side-
 * torso engine crits: interactive sessions fell back to the XL-shaped default
 * manifest, and saved custom units persist null fixed engine/gyro slots.
 *
 * @spec openspec/specs/engine-system/spec.md (Engine Type Classification)
 * @spec openspec/specs/critical-slot-allocation/spec.md (Fixed Component Placement; Side Torso Engine Slots)
 */

import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { gameUnitsWithAdaptedCombatSeeds } from '@/engine/InteractiveSession.setup';
import { hydrateCriticalSlotManifestFromFullUnit } from '@/simulation/runner/UnitHydration';
import { EngineType } from '@/types/construction/EngineType';
import { GameSide } from '@/types/gameplay';
import { buildStructuralCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/manifest';

const slots = (
  manifest: CriticalSlotManifest | undefined,
  location: string,
  type = 'engine',
) =>
  (manifest?.[location] ?? [])
    .filter((slot) => slot.componentType === type)
    .map((slot) => slot.slotIndex);

const nulls = (n: number) => Array<null>(n).fill(null);

/** Persisted `data` of custom-3318c6ef (HBK-4G-L0), trimmed to combat fields. */
function savedHunchback() {
  return {
    id: 'custom-3318c6ef',
    unitType: 'BattleMech',
    techBase: 'INNER_SPHERE',
    tonnage: 50,
    engine: { type: 'FUSION', rating: 200 },
    gyro: { type: 'STANDARD' },
    movement: { walk: 4, jump: 0 },
    criticalSlots: {
      'Right Torso': [...Array<string>(10).fill('AC/20'), null, null],
      'Left Torso': ['AC/20 Ammo', 'AC/20 Ammo', ...nulls(10)],
      'Center Torso': [...nulls(10), 'Heat Sink', null],
      'Left Leg': [...nulls(4), 'Heat Sink', 'Heat Sink'],
    },
  } as unknown as IFullUnit;
}

describe('L0-06 engine crit slots follow the engine type', () => {
  it.each([
    [EngineType.STANDARD, [0, 1, 2, 7, 8, 9], []],
    [EngineType.XL_IS, [0, 1, 2, 7, 8, 9], [0, 1, 2]],
    [EngineType.XL_CLAN, [0, 1, 2, 7, 8, 9], [0, 1]],
    [EngineType.LIGHT, [0, 1, 2, 7, 8, 9], [0, 1]],
    [EngineType.XXL, [0, 1, 2, 7, 8, 9], [0, 1, 2]],
    [EngineType.COMPACT, [0, 1, 2], []],
  ])('%s: CT engine %j, side torso engine %j', (engineType, ct, side) => {
    const manifest = buildStructuralCriticalSlotManifest({ engineType });
    expect(slots(manifest, 'center_torso')).toEqual(ct);
    expect(slots(manifest, 'center_torso', 'gyro')).toEqual([3, 4, 5, 6]);
    expect(slots(manifest, 'left_torso')).toEqual(side);
    expect(slots(manifest, 'right_torso')).toEqual(side);
  });

  it('hydrates the saved Standard Fusion custom mech with CT-only engine slots', () => {
    const manifest = hydrateCriticalSlotManifestFromFullUnit(savedHunchback());
    expect(slots(manifest, 'right_torso')).toEqual([]);
    expect(slots(manifest, 'left_torso')).toEqual([]);
    expect(slots(manifest, 'center_torso')).toEqual([0, 1, 2, 7, 8, 9]);
    expect(slots(manifest, 'left_leg', 'actuator')).toEqual([0, 1, 2, 3]);
    expect(manifest?.right_torso?.map((slot) => slot.componentName)).toEqual(
      Array(10).fill('AC/20'),
    );
    expect(slots(manifest, 'left_torso', 'ammo')).toEqual([0, 1]);
  });

  it('seeds the real manifest into the interactive GameCreated unit', () => {
    const adapted = adaptUnitFromData(savedHunchback(), {
      side: GameSide.Player,
    });
    const [seeded] = gameUnitsWithAdaptedCombatSeeds(
      [
        {
          id: adapted.id,
          name: 'HBK-4G-L0',
          side: GameSide.Player,
          unitRef: adapted.id,
          pilotRef: 'p1',
          gunnery: 4,
          piloting: 5,
        },
      ],
      [adapted],
      [],
    );
    expect(slots(seeded.criticalSlotManifest, 'center_torso')).toEqual([
      0, 1, 2, 7, 8, 9,
    ]);
    expect(slots(seeded.criticalSlotManifest, 'right_torso')).toEqual([]);
  });
});
