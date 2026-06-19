import type {
  IFullUnit,
  IHydratedUnitData,
} from './atlasHydration.test-helpers';

import {
  ATLAS_CANONICAL_HEAT_SINKS,
  ATLAS_CANONICAL_TOTAL_ARMOR,
  ATLAS_TONNAGE,
  AttackAI,
  CriticalEffectType,
  DEFAULT_COMPONENT_DAMAGE,
  Facing,
  FiringArc,
  GameSide,
  GroundMotionType,
  LOCUST_CANONICAL_TOTAL_ARMOR,
  LOCUST_TONNAGE,
  WEAPON_CATALOG_FILES,
  buildWeaponLookupFromCatalogFiles,
  calculateCommandConsoleInitiativeBonus,
  createHydratedUnitState,
  createMinimalUnitState,
  getNodeCanonicalUnitService,
  hydrateAIWeaponsFromFullUnit,
  hydrateAIWeaponsFromFullUnitStrict,
  hydrateAIWeaponsFromFullUnitWithReport,
  hydrateActiveProbesFromFullUnit,
  hydrateArmorFromFullUnit,
  hydrateC3EquipmentFromFullUnit,
  hydrateClawStateFromFullUnit,
  hydrateCriticalSlotManifestFromFullUnit,
  hydrateECMSuitesFromFullUnit,
  hydrateEdgePointsFromFullUnit,
  hydrateHasMASCFromFullUnit,
  hydrateHasStealthArmorFromFullUnit,
  hydrateHasSuperchargerFromFullUnit,
  hydrateHasTSMFromFullUnit,
  hydrateHeatSinksFromFullUnit,
  hydrateInitiativeEquipmentFromFullUnit,
  hydrateMovementCapabilityFromFullUnit,
  hydratePartialWingJumpBonusFromFullUnit,
  hydratePilotAbilitiesFromFullUnit,
  hydrateStructureFromFullUnit,
  hydrateTalonStateFromFullUnit,
  hydrateTargetingComputerEquipmentFromFullUnit,
  resolveCatalogDamage,
  resolveCriticalHits,
  toCatalogAIUnitState,
  weaponLookup,
} from './atlasHydration.test-helpers';

it('does not infer Artemis allocation for multiple unlinked same-location launchers', () => {
  const ambiguousArtemisUnit: IFullUnit = {
    id: 'synthetic-ambiguous-artemis-iv',
    chassis: 'Synthetic',
    variant: 'Ambiguous Artemis IV',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3050',
    unitType: 'BattleMech',
    equipment: [
      { id: 'lrm-10', location: 'RIGHT_TORSO' },
      { id: 'srm-6', location: 'RIGHT_TORSO' },
      { id: 'artemis-iv', location: 'RIGHT_TORSO' },
    ],
    criticalSlots: {
      RIGHT_TORSO: [
        'IS LRM 10',
        'IS SRM 6',
        'ISArtemisIV',
        'IS Ammo LRM-10 Artemis-capable',
        'IS Ammo SRM-6 Artemis-capable',
      ],
    },
  };

  const weapons = hydrateAIWeaponsFromFullUnit(
    ambiguousArtemisUnit,
    weaponLookup,
  );
  const lrm = weapons.find((weapon) => weapon.name === 'LRM 10');
  const srm = weapons.find((weapon) => weapon.name === 'SRM 6');

  expect(lrm?.hasArtemisIV).toBeUndefined();
  expect(srm?.hasArtemisIV).toBeUndefined();
  expect(lrm?.hasPrototypeArtemisIV).toBeUndefined();
  expect(srm?.hasPrototypeArtemisIV).toBeUndefined();
  expect(lrm?.hasArtemisV).toBeUndefined();
  expect(srm?.hasArtemisV).toBeUndefined();
});

it('hydrates unlinked same-location Artemis guidance when FCS cardinality exactly matches compatible launchers', () => {
  const cardinalityMatchedArtemisUnit: IFullUnit = {
    id: 'synthetic-cardinality-matched-artemis-iv',
    chassis: 'Synthetic',
    variant: 'Cardinality Matched Artemis IV',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3050',
    unitType: 'BattleMech',
    equipment: [
      { id: 'lrm-10', location: 'RIGHT_TORSO' },
      { id: 'srm-6', location: 'RIGHT_TORSO' },
      { id: 'artemis-iv', location: 'RIGHT_TORSO' },
      { id: 'artemis-iv', location: 'RIGHT_TORSO' },
    ],
    criticalSlots: {
      RIGHT_TORSO: [
        'IS LRM 10',
        'IS SRM 6',
        'ISArtemisIV',
        'ISArtemisIV',
        'IS Ammo LRM-10 Artemis-capable',
        'IS Ammo SRM-6 Artemis-capable',
      ],
    },
  };

  const weapons = hydrateAIWeaponsFromFullUnit(
    cardinalityMatchedArtemisUnit,
    weaponLookup,
  );
  const lrm = weapons.find((weapon) => weapon.name === 'LRM 10');
  const srm = weapons.find((weapon) => weapon.name === 'SRM 6');

  expect(lrm?.hasArtemisIV).toBe(true);
  expect(srm?.hasArtemisIV).toBe(true);
  expect(lrm?.hasPrototypeArtemisIV).toBeUndefined();
  expect(srm?.hasPrototypeArtemisIV).toBeUndefined();
  expect(lrm?.hasArtemisV).toBeUndefined();
  expect(srm?.hasArtemisV).toBeUndefined();
});

it('does not infer Artemis allocation when exact-cardinality FCS kinds conflict', () => {
  const mixedKindArtemisUnit: IFullUnit = {
    id: 'synthetic-mixed-kind-cardinality-artemis',
    chassis: 'Synthetic',
    variant: 'Mixed Kind Cardinality Artemis',
    tonnage: 50,
    techBase: 'Mixed',
    era: '3070',
    unitType: 'BattleMech',
    equipment: [
      { id: 'lrm-10', location: 'RIGHT_TORSO' },
      { id: 'srm-6', location: 'RIGHT_TORSO' },
      { id: 'artemis-iv', location: 'RIGHT_TORSO' },
      { id: 'artemis-iv', location: 'RIGHT_TORSO' },
      { id: 'cl-artemis-v', location: 'RIGHT_TORSO' },
      { id: 'cl-artemis-v', location: 'RIGHT_TORSO' },
    ],
    criticalSlots: {
      RIGHT_TORSO: [
        'IS LRM 10',
        'IS SRM 6',
        'ISArtemisIV',
        'ISArtemisIV',
        'CLArtemisV',
        'CLArtemisV',
        'IS Ammo LRM-10 Artemis-capable',
        'IS Ammo SRM-6 Artemis-capable',
        'CL Ammo LRM-10 Artemis V-capable',
        'CL Ammo SRM-6 Artemis V-capable',
      ],
    },
  };

  const weapons = hydrateAIWeaponsFromFullUnit(
    mixedKindArtemisUnit,
    weaponLookup,
  );
  const lrm = weapons.find((weapon) => weapon.name === 'LRM 10');
  const srm = weapons.find((weapon) => weapon.name === 'SRM 6');

  expect(lrm?.hasArtemisIV).toBeUndefined();
  expect(srm?.hasArtemisIV).toBeUndefined();
  expect(lrm?.hasPrototypeArtemisIV).toBeUndefined();
  expect(srm?.hasPrototypeArtemisIV).toBeUndefined();
  expect(lrm?.hasArtemisV).toBeUndefined();
  expect(srm?.hasArtemisV).toBeUndefined();
});

it('carries explicit Artemis FCS linked-equipment metadata into critical slots', () => {
  const linkedArtemisUnit: IFullUnit = {
    id: 'synthetic-linked-artemis-iv-critical',
    chassis: 'Synthetic',
    variant: 'Linked Artemis IV Critical',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3050',
    unitType: 'BattleMech',
    equipment: [
      { id: 'lrm-10', location: 'RIGHT_TORSO' },
      { id: 'srm-6', location: 'RIGHT_TORSO' },
      {
        id: 'artemis-iv',
        location: 'RIGHT_TORSO',
        linkedEquipment: ['lrm-10'],
      },
    ],
    criticalSlots: {
      RIGHT_TORSO: [
        'IS LRM 10',
        'IS SRM 6',
        'ISArtemisIV',
        'IS Ammo LRM-10 Artemis-capable',
        'IS Ammo SRM-6 Artemis-capable',
      ],
    },
  };

  const weapons = hydrateAIWeaponsFromFullUnit(linkedArtemisUnit, weaponLookup);
  const manifest = hydrateCriticalSlotManifestFromFullUnit(
    linkedArtemisUnit,
    weapons,
  );
  const artemisSlot = manifest?.right_torso.find(
    (slot) => slot.componentName === 'ISArtemisIV',
  );

  expect(artemisSlot).toMatchObject({
    componentType: 'equipment',
    linkedCriticalWeaponId: expect.stringContaining('lrm-10'),
    linkedCriticalWeaponName: 'LRM 10',
  });
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
  const srmLaunchers = weapons.filter((weapon) => /srm\s*6/i.test(weapon.name));

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

  const { structure, totalStructure } = hydrateStructureFromFullUnit(fullUnit);
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
