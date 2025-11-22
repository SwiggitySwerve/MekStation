/**
 * ComponentType.ts
 * Defines the categories of components that can be installed on a unit.
 */

export enum ComponentType {
  // Structural / System
  ENGINE = 'Engine',
  GYRO = 'Gyro',
  COCKPIT = 'Cockpit',
  STRUCTURE = 'Structure',
  ARMOR = 'Armor',
  HEAT_SINK = 'Heat Sink',
  JUMP_JET = 'Jump Jet',
  
  // Equipment
  WEAPON = 'Weapon',
  AMMO = 'Ammo',
  EQUIPMENT = 'Equipment', // General equipment
  ACTUATOR = 'Actuator',
}

