/**
 * Tests for per-type stacking rules.
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Stacking Rules
 */

import { TokenUnitType } from '@/types/gameplay';

import type { IHexContents } from '../stackingRules';

import {
  getStackingRules,
  getStackingResult,
  getStackBadgeLabel,
} from '../stackingRules';

// =============================================================================
// getStackingRules — per-type descriptor
// =============================================================================

describe('getStackingRules', () => {
  it('Mech → maxPerHex 1, canMount false', () => {
    const rules = getStackingRules(TokenUnitType.Mech);
    expect(rules.maxPerHex).toBe(1);
    expect(rules.canMount).toBe(false);
    expect(rules.mountTargetType).toBeNull();
  });

  it('Vehicle → maxPerHex 1, canMount false', () => {
    const rules = getStackingRules(TokenUnitType.Vehicle);
    expect(rules.maxPerHex).toBe(1);
    expect(rules.canMount).toBe(false);
  });

  it('Aerospace → maxPerHex 1, canMount false', () => {
    const rules = getStackingRules(TokenUnitType.Aerospace);
    expect(rules.maxPerHex).toBe(1);
    expect(rules.canMount).toBe(false);
  });

  it('BattleArmor → canMount true, mountTargetType Mech', () => {
    const rules = getStackingRules(TokenUnitType.BattleArmor);
    expect(rules.canMount).toBe(true);
    expect(rules.mountTargetType).toBe(TokenUnitType.Mech);
  });

  it('Infantry → maxPerHex 4, canMount false', () => {
    const rules = getStackingRules(TokenUnitType.Infantry);
    expect(rules.maxPerHex).toBe(4);
    expect(rules.canMount).toBe(false);
  });

  it('ProtoMech → maxPerHex 1, canMount false', () => {
    const rules = getStackingRules(TokenUnitType.ProtoMech);
    expect(rules.maxPerHex).toBe(1);
    expect(rules.canMount).toBe(false);
  });

  it('undefined falls back to Mech rules', () => {
    const rules = getStackingRules(undefined);
    expect(rules.maxPerHex).toBe(1);
    expect(rules.canMount).toBe(false);
  });

  it('every type has a non-empty description', () => {
    for (const t of Object.values(TokenUnitType)) {
      expect(getStackingRules(t).description.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// getStackingResult — placement decisions
// =============================================================================

describe('getStackingResult', () => {
  // ---------------------------------------------------------------------------
  // Mech alone — rejects a second mech
  // ---------------------------------------------------------------------------
  describe('Mech stacking', () => {
    it('first mech on empty hex → allowed', () => {
      const result = getStackingResult(TokenUnitType.Mech, { byType: {} });
      expect(result.allowed).toBe(true);
    });

    it('second mech on hex that already has a mech → rejected', () => {
      const hex: IHexContents = {
        byType: { [TokenUnitType.Mech]: ['mech-1'] },
      };
      const result = getStackingResult(TokenUnitType.Mech, hex);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason.length).toBeGreaterThan(0);
      }
    });

    it('mech on hex occupied by infantry → allowed (different types do not share slot)', () => {
      // Infantry uses its own slot — a mech slot is still empty.
      const hex: IHexContents = {
        byType: { [TokenUnitType.Infantry]: ['inf-1'] },
      };
      const result = getStackingResult(TokenUnitType.Mech, hex);
      expect(result.allowed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Infantry — stacks up to 4 platoons
  // ---------------------------------------------------------------------------
  describe('Infantry stacking', () => {
    it('1st platoon on empty hex → allowed', () => {
      const result = getStackingResult(TokenUnitType.Infantry, { byType: {} });
      expect(result.allowed).toBe(true);
    });

    it('2nd platoon on hex with 1 → allowed', () => {
      const hex: IHexContents = {
        byType: { [TokenUnitType.Infantry]: ['inf-1'] },
      };
      expect(getStackingResult(TokenUnitType.Infantry, hex).allowed).toBe(true);
    });

    it('4th platoon on hex with 3 → allowed (at the limit)', () => {
      const hex: IHexContents = {
        byType: { [TokenUnitType.Infantry]: ['inf-1', 'inf-2', 'inf-3'] },
      };
      expect(getStackingResult(TokenUnitType.Infantry, hex).allowed).toBe(true);
    });

    it('5th platoon on hex with 4 → rejected (over limit)', () => {
      const hex: IHexContents = {
        byType: {
          [TokenUnitType.Infantry]: ['inf-1', 'inf-2', 'inf-3', 'inf-4'],
        },
      };
      const result = getStackingResult(TokenUnitType.Infantry, hex);
      expect(result.allowed).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // BattleArmor — mounts on mech
  // ---------------------------------------------------------------------------
  describe('BattleArmor mounting', () => {
    it('BA on empty hex → allowed as standalone (no mech present)', () => {
      const result = getStackingResult(TokenUnitType.BattleArmor, {
        byType: {},
      });
      expect(result.allowed).toBe(true);
      // No mountOn — standalone path.
      if (result.allowed) {
        expect(result.mountOn).toBeUndefined();
      }
    });

    it('BA on hex with mech → allowed and mountOn set to mech ID', () => {
      const hex: IHexContents = {
        byType: { [TokenUnitType.Mech]: ['mech-alpha'] },
      };
      const result = getStackingResult(TokenUnitType.BattleArmor, hex);
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.mountOn).toBe('mech-alpha');
      }
    });

    it('BA mounts on the first mech when multiple mechs listed (edge case)', () => {
      // In practice only one mech occupies a hex, but guard the first-wins logic.
      const hex: IHexContents = {
        byType: { [TokenUnitType.Mech]: ['mech-1', 'mech-2'] },
      };
      const result = getStackingResult(TokenUnitType.BattleArmor, hex);
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.mountOn).toBe('mech-1');
      }
    });

    it('BA cannot mount on aerospace — no mountOn returned', () => {
      const hex: IHexContents = {
        byType: { [TokenUnitType.Aerospace]: ['aero-1'] },
      };
      const result = getStackingResult(TokenUnitType.BattleArmor, hex);
      // Aerospace is not a valid mount target → falls through to slot check.
      // BA has maxPerHex=1 and there are 0 BA tokens → allowed standalone.
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        // Should NOT be set to aero-1.
        expect(result.mountOn).not.toBe('aero-1');
      }
    });

    it('second standalone BA on hex that already has a standalone BA → rejected', () => {
      const hex: IHexContents = {
        byType: { [TokenUnitType.BattleArmor]: ['ba-1'] },
      };
      const result = getStackingResult(TokenUnitType.BattleArmor, hex);
      // No mech present → falls through to slot check; 1 BA already present → rejected.
      expect(result.allowed).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // ProtoMech
  // ---------------------------------------------------------------------------
  describe('ProtoMech stacking', () => {
    it('first proto point on empty hex → allowed', () => {
      expect(
        getStackingResult(TokenUnitType.ProtoMech, { byType: {} }).allowed,
      ).toBe(true);
    });

    it('second proto point on occupied hex → rejected', () => {
      const hex: IHexContents = {
        byType: { [TokenUnitType.ProtoMech]: ['proto-1'] },
      };
      expect(getStackingResult(TokenUnitType.ProtoMech, hex).allowed).toBe(
        false,
      );
    });
  });
});

// =============================================================================
// getStackBadgeLabel — aggregated stack indicator
// =============================================================================

describe('getStackBadgeLabel', () => {
  it('returns null for an empty hex', () => {
    expect(getStackBadgeLabel({ byType: {} })).toBeNull();
  });

  it('returns null when only 1 infantry platoon present', () => {
    const hex: IHexContents = {
      byType: { [TokenUnitType.Infantry]: ['inf-1'] },
    };
    expect(getStackBadgeLabel(hex)).toBeNull();
  });

  it('returns ×N for 2 infantry platoons', () => {
    const hex: IHexContents = {
      byType: { [TokenUnitType.Infantry]: ['inf-1', 'inf-2'] },
    };
    expect(getStackBadgeLabel(hex)).toBe('×2');
  });

  it('returns ×3 for 3 infantry platoons', () => {
    const hex: IHexContents = {
      byType: { [TokenUnitType.Infantry]: ['inf-1', 'inf-2', 'inf-3'] },
    };
    expect(getStackBadgeLabel(hex)).toBe('×3');
  });

  it('returns ×4 for 4 infantry platoons (max allowed stack)', () => {
    const hex: IHexContents = {
      byType: {
        [TokenUnitType.Infantry]: ['inf-1', 'inf-2', 'inf-3', 'inf-4'],
      },
    };
    expect(getStackBadgeLabel(hex)).toBe('×4');
  });

  it('returns null for a single mech (no stacking)', () => {
    const hex: IHexContents = { byType: { [TokenUnitType.Mech]: ['mech-1'] } };
    expect(getStackBadgeLabel(hex)).toBeNull();
  });
});
