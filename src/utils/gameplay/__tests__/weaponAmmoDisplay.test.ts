/**
 * Live weapon-ammo display merge (Wave 3 residual — command-screens
 * re-audit follow-up): the record sheet / inspector weapon rows get their
 * `ammoRemaining` / `ammoMax` from the LIVE unit state at render time, so
 * counters track consumption instead of freezing at session adoption.
 * Matching mirrors the canonical `normalizeAmmoWeaponType` rules the
 * engine's consume path uses.
 */

import type { IAmmoSlotState, IWeaponStatus } from '@/types/gameplay';

import { mergeLiveAmmoIntoWeaponStatuses } from '../weaponAmmoDisplay';

function weapon(
  id: string,
  name: string,
  overrides: Partial<IWeaponStatus> = {},
): IWeaponStatus {
  return {
    id,
    name,
    location: 'right_torso',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 3, medium: 6, long: 9 },
    ...overrides,
  } as IWeaponStatus;
}

function bin(
  binId: string,
  weaponType: string,
  remainingRounds: number,
  maxRounds: number,
): IAmmoSlotState {
  return {
    binId,
    weaponType,
    location: 'left_torso',
    remainingRounds,
    maxRounds,
    isExplosive: true,
  };
}

describe('mergeLiveAmmoIntoWeaponStatuses', () => {
  it('shows missing MG ammunition as zero alongside an authoritative SRM bin', () => {
    const merged = mergeLiveAmmoIntoWeaponStatuses(
      [
        weapon('saved-mg-1', 'Machine Gun'),
        weapon('saved-srm-6-1', 'SRM 6'),
        weapon('saved-ppc-1', 'PPC'),
      ],
      { ammo: {}, ammoState: { srm: bin('srm', 'srm-6', 15, 15) } },
    );
    expect(merged[0].ammoRemaining).toBe(0);
    expect(merged[0].ammoMax).toBe(0);
    expect(merged[1].ammoRemaining).toBe(15);
    expect(merged[2].ammoRemaining).toBeUndefined();
  });

  it('shows zero ammo for an authoritative empty inventory but preserves an older flat record', () => {
    const rows = [weapon('mg-1', 'Machine Gun')];
    expect(
      mergeLiveAmmoIntoWeaponStatuses(rows, { ammo: {}, ammoState: {} })[0]
        .ammoRemaining,
    ).toBe(0);
    expect(
      mergeLiveAmmoIntoWeaponStatuses(rows, {
        ammo: { 'mg-1': 7 },
        ammoState: {},
      })[0].ammoRemaining,
    ).toBe(7);
  });

  it('shows both MG mounts drawing on the same live pool without multiplying inventory', () => {
    const rows = [
      weapon('unit-mg-1', 'Machine Gun'),
      weapon('unit-mg-2', 'Machine Gun'),
    ];
    const merged = mergeLiveAmmoIntoWeaponStatuses(rows, {
      ammo: {},
      ammoState: { mg: bin('mg', 'machine-gun', 199, 200) },
    });
    expect(merged.map((row) => [row.ammoRemaining, row.ammoMax])).toEqual([
      [199, 200],
      [199, 200],
    ]);
  });
  it('sums remaining and max across every bin feeding the weapon', () => {
    const merged = mergeLiveAmmoIntoWeaponStatuses([weapon('ac-20', 'AC/20')], {
      ammo: {},
      ammoState: {
        'bin-1': bin('bin-1', 'AC/20', 3, 5),
        'bin-2': bin('bin-2', 'ac-20', 4, 5),
        'bin-3': bin('bin-3', 'LRM 15', 8, 8), // different family — excluded
      },
    });
    expect(merged[0].ammoRemaining).toBe(7);
    expect(merged[0].ammoMax).toBe(10);
  });

  it('matches by display name when the weapon id carries a mount suffix', () => {
    const merged = mergeLiveAmmoIntoWeaponStatuses(
      [weapon('srm-6-rt-1', 'SRM 6')],
      {
        ammo: {},
        ammoState: { 'bin-1': bin('bin-1', 'SRM 6', 10, 15) },
      },
    );
    expect(merged[0].ammoRemaining).toBe(10);
    expect(merged[0].ammoMax).toBe(15);
  });

  it('leaves energy weapons untouched (no matching bins -> no counter)', () => {
    const laser = weapon('medium-laser', 'Medium Laser');
    const merged = mergeLiveAmmoIntoWeaponStatuses([laser], {
      ammo: {},
      ammoState: { 'bin-1': bin('bin-1', 'AC/20', 5, 5) },
    });
    expect(merged[0].ammoRemaining).toBeUndefined();
    expect(merged[0].ammoMax).toBeUndefined();
  });

  it('reports zero remaining (empty tint) rather than dropping the counter', () => {
    const merged = mergeLiveAmmoIntoWeaponStatuses([weapon('ac-20', 'AC/20')], {
      ammo: {},
      ammoState: { 'bin-1': bin('bin-1', 'AC/20', 0, 5) },
    });
    expect(merged[0].ammoRemaining).toBe(0);
    expect(merged[0].ammoMax).toBe(5);
  });

  it('falls back to the legacy per-weapon ammo record when no bins exist', () => {
    const merged = mergeLiveAmmoIntoWeaponStatuses([weapon('ac-20', 'AC/20')], {
      ammo: { 'ac-20': 6 },
      ammoState: undefined,
    });
    expect(merged[0].ammoRemaining).toBe(6);
    expect(merged[0].ammoMax).toBeUndefined();
  });

  it('passes rows through unchanged without any live source', () => {
    const rows = [weapon('ac-20', 'AC/20')];
    expect(
      mergeLiveAmmoIntoWeaponStatuses(rows, { ammo: {}, ammoState: undefined }),
    ).toEqual(rows);
    expect(mergeLiveAmmoIntoWeaponStatuses(rows, null)).toBe(rows);
  });

  it('LIVENESS: the same static rows produce updated counters as bins drain', () => {
    const rows = [weapon('ac-20', 'AC/20')];
    const before = mergeLiveAmmoIntoWeaponStatuses(rows, {
      ammo: {},
      ammoState: { 'bin-1': bin('bin-1', 'AC/20', 5, 5) },
    });
    const after = mergeLiveAmmoIntoWeaponStatuses(rows, {
      ammo: {},
      ammoState: { 'bin-1': bin('bin-1', 'AC/20', 2, 5) },
    });
    expect(before[0].ammoRemaining).toBe(5);
    expect(after[0].ammoRemaining).toBe(2);
    // The static snapshot rows themselves were never mutated.
    expect(rows[0].ammoRemaining).toBeUndefined();
  });
});
