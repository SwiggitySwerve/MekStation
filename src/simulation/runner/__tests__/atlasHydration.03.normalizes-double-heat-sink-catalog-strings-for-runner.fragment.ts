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

it('hydrates source-backed pilot abilities and generic Edge points from full unit state', async () => {
  const service = getNodeCanonicalUnitService();
  const fullUnit = await service.getById('atlas-as7-d');
  expect(fullUnit).not.toBeNull();
  if (!fullUnit) return;

  const edgeUnit: IFullUnit = {
    ...fullUnit,
    id: 'edge-hydration-test',
    abilities: ['edge', 'edge_when_headhit'],
    edgePointsRemaining: 2,
  };
  const genericEdgeUnit: IFullUnit = {
    ...fullUnit,
    id: 'generic-edge-hydration-test',
    abilities: ['edge'],
  };
  const triggerOnlyEdgeUnit: IFullUnit = {
    ...fullUnit,
    id: 'trigger-only-edge-hydration-test',
    abilities: ['edge_when_headhit'],
  };

  expect(hydratePilotAbilitiesFromFullUnit(edgeUnit)).toEqual([
    'edge',
    'edge_when_headhit',
  ]);
  expect(hydrateEdgePointsFromFullUnit(edgeUnit)).toBe(2);
  expect(hydrateEdgePointsFromFullUnit(genericEdgeUnit)).toBe(1);
  expect(hydrateEdgePointsFromFullUnit(triggerOnlyEdgeUnit)).toBeUndefined();

  const unitState = createHydratedUnitState({
    runnerUnitId: 'player-1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    fullUnit: genericEdgeUnit,
    aiWeapons: [],
    gunnery: 4,
    piloting: 5,
  });

  expect(unitState.abilities).toEqual(['edge']);
  expect(unitState.edgePointsRemaining).toBe(1);
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
  expect(hydratePartialWingJumpBonusFromFullUnit(heavyPartialWingUnit)).toBe(1);
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

it('hydrates Prototype Improved Jump Jet critical text as secondary-effect-gated explosive equipment', () => {
  const fullUnit: IFullUnit = {
    id: 'synthetic-prototype-improved-jump-jet',
    chassis: 'Synthetic',
    variant: 'PIJJ',
    tonnage: 50,
    techBase: 'Inner Sphere',
    era: '3020',
    unitType: 'BattleMech',
    criticalSlots: {
      RIGHT_TORSO: ['ISPrototypeImprovedJumpJet'],
    },
  };

  const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);

  expect(manifest?.right_torso).toContainEqual(
    expect.objectContaining({
      slotIndex: 0,
      componentType: 'equipment',
      componentName: 'ISPrototypeImprovedJumpJet',
      explosionDamage: 10,
      explosionRequiresSecondaryEffects: true,
    }),
  );
});
