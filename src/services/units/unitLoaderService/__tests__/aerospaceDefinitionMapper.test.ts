/**
 * Aerospace definition to AerospaceState (UL-12a).
 *
 * Fixtures are the repo converter's output for five pinned mm-data sources
 * (50f7efef0c9f775b0258f8283525ed4f906e1985). Their structuralIntegrity is
 * the pinned MegaMek value (48fcb2f64a1b3f2d575707ce5653dad64927b587):
 * - Aero.java:804-808: ASF and ConvFighter SI = max(floor(t / 10), safe thrust)
 * - FixedWingSupport.java:135-138: FixedWingSupport SI = safe thrust
 */

import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import { createAerospaceStore } from '@/stores/useAerospaceStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import {
  AerospaceCockpitType,
  AerospaceEngineType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { computeWeightBreakdown } from '@/utils/construction/aerospace/weightBreakdown';

import {
  mapAerospaceDefinitionToState,
  type AerospaceDefinition,
} from '../aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '../definitionTypes';
import { loadUnitDefinition } from '../loadUnitDefinition';
import { UnsupportedUnitConfigurationError } from '../movementConfiguration';

/** Converter output for the five sources (fluff removed). */
const fixtures = {
  units: [
    {
      armor: {
        byArc: {
          AFT: 21,
          LEFT_WING: 28,
          NOSE: 30,
          RIGHT_WING: 28,
        },
        type: 'STANDARD',
      },
      bombCapacity: 0,
      chassis: 'Sabre',
      cockpit: 'STANDARD',
      engine: {
        type: 'XL',
      },
      equipment: [
        {
          id: 'clermediumlaserprototype',
          location: 'LEFT_WING',
          name: 'CLERMediumLaserPrototype',
        },
        {
          id: 'clermediumlaserprototype',
          location: 'LEFT_WING',
          name: 'CLERMediumLaserPrototype',
        },
        {
          id: 'clermediumlaserprototype',
          location: 'RIGHT_WING',
          name: 'CLERMediumLaserPrototype',
        },
        {
          id: 'clermediumlaserprototype',
          location: 'RIGHT_WING',
          name: 'CLERMediumLaserPrototype',
        },
      ],
      era: 'SUCCESSION_WARS',
      fuel: 400,
      hasBombBay: false,
      heatSinks: {
        count: 10,
        type: 'DOUBLE',
      },
      id: 'sabre-sb-27b-ec',
      model: 'SB-27b-EC',
      motionType: 'AERODYNE',
      movement: {
        maxThrust: 17,
        safeThrust: 11,
      },
      mulId: 7687,
      role: 'Interceptor',
      rulesLevel: 'STANDARD',
      source: 'TR:GC',
      structuralIntegrity: 11,
      subType: 'AerospaceFighter',
      techBase: 'INNER_SPHERE',
      tonnage: 25,
      unitType: 'Aerospace',
      weightClass: 'LIGHT',
      year: 2819,
    },
    {
      armor: {
        byArc: {
          AFT: 3,
          LEFT_WING: 3,
          NOSE: 7,
          RIGHT_WING: 3,
        },
        type: 'STANDARD',
      },
      bombCapacity: 0,
      chassis: 'Boeing Jump Bomber',
      cockpit: 'STANDARD',
      engine: {
        type: 'ICE',
      },
      equipment: [],
      era: 'SUCCESSION_WARS',
      fuel: 320,
      hasBombBay: false,
      heatSinks: {
        count: 10,
        type: 'SINGLE',
      },
      id: 'boeing-jump-bomber',
      model: '',
      motionType: 'AERODYNE',
      movement: {
        maxThrust: 14,
        safeThrust: 9,
      },
      mulId: 409,
      role: 'None',
      rulesLevel: 'INTRODUCTORY',
      source: 'TR:3039',
      structuralIntegrity: 9,
      subType: 'ConventionalFighter',
      techBase: 'INNER_SPHERE',
      tonnage: 20,
      unitType: 'Conventional Fighter',
      weightClass: 'LIGHT',
      year: 3037,
    },
    {
      armor: {
        barRating: 10,
        byArc: {
          AFT: 10,
          LEFT_WING: 15,
          NOSE: 15,
          RIGHT_WING: 15,
        },
        type: 'BAR',
      },
      bombCapacity: 0,
      chassis: 'Vendetta Medium Fighter',
      cockpit: 'STANDARD',
      engine: {
        type: 'FUSION',
      },
      equipment: [
        {
          id: 'large-laser',
          location: 'NOSE',
          name: 'Large Laser',
        },
        {
          id: 'small-laser',
          location: 'NOSE',
          name: 'Small Laser',
        },
        {
          id: 'medium-laser',
          location: 'LEFT_WING',
          name: 'Medium Laser',
        },
        {
          id: 'medium-laser',
          location: 'RIGHT_WING',
          name: 'Medium Laser',
        },
        {
          id: 'armored-chassis',
          location: 'FUSELAGE',
          name: 'Armored Chassis',
        },
        {
          id: 'advanced-fire-control',
          location: 'FUSELAGE',
          name: 'Advanced Fire Control',
        },
        {
          id: 'external-stores-hardpoint',
          location: 'FUSELAGE',
          name: 'External Stores Hardpoint',
        },
        {
          id: 'external-stores-hardpoint',
          location: 'FUSELAGE',
          name: 'External Stores Hardpoint',
        },
        {
          id: 'external-stores-hardpoint',
          location: 'FUSELAGE',
          name: 'External Stores Hardpoint',
        },
        {
          id: 'external-stores-hardpoint',
          location: 'FUSELAGE',
          name: 'External Stores Hardpoint',
        },
        {
          id: 'external-stores-hardpoint',
          location: 'FUSELAGE',
          name: 'External Stores Hardpoint',
        },
        {
          id: 'external-stores-hardpoint',
          location: 'FUSELAGE',
          name: 'External Stores Hardpoint',
        },
      ],
      era: 'AGE_OF_WAR',
      fuel: 250,
      hasBombBay: false,
      heatSinks: {
        count: 0,
        type: 'SINGLE',
      },
      id: 'vendetta-medium-fighter',
      model: '',
      motionType: 'AERODYNE',
      movement: {
        maxThrust: 8,
        safeThrust: 5,
      },
      mulId: 5625,
      quirks: [
        'cramped_cockpit',
        'difficult_eject',
        'atmo_flyer',
        'obsolete:2580',
        'weak_undercarriage',
        'variable_range_targeting',
      ],
      role: 'Attack Fighter',
      rulesLevel: 'EXPERIMENTAL',
      source: 'XTR:Primitives III',
      structuralIntegrity: 5,
      subType: 'FixedWingSupport',
      techBase: 'INNER_SPHERE',
      tonnage: 60,
      transporters: ['standardseats:3.0:0:-1::-1:0'],
      unitType: 'Conventional Fighter',
      weightClass: 'HEAVY',
      year: 2328,
    },
    {
      armor: {
        byArc: {
          AFT: 85,
          LEFT_WING: 86,
          NOSE: 119,
          RIGHT_WING: 86,
        },
        type: 'STANDARD',
      },
      bombCapacity: 0,
      chassis: 'Lucifer III',
      cockpit: 'STANDARD',
      engine: {
        type: 'XL',
      },
      equipment: [
        {
          id: 'bombast-laser',
          location: 'NOSE',
          name: 'Bombast Laser',
        },
        {
          id: 'extended-lrm-10',
          location: 'LEFT_WING',
          name: 'Extended LRM 10',
        },
        {
          id: 'extended-lrm-10',
          location: 'RIGHT_WING',
          name: 'Extended LRM 10',
        },
        {
          id: 'ismediumxpulselaser',
          location: 'AFT',
          name: 'ISMediumXPulseLaser',
        },
        {
          id: 'is-ammo-extended-lrm-10',
          location: 'FUSELAGE',
          name: 'IS Ammo Extended LRM-10',
        },
        {
          id: 'is-ammo-extended-lrm-10',
          location: 'FUSELAGE',
          name: 'IS Ammo Extended LRM-10',
        },
        {
          id: 'is-ammo-extended-lrm-10',
          location: 'FUSELAGE',
          name: 'IS Ammo Extended LRM-10',
        },
        {
          id: 'is-ammo-extended-lrm-10',
          location: 'FUSELAGE',
          name: 'IS Ammo Extended LRM-10',
        },
      ],
      era: 'DARK_AGE',
      fuel: 400,
      hasBombBay: true,
      heatSinks: {
        count: 13,
        type: 'DOUBLE',
      },
      id: 'lucifer-iii-lcr-3',
      model: 'LCR-3',
      motionType: 'AERODYNE',
      movement: {
        maxThrust: 8,
        safeThrust: 5,
      },
      mulId: 4541,
      quirks: ['difficult_eject', 'easy_pilot'],
      role: 'Attack Fighter',
      rulesLevel: 'EXPERIMENTAL',
      source: 'TR:Proto',
      structuralIntegrity: 6,
      subType: 'AerospaceFighter',
      techBase: 'INNER_SPHERE',
      tonnage: 65,
      unitType: 'Aerospace',
      weightClass: 'HEAVY',
      year: 3086,
    },
    {
      armor: {
        byArc: {
          AFT: 5,
          LEFT_WING: 8,
          NOSE: 11,
          RIGHT_WING: 8,
        },
        type: 'STANDARD',
      },
      bombCapacity: 0,
      chassis: 'Thrush',
      cockpit: 'STANDARD',
      engine: {
        type: 'XL',
      },
      equipment: [
        {
          id: 'isermediumlaser',
          location: 'NOSE',
          name: 'ISERMediumLaser',
        },
      ],
      era: 'CLAN_INVASION',
      fuel: 480,
      hasBombBay: false,
      heatSinks: {
        count: 10,
        type: 'SINGLE',
      },
      id: 'thrush-maximilianc-1247',
      model: "(Maximilian)'C-1247'",
      motionType: 'AERODYNE',
      movement: {
        maxThrust: 23,
        safeThrust: 15,
      },
      mulId: 3200,
      role: 'Interceptor',
      rulesLevel: 'STANDARD',
      structuralIntegrity: 15,
      subType: 'AerospaceFighter',
      techBase: 'INNER_SPHERE',
      tonnage: 25,
      transporters: ['cargobay:1.0:0:1::-1:0'],
      unitType: 'Aerospace',
      weightClass: 'LIGHT',
      year: 3067,
    },
  ],
};

const session = { id: 'ul-12a', createdAt: 1 };

async function load(id: string): Promise<AerospaceDefinition> {
  const payload = fixtures.units.find((unit) => unit.id === id);
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

describe('mapAerospaceDefinitionToState', () => {
  it('maps an aerospace fighter (Sabre SB-27b-EC)', async () => {
    const state = await mapped('sabre-sb-27b-ec');
    expect(state).toMatchObject({
      id: 'ul-12a',
      name: 'Sabre SB-27b-EC',
      chassis: 'Sabre',
      model: 'SB-27b-EC',
      mulId: '7687',
      year: 2819,
      rulesLevel: RulesLevel.STANDARD,
      tonnage: 25,
      techBase: TechBase.INNER_SPHERE,
      unitType: UnitType.AEROSPACE,
      aerospaceSubType: AerospaceSubType.AEROSPACE_FIGHTER,
      isFixedWingSupport: false,
      isOmni: false,
      engineType: EngineType.XL_IS,
      aerospaceEngineType: AerospaceEngineType.XL,
      engineRating: 275,
      safeThrust: 11,
      maxThrust: 17,
      fuelPoints: 400,
      fuelTons: 5,
      structuralIntegrity: 11,
      cockpitType: AerospaceCockpitType.STANDARD,
      heatSinks: 10,
      doubleHeatSinks: true,
      heatSinkPool: 20,
      armorType: ArmorTypeEnum.STANDARD,
      armorTonnage: 7,
      armorAllocation: {
        [AerospaceLocation.NOSE]: 30,
        [AerospaceLocation.LEFT_WING]: 28,
        [AerospaceLocation.RIGHT_WING]: 28,
        [AerospaceLocation.AFT]: 21,
      },
      hasBombBay: false,
      bombCapacity: 0,
      isModified: false,
      createdAt: 1,
      lastModifiedAt: 1,
    });
    expect(state.equipment.map((e) => [e.equipmentId, e.location])).toEqual([
      ['clermediumlaserprototype', AerospaceLocation.LEFT_WING],
      ['clermediumlaserprototype', AerospaceLocation.LEFT_WING],
      ['clermediumlaserprototype', AerospaceLocation.RIGHT_WING],
      ['clermediumlaserprototype', AerospaceLocation.RIGHT_WING],
    ]);
  });

  it('maps a conventional fighter (Boeing Jump Bomber)', async () => {
    expect(await mapped('boeing-jump-bomber')).toMatchObject({
      unitType: UnitType.CONVENTIONAL_FIGHTER,
      aerospaceSubType: AerospaceSubType.CONVENTIONAL_FIGHTER,
      isFixedWingSupport: false,
      aerospaceEngineType: AerospaceEngineType.ICE,
      rulesLevel: RulesLevel.INTRODUCTORY,
      safeThrust: 9,
      maxThrust: 14,
      fuelPoints: 320,
      structuralIntegrity: 9,
      doubleHeatSinks: false,
      equipment: [],
    });
  });

  it('maps FixedWingSupport SI to safe thrust (Vendetta: 60 t, thrust 5)', async () => {
    const state = await mapped('vendetta-medium-fighter');
    expect(state).toMatchObject({
      unitType: UnitType.CONVENTIONAL_FIGHTER,
      aerospaceSubType: AerospaceSubType.CONVENTIONAL_FIGHTER,
      isFixedWingSupport: true,
      safeThrust: 5,
      // The fighter rule would give max(6, 5) = 6.
      structuralIntegrity: 5,
    });
    expect(
      state.equipment.filter((e) => e.location === AerospaceLocation.FUSELAGE),
    ).toHaveLength(8);
  });

  it('copies the bomb fields the definition carries (Lucifer III LCR-3)', async () => {
    // The converter sets hasBombBay from a "bomb" name match; here it is the
    // Bombast Laser. The mapper copies the definition as carried.
    const definition = await load('lucifer-iii-lcr-3');
    expect(definition.hasBombBay).toBe(true);
    expect(mapAerospaceDefinitionToState(definition, session)).toMatchObject({
      hasBombBay: true,
      bombCapacity: 0,
      structuralIntegrity: 6,
    });
  });

  it('derives SI above ceil(t / 10) with no SI weight (Thrush Maximillian: 25 t, SI 15)', async () => {
    const state = await mapped('thrush-maximilianc-1247');
    expect(state.structuralIntegrity).toBe(15);
    const breakdown = computeWeightBreakdown({
      tonnage: state.tonnage,
      subType: state.aerospaceSubType,
      engineRating: state.engineRating,
      engineType: state.aerospaceEngineType,
      structuralIntegrity: state.structuralIntegrity,
      fuelTons: state.fuelTons,
      armorTons: state.armorTonnage,
      totalHeatSinks: state.heatSinks,
      cockpitType: state.cockpitType,
      equipmentTons: 0,
      crew: null,
    });
    // ceil-default pricing charged (15 - 3) x 2.5 x 0.5 = 15 t here.
    expect(breakdown.siTons).toBe(0);
  });

  it.each(fixtures.units.map((unit) => [unit.id, unit.structuralIntegrity]))(
    '%s: mapped SI equals the definition (pinned MegaMek) SI %d',
    async (id, si) => {
      expect((await mapped(id as string)).structuralIntegrity).toBe(si);
    },
  );

  it('rejects small craft, which need their own state', async () => {
    const definition = {
      ...(await load('sabre-sb-27b-ec')),
      unitType: 'Small Craft',
      subType: 'SmallCraft',
    } as AerospaceDefinition;
    expect(() => mapAerospaceDefinitionToState(definition)).toThrow(
      UnsupportedUnitConfigurationError,
    );
  });

  it('rejects an unknown arc instead of guessing one', async () => {
    const definition = await load('sabre-sb-27b-ec');
    expect(() =>
      mapAerospaceDefinitionToState({
        ...definition,
        equipment: [{ id: 'x', location: 'WINGS', isRearMounted: false }],
      }),
    ).toThrow('Unknown aerospace location "WINGS"');
  });
});

describe('aerospace store SI follows the shared owner', () => {
  it('opens a mapped state in the existing store and re-derives SI on edits', async () => {
    const store = createAerospaceStore(await mapped('thrush-maximilianc-1247'));
    expect(store.getState().structuralIntegrity).toBe(15);
    store.getState().setSafeThrust(9);
    // 25 t: max(floor(2.5), 9) = 9
    expect(store.getState().structuralIntegrity).toBe(9);
    store.getState().setTonnage(100);
    // max(10, 9) = 10; ceil would also be 10, so check a floor case next.
    expect(store.getState().structuralIntegrity).toBe(10);
    store.getState().setTonnage(95);
    // max(floor(9.5), 9) = 9; ceil would give 10.
    expect(store.getState().structuralIntegrity).toBe(9);
    store.getState().setEngineRating(95 * 4);
    // safe thrust 4: max(9, 4) = 9
    expect(store.getState().safeThrust).toBe(4);
    expect(store.getState().structuralIntegrity).toBe(9);
  });

  it('keeps FixedWingSupport SI at safe thrust through edits', async () => {
    const store = createAerospaceStore(await mapped('vendetta-medium-fighter'));
    store.getState().setTonnage(80);
    expect(store.getState().structuralIntegrity).toBe(5);
    store.getState().setSafeThrust(3);
    expect(store.getState().structuralIntegrity).toBe(3);
  });

  it.each([
    // 25 t ASF: default thrust 6, max(floor(2.5), 6) = 6; ceil gives 3.
    [25, false, 6],
    // 65 t ASF: default thrust 4, max(6, 4) = 6; ceil gives 7.
    [65, false, 6],
    // 45 t CF: default thrust 5, max(4, 5) = 5.
    [45, true, 5],
    // 95 t CF: default thrust 4, max(9, 4) = 9; ceil gives 10.
    [95, true, 9],
  ])(
    'new %d t unit (conventional %s) defaults SI to %d',
    (tonnage, isConventional, si) => {
      expect(
        createDefaultAerospaceState({
          name: 'New Fighter',
          tonnage,
          techBase: TechBase.INNER_SPHERE,
          isConventional,
        }).structuralIntegrity,
      ).toBe(si);
    },
  );
});
