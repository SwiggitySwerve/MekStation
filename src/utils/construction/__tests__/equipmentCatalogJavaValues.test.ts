/**
 * Owner ruling 2026-11-02, question 1 (OWNER-RULINGS-20261030.md, last section):
 * equipment catalog values that differed from pinned MegaMek 48fcb2f6 are
 * corrected, each cited. These rows pin every corrected value to its Java line.
 */
import { processCritAmmoSlot } from '../../../../scripts/validate-bv-crit-scan-ammo';
import { createEmptyCritScan } from '../../../../scripts/validate-bv-crit-scan-types';
import { AMMUNITION_CATALOG_FILES } from '../equipmentBVCatalogData';
import {
  getAmmunitionEntry,
  getEquipmentEntry,
  resolveEquipmentBV,
} from '../equipmentBVResolver';

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
