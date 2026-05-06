/**
 * Phase 1 of `add-combat-fidelity-suite` — Atlas AS7-D & Locust LCT-1V
 * hydration anchor tests.
 *
 * Spec contract: openspec/changes/add-combat-fidelity-suite/specs/
 *   simulation-system/spec.md → "Catalog-Hydrated Unit State" requirement
 *
 *   GIVEN an Atlas AS7-D participant with `unitId: 'atlas-as7-d'`
 *   WHEN the runner hydrates initial unit state
 *   THEN IUnitGameState.weapons MUST include 1× AC/20, 1× LRM-20,
 *        4× Medium Laser, and 1× SRM-6
 *   AND the per-location armor map MUST sum to 304 across 11 locations
 *
 *   GIVEN a Locust LCT-1V participant
 *   WHEN the runner hydrates initial unit state
 *   THEN the resulting weapon list MUST match the canonical Locust loadout
 *        (1× Medium Laser, 2× Machine Gun)
 *   AND total armor MUST match the canonical Locust value (64)
 *
 * Catalog source-of-truth: `public/data/units/battlemechs/{path}/Atlas AS7-D.json`
 * and `public/data/units/battlemechs/1-age-of-war/standard/Locust LCT-1V.json`
 * loaded synchronously via `NodeCanonicalUnitService.getById`. Weapon stats
 * resolved from the bundled `equipmentBVCatalogData.WEAPON_CATALOG_FILES`
 * (sync JSON imports — no fetch needed).
 */

import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { GameSide } from '@/types/gameplay';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import {
  buildWeaponLookupFromCatalogFiles,
  createHydratedUnitState,
  hydrateAIWeaponsFromFullUnit,
  hydrateArmorFromFullUnit,
  hydrateStructureFromFullUnit,
  resolveCatalogDamage,
  type IHydratedUnitData,
} from '../UnitHydration';

// Build the weapon lookup once across this file. The catalog files are
// imported synchronously (see equipmentBVCatalogData.ts) so this is a
// pure in-memory pass — no IO, no async.
const weaponLookup = buildWeaponLookupFromCatalogFiles(
  WEAPON_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
);

const ATLAS_TONNAGE = 100;
const LOCUST_TONNAGE = 20;
// Canonical totals from the Atlas AS7-D / Locust LCT-1V catalog JSONs.
// Atlas: HD=9 + LA=34 + RA=34 + LL=41 + RL=41 + CT=47+14 + LT=32+10 + RT=32+10 = 304
// Locust: HD=8 + LA=4 + RA=4 + LL=8 + RL=8 + CT=10+2 + LT=8+2 + RT=8+2 = 64
const ATLAS_CANONICAL_TOTAL_ARMOR = 304;
const LOCUST_CANONICAL_TOTAL_ARMOR = 64;

describe('UnitHydration — Atlas AS7-D anchor (P1, task 1.3 / 1.4)', () => {
  it('resolves Atlas AS7-D from the Node catalog with the canonical loadout', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(fullUnit.chassis).toBe('Atlas');
    // Catalog stores variant under `model` for the fetch-based loader's
    // shape — NodeCanonicalUnitService re-wraps as IFullUnit but the raw
    // `model` field passes through. Either field is acceptable for our
    // assertion as long as the variant value is "AS7-D".
    expect(fullUnit.model ?? fullUnit.variant).toBe('AS7-D');
    expect(fullUnit.tonnage).toBe(ATLAS_TONNAGE);
  });

  it('hydrates Atlas weapons: 4× ML + AC/20 + LRM-20 + SRM-6 (7 mounts total)', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);

    // Total mount count: 4 ML + 1 AC/20 + 1 LRM-20 + 1 SRM-6 = 7.
    expect(weapons).toHaveLength(7);

    // Group by underlying catalog id (strip the `-{mountIndex}` suffix
    // that toAIWeapon adds to keep mounts unique in the AI snapshot).
    const idCounts = weapons.reduce<Record<string, number>>((acc, w) => {
      const baseId = w.id.replace(/-\d+$/, '');
      acc[baseId] = (acc[baseId] ?? 0) + 1;
      return acc;
    }, {});
    expect(idCounts['medium-laser']).toBe(4);
    expect(idCounts['ac-20']).toBe(1);
    expect(idCounts['lrm-20']).toBe(1);
    expect(idCounts['srm-6']).toBe(1);

    // Spot-check key per-weapon stats so a future catalog edit can't
    // silently change the loadout shape under us.
    const mediumLaser = weapons.find((w) => w.name === 'Medium Laser');
    expect(mediumLaser?.damage).toBe(5);
    expect(mediumLaser?.heat).toBe(3);
    expect(mediumLaser?.shortRange).toBe(3);

    const ac20 = weapons.find((w) => w.name === 'AC/20');
    expect(ac20?.damage).toBe(20);
    expect(ac20?.heat).toBe(7);
    expect(ac20?.ammoPerTon).toBe(5);

    // LRM 20 catalog damage is "1/missile" → 20 missiles × 1 damage each.
    const lrm20 = weapons.find((w) => w.name === 'LRM 20');
    expect(lrm20?.damage).toBe(20);
    expect(lrm20?.minRange).toBe(6);

    // SRM 6 catalog damage is "2/missile" → 6 missiles × 2 damage each.
    const srm6 = weapons.find((w) => w.name === 'SRM 6');
    expect(srm6?.damage).toBe(12);
    expect(srm6?.heat).toBe(4);
  });

  it('hydrates Atlas armor: per-location map sums to 304 across 11 locations', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const { armor, totalArmor, locationCount } =
      hydrateArmorFromFullUnit(fullUnit);

    expect(totalArmor).toBe(ATLAS_CANONICAL_TOTAL_ARMOR);
    // Atlas has 11 distinct armor slots: HD, CT, CT_rear, LT, LT_rear,
    // RT, RT_rear, LA, RA, LL, RL.
    expect(locationCount).toBe(11);

    // Spot-check the canonical per-location values.
    expect(armor.head).toBe(9);
    expect(armor.center_torso).toBe(47);
    expect(armor.center_torso_rear).toBe(14);
    expect(armor.left_torso).toBe(32);
    expect(armor.left_torso_rear).toBe(10);
    expect(armor.right_torso).toBe(32);
    expect(armor.right_torso_rear).toBe(10);
    expect(armor.left_arm).toBe(34);
    expect(armor.right_arm).toBe(34);
    expect(armor.left_leg).toBe(41);
    expect(armor.right_leg).toBe(41);
  });

  it('hydrates Atlas internal structure: 100t profile (HD=3, CT=31, ST=21, arm=17, leg=21)', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const { structure, totalStructure } =
      hydrateStructureFromFullUnit(fullUnit);
    // 3 + 31 + 21*2 + 17*2 + 21*2 = 3 + 31 + 42 + 34 + 42 = 152.
    expect(totalStructure).toBe(152);
    expect(structure.head).toBe(3);
    expect(structure.center_torso).toBe(31);
    expect(structure.left_torso).toBe(21);
    expect(structure.right_torso).toBe(21);
    expect(structure.left_arm).toBe(17);
    expect(structure.right_arm).toBe(17);
    expect(structure.left_leg).toBe(21);
    expect(structure.right_leg).toBe(21);
  });

  it('produces a fully-hydrated IUnitGameState with armor / structure / weapons all populated', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const aiWeapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    const hydrated: IHydratedUnitData = {
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons,
      gunnery: 4,
      piloting: 5,
    };
    const unitState = createHydratedUnitState(hydrated);

    // Identity + spawn fields.
    expect(unitState.id).toBe('player-1');
    expect(unitState.side).toBe(GameSide.Player);
    expect(unitState.gunnery).toBe(4);
    expect(unitState.piloting).toBe(5);

    // Armor + structure end up on the IUnitGameState directly.
    const armorTotal = Object.values(unitState.armor).reduce(
      (a, b) => a + b,
      0,
    );
    expect(armorTotal).toBe(ATLAS_CANONICAL_TOTAL_ARMOR);
    expect(unitState.structure.center_torso).toBe(31);

    // startingInternalStructure is seeded for the retreat-trigger ratio.
    expect(unitState.startingInternalStructure).toBeDefined();
    expect(unitState.startingInternalStructure?.center_torso).toBe(31);
  });
});

describe('UnitHydration — Locust LCT-1V (P1, task 1.4)', () => {
  it('hydrates Locust weapons: 1× ML + 2× MG (3 mounts total)', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('locust-lct-1v');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(fullUnit.chassis).toBe('Locust');
    expect(fullUnit.tonnage).toBe(LOCUST_TONNAGE);

    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    expect(weapons).toHaveLength(3);

    const idCounts = weapons.reduce<Record<string, number>>((acc, w) => {
      const baseId = w.id.replace(/-\d+$/, '');
      acc[baseId] = (acc[baseId] ?? 0) + 1;
      return acc;
    }, {});
    expect(idCounts['medium-laser']).toBe(1);
    expect(idCounts['machine-gun']).toBe(2);
  });

  it('hydrates Locust armor: total 64 across 11 locations', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('locust-lct-1v');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const { totalArmor, locationCount } = hydrateArmorFromFullUnit(fullUnit);
    expect(totalArmor).toBe(LOCUST_CANONICAL_TOTAL_ARMOR);
    expect(locationCount).toBe(11);
  });

  it('hydrates Locust internal structure: 20t profile', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('locust-lct-1v');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const { structure } = hydrateStructureFromFullUnit(fullUnit);
    expect(structure.head).toBe(3);
    expect(structure.center_torso).toBe(6);
    expect(structure.left_torso).toBe(5);
    expect(structure.left_arm).toBe(3);
    expect(structure.left_leg).toBe(4);
  });
});

describe('UnitHydration — resolveCatalogDamage (numeric / missile-string parser)', () => {
  it('returns numeric damage as-is for non-string entries', () => {
    expect(resolveCatalogDamage(5, 'medium-laser')).toBe(5);
    expect(resolveCatalogDamage(20, 'ac-20')).toBe(20);
    expect(resolveCatalogDamage(2, 'machine-gun')).toBe(2);
  });

  it('parses "N/missile" damage strings, multiplying by missile count from id', () => {
    expect(resolveCatalogDamage('1/missile', 'lrm-20')).toBe(20);
    expect(resolveCatalogDamage('1/missile', 'lrm-15')).toBe(15);
    expect(resolveCatalogDamage('1/missile', 'lrm-10')).toBe(10);
    expect(resolveCatalogDamage('1/missile', 'lrm-5')).toBe(5);
    expect(resolveCatalogDamage('2/missile', 'srm-6')).toBe(12);
    expect(resolveCatalogDamage('2/missile', 'srm-4')).toBe(8);
    expect(resolveCatalogDamage('2/missile', 'srm-2')).toBe(4);
    expect(resolveCatalogDamage('1/missile', 'mrm-30')).toBe(30);
  });

  it('returns 0 for unparseable damage shapes (defensive fallback)', () => {
    expect(resolveCatalogDamage('???', 'whatever')).toBe(0);
    expect(resolveCatalogDamage('cluster-table', 'lb-x-ac-10')).toBe(0);
  });
});
