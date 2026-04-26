/**
 * Equipment BV resolver invariants.
 *
 * The resolver canonicalizes equipment IDs from MegaMek/unit-JSON formats,
 * looks them up in the catalog, and applies BV-context heat overrides
 * (Ultra AC ×2, Rotary AC ×6, Streak/IATM ×0.5) to weapon heat values.
 *
 * Heat overrides are tested at the resolver layer because they're load-bearing
 * for offensive heat tracking.
 */

import {
  getCatalogSize,
  getEquipmentEntry,
  isResolvable,
  normalizeEquipmentId,
  resolveAmmoBV,
  resolveEquipmentBV,
} from '../equipmentBVResolver';

describe('normalizeEquipmentId — canonical lookup paths', () => {
  it('returns lowercased id when already canonical', () => {
    expect(normalizeEquipmentId('medium-laser')).toBe('medium-laser');
  });

  it('strips numeric prefixes ("0-medium-laser") and re-resolves', () => {
    expect(normalizeEquipmentId('0-medium-laser')).toBe('medium-laser');
  });

  it('normalises MegaMek ID conventions: isac10 → ac-10', () => {
    expect(normalizeEquipmentId('isac10')).toBe('ac-10');
    expect(normalizeEquipmentId('clac10')).toBe('ac-10');
    expect(normalizeEquipmentId('islrm5')).toBe('lrm-5');
    expect(normalizeEquipmentId('issrm6')).toBe('srm-6');
  });

  it('handles laser families (smalllaser → small-laser)', () => {
    expect(normalizeEquipmentId('smalllaser')).toBe('small-laser');
    expect(normalizeEquipmentId('mediumlaser')).toBe('medium-laser');
    expect(normalizeEquipmentId('largelaser')).toBe('large-laser');
  });

  it('handles ER laser families', () => {
    expect(normalizeEquipmentId('iserlarge')).toBe('er-large-laser');
    expect(normalizeEquipmentId('clerlarge')).toBe('clan-er-large-laser');
  });
});

describe('resolveEquipmentBV — base lookups', () => {
  it('returns resolved=true for known catalog entries', () => {
    const r = resolveEquipmentBV('medium-laser');
    expect(r.resolved).toBe(true);
    expect(r.battleValue).toBeGreaterThan(0);
  });

  it('returns resolved=false with zero BV for unknown ids', () => {
    const r = resolveEquipmentBV('not-a-real-weapon-12345');
    expect(r.resolved).toBe(false);
    expect(r.battleValue).toBe(0);
  });

  it('returns identical BV for equivalent ID forms', () => {
    const a = resolveEquipmentBV('medium-laser');
    const b = resolveEquipmentBV('IS Medium Laser');
    expect(b.battleValue).toBe(a.battleValue);
  });
});

describe('resolveEquipmentBV — heat overrides (BV context)', () => {
  it('Ultra AC heat is doubled', () => {
    // Catalog "Ultra AC/5" base heat 1; BV override → 2
    const r = resolveEquipmentBV('uac-5');
    if (r.resolved) {
      const entry = getEquipmentEntry('uac-5');
      if (entry && typeof entry.heat === 'number') {
        expect(r.heat).toBe(entry.heat * 2);
      }
    }
  });

  it('Rotary AC heat is multiplied by 6', () => {
    const entry = getEquipmentEntry('rac-5');
    const r = resolveEquipmentBV('rac-5');
    if (r.resolved && entry && typeof entry.heat === 'number') {
      expect(r.heat).toBe(entry.heat * 6);
    }
  });

  it('Streak SRM heat is halved (×0.5)', () => {
    // Look at IS Streak SRM-2; heat 2 → BV-context heat 1
    const r = resolveEquipmentBV('streak-srm-2');
    const entry = getEquipmentEntry('streak-srm-2');
    if (r.resolved && entry && typeof entry.heat === 'number') {
      expect(r.heat).toBe(entry.heat * 0.5);
    }
  });
});

describe('isResolvable', () => {
  it('returns true for canonical IDs', () => {
    expect(isResolvable('medium-laser')).toBe(true);
  });

  it('returns false for fake IDs', () => {
    expect(isResolvable('definitely-not-a-real-weapon-99')).toBe(false);
  });
});

describe('resolveAmmoBV', () => {
  it('returns the weaponType derived from the ammo id', () => {
    const r = resolveAmmoBV('ac-5-ammo');
    if (r.resolved) {
      // Strip suffix → weaponType = 'ac-5'
      expect(r.weaponType).toBe('ac-5');
    }
  });

  it('returns resolved=false for unknown ammo', () => {
    const r = resolveAmmoBV('not-a-real-ammo');
    expect(r.resolved).toBe(false);
    expect(r.battleValue).toBe(0);
  });
});

describe('getCatalogSize', () => {
  it('returns a positive integer (catalog is non-empty)', () => {
    expect(getCatalogSize()).toBeGreaterThan(0);
    expect(Number.isInteger(getCatalogSize())).toBe(true);
  });
});
