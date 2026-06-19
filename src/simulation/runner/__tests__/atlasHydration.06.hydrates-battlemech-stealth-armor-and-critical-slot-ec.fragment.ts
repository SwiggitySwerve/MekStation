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
      { id: '1-isguardianecm', location: 'HEAD', currentMode: 'ECCM' },
      { id: '1-isangelecm', location: 'LEFT_TORSO', mode: 'Off' },
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
      mode: 'eccm',
    },
    {
      type: 'angel',
      sourceEquipmentId: '1-isangelecm',
      sourceLocation: 'LEFT_TORSO',
      mode: 'off',
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

it('hydrates Boosted Comm Implant pilot ability as represented BattleMech C3i network-capable state', () => {
  const c3iImplantUnit: IFullUnit = {
    id: 'synthetic-boosted-comm-implant-hydration-test',
    chassis: 'Synthetic',
    variant: 'Boosted Comm',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3070',
    unitType: 'BattleMech',
    abilities: ['boost_comm_implant'],
  };

  expect(hydrateC3EquipmentFromFullUnit(c3iImplantUnit)).toEqual([
    {
      role: 'c3i',
      sourceEquipmentId: 'boost_comm_implant',
    },
  ]);

  const unitState = createHydratedUnitState({
    runnerUnitId: 'player-1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    fullUnit: c3iImplantUnit,
    aiWeapons: [],
    gunnery: 4,
    piloting: 5,
  });

  expect(unitState.c3Equipment).toEqual([
    {
      role: 'c3i',
      sourceEquipmentId: 'boost_comm_implant',
    },
  ]);
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

it('hydrates represented initiative equipment into hydrated runner state', () => {
  const commandUnit: IFullUnit = {
    id: 'synthetic-command-console-hydration-test',
    chassis: 'Synthetic',
    variant: 'Command',
    tonnage: 100,
    techBase: 'Inner Sphere',
    era: '3025',
    unitType: 'BattleMech',
    cockpit: 'COMMAND_CONSOLE',
    commandConsoleCrewActive: true,
    equipment: [{ id: 'medium-laser', location: 'CENTER_TORSO' }],
    criticalSlots: {
      LEFT_TORSO: [
        'Communications Equipment (3 ton)',
        'Communications Equipment (3 ton)',
        'Communications Equipment (3 ton)',
      ],
    },
  } as unknown as IFullUnit;
  const expected = {
    workingCommunicationsTonnage: 3,
    communicationsMode: 'Default',
    cockpitType: 'Command Console',
    commandConsoleCrewActive: true,
    tonnage: 100,
    unitType: 'BattleMech',
  };

  expect(hydrateInitiativeEquipmentFromFullUnit(commandUnit)).toEqual(expected);
  expect(
    createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: commandUnit,
      aiWeapons: hydrateAIWeaponsFromFullUnit(commandUnit, weaponLookup),
    }).initiativeEquipment,
  ).toEqual(expected);
});
