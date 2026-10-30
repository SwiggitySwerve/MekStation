import type { IWeapon, IAIUnitState } from '@/simulation/ai/types';

import { getWeaponData } from '@/engine/adapters/CompendiumAdapter.weaponData';
import {
  ammoFromWeapons,
  extractWeapons,
} from '@/engine/adapters/CompendiumAdapter.weapons';
import { toAIUnitState as toEngineAIUnitState } from '@/engine/GameEngine.helpers';
import { computeAmmoRunway } from '@/simulation/ai/AIAmmoRunway';
import { expectedDamage as coordinatedDamage } from '@/simulation/ai/AIFireCoordinator';
import { selectWeaponMode } from '@/simulation/ai/AIWeaponModeSelector';
import { AttackAI } from '@/simulation/ai/AttackAI';
import {
  assertNoCombatSideEffects,
  createAmmoBin,
  createWeaponAttackState,
  runInvalidationScenario,
  withAttackerAmmo,
} from '@/simulation/runner/__tests__/weaponAttackInvalidation.behavior.test-helpers';
import {
  hasAmmoForValidShot,
  selectedAmmoWeaponType,
} from '@/simulation/runner/phases/weaponAttackFiringModes';
import { toAIUnitState } from '@/simulation/runner/SimulationRunnerSupport';
import {
  Facing,
  MovementType,
  GameEventType,
  LockState,
  WeaponCategory,
} from '@/types/gameplay';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import { expectedDamage, damageVariance } from '../damage/expectedDamage';
import { isMissileWeapon } from '../specialWeaponMechanics/missileMechanics';
import { buildWeaponAttack } from '../weaponAttackBuilder';

// Projected nominal LRM data from the native catalog correction (#2408).
// This prerequisite verifies resource readiness, not cluster counts or catalog admission.
function missile(rack = 16, capacity = -1): IWeapon {
  return {
    id: `source-unit-clan-lrm-${rack}-1`,
    name: rack <= 4 ? `LRM ${rack} (Clan)` : `LRM ${rack}`,
    damage: rack,
    heat: 0,
    minRange: 0,
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    ammoPerTon: capacity,
    ammoWeaponType: rack <= 4 ? `clan-lrm-${rack}` : `lrm-${rack}`,
    destroyed: false,
  };
}

function aiUnit(weapon: IWeapon, count: number | undefined): IAIUnitState {
  return {
    unitId: 'player-1',
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    weapons: [weapon],
    ammo: count === undefined ? {} : { [weapon.id]: count },
    destroyed: false,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
  };
}

const target: IAIUnitState = {
  ...aiUnit(missile(), undefined),
  unitId: 'opponent-1',
  position: { q: 5, r: 0 },
  weapons: [],
  ammo: {},
};
const nativeRacks = [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19];

describe.each(nativeRacks)('unknown-capacity native LRM %s', (rack) => {
  const weapon = missile(rack);
  const type = rack <= 4 ? `clan-lrm-${rack}` : `lrm-${rack}`;
  it.each([undefined, 0, -0, -1, NaN, Infinity, -Infinity, 0.5, 1.5])(
    'does not plan or preview fire with count %s',
    (count) => {
      const attacker = aiUnit(weapon, count);
      expect(new AttackAI().selectWeapons(attacker, target)).toEqual([]);
      expect(coordinatedDamage(attacker, target)).toBe(0);
      expect(computeAmmoRunway(weapon, count).turnsRemaining).toBe(0);
      expect(expectedDamage(weapon, 0.5, { remainingShots: count })).toBe(0);
      expect(damageVariance(weapon, 0.5, { remainingShots: count })).toBe(0);
    },
  );

  it('is a missile with a one-round mode cost, not an energy weapon', () => {
    expect(buildWeaponAttack(weapon.id, [weapon])?.category).toBe(
      WeaponCategory.MISSILE,
    );
    expect(
      selectWeaponMode(
        weapon,
        {
          distance: 5,
          heatHeadroom: 20,
          ammoTurnsRemaining: 1,
        },
        false,
      ).effectiveShots,
    ).toBe(1);
  });

  it.each([
    'absent',
    'empty',
    'zero',
    'wrong-family',
    'fractional',
    'infinite',
  ])(
    'rejects %s ammo at the actual attack boundary without combat side effects',
    (shape) => {
      let state = createWeaponAttackState({ q: 5, r: 0 });
      if (shape === 'empty') {
        state = {
          ...state,
          units: {
            ...state.units,
            'player-1': { ...state.units['player-1'], ammoState: {} },
          },
        };
      } else if (shape !== 'absent') {
        state = withAttackerAmmo(
          state,
          createAmmoBin({
            weaponType: shape === 'wrong-family' ? 'srm-6' : type,
            remainingRounds:
              shape === 'zero'
                ? 0
                : shape === 'fractional'
                  ? 0.5
                  : shape === 'infinite'
                    ? Infinity
                    : 2,
          }),
        );
      }
      const { result, events } = runInvalidationScenario({ state, weapon });
      expect(
        events.filter((e) => e.type === GameEventType.AttackInvalid),
      ).toHaveLength(1);
      expect(
        events.find((e) => e.type === GameEventType.AttackInvalid)?.payload,
      ).toMatchObject({ reason: 'OutOfAmmo' });
      expect(
        events.some((e) =>
          [
            GameEventType.AttackDeclared,
            GameEventType.AttackResolved,
            GameEventType.AmmoConsumed,
            GameEventType.DamageApplied,
          ].includes(e.type),
        ),
      ).toBe(false);
      assertNoCombatSideEffects(result, state);
    },
  );

  it('projects compatible bins, consumes the last round and refuses the next shot', () => {
    const bin = createAmmoBin({ weaponType: type, remainingRounds: 1 });
    const state = withAttackerAmmo(
      createWeaponAttackState({ q: 5, r: 0 }),
      bin,
    );
    const before = JSON.stringify(state);
    const adapted = ammoFromWeapons([weapon], { [bin.binId]: bin });
    expect(adapted).toEqual({ [weapon.id]: 1 });
    const liveAI = toAIUnitState(state.units['player-1'], [weapon]);
    expect(liveAI.ammo).toEqual(adapted);
    expect(new AttackAI().selectWeapons(liveAI, target)).toEqual([weapon]);
    expect(computeAmmoRunway(weapon, 1).turnsRemaining).toBe(1);
    expect(expectedDamage(weapon, 0.5, { remainingShots: 1 })).toBeGreaterThan(
      0,
    );
    expect(selectedAmmoWeaponType(weapon, undefined)).toBe(type);
    const first = runInvalidationScenario({ state, weapon });
    expect(
      first.events.filter((e) => e.type === GameEventType.AmmoConsumed),
    ).toHaveLength(1);
    expect(
      first.result.units['player-1'].ammoState?.[bin.binId].remainingRounds,
    ).toBe(0);
    expect(JSON.stringify(state)).toBe(before);
    expect(
      new AttackAI().selectWeapons(
        toAIUnitState(first.result.units['player-1'], [weapon]),
        target,
      ),
    ).toEqual([]);
    const next = {
      ...first.result,
      turn: 2,
      units: {
        ...first.result.units,
        'player-1': {
          ...first.result.units['player-1'],
          lockState: LockState.Pending,
          weaponsFiredThisTurn: [],
        },
        'opponent-1': {
          ...first.result.units['opponent-1'],
          damageThisPhase: 0,
        },
      },
    };
    const second = runInvalidationScenario({ state: next, weapon });
    expect(
      second.events.find((e) => e.type === GameEventType.AttackInvalid)
        ?.payload,
    ).toMatchObject({ reason: 'OutOfAmmo' });
    expect(
      second.events.some((e) => e.type === GameEventType.AmmoConsumed),
    ).toBe(false);
    assertNoCombatSideEffects(second.result, next);
  });
});

const catalogAmmoWeapons = [
  ...new Set(
    WEAPON_CATALOG_FILES.flatMap((file) =>
      (file.items ?? []).flatMap((item) =>
        typeof item.id === 'string' ? [item.id] : [],
      ),
    ),
  ),
].flatMap((id) => {
  const data = getWeaponData(id);
  return data && (data.ammoPerTon > 0 || isMissileWeapon(data.name))
    ? [{ id, data }]
    : [];
});

describe.each(catalogAmmoWeapons)(
  'connected catalog ammunition: $id',
  ({ id, data }) => {
    it('keeps the runner, engine and adapter connected to the resolved identity', () => {
      const weapon: IWeapon = { ...data, id: `${id}-1` };
      const bin = createAmmoBin({ weaponType: id, remainingRounds: 2 });
      const state = withAttackerAmmo(
        createWeaponAttackState({ q: 5, r: 0 }),
        bin,
      );
      const unit = state.units['player-1'];
      expect(hasAmmoForValidShot(unit, weapon)).toBe(true);
      expect(toAIUnitState(unit, [weapon]).ammo[weapon.id]).toBe(2);
      expect(toEngineAIUnitState(unit, [weapon], 4).ammo[weapon.id]).toBe(2);

      const adapted = extractWeapons([{ equipmentId: id }], 'unit-42', {});
      expect(adapted).toHaveLength(1);
      expect(
        ammoFromWeapons(adapted, { [bin.binId]: bin })[adapted[0].id],
      ).toBe(2);
      expect(hasAmmoForValidShot(unit, adapted[0])).toBe(true);
      expect(toEngineAIUnitState(unit, adapted, 4).ammo[adapted[0].id]).toBe(2);
      const empty = {
        ...unit,
        ammoState: { [bin.binId]: { ...bin, remainingRounds: 0 } },
      };
      // Existing name-based energy classification bypasses depletion for these
      // four ammo-fed types. Their bin projection is covered; firing parity is open.
      const legacyEnergyGaps = [
        'clan-small-chemical-laser',
        'clan-medium-chemical-laser',
        'clan-large-chemical-laser',
        'vehicle-flamer',
      ];
      if (!legacyEnergyGaps.includes(id)) {
        expect(hasAmmoForValidShot(empty, adapted[0])).toBe(false);
      }
      expect(toAIUnitState(empty, adapted).ammo[adapted[0].id]).toBe(0);
      expect(toEngineAIUnitState(empty, adapted, 4).ammo[adapted[0].id]).toBe(
        0,
      );
    });
  },
);

describe('existing resource contracts', () => {
  it.each([-1, 0, NaN, -Infinity])(
    'requires explicit rounds at capacity %s',
    (capacity) => {
      const weapon = missile(16, capacity);
      expect(
        new AttackAI().selectWeapons(aiUnit(weapon, undefined), target),
      ).toEqual([]);
      expect(new AttackAI().selectWeapons(aiUnit(weapon, 1), target)).toEqual([
        weapon,
      ]);
      expect(expectedDamage(weapon, 0.5)).toBe(0);
      expect(
        expectedDamage(weapon, 0.5, { remainingShots: 1 }),
      ).toBeGreaterThan(0);
    },
  );

  it('does not combine fractional bins into a fireable round', () => {
    const weapon = missile();
    const bins = {
      first: createAmmoBin({
        binId: 'first',
        weaponType: 'lrm-16',
        remainingRounds: 0.5,
      }),
      second: createAmmoBin({
        binId: 'second',
        weaponType: 'lrm-16',
        remainingRounds: 0.5,
      }),
    };
    const state = createWeaponAttackState({ q: 5, r: 0 });
    const unit = { ...state.units['player-1'], ammoState: bins };
    expect(hasAmmoForValidShot(unit, weapon)).toBe(false);
    expect(ammoFromWeapons([weapon], bins)).toEqual({ [weapon.id]: 0 });
  });

  it('keeps explicit ammo-mode identity ahead of the canonical missile name', () => {
    const weapon = missile();
    const mode = {
      id: 'alternate',
      damage: 16,
      heat: 0,
      shotsPerTurn: 1,
      ammoWeaponType: 'alternate-lrm',
    };
    const bin = createAmmoBin({
      weaponType: 'alternate-lrm',
      remainingRounds: 1,
    });
    const state = withAttackerAmmo(
      createWeaponAttackState({ q: 5, r: 0 }),
      bin,
    );
    expect(selectedAmmoWeaponType(weapon, mode)).toBe('alternate-lrm');
    expect(hasAmmoForValidShot(state.units['player-1'], weapon, mode)).toBe(
      true,
    );
  });

  it('keeps energy fire independent and ordinary legacy unknown counts permissive', () => {
    const energy = {
      ...missile(),
      id: 'medium-laser-1',
      name: 'Medium Laser',
      damage: 5,
    };
    const ordinary = { ...missile(20, 6), id: 'lrm-20-1', name: 'LRM 20' };
    expect(new AttackAI().selectWeapons(aiUnit(energy, 0), target)).toEqual([
      energy,
    ]);
    expect(computeAmmoRunway(energy, 0).turnsRemaining).toBe(Infinity);
    expect(expectedDamage(energy, 0.5, { remainingShots: 0 })).toBe(2.5);
    expect(
      new AttackAI().selectWeapons(aiUnit(ordinary, undefined), target),
    ).toEqual([ordinary]);
    expect(computeAmmoRunway(ordinary, undefined).turnsRemaining).toBe(
      Infinity,
    );
    expect(new AttackAI().selectWeapons(aiUnit(ordinary, 0), target)).toEqual(
      [],
    );
    const zeroCapacity = { ...energy, ammoPerTon: 0 };
    expect(expectedDamage(zeroCapacity, 0.5, { remainingShots: 0 })).toBe(0);
  });

  it('keeps one-shot depletion and uses current bins for ordinary runner planning', () => {
    const oneShot = { ...missile(2, 1), name: 'SRM 2 (OS)' };
    expect(expectedDamage(oneShot, 0.5, { remainingShots: 0 })).toBe(0);
    expect(damageVariance(oneShot, 0.5, { remainingShots: 0 })).toBe(0);
    const ordinary = { ...missile(20, 6), id: 'lrm-20-1', name: 'LRM 20' };
    const state = withAttackerAmmo(
      createWeaponAttackState({ q: 5, r: 0 }),
      createAmmoBin({ weaponType: 'lrm-20', remainingRounds: 0 }),
    );
    expect(
      toAIUnitState(state.units['player-1'], [ordinary]).ammo[ordinary.id],
    ).toBe(0);
  });
});

it('keeps ordinary mode-specific ammunition usable in the live AI snapshot', () => {
  const weapon: IWeapon = {
    ...missile(3, 40),
    id: 'mml-3-1',
    name: 'MML 3',
    firingModes: {
      kind: 'ammo-mode',
      defaultModeId: 'srm',
      modes: [
        {
          id: 'srm',
          damage: 2,
          heat: 2,
          shotsPerTurn: 1,
          ammoWeaponType: 'srm-3',
        },
        {
          id: 'lrm',
          damage: 1,
          heat: 2,
          shotsPerTurn: 1,
          ammoWeaponType: 'lrm-3',
        },
        {
          id: 'srm-alias',
          damage: 2,
          heat: 2,
          shotsPerTurn: 1,
          ammoWeaponType: 'SRM 3',
        },
      ],
    },
  };
  const state = withAttackerAmmo(
    createWeaponAttackState({ q: 5, r: 0 }),
    createAmmoBin({ weaponType: 'srm-3', remainingRounds: 2 }),
  );
  const live = toAIUnitState(state.units['player-1'], [weapon]);
  expect(live.ammo[weapon.id]).toBe(2);
  expect(
    toEngineAIUnitState(state.units['player-1'], [weapon], 4).ammo[weapon.id],
  ).toBe(2);
  expect(new AttackAI().selectWeapons(live, target)).toEqual([weapon]);
  const unknownCapacity = { ...weapon, ammoPerTon: -1 };
  expect(
    toAIUnitState(state.units['player-1'], [unknownCapacity]).ammo[weapon.id],
  ).toBe(2);
  const depleted = withAttackerAmmo(
    state,
    createAmmoBin({ weaponType: 'srm-3', remainingRounds: 0 }),
  );
  expect(
    new AttackAI().selectWeapons(
      toAIUnitState(depleted.units['player-1'], [weapon]),
      target,
    ),
  ).toEqual([]);
});

describe('engine and interactive-session live ammunition', () => {
  it.each(['clan-srm-3', 'clan-srm-5'])(
    'selects supplied %s, observes ammo-only depletion and preserves input',
    (id) => {
      const weapons = extractWeapons([{ equipmentId: id }], 'proto-42', {});
      expect(weapons).toHaveLength(1);
      const bin = createAmmoBin({ weaponType: id, remainingRounds: 10 });
      const state = withAttackerAmmo(
        createWeaponAttackState({ q: 5, r: 0 }),
        bin,
      );
      const unit = state.units['player-1'];
      const before = JSON.stringify(unit);
      const supplied = toEngineAIUnitState(unit, weapons, 4);
      expect(supplied.ammo).toEqual({ [weapons[0].id]: 10 });
      expect(new AttackAI().selectWeapons(supplied, target)).toEqual(weapons);
      const depleted = {
        ...unit,
        ammoState: { [bin.binId]: { ...bin, remainingRounds: 0 } },
      };
      expect(
        new AttackAI().selectWeapons(
          toEngineAIUnitState(depleted, weapons, 4),
          target,
        ),
      ).toEqual([]);
      expect(
        new AttackAI().selectWeapons(
          toEngineAIUnitState(unit, weapons, 4),
          target,
        ),
      ).toEqual(weapons);
      expect(JSON.stringify(unit)).toBe(before);
    },
  );

  it.each([undefined, {}])(
    'keeps legacy counts when live bins are %s',
    (ammoState) => {
      const weapon = missile(20, 6);
      const unit = {
        ...createWeaponAttackState({ q: 5, r: 0 }).units['player-1'],
        ammoState,
        ammo: { [weapon.id]: 7 },
      };
      expect(toEngineAIUnitState(unit, [weapon], 4).ammo).toBe(unit.ammo);
      expect(
        new AttackAI().selectWeapons(
          toEngineAIUnitState(unit, [weapon], 4),
          target,
        ),
      ).toEqual([weapon]);
      const unknown = { ...unit, ammo: {} };
      expect(
        new AttackAI().selectWeapons(
          toEngineAIUnitState(unknown, [weapon], 4),
          target,
        ),
      ).toEqual([weapon]);
    },
  );
});
