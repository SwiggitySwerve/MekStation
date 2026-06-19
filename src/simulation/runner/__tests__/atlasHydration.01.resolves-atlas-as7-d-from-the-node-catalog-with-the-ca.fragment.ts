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

it('uses explicit Artemis FCS linked-equipment metadata before same-location guidance fallback', () => {
  const linkedArtemisUnit: IFullUnit = {
    id: 'synthetic-linked-artemis-iv',
    chassis: 'Synthetic',
    variant: 'Linked Artemis IV',
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
  const lrm = weapons.find((weapon) => weapon.name === 'LRM 10');
  const srm = weapons.find((weapon) => weapon.name === 'SRM 6');

  expect(lrm?.hasArtemisIV).toBe(true);
  expect(srm?.hasArtemisIV).toBeUndefined();
  expect(srm?.hasPrototypeArtemisIV).toBeUndefined();
  expect(srm?.hasArtemisV).toBeUndefined();
});
