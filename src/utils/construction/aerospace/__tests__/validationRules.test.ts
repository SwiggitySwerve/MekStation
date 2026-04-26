/**
 * Aerospace VAL-AERO-* validation rule invariants.
 *
 * Each rule is responsible for one construction constraint:
 *   VAL-AERO-TONNAGE      tonnage range per sub-type
 *   VAL-AERO-THRUST       engine legality + safe thrust cap
 *   VAL-AERO-SI           SI ≤ class max
 *   VAL-AERO-FUEL         fuel ≥ class minimum
 *   VAL-AERO-ARC-MAX      per-arc armor ≤ arc max
 *   VAL-AERO-CREW         small craft must allocate quarters
 */

import {
  AerospaceArc,
  AerospaceEngineType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  AERO_VALIDATION_RULE_IDS,
  validateAerospaceUnit,
  validateArcArmor,
  validateCrew,
  validateFuel,
  validateSI,
  validateThrust,
  validateTonnage,
} from '../validationRules';

describe('validateTonnage (VAL-AERO-TONNAGE)', () => {
  it('passes for ASF in 5-100 t range', () => {
    expect(validateTonnage(50, AerospaceSubType.AEROSPACE_FIGHTER)).toEqual([]);
    expect(validateTonnage(5, AerospaceSubType.AEROSPACE_FIGHTER)).toEqual([]);
    expect(validateTonnage(100, AerospaceSubType.AEROSPACE_FIGHTER)).toEqual(
      [],
    );
  });

  it('flags ASF tonnage outside 5-100', () => {
    expect(validateTonnage(4, AerospaceSubType.AEROSPACE_FIGHTER)).toHaveLength(
      1,
    );
    expect(
      validateTonnage(101, AerospaceSubType.AEROSPACE_FIGHTER),
    ).toHaveLength(1);
  });

  it('uses CF range 5-50', () => {
    expect(validateTonnage(50, AerospaceSubType.CONVENTIONAL_FIGHTER)).toEqual(
      [],
    );
    expect(
      validateTonnage(51, AerospaceSubType.CONVENTIONAL_FIGHTER),
    ).toHaveLength(1);
  });

  it('uses small-craft range 100-200', () => {
    expect(validateTonnage(100, AerospaceSubType.SMALL_CRAFT)).toEqual([]);
    expect(validateTonnage(99, AerospaceSubType.SMALL_CRAFT)).toHaveLength(1);
    expect(validateTonnage(201, AerospaceSubType.SMALL_CRAFT)).toHaveLength(1);
  });
});

describe('validateThrust (VAL-AERO-THRUST)', () => {
  it('flags illegal engine type for sub-type', () => {
    const errs = validateThrust(
      AerospaceEngineType.FUSION,
      6,
      AerospaceSubType.CONVENTIONAL_FIGHTER,
    );
    expect(errs).toHaveLength(1);
    expect(errs[0].ruleId).toBe('VAL-AERO-THRUST');
  });

  it('flags safeThrust above class cap', () => {
    const errs = validateThrust(
      AerospaceEngineType.FUSION,
      13, // ASF cap = 12
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    expect(errs).toHaveLength(1);
  });

  it('returns empty when both checks pass', () => {
    const errs = validateThrust(
      AerospaceEngineType.FUSION,
      8,
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    expect(errs).toEqual([]);
  });
});

describe('validateSI (VAL-AERO-SI)', () => {
  it('flags SI above class max', () => {
    expect(validateSI(21, AerospaceSubType.AEROSPACE_FIGHTER)).toHaveLength(1); // max 20
    expect(validateSI(16, AerospaceSubType.CONVENTIONAL_FIGHTER)).toHaveLength(
      1,
    ); // max 15
  });

  it('passes when SI is at or below max', () => {
    expect(validateSI(20, AerospaceSubType.AEROSPACE_FIGHTER)).toEqual([]);
    expect(validateSI(30, AerospaceSubType.SMALL_CRAFT)).toEqual([]);
  });
});

describe('validateFuel (VAL-AERO-FUEL)', () => {
  it('flags fuel tonnage below sub-type minimum', () => {
    expect(validateFuel(4, AerospaceSubType.AEROSPACE_FIGHTER)).toHaveLength(1);
    expect(validateFuel(1, AerospaceSubType.CONVENTIONAL_FIGHTER)).toHaveLength(
      1,
    );
    expect(validateFuel(19, AerospaceSubType.SMALL_CRAFT)).toHaveLength(1);
  });

  it('passes at or above minimum', () => {
    expect(validateFuel(5, AerospaceSubType.AEROSPACE_FIGHTER)).toEqual([]);
    expect(validateFuel(20, AerospaceSubType.SMALL_CRAFT)).toEqual([]);
  });
});

describe('validateArcArmor (VAL-AERO-ARC-MAX)', () => {
  const subType = AerospaceSubType.AEROSPACE_FIGHTER;
  it('passes when each arc is within its max', () => {
    // 50 t ASF: Nose 14, Wings 10, Aft 6
    const errs = validateArcArmor(
      {
        [AerospaceArc.NOSE]: 14,
        [AerospaceArc.LEFT_WING]: 10,
        [AerospaceArc.RIGHT_WING]: 10,
        [AerospaceArc.AFT]: 6,
      },
      50,
      subType,
    );
    expect(errs).toEqual([]);
  });

  it('flags arcs that exceed their max', () => {
    const errs = validateArcArmor(
      {
        [AerospaceArc.NOSE]: 99, // way over
      },
      50,
      subType,
    );
    expect(errs).toHaveLength(1);
    expect(errs[0].ruleId).toBe('VAL-AERO-ARC-MAX');
  });

  it('ignores arcs that are not applicable to the sub-type (max=0)', () => {
    // ASF has no LEFT_SIDE; supplying points there is silently fine
    const errs = validateArcArmor(
      {
        [AerospaceArc.LEFT_SIDE]: 5,
      },
      50,
      subType,
    );
    expect(errs).toEqual([]);
  });
});

describe('validateCrew (VAL-AERO-CREW)', () => {
  it('is a no-op for ASF and CF', () => {
    expect(validateCrew(AerospaceSubType.AEROSPACE_FIGHTER, 0, 0)).toEqual([]);
    expect(validateCrew(AerospaceSubType.CONVENTIONAL_FIGHTER, 0, 0)).toEqual(
      [],
    );
  });

  it('flags small craft missing quarters', () => {
    const errs = validateCrew(AerospaceSubType.SMALL_CRAFT, 0, 3);
    expect(errs.some((e) => /quarters/.test(e.message))).toBe(true);
  });

  it('flags small craft missing crew', () => {
    const errs = validateCrew(AerospaceSubType.SMALL_CRAFT, 20, 0);
    expect(errs.some((e) => /at least 1 crew/.test(e.message))).toBe(true);
  });
});

describe('validateAerospaceUnit (full runner)', () => {
  it('returns no errors for a legal ASF', () => {
    const errs = validateAerospaceUnit({
      tonnage: 50,
      subType: AerospaceSubType.AEROSPACE_FIGHTER,
      engineType: AerospaceEngineType.FUSION,
      safeThrust: 6,
      structuralIntegrity: 5,
      fuelTons: 5,
      arcArmor: {
        [AerospaceArc.NOSE]: 10,
        [AerospaceArc.LEFT_WING]: 8,
        [AerospaceArc.RIGHT_WING]: 8,
        [AerospaceArc.AFT]: 4,
      },
      quartersTons: 0,
      crewCount: 0,
    });
    expect(errs).toEqual([]);
  });

  it('aggregates errors across all rules', () => {
    const errs = validateAerospaceUnit({
      tonnage: 1000, // VAL-AERO-TONNAGE
      subType: AerospaceSubType.AEROSPACE_FIGHTER,
      engineType: AerospaceEngineType.ICE, // illegal for ASF → VAL-AERO-THRUST
      safeThrust: 99, // > cap → VAL-AERO-THRUST
      structuralIntegrity: 99, // > class max → VAL-AERO-SI
      fuelTons: 0, // < min → VAL-AERO-FUEL
      arcArmor: {},
      quartersTons: 0,
      crewCount: 0,
    });
    expect(errs.length).toBeGreaterThanOrEqual(4);
  });
});

describe('AERO_VALIDATION_RULE_IDS', () => {
  it('exposes the canonical 8 rule ids', () => {
    expect(AERO_VALIDATION_RULE_IDS).toEqual([
      'VAL-AERO-TONNAGE',
      'VAL-AERO-THRUST',
      'VAL-AERO-SI',
      'VAL-AERO-FUEL',
      'VAL-AERO-ARC-MAX',
      'VAL-AERO-CREW',
      'VAL-AERO-WING-HEAVY',
      'VAL-AERO-BOMB-BAY',
    ]);
  });
});
