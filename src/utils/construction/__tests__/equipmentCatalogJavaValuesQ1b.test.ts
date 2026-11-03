/**
 * Owner standing approval 2026-11-03 (OWNER-RULINGS-20261030.md, last section):
 * existing equipment catalog values proven to differ from pinned MegaMek
 * 48fcb2f6 are corrected, each with its Java line cited. These rows pin the
 * Q1b batch.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

describe('equipment catalog values match pinned Java (standing approval 2026-11-03)', () => {
  it('Chaff Pod introduces in 3069 (MiscType.java:8728 createISChaffPod setISAdvancement(3069, ...))', () => {
    expect(
      record('miscellaneous/other.json', 'chaffpod').introductionYear,
    ).toBe(3069);
  });

  // ISReengineeredLaserLarge.java:86-87 setISAdvancement(3120, ...) with the first date
  // approximate; TechAdvancement.java:731 moves an approximate date 5 years earlier.
  it('Large Re-engineered Laser introduces in 3115', () => {
    expect(
      record('weapons/energy-laser.json', 'large-re-engineered-laser')
        .introductionYear,
    ).toBe(3115);
  });

  // AmmoType.java:12429 createHeavyNGaussAmmo: shots = 1, tonnage = 0.5.
  it('Heavy N-Gauss ammo weighs 0.5 t per shot', () => {
    expect(record('ammunition/gauss.json', 'ammo-heavy-n-gauss')).toMatchObject(
      {
        weight: 0.5,
        shotsPerTon: 1,
      },
    );
  });
});
