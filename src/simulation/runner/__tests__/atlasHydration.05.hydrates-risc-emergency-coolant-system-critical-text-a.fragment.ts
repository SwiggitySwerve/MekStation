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

it('hydrates RISC Emergency Coolant System critical text as secondary-effect-gated explosive equipment', () => {
  const fullUnit: IFullUnit = {
    id: 'synthetic-risc-emergency-coolant-system',
    chassis: 'Synthetic',
    variant: 'ECS',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3136',
    unitType: 'BattleMech',
    criticalSlots: {
      RIGHT_TORSO: ['RISC Emergency Coolant System'],
    },
  };

  const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);

  expect(manifest?.right_torso).toContainEqual(
    expect.objectContaining({
      slotIndex: 0,
      componentType: 'equipment',
      componentName: 'RISC Emergency Coolant System',
      explosionDamage: 5,
      explosionRequiresSecondaryEffects: true,
    }),
  );
});

it('hydrates generic equipment explosion damage only from explicit source metadata', () => {
  const fullUnit: IFullUnit = {
    id: 'synthetic-explicit-equipment-explosion',
    chassis: 'Synthetic',
    variant: 'Explicit Explosion',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3136',
    unitType: 'BattleMech',
    equipment: [
      {
        id: 'PPC Capacitor',
        location: 'Right Torso',
        explosionDamage: 15,
      },
    ],
    criticalSlots: {
      RIGHT_TORSO: ['PPC Capacitor'],
    },
  };

  const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);

  expect(manifest?.right_torso[0]).toMatchObject({
    slotIndex: 0,
    componentType: 'equipment',
    componentName: 'PPC Capacitor',
    explosionDamage: 15,
  });

  const nameOnlyManifest = hydrateCriticalSlotManifestFromFullUnit({
    ...fullUnit,
    equipment: [
      {
        id: 'PPC Capacitor',
        location: 'Right Torso',
      },
    ],
  });
  expect(nameOnlyManifest?.right_torso[0]).toMatchObject({
    componentType: 'equipment',
    componentName: 'PPC Capacitor',
  });
  expect(nameOnlyManifest?.right_torso[0]).not.toHaveProperty(
    'explosionDamage',
  );

  const duplicateMetadataManifest = hydrateCriticalSlotManifestFromFullUnit({
    ...fullUnit,
    equipment: [
      {
        id: 'PPC Capacitor',
        location: 'Right Torso',
        explosionDamage: 15,
      },
      {
        id: 'PPC Capacitor',
        location: 'Right Torso',
        explosionDamage: 15,
      },
    ],
  });
  expect(duplicateMetadataManifest?.right_torso[0]).toMatchObject({
    componentType: 'equipment',
    componentName: 'PPC Capacitor',
  });
  expect(duplicateMetadataManifest?.right_torso[0]).not.toHaveProperty(
    'explosionDamage',
  );
});

it('hydrates RISC Laser Pulse Module linked-laser criticals from exact explicit or unambiguous same-location laser state', () => {
  const fullUnit: IFullUnit = {
    id: 'synthetic-risc-laser-pulse-module',
    chassis: 'Synthetic',
    variant: 'RISC LPM',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3020',
    unitType: 'BattleMech',
    equipment: [
      {
        id: 'medium-laser',
        location: 'RIGHT_TORSO',
      },
      {
        id: 'risclaserpulsemodule',
        location: 'RIGHT_TORSO',
        linkedEquipment: ['medium-laser'],
      },
    ],
    criticalSlots: {
      RIGHT_TORSO: ['Medium Laser', 'RISC Laser Pulse Module'],
    },
  };
  const aiWeapons = [
    {
      id: 'medium-laser-0',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      location: 'RIGHT_TORSO',
      destroyed: false,
    },
  ];

  const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit, aiWeapons);

  expect(manifest?.right_torso).toContainEqual(
    expect.objectContaining({
      slotIndex: 1,
      componentType: 'equipment',
      componentName: 'RISC Laser Pulse Module',
      linkedCriticalWeaponId: 'medium-laser-0',
      linkedCriticalWeaponName: 'Medium Laser',
    }),
  );

  const unambiguousFallbackManifest = hydrateCriticalSlotManifestFromFullUnit(
    {
      ...fullUnit,
      equipment: [
        {
          id: 'medium-laser',
          location: 'RIGHT_TORSO',
        },
        {
          id: 'risclaserpulsemodule',
          location: 'RIGHT_TORSO',
        },
      ],
    },
    aiWeapons,
  );

  expect(unambiguousFallbackManifest?.right_torso[1]).toMatchObject({
    componentType: 'equipment',
    componentName: 'RISC Laser Pulse Module',
    linkedCriticalWeaponId: 'medium-laser-0',
    linkedCriticalWeaponName: 'Medium Laser',
  });

  if (!unambiguousFallbackManifest) {
    throw new Error('expected RISC LPM critical manifest');
  }

  const result = resolveCriticalHits(
    'synthetic-risc-laser-pulse-module',
    'right_torso',
    unambiguousFallbackManifest,
    DEFAULT_COMPONENT_DAMAGE,
    () => 2,
    1,
  );

  expect(result.hits[0].effect).toEqual({
    type: CriticalEffectType.WeaponDestroyed,
    equipmentDestroyed: 'Medium Laser',
    weaponDisabled: 'medium-laser-0',
  });
  expect(result.updatedComponentDamage.weaponsDestroyed).toEqual([
    'medium-laser-0',
  ]);
});

it('keeps RISC Laser Pulse Module criticals generic when same-location laser fallback is ambiguous or absent', () => {
  const fullUnit: IFullUnit = {
    id: 'synthetic-risc-laser-pulse-module-ambiguous',
    chassis: 'Synthetic',
    variant: 'RISC LPM',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3020',
    unitType: 'BattleMech',
    equipment: [
      {
        id: 'medium-laser',
        location: 'RIGHT_TORSO',
      },
      {
        id: 'risclaserpulsemodule',
        location: 'RIGHT_TORSO',
      },
    ],
    criticalSlots: {
      RIGHT_TORSO: ['Medium Laser', 'RISC Laser Pulse Module'],
    },
  };
  const ambiguousLaserWeapons = [
    {
      id: 'medium-laser-0',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      location: 'RIGHT_TORSO',
      destroyed: false,
    },
    {
      id: 'small-laser-1',
      name: 'Small Laser',
      shortRange: 1,
      mediumRange: 2,
      longRange: 3,
      damage: 3,
      heat: 1,
      minRange: 0,
      ammoPerTon: -1,
      location: 'RIGHT_TORSO',
      destroyed: false,
    },
  ];
  const noSameLocationLaserWeapons = [
    {
      id: 'medium-laser-0',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      location: 'LEFT_TORSO',
      destroyed: false,
    },
  ];

  const ambiguousManifest = hydrateCriticalSlotManifestFromFullUnit(
    fullUnit,
    ambiguousLaserWeapons,
  );
  const noSameLocationManifest = hydrateCriticalSlotManifestFromFullUnit(
    fullUnit,
    noSameLocationLaserWeapons,
  );

  expect(ambiguousManifest?.right_torso[1]).toMatchObject({
    componentType: 'equipment',
    componentName: 'RISC Laser Pulse Module',
  });
  expect(ambiguousManifest?.right_torso[1]).not.toHaveProperty(
    'linkedCriticalWeaponId',
  );
  expect(noSameLocationManifest?.right_torso[1]).toMatchObject({
    componentType: 'equipment',
    componentName: 'RISC Laser Pulse Module',
  });
  expect(noSameLocationManifest?.right_torso[1]).not.toHaveProperty(
    'linkedCriticalWeaponId',
  );

  const explicitMultiLinkedManifest = hydrateCriticalSlotManifestFromFullUnit(
    {
      ...fullUnit,
      equipment: [
        {
          id: 'medium-laser',
          location: 'RIGHT_TORSO',
        },
        {
          id: 'small-laser',
          location: 'RIGHT_TORSO',
        },
        {
          id: 'risclaserpulsemodule',
          location: 'RIGHT_TORSO',
          linkedEquipment: ['medium-laser', 'small-laser'],
        },
      ],
    },
    ambiguousLaserWeapons,
  );
  expect(explicitMultiLinkedManifest?.right_torso[1]).toMatchObject({
    componentType: 'equipment',
    componentName: 'RISC Laser Pulse Module',
  });
  expect(explicitMultiLinkedManifest?.right_torso[1]).not.toHaveProperty(
    'linkedCriticalWeaponId',
  );
});
