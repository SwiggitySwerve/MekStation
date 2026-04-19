/**
 * Battle Armor stealth / mimetic to-hit bonus tests.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   (Section 7)
 */

import type { BattleArmorStealthKind } from '@/types/gameplay';

import { createBattleArmorCombatState, setMimeticActive } from '../state';
import { computeBattleArmorStealthBonus } from '../stealth';

function makeState(kind: BattleArmorStealthKind, mimeticActive = false) {
  const base = createBattleArmorCombatState({
    unitId: 'ba-stealth',
    squadSize: 5,
    armorPointsPerTrooper: 10,
    stealthKind: kind,
  });
  return setMimeticActive(base, mimeticActive);
}

describe('computeBattleArmorStealthBonus — none', () => {
  it('returns 0 bonus / none source', () => {
    const s = makeState('none');
    expect(computeBattleArmorStealthBonus(s, 'short')).toEqual({
      toHitBonus: 0,
      source: 'none',
    });
    expect(computeBattleArmorStealthBonus(s, 'medium')).toEqual({
      toHitBonus: 0,
      source: 'none',
    });
    expect(computeBattleArmorStealthBonus(s, 'long')).toEqual({
      toHitBonus: 0,
      source: 'none',
    });
  });
});

describe('computeBattleArmorStealthBonus — mimetic', () => {
  it('active (did not move) → +1 at all ranges', () => {
    const s = makeState('mimetic', true);
    for (const range of ['short', 'medium', 'long'] as const) {
      expect(computeBattleArmorStealthBonus(s, range)).toEqual({
        toHitBonus: 1,
        source: 'mimetic',
      });
    }
  });

  it('inactive (moved) → 0', () => {
    const s = makeState('mimetic', false);
    expect(computeBattleArmorStealthBonus(s, 'short')).toEqual({
      toHitBonus: 0,
      source: 'none',
    });
  });
});

describe('computeBattleArmorStealthBonus — basic stealth', () => {
  it('+1 at all ranges (regardless of movement)', () => {
    const s = makeState('stealth_basic', false);
    for (const range of ['short', 'medium', 'long'] as const) {
      expect(computeBattleArmorStealthBonus(s, range)).toEqual({
        toHitBonus: 1,
        source: 'stealth_basic',
      });
    }
  });
});

describe('computeBattleArmorStealthBonus — improved stealth', () => {
  it('+2 short', () => {
    expect(
      computeBattleArmorStealthBonus(makeState('stealth_improved'), 'short'),
    ).toEqual({ toHitBonus: 2, source: 'stealth_improved' });
  });
  it('+2 medium', () => {
    expect(
      computeBattleArmorStealthBonus(makeState('stealth_improved'), 'medium'),
    ).toEqual({ toHitBonus: 2, source: 'stealth_improved' });
  });
  it('+3 long', () => {
    expect(
      computeBattleArmorStealthBonus(makeState('stealth_improved'), 'long'),
    ).toEqual({ toHitBonus: 3, source: 'stealth_improved' });
  });
});

describe('computeBattleArmorStealthBonus — prototype stealth', () => {
  it('+1 at all ranges', () => {
    const s = makeState('stealth_prototype');
    for (const range of ['short', 'medium', 'long'] as const) {
      expect(computeBattleArmorStealthBonus(s, range)).toEqual({
        toHitBonus: 1,
        source: 'stealth_prototype',
      });
    }
  });
});
