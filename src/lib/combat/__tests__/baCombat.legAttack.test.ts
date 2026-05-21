/**
 * Tests for BA combat §5 (leg-attack damage formula, PR-L3).
 *
 * Canonical numbers (per the PR-L3 task spec + `add-battle-armor-combat`
 * Requirement: Leg Attack):
 *   - 4 troopers, no equipment                  → 4   (4 + 0 + 0)
 *   - +1 squad vibroclaw                        → 5   (4 + 1 + 0)
 *   - +4 squad vibroclaws (one per trooper)     → 8   (4 + 4 + 0)
 *   - +myomer booster active, 4 troopers        → 12  (4 + 0 + 8)
 *   - +4 vibroclaws + myomer + 4 troopers       → 16  (4 + 4 + 8)
 *   - 0 active troopers                         → 0
 *
 * Distinct from swarm-fire — leg attack has NO per-weapon damage and
 * the vibroclaw bonus is FLAT (not multiplied by troopers).
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type { IBASquadCombatState } from '@/types/gameplay';

import {
  calculateLegAttackDamage,
  type IBALegAttackSquadDef,
} from '../baCombat';

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
  overrides: Partial<IBALegAttackSquadDef> = {},
): IBALegAttackSquadDef {
  return {
    vibroClaws: 0,
    myomerBoosterActive: false,
    ...overrides,
  };
}

describe('calculateLegAttackDamage — canonical numbers', () => {
  it('4 troopers, no equipment → 4 damage (base only)', () => {
    const squad = makeSquad(4);
    expect(calculateLegAttackDamage(squad, makeSquadDef())).toBe(4);
  });

  it('+1 squad vibroclaw → 5 damage (4 + 1)', () => {
    const squad = makeSquad(4);
    expect(
      calculateLegAttackDamage(squad, makeSquadDef({ vibroClaws: 1 })),
    ).toBe(5);
  });

  it('+4 squad vibroclaws (one per trooper) → 8 damage (4 + 4)', () => {
    const squad = makeSquad(4);
    expect(
      calculateLegAttackDamage(squad, makeSquadDef({ vibroClaws: 4 })),
    ).toBe(8);
  });

  it('+myomer booster active, 4 troopers → 12 damage (4 + 0 + 8)', () => {
    const squad = makeSquad(4);
    expect(
      calculateLegAttackDamage(
        squad,
        makeSquadDef({ myomerBoosterActive: true }),
      ),
    ).toBe(12);
  });

  it('+4 vibroclaws + myomer + 4 troopers → 16 damage (4 + 4 + 8)', () => {
    const squad = makeSquad(4);
    expect(
      calculateLegAttackDamage(
        squad,
        makeSquadDef({ vibroClaws: 4, myomerBoosterActive: true }),
      ),
    ).toBe(16);
  });

  it('0 active troopers → 0 damage (no base component when squad is destroyed)', () => {
    const squad = makeSquad(4);
    squad.troopers.forEach((t) => {
      t.alive = false;
      t.armorRemaining = 0;
    });
    expect(
      calculateLegAttackDamage(
        squad,
        makeSquadDef({ vibroClaws: 4, myomerBoosterActive: true }),
      ),
    ).toBe(0);
  });
});

describe('calculateLegAttackDamage — additional scenarios', () => {
  it('matches the spec "Basic leg attack" scenario: 4 troopers + 1 vibroclaw → 5', () => {
    // GIVEN a 4-trooper BA squad with 1 vibroclaw, no myomer booster
    // WHEN the squad declares a LegAttack against an Atlas
    // AND the to-hit roll succeeds
    // THEN damage SHALL be 4 + 1 + 0 = 5
    const squad = makeSquad(4);
    expect(
      calculateLegAttackDamage(squad, makeSquadDef({ vibroClaws: 1 })),
    ).toBe(5);
  });

  it('matches the spec "Myomer booster boosts leg-attack damage" scenario: same squad + myomer + 4 troopers → 13', () => {
    // GIVEN the same squad with Myomer Booster and 4 active troopers
    // WHEN the leg attack resolves
    // THEN damage SHALL be 4 + 1 + (4 × 2) = 13
    const squad = makeSquad(4);
    expect(
      calculateLegAttackDamage(
        squad,
        makeSquadDef({ vibroClaws: 1, myomerBoosterActive: true }),
      ),
    ).toBe(13);
  });

  it('myomer scales with surviving troopers (2 of 4 dead → +4 myomer, not +8)', () => {
    const squad = makeSquad(4);
    squad.troopers[0].alive = false;
    squad.troopers[0].armorRemaining = 0;
    squad.troopers[1].alive = false;
    squad.troopers[1].armorRemaining = 0;
    // 4 (base) + 0 (no claws) + 2 × 2 (myomer × 2 survivors) = 8
    expect(
      calculateLegAttackDamage(
        squad,
        makeSquadDef({ myomerBoosterActive: true }),
      ),
    ).toBe(8);
  });

  it('vibroclaws DO NOT scale with troopers (flat squad-level count)', () => {
    // 2 surviving troopers + 4 vibroclaws is STILL +4, not 4 × 2 = 8.
    const squad = makeSquad(4);
    squad.troopers[0].alive = false;
    squad.troopers[0].armorRemaining = 0;
    squad.troopers[1].alive = false;
    squad.troopers[1].armorRemaining = 0;
    // 4 (base) + 4 (vibroclaws, flat) + 0 (no myomer) = 8
    expect(
      calculateLegAttackDamage(squad, makeSquadDef({ vibroClaws: 4 })),
    ).toBe(8);
  });

  it('myomer booster OFF contributes 0 even with high trooper count', () => {
    const squad = makeSquad(6);
    expect(
      calculateLegAttackDamage(
        squad,
        makeSquadDef({ myomerBoosterActive: false }),
      ),
    ).toBe(4);
  });

  it('single surviving trooper still contributes the base 4', () => {
    const squad = makeSquad(4);
    squad.troopers[1].alive = false;
    squad.troopers[1].armorRemaining = 0;
    squad.troopers[2].alive = false;
    squad.troopers[2].armorRemaining = 0;
    squad.troopers[3].alive = false;
    squad.troopers[3].armorRemaining = 0;
    // 4 (base) + 0 + 1 × 2 (myomer × 1 survivor) = 6
    expect(
      calculateLegAttackDamage(
        squad,
        makeSquadDef({ myomerBoosterActive: true }),
      ),
    ).toBe(6);
  });

  it('negative vibroClaws is clamped to 0 (defensive)', () => {
    const squad = makeSquad(4);
    expect(
      calculateLegAttackDamage(squad, makeSquadDef({ vibroClaws: -1 })),
    ).toBe(4);
  });
});
