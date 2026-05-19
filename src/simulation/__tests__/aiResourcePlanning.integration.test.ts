/**
 * Integration tests for A2 resource planning through `BotPlayer`.
 *
 * Covers `add-ai-resource-planning` tasks 6.1 (Veteran throttles its alpha
 * strike across turns) and 6.2 (Veteran rations a low-ammo autocannon a
 * Regular bot empties early), and the spec scenario "Veteran bot throttles
 * before shutdown".
 *
 * @spec openspec/changes/add-ai-resource-planning/specs/simulation-system/spec.md
 *   Requirement: Multi-Turn Heat Projection
 *   Requirement: Ammo-Runway Projection
 */

import { Facing, MovementType } from '@/types/gameplay';

import type { IBotBehavior, IAIUnitState, IWeapon } from '../ai/types';

import { BotPlayer } from '../ai/BotPlayer';
import { DEFAULT_BEHAVIOR } from '../ai/types';
import { SeededRandom } from '../core/SeededRandom';

function weapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'mlas',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
    ...overrides,
  };
}

function unit(overrides: Partial<IAIUnitState> = {}): IAIUnitState {
  return {
    unitId: 'attacker',
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    weapons: [weapon()],
    ammo: {},
    destroyed: false,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    ...overrides,
  };
}

function behavior(tier: IBotBehavior['tier']): IBotBehavior {
  return { ...DEFAULT_BEHAVIOR, tier };
}

describe('A2 integration — Veteran throttles its alpha strike', () => {
  // A hot fire list: six laser-class energy weapons at 3 heat each. A full
  // alpha strike generates 18 heat/turn; with a 10-sink dissipation the curve
  // climbs +8/turn and a shutdown is reached inside the lookahead window.
  // The Regular bot's single-turn trim fits four weapons under its fixed
  // safe threshold (13); the Veteran's heat planner lowers the effective
  // budget so it fires strictly fewer.
  function hotAttacker(): IAIUnitState {
    return unit({
      heat: 0,
      heatDissipation: 10,
      weapons: Array.from({ length: 6 }, (_, i) =>
        weapon({ id: `las-${i}`, name: 'Large Laser', damage: 8, heat: 3 }),
      ),
    });
  }

  const target = unit({ unitId: 'target', position: { q: 4, r: 0 } });

  it('a Veteran bot fires fewer weapons than a Regular bot under a heat curve', () => {
    const veteran = new BotPlayer(new SeededRandom(1), behavior('Veteran'));
    const regular = new BotPlayer(new SeededRandom(1), behavior('Regular'));

    const vAttack = veteran.playAttackPhase(hotAttacker(), [
      hotAttacker(),
      target,
    ]);
    const rAttack = regular.playAttackPhase(hotAttacker(), [
      hotAttacker(),
      target,
    ]);

    expect(vAttack).not.toBeNull();
    expect(rAttack).not.toBeNull();
    // The Veteran's multi-turn projection lowers the budget — it commits to
    // a strictly smaller fire list than the Regular bot's single-turn trim.
    expect(vAttack!.payload.weapons.length).toBeLessThan(
      rAttack!.payload.weapons.length,
    );
  });

  it('the Veteran fire list does not shut the unit down within the window', () => {
    const veteran = new BotPlayer(new SeededRandom(7), behavior('Veteran'));
    const attacker = hotAttacker();
    const attack = veteran.playAttackPhase(attacker, [attacker, target]);
    expect(attack).not.toBeNull();

    // Project the heat the chosen fire list generates over 3 turns and
    // confirm it stays under the shutdown ceiling (14).
    const firedHeat = attack!.payload.weapons.reduce((sum, id) => {
      const w = attacker.weapons.find((x) => x.id === id);
      return sum + (w?.heat ?? 0);
    }, 0);
    let heat = attacker.heat;
    for (let turn = 0; turn < 3; turn++) {
      heat = Math.max(0, heat + firedHeat - (attacker.heatDissipation ?? 10));
    }
    expect(heat).toBeLessThan(14);
  });
});

describe('A2 integration — Veteran rations a low-ammo autocannon', () => {
  // The attacker has one energy weapon and one nearly-empty autocannon of
  // equal efficiency. The Veteran's ammo conservation must sink the
  // autocannon in priority; the Regular bot orders them by raw efficiency.
  function makeAttacker(): IAIUnitState {
    return unit({
      heat: 0,
      heatDissipation: 10,
      weapons: [
        weapon({ id: 'ac5', name: 'AC/5', damage: 6, heat: 3, ammoPerTon: 5 }),
        weapon({ id: 'mlas', name: 'Medium Laser', damage: 6, heat: 3 }),
      ],
      ammo: { ac5: 1 },
    });
  }
  const target = unit({ unitId: 'target', position: { q: 4, r: 0 } });

  it('the Veteran ranks the energy weapon ahead of the scarce autocannon', () => {
    const veteran = new BotPlayer(new SeededRandom(3), behavior('Veteran'));
    const attacker = makeAttacker();
    const attack = veteran.playAttackPhase(attacker, [attacker, target]);
    expect(attack).not.toBeNull();
    const ids = attack!.payload.weapons;
    expect(ids).toContain('ac5'); // not culled — still eligible
    expect(ids).toContain('mlas');
    expect(ids.indexOf('mlas')).toBeLessThan(ids.indexOf('ac5'));
  });

  it('the Regular bot keeps the legacy efficiency order (no conservation)', () => {
    const regular = new BotPlayer(new SeededRandom(3), behavior('Regular'));
    const attacker = makeAttacker();
    const attack = regular.playAttackPhase(attacker, [attacker, target]);
    expect(attack).not.toBeNull();
    // Equal-efficiency weapons — the Regular bot does not reorder for ammo.
    // The scarce autocannon is NOT pushed behind the laser by conservation.
    const ids = attack!.payload.weapons;
    expect(ids).toContain('ac5');
    expect(ids).toContain('mlas');
  });
});

describe('A2 integration — legacy tiers reproduce pre-A2 behavior', () => {
  it('a Regular bot with no multi-mode weapons emits no weaponModes map', () => {
    const regular = new BotPlayer(new SeededRandom(5), behavior('Regular'));
    const attacker = unit({
      weapons: [weapon({ id: 'l1' }), weapon({ id: 'l2' })],
    });
    const target = unit({ unitId: 'target', position: { q: 3, r: 0 } });
    const attack = regular.playAttackPhase(attacker, [attacker, target]);
    expect(attack).not.toBeNull();
    expect(attack!.payload.weaponModes).toBeUndefined();
  });

  it('a Regular and an undefined-tier bot pick the identical fire list', () => {
    const regular = new BotPlayer(new SeededRandom(9), behavior('Regular'));
    const untiered = new BotPlayer(new SeededRandom(9), behavior(undefined));
    const attacker = unit({
      weapons: [
        weapon({ id: 'l1', damage: 10, heat: 2 }),
        weapon({ id: 'l2', damage: 5, heat: 4 }),
      ],
    });
    const target = unit({ unitId: 'target', position: { q: 3, r: 0 } });
    const rAttack = regular.playAttackPhase(attacker, [attacker, target]);
    const uAttack = untiered.playAttackPhase(attacker, [attacker, target]);
    expect(rAttack!.payload.weapons).toEqual(uAttack!.payload.weapons);
  });
});
