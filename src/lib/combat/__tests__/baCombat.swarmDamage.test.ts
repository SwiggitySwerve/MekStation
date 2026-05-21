/**
 * Tests for BA combat section 4 (swarm-fire damage formula).
 *
 * Librarian canonical numbers verified here:
 *   - 4-trooper x 1 SmallLaser (3 dmg)               -> 12
 *   - +2 vibroclaws                                  -> 14
 *   - +myomer booster active                         -> 22
 *   - 2 of 4 troopers dead, SmallLaser only          -> 6
 *   - 0 active troopers -> 0
 *
 * The pure formula does NOT filter missile / body-mounted / InfantryAttack
 * weapons -- callers MUST filter upstream. PR-L3+ adds the dispatch filter.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type { IBASquadCombatState } from '@/types/gameplay';

import { calculateSwarmDamage, type IBASwarmFireSquadDef } from '../baCombat';

function makeSquad(squadSize = 4, armorPerTrooper = 5): IBASquadCombatState {
  return {
    troopers: Array.from({ length: squadSize }, (_, i) => ({
      index: i + 1,
      alive: true,
      armorRemaining: armorPerTrooper,
      equipmentDestroyed: [],
    })),
    swarmingUnitId: undefined,
    swarmedByUnitIds: [],
    mountedOn: undefined,
    mimeticActiveThisTurn: false,
    stealthActiveThisTurn: false,
  };
}

function makeSquadDef(
  overrides: Partial<IBASwarmFireSquadDef> = {},
): IBASwarmFireSquadDef {
  return {
    weapons: [],
    vibroClaws: 0,
    myomerBoosterActive: false,
    ...overrides,
  };
}

describe('calculateSwarmDamage -- Librarian canonical numbers', () => {
  it('4-trooper x 1 SmallLaser (3 dmg) = 12 damage', () => {
    const squad = makeSquad(4, 5);
    const squadDef = makeSquadDef({
      weapons: [{ weaponId: 'small-laser-1', damage: 3 }],
    });
    expect(calculateSwarmDamage(squad, squadDef)).toBe(12);
  });

  it('+2 vibroclaws -> 14 damage', () => {
    const squad = makeSquad(4, 5);
    const squadDef = makeSquadDef({
      weapons: [{ weaponId: 'small-laser-1', damage: 3 }],
      vibroClaws: 2,
    });
    expect(calculateSwarmDamage(squad, squadDef)).toBe(14);
  });

  it('+myomer booster active -> 22 damage', () => {
    const squad = makeSquad(4, 5);
    const squadDef = makeSquadDef({
      weapons: [{ weaponId: 'small-laser-1', damage: 3 }],
      vibroClaws: 2,
      myomerBoosterActive: true,
    });
    // 12 (weapons) + 2 (vibroclaws) + 8 (4 troopers x 2 myomer) = 22
    expect(calculateSwarmDamage(squad, squadDef)).toBe(22);
  });
});

describe('calculateSwarmDamage -- edge cases', () => {
  it('returns 0 when no troopers are alive', () => {
    const squad = makeSquad(4, 5);
    squad.troopers.forEach((t) => {
      t.alive = false;
      t.armorRemaining = 0;
    });
    const squadDef = makeSquadDef({
      weapons: [{ weaponId: 'small-laser-1', damage: 3 }],
      vibroClaws: 2,
      myomerBoosterActive: true,
    });
    expect(calculateSwarmDamage(squad, squadDef)).toBe(0);
  });

  it('returns 0 with empty weapon list and no bonuses', () => {
    const squad = makeSquad(4, 5);
    const squadDef = makeSquadDef();
    expect(calculateSwarmDamage(squad, squadDef)).toBe(0);
  });

  it('damage scales down: 2 of 4 alive with SmallLaser = 6', () => {
    const squad = makeSquad(4, 5);
    squad.troopers[0].alive = false;
    squad.troopers[0].armorRemaining = 0;
    squad.troopers[2].alive = false;
    squad.troopers[2].armorRemaining = 0;
    const squadDef = makeSquadDef({
      weapons: [{ weaponId: 'small-laser-1', damage: 3 }],
    });
    // 3 dmg x 2 active = 6
    expect(calculateSwarmDamage(squad, squadDef)).toBe(6);
  });

  it('vibroclaws alone contribute their count', () => {
    const squad = makeSquad(4, 5);
    const squadDef = makeSquadDef({ vibroClaws: 2 });
    // Vibroclaws are FLAT damage equal to their count (not x troopers).
    expect(calculateSwarmDamage(squad, squadDef)).toBe(2);
  });

  it('myomer alone with 4 troopers contributes 8', () => {
    const squad = makeSquad(4, 5);
    const squadDef = makeSquadDef({ myomerBoosterActive: true });
    // 4 troopers x 2 = 8 (no weapons, no claws).
    expect(calculateSwarmDamage(squad, squadDef)).toBe(8);
  });

  it('myomer scales with active troopers (2 of 4 dead -> +4 myomer)', () => {
    const squad = makeSquad(4, 5);
    squad.troopers[0].alive = false;
    squad.troopers[0].armorRemaining = 0;
    squad.troopers[1].alive = false;
    squad.troopers[1].armorRemaining = 0;
    const squadDef = makeSquadDef({
      weapons: [{ weaponId: 'small-laser-1', damage: 3 }],
      myomerBoosterActive: true,
    });
    // 3 x 2 (weapons) + 0 (no claws) + 2 x 2 (myomer) = 6 + 4 = 10
    expect(calculateSwarmDamage(squad, squadDef)).toBe(10);
  });

  it('multiple eligible weapons sum independently', () => {
    const squad = makeSquad(4, 5);
    const squadDef = makeSquadDef({
      weapons: [
        { weaponId: 'small-laser-1', damage: 3 },
        { weaponId: 'flamer-1', damage: 2 },
      ],
    });
    // (3 + 2) x 4 = 20
    expect(calculateSwarmDamage(squad, squadDef)).toBe(20);
  });
});

describe('calculateSwarmDamage -- caller-contract regression', () => {
  it('formula sums whatever weapons it is given (no internal filtering)', () => {
    const squad = makeSquad(4, 5);
    const squadDef = makeSquadDef({
      weapons: [{ weaponId: 'srm-2-body-fake', damage: 2 }],
    });
    // 2 x 4 = 8 -- formula trusts the caller. PR-L3+ filters at dispatch.
    expect(calculateSwarmDamage(squad, squadDef)).toBe(8);
  });
});
