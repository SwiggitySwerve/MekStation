/**
 * Explosive penalty invariants.
 *
 * Per MegaMek BV rules:
 *  - 'standard' explosives (ammo, gauss-ammo) cost 15 BV per slot
 *  - gauss/HVAC/reduced cost 1 BV per slot (HVAC counts as 1 effective slot)
 *  - Arm-mounted explosives transfer to the side torso for CASE checks
 *  - CASE protects the location for non-XL/XXL engines (sideTorsoSlots < 3)
 *  - CASE-II always protects the location
 *
 * The explosive-equipment-in-CT/HD path always penalizes regardless of CASE.
 */

import { EngineType } from '@/types/construction/EngineType';

import { calculateExplosivePenalties } from '../battleValueExplosivePenalties';

describe('calculateExplosivePenalties — base behaviour', () => {
  it('returns 0 penalty for an empty equipment list', () => {
    const result = calculateExplosivePenalties({
      equipment: [],
      caseLocations: [],
      caseIILocations: [],
    });
    expect(result.totalPenalty).toBe(0);
    expect(Object.keys(result.locationPenalties)).toHaveLength(0);
  });

  it('charges 15 BV per slot for standard explosives in CT', () => {
    const result = calculateExplosivePenalties({
      equipment: [{ location: 'CT', slots: 2, penaltyCategory: 'standard' }],
      caseLocations: [],
      caseIILocations: [],
    });
    expect(result.totalPenalty).toBe(30);
    expect(result.locationPenalties.CT).toBe(30);
  });

  it('charges 1 BV per slot for gauss-category explosives', () => {
    const result = calculateExplosivePenalties({
      equipment: [{ location: 'RT', slots: 7, penaltyCategory: 'gauss' }],
      caseLocations: [],
      caseIILocations: [],
    });
    // 1 × 7 = 7
    expect(result.totalPenalty).toBe(7);
  });

  it('treats HVAC as 1 effective slot regardless of declared slot count', () => {
    const result = calculateExplosivePenalties({
      equipment: [{ location: 'RT', slots: 6, penaltyCategory: 'hvac' }],
      caseLocations: [],
      caseIILocations: [],
    });
    expect(result.totalPenalty).toBe(1);
  });
});

describe('calculateExplosivePenalties — CASE handling (side torsos)', () => {
  it('CASE in side torso protects against penalty for standard engines (sideTorsoSlots < 3)', () => {
    const result = calculateExplosivePenalties({
      equipment: [{ location: 'LT', slots: 1, penaltyCategory: 'standard' }],
      caseLocations: ['LT'],
      caseIILocations: [],
      engineType: EngineType.STANDARD, // 0 side torso slots
    });
    expect(result.totalPenalty).toBe(0);
  });

  it('CASE does NOT protect when XL_IS engine claims ≥3 side torso slots', () => {
    const result = calculateExplosivePenalties({
      equipment: [{ location: 'LT', slots: 1, penaltyCategory: 'standard' }],
      caseLocations: ['LT'],
      caseIILocations: [],
      engineType: EngineType.XL_IS, // 3 side torso slots
    });
    // CASE bypassed at sideTorsoSlots >= 3 → 15 BV
    expect(result.totalPenalty).toBe(15);
  });

  it('CASE-II always protects the location regardless of engine', () => {
    const result = calculateExplosivePenalties({
      equipment: [{ location: 'LT', slots: 1, penaltyCategory: 'standard' }],
      caseLocations: [],
      caseIILocations: ['LT'],
      engineType: EngineType.XL_IS,
    });
    expect(result.totalPenalty).toBe(0);
  });
});

describe('calculateExplosivePenalties — arm transfer (biped only)', () => {
  it('arm explosive transfers to LT/RT for CASE evaluation in biped mechs', () => {
    // Arm has no CASE, but LT does → arm transfers, LT-CASE protects
    const result = calculateExplosivePenalties({
      equipment: [{ location: 'LA', slots: 1, penaltyCategory: 'standard' }],
      caseLocations: ['LT'],
      caseIILocations: [],
      engineType: EngineType.STANDARD,
    });
    // Arm → LT → LT has CASE & 0 side torso slots → no penalty
    expect(result.totalPenalty).toBe(0);
  });

  it('arm CASE alone protects the arm location (no transfer)', () => {
    const result = calculateExplosivePenalties({
      equipment: [{ location: 'RA', slots: 2, penaltyCategory: 'standard' }],
      caseLocations: ['RA'],
      caseIILocations: [],
    });
    expect(result.totalPenalty).toBe(0);
  });

  it('quad mechs do NOT transfer arm explosives (arms are legs)', () => {
    const result = calculateExplosivePenalties({
      equipment: [{ location: 'LA', slots: 1, penaltyCategory: 'standard' }],
      caseLocations: ['LT'],
      caseIILocations: [],
      isQuad: true,
    });
    // No arm-to-torso transfer for quads ⇒ LA penalty applies in full
    expect(result.totalPenalty).toBe(15);
  });
});

describe('calculateExplosivePenalties — multi-location aggregation', () => {
  it('sums penalties across multiple locations', () => {
    const result = calculateExplosivePenalties({
      equipment: [
        { location: 'CT', slots: 1, penaltyCategory: 'standard' },
        { location: 'HD', slots: 2, penaltyCategory: 'standard' },
        { location: 'RT', slots: 7, penaltyCategory: 'gauss' },
      ],
      caseLocations: [],
      caseIILocations: [],
    });
    // CT 15 + HD 30 + RT 7 = 52
    expect(result.totalPenalty).toBe(52);
    expect(result.locationPenalties.CT).toBe(15);
    expect(result.locationPenalties.HD).toBe(30);
    expect(result.locationPenalties.RT).toBe(7);
  });
});
