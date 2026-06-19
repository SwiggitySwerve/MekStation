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

it('hydrates mounted Targeting Computer equipment into combat state', () => {
  const unit: IFullUnit = {
    id: 'synthetic-targeting-computer-hydration-test',
    chassis: 'Synthetic',
    variant: 'TC',
    tonnage: 75,
    techBase: 'Inner Sphere',
    era: '3060',
    unitType: 'BattleMech',
    equipment: [{ id: 'targeting-computer', location: 'RIGHT_TORSO' }],
    criticalSlots: {
      RIGHT_TORSO: ['IS Targeting Computer'],
    },
  };

  expect(hydrateTargetingComputerEquipmentFromFullUnit(unit)).toBe(true);
  expect(
    createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: unit,
      aiWeapons: [],
    }).targetingComputerEquipment,
  ).toBe(true);
});

it('hydrates initiative equipment from official command-console BattleMech critical slots', async () => {
  const service = getNodeCanonicalUnitService();
  const fullUnit = await service.getById('kiso-k-3n-krhq-commandmech');

  expect(fullUnit).not.toBeNull();
  if (!fullUnit) return;
  expect(fullUnit.id).toBe('kiso-k-3n-krhq-commandmech');

  expect(hydrateInitiativeEquipmentFromFullUnit(fullUnit)).toMatchObject({
    workingCommunicationsTonnage: 3,
    communicationsMode: 'Default',
    cockpitType: 'Command Console',
    tonnage: 100,
    unitType: 'BattleMech',
  });
});

it('hydrates official communications equipment id tonnage shapes without inferring tank command consoles', async () => {
  const mobileHq: IFullUnit = {
    id: 'mobile-headquarters',
    chassis: 'Mobile Headquarters',
    variant: 'Standard',
    tonnage: 25,
    techBase: 'Inner Sphere',
    era: '3025',
    unitType: 'Vehicle',
    equipment: [{ id: 'communications-equipment:size:7.0', location: 'BODY' }],
  };
  const packratToc: IFullUnit = {
    id: 'packrat-lrpv-pkr-t5-toc',
    chassis: 'Packrat LRPV',
    variant: 'PKR-T5 (TOC)',
    tonnage: 20,
    techBase: 'Inner Sphere',
    era: '3025',
    unitType: 'Vehicle',
    equipment: [
      { id: 'communications-equipment-2-ton:omni', location: 'BODY' },
    ],
  };

  expect(mobileHq.id).toBe('mobile-headquarters');
  expect(packratToc.id).toBe('packrat-lrpv-pkr-t5-toc');
  expect(hydrateInitiativeEquipmentFromFullUnit(mobileHq)).toMatchObject({
    workingCommunicationsTonnage: 7,
    communicationsMode: 'Default',
    tonnage: 25,
    unitType: 'Vehicle',
  });
  expect(hydrateInitiativeEquipmentFromFullUnit(packratToc)).toMatchObject({
    workingCommunicationsTonnage: 2,
    communicationsMode: 'Default',
    tonnage: 20,
    unitType: 'Vehicle',
  });
  expect(
    hydrateInitiativeEquipmentFromFullUnit(packratToc)?.cockpitType,
  ).toBeUndefined();
});

it('hydrates official command-console producer ids without granting BattleMech cockpit eligibility', async () => {
  const tankCommandConsole: IFullUnit = {
    id: 'fury-command-tank-cx-17',
    chassis: 'Fury Command Tank',
    variant: 'CX-17',
    tonnage: 80,
    techBase: 'Inner Sphere',
    era: '3025',
    unitType: 'Vehicle',
    equipment: [{ id: 'istankcockpitcommandconsole', location: 'BODY' }],
  };
  const packratToc: IFullUnit = {
    id: 'packrat-lrpv-pkr-t5-toc',
    chassis: 'Packrat LRPV',
    variant: 'PKR-T5 (TOC)',
    tonnage: 20,
    techBase: 'Inner Sphere',
    era: '3025',
    unitType: 'Vehicle',
    equipment: [
      { id: 'communications-equipment-2-ton:omni', location: 'BODY' },
      { id: 'istankcockpitcommandconsole', location: 'BODY' },
    ],
  };
  const service = getNodeCanonicalUnitService();
  const remoteDroneCommandConsole = await service.getById('lament-lmt-2d');

  expect(tankCommandConsole.id).toBe('fury-command-tank-cx-17');
  expect(packratToc.id).toBe('packrat-lrpv-pkr-t5-toc');
  expect(remoteDroneCommandConsole).not.toBeNull();
  if (!remoteDroneCommandConsole) return;

  const furyInitiativeEquipment =
    hydrateInitiativeEquipmentFromFullUnit(tankCommandConsole);
  const packratInitiativeEquipment =
    hydrateInitiativeEquipmentFromFullUnit(packratToc);
  const remoteDroneInitiativeEquipment = hydrateInitiativeEquipmentFromFullUnit(
    remoteDroneCommandConsole,
  );

  expect(furyInitiativeEquipment).toEqual({
    commandConsoleProducerEquipmentIds: ['istankcockpitcommandconsole'],
    tonnage: 80,
    unitType: 'Vehicle',
  });
  expect(packratInitiativeEquipment).toMatchObject({
    workingCommunicationsTonnage: 2,
    communicationsMode: 'Default',
    commandConsoleProducerEquipmentIds: ['istankcockpitcommandconsole'],
    tonnage: 20,
    unitType: 'Vehicle',
  });
  expect(remoteDroneInitiativeEquipment).toEqual({
    cockpitType: 'Standard',
    commandConsoleProducerEquipmentIds: ['ISRemoteDroneCommandConsole'],
    tonnage: 65,
    unitType: 'BattleMech',
  });
  expect(calculateCommandConsoleInitiativeBonus(furyInitiativeEquipment)).toBe(
    0,
  );
  expect(
    calculateCommandConsoleInitiativeBonus(packratInitiativeEquipment),
  ).toBe(0);
  expect(
    calculateCommandConsoleInitiativeBonus(remoteDroneInitiativeEquipment),
  ).toBe(0);
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
  const armorTotal = Object.values(unitState.armor).reduce((a, b) => a + b, 0);
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
