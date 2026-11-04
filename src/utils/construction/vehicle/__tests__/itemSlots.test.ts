import {
  combatVehicleSlotErrors,
  supportVehicleSlotErrors,
  type VehicleSlotSource,
} from '../itemSlots';

// Bandit (C) Hovercraft G (mm-data 3058Uu): pinned Java reports
// "Using 2 slot(s) too many" against 15 available (TestTank.java:331-337).
const bandit: VehicleSlotSource = {
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
  jumpMP: 0,
  engineCode: 0,
  engineRating: 250,
  clanEngine: false,
  armorCode: 1,
  armorTechLevel: 6,
  clan: true,
  transporters: ['troopspace:5.0', 'BattleArmorHandles - troopers:-1'],
};

// Brunel Dump Truck AC20 (Operation Klondike), a 150-ton LargeSupportTank:
// Java reports 14 too many against 20 and Basic Fire Control outside the body.
const brunel: VehicleSlotSource = {
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
  jumpMP: 0,
  engineCode: 1,
  engineRating: 150,
  clanEngine: false,
  armorCode: 0,
  clan: false,
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
      engineCode: 2,
      clanEngine: false,
      armorCode: 6,
      jumpMP: 3,
    };
    expect(
      combatVehicleSlotErrors({ ...tank, equipment: [...jets, laser] }),
    ).toEqual([]);
    expect(
      combatVehicleSlotErrors({ ...tank, equipment: [...jets, laser, laser] }),
    ).toEqual(['Not enough item slots available! Using 1 slot(s) too many.']);
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
    // Java 14: the MG ammo record has no compatibleWeaponIds (lower bound 13).
    expect(supportVehicleSlotErrors(brunel)).toEqual([
      'Not enough item slots available! Using 13 slot(s) too many.',
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
});
