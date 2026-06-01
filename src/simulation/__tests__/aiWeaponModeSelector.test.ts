/**
 * Tests for the AI Weapon-Mode Selector — multi-mode weapon mode choice.
 *
 * Covers `add-ai-resource-planning` Requirement "Multi-Mode Weapon Selection":
 * scenarios "LB-X picks cluster against an exposed target", "LB-X picks slug
 * against a fresh target", "Rate-of-fire weapon drops to single fire under
 * heat pressure", and "Single-mode weapon passes through unchanged".
 *
 * @spec openspec/changes/add-ai-resource-planning/specs/simulation-system/spec.md
 *   Requirement: Multi-Mode Weapon Selection
 */

import type {
  IAIStructureState,
  IWeapon,
  IWeaponFiringModes,
} from '../ai/types';

import {
  type IWeaponModeContext,
  selectWeaponMode,
} from '../ai/AIWeaponModeSelector';

const LBX_MODES: IWeaponFiringModes = {
  kind: 'cluster-slug',
  defaultModeId: 'slug',
  modes: [
    { id: 'slug', damage: 10, heat: 2, shotsPerTurn: 1 },
    { id: 'cluster', damage: 6, heat: 2, shotsPerTurn: 1 },
  ],
};

const ULTRA_MODES: IWeaponFiringModes = {
  kind: 'rate-of-fire',
  defaultModeId: 'single',
  modes: [
    { id: 'single', damage: 5, heat: 1, shotsPerTurn: 1 },
    { id: 'double', damage: 10, heat: 2, shotsPerTurn: 2 },
  ],
};

const MML_MODES: IWeaponFiringModes = {
  kind: 'ammo-mode',
  defaultModeId: 'lrm',
  modes: [
    { id: 'srm', damage: 2, heat: 4, shotsPerTurn: 1, ammoWeaponType: 'srm-5' },
    { id: 'lrm', damage: 1, heat: 4, shotsPerTurn: 1, ammoWeaponType: 'lrm-5' },
  ],
};

function lbxWeapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'lbx10',
    name: 'LB 10-X AC',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 10,
    heat: 2,
    minRange: 0,
    ammoPerTon: 10,
    destroyed: false,
    firingModes: LBX_MODES,
    ...overrides,
  };
}

function ultraWeapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'uac5',
    name: 'Ultra AC/5',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 5,
    heat: 1,
    minRange: 0,
    ammoPerTon: 20,
    destroyed: false,
    firingModes: ULTRA_MODES,
    ...overrides,
  };
}

function mmlWeapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'mml5',
    name: 'MML 5',
    shortRange: 3,
    mediumRange: 8,
    longRange: 15,
    damage: 1,
    heat: 4,
    minRange: 0,
    ammoPerTon: 24,
    destroyed: false,
    firingModes: MML_MODES,
    ...overrides,
  };
}

function singleModeWeapon(): IWeapon {
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
  };
}

const FRESH_STRUCTURE: IAIStructureState = {
  armorByLocation: { center_torso: 21, left_torso: 14, right_torso: 14 },
  armorMaxByLocation: { center_torso: 21, left_torso: 14, right_torso: 14 },
  internalByLocation: { center_torso: 11, left_torso: 7, right_torso: 7 },
  internalMaxByLocation: { center_torso: 11, left_torso: 7, right_torso: 7 },
};

const EXPOSED_STRUCTURE: IAIStructureState = {
  armorByLocation: { center_torso: 21, left_torso: 0, right_torso: 14 },
  armorMaxByLocation: { center_torso: 21, left_torso: 14, right_torso: 14 },
  internalByLocation: { center_torso: 11, left_torso: 3, right_torso: 7 },
  internalMaxByLocation: { center_torso: 11, left_torso: 7, right_torso: 7 },
};

function ctx(overrides: Partial<IWeaponModeContext> = {}): IWeaponModeContext {
  return {
    distance: 5,
    targetStructure: FRESH_STRUCTURE,
    targetEvading: false,
    heatHeadroom: 100,
    ammoTurnsRemaining: Infinity,
    ...overrides,
  };
}

describe('AIWeaponModeSelector.selectWeaponMode', () => {
  describe('LB-X cluster/slug', () => {
    it('picks cluster against an armour-stripped target', () => {
      const sel = selectWeaponMode(
        lbxWeapon(),
        ctx({ targetStructure: EXPOSED_STRUCTURE }),
        true,
      );
      expect(sel.modeId).toBe('cluster');
      expect(sel.effectiveDamage).toBe(6);
    });

    it('picks cluster against an evading target even when fresh', () => {
      const sel = selectWeaponMode(
        lbxWeapon(),
        ctx({ targetStructure: FRESH_STRUCTURE, targetEvading: true }),
        true,
      );
      expect(sel.modeId).toBe('cluster');
    });

    it('picks slug against a fresh fully-armoured target at short range', () => {
      const sel = selectWeaponMode(
        lbxWeapon(),
        ctx({ targetStructure: FRESH_STRUCTURE, distance: 4 }),
        true,
      );
      expect(sel.modeId).toBe('slug');
      expect(sel.effectiveDamage).toBe(10);
    });

    it('picks cluster against a fresh target beyond short range', () => {
      const sel = selectWeaponMode(
        lbxWeapon(),
        ctx({ targetStructure: FRESH_STRUCTURE, distance: 14 }),
        true,
      );
      expect(sel.modeId).toBe('cluster');
    });
  });

  describe('Ultra/Rotary rate of fire', () => {
    it('picks the higher rate of fire when heat and ammo allow', () => {
      const sel = selectWeaponMode(
        ultraWeapon(),
        ctx({ heatHeadroom: 100, ammoTurnsRemaining: 40 }),
        true,
      );
      expect(sel.modeId).toBe('double');
      expect(sel.effectiveDamage).toBe(10);
    });

    it('drops to single fire when the heat budget cannot absorb double', () => {
      // Double mode generates 2 heat; only 1 point of headroom is left.
      const sel = selectWeaponMode(
        ultraWeapon(),
        ctx({ heatHeadroom: 1, ammoTurnsRemaining: 40 }),
        true,
      );
      expect(sel.modeId).toBe('single');
      expect(sel.effectiveHeat).toBe(1);
    });

    it('drops to single fire when the ammo runway is short', () => {
      // Only 4 rounds left — double fire (2/turn) leaves a 2-turn runway,
      // below the rate-of-fire ammo floor.
      const sel = selectWeaponMode(
        ultraWeapon(),
        ctx({ heatHeadroom: 100, ammoTurnsRemaining: 4 }),
        true,
      );
      expect(sel.modeId).toBe('single');
    });
  });

  describe('ammo-mode weapons', () => {
    it('picks SRM ammo mode at short range and LRM mode beyond short range', () => {
      const shortRange = selectWeaponMode(
        mmlWeapon(),
        ctx({ distance: 2 }),
        true,
      );
      const beyondShort = selectWeaponMode(
        mmlWeapon(),
        ctx({ distance: 7 }),
        true,
      );

      expect(shortRange.modeId).toBe('srm');
      expect(shortRange.ammoWeaponType).toBe('srm-5');
      expect(beyondShort.modeId).toBe('lrm');
      expect(beyondShort.ammoWeaponType).toBe('lrm-5');
    });
  });

  describe('single-mode weapon passes through unchanged', () => {
    it('a weapon with no firingModes returns its default mode', () => {
      const sel = selectWeaponMode(singleModeWeapon(), ctx(), true);
      expect(sel.modeId).toBe('default');
      expect(sel.effectiveDamage).toBe(5);
      expect(sel.effectiveHeat).toBe(3);
    });

    it('mode selection disabled forces the default mode on a multi-mode weapon', () => {
      // weaponModeSelection = false (the Green/Regular inert path).
      const sel = selectWeaponMode(
        lbxWeapon(),
        ctx({ targetStructure: EXPOSED_STRUCTURE }),
        false,
      );
      // Default LB-X mode is slug — even against an exposed target the
      // selector is bypassed entirely.
      expect(sel.modeId).toBe('slug');
    });

    it('the declared mode matches default-mode behavior when disabled', () => {
      const enabledFresh = selectWeaponMode(
        lbxWeapon(),
        ctx({ targetStructure: FRESH_STRUCTURE, distance: 4 }),
        true,
      );
      const disabled = selectWeaponMode(
        lbxWeapon(),
        ctx({ targetStructure: FRESH_STRUCTURE, distance: 4 }),
        false,
      );
      // Against a fresh short-range target both pick slug — the default.
      expect(enabledFresh.modeId).toBe(disabled.modeId);
    });
  });

  describe('determinism — pure function of its arguments', () => {
    it('repeated calls with identical arguments are identical', () => {
      const a = selectWeaponMode(ultraWeapon(), ctx(), true);
      const b = selectWeaponMode(ultraWeapon(), ctx(), true);
      expect(a).toEqual(b);
    });
  });
});
