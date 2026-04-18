/**
 * Battle Armor BV — Unit Tests
 *
 * Covers every SHALL/MUST from the spec deltas and the five canonical BA
 * archetypes called out by the change (Elemental, Cavalier, Sylph, IS
 * Standard, Gnome). Uses `bvOverride` for weapons/ammo so tests are
 * catalog-independent.
 *
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
 */

import {
  BAArmorType,
  BAManipulator,
  BAWeightClass,
} from '@/types/unit/BattleArmorInterfaces';

import {
  calculateBADefensiveBV,
  calculateBAOffensiveBV,
  calculateBattleArmorBV,
  getBAArmorBVMultiplier,
  getBAManipulatorMeleeBV,
  getBAMoveClassMultiplier,
  type IBattleArmorBVInput,
} from '../battleArmorBV';

// =============================================================================
// Helper — build a baseline input quickly.
// =============================================================================

function baseInput(
  overrides: Partial<IBattleArmorBVInput> = {},
): IBattleArmorBVInput {
  return {
    weightClass: BAWeightClass.MEDIUM,
    squadSize: 5,
    groundMP: 1,
    jumpMP: 0,
    umuMP: 0,
    armorPointsPerTrooper: 5,
    armorType: BAArmorType.STANDARD,
    manipulators: {
      left: BAManipulator.NONE,
      right: BAManipulator.NONE,
    },
    weapons: [],
    ammo: [],
    hasMagneticClamp: false,
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

// =============================================================================
// Armor-Type Multiplier Table
// =============================================================================

describe('getBAArmorBVMultiplier', () => {
  it('returns 1.0 for Standard armor', () => {
    expect(getBAArmorBVMultiplier(BAArmorType.STANDARD)).toBe(1.0);
  });

  it('returns 1.5 for every Stealth variant', () => {
    expect(getBAArmorBVMultiplier(BAArmorType.STEALTH_BASIC)).toBe(1.5);
    expect(getBAArmorBVMultiplier(BAArmorType.STEALTH_IMPROVED)).toBe(1.5);
    expect(getBAArmorBVMultiplier(BAArmorType.STEALTH_PROTOTYPE)).toBe(1.5);
  });

  it('returns 1.5 for Mimetic', () => {
    expect(getBAArmorBVMultiplier(BAArmorType.MIMETIC)).toBe(1.5);
  });

  it('returns 1.3 for Reactive and Reflective', () => {
    expect(getBAArmorBVMultiplier(BAArmorType.REACTIVE)).toBe(1.3);
    expect(getBAArmorBVMultiplier(BAArmorType.REFLECTIVE)).toBe(1.3);
  });

  it('returns 1.1 for Fire-Resistant', () => {
    expect(getBAArmorBVMultiplier(BAArmorType.FIRE_RESISTANT)).toBe(1.1);
  });
});

// =============================================================================
// Move Class Multiplier Table
// =============================================================================

describe('getBAMoveClassMultiplier', () => {
  it('returns 0.5 for PA(L) and Light', () => {
    expect(getBAMoveClassMultiplier(BAWeightClass.PA_L)).toBe(0.5);
    expect(getBAMoveClassMultiplier(BAWeightClass.LIGHT)).toBe(0.5);
  });

  it('returns 0.75 for Medium', () => {
    expect(getBAMoveClassMultiplier(BAWeightClass.MEDIUM)).toBe(0.75);
  });

  it('returns 1.0 for Heavy', () => {
    expect(getBAMoveClassMultiplier(BAWeightClass.HEAVY)).toBe(1.0);
  });

  it('returns 1.5 for Assault', () => {
    expect(getBAMoveClassMultiplier(BAWeightClass.ASSAULT)).toBe(1.5);
  });
});

// =============================================================================
// Manipulator Melee BV
// =============================================================================

describe('getBAManipulatorMeleeBV', () => {
  it('returns 3 for Vibro-Claw', () => {
    expect(getBAManipulatorMeleeBV(BAManipulator.VIBRO_CLAW)).toBe(3);
  });

  it('returns 2 for Heavy Claw', () => {
    expect(getBAManipulatorMeleeBV(BAManipulator.HEAVY_CLAW)).toBe(2);
  });

  it('returns 1 for Battle Claw', () => {
    expect(getBAManipulatorMeleeBV(BAManipulator.BATTLE_CLAW)).toBe(1);
  });

  it('returns 0 for Basic Claw and None', () => {
    expect(getBAManipulatorMeleeBV(BAManipulator.BASIC_CLAW)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.NONE)).toBe(0);
  });

  it('returns 0 for utility manipulators (Cargo Lifter, Industrial Drill, Magnet, Mine Clearance)', () => {
    expect(getBAManipulatorMeleeBV(BAManipulator.CARGO_LIFTER)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.INDUSTRIAL_DRILL)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.MAGNET)).toBe(0);
    expect(getBAManipulatorMeleeBV(BAManipulator.MINE_CLEARANCE)).toBe(0);
  });
});

// =============================================================================
// Defensive BV — per spec scenarios
// =============================================================================

describe('calculateBADefensiveBV', () => {
  // Spec: Armor BV with Standard armor — 5 × 2.5 × 1.0 = 12.5
  it('standard armor: armorBV = armorPoints × 2.5 × 1.0', () => {
    const d = calculateBADefensiveBV(
      baseInput({ armorPointsPerTrooper: 5, armorType: BAArmorType.STANDARD }),
    );
    expect(d.armorBV).toBe(12.5);
  });

  // Spec: Stealth armor multiplier — 5 × 2.5 × 1.5 = 18.75
  it('basic stealth armor: armorBV = armorPoints × 2.5 × 1.5', () => {
    const d = calculateBADefensiveBV(
      baseInput({
        armorPointsPerTrooper: 5,
        armorType: BAArmorType.STEALTH_BASIC,
      }),
    );
    expect(d.armorBV).toBe(18.75);
  });

  // Spec: Move BV by class — Medium trooper ground MP 2 -> 2 × 0.75 = 1.5
  it('move BV scales by class × groundMP', () => {
    const d = calculateBADefensiveBV(
      baseInput({ weightClass: BAWeightClass.MEDIUM, groundMP: 2 }),
    );
    expect(d.moveBV).toBeCloseTo(1.5, 10);
  });

  it('jump BV = max(jump, umu) × 0.5', () => {
    const jumpOnly = calculateBADefensiveBV(baseInput({ jumpMP: 3, umuMP: 0 }));
    expect(jumpOnly.jumpBV).toBe(1.5);

    const umuOnly = calculateBADefensiveBV(baseInput({ jumpMP: 0, umuMP: 4 }));
    expect(umuOnly.jumpBV).toBe(2.0);

    // Jump and UMU share the slot — BV takes the higher of the two.
    const both = calculateBADefensiveBV(baseInput({ jumpMP: 2, umuMP: 4 }));
    expect(both.jumpBV).toBe(2.0);
  });

  // Spec: Magnetic Clamp anti-mech bonus — +5 per trooper
  it('adds 5 BV anti-mech bonus when Magnetic Clamps are present', () => {
    const without = calculateBADefensiveBV(baseInput());
    const withClamp = calculateBADefensiveBV(
      baseInput({ hasMagneticClamp: true }),
    );
    expect(without.antiMechBonus).toBe(0);
    expect(withClamp.antiMechBonus).toBe(5);
    expect(withClamp.total - without.total).toBe(5);
  });

  it('total defensive = armorBV + moveBV + jumpBV + antiMechBonus', () => {
    const d = calculateBADefensiveBV(
      baseInput({
        armorPointsPerTrooper: 10,
        armorType: BAArmorType.STANDARD,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 1,
        jumpMP: 0,
        hasMagneticClamp: true,
      }),
    );
    // 10 × 2.5 × 1.0 + 1 × 1.0 + 0 + 5 = 25 + 1 + 0 + 5 = 31
    expect(d.armorBV).toBe(25);
    expect(d.moveBV).toBe(1);
    expect(d.jumpBV).toBe(0);
    expect(d.antiMechBonus).toBe(5);
    expect(d.total).toBe(31);
  });
});

// =============================================================================
// Offensive BV — per spec scenarios
// =============================================================================

describe('calculateBAOffensiveBV', () => {
  // Spec: Manipulator melee BV — Vibro-Claws × 2 = 6 BV
  it('manipulator BV sums BOTH arms (Vibro-Claw ×2 = 6)', () => {
    const o = calculateBAOffensiveBV(
      baseInput({
        manipulators: {
          left: BAManipulator.VIBRO_CLAW,
          right: BAManipulator.VIBRO_CLAW,
        },
      }),
    );
    expect(o.manipulatorBV).toBe(6);
  });

  it('manipulator BV mixes left/right correctly (Battle + Heavy = 3)', () => {
    const o = calculateBAOffensiveBV(
      baseInput({
        manipulators: {
          left: BAManipulator.BATTLE_CLAW,
          right: BAManipulator.HEAVY_CLAW,
        },
      }),
    );
    expect(o.manipulatorBV).toBe(3);
  });

  // Spec: Weapon BV identical to catalog — SRM-2 (catalog BV 21)
  it('weaponBV uses override when provided (SRM-2 = 21)', () => {
    const o = calculateBAOffensiveBV(
      baseInput({
        weapons: [{ id: 'srm-2', bvOverride: 21 }],
      }),
    );
    expect(o.weaponBV).toBe(21);
  });

  it('ammoBV uses override when provided', () => {
    const o = calculateBAOffensiveBV(
      baseInput({
        weapons: [{ id: 'srm-2', bvOverride: 21 }],
        ammo: [{ id: 'srm-2-ammo', bvOverride: 3 }],
      }),
    );
    expect(o.ammoBV).toBe(3);
  });

  it('total offensive = weapons + ammo + manipulators', () => {
    const o = calculateBAOffensiveBV(
      baseInput({
        weapons: [
          { id: 'srm-2', bvOverride: 21 },
          { id: 'flamer', bvOverride: 6 },
        ],
        ammo: [{ id: 'srm-2-ammo', bvOverride: 3 }],
        manipulators: {
          left: BAManipulator.BATTLE_CLAW,
          right: BAManipulator.BATTLE_CLAW,
        },
      }),
    );
    // 21 + 6 + 3 + 2 = 32
    expect(o.weaponBV).toBe(27);
    expect(o.ammoBV).toBe(3);
    expect(o.manipulatorBV).toBe(2);
    expect(o.total).toBe(32);
  });
});

// =============================================================================
// Squad Scaling + Pilot Skill — per spec scenarios
// =============================================================================

describe('calculateBattleArmorBV — squad scaling', () => {
  // Spec: Clan 5-trooper squad — trooperBV=100 × 5 = 500 (before pilot skill)
  it('Clan 5-trooper squad: trooperBV × 5 (before pilot)', () => {
    // Build inputs that yield exactly 100 per-trooper BV:
    //   armorBV = 20 × 2.5 × 1.0 = 50
    //   moveBV  = 2 × 1.0 = 2 (Heavy class)
    //   weapons = 48 via override
    //   total   = 50 + 2 + 48 = 100
    const b = calculateBattleArmorBV(
      baseInput({
        squadSize: 5,
        armorPointsPerTrooper: 20,
        armorType: BAArmorType.STANDARD,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 48 }],
      }),
    );
    expect(b.perTrooper.total).toBe(100);
    expect(b.squadSize).toBe(5);
    expect(b.squadTotal).toBe(500);
  });

  // Spec: IS 4-trooper squad — trooperBV=80 × 4 = 320 (before pilot skill)
  it('IS 4-trooper squad: trooperBV × 4 (before pilot)', () => {
    //   armorBV = 10 × 2.5 × 1.0 = 25
    //   moveBV  = 2 × 1.0 = 2 (Heavy)
    //   weapons = 53 via override
    //   total   = 25 + 2 + 53 = 80
    const b = calculateBattleArmorBV(
      baseInput({
        squadSize: 4,
        armorPointsPerTrooper: 10,
        armorType: BAArmorType.STANDARD,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 53 }],
      }),
    );
    expect(b.perTrooper.total).toBe(80);
    expect(b.squadSize).toBe(4);
    expect(b.squadTotal).toBe(320);
  });

  // Spec: Elite BA crew — pilot multiplier read from g=3 p=4 row
  it('applies pilot skill multiplier at the end', () => {
    const b = calculateBattleArmorBV(
      baseInput({
        squadSize: 5,
        armorPointsPerTrooper: 20,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 48 }],
        gunnery: 3,
        piloting: 4,
      }),
    );
    // matrix[3][4] = 1.32 — 500 × 1.32 = 660
    expect(b.pilotMultiplier).toBe(1.32);
    expect(b.final).toBe(660);
  });

  it('baseline pilot (4/5) leaves squad BV unchanged', () => {
    const b = calculateBattleArmorBV(
      baseInput({
        squadSize: 5,
        armorPointsPerTrooper: 20,
        weightClass: BAWeightClass.HEAVY,
        groundMP: 2,
        weapons: [{ id: 'x', bvOverride: 48 }],
      }),
    );
    expect(b.pilotMultiplier).toBe(1.0);
    expect(b.final).toBe(500);
  });

  it('clamps squadSize to at least 1', () => {
    const b = calculateBattleArmorBV(baseInput({ squadSize: 0 }));
    expect(b.squadSize).toBe(1);
  });
});

// =============================================================================
// Canonical Archetypes — one test per BA called out in tasks.md 8.2
// =============================================================================

describe('canonical BA archetypes', () => {
  // Elemental — Clan Heavy, 5 troopers, SRM-2 + Small Laser per trooper
  it('Clan Elemental (Heavy, 5 troopers, SRM-2 + Small Laser)', () => {
    const b = calculateBattleArmorBV({
      weightClass: BAWeightClass.HEAVY,
      squadSize: 5,
      groundMP: 1,
      jumpMP: 3,
      umuMP: 0,
      armorPointsPerTrooper: 10,
      armorType: BAArmorType.STANDARD,
      manipulators: {
        left: BAManipulator.BATTLE_CLAW,
        right: BAManipulator.BATTLE_CLAW,
      },
      weapons: [
        { id: 'srm-2', bvOverride: 21 }, // canonical SRM-2
        { id: 'small-laser', bvOverride: 9 }, // Small Laser
      ],
      ammo: [{ id: 'srm-2-ammo', bvOverride: 3 }],
      hasMagneticClamp: true,
      gunnery: 4,
      piloting: 5,
    });
    // Defensive: 10 × 2.5 × 1.0 + 1 × 1.0 + 3 × 0.5 + 5 = 25 + 1 + 1.5 + 5 = 32.5
    // Offensive: 21 + 9 + 3 + 2 = 35
    // Trooper:   67.5 → Squad: 337.5 → Pilot 1.0 → Final 338
    expect(b.perTrooper.defensive.total).toBeCloseTo(32.5, 10);
    expect(b.perTrooper.offensive.total).toBe(35);
    expect(b.perTrooper.total).toBeCloseTo(67.5, 10);
    expect(b.squadSize).toBe(5);
    expect(b.squadTotal).toBeCloseTo(337.5, 10);
    expect(b.final).toBe(338); // round(337.5 × 1.0)
  });

  // Cavalier — IS Medium, 4 troopers, twin machine guns + Battle Claw
  it('IS Cavalier (Medium, 4 troopers, twin MG + Battle Claw)', () => {
    const b = calculateBattleArmorBV({
      weightClass: BAWeightClass.MEDIUM,
      squadSize: 4,
      groundMP: 2,
      jumpMP: 0,
      umuMP: 0,
      armorPointsPerTrooper: 7,
      armorType: BAArmorType.STANDARD,
      manipulators: {
        left: BAManipulator.BATTLE_CLAW,
        right: BAManipulator.BATTLE_CLAW,
      },
      weapons: [
        { id: 'machine-gun', bvOverride: 5 },
        { id: 'machine-gun', bvOverride: 5 },
      ],
      ammo: [{ id: 'mg-ammo', bvOverride: 1 }],
      hasMagneticClamp: false,
      gunnery: 4,
      piloting: 5,
    });
    // Defensive: 7 × 2.5 × 1.0 + 2 × 0.75 + 0 + 0 = 17.5 + 1.5 = 19
    // Offensive: 5 + 5 + 1 + 2 = 13
    // Trooper:   32 → Squad: 128 → Pilot 1.0 → Final 128
    expect(b.perTrooper.defensive.total).toBe(19);
    expect(b.perTrooper.offensive.total).toBe(13);
    expect(b.perTrooper.total).toBe(32);
    expect(b.squadTotal).toBe(128);
    expect(b.final).toBe(128);
  });

  // Sylph — Clan Light VTOL, 5 troopers, ER Small Laser
  it('Clan Sylph (Light VTOL, 5 troopers, ER Small Laser)', () => {
    const b = calculateBattleArmorBV({
      weightClass: BAWeightClass.LIGHT,
      squadSize: 5,
      groundMP: 1,
      jumpMP: 7, // VTOL flight MP stored as jumpMP for BV purposes
      umuMP: 0,
      armorPointsPerTrooper: 4,
      armorType: BAArmorType.STANDARD,
      manipulators: {
        left: BAManipulator.NONE,
        right: BAManipulator.NONE,
      },
      weapons: [{ id: 'er-small-laser', bvOverride: 17 }],
      ammo: [],
      hasMagneticClamp: false,
      gunnery: 4,
      piloting: 5,
    });
    // Defensive: 4 × 2.5 × 1.0 + 1 × 0.5 + 7 × 0.5 + 0 = 10 + 0.5 + 3.5 = 14
    // Offensive: 17 + 0 + 0 = 17
    // Trooper:   31 → Squad: 155 → Pilot 1.0 → Final 155
    expect(b.perTrooper.defensive.total).toBe(14);
    expect(b.perTrooper.offensive.total).toBe(17);
    expect(b.perTrooper.total).toBe(31);
    expect(b.squadTotal).toBe(155);
    expect(b.final).toBe(155);
  });

  // IS Standard — IS Medium, 4 troopers, SRM-2 per trooper, no magnetic clamp
  it('IS Standard (Medium, 4 troopers, SRM-2)', () => {
    const b = calculateBattleArmorBV({
      weightClass: BAWeightClass.MEDIUM,
      squadSize: 4,
      groundMP: 1,
      jumpMP: 3,
      umuMP: 0,
      armorPointsPerTrooper: 6,
      armorType: BAArmorType.STANDARD,
      manipulators: {
        left: BAManipulator.BATTLE_CLAW,
        right: BAManipulator.BATTLE_CLAW,
      },
      weapons: [{ id: 'srm-2', bvOverride: 21 }],
      ammo: [{ id: 'srm-2-ammo', bvOverride: 3 }],
      hasMagneticClamp: true,
      gunnery: 4,
      piloting: 5,
    });
    // Defensive: 6 × 2.5 × 1.0 + 1 × 0.75 + 3 × 0.5 + 5 = 15 + 0.75 + 1.5 + 5 = 22.25
    // Offensive: 21 + 3 + 2 = 26
    // Trooper:   48.25 → Squad: 193 → Pilot 1.0 → Final 193
    expect(b.perTrooper.defensive.total).toBeCloseTo(22.25, 10);
    expect(b.perTrooper.offensive.total).toBe(26);
    expect(b.perTrooper.total).toBeCloseTo(48.25, 10);
    expect(b.squadTotal).toBe(193);
    expect(b.final).toBe(193);
  });

  // Gnome — Clan Assault, 5 troopers, heavy armor, Heavy Battle Claw
  it('Clan Gnome (Assault, 5 troopers, Heavy Battle Claw + heavy armor)', () => {
    const b = calculateBattleArmorBV({
      weightClass: BAWeightClass.ASSAULT,
      squadSize: 5,
      groundMP: 1,
      jumpMP: 0,
      umuMP: 0,
      armorPointsPerTrooper: 14,
      armorType: BAArmorType.STANDARD,
      manipulators: {
        left: BAManipulator.HEAVY_CLAW,
        right: BAManipulator.HEAVY_CLAW,
      },
      weapons: [
        { id: 'srm-4', bvOverride: 39 },
        { id: 'heavy-support-laser', bvOverride: 15 },
      ],
      ammo: [{ id: 'srm-4-ammo', bvOverride: 5 }],
      hasMagneticClamp: true,
      gunnery: 4,
      piloting: 5,
    });
    // Defensive: 14 × 2.5 × 1.0 + 1 × 1.5 + 0 + 5 = 35 + 1.5 + 5 = 41.5
    // Offensive: 39 + 15 + 5 + 4 = 63
    // Trooper:   104.5 → Squad: 522.5 → Pilot 1.0 → Final 523
    expect(b.perTrooper.defensive.total).toBe(41.5);
    expect(b.perTrooper.offensive.total).toBe(63);
    expect(b.perTrooper.total).toBe(104.5);
    expect(b.squadTotal).toBe(522.5);
    expect(b.final).toBe(523); // 522.5 rounds to 523 (half-to-even-or-up; Math.round rounds up)
  });
});

// =============================================================================
// Breakdown shape — spec requirement
// =============================================================================

describe('IBABreakdown shape', () => {
  it('exposes perTrooper.defensive / perTrooper.offensive / squadTotal / pilotMultiplier / final', () => {
    const b = calculateBattleArmorBV(baseInput());
    expect(b).toHaveProperty('perTrooper');
    expect(b.perTrooper).toHaveProperty('defensive');
    expect(b.perTrooper).toHaveProperty('offensive');
    expect(b).toHaveProperty('squadTotal');
    expect(b).toHaveProperty('pilotMultiplier');
    expect(b).toHaveProperty('final');
    expect(typeof b.final).toBe('number');
    expect(Number.isInteger(b.final)).toBe(true);
  });

  it('offensive increases when an SRM-2 is added to each trooper', () => {
    const before =
      calculateBattleArmorBV(baseInput()).perTrooper.offensive.total;
    const after = calculateBattleArmorBV(
      baseInput({ weapons: [{ id: 'srm-2', bvOverride: 21 }] }),
    ).perTrooper.offensive.total;
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBe(21);
  });
});
