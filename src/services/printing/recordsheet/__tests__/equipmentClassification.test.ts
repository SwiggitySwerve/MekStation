import { WeaponCategory } from '@/types/equipment';

import type { IUnitConfig } from '../types';

import { extractEquipment } from '../dataExtractors.equipment';

jest.mock('@/services/equipment/EquipmentLookupService', () => ({
  getEquipmentLookupService: () => ({
    getAllWeapons: () => [
      {
        id: 'ac-20',
        name: 'AC/20',
        category: WeaponCategory.BALLISTIC,
        heat: 7,
        damage: 20,
        ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
      },
    ],
    getAllAmmunition: () => [
      { id: 'ac-20-ammo', name: 'AC/20 Ammo', shotsPerTon: 5 },
    ],
  }),
}));

it('keeps ammunition distinct from the similarly named weapon in record sheets', () => {
  const records = extractEquipment({
    equipment: [
      {
        id: 'weapon-instance',
        name: 'AC/20',
        location: 'Right Torso',
        isWeapon: true,
      },
      {
        id: 'ammo-instance',
        name: 'AC/20 Ammo',
        location: 'Left Torso',
        isAmmo: true,
        ammoCount: 5,
      },
    ],
  } as IUnitConfig);
  expect(records[0]).toMatchObject({
    id: 'weapon-instance',
    isWeapon: true,
    damage: '20',
  });
  expect(records[1]).toMatchObject({
    id: 'ammo-instance',
    isAmmo: true,
    isWeapon: false,
    ammoCount: 5,
  });
});

it('fills ammo shot counts from ammunition data when the unit omits them', () => {
  const records = extractEquipment({
    equipment: [
      {
        id: 'ammo-instance',
        name: 'AC/20 Ammo',
        location: 'Left Torso',
        isAmmo: true,
      },
      {
        id: 'unknown-ammo',
        name: 'Mystery Ammo',
        location: 'Left Torso',
        isAmmo: true,
      },
    ],
  } as IUnitConfig);
  expect(records[0]).toMatchObject({ isAmmo: true, ammoCount: 5 });
  expect(records[1].ammoCount).toBeUndefined();
});

it('keeps an unassigned location readable within the record-sheet column', () => {
  const [record] = extractEquipment({
    equipment: [
      {
        id: 'unassigned',
        name: 'AC/20',
        location: 'Unassigned',
        isWeapon: true,
      },
    ],
  } as IUnitConfig);
  expect(record).toMatchObject({ location: 'Unassigned', locationAbbr: '—' });
});
