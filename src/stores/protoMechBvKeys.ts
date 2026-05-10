import type { ProtoMechState } from './protoMechState';

/**
 * Fields whose mutation invalidates a ProtoMech's BV breakdown. Any setter
 * that changes one of these will trigger a recomputeBV refresh after the
 * base `set` completes. Listed explicitly so that non-BV changes (e.g.
 * `setName`) do not pay the BV recalculation cost.
 */
export const BV_AFFECTING_KEYS: ReadonlyArray<keyof ProtoMechState> = [
  'tonnage',
  'weightClass',
  'chassisType',
  'pointSize',
  'walkMP',
  'cruiseMP',
  'flankMP',
  'jumpMP',
  'engineRating',
  'armorByLocation',
  'structureByLocation',
  'armorType',
  'hasMainGun',
  'mainGunWeaponId',
  'hasMyomerBooster',
  'glidingWings',
  'equipment',
];
