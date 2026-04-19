/**
 * Vehicle hit-location table tests.
 *
 * Covers every (direction × roll) combination plus VTOL rotor redirection.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-hit-location-tables
 */

import {
  VEHICLE_FRONT_HIT_TABLE,
  VEHICLE_REAR_HIT_TABLE,
  VEHICLE_SIDE_HIT_TABLE_LEFT,
  VEHICLE_SIDE_HIT_TABLE_RIGHT,
  determineVehicleHitLocationFromRoll,
  getVehicleHitLocationTable,
  isVehicleTACRoll,
} from '../vehicleHitLocation';

describe('vehicleHitLocation', () => {
  describe('table shape', () => {
    it('front table covers every 2d6 roll 2-12', () => {
      for (let r = 2; r <= 12; r++) {
        expect(VEHICLE_FRONT_HIT_TABLE[r]).toBeDefined();
      }
    });

    it('side-left / side-right / rear tables cover every 2d6 roll 2-12', () => {
      for (let r = 2; r <= 12; r++) {
        expect(VEHICLE_SIDE_HIT_TABLE_LEFT[r]).toBeDefined();
        expect(VEHICLE_SIDE_HIT_TABLE_RIGHT[r]).toBeDefined();
        expect(VEHICLE_REAR_HIT_TABLE[r]).toBeDefined();
      }
    });
  });

  describe('front attack (task 2.1)', () => {
    it('resolves every roll per spec', () => {
      const table = [
        { roll: [1, 1], loc: 'front', tac: true },
        { roll: [1, 2], loc: 'right_side', tac: false },
        { roll: [2, 2], loc: 'right_side', tac: false },
        { roll: [2, 3], loc: 'front', tac: false },
        { roll: [3, 3], loc: 'front', tac: false },
        { roll: [3, 4], loc: 'front', tac: false },
        { roll: [3, 5], loc: 'left_side', tac: false },
        { roll: [4, 5], loc: 'left_side', tac: false },
        { roll: [4, 6], loc: 'turret', tac: false },
        { roll: [5, 6], loc: 'turret', tac: false },
        { roll: [6, 6], loc: 'front', tac: true },
      ];

      for (const { roll, loc, tac } of table) {
        const result = determineVehicleHitLocationFromRoll('front', [
          roll[0],
          roll[1],
        ]);
        expect(result.location).toBe(loc);
        expect(result.isTAC).toBe(tac);
      }
    });
  });

  describe('side attack (task 2.2)', () => {
    it('left-arc: 2=left_side, 3-5=rear, 6-8=left_side, 9-10=front, 11-12=turret', () => {
      expect(determineVehicleHitLocationFromRoll('left', [1, 1]).location).toBe(
        'left_side',
      );
      expect(determineVehicleHitLocationFromRoll('left', [1, 2]).location).toBe(
        'rear',
      );
      expect(determineVehicleHitLocationFromRoll('left', [2, 2]).location).toBe(
        'rear',
      );
      expect(determineVehicleHitLocationFromRoll('left', [2, 3]).location).toBe(
        'rear',
      );
      expect(determineVehicleHitLocationFromRoll('left', [3, 3]).location).toBe(
        'left_side',
      );
      expect(determineVehicleHitLocationFromRoll('left', [4, 3]).location).toBe(
        'left_side',
      );
      expect(determineVehicleHitLocationFromRoll('left', [4, 4]).location).toBe(
        'left_side',
      );
      expect(determineVehicleHitLocationFromRoll('left', [4, 5]).location).toBe(
        'front',
      );
      expect(determineVehicleHitLocationFromRoll('left', [5, 5]).location).toBe(
        'front',
      );
      expect(determineVehicleHitLocationFromRoll('left', [6, 5]).location).toBe(
        'turret',
      );
      expect(determineVehicleHitLocationFromRoll('left', [6, 6]).location).toBe(
        'turret',
      );
    });

    it('right-arc mirrors left-arc with right_side', () => {
      expect(
        determineVehicleHitLocationFromRoll('right', [1, 1]).location,
      ).toBe('right_side');
      expect(
        determineVehicleHitLocationFromRoll('right', [3, 3]).location,
      ).toBe('right_side');
      expect(
        determineVehicleHitLocationFromRoll('right', [4, 5]).location,
      ).toBe('front');
      expect(
        determineVehicleHitLocationFromRoll('right', [6, 5]).location,
      ).toBe('turret');
    });
  });

  describe('rear attack (task 2.3)', () => {
    it('resolves every roll per spec', () => {
      // 2 = rear (TAC)
      expect(determineVehicleHitLocationFromRoll('rear', [1, 1]).location).toBe(
        'rear',
      );
      expect(determineVehicleHitLocationFromRoll('rear', [1, 1]).isTAC).toBe(
        true,
      );
      // 3-5 = side (left or right)
      for (const roll of [
        [1, 2],
        [2, 2],
        [2, 3],
      ] as const) {
        const loc = determineVehicleHitLocationFromRoll('rear', roll).location;
        expect(['left_side', 'right_side']).toContain(loc);
      }
      // 6-8 = rear
      for (const roll of [
        [3, 3],
        [3, 4],
        [4, 4],
      ] as const) {
        expect(determineVehicleHitLocationFromRoll('rear', roll).location).toBe(
          'rear',
        );
      }
      // 9-10 = turret
      expect(determineVehicleHitLocationFromRoll('rear', [4, 5]).location).toBe(
        'turret',
      );
      expect(determineVehicleHitLocationFromRoll('rear', [5, 5]).location).toBe(
        'turret',
      );
      // 11-12 = rear (TAC on 12)
      expect(determineVehicleHitLocationFromRoll('rear', [6, 5]).location).toBe(
        'rear',
      );
      expect(determineVehicleHitLocationFromRoll('rear', [6, 6]).location).toBe(
        'rear',
      );
      expect(determineVehicleHitLocationFromRoll('rear', [6, 6]).isTAC).toBe(
        true,
      );
    });
  });

  describe('VTOL rotor redirection (task 2.4)', () => {
    it('rolls 12 on front attack land on rotor when target is VTOL', () => {
      const result = determineVehicleHitLocationFromRoll('front', [6, 6], {
        isVTOL: true,
      });
      expect(result.location).toBe('rotor');
      expect(result.isTAC).toBe(true);
    });

    it('rolls 12 on rear attack land on rotor when target is VTOL', () => {
      const result = determineVehicleHitLocationFromRoll('rear', [6, 6], {
        isVTOL: true,
      });
      expect(result.location).toBe('rotor');
      expect(result.isTAC).toBe(true);
    });

    it('rolls 12 on side attack stay on turret for VTOLs (not redirected)', () => {
      expect(
        determineVehicleHitLocationFromRoll('left', [6, 6], { isVTOL: true })
          .location,
      ).toBe('turret');
      expect(
        determineVehicleHitLocationFromRoll('right', [6, 6], { isVTOL: true })
          .location,
      ).toBe('turret');
    });

    it('rolls other than 12 are not affected by the VTOL flag', () => {
      expect(
        determineVehicleHitLocationFromRoll('front', [3, 3], { isVTOL: true })
          .location,
      ).toBe('front');
      expect(
        determineVehicleHitLocationFromRoll('rear', [4, 5], { isVTOL: true })
          .location,
      ).toBe('turret');
    });
  });

  describe('helpers', () => {
    it('isVehicleTACRoll returns true only for 2 and 12', () => {
      expect(isVehicleTACRoll(2)).toBe(true);
      expect(isVehicleTACRoll(12)).toBe(true);
      for (let r = 3; r <= 11; r++) {
        expect(isVehicleTACRoll(r)).toBe(false);
      }
    });

    it('getVehicleHitLocationTable returns the right table per direction', () => {
      expect(getVehicleHitLocationTable('front')).toBe(VEHICLE_FRONT_HIT_TABLE);
      expect(getVehicleHitLocationTable('left')).toBe(
        VEHICLE_SIDE_HIT_TABLE_LEFT,
      );
      expect(getVehicleHitLocationTable('right')).toBe(
        VEHICLE_SIDE_HIT_TABLE_RIGHT,
      );
      expect(getVehicleHitLocationTable('rear')).toBe(VEHICLE_REAR_HIT_TABLE);
    });
  });
});
