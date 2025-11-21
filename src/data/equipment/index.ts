import { Equipment } from './types';
import { ENERGY_WEAPONS } from './energy-weapons';
import { BALLISTIC_WEAPONS } from './ballistic-weapons';
import { MISSILE_WEAPONS } from './missile-weapons';
import { ARTILLERY_WEAPONS } from './artillery-weapons';
import { CAPITAL_WEAPONS } from './capital-weapons';
import { PHYSICAL_WEAPONS } from './physical-weapons';
import { ANTI_PERSONNEL_WEAPONS } from './anti-personnel-weapons';
import { ONE_SHOT_WEAPONS } from './one-shot-weapons';
import { TORPEDOES } from './torpedoes';
import { EQUIPMENT } from './equipment';
import { INDUSTRIAL_EQUIPMENT } from './industrial-equipment';
import { HEAT_MANAGEMENT } from './heat-management';
import { MOVEMENT_EQUIPMENT } from './movement-equipment';
import { ELECTRONIC_WARFARE } from './electronic-warfare';
import { PROTOTYPE_EQUIPMENT } from './prototype-equipment';
import { AMMUNITION } from './ammunition';

export * from './types';
export { BROWSABLE_CATEGORIES, SPECIAL_CATEGORIES, ALL_CATEGORIES } from './types';

export const EQUIPMENT_DATABASE = {
  energyWeapons: ENERGY_WEAPONS,
  ballisticWeapons: BALLISTIC_WEAPONS,
  missileWeapons: MISSILE_WEAPONS,
  artilleryWeapons: ARTILLERY_WEAPONS,
  capitalWeapons: CAPITAL_WEAPONS,
  physicalWeapons: PHYSICAL_WEAPONS,
  antiPersonnelWeapons: ANTI_PERSONNEL_WEAPONS,
  oneShotWeapons: ONE_SHOT_WEAPONS,
  torpedoes: TORPEDOES,
  equipment: EQUIPMENT,
  industrialEquipment: INDUSTRIAL_EQUIPMENT,
  heatManagement: HEAT_MANAGEMENT,
  movementEquipment: MOVEMENT_EQUIPMENT,
  electronicWarfare: ELECTRONIC_WARFARE,
  prototypeEquipment: PROTOTYPE_EQUIPMENT,
  ammunition: AMMUNITION
};

// Flattened list of all equipment with tech base variants
export const ALL_EQUIPMENT_VARIANTS = [
  ...ENERGY_WEAPONS,
  ...BALLISTIC_WEAPONS,
  ...MISSILE_WEAPONS,
  ...ARTILLERY_WEAPONS,
  ...CAPITAL_WEAPONS,
  ...PHYSICAL_WEAPONS,
  ...ANTI_PERSONNEL_WEAPONS,
  ...ONE_SHOT_WEAPONS,
  ...TORPEDOES,
  ...EQUIPMENT,
  ...INDUSTRIAL_EQUIPMENT,
  ...HEAT_MANAGEMENT,
  ...MOVEMENT_EQUIPMENT,
  ...ELECTRONIC_WARFARE,
  ...PROTOTYPE_EQUIPMENT,
  ...AMMUNITION
];
