/**
 * Aerospace wing heavy-weapon cap invariants.
 *
 * Cap rule: floor(tonnage / 10) heavy weapon tons per wing arc on ASF/CF.
 * Heavy weapons: PPC family, all Gauss flavors, AC/20.
 * Small craft are exempt.
 */

import {
  AerospaceArc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  canMountHeavyOnWing,
  heavyTonsByWing,
  isWingHeavyWeapon,
  maxHeavyWeaponTonsPerWing,
  validateWingHeavyWeapons,
} from '../wingHeavyWeapons';

describe('isWingHeavyWeapon', () => {
  it('matches PPC family case-insensitively', () => {
    expect(isWingHeavyWeapon('PPC')).toBe(true);
    expect(isWingHeavyWeapon('isppc')).toBe(true);
    expect(isWingHeavyWeapon('clerppc')).toBe(true);
  });

  it('matches gauss family', () => {
    expect(isWingHeavyWeapon('gauss-rifle')).toBe(true);
    expect(isWingHeavyWeapon('Heavy Gauss')).toBe(true);
    expect(isWingHeavyWeapon('Light Gauss Rifle')).toBe(true);
  });

  it('matches AC/20 by id and display name', () => {
    expect(isWingHeavyWeapon('isac20')).toBe(true);
    expect(isWingHeavyWeapon('AC/20')).toBe(true);
    expect(isWingHeavyWeapon('Autocannon/20')).toBe(true);
  });

  it('rejects light weapons', () => {
    expect(isWingHeavyWeapon('medium-laser')).toBe(false);
    expect(isWingHeavyWeapon('LRM-5')).toBe(false);
    expect(isWingHeavyWeapon('AC/2')).toBe(false);
    expect(isWingHeavyWeapon('AC/5')).toBe(false);
  });
});

describe('maxHeavyWeaponTonsPerWing', () => {
  it('returns floor(tonnage/10) for ASF and CF', () => {
    expect(
      maxHeavyWeaponTonsPerWing(50, AerospaceSubType.AEROSPACE_FIGHTER),
    ).toBe(5);
    expect(
      maxHeavyWeaponTonsPerWing(75, AerospaceSubType.CONVENTIONAL_FIGHTER),
    ).toBe(7);
  });

  it('returns 0 for small craft (exempt)', () => {
    expect(maxHeavyWeaponTonsPerWing(200, AerospaceSubType.SMALL_CRAFT)).toBe(
      0,
    );
  });
});

describe('heavyTonsByWing', () => {
  it('aggregates heavy tonnage per wing arc only', () => {
    const items = [
      { arc: AerospaceArc.LEFT_WING, idOrName: 'PPC', tons: 7 },
      { arc: AerospaceArc.LEFT_WING, idOrName: 'medium-laser', tons: 1 }, // not heavy
      { arc: AerospaceArc.RIGHT_WING, idOrName: 'gauss-rifle', tons: 15 },
      { arc: AerospaceArc.NOSE, idOrName: 'PPC', tons: 7 }, // not a wing
    ];
    const tons = heavyTonsByWing(items);
    expect(tons.get(AerospaceArc.LEFT_WING)).toBe(7);
    expect(tons.get(AerospaceArc.RIGHT_WING)).toBe(15);
  });

  it('always includes both wing entries (zeros where empty)', () => {
    const tons = heavyTonsByWing([]);
    expect(tons.get(AerospaceArc.LEFT_WING)).toBe(0);
    expect(tons.get(AerospaceArc.RIGHT_WING)).toBe(0);
  });
});

describe('canMountHeavyOnWing', () => {
  it('allows mounting up to but not over the cap', () => {
    // 50 t ASF cap = 5 t per wing
    expect(
      canMountHeavyOnWing(
        AerospaceArc.LEFT_WING,
        0,
        5,
        50,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(true);
    expect(
      canMountHeavyOnWing(
        AerospaceArc.LEFT_WING,
        3,
        3,
        50,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(false); // would be 6t > 5
  });

  it('returns true unconditionally for non-wing arcs', () => {
    expect(
      canMountHeavyOnWing(
        AerospaceArc.NOSE,
        100,
        100,
        50,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(true);
  });
});

describe('validateWingHeavyWeapons (VAL-AERO-WING-HEAVY)', () => {
  it('returns no errors when small craft mount heavy weapons (rule does not apply)', () => {
    const errs = validateWingHeavyWeapons(
      [
        {
          arc: AerospaceArc.LEFT_WING,
          idOrName: 'gauss-rifle',
          tons: 15,
        },
      ],
      200,
      AerospaceSubType.SMALL_CRAFT,
    );
    expect(errs).toEqual([]);
  });

  it('flags an over-cap wing on an ASF', () => {
    const errs = validateWingHeavyWeapons(
      [{ arc: AerospaceArc.LEFT_WING, idOrName: 'gauss-rifle', tons: 15 }],
      50, // cap = 5 t
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    expect(errs).toHaveLength(1);
    expect(errs[0].ruleId).toBe('VAL-AERO-WING-HEAVY');
  });

  it('returns no errors when both wings are within the cap', () => {
    const errs = validateWingHeavyWeapons(
      [
        { arc: AerospaceArc.LEFT_WING, idOrName: 'PPC', tons: 7 },
        { arc: AerospaceArc.RIGHT_WING, idOrName: 'PPC', tons: 7 },
      ],
      80, // cap = 8 t
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    expect(errs).toEqual([]);
  });
});
