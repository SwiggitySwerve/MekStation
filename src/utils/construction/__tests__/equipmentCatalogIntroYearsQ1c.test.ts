/**
 * Owner standing approval 2026-11-03 (OWNER-RULINGS-20261030.md): existing equipment
 * catalog values proven to differ from pinned MegaMek 48fcb2f6 are corrected, each with
 * its Java line cited. Batch Q1c: Java's getIntroductionDate is the PROTOTYPE date
 * (TechAdvancement.java:691-697, minus 5 when flagged approximate, :731); the catalog
 * held the production or common date for these records.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// [file, record id, Java introduction year, citation under megamek/common]
const INTRO_YEARS = [
  [
    'miscellaneous/other.json',
    'advanced-fire-control',
    2100,
    'equipment/MiscType.java:6560 setISAdvancement(DATE_ES=2100 ITechnology.java:55, 2300, ...)',
  ],
  [
    'miscellaneous/other.json',
    'modulararmor',
    3072,
    'equipment/MiscType.java:2549 setISAdvancement(3072, 3096, ...)',
  ],
  [
    'electronics/ecm.json',
    'angel-ecm',
    3057,
    'equipment/MiscType.java:6054 ISAngelECMSuite setISAdvancement(3057, 3080, 3085, ...)',
  ],
  [
    'electronics/ecm.json',
    'watchdog-cews',
    3059,
    'equipment/MiscType.java:6179 createWatchdogECM setClanAdvancement(3059, ..., 3080, ...)',
  ],
  [
    'electronics/ecm.json',
    'watchdog-composite-electronic-warfare-system-cews',
    3059,
    'equipment/MiscType.java:6179 createWatchdogECM (same item)',
  ],
  [
    'weapons/ballistic-gauss.json',
    'improvedheavygaussrifle',
    3065,
    'weapons/gaussRifles/innerSphere/ISImpHGaussRifle.java:95 setISAdvancement(3065, DATE_NONE, 3081, ...)',
  ],
  [
    'weapons/ballistic-autocannon.json',
    'clan-rac-5',
    3073,
    'weapons/autoCannons/clan/CLRAC5.java:87 setClanAdvancement(3073, DATE_NONE, 3104, ...)',
  ],
  [
    'weapons/ballistic-autocannon.json',
    'hyper-velocity-auto-cannon-10',
    3059,
    'weapons/autoCannons/innerSphere/ISHVAC10.java:84 setISAdvancement(3059, 3079)',
  ],
  [
    'weapons/missile-lrm.json',
    'enhanced-lrm-5',
    3058,
    'weapons/lrms/innerSphere/enhancedLRM/ISEnhancedLRM5.java:83 setISAdvancement(3058, DATE_NONE, 3082)',
  ],
  [
    'weapons/energy-laser.json',
    'blazer-cannon',
    2812,
    'weapons/lasers/innerSphere/ISBinaryLaserCannon.java:88 setISAdvancement(2812, DATE_NONE, 3077)',
  ],
  [
    'weapons/energy-laser.json',
    'bombast-laser',
    3064,
    'weapons/lasers/innerSphere/ISBombastLaser.java:102 setISAdvancement(3064, 3085)',
  ],
] as const;

const record = (file: string, id: string) => {
  const catalog = JSON.parse(
    readFileSync(
      join(process.cwd(), 'public/data/equipment/official', file),
      'utf8',
    ),
  ) as { items: Array<Record<string, unknown>> };
  const found = catalog.items.filter((item) => item.id === id);
  expect(found).toHaveLength(1);
  return found[0];
};

describe('equipment introduction years match pinned Java (standing approval 2026-11-03)', () => {
  it.each(INTRO_YEARS)('%s %s introduces in %i (%s)', (file, id, year) => {
    expect(record(file, id).introductionYear).toBe(year);
  });
});
