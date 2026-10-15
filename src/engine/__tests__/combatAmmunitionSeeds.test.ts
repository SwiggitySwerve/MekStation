import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IGameUnit } from '@/types/gameplay';

import { hydrateAmmoStateFromFullUnit } from '@/simulation/runner/UnitHydrationAmmo';
import { GameEventType, GameSide } from '@/types/gameplay';
import { consumeAmmo, getTotalAmmo } from '@/utils/gameplay/ammoTracking';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { createInitialUnitState } from '@/utils/gameplay/gameState/initialization';

import shadowHawk from '../../../public/data/units/battlemechs/1-age-of-war/standard/Shadow Hawk SHD-2H.json';
import warhammer from '../../../public/data/units/battlemechs/1-age-of-war/standard/Warhammer WHM-6R.json';
import { adaptUnit, adaptUnitFromData } from '../adapters/CompendiumAdapter';
import { GameEngine } from '../GameEngine';
import { gameUnitsWithAdaptedCombatSeeds } from '../InteractiveSession.setup';
import nightWatch from './fixtures/warhammer-night-watch.json';

function catalogInput(
  definition: typeof shadowHawk | typeof warhammer,
): IFullUnit {
  const { armor, structure, ...unit } = definition;
  // The legacy catalog interface types armor as a flat map, unlike the JSON.
  const full: IFullUnit = { ...unit, variant: unit.model };
  return Object.assign(full, { armor, structure });
}

function metadata(id: string, side = GameSide.Player): IGameUnit {
  return {
    id,
    name: id,
    unitRef: id,
    pilotRef: 'pilot',
    side,
    gunnery: 4,
    piloting: 5,
  };
}

it('seeds real Shadow Hawk bins through launch with runtime weapon inventory', () => {
  const adapted = adaptUnitFromData(catalogInput(shadowHawk));
  const [seeded] = gameUnitsWithAdaptedCombatSeeds(
    [metadata(adapted.id)],
    [adapted],
    [],
  );
  const state = createInitialUnitState(seeded, { q: 0, r: 0 });
  for (const [name, rounds] of [
    ['AC/5', 20],
    ['LRM 5', 24],
    ['SRM 2', 50],
  ] as const) {
    expect(getTotalAmmo(state.ammoState ?? {}, name)).toBe(rounds);
    const weapon = adapted.weapons.find((item) => item.name === name);
    expect(weapon).toBeDefined();
    if (weapon) expect(adapted.ammo[weapon.id]).toBe(rounds);
  }
});

it('seeds the canonical Warhammer full bin once for its two MG mounts', () => {
  const adapted = adaptUnitFromData(catalogInput(warhammer));
  const [seeded] = gameUnitsWithAdaptedCombatSeeds(
    [metadata(adapted.id)],
    [adapted],
    [],
  );
  const state = createInitialUnitState(seeded, { q: 0, r: 0 });
  expect(getTotalAmmo(state.ammoState ?? {}, 'Machine Gun')).toBe(200);
  expect(
    Object.values(state.ammoState ?? {}).filter(
      (bin) => bin.weaponType === 'machine-gun',
    ),
  ).toHaveLength(1);
});

it('launches the saved construction with SRM ammunition and zero invented MG rounds', async () => {
  const id = 'custom-night-watch-ammo';
  const adapted = await adaptUnit(id, {}, () => ({ ...nightWatch, id }));
  expect(adapted).not.toBeNull();
  if (!adapted) return;
  const [seeded] = gameUnitsWithAdaptedCombatSeeds(
    [metadata(id)],
    [adapted],
    [],
  );
  const state = createInitialUnitState(seeded, { q: 0, r: 0 });
  expect(getTotalAmmo(state.ammoState ?? {}, 'SRM 6')).toBe(15);
  expect(getTotalAmmo(state.ammoState ?? {}, 'Machine Gun')).toBe(0);
  for (const weapon of adapted.weapons.filter(
    (item) => item.name === 'Machine Gun',
  )) {
    expect(adapted.ammo[weapon.id]).toBe(0);
  }
});

it('records ammunition consumption and resolved ammunition-fed attacks in an early complete battle', () => {
  const player = adaptUnitFromData(catalogInput(shadowHawk));
  const opponent = adaptUnitFromData(catalogInput(warhammer), {
    side: GameSide.Opponent,
  });
  const result = new GameEngine({
    mapRadius: 3,
    turnLimit: 3,
    seed: 17,
  }).runToCompletion(
    [player],
    [opponent],
    [metadata(player.id), metadata(opponent.id, GameSide.Opponent)],
  );
  expect(
    result.events.some((event) => event.type === GameEventType.AmmoConsumed),
  ).toBe(true);
  expect(
    result.events.some(
      (event) =>
        event.type === GameEventType.AttackResolved &&
        'ammoBinId' in event.payload &&
        typeof event.payload.ammoBinId === 'string',
    ),
  ).toBe(true);
  const consumed = result.events.find(
    (event) => event.type === GameEventType.AmmoConsumed,
  );
  expect(consumed).toBeDefined();
  if (
    !consumed ||
    !('unitId' in consumed.payload) ||
    !('binId' in consumed.payload) ||
    !('roundsRemaining' in consumed.payload) ||
    typeof consumed.payload.binId !== 'string' ||
    typeof consumed.payload.unitId !== 'string'
  )
    return;
  const before = hydrateGameSessionFromEvents(
    result.events[0].gameId,
    result.events.slice(0, consumed.sequence),
  );
  const after = hydrateGameSessionFromEvents(
    result.events[0].gameId,
    result.events.slice(0, consumed.sequence + 1),
  );
  const initialBin =
    before.currentState.units[consumed.payload.unitId].ammoState?.[
      consumed.payload.binId
    ];
  const replayBin =
    after.currentState.units[consumed.payload.unitId].ammoState?.[
      consumed.payload.binId
    ];
  expect(replayBin?.remainingRounds).toBe(consumed.payload.roundsRemaining);
  expect(replayBin?.remainingRounds).toBe(
    (initialBin?.remainingRounds ?? 0) - 1,
  );
});

it('also carries construction inventory into the interactive engine entry', () => {
  const adapted = adaptUnitFromData(catalogInput(shadowHawk));
  const session = new GameEngine({ seed: 17 }).createInteractiveSession(
    [adapted],
    [],
    [metadata(adapted.id)],
  );
  expect(
    getTotalAmmo(session.getState().units[adapted.id].ammoState ?? {}, 'AC/5'),
  ).toBe(20);
});

it('preserves explicit scenario bins instead of overwriting their authored inventory', () => {
  const adapted = adaptUnitFromData(catalogInput(shadowHawk));
  const authored = [
    {
      binId: 'scenario',
      weaponType: 'AC/5',
      location: 'left_torso',
      maxRounds: 2,
      damagePerRound: 5,
      isExplosive: true,
    },
  ];
  const [seeded] = gameUnitsWithAdaptedCombatSeeds(
    [{ ...metadata(adapted.id), ammoConstruction: authored }],
    [adapted],
    [],
  );
  expect(seeded.ammoConstruction).toBe(authored);
});

it('never invents inventory for missing critical slots and refuses fire after the real bin drains', () => {
  const adapted = adaptUnitFromData(catalogInput(warhammer));
  const empty = adaptUnitFromData({
    ...catalogInput(warhammer),
    criticalSlots: {},
  });
  expect(empty.ammoConstruction).toEqual([]);
  expect(
    consumeAmmo(empty.ammoState ?? {}, empty.id, 'Machine Gun'),
  ).toBeNull();
  const consumed = consumeAmmo(
    adapted.ammoState ?? {},
    adapted.id,
    'Machine Gun',
    200,
  );
  expect(consumed?.event.roundsRemaining).toBe(0);
  expect(
    consumeAmmo(consumed?.updatedAmmoState ?? {}, adapted.id, 'Machine Gun'),
  ).toBeNull();
});

it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
  'ignores malformed catalog capacities (%s) rather than producing usable ammunition',
  (shotsPerTon) => {
    const full = {
      ...catalogInput(shadowHawk),
      criticalSlots: { LEFT_TORSO: ['bad-ammo'] },
    };
    const bins = hydrateAmmoStateFromFullUnit(full, () => ({
      id: 'bad-ammo',
      name: 'Bad Ammo',
      shotsPerTon,
      isExplosive: true,
      compatibleWeaponIds: ['ac-5'],
    }));
    expect(bins).toBeUndefined();
  },
);
