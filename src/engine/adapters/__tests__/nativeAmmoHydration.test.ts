import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { hydrateAmmoStateFromFullUnit } from '@/simulation/runner/UnitHydrationAmmo';
import { GameSide, GameEventType } from '@/types/gameplay';
import { resolveNativeAmmoBin } from '@/utils/construction/battleValueAmmo';
import { getTotalAmmo } from '@/utils/gameplay/ammoTracking';
import { deriveState } from '@/utils/gameplay/gameState';

const catalog = getNodeCanonicalUnitService();
function load(ref: string): IFullUnit {
  const unit = catalog.getByIdSync(ref);
  if (!unit) throw new Error(`Missing fixture ${ref}`);
  return unit;
}

it.each([
  ['vehicles:scorpion-light-tank', [20, 100]],
  ['aerospace:riever-f-100b', [5, 5, 12, 12, 20, 20]],
] as const)('seeds the physical Java bins for %s', (ref, expected) => {
  const unit = adaptUnitFromData(load(ref));
  expect(
    Object.values(unit.ammoState ?? {})
      .map((bin) => bin.remainingRounds)
      .sort((a, b) => a - b),
  ).toEqual(expected);
  expect(unit.ammoConstruction).toHaveLength(expected.length);
  expect(
    unit.ammoConstruction?.map((bin) => bin.maxRounds).sort((a, b) => a - b),
  ).toEqual(expected);
});

it('uses a native bin shot override once and keeps duplicate mounts distinct', () => {
  const source = load('vehicles:scorpion-light-tank');
  const unit = {
    ...source,
    equipment: [
      { id: 'is-ammo-ac-5:7', location: 'BODY' },
      { id: 'is-ammo-ac-5:7', location: 'BODY' },
      { id: 'is-machine-gun-ammo-half', location: 'BODY' },
    ],
  };
  const bins = Object.values(hydrateAmmoStateFromFullUnit(unit) ?? {});
  expect(bins.map((bin) => bin.maxRounds)).toEqual([7, 7, 100]);
  expect(new Set(bins.map((bin) => bin.binId)).size).toBe(3);
  expect(bins.every((bin) => bin.location === 'body')).toBe(true);
  expect(
    getTotalAmmo(
      Object.fromEntries(bins.map((bin) => [bin.binId, bin])),
      'AC/5',
    ),
  ).toBe(14);
});

it('uses physical half-bin capacity and retains empty bin shot overrides', () => {
  expect(resolveNativeAmmoBin('is-machine-gun-ammo-half')).toEqual({
    ammoId: 'mg-ammo-half',
    shots: 100,
  });
  expect(resolveNativeAmmoBin('is-ammo-ac-5:0:OMNI')).toEqual({
    ammoId: 'ac-5-ammo',
    shots: 0,
  });
  expect(resolveNativeAmmoBin('ac-5')).toBeUndefined();
  expect(resolveNativeAmmoBin('clan-lb-10-x-ac')).toBeUndefined();
  expect(resolveNativeAmmoBin('missing-ammo:7')).toBeUndefined();
  expect(resolveNativeAmmoBin('is-ammo-ac-5:9007199254740992')).toBeUndefined();
});

it('resolves a native display name through the physical alias owner', () => {
  const source = load('vehicles:scorpion-light-tank');
  const bins =
    hydrateAmmoStateFromFullUnit({
      ...source,
      equipment: [
        {
          id: 'is-ammo-lrm-15-artemis-capable',
          name: 'IS Ammo LRM-15 Artemis-capable',
          location: 'BODY',
        },
      ],
    }) ?? {};
  expect(Object.values(bins).map((bin) => bin.maxRounds)).toEqual([8]);
  expect(getTotalAmmo(bins, 'LRM 15')).toBe(8);
});

it.each(['cl-machine-gun-ammo-half', 'clmachinegunammo-half'])(
  'keeps %s Clan-compatible on mixed-tech units without merging IS ammunition',
  (id) => {
    const source = load('vehicles:scorpion-light-tank');
    const bins =
      hydrateAmmoStateFromFullUnit({
        ...source,
        techBase: 'MIXED',
        equipment: [
          { id, name: 'CLMachine Gun Ammo - Half', location: 'BODY' },
        ],
      }) ?? {};
    expect(getTotalAmmo(bins, 'clan-machine-gun')).toBe(100);
    expect(getTotalAmmo(bins, 'machine-gun')).toBe(0);
  },
);

it('preserves the native Clan family for imported ammo rows without compatibility metadata', () => {
  const adapted = adaptUnitFromData(load('aerospace:avar-a'));
  expect(getTotalAmmo(adapted.ammoState ?? {}, 'clan-lrm-20')).toBe(12);
  expect(getTotalAmmo(adapted.ammoState ?? {}, 'lrm-20')).toBe(0);
  expect(Object.values(adapted.ammo)).toContain(12);
});

it('selects the source rack when a catalog ammo row lists multiple compatible weapons', () => {
  const source = load('vehicles:scorpion-light-tank');
  const bins =
    hydrateAmmoStateFromFullUnit(
      { ...source, equipment: [{ id: 'is-ammo-lrm-15', location: 'BODY' }] },
      () => ({
        id: 'lrm-15-ammo',
        name: 'LRM 15 Ammo',
        shotsPerTon: 8,
        isExplosive: true,
        compatibleWeaponIds: ['lrm-5', 'lrm-15', 'clan-lrm-15'],
      }),
    ) ?? {};
  expect(getTotalAmmo(bins, 'LRM 15')).toBe(8);
  expect(getTotalAmmo(bins, 'LRM 5')).toBe(0);
});

it('keeps the Mech critical-slot path even with native-looking equipment rows', () => {
  const source = load('atlas-as7-d');
  const bins = hydrateAmmoStateFromFullUnit(source) ?? {};
  expect(Object.keys(bins)).toEqual([
    'left_torso-8-ammo-lrm-20',
    'left_torso-9-ammo-lrm-20',
    'left_torso-10-ammo-srm-6',
    'right_torso-10-ac-20-ammo',
    'right_torso-11-ac-20-ammo',
  ]);
  expect(Object.values(bins).map((bin) => bin.maxRounds)).toEqual([
    6, 6, 15, 5, 5,
  ]);
  expect(hydrateAmmoStateFromFullUnit({ ...source, equipment: [] })).toEqual(
    hydrateAmmoStateFromFullUnit(source),
  );
});

it.each(['vehicles:scorpion-light-tank', 'aerospace:riever-f-100b'])(
  'consumes hydrated %s ammunition in GameEngine and agrees with serialized replay',
  (ref) => {
    const source = load(ref);
    const units = [GameSide.Player, GameSide.Opponent].map((side) =>
      adaptUnitFromData({ ...source, id: side }, { side }),
    );
    const session = new GameEngine({
      seed: 123,
      mapRadius: 3,
      turnLimit: 8,
    }).runToCompletion(
      [units[0]],
      [units[1]],
      units.map((unit) => ({
        id: unit.id,
        name: unit.id,
        side: unit.side,
        unitRef: ref,
        pilotRef: unit.id + '-pilot',
        gunnery: 0,
        piloting: 5,
      })),
    );
    expect(session.events.at(-1)?.type).toBe(GameEventType.GameEnded);
    expect(
      session.events.some((event) => event.type === GameEventType.AmmoConsumed),
    ).toBe(true);
    expect(
      Object.values(session.currentState.units).some((unit) =>
        Object.values(unit.ammoState ?? {}).some(
          (bin) => bin.remainingRounds < bin.maxRounds,
        ),
      ),
    ).toBe(true);
    expect(
      deriveState(session.id, JSON.parse(JSON.stringify(session.events))),
    ).toEqual(session.currentState);
  },
);
