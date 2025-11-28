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

export enum ComponentCategory {
  CHASSIS = 'chassis',
  ENGINE = 'engine',
  GYRO = 'gyro',
  COCKPIT = 'cockpit',
  STRUCTURE = 'structure',
  ARMOR = 'armor',
  HEAT_SINK = 'heatsink',
  MYOMER = 'myomer',
  TARGETING = 'targeting',
  MOVEMENT = 'movement',
}

export enum EquipmentCategory {
  WEAPON = 'weapon',
  AMMO = 'ammo',
  EQUIPMENT = 'equipment',
  ELECTRONICS = 'electronics',
  HEAT_SINK = 'heat_sink',
  JUMP_JET = 'jump_jet',
  PHYSICAL = 'physical',
  MISCELLANEOUS = 'miscellaneous',
}

