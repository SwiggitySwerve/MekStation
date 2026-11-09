import { createDefaultInfantryState } from '@/stores/infantryState';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';

import { projectInfantryDefinition } from '../infantryDefinitionProjection';

it('retains declared squads, independent composition, weapon IDs and per-squad secondary count', () => {
  expect(
    projectInfantryDefinition({
      ...createDefaultInfantryState(),
      squadSize: 5,
      numberOfSquads: 5,
      platoonComposition: { squads: 3, troopersPerSquad: 6 },
      motionType: SquadMotionType.TRACKED,
      motiveType: 'Tracked',
      primaryWeapon: 'native primary',
      primaryWeaponId: 'primary-id',
      secondaryWeapon: 'native secondary',
      secondaryWeaponId: 'secondary-id',
      secondaryWeaponCount: 2,
      damageDivisor: 1.5,
    }),
  ).toEqual({
    platoon: { squadSize: 5, squadCount: 5, totalTroopers: 18 },
    motionType: 'TRACKED',
    motiveType: 'Tracked',
    primaryWeapon: { id: 'primary-id', name: 'native primary' },
    secondaryWeapon: { id: 'secondary-id', name: 'native secondary', count: 2 },
    armorKit: 'None',
    damageDivisor: 1.5,
  });
});

it('retains native motive declarations and absent secondary weapons without fabricating IDs', () => {
  expect(
    projectInfantryDefinition({
      ...createDefaultInfantryState(),
      motiveType: 'Motorized SCUBA',
      primaryWeapon: 'native primary',
      primaryWeaponId: undefined,
      secondaryWeapon: undefined,
      secondaryWeaponCount: 2,
      armorKit: 'Environment Suit, Marine',
    }),
  ).toMatchObject({
    motiveType: 'Motorized SCUBA',
    primaryWeapon: { id: 'native primary', name: 'native primary' },
    secondaryWeapon: undefined,
    armorKit: 'Environment Suit, Marine',
  });
});
