/**
 * Small craft definition to AerospaceState (UL-12b).
 *
 * Fixtures are the repo converter's output for three pinned mm-data sources
 * (50f7efef0c9f775b0258f8283525ed4f906e1985), fluff removed. MegaMek
 * 48fcb2f64a1b3f2d575707ce5653dad64927b587:
 * - BLKSmallCraftFile.java:125-128: SI is the explicit structural_integrity tag
 * - SmallCraft.java:77-78: the side locations are Aero's wing locations, named
 *   "Left Side" and "Right Side"
 * - SmallCraft.java:651-680: a rear-mounted side weapon fires into the aft-side arc
 */

import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import { createAerospaceStore } from '@/stores/useAerospaceStore';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { BayType } from '@/types/unit/CapitalShipInterfaces';

import {
  mapAerospaceDefinitionToState,
  type AerospaceDefinition,
} from '../aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '../definitionTypes';
import { loadUnitDefinition } from '../loadUnitDefinition';

const QUARTERS = [
  '2ndclassquarters:0.0:0:-1::-1:0',
  'crewquarters:0.0:0:-1::-1:0',
  '1stclassquarters:0.0:0:-1::-1:0',
];

const fixtures = [
  {
    armor: {
      byArc: { AFT: 56, LEFT_SIDE: 73, NOSE: 86, RIGHT_SIDE: 73 },
      type: 'AEROSPACE',
    },
    cargoCapacity: 4.5,
    chassis: 'Dragonstar Assault Transport',
    cockpit: 'STANDARD',
    crew: 22,
    engine: { type: 'ICE' },
    equipment: [
      { id: 'islargepulselaser', location: 'NOSE', name: 'ISLargePulseLaser' },
      { id: 'isermediumlaser', location: 'NOSE', name: 'ISERMediumLaser' },
      {
        id: 'ismediumpulselaser',
        location: 'LEFT_SIDE',
        name: 'ISMediumPulseLaser',
      },
      {
        id: 'ismediumpulselaser',
        location: 'RIGHT_SIDE',
        name: 'ISMediumPulseLaser',
      },
      { id: 'isermediumlaser', location: 'AFT', name: 'ISERMediumLaser' },
      { id: 'isermediumlaser', location: 'AFT', name: 'ISERMediumLaser' },
    ],
    era: 'CLAN_INVASION',
    escapePods: 0,
    fuel: 480,
    heatSinks: { count: 20, type: 'SINGLE' },
    id: 'dragonstar-assault-transport-3060',
    lifeBoats: 0,
    model: '(3060)',
    motionType: 'SPHEROID',
    movement: { maxThrust: 8, safeThrust: 5 },
    mulId: 7766,
    passengers: 0,
    role: 'None',
    rulesLevel: 'STANDARD',
    source: 'HB:HK',
    structuralIntegrity: 6,
    subType: 'SmallCraft',
    techBase: 'INNER_SPHERE',
    tonnage: 150,
    transporters: [
      'battlearmorbay:3.0:2:1::-1:0',
      ...QUARTERS,
      'steeragequarters:20.0:0:-1::-1:0',
      'cargobay:4.5:0:6::-1:0',
    ],
    unitType: 'Small Craft',
    weightClass: 'ASSAULT',
    year: 3060,
  },
  {
    armor: {
      byArc: { AFT: 101, LEFT_SIDE: 162, NOSE: 183, RIGHT_SIDE: 162 },
      type: 'AEROSPACE',
    },
    cargoCapacity: 0.0,
    chassis: 'Aquarius Escort',
    cockpit: 'STANDARD',
    crew: 6,
    engine: { type: 'ICE' },
    equipment: [
      { id: 'large-laser', location: 'NOSE', name: 'Large Laser' },
      { id: 'large-laser', location: 'NOSE', name: 'Large Laser' },
      { id: 'lrm-10', location: 'LEFT_SIDE', name: 'LRM 10' },
      { id: 'is-ammo-lrm-10', location: 'LEFT_SIDE', name: 'IS Ammo LRM-10' },
      { id: 'srm-6', location: 'LEFT_SIDE', name: 'SRM 6' },
      { id: 'is-ammo-srm-6', location: 'LEFT_SIDE', name: 'IS Ammo SRM-6' },
      { id: 'r-medium-laser', location: 'LEFT_SIDE', name: '(R) Medium Laser' },
      { id: 'lrm-10', location: 'RIGHT_SIDE', name: 'LRM 10' },
      { id: 'is-ammo-lrm-10', location: 'RIGHT_SIDE', name: 'IS Ammo LRM-10' },
      { id: 'srm-6', location: 'RIGHT_SIDE', name: 'SRM 6' },
      { id: 'is-ammo-srm-6', location: 'RIGHT_SIDE', name: 'IS Ammo SRM-6' },
      {
        id: 'r-medium-laser',
        location: 'RIGHT_SIDE',
        name: '(R) Medium Laser',
      },
      { id: 'medium-laser', location: 'AFT', name: 'Medium Laser' },
      { id: 'medium-laser', location: 'AFT', name: 'Medium Laser' },
    ],
    era: 'AGE_OF_WAR',
    escapePods: 0,
    fuel: 480,
    heatSinks: { count: 32, type: 'SINGLE' },
    id: 'aquarius-escort',
    lifeBoats: 0,
    model: '',
    motionType: 'AERODYNE',
    movement: { maxThrust: 6, safeThrust: 4 },
    mulId: 3709,
    passengers: 0,
    role: 'None',
    rulesLevel: 'STANDARD',
    source: 'TR:3075',
    structuralIntegrity: 8,
    subType: 'SmallCraft',
    techBase: 'INNER_SPHERE',
    tonnage: 200,
    transporters: [...QUARTERS, 'steeragequarters:30.0:0:-1::-1:0'],
    unitType: 'Small Craft',
    weightClass: 'ASSAULT',
    year: 2515,
  },
  {
    armor: {
      byArc: { AFT: 50, LEFT_SIDE: 42, NOSE: 130, RIGHT_SIDE: 42 },
      type: 'AEROSPACE',
    },
    cargoCapacity: 36.5,
    chassis: 'Ares Assault Craft',
    clanEngine: false,
    cockpit: 'STANDARD',
    crew: 5,
    engine: { type: 'ICE' },
    equipment: [
      {
        id: 'clmediumpulselaser',
        location: 'NOSE',
        name: 'CLMediumPulseLaser',
      },
      {
        id: 'clmediumpulselaser',
        location: 'NOSE',
        name: 'CLMediumPulseLaser',
      },
      {
        id: 'clmediumpulselaser',
        location: 'LEFT_SIDE',
        name: 'CLMediumPulseLaser',
      },
      {
        id: 'clmediumpulselaser',
        location: 'RIGHT_SIDE',
        name: 'CLMediumPulseLaser',
      },
      { id: 'clmediumpulselaser', location: 'AFT', name: 'CLMediumPulseLaser' },
    ],
    era: 'SUCCESSION_WARS',
    escapePods: 0,
    fuel: 800,
    heatSinks: { count: 10, type: 'DOUBLE' },
    id: 'ares-assault-craft-mark-vii-c',
    lifeBoats: 0,
    model: 'Mark VII-C',
    motionType: 'AERODYNE',
    movement: { maxThrust: 6, safeThrust: 4 },
    passengers: 0,
    rulesLevel: 'STANDARD',
    source: 'TR:3057r',
    structuralIntegrity: 6,
    subType: 'SmallCraft',
    techBase: 'CLAN',
    tonnage: 150,
    transporters: [
      ...QUARTERS,
      'steeragequarters:25.0:0:-1::-1:0',
      'cargobay:36.5:1:5::-1:0',
    ],
    unitType: 'Small Craft',
    weightClass: 'ASSAULT',
    year: 2841,
  },
];

const session = { id: 'ul-12b', createdAt: 1 };

async function load(id: string): Promise<AerospaceDefinition> {
  const payload = fixtures.find((unit) => unit.id === id);
  const result = await loadUnitDefinition(
    { read: async () => payload ?? null },
    { source: 'canonical', id, family: 'aerospace' },
  );
  if (!result.success) throw new Error(result.error);
  if (!isDefinitionForFamily('aerospace', result.definition)) {
    throw new Error(`${id} is not an aerospace definition`);
  }
  return result.definition;
}

async function mapped(id: string) {
  return mapAerospaceDefinitionToState(await load(id), session);
}

const arcs = (state: Awaited<ReturnType<typeof mapped>>) =>
  state.equipment.map((e) => [e.equipmentId, e.location, !!e.isRearMounted]);

describe('mapAerospaceDefinitionToState for small craft', () => {
  it('maps a spheroid small craft (Dragonstar Assault Transport (3060))', async () => {
    const state = await mapped('dragonstar-assault-transport-3060');
    expect(state).toMatchObject({
      id: 'ul-12b',
      name: 'Dragonstar Assault Transport (3060)',
      mulId: '7766',
      year: 3060,
      tonnage: 150,
      unitType: UnitType.SMALL_CRAFT,
      aerospaceSubType: AerospaceSubType.SMALL_CRAFT,
      motionType: AerospaceMotionType.SPHEROID,
      safeThrust: 5,
      maxThrust: 8,
      fuelPoints: 480,
      fuelTons: 6,
      structuralIntegrity: 6,
      heatSinks: 20,
      doubleHeatSinks: false,
      heatSinkPool: 20,
      crew: { crew: 22, passengers: 0, marines: 0, quartersTons: 110 },
      armorAllocation: {
        [AerospaceLocation.NOSE]: 86,
        [AerospaceLocation.LEFT_WING]: 73,
        [AerospaceLocation.RIGHT_WING]: 73,
        [AerospaceLocation.AFT]: 56,
      },
      isModified: false,
    });
    // Quarters lines are crew and passengers, not bays.
    expect(state.bays).toEqual([
      { type: BayType.BATTLE_ARMOR, capacity: 3, doors: 2, bayNumber: 1 },
      { type: BayType.CARGO, capacity: 4.5, doors: 0, bayNumber: 2 },
    ]);
    expect(arcs(state)).toEqual([
      ['islargepulselaser', AerospaceLocation.NOSE, false],
      ['isermediumlaser', AerospaceLocation.NOSE, false],
      ['ismediumpulselaser', AerospaceLocation.LEFT_WING, false],
      ['ismediumpulselaser', AerospaceLocation.RIGHT_WING, false],
      ['isermediumlaser', AerospaceLocation.AFT, false],
      ['isermediumlaser', AerospaceLocation.AFT, false],
    ]);
  });

  it('maps an aerodyne small craft with aft-side arcs (Aquarius Escort)', async () => {
    const state = await mapped('aquarius-escort');
    expect(state).toMatchObject({
      unitType: UnitType.SMALL_CRAFT,
      motionType: AerospaceMotionType.AERODYNE,
      structuralIntegrity: 8,
      heatSinks: 32,
      crew: { crew: 6, passengers: 0, marines: 0, quartersTons: 30 },
      bays: [],
    });
    const rear = state.equipment.filter((e) => e.isRearMounted);
    expect(rear.map((e) => [e.equipmentId, e.name, e.location])).toEqual([
      ['medium-laser', 'Medium Laser', AerospaceLocation.LEFT_WING],
      ['medium-laser', 'Medium Laser', AerospaceLocation.RIGHT_WING],
    ]);
    expect(state.equipment.filter((e) => !e.isRearMounted)).toHaveLength(12);
  });

  it('maps a Clan small craft with double heat sinks (Ares Assault Craft Mark VII-C)', async () => {
    const state = await mapped('ares-assault-craft-mark-vii-c');
    expect(state).toMatchObject({
      techBase: TechBase.CLAN,
      structuralIntegrity: 6,
      fuelPoints: 800,
      fuelTons: 10,
      heatSinks: 10,
      doubleHeatSinks: true,
      heatSinkPool: 20,
      crew: { crew: 5, passengers: 0, marines: 0, quartersTons: 25 },
      bays: [{ type: BayType.CARGO, capacity: 36.5, doors: 1, bayNumber: 1 }],
    });
  });

  it('keeps the explicit SI, not a value derived from tonnage and thrust', async () => {
    const definition = await load('aquarius-escort');
    // 200 t, thrust 4: the fighter rule would give max(20, 4) = 20.
    expect(
      mapAerospaceDefinitionToState({ ...definition, structuralIntegrity: 11 })
        .structuralIntegrity,
    ).toBe(11);
  });

  it('maps passengers, marines and a rear-mount flag the definition carries', async () => {
    const definition = await load('aquarius-escort');
    const state = mapAerospaceDefinitionToState({
      ...definition,
      passengers: 12,
      marines: 3,
      equipment: [{ id: 'srm-6', location: 'RIGHT_SIDE', isRearMounted: true }],
    });
    // 6 × 5 + 12 × 3 + 3 × 3 = 75
    expect(state.crew).toEqual({
      crew: 6,
      passengers: 12,
      marines: 3,
      quartersTons: 75,
    });
    expect(arcs(state)).toEqual([
      ['srm-6', AerospaceLocation.RIGHT_WING, true],
    ]);
  });

  it('keeps the explicit SI through store edits', async () => {
    const store = createAerospaceStore(await mapped('aquarius-escort'));
    store.getState().setTonnage(150);
    store.getState().setSafeThrust(6);
    expect(store.getState().structuralIntegrity).toBe(8);
  });

  it('accepts side or wing arc names on a small craft and rejects an unknown arc', async () => {
    const definition = await load('aquarius-escort');
    expect(() =>
      mapAerospaceDefinitionToState({
        ...definition,
        equipment: [
          { id: 'x', location: 'LEFT_WING', isRearMounted: false },
          { id: 'y', location: 'LEFT_SIDE', isRearMounted: false },
        ],
      }),
    ).not.toThrow();
    expect(() =>
      mapAerospaceDefinitionToState({
        ...definition,
        equipment: [{ id: 'x', location: 'WINGS', isRearMounted: false }],
      }),
    ).toThrow('Unknown aerospace location "WINGS"');
  });
});

describe('new small craft state', () => {
  it('creates a small craft with minimum crew, free SI and minimum fuel', () => {
    const state = createDefaultAerospaceState({
      name: 'New Shuttle',
      tonnage: 150,
      techBase: TechBase.INNER_SPHERE,
      isSmallCraft: true,
    });
    expect(state).toMatchObject({
      unitType: UnitType.SMALL_CRAFT,
      aerospaceSubType: AerospaceSubType.SMALL_CRAFT,
      // defaultSI: ceil(150 / 10) = 15, which carries no SI tonnage
      structuralIntegrity: 15,
      fuelTons: 20,
      crew: { crew: 4, passengers: 0, marines: 0, quartersTons: 20 },
    });
  });
});
