import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Introduction years corrected to pinned MegaMek 48fcb2f6. The catalog held the
// production year; EquipmentType.getIntroductionDate is the prototype date, less
// five when approximate (TechAdvancement.java:691-697,731). These are the dates
// TestEntity.hasIncorrectIntroYear (:1488-1511) compares for pinned mechs.
// Each row is [id, Java value, Java source under megamek/common/].
const cases: Record<string, [string, number, string][]> = {
  'weapons/ballistic-other.json': [
    [
      'magshotgr',
      3054,
      'weapons/gaussRifles/innerSphere/ISMagshotGaussRifle.java:83-84',
    ],
    ['thumper-cannon', 3012, 'weapons/artillery/ThumperCannon.java:90-91'],
    ['long-tom', 3012, 'weapons/artillery/LongTomCannon.java:90-91'],
  ],
  'weapons/energy-other.json': [
    ['battlemech-taser', 3065, 'weapons/other/innerSphere/ISMekTaser.java:94'],
    [
      'tsemp-cannon',
      3080,
      'weapons/other/innerSphere/ISTSEMPCannon.java:65-66',
    ],
  ],
  'weapons/energy-ppc.json': [
    ['snub-nose-ppc', 2695, 'weapons/ppc/innerSphere/ISSnubNosePPC.java:96-97'],
  ],
  'weapons/ballistic-autocannon.json': [
    ['clan-rac-2', 3073, 'weapons/autoCannons/clan/CLRAC2.java:89-90'],
    ['lac-5', 3057, 'weapons/autoCannons/innerSphere/ISLAC5.java:85-86'],
    ['ac-10', 2443, 'weapons/autoCannons/innerSphere/ISAC10.java:90-91'],
    ['ac-20', 2488, 'weapons/autoCannons/innerSphere/ISAC20.java:88-89'],
  ],
  'electronics/c3.json': [
    ['c3-boosted-master', 3073, 'weapons/c3/ISC3MBS.java:91-92'],
  ],
  'weapons/missile-other.json': [
    [
      'thunderbolt-15',
      3052,
      'weapons/missiles/thunderbolt/ThunderboltWeapon.java:85-86',
    ],
  ],
  'weapons/missile-lrm.json': [
    [
      'enhanced-lrm-15',
      3058,
      'weapons/lrms/innerSphere/enhancedLRM/ISEnhancedLRM15.java:89',
    ],
  ],
};

it.each(
  Object.entries(cases).flatMap(([file, rows]) =>
    rows.map(([id, year, source]) => [file, id, year, source] as const),
  ),
)('%s %s introductionYear is %i (%s)', (file, id, year) => {
  const { items } = JSON.parse(
    readFileSync(
      join(process.cwd(), 'public/data/equipment/official', file),
      'utf8',
    ),
  ) as { items: { id: string; introductionYear?: number }[] };
  expect(
    items.filter((item) => item.id === id).map((item) => item.introductionYear),
  ).toEqual([year]);
});
