/**
 * Tests for INDIRECT_ELIGIBLE_WEAPON_FAMILIES + isIndirectFireCapable.
 *
 * Covers §4.1 + §4.5 of the add-indirect-fire-and-spotter-network change:
 *   - The SSoT constant enumerates all 5 eligible families
 *   - isIndirectFireCapable accepts LRM / Improved LRM / NLRM / MML-LRM /
 *     Mek Mortar weapons and rejects everything else
 *   - Streak variants are explicitly NOT eligible (lock-on requires LOS)
 *   - Direct-fire ballistics (AC/20, PPC, Gauss) are NOT eligible
 */

import {
  INDIRECT_ELIGIBLE_WEAPON_FAMILIES,
  isIndirectFireCapable,
} from '../indirectFire';

describe('INDIRECT_ELIGIBLE_WEAPON_FAMILIES (SSoT constant)', () => {
  it('enumerates the 5 indirect-eligible weapon families', () => {
    expect(INDIRECT_ELIGIBLE_WEAPON_FAMILIES).toEqual([
      'LRM',
      'LRM_IMP',
      'MML_LRM',
      'MEK_MORTAR',
      'NLRM',
    ]);
  });

  it('contains no duplicates', () => {
    const unique = new Set(INDIRECT_ELIGIBLE_WEAPON_FAMILIES);
    expect(unique.size).toBe(INDIRECT_ELIGIBLE_WEAPON_FAMILIES.length);
  });
});

describe('isIndirectFireCapable', () => {
  // Eligible families
  it('accepts standard LRM-5/10/15/20', () => {
    expect(isIndirectFireCapable('lrm-5')).toBe(true);
    expect(isIndirectFireCapable('lrm-10')).toBe(true);
    expect(isIndirectFireCapable('lrm-15')).toBe(true);
    expect(isIndirectFireCapable('lrm-20')).toBe(true);
  });

  it('accepts Clan LRM variants (cLRM-N)', () => {
    expect(isIndirectFireCapable('clan-lrm-10')).toBe(true);
    expect(isIndirectFireCapable('clrm-15')).toBe(true);
  });

  it('accepts Improved LRM (LRM-IMP family)', () => {
    expect(isIndirectFireCapable('lrm-imp-10')).toBe(true);
    expect(isIndirectFireCapable('improved-lrm-15')).toBe(true);
  });

  it('accepts NARC-launchable LRM (NLRM family)', () => {
    expect(isIndirectFireCapable('nlrm-10')).toBe(true);
  });

  it('accepts MML in LRM mode (substring match via "lrm")', () => {
    expect(isIndirectFireCapable('mml-9-lrm')).toBe(true);
  });

  it('accepts Mek Mortar light + heavy', () => {
    expect(isIndirectFireCapable('mek-mortar-4')).toBe(true);
    expect(isIndirectFireCapable('mek-mortar-8')).toBe(true);
    expect(isIndirectFireCapable('mortar-2')).toBe(true);
  });

  // Excluded
  it('rejects Streak SRM/LRM (lock-on requires LOS)', () => {
    expect(isIndirectFireCapable('streak-srm-2')).toBe(false);
    expect(isIndirectFireCapable('streak-srm-6')).toBe(false);
    expect(isIndirectFireCapable('streak-lrm-15')).toBe(false);
  });

  it('rejects direct-fire ballistics', () => {
    expect(isIndirectFireCapable('auto-cannon-ac-20')).toBe(false);
    expect(isIndirectFireCapable('gauss-rifle')).toBe(false);
    expect(isIndirectFireCapable('ppc')).toBe(false);
    expect(isIndirectFireCapable('large-laser')).toBe(false);
    expect(isIndirectFireCapable('srm-4')).toBe(false);
  });

  it('rejects MML in SRM mode (no "lrm" substring)', () => {
    // §4.5 spec: MML loaded with SRM ammo is NOT eligible for indirect.
    expect(isIndirectFireCapable('mml-9-srm')).toBe(false);
  });
});
