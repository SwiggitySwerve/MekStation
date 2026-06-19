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

it('hydrates Extended Fuel Tank critical text as secondary-effect-gated explosive equipment', () => {
  const fullUnit: IFullUnit = {
    id: 'synthetic-extended-fuel-tank',
    chassis: 'Synthetic',
    variant: 'Fuel',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3020',
    unitType: 'BattleMech',
    criticalSlots: {
      RIGHT_TORSO: ['Extended Fuel Tank'],
    },
  };

  const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);

  expect(manifest?.right_torso).toContainEqual(
    expect.objectContaining({
      slotIndex: 0,
      componentType: 'equipment',
      componentName: 'Extended Fuel Tank',
      explosionDamage: 20,
      explosionRequiresSecondaryEffects: true,
    }),
  );
});

it('hydrates official tonnage-suffixed Extended Fuel Tank critical text as represented explosive equipment', async () => {
  const service = getNodeCanonicalUnitService();
  const carbine = await service.getById('carbine-con-8h-haulermech');
  const vampyr = await service.getById('vampyr-sc-v-1-salvagemech');
  expect(carbine).not.toBeNull();
  expect(vampyr).not.toBeNull();
  if (!carbine || !vampyr) return;

  const carbineSlots = Object.values(
    hydrateCriticalSlotManifestFromFullUnit(carbine) ?? {},
  ).flat();
  const vampyrSlots = Object.values(
    hydrateCriticalSlotManifestFromFullUnit(vampyr) ?? {},
  ).flat();

  expect(carbineSlots).toContainEqual(
    expect.objectContaining({
      componentType: 'equipment',
      componentName: 'Extended Fuel Tank (1 ton)',
      explosionDamage: 20,
      explosionRequiresSecondaryEffects: true,
    }),
  );
  expect(vampyrSlots).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        componentType: 'equipment',
        componentName: 'Extended Fuel Tank (3 tons)',
        explosionDamage: 20,
        explosionRequiresSecondaryEffects: true,
      }),
    ]),
  );
});

it('hydrates official Blue Shield Particle Field Damper critical text as represented explosive equipment', async () => {
  const service = getNodeCanonicalUnitService();
  const spatha = await service.getById('spatha-sp2-x-warlord');
  expect(spatha).not.toBeNull();
  if (!spatha) return;

  const slots = Object.values(
    hydrateCriticalSlotManifestFromFullUnit(spatha) ?? {},
  ).flat();

  expect(slots).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        componentType: 'equipment',
        componentName: 'Blue Shield Particle Field Damper',
        explosionDamage: 5,
        explosionRequiresSecondaryEffects: true,
      }),
    ]),
  );
});

it('keeps represented Blue Shield critical explosion metadata when the source mode is active', () => {
  const fullUnit: IFullUnit = {
    id: 'synthetic-blue-shield-active',
    chassis: 'Synthetic',
    variant: 'Blue Shield Active',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3090',
    unitType: 'BattleMech',
    equipment: [
      {
        id: 'Blue Shield Particle Field Damper',
        location: 'Right Torso',
        mode: 'On',
      },
    ],
    criticalSlots: {
      RIGHT_TORSO: ['Blue Shield Particle Field Damper'],
    },
  };

  const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);

  expect(manifest?.right_torso).toContainEqual(
    expect.objectContaining({
      slotIndex: 0,
      componentType: 'equipment',
      componentName: 'Blue Shield Particle Field Damper',
      explosionDamage: 5,
      explosionRequiresSecondaryEffects: true,
    }),
  );
});

it('omits represented Blue Shield critical explosion metadata when the source mode is Off', () => {
  const fullUnit: IFullUnit = {
    id: 'synthetic-blue-shield-off',
    chassis: 'Synthetic',
    variant: 'Blue Shield Off',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3090',
    unitType: 'BattleMech',
    equipment: [
      {
        id: 'Blue Shield Particle Field Damper',
        location: 'Right Torso',
        currentMode: 'Off',
      },
    ],
    criticalSlots: {
      RIGHT_TORSO: ['Blue Shield Particle Field Damper'],
    },
  };

  const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);
  const [slot] = manifest?.right_torso ?? [];

  expect(slot).toMatchObject({
    slotIndex: 0,
    componentType: 'equipment',
    componentName: 'Blue Shield Particle Field Damper',
  });
  expect(slot).not.toHaveProperty('explosionDamage');
  expect(slot).not.toHaveProperty('explosionRequiresSecondaryEffects');
});

it('hydrates HotLoad weapon mode critical state only with explicit explosion damage metadata', () => {
  const aiWeapons = [
    {
      id: 'lrm-20-0',
      name: 'LRM 20',
      shortRange: 7,
      mediumRange: 14,
      longRange: 21,
      damage: 20,
      heat: 6,
      minRange: 6,
      ammoPerTon: 6,
      location: 'RIGHT_TORSO',
      destroyed: false,
    },
  ];
  const fullUnit: IFullUnit = {
    id: 'synthetic-hot-load-mode-state',
    chassis: 'Synthetic',
    variant: 'HotLoad',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3020',
    unitType: 'BattleMech',
    equipment: [
      {
        id: 'lrm-20',
        location: 'RIGHT_TORSO',
        currentMode: 'HotLoad',
        explosionDamage: 12,
      },
    ],
    criticalSlots: {
      RIGHT_TORSO: ['LRM 20'],
    },
  };

  const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit, aiWeapons);

  expect(manifest?.right_torso[0]).toMatchObject({
    slotIndex: 0,
    componentType: 'weapon',
    componentName: 'LRM 20',
    weaponId: 'lrm-20-0',
    hotLoaded: true,
    explosionDamage: 12,
  });

  const modeOnlyManifest = hydrateCriticalSlotManifestFromFullUnit(
    {
      ...fullUnit,
      equipment: [
        {
          id: 'lrm-20',
          location: 'RIGHT_TORSO',
          currentMode: 'HotLoad',
        },
      ],
    },
    aiWeapons,
  );

  expect(modeOnlyManifest?.right_torso[0]).toMatchObject({
    componentType: 'weapon',
    componentName: 'LRM 20',
    weaponId: 'lrm-20-0',
  });
  expect(modeOnlyManifest?.right_torso[0]).not.toHaveProperty('hotLoaded');
  expect(modeOnlyManifest?.right_torso[0]).not.toHaveProperty(
    'explosionDamage',
  );

  const linkedAmmoOnlyManifest = hydrateCriticalSlotManifestFromFullUnit(
    {
      ...fullUnit,
      equipment: [
        {
          id: 'lrm-20',
          location: 'RIGHT_TORSO',
          currentMode: 'HotLoad',
          linkedEquipment: ['lrm-20-ammo'],
        },
        {
          id: 'lrm-20-ammo',
          location: 'RIGHT_TORSO',
          explosionDamage: 120,
        },
      ],
    },
    aiWeapons,
  );

  expect(linkedAmmoOnlyManifest?.right_torso[0]).toMatchObject({
    componentType: 'weapon',
    componentName: 'LRM 20',
    weaponId: 'lrm-20-0',
    hotLoaded: true,
    explosionDamage: 120,
  });

  const ambiguousLinkedAmmoManifest = hydrateCriticalSlotManifestFromFullUnit(
    {
      ...fullUnit,
      equipment: [
        {
          id: 'lrm-20',
          location: 'RIGHT_TORSO',
          currentMode: 'HotLoad',
          linkedEquipment: ['lrm-20-ammo'],
        },
        {
          id: 'lrm-20-ammo',
          location: 'RIGHT_TORSO',
          explosionDamage: 120,
        },
        {
          id: 'lrm-20-ammo',
          location: 'RIGHT_TORSO',
          explosionDamage: 120,
        },
      ],
    },
    aiWeapons,
  );

  expect(ambiguousLinkedAmmoManifest?.right_torso[0]).toMatchObject({
    componentType: 'weapon',
    componentName: 'LRM 20',
    weaponId: 'lrm-20-0',
  });
  expect(ambiguousLinkedAmmoManifest?.right_torso[0]).not.toHaveProperty(
    'hotLoaded',
  );
  expect(ambiguousLinkedAmmoManifest?.right_torso[0]).not.toHaveProperty(
    'explosionDamage',
  );

  const ambiguousManifest = hydrateCriticalSlotManifestFromFullUnit(
    {
      ...fullUnit,
      equipment: [
        {
          id: 'lrm-20',
          location: 'RIGHT_TORSO',
          currentMode: 'HotLoad',
          explosionDamage: 12,
        },
        {
          id: 'lrm-20',
          location: 'RIGHT_TORSO',
          currentMode: 'HotLoad',
          explosionDamage: 12,
        },
      ],
    },
    aiWeapons,
  );

  expect(ambiguousManifest?.right_torso[0]).toMatchObject({
    componentType: 'weapon',
    componentName: 'LRM 20',
    weaponId: 'lrm-20-0',
  });
  expect(ambiguousManifest?.right_torso[0]).not.toHaveProperty('hotLoaded');
  expect(ambiguousManifest?.right_torso[0]).not.toHaveProperty(
    'explosionDamage',
  );
});
