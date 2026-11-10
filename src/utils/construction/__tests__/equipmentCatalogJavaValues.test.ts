/**
 * Owner ruling 2026-11-02, question 1 (OWNER-RULINGS-20261030.md, last section):
 * equipment catalog values that differed from pinned MegaMek 48fcb2f6 are
 * corrected, each cited. These rows pin every corrected value to its Java line.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AMMUNITION_CATALOG_FILES } from '../equipmentBVCatalogData';
import {
  getAmmunitionEntry,
  getEquipmentEntry,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { processCritAmmoSlot } from '../mechBV/critScanAmmo';
import { createEmptyCritScan } from '../mechBV/critScanTypes';

// [catalog id, pinned Java BV, citation in megamek/common/equipment/AmmoType.java]
const AMMO_VALUES = [
  ['uac-2-ammo', 7, 'createISUltra2Ammo ammo.bv = 7 (AmmoType.java:5630)'],
  ['uac-5-ammo', 14, 'createISUltra5Ammo ammo.bv = 14 (AmmoType.java:5660)'],
  ['lb-2-x-ammo', 5, 'createISLB2XAmmo ammo.bv = 5 (AmmoType.java:5383)'],
  ['lb-5-x-ammo', 10, 'createISLB5XAmmo ammo.bv = 10 (AmmoType.java:5414)'],
  ['clan-ams-ammo', 22, 'createCLAMSAmmo ammo.bv = 22 (AmmoType.java:4096)'],
] as const;

// [catalog id, pinned Java BV, citation in megamek/common/weapons/artillery]
const WEAPON_VALUES = [
  ['sniper-cannon', 77, 'SniperCannon.java:78 bv = 77'],
  ['thumper-cannon', 41, 'ThumperCannon.java:78 bv = 41'],
] as const;

describe('equipment catalog values match pinned Java (ruling 2026-11-02 q1)', () => {
  it.each(AMMO_VALUES)('%s ammo BV is %s (%s)', (id, bv) => {
    expect(getAmmunitionEntry(id)?.battleValue).toBe(bv);
  });

  it.each(WEAPON_VALUES)('%s weapon BV is %s (%s)', (id, bv) => {
    expect(resolveEquipmentBV(id).battleValue).toBe(bv);
  });
});

// Half-ton MG bins. Java: AmmoType.java createISMGAmmoHalf :6665-6666,
// createISLightMGAmmoHalf :6799-6800, createISHeavyMGAmmoHalf :6897-6898
// (bv 0.5, tonnage 0.5; Clan twins :6700-6701, :6831-6832, :6961-6962).
// The ammo type is shared by IS and Clan weapons, so one record each serves both.
const HALF_MG = [
  ['machine-gun-ammo-half', 100, ['machine-gun', 'clan-machine-gun']],
  ['light-machine-gun-ammo-half', 100, ['light-machine-gun']],
  ['heavy-machine-gun-ammo-half', 50, ['heavy-machine-gun']],
] as const;

describe('half-ton MG ammo matches the pinned Java half-ton types', () => {
  it.each(HALF_MG)(
    '%s: BV 0.5, 0.5 t, compatible weapons',
    (id, shots, weapons) => {
      expect(getAmmunitionEntry(id)).toMatchObject({
        battleValue: 0.5,
        weight: 0.5,
        shotsPerTon: shots,
      });
      const raw = AMMUNITION_CATALOG_FILES.flatMap((f) => f.items ?? []).find(
        (item) => item.id === id,
      );
      expect(raw?.compatibleWeaponIds).toEqual(weapons);
    },
  );

  // The crit scan halves a resolved full-ton BV for names containing "half".
  // A record that is already the half-ton bin must not be halved again.
  it.each([
    'IS Machine Gun Ammo - Half',
    'Clan Machine Gun Ammo - Half',
    'IS Light Machine Gun Ammo - Half',
    'Clan Light Machine Gun Ammo - Half',
    'IS Heavy Machine Gun Ammo - Half',
    'Clan Heavy Machine Gun Ammo - Half',
    'IS Machine Gun Ammo - Half (omnipod)',
  ])('crit scan scores %s at exactly 0.5 BV (no double halving)', (name) => {
    const r = createEmptyCritScan();
    processCritAmmoSlot({
      r,
      clean: name,
      lo: name.toLowerCase(),
      loc: 'RT',
      ml: null,
      unitTechBase: name.startsWith('Clan') ? 'CLAN' : 'INNER_SPHERE',
    });
    expect(r.ammo.map((a) => a.bv)).toEqual([0.5]);
  });

  // IS LB-X cluster ammo. Java: createISLB2XClusterAmmo bv = 5 (AmmoType.java:5122),
  // createISLB5XClusterAmmo bv = 10 (:5156); the Clan twins stay 6 and 12
  // (createCLLB2XClusterAmmo, createCLLB5XClusterAmmo: bv 6 / 12).
  it.each([
    ['ISLBXAC2 CL Ammo', 'INNER_SPHERE', 5],
    ['ISLBXAC5 CL Ammo', 'INNER_SPHERE', 10],
    ['ISLBXAC2 Ammo', 'INNER_SPHERE', 5],
    ['ISLBXAC5 Ammo', 'INNER_SPHERE', 10],
    ['CLLBXAC2 CL Ammo', 'CLAN', 6],
    ['CLLBXAC5 CL Ammo', 'CLAN', 12],
  ])('crit scan scores %s (%s) at Java BV %s', (name, tech, bv) => {
    const r = createEmptyCritScan();
    processCritAmmoSlot({
      r,
      clean: name,
      lo: name.toLowerCase(),
      loc: 'RT',
      ml: null,
      unitTechBase: tech,
    });
    expect(r.ammo.map((a) => a.bv)).toEqual([bv]);
  });

  it('crit scan still scores a full-ton MG bin at 1 BV', () => {
    const r = createEmptyCritScan();
    processCritAmmoSlot({
      r,
      clean: 'IS Ammo MG - Full',
      lo: 'is ammo mg - full',
      loc: 'RT',
      ml: null,
      unitTechBase: 'INNER_SPHERE',
    });
    expect(r.ammo.map((a) => a.bv)).toEqual([1]);
  });
});

// Mech mortars. Standing approval (owner 2026-11-03); pinned MegaMek 48fcb2f6
// weapons/mortars: [catalog id, tons, critical slots, citation].
const MORTAR_VALUES = [
  ['mech-mortar-1', 2, 1, 'innerSphere/ISMekMortar1.java:69-70'],
  ['mech-mortar-2', 5, 2, 'innerSphere/ISMekMortar2.java:69-70'],
  ['mech-mortar-4', 7, 3, 'innerSphere/ISMekMortar4.java:69-70'],
  ['clan-mech-mortar-2', 2.5, 1, 'clan/CLMekMortar2.java:69-70'],
  ['clan-mech-mortar-4', 3.5, 2, 'clan/CLMekMortar4.java:70-71'],
  ['clan-mech-mortar-8', 5, 3, 'clan/CLMekMortar8.java:69-70'],
] as const;

it.each(MORTAR_VALUES)('%s weighs %s t in %s slots (%s)', (id, tons, slots) => {
  const entry = getEquipmentEntry(id);
  expect([entry?.weight, entry?.criticalSlots]).toEqual([tons, slots]);
});

// Introduction dates (follow-up 102). Java's introduction date is the earliest
// advancement date, less five when approximate (TechAdvancement.java:691-697,
// 731-734 at 48fcb2f6). Every catalog copy of the item carries it.
const INTRO_YEARS = [
  ['flail', 3057, 'equipment/MiscType.java:4012-4034'],
  ['lance', 3064, 'equipment/MiscType.java:4066-4091'],
  ['talons', 3072, 'equipment/MiscType.java:4307-4331'],
  ['heavy-machine-gun', 3058, 'weapons/mgs/innerSphere/ISHeavyMG.java:89-90'],
  ['sniper-cannon', 3012, 'weapons/artillery/SniperCannon.java:90-93'],
  // IS production 3050, approximate (TechAdvancement.java:720-734 less five).
  ['claw', 3045, 'equipment/MiscType.java:4002-4003'],
  // Earliest advancement date marked approximate: five years earlier.
  ['umu', 3061, 'equipment/MiscType.java:2355-2356'],
  [
    'improved-autocannon-2',
    2810,
    'weapons/autoCannons/clan/CLImprovedAC2.java:85-86',
  ],
  [
    'improved-autocannon-5',
    2810,
    'weapons/autoCannons/clan/CLImprovedAC5.java:82-83',
  ],
  [
    'improved-autocannon-10',
    2810,
    'weapons/autoCannons/clan/CLImprovedAC10.java:81-82',
  ],
  [
    'improved-autocannon-20',
    2810,
    'weapons/autoCannons/clan/CLImprovedAC20.java:81-82',
  ],
  ['protomechac2', 3065, 'weapons/autoCannons/clan/CLProtoMekAC2.java:88-89'],
  ['protomechac4', 3065, 'weapons/autoCannons/clan/CLProtoMekAC4.java:87-88'],
  ['protomechac8', 3065, 'weapons/autoCannons/clan/CLProtoMekAC8.java:88-89'],
  ['hag20', 3057, 'weapons/gaussRifles/clan/CLHAG20.java:87-88'],
  ['hag30', 3057, 'weapons/gaussRifles/clan/CLHAG30.java:88-89'],
  ['hag40', 3057, 'weapons/gaussRifles/clan/CLHAG40.java:88-89'],
  [
    'sniper-rifle-thors-hammer',
    2795,
    'weapons/infantry/sniperRifle/InfantrySniperRifleThorsHammer.java:74-75',
  ],
  ['mml-3', 3062, 'weapons/missiles/innerSphere/mml/ISMML3.java:88-89'],
  ['mml-5', 3062, 'weapons/missiles/innerSphere/mml/ISMML5.java:91-92'],
  ['mml-7', 3062, 'weapons/missiles/innerSphere/mml/ISMML7.java:91-92'],
  ['mml-9', 3062, 'weapons/missiles/innerSphere/mml/ISMML9.java:91-92'],
  // Vehicle date prerequisites (VEH-VAL2): the earliest phase is the prototype.
  ['mobilefieldbase', 2535, 'equipment/MiscType.java:9067-9070 (approximate)'],
  ['cruisemissile50', 3065, 'weapons/artillery/ISCruiseMissile50.java:78-79'],
  ['remotesensordispenser', 2586, 'equipment/MiscType.java:6355-6358'],
  [
    'enhanced-lrm-10',
    3058,
    'weapons/lrms/innerSphere/enhancedLRM/ISEnhancedLRM10.java:89',
  ],
  ['combatvehicleescapepod', 3038, 'equipment/MiscType.java:5506'],
  ['c3boostedsystemslaveunit', 3073, 'equipment/MiscType.java:4592-4593'],
  ['c3-boosted-slave', 3073, 'equipment/MiscType.java:4592-4593'],
  ['bloodhound-active-probe', 3058, 'equipment/MiscType.java:5755-5756'],
  ['armoredmotivesystem', 3071, 'equipment/MiscType.java:3925-3926'],
  // DATE_PS = 1950 (interfaces/ITechnology.java:54).
  ['vehicular-sponson-turret', 1950, 'equipment/MiscType.java:10910-10911'],
] as const;
const CATALOG = join(process.cwd(), 'public/data/equipment/official');
const catalogCopies = (id: string) =>
  [
    'miscellaneous/other.json',
    'weapons/physical.json',
    'weapons/ballistic-machinegun.json',
    'weapons/ballistic-other.json',
    'weapons/ballistic-autocannon.json',
    'weapons/missile-other.json',
    'weapons/missile-lrm.json',
    'electronics/active-probe.json',
    'electronics/c3.json',
  ].flatMap((file) =>
    (
      JSON.parse(readFileSync(join(CATALOG, file), 'utf8')) as {
        items: { id: string; introductionYear?: number }[];
      }
    ).items.filter((item) => item.id === id),
  );

it.each(INTRO_YEARS)('%s is introduced in %s (%s)', (id, year) => {
  const copies = catalogCopies(id);
  expect(copies.length).toBeGreaterThan(0);
  expect(copies.map((item) => item.introductionYear)).toEqual(
    copies.map(() => year),
  );
});
