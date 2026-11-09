import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  combatVehicleSlotErrors,
  supportVehicleSlotErrors,
  type VehicleSlotUnit,
} from '../itemSlots';
import { validateSupportVehicleEquipment } from '../vehicleValidation';

// Bandit (C) Hovercraft G (mm-data 3058Uu): pinned Java reports
// "Using 2 slot(s) too many" against 15 available (TestTank.java:331-337).
const bandit: VehicleSlotUnit = {
  tonnage: 50,
  equipment: [
    ...Array(4).fill('CLHeavyMG:OMNI'),
    'Clan Heavy Machine Gun Array:OMNI',
    'CLERMediumLaser:OMNI',
    ...Array(4).fill('CLLightMG:OMNI'),
    'CLLMGA:OMNI',
    'CLCASE:OMNI',
    'CLActiveProbe:OMNI',
    'CLECMSuite:OMNI',
    'Clan Heavy Machine Gun Ammo - Full:OMNI',
    'Clan Light Machine Gun Ammo - Half:OMNI',
  ].map((equipmentId) => ({ equipmentId, location: 'Body' })),
  movement: { jumpMP: 0 },
  engineType: 0,
  engineRating: 250,
  clanEngine: false,
  armorType: 1,
  armorTechLevel: 6,
  techBase: 'CLAN',
  transporters: ['troopspace:5.0', 'BattleArmorHandles - troopers:-1'],
};

// Brunel Dump Truck AC20 (Operation Klondike), a 150-ton LargeSupportTank:
// Java reports 14 too many against 20 and Basic Fire Control outside the body.
const brunel: VehicleSlotUnit = {
  tonnage: 150,
  equipment: [
    ['IS Ammo MG - Full', 'Body'],
    ['IS Ammo AC/20', 'Body'],
    ['IS Ammo AC/20', 'Body'],
    ['IS Ammo AC/20', 'Body'],
    ['ISOffRoadChassis', 'Body'],
    ['Machine Gun', 'Front'],
    ['Machine Gun', 'Front'],
    ['Basic Fire Control', 'Rear'],
    ['Autocannon/20', 'Rear'],
    ['Autocannon/20', 'Rear'],
    ['Autocannon/20', 'Rear'],
  ].map(([equipmentId, location]) => ({ equipmentId, location })),
  movement: { jumpMP: 0 },
  engineType: 1,
  engineRating: 150,
  clanEngine: false,
  armorType: 0,
  techBase: 'INNER_SPHERE',
  transporters: [],
};

describe('vehicle item slots (Tank.getFreeSlots, TestSupportVehicle)', () => {
  it('reports the Bandit (C) G overrun with Java wording, never above Java', () => {
    // Java 2: its Clan HMG ammo record has no compatibleWeaponIds, so the two
    // bins are not provably distinct types and count as one (lower bound).
    expect(combatVehicleSlotErrors(bandit)).toEqual([
      'Not enough item slots available! Using 1 slot(s) too many.',
    ]);
  });

  it('accepts the same tank once it fits (no ammo, no troop space)', () => {
    expect(
      combatVehicleSlotErrors({
        ...bandit,
        equipment: bandit.equipment.filter(
          (mount) => !/Ammo/.test(mount.equipmentId),
        ),
        transporters: [],
      }),
    ).toEqual([]);
  });

  it('counts engines, jump jets and heavy ferro like Java', () => {
    // 10 t: 7 slots (Tank.java:2581-2583). XL (IS) +2 (:2624-2630), jump
    // jets 1 however many (:2600-2610), heavy ferro 3 (:2688-2689), lasers 1.
    const laser = { equipmentId: 'Medium Laser', location: 'Front' };
    const jets = Array(3).fill({
      equipmentId: 'VehicleJumpJet',
      location: 'Body',
    });
    const tank = {
      ...bandit,
      tonnage: 10,
      transporters: [],
      engineType: 2,
      clanEngine: false,
      armorType: 6,
      movement: { jumpMP: 3 },
    };
    expect(
      combatVehicleSlotErrors({ ...tank, equipment: [...jets, laser] }),
    ).toEqual([]);
    expect(
      combatVehicleSlotErrors({ ...tank, equipment: [...jets, laser, laser] }),
    ).toEqual(['Not enough item slots available! Using 1 slot(s) too many.']);
  });

  it('counts armor listed as equipment once, through the armor type', () => {
    // Luduan Scout Vehicle (mm-data 3145/Liao), valid in Java: 25 t, 10 slots.
    // Its BLK lists "IS Vehicular Stealth"; Tank.java:2604-2606 skips armor
    // types and :2700 charges vehicular stealth 2 through the armor code.
    const luduan: VehicleSlotUnit = {
      ...bandit,
      tonnage: 25,
      techBase: 'INNER_SPHERE',
      armorType: 22,
      armorTechLevel: 5,
      transporters: [],
      equipment: [
        ['IS Vehicular Stealth', 'Body'],
        ['ISMagshotGR Ammo', 'Body'],
        ['ISAngelECMSuite', 'Body'],
        ['BloodhoundActiveProbe', 'Body'],
        ['ISMagshotGR', 'Turret'],
        ['ISMagshotGR', 'Turret'],
        ['ISMagshotGR', 'Turret'],
        ['ISTAG', 'Turret'],
      ].map(([equipmentId, location]) => ({ equipmentId, location })),
    };
    expect(combatVehicleSlotErrors(luduan)).toEqual([]);
  });

  it('abstains when a mount is unresolved or its Java slots depend on the unit', () => {
    const unresolved = {
      ...bandit,
      equipment: [
        ...bandit.equipment,
        { equipmentId: 'Not A Real Item', location: 'Body' },
      ],
    };
    expect(combatVehicleSlotErrors(unresolved)).toEqual([]);
    // Blue Shield: locations - 1 on the unit (MiscType.java:1315-1320).
    const blueShield = {
      ...bandit,
      equipment: [
        ...bandit.equipment,
        { equipmentId: 'Blue Shield Particle Field Damper', location: 'Body' },
      ],
    };
    expect(combatVehicleSlotErrors(blueShield)).toEqual([]);
  });

  it('reports the Brunel AC20 support-vehicle overrun and fire control location', () => {
    // Java 14, now matched: the full MG ammo record lists the machine guns
    // it feeds (AmmoType.isAmmoValid, AmmoType.java:17147-17155).
    expect(
      validateSupportVehicleEquipment({
        ...brunel,
        motionType: GroundMotionType.WHEELED,
      }),
    ).toEqual([
      'Not enough item slots available! Using 14 slot(s) too many.',
      'Basic Fire Control must be mounted in the body.',
    ]);
  });

  it('places small support vehicle ammo with its weapon', () => {
    // TestSupportVehicle.java:1618-1622: 5 slots, five 1-slot guns, no ammo slot.
    const mount = (equipmentId: string) => ({ equipmentId, location: 'Body' });
    const equipment = [
      ...Array(5).fill(mount('Machine Gun')),
      mount('IS Ammo MG - Full'),
    ];
    expect(
      supportVehicleSlotErrors({ ...brunel, tonnage: 4, equipment }),
    ).toEqual([]);
    expect(
      supportVehicleSlotErrors({ ...brunel, tonnage: 9, equipment }),
    ).toEqual(['Not enough item slots available! Using 1 slot(s) too many.']);
  });

  it.each([
    { tonnage: 4.999, expected: [] },
    {
      tonnage: 5,
      expected: ['Not enough item slots available! Using 1 slot(s) too many.'],
    },
    {
      tonnage: 5.001,
      expected: ['Not enough item slots available! Using 1 slot(s) too many.'],
    },
  ])(
    'starts distinct ammo slots at 5 tons ($tonnage t)',
    ({ tonnage, expected }) => {
      // TestSupportVehicle:1618-1640; EntityWeightClass:80-97 (<5 t is small).
      const mount = (equipmentId: string) => ({
        equipmentId,
        location: 'Body',
      });
      expect(
        supportVehicleSlotErrors({
          ...brunel,
          tonnage,
          equipment: [
            ...Array(5).fill(mount('Machine Gun')),
            mount('IS Ammo MG - Full'),
            mount('IS Ammo MG - Full'),
          ],
        }),
      ).toEqual(expected);
    },
  );

  it("reports Debbie 'The Warcrime Wagon' once its vehicle flamers resolve", () => {
    // mm-data TOS/Tortuga, an 80-ton SupportTank: pinned Java reports 10 too
    // many against 13. Its nine "Flamer (Vehicle)" mounts are Java's
    // ISVehicleFlamer (weapons/flamers/innerSphere/ISVehicleFlamer.java, tech
    // ALL), the catalog's vehicle-flamer; unresolved, the check abstained.
    const at = (location: string, names: string[]) =>
      names.map((equipmentId) => ({ equipmentId, location }));
    const flamer = 'Flamer (Vehicle)';
    const mg = 'Machine Gun';
    const debbie: VehicleSlotUnit = {
      ...brunel,
      tonnage: 80,
      engineType: 1,
      engineRating: 160,
      armorType: 45,
      armorTechLevel: 1,
      equipment: [
        ...at('Body', [
          'Basic Fire Control',
          ...Array(3).fill('IS Ammo SRM-2'),
          ...Array(9).fill('IS Vehicle Flamer Ammo'),
          ...Array(9).fill('IS Ammo MG - Full'),
        ]),
        ...at('Front', ['Combine', flamer, mg, mg, 'SRM 2']),
        ...at('Right', [flamer, flamer, flamer, mg, mg, mg]),
        ...at('Left', [flamer, flamer, flamer, mg, mg, mg]),
        ...at('Rear', [flamer, flamer, mg]),
      ],
    };
    // Java 10 (20 weapons + 3 ammo types, fire control 0). The SRM 2 ammo
    // record has no compatibleWeaponIds, so it is not counted (lower bound 9).
    expect(supportVehicleSlotErrors(debbie)).toEqual([
      'Not enough item slots available! Using 9 slot(s) too many.',
    ]);
  });
});
