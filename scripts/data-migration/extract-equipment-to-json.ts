/**
 * Equipment Extraction Script
 *
 * Extracts equipment definitions from TypeScript source files and converts them to JSON.
 * This enables a data-driven architecture where equipment can be loaded at runtime.
 *
 * Usage: npx ts-node scripts/data-migration/extract-equipment-to-json.ts
 */

export {};

/* oxlint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Import equipment definitions from TypeScript source
const {
  ENERGY_WEAPONS,
} = require('../../src/types/equipment/weapons/EnergyWeapons');
const {
  BALLISTIC_WEAPONS,
} = require('../../src/types/equipment/weapons/BallisticWeapons');
const {
  MISSILE_WEAPONS,
} = require('../../src/types/equipment/weapons/MissileWeapons');
const { ALL_AMMUNITION } = require('../../src/types/equipment/AmmunitionTypes');
const {
  ALL_ELECTRONICS,
} = require('../../src/types/equipment/ElectronicsTypes');
const {
  ALL_MISC_EQUIPMENT,
} = require('../../src/types/equipment/MiscEquipmentTypes');
const {
  PHYSICAL_WEAPON_DEFINITIONS,
} = require('../../src/types/equipment/PhysicalWeaponTypes');
const { TechBase } = require('../../src/types/enums/TechBase');
const { RulesLevel } = require('../../src/types/enums/RulesLevel');

// Output directories
const OUTPUT_BASE = path.join(
  __dirname,
  '../../public/data/equipment/official',
);
const WEAPONS_DIR = path.join(OUTPUT_BASE, 'weapons');

/**
 * Ensure directory exists
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Convert TechBase enum to string for JSON
 */
function techBaseToString(
  techBase: (typeof TechBase)[keyof typeof TechBase],
): string {
  switch (techBase) {
    case TechBase.INNER_SPHERE:
      return 'INNER_SPHERE';
    case TechBase.CLAN:
      return 'CLAN';
    case TechBase.BOTH:
      return 'BOTH';
    default:
      return 'INNER_SPHERE';
  }
}

/**
 * Convert RulesLevel enum to string for JSON
 */
function rulesLevelToString(
  rulesLevel: (typeof RulesLevel)[keyof typeof RulesLevel],
): string {
  switch (rulesLevel) {
    case RulesLevel.INTRODUCTORY:
      return 'INTRODUCTORY';
    case RulesLevel.STANDARD:
      return 'STANDARD';
    case RulesLevel.ADVANCED:
      return 'ADVANCED';
    case RulesLevel.EXPERIMENTAL:
      return 'EXPERIMENTAL';
    case RulesLevel.UNOFFICIAL:
      return 'UNOFFICIAL';
    default:
      return 'STANDARD';
  }
}

/**
 * Transform weapon for JSON output
 */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
function transformWeapon(weapon: any): object {
  return {
    id: weapon.id,
    name: weapon.name,
    category: weapon.category,
    subType: weapon.subType,
    techBase: techBaseToString(weapon.techBase),
    rulesLevel: rulesLevelToString(weapon.rulesLevel),
    damage: weapon.damage,
    heat: weapon.heat,
    ranges: weapon.ranges,
    weight: weapon.weight,
    criticalSlots: weapon.criticalSlots,
    ...(weapon.ammoPerTon && { ammoPerTon: weapon.ammoPerTon }),
    costCBills: weapon.costCBills,
    battleValue: weapon.battleValue,
    introductionYear: weapon.introductionYear,
    ...(weapon.isExplosive && { isExplosive: weapon.isExplosive }),
    ...(weapon.special &&
      weapon.special.length > 0 && { special: [...weapon.special] }),
  };
}

/**
 * Transform ammunition for JSON output
 */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
function transformAmmunition(ammo: any): object {
  return {
    id: ammo.id,
    name: ammo.name,
    category: ammo.category,
    variant: ammo.variant,
    techBase: techBaseToString(ammo.techBase),
    rulesLevel: rulesLevelToString(ammo.rulesLevel),
    compatibleWeaponIds: [...ammo.compatibleWeaponIds],
    shotsPerTon: ammo.shotsPerTon,
    weight: ammo.weight,
    criticalSlots: ammo.criticalSlots,
    costPerTon: ammo.costPerTon,
    battleValue: ammo.battleValue,
    isExplosive: ammo.isExplosive,
    introductionYear: ammo.introductionYear,
    ...(ammo.damageModifier !== undefined && {
      damageModifier: ammo.damageModifier,
    }),
    ...(ammo.rangeModifier !== undefined && {
      rangeModifier: ammo.rangeModifier,
    }),
    ...(ammo.special &&
      ammo.special.length > 0 && { special: [...ammo.special] }),
  };
}

/**
 * Transform electronics for JSON output
 */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
function transformElectronics(electronics: any): object {
  return {
    id: electronics.id,
    name: electronics.name,
    category: electronics.category,
    techBase: techBaseToString(electronics.techBase),
    rulesLevel: rulesLevelToString(electronics.rulesLevel),
    weight: electronics.weight,
    criticalSlots: electronics.criticalSlots,
    costCBills: electronics.costCBills,
    battleValue: electronics.battleValue,
    introductionYear: electronics.introductionYear,
    ...(electronics.special &&
      electronics.special.length > 0 && { special: [...electronics.special] }),
    ...(electronics.variableEquipmentId && {
      variableEquipmentId: electronics.variableEquipmentId,
    }),
  };
}

/**
 * Transform misc equipment for JSON output
 */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
function transformMiscEquipment(equipment: any): object {
  return {
    id: equipment.id,
    name: equipment.name,
    category: equipment.category,
    techBase: techBaseToString(equipment.techBase),
    rulesLevel: rulesLevelToString(equipment.rulesLevel),
    weight: equipment.weight,
    criticalSlots: equipment.criticalSlots,
    costCBills: equipment.costCBills,
    battleValue: equipment.battleValue,
    introductionYear: equipment.introductionYear,
    ...(equipment.special &&
      equipment.special.length > 0 && { special: [...equipment.special] }),
    ...(equipment.variableEquipmentId && {
      variableEquipmentId: equipment.variableEquipmentId,
    }),
  };
}

/**
 * Transform physical weapon for JSON output
 */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
function transformPhysicalWeapon(weapon: any): object {
  return {
    id: weapon.type.toLowerCase().replace(/ /g, '-').replace(/_/g, '-'),
    type: weapon.type,
    name: weapon.name,
    techBase: techBaseToString(weapon.techBase),
    rulesLevel: rulesLevelToString(weapon.rulesLevel),
    weightFormula: weapon.weightFormula,
    ...(weapon.tonnageDivisor !== undefined && {
      tonnageDivisor: weapon.tonnageDivisor,
    }),
    ...(weapon.fixedWeight !== undefined && {
      fixedWeight: weapon.fixedWeight,
    }),
    damageFormula: weapon.damageFormula,
    ...(weapon.damageDivisor !== undefined && {
      damageDivisor: weapon.damageDivisor,
    }),
    ...(weapon.damageBonus !== undefined && {
      damageBonus: weapon.damageBonus,
    }),
    ...(weapon.fixedDamage !== undefined && {
      fixedDamage: weapon.fixedDamage,
    }),
    criticalSlots: weapon.criticalSlots,
    requiresLowerArm: weapon.requiresLowerArm,
    requiresHand: weapon.requiresHand,
    validLocations: [...weapon.validLocations],
    introductionYear: weapon.introductionYear,
  };
}

/**
 * Write JSON file with metadata
 */
function writeJsonFile(
  filePath: string,
  data: object[],
  category: string,
): void {
  const output = {
    $schema: `../_schema/${category}-schema.json`,
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    count: data.length,
    items: data,
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(
    `✓ Written ${data.length} items to ${path.relative(process.cwd(), filePath)}`,
  );
}

/**
 * Main extraction function
 */
async function main(): Promise<void> {
  console.log('Equipment Extraction Script');
  console.log('===========================\n');

  // Ensure output directories exist
  ensureDir(OUTPUT_BASE);
  ensureDir(WEAPONS_DIR);

  // Extract energy weapons
  const energyWeapons = ENERGY_WEAPONS.map(transformWeapon);
  writeJsonFile(path.join(WEAPONS_DIR, 'energy.json'), energyWeapons, 'weapon');

  // Extract ballistic weapons
  const ballisticWeapons = BALLISTIC_WEAPONS.map(transformWeapon);
  writeJsonFile(
    path.join(WEAPONS_DIR, 'ballistic.json'),
    ballisticWeapons,
    'weapon',
  );

  // Extract missile weapons
  const missileWeapons = MISSILE_WEAPONS.map(transformWeapon);
  writeJsonFile(
    path.join(WEAPONS_DIR, 'missile.json'),
    missileWeapons,
    'weapon',
  );

  // Extract physical weapons
  const physicalWeapons = PHYSICAL_WEAPON_DEFINITIONS.map(
    transformPhysicalWeapon,
  );
  writeJsonFile(
    path.join(WEAPONS_DIR, 'physical.json'),
    physicalWeapons,
    'physical-weapon',
  );

  // Extract ammunition
  const ammunition = ALL_AMMUNITION.map(transformAmmunition);
  writeJsonFile(
    path.join(OUTPUT_BASE, 'ammunition.json'),
    ammunition,
    'ammunition',
  );

  // Extract electronics
  const electronics = ALL_ELECTRONICS.map(transformElectronics);
  writeJsonFile(
    path.join(OUTPUT_BASE, 'electronics.json'),
    electronics,
    'electronics',
  );

  // Extract misc equipment
  const miscEquipment = ALL_MISC_EQUIPMENT.map(transformMiscEquipment);
  writeJsonFile(
    path.join(OUTPUT_BASE, 'miscellaneous.json'),
    miscEquipment,
    'misc-equipment',
  );

  // Generate master index
  const masterIndex = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    files: {
      weapons: {
        energy: 'weapons/energy.json',
        ballistic: 'weapons/ballistic.json',
        missile: 'weapons/missile.json',
        physical: 'weapons/physical.json',
      },
      ammunition: 'ammunition.json',
      electronics: 'electronics.json',
      miscellaneous: 'miscellaneous.json',
    },
    totalItems: {
      weapons:
        energyWeapons.length +
        ballisticWeapons.length +
        missileWeapons.length +
        physicalWeapons.length,
      ammunition: ammunition.length,
      electronics: electronics.length,
      miscellaneous: miscEquipment.length,
    },
  };

  fs.writeFileSync(
    path.join(OUTPUT_BASE, 'index.json'),
    JSON.stringify(masterIndex, null, 2),
  );
  console.log(
    `✓ Written master index to public/data/equipment/official/index.json`,
  );

  // Summary
  console.log('\n===========================');
  console.log('Extraction Complete!');
  console.log(
    `Total items extracted: ${
      energyWeapons.length +
      ballisticWeapons.length +
      missileWeapons.length +
      physicalWeapons.length +
      ammunition.length +
      electronics.length +
      miscEquipment.length
    }`,
  );
}

// Run the extraction
main().catch((error) => {
  console.error('Extraction failed:', error);
  process.exit(1);
});
