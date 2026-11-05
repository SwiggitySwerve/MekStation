import {
  ArmorTypeEnum,
  getArmorDefinition,
  javaArmorIntroduction,
} from '@/types/construction/ArmorType';
import {
  CockpitType,
  getCockpitDefinition,
  getCockpitIntroductionYear,
} from '@/types/construction/CockpitType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';
import { TechBase } from '@/types/enums/TechBase';

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587.
// TechAdvancement.java:691-697,731-734 selects the first available phase and
// subtracts five for approximate prototype dates, rather than using production.
it.each([
  [
    'Command Console',
    () => getCockpitDefinition(CockpitType.COMMAND_CONSOLE)?.introductionYear,
    2620,
    'Mek.java:3740-3749',
  ],
  [
    'Heavy Ferro',
    () => getArmorDefinition(ArmorTypeEnum.HEAVY_FERRO)?.introductionYear,
    3051,
    'ArmorType.java:487-510',
  ],
  [
    'Compact Gyro',
    () => getGyroDefinition(GyroType.COMPACT)?.introductionYear,
    3050,
    'Mek.java:3685-3694',
  ],
  [
    'Small IS cockpit',
    () => getCockpitDefinition(CockpitType.SMALL)?.introductionYear,
    3055,
    'Mek.java:3730-3739',
  ],
  [
    'XL Gyro',
    () => getGyroDefinition(GyroType.XL)?.introductionYear,
    3050,
    'Mek.java:3677-3684',
  ],
] as const)(
  '%s uses the pinned introduction date',
  (_name, year, expected, _citation) => {
    expect(year()).toBe(expected);
  },
);

// TestEntity.java:1565-1569 uses the unit side, or the earliest side for mixed.
it.each([
  [TechBase.INNER_SPHERE, false, 3055],
  [TechBase.CLAN, false, 3080],
  [TechBase.INNER_SPHERE, true, 3055],
  [TechBase.CLAN, true, 3055],
] as const)(
  'Small cockpit date for %s, mixed=%s is %s',
  (side, mixed, year) => {
    expect(getCockpitIntroductionYear(CockpitType.SMALL, side, mixed)).toBe(
      year,
    );
  },
);

it('keeps Cougar-XR outside the five-year Clan margin', () => {
  expect(
    getCockpitIntroductionYear(CockpitType.SMALL, TechBase.CLAN),
  ).toBeGreaterThan(3071 + 5);
  expect(
    getCockpitIntroductionYear(CockpitType.SMALL, TechBase.INNER_SPHERE),
  ).toBeLessThanOrEqual(3071 + 5);
});

it('shares Heavy Ferro dates with the existing vehicle introduction lookup', () => {
  expect(javaArmorIntroduction(6, false, false, false)?.year).toBe(
    getArmorDefinition(ArmorTypeEnum.HEAVY_FERRO)?.introductionYear,
  );
});
