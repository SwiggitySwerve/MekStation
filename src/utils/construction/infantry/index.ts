/**
 * Infantry Construction — Barrel Export
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

export {
  INFANTRY_WEAPON_TABLE,
  findWeaponById,
  getPrimaryWeaponOptions,
} from './weaponTable';

export {
  getDefaultComposition,
  totalTroopers,
  getMotiveMP,
  getMotiveProfile,
  squadMotionTypeForMotive,
  effectiveFiringTroopers,
  secondaryWeaponCount,
  FIELD_GUN_ALLOWED_MOTIVES,
  HEAVY_WEAPON_MOTIVES,
} from './platoonComposition';

export {
  FIELD_GUN_CATALOG,
  findFieldGunById,
  buildFieldGun,
  deriveFieldGunCrewCount,
  getDeployedFieldGunTonnage,
  getFieldGunConstructionTonnage,
  normalizeInfantryFieldGun,
  totalFieldGunCrew,
} from './fieldGuns';

export {
  INFANTRY_ARMOR_KIT_PROFILES,
  getInfantryArmorKitProfile,
  mapPersonnelArmorKitToConstructionKit,
  canArmorKitDeployInVacuumOrUnderwater,
  calculateArmorKitMassTons,
  calculatePersonnelArmorKitMassTons,
} from './armorKits';

export type { IInfantryArmorKitProfile } from './armorKits';

export {
  validatePlatoonSize,
  validatePlatoonDefaultWarning,
  validateMotiveCompatibility,
  validateArmorKit,
  validatePrimaryWeapon,
  validateFieldGuns,
  validateAntiMechTraining,
  validateInfantryConstruction,
  INF_VALIDATION_RULE_IDS,
} from './validation';

export type {
  InfantryValidationInput,
  InfantryValidationResult,
  InfValidationRuleId,
} from './validation';

export {
  calculateInfantryBV,
  calculateInfantryPerTrooperBV,
  calculateInfantryPrimaryBV,
  calculateInfantrySecondaryBV,
  calculateInfantryFieldGunBV,
  getInfantryMotiveMultiplier,
  getInfantryPilotMultiplier,
} from './infantryBV';

export type {
  InfantryBVInput,
  InfantryWeaponRef,
  InfantryFieldGunMount,
  IInfantryBVBreakdown,
} from './infantryBV';

export {
  computeInfantryBVFromState,
  calculateInfantryBVFromUnit,
} from './infantryBVAdapter';
export type { InfantryStateLike } from './infantryBVAdapter';
