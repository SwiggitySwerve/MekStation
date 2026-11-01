/**
 * Missile rack identification owner.
 *
 * The runner (`weaponAttackFiringModeProjectiles`) and the selected-AMS session
 * path (`gameSessionAttackResolution.ams`) each carried their own copy of the
 * rack-size read and the missile classifier. The reference functions below are
 * those copies, frozen as oracles, so the shared owner is proven to answer the
 * same for every id/name pair the firing side can present.
 */
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import { isMissileClusterWeapon, missileRackSize } from '../clusterWeapons';
import { isMissileWeapon } from '../specialWeaponMechanics';

function baseId(id: string): string {
  const match = id.match(/^(.+)-(\d+)$/);
  return match ? match[1] : id;
}

// Runner copy (IWeapon-shaped), frozen.
function runnerRackSize(id: string, name: string): number | undefined {
  const pattern = /(?:lrm|srm|mrm|atm|mml)[\s-]?(\d+)/i;
  for (const candidate of [baseId(id), id, name]) {
    const match = candidate.match(pattern);
    if (!match) continue;
    const size = parseInt(match[1], 10);
    if (Number.isFinite(size) && size > 0) return size;
  }
  return undefined;
}
function runnerIsMissile(id: string, name: string): boolean {
  const base = baseId(id);
  return (
    isMissileWeapon(base) ||
    isMissileWeapon(name) ||
    /\bmml[\s-]?\d+/i.test(`${base} ${name}`)
  );
}

// Session copy (id/name shaped), frozen.
function sessionRackSize(id: string, name: string): number | null {
  for (const candidate of [baseId(id), id, name]) {
    const match = candidate.match(/(?:lrm|srm|mrm|atm|mml)[\s-]?(\d+)/i);
    if (!match) continue;
    const rackSize = Number.parseInt(match[1], 10);
    if (Number.isFinite(rackSize) && rackSize > 0) return rackSize;
  }
  return null;
}
function sessionIsMissile(id: string, name: string): boolean {
  return (
    isMissileWeapon(baseId(id)) ||
    isMissileWeapon(name) ||
    /\bmml[\s-]?\d+/i.test(`${id} ${name}`)
  );
}

const CATALOG_PAIRS: readonly (readonly [string, string])[] =
  WEAPON_CATALOG_FILES.flatMap((file) =>
    (file.items ?? []).map(
      (item) => [String(item.id), String(item.name)] as const,
    ),
  );

const HAND_PAIRS: readonly (readonly [string, string])[] = [
  ['lrm-20', 'LRM 20'],
  ['lrm-15-3', 'LRM 15'],
  ['w-0', 'LRM 15'],
  ['w-0', 'Streak SRM 4'],
  ['mml-7-0', 'MML 7'],
  ['clan-streak-srm-4-2', 'Streak SRM 4'],
  ['lrm-ammo-0', 'LRM Ammo'],
  ['lrm-0', 'LRM'],
  ['ac-20-0', 'Autocannon/20'],
  ['lb-10-x-0', 'LB 10-X AC'],
  ['uac-5-0', 'Ultra AC/5'],
  ['rac-5-0', 'Rotary AC/5'],
  ['mrm-40-0', 'MRM 40'],
  ['LRM-10-0', 'LRM 10'],
  ['medium-laser-0', 'Medium Laser'],
  ['x-0', 'Thunderbolt 20'],
  ['cllrm16-0', 'LRM 16'],
  ['', ''],
];

describe('missile rack identification owner', () => {
  const pairs = [...CATALOG_PAIRS, ...HAND_PAIRS];

  it('covers the whole catalog plus the hand-picked edge cases', () => {
    expect(CATALOG_PAIRS.length).toBeGreaterThan(400);
    expect(pairs.length).toBeGreaterThan(CATALOG_PAIRS.length);
  });

  it('reads the same rack as the runner and the session copies', () => {
    for (const [id, name] of pairs) {
      const owner = missileRackSize(id, name);
      expect([id, name, owner]).toEqual([id, name, runnerRackSize(id, name)]);
      expect([id, name, owner ?? null]).toEqual([
        id,
        name,
        sessionRackSize(id, name),
      ]);
    }
  });

  it('classifies the same weapons as the runner and the session copies', () => {
    for (const [id, name] of pairs) {
      const owner = isMissileClusterWeapon(id, name);
      expect([id, name, owner]).toEqual([id, name, runnerIsMissile(id, name)]);
      expect([id, name, owner]).toEqual([id, name, sessionIsMissile(id, name)]);
    }
  });

  it('reads hydrated mount ids and rejects non-missile cluster weapons', () => {
    expect(missileRackSize('lrm-16-0', 'LRM 16')).toBe(16);
    expect(missileRackSize('streak-srm-4-2', 'Streak SRM 4')).toBe(4);
    expect(missileRackSize('lrm-20', 'LRM 20')).toBe(20);
    expect(missileRackSize('uac-5-0', 'Ultra AC/5')).toBeUndefined();
    expect(missileRackSize('rac-5-0', 'Rotary AC/5')).toBeUndefined();
    expect(missileRackSize('lb-10-x-0', 'LB 10-X AC')).toBeUndefined();
    expect(isMissileClusterWeapon('lrm-16-0', 'LRM 16')).toBe(true);
    expect(isMissileClusterWeapon('uac-5-0', 'Ultra AC/5')).toBe(false);
    expect(isMissileClusterWeapon('rac-5-0', 'Rotary AC/5')).toBe(false);
    expect(isMissileClusterWeapon('lb-10-x-0', 'LB 10-X AC')).toBe(false);
  });
});
