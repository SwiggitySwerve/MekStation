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

import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { AttackAI } from '@/simulation/ai/AttackAI';
import { Facing, FiringArc, GameSide } from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import {
  createMinimalUnitState,
  toCatalogAIUnitState,
} from '../SimulationRunnerSupport';
import {
  buildWeaponLookupFromCatalogFiles,
  createHydratedUnitState,
  hydrateAIWeaponsFromFullUnit,
  hydrateAIWeaponsFromFullUnitStrict,
  hydrateAIWeaponsFromFullUnitWithReport,
  hydrateArmorFromFullUnit,
  hydrateActiveProbesFromFullUnit,
  hydrateC3EquipmentFromFullUnit,
  hydrateECMSuitesFromFullUnit,
  hydrateHasMASCFromFullUnit,
  hydrateHasStealthArmorFromFullUnit,
  hydrateHasSuperchargerFromFullUnit,
  hydrateHasTSMFromFullUnit,
  hydrateHeatSinksFromFullUnit,
  hydrateMovementCapabilityFromFullUnit,
  hydratePartialWingJumpBonusFromFullUnit,
  hydrateClawStateFromFullUnit,
  hydrateStructureFromFullUnit,
  hydrateTalonStateFromFullUnit,
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
const ATLAS_CANONICAL_HEAT_SINKS = 20;

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

  it('hydrates BattleMech movement capability from canonical walk and jump MP', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(hydrateMovementCapabilityFromFullUnit(fullUnit)).toEqual({
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
    });

    expect(
      hydrateMovementCapabilityFromFullUnit({
        ...fullUnit,
        id: 'jump-capability-test',
        movement: { walk: 5, jump: 3 },
      }),
    ).toEqual({
      walkMP: 5,
      runMP: 8,
      jumpMP: 3,
    });
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

  it('hydrates mounted weapon locations and rear-facing arcs into AI weapons and unit state', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-location-hydration',
      chassis: 'Synthetic',
      variant: 'Location Hydration',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'BattleMech',
      equipment: [
        { id: 'medium-laser', location: 'LEFT_ARM' },
        { id: 'ac-20', location: 'RIGHT_TORSO', isRearMounted: true },
      ],
    };

    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    // Audit C-8: arm mounts hydrate MegaMek ARC_LEFTARM front+left-side
    // coverage (Mek.getWeaponArc) — the old pin of Front-only LEFT_ARM
    // weapons diverged from MegaMek and blocked side-arc fire.
    expect(
      weapons.map((weapon) => [
        weapon.id,
        weapon.location,
        weapon.mountingArc,
        weapon.mountingArcs,
      ]),
    ).toEqual([
      [
        'medium-laser-0',
        'LEFT_ARM',
        undefined,
        [FiringArc.Front, FiringArc.Left],
      ],
      ['ac-20-1', 'RIGHT_TORSO', FiringArc.Rear, [FiringArc.Rear]],
    ]);

    const state = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: weapons,
    });
    expect(state.weaponLocationById).toEqual({
      'medium-laser-0': 'LEFT_ARM',
      'ac-20-1': 'RIGHT_TORSO',
    });
  });

  it('feeds hydrated mounting arcs into AI weapon selection', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-arc-selection-hydration',
      chassis: 'Synthetic',
      variant: 'Arc Selection Hydration',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'BattleMech',
      equipment: [
        { id: 'medium-laser', location: 'LEFT_ARM' },
        { id: 'ac-20', location: 'RIGHT_TORSO', isRearMounted: true },
      ],
    };
    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    const attackerState = {
      ...createHydratedUnitState({
        runnerUnitId: 'attacker-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit,
        aiWeapons: weapons,
      }),
      facing: Facing.North,
      secondaryFacing: Facing.North,
    };
    const targetState = createMinimalUnitState('target-1', GameSide.Opponent, {
      q: 0,
      r: 2,
    });

    const chosen = new AttackAI().selectWeapons(
      toCatalogAIUnitState(attackerState, weapons),
      toCatalogAIUnitState(targetState, [weapons[0]]),
    );

    expect(chosen.map((weapon) => weapon.id)).toEqual(['ac-20-1']);
  });

  // Audit C-8: MegaMek Mek.getWeaponArc gives biped arm mounts a 180-degree
  // front+side sweep (ARC_LEFTARM/ARC_RIGHTARM = ARC_FORWARD plus the
  // matching side arc per FacingArc), while QuadMek.getWeaponArc keeps every
  // quad location (including FRONT_*_LEG, which the runner maps onto the arm
  // slots) at ARC_FORWARD.
  it('hydrates biped arm mounts with front+side arcs and keeps torso/quad-leg mounts front-only (audit C-8)', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-arm-arc-hydration',
      chassis: 'Synthetic',
      variant: 'Arm Arc Hydration',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'BattleMech',
      equipment: [
        { id: 'medium-laser', location: 'LEFT_ARM' },
        { id: 'medium-laser', location: 'RIGHT_ARM' },
        { id: 'medium-laser', location: 'LEFT_ARM', isRearMounted: true },
        { id: 'medium-laser', location: 'CENTER_TORSO' },
        { id: 'medium-laser', location: 'FRONT_LEFT_LEG' },
      ],
    };

    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    expect(
      weapons.map((weapon) => [
        weapon.location,
        weapon.mountingArc,
        weapon.mountingArcs,
      ]),
    ).toEqual([
      ['LEFT_ARM', undefined, [FiringArc.Front, FiringArc.Left]],
      ['RIGHT_ARM', undefined, [FiringArc.Front, FiringArc.Right]],
      // Rear-mounted arm weapons stay Rear (MegaMek checks isRearMounted
      // BEFORE the location switch).
      ['LEFT_ARM', FiringArc.Rear, [FiringArc.Rear]],
      ['CENTER_TORSO', FiringArc.Front, [FiringArc.Front]],
      // Quad front legs hydrate Front-only per QuadMek.getWeaponArc.
      ['FRONT_LEFT_LEG', FiringArc.Front, [FiringArc.Front]],
    ]);
  });

  it('selects hydrated arm weapons for side-arc targets while torso mounts stay excluded (audit C-8)', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-arm-side-arc-selection',
      chassis: 'Synthetic',
      variant: 'Arm Side Arc Selection',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'BattleMech',
      equipment: [
        { id: 'medium-laser', location: 'RIGHT_ARM' },
        { id: 'ac-20', location: 'RIGHT_TORSO' },
      ],
    };
    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    const attackerState = {
      ...createHydratedUnitState({
        runnerUnitId: 'attacker-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit,
        aiWeapons: weapons,
      }),
      facing: Facing.North,
      secondaryFacing: Facing.North,
    };
    // Attacker at (0,0) facing North; target at (2,0) sits in the Right
    // side arc (~108 degrees off facing — see the torso-twist test in
    // improveBotBasicCombatCompetence.behavior.test.ts for the geometry).
    const targetState = createMinimalUnitState('target-1', GameSide.Opponent, {
      q: 2,
      r: 0,
    });

    const chosen = new AttackAI().selectWeapons(
      toCatalogAIUnitState(attackerState, weapons),
      toCatalogAIUnitState(targetState, [weapons[0]]),
    );

    // RIGHT_ARM laser covers Front+Right and bears on the side-arc target;
    // the front-only RIGHT_TORSO AC/20 cannot.
    expect(chosen.map((weapon) => weapon.id)).toEqual(['medium-laser-0']);
  });

  it('hydrates Artemis IV guidance only when a compatible launcher has linked FCS and Artemis-capable ammo', async () => {
    const service = getNodeCanonicalUnitService();
    const artemisUnit = await service.getById('longshot-lng-2');
    const standardUnit = await service.getById('atlas-as7-d');
    expect(artemisUnit).not.toBeNull();
    expect(standardUnit).not.toBeNull();
    if (!artemisUnit || !standardUnit) return;

    const artemisWeapons = hydrateAIWeaponsFromFullUnit(
      artemisUnit,
      weaponLookup,
    );
    const standardWeapons = hydrateAIWeaponsFromFullUnit(
      standardUnit,
      weaponLookup,
    );
    const artemisSRMs = artemisWeapons.filter((weapon) =>
      /srm\s*6/i.test(weapon.name),
    );
    const standardLRM = standardWeapons.find((weapon) =>
      /lrm\s*20/i.test(weapon.name),
    );

    expect(artemisSRMs).toHaveLength(2);
    expect(
      artemisSRMs.filter((weapon) => weapon.hasArtemisIV === true),
    ).toHaveLength(1);
    expect(artemisSRMs.every((weapon) => !weapon.hasArtemisV)).toBe(true);
    expect(artemisSRMs.every((weapon) => !weapon.hasPrototypeArtemisIV)).toBe(
      true,
    );
    expect(standardLRM?.hasArtemisIV).toBeUndefined();
    expect(standardLRM?.hasPrototypeArtemisIV).toBeUndefined();
    expect(standardLRM?.hasArtemisV).toBeUndefined();
  });

  it('hydrates prototype Artemis IV guidance from matching FCS and Artemis-capable ammo', () => {
    const prototypeUnit: IFullUnit = {
      id: 'synthetic-prototype-artemis-iv',
      chassis: 'Synthetic',
      variant: 'Prototype Artemis IV',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [{ id: 'srm-6', location: 'RIGHT_TORSO' }],
      criticalSlots: {
        RIGHT_TORSO: [
          'IS SRM 6',
          'ISArtemisIVProto',
          'IS Ammo SRM-6 Artemis-capable',
        ],
      },
    };

    const weapons = hydrateAIWeaponsFromFullUnit(prototypeUnit, weaponLookup);

    expect(weapons).toHaveLength(1);
    expect(weapons[0].hasPrototypeArtemisIV).toBe(true);
    expect(weapons[0].hasArtemisIV).toBeUndefined();
    expect(weapons[0].hasArtemisV).toBeUndefined();
  });

  it('hydrates Artemis V guidance from matching FCS and Artemis V-capable ammo', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('alpha-wolf-b');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    const srmLaunchers = weapons.filter((weapon) =>
      /srm\s*6/i.test(weapon.name),
    );

    expect(srmLaunchers).toHaveLength(2);
    expect(srmLaunchers.every((weapon) => weapon.hasArtemisV)).toBe(true);
    expect(srmLaunchers.every((weapon) => !weapon.hasArtemisIV)).toBe(true);
    expect(srmLaunchers.every((weapon) => !weapon.hasPrototypeArtemisIV)).toBe(
      true,
    );
  });

  it('reports unresolved weapon refs so strict catalog hydration cannot fall back silently', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const brokenUnit: IFullUnit = {
      ...fullUnit,
      equipment: [
        ...((fullUnit.equipment as readonly unknown[] | undefined) ?? []),
        { id: 'missing-catalog-weapon', location: 'RIGHT_ARM' },
      ],
    };
    const emptyUnit: IFullUnit = {
      ...fullUnit,
      id: 'atlas-as7-d-empty-loadout',
      equipment: [],
    };

    const partialReport = hydrateAIWeaponsFromFullUnitWithReport(
      brokenUnit,
      weaponLookup,
    );
    expect(partialReport.weapons).toHaveLength(7);
    expect(partialReport.resolvedEquipmentIds).toHaveLength(7);
    expect(partialReport.unresolvedEquipmentIds).toEqual([
      'missing-catalog-weapon',
    ]);
    expect(() =>
      hydrateAIWeaponsFromFullUnitStrict(brokenUnit, weaponLookup),
    ).toThrow('missing-catalog-weapon');

    const emptyReport = hydrateAIWeaponsFromFullUnitWithReport(
      emptyUnit,
      weaponLookup,
    );
    expect(emptyReport.weapons).toHaveLength(0);
    expect(() =>
      hydrateAIWeaponsFromFullUnitStrict(emptyUnit, weaponLookup),
    ).toThrow('no combat weapons resolved');

    const unitState = createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    expect(() => toCatalogAIUnitState(unitState, [])).toThrow(
      'refusing synthetic Medium Laser fallback',
    );
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

  it('hydrates Atlas heat sinks from the catalog', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const heatSinks = hydrateHeatSinksFromFullUnit(fullUnit);

    expect(heatSinks).toEqual({
      count: ATLAS_CANONICAL_HEAT_SINKS,
      kind: 'single',
    });
  });

  it('normalizes double heat sink catalog strings for runner state', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const doubleSinkUnit: IFullUnit = {
      ...fullUnit,
      id: 'double-sink-test',
      heatSinks: { type: 'DOUBLE', count: 14 },
    };

    expect(hydrateHeatSinksFromFullUnit(doubleSinkUnit)).toEqual({
      count: 14,
      kind: 'double',
    });
  });

  it('hydrates TSM movement enhancements into runner physical damage state', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const baseMovement =
      (fullUnit as { movement?: Record<string, unknown> }).movement ?? {};
    const tsmUnit: IFullUnit = {
      ...fullUnit,
      id: 'tsm-hydration-test',
      movement: {
        ...baseMovement,
        enhancements: ['TSM'],
      },
    };
    const booleanTsmUnit: IFullUnit = {
      ...fullUnit,
      id: 'tsm-boolean-hydration-test',
      movement: {
        ...baseMovement,
        hasTSM: true,
      },
    };

    expect(hydrateHasTSMFromFullUnit(fullUnit)).toBe(false);
    expect(hydrateHasTSMFromFullUnit(tsmUnit)).toBe(true);
    expect(hydrateHasTSMFromFullUnit(booleanTsmUnit)).toBe(true);

    const aiWeapons = hydrateAIWeaponsFromFullUnit(tsmUnit, weaponLookup);
    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: tsmUnit,
      aiWeapons,
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.hasTSM).toBe(true);
  });

  it('hydrates installed MASC and Supercharger without implicitly activating them', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const baseMovement =
      (fullUnit as { movement?: Record<string, unknown> }).movement ?? {};
    const existingEquipment =
      (fullUnit.equipment as readonly unknown[] | undefined) ?? [];
    const boosterUnit: IFullUnit = {
      ...fullUnit,
      id: 'masc-supercharger-hydration-test',
      movement: {
        ...baseMovement,
        enhancements: ['MASC', 'Supercharger'],
      },
      equipment: [
        ...existingEquipment,
        { id: 'IS MASC', location: 'RIGHT_TORSO' },
        { id: 'CLMASC(Clan)', location: 'RIGHT_TORSO' },
        { id: 'IS Supercharger', location: 'LEFT_TORSO' },
        { id: 'Supercharger (Clan) (OMNIPOD)', location: 'LEFT_TORSO' },
      ],
    };

    expect(hydrateHasMASCFromFullUnit(fullUnit)).toBe(false);
    expect(hydrateHasSuperchargerFromFullUnit(fullUnit)).toBe(false);
    expect(hydrateHasMASCFromFullUnit(boosterUnit)).toBe(true);
    expect(hydrateHasSuperchargerFromFullUnit(boosterUnit)).toBe(true);

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: boosterUnit,
      aiWeapons: hydrateAIWeaponsFromFullUnit(boosterUnit, weaponLookup),
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.hasMASC).toBe(true);
    expect(unitState.hasSupercharger).toBe(true);
    expect(unitState.activeMASC).toBeUndefined();
    expect(unitState.activeSupercharger).toBeUndefined();
  });

  it('hydrates BattleMech Partial Wing jump bonus by weight class', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const existingEquipment =
      (fullUnit.equipment as readonly unknown[] | undefined) ?? [];
    const mediumPartialWingUnit: IFullUnit = {
      ...fullUnit,
      id: 'medium-partial-wing-test',
      tonnage: 55,
      unitType: 'BattleMech',
      equipment: [
        ...existingEquipment,
        { id: 'IS Partial Wing', location: 'LEFT_TORSO' },
      ],
    };
    const heavyPartialWingUnit: IFullUnit = {
      ...mediumPartialWingUnit,
      id: 'heavy-partial-wing-test',
      tonnage: 75,
    };
    const battleArmorWingUnit: IFullUnit = {
      ...mediumPartialWingUnit,
      id: 'battle-armor-partial-wing-test',
      unitType: 'Battle Armor',
      equipment: [
        ...existingEquipment,
        { id: 'Battle Armor Partial Wing', location: 'BODY' },
      ],
    };
    const protoMechWingUnit: IFullUnit = {
      ...mediumPartialWingUnit,
      id: 'protomech-partial-wing-test',
      unitType: 'ProtoMech',
      equipment: [
        ...existingEquipment,
        { id: 'ProtoMech Partial Wing', location: 'TORSO' },
      ],
    };

    expect(hydratePartialWingJumpBonusFromFullUnit(fullUnit)).toBeUndefined();
    expect(hydratePartialWingJumpBonusFromFullUnit(mediumPartialWingUnit)).toBe(
      2,
    );
    expect(hydratePartialWingJumpBonusFromFullUnit(heavyPartialWingUnit)).toBe(
      1,
    );
    expect(
      hydratePartialWingJumpBonusFromFullUnit(battleArmorWingUnit),
    ).toBeUndefined();
    expect(
      hydratePartialWingJumpBonusFromFullUnit(protoMechWingUnit),
    ).toBeUndefined();

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: mediumPartialWingUnit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.partialWingJumpBonus).toBe(2);
  });

  it('hydrates BattleMech talons from leg critical slots into unit state', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('caesar-ces-5d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(hydrateTalonStateFromFullUnit(fullUnit)).toEqual({
      leftLegHasTalons: true,
      rightLegHasTalons: true,
      leftArmHasTalons: false,
      rightArmHasTalons: false,
    });

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup),
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.leftLegHasTalons).toBe(true);
    expect(unitState.rightLegHasTalons).toBe(true);
    expect(unitState.leftArmHasTalons).toBe(false);
    expect(unitState.rightArmHasTalons).toBe(false);
  });

  it('hydrates quad front-leg talons from arm critical slots into unit state', () => {
    const fullUnit = {
      id: 'synthetic-quad-talons',
      chassis: 'Synthetic Quad',
      variant: 'QT',
      tonnage: 80,
      techBase: 'Inner Sphere',
      era: 'Civil War',
      unitType: 'BattleMech',
      criticalSlots: {
        LEFT_ARM: ['Talons'],
        RIGHT_ARM: ['Talons'],
      },
    } satisfies IFullUnit;

    expect(hydrateTalonStateFromFullUnit(fullUnit)).toEqual({
      leftLegHasTalons: false,
      rightLegHasTalons: false,
      leftArmHasTalons: true,
      rightArmHasTalons: true,
    });

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.leftArmHasTalons).toBe(true);
    expect(unitState.rightArmHasTalons).toBe(true);
  });

  it('hydrates BattleMech claws from arm critical slots into unit state', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('mantis-mts-t3');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(hydrateClawStateFromFullUnit(fullUnit)).toEqual({
      leftArmHasClaw: true,
      rightArmHasClaw: true,
    });

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup),
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.leftArmHasClaw).toBe(true);
    expect(unitState.rightArmHasClaw).toBe(true);
  });

  it('hydrates BattleMech stealth armor and critical-slot ECM from a real unit', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('wasp-wsp-3l');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(hydrateHasStealthArmorFromFullUnit(fullUnit)).toBe(true);
    expect(hydrateECMSuitesFromFullUnit(fullUnit)).toEqual([
      {
        type: 'guardian',
        sourceEquipmentId: 'ISGuardianECMSuite',
        sourceLocation: 'LEFT_TORSO',
      },
    ]);

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.hasStealthArmor).toBe(true);
  });

  it('hydrates standard ECM and CEWS equipment ids for EW seeding', () => {
    const ecmUnit: IFullUnit = {
      id: 'synthetic-ecm-suite-hydration-test',
      chassis: 'Synthetic',
      variant: 'ECM',
      tonnage: 50,
      techBase: 'Mixed',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [
        { id: '1-isguardianecm', location: 'HEAD' },
        { id: '1-isangelecm', location: 'LEFT_TORSO' },
        { id: '1-clecmsuite', location: 'RIGHT_TORSO,_AMMO:10' },
        { id: '1-clwatchdogcews', location: 'CENTER_TORSO' },
        {
          id: 'nova-combined-electronic-warfare-system-cews',
          location: 'HEAD',
        },
      ],
    };

    expect(hydrateECMSuitesFromFullUnit(ecmUnit)).toEqual([
      {
        type: 'guardian',
        sourceEquipmentId: '1-isguardianecm',
        sourceLocation: 'HEAD',
      },
      {
        type: 'angel',
        sourceEquipmentId: '1-isangelecm',
        sourceLocation: 'LEFT_TORSO',
      },
      {
        type: 'clan',
        sourceEquipmentId: '1-clecmsuite',
        sourceLocation: 'RIGHT_TORSO',
      },
      {
        type: 'clan',
        sourceEquipmentId: '1-clwatchdogcews',
        sourceLocation: 'CENTER_TORSO',
      },
      {
        type: 'clan',
        sourceEquipmentId: 'nova-combined-electronic-warfare-system-cews',
        sourceLocation: 'HEAD',
      },
    ]);
  });

  it('hydrates active probe and CEWS equipment ids for ECM countering', () => {
    const probeUnit: IFullUnit = {
      id: 'synthetic-active-probe-hydration-test',
      chassis: 'Synthetic',
      variant: 'Probe',
      tonnage: 50,
      techBase: 'Mixed',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [
        { id: '1-isbeagleactiveprobe', location: 'HEAD' },
        { id: '1-isbloodhoundactiveprobe', location: 'LEFT_TORSO' },
        { id: '1-clactiveprobe', location: 'RIGHT_TORSO' },
        { id: '1-cllightactiveprobe', location: 'RIGHT_ARM' },
        { id: '1-clwatchdogcews', location: 'CENTER_TORSO' },
        {
          id: 'nova-combined-electronic-warfare-system-cews',
          location: 'HEAD',
        },
      ],
    };

    expect(hydrateActiveProbesFromFullUnit(probeUnit)).toEqual([
      {
        type: 'beagle',
        sourceEquipmentId: '1-isbeagleactiveprobe',
        sourceLocation: 'HEAD',
      },
      {
        type: 'bloodhound',
        sourceEquipmentId: '1-isbloodhoundactiveprobe',
        sourceLocation: 'LEFT_TORSO',
      },
      {
        type: 'clan-active-probe',
        sourceEquipmentId: '1-clactiveprobe',
        sourceLocation: 'RIGHT_TORSO',
      },
      {
        type: 'light-active-probe',
        sourceEquipmentId: '1-cllightactiveprobe',
        sourceLocation: 'RIGHT_ARM',
      },
      {
        type: 'watchdog-cews',
        sourceEquipmentId: '1-clwatchdogcews',
        sourceLocation: 'CENTER_TORSO',
      },
      {
        type: 'nova-cews',
        sourceEquipmentId: 'nova-combined-electronic-warfare-system-cews',
        sourceLocation: 'HEAD',
      },
    ]);
  });

  it('hydrates BattleMech C3 equipment roles from mounted equipment and critical slots', () => {
    const c3Unit: IFullUnit = {
      id: 'synthetic-c3-equipment-hydration-test',
      chassis: 'Synthetic',
      variant: 'C3',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [
        { id: 'c3-master', location: 'HEAD' },
        { id: '1-c3-slave', location: 'RIGHT_TORSO,_AMMO:10' },
        { id: 'ISC3BoostedSystemSlaveUnit', location: 'LEFT_TORSO' },
        { id: 'C3 Boosted System (Master)', location: 'CENTER_TORSO' },
        { id: 'Improved C3 Computer (C3I)', location: 'RIGHT_ARM' },
        { id: 'BattleArmorC3', location: 'BODY' },
        { id: 'ISBC3i', location: 'BODY' },
      ],
      criticalSlots: {
        LEFT_ARM: ['ISC3MasterUnit', 'IS C3i Computer'],
      },
    };

    const c3Equipment = hydrateC3EquipmentFromFullUnit(c3Unit);

    expect(c3Equipment).toEqual([
      {
        role: 'master',
        sourceEquipmentId: 'c3-master',
        sourceLocation: 'HEAD',
      },
      {
        role: 'slave',
        sourceEquipmentId: '1-c3-slave',
        sourceLocation: 'RIGHT_TORSO',
      },
      {
        role: 'slave',
        sourceEquipmentId: 'ISC3BoostedSystemSlaveUnit',
        sourceLocation: 'LEFT_TORSO',
        boosted: true,
      },
      {
        role: 'master',
        sourceEquipmentId: 'C3 Boosted System (Master)',
        sourceLocation: 'CENTER_TORSO',
        boosted: true,
      },
      {
        role: 'c3i',
        sourceEquipmentId: 'Improved C3 Computer (C3I)',
        sourceLocation: 'RIGHT_ARM',
      },
      {
        role: 'master',
        sourceEquipmentId: 'ISC3MasterUnit',
        sourceLocation: 'LEFT_ARM',
      },
      {
        role: 'c3i',
        sourceEquipmentId: 'IS C3i Computer',
        sourceLocation: 'LEFT_ARM',
      },
    ]);

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: c3Unit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.c3Equipment).toEqual(c3Equipment);
  });

  it('does not hydrate Battle Armor C3 entries as BattleMech C3 equipment', () => {
    const battleArmorUnit: IFullUnit = {
      id: 'synthetic-battle-armor-c3-hydration-test',
      chassis: 'Synthetic',
      variant: 'BA C3',
      tonnage: 1,
      techBase: 'Inner Sphere',
      era: '3073',
      unitType: 'Battle Armor',
      equipment: [
        { id: 'BattleArmorC3', location: 'BODY' },
        { id: 'ISBC3i', location: 'BODY' },
      ],
      criticalSlots: {
        BODY: ['Battle Armor C3 (BC3)', 'Battle Armor Improved C3 (BC3I)'],
      },
    };

    expect(hydrateC3EquipmentFromFullUnit(battleArmorUnit)).toEqual([]);
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
    expect(unitState.heatSinks).toBe(ATLAS_CANONICAL_HEAT_SINKS);
    expect(unitState.heatSinkType).toBe('single');

    // Armor + structure end up on the IUnitGameState directly.
    const armorTotal = Object.values(unitState.armor).reduce(
      (a, b) => a + b,
      0,
    );
    expect(armorTotal).toBe(ATLAS_CANONICAL_TOTAL_ARMOR);
    expect(unitState.structure.center_torso).toBe(31);
    expect(unitState.armorTypeByLocation).toBeDefined();
    expect(Object.keys(unitState.armorTypeByLocation ?? {}).sort()).toEqual(
      Object.keys(unitState.armor).sort(),
    );
    expect(unitState.armorTypeByLocation?.head).toBe('STANDARD');
    expect(unitState.armorTypeByLocation?.center_torso_rear).toBe('STANDARD');

    // startingInternalStructure is seeded for the retreat-trigger ratio.
    expect(unitState.startingInternalStructure).toBeDefined();
    expect(unitState.startingInternalStructure?.center_torso).toBe(31);

    const wigeState = createHydratedUnitState({
      ...hydrated,
      fullUnit: {
        ...fullUnit,
        id: 'wige-motion-state-test',
        unitType: 'Vehicle',
        motionType: GroundMotionType.WIGE,
      },
    });
    expect(wigeState.unitType).toBe('Vehicle');
    expect(wigeState.motionType).toBe(GroundMotionType.WIGE);
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
