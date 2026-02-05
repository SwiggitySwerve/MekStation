#!/usr/bin/env node
/**
 * Extract Missing Equipment Script
 *
 * Compares equipment names from mm-data .blk files with existing
 * equipment in megamek-web JSON files to identify missing items.
 */

const fs = require('fs');
const path = require('path');

// Read extracted equipment names from mm-data
const mmDataNamesPath = path.join(
  __dirname,
  '..',
  'mm-data-equipment-names.txt',
);
const mmDataNames = fs
  .readFileSync(mmDataNamesPath, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

// Read existing equipment from JSON files
const equipmentDir = path.join(
  __dirname,
  '..',
  'public',
  'data',
  'equipment',
  'official',
);

function loadEquipmentFile(filename) {
  try {
    const filePath = path.join(equipmentDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`Error loading ${filename}:`, e.message);
    return { items: [] };
  }
}

const energyWeapons = loadEquipmentFile('weapons/energy.json');
const ballisticWeapons = loadEquipmentFile('weapons/ballistic.json');
const missileWeapons = loadEquipmentFile('weapons/missile.json');
const physicalWeapons = loadEquipmentFile('weapons/physical.json');
const electronics = loadEquipmentFile('electronics.json');
const miscellaneous = loadEquipmentFile('miscellaneous.json');
const ammunition = loadEquipmentFile('ammunition.json');

// Build a set of all existing equipment names and IDs (normalized)
const existingEquipment = new Set();

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

function addEquipment(items) {
  items.forEach((item) => {
    // Add ID
    existingEquipment.add(normalizeName(item.id));
    // Add name
    existingEquipment.add(normalizeName(item.name));
    // Add variations
    const nameVariations = [
      item.name,
      item.name.replace(/\s+/g, ''),
      item.name.replace(/[^a-z0-9]/gi, ''),
      item.name.toLowerCase(),
    ];
    nameVariations.forEach((v) => {
      existingEquipment.add(normalizeName(v));
    });
  });
}

addEquipment(energyWeapons.items);
addEquipment(ballisticWeapons.items);
addEquipment(missileWeapons.items);
addEquipment(physicalWeapons.items);
addEquipment(electronics.items);
addEquipment(miscellaneous.items);
addEquipment(ammunition.items);

// Categorize mm-data equipment names
const missingEquipment = {
  weapons: {
    energy: [],
    ballistic: [],
    missile: [],
    physical: [],
    unknown: [],
  },
  electronics: [],
  miscellaneous: [],
  ammunition: [],
  unknown: [],
};

// Keywords for categorization
const energyKeywords = [
  'laser',
  'ppc',
  'flamer',
  'plasma',
  'particle',
  'pulse',
];
const ballisticKeywords = [
  'ac/',
  'autocannon',
  'gauss',
  'rifle',
  'machine gun',
  'mg',
  'lbx',
  'uac',
  'rac',
  'lac',
  'hvac',
  'hag',
];
const missileKeywords = [
  'lrm',
  'srm',
  'mrm',
  'atm',
  'narc',
  'streak',
  'artemis',
  'torpedo',
  'thunderbolt',
  'mml',
];
const electronicsKeywords = [
  'ecm',
  'probe',
  'tag',
  'c3',
  'targeting',
  'computer',
  'sensor',
  'imager',
  'communications',
];
const miscKeywords = [
  'heat sink',
  'jump jet',
  'masc',
  'tsm',
  'supercharger',
  'armor',
  'chassis',
  'stealth',
  'shield',
];
const ammoKeywords = ['ammo', 'ammunition'];

function categorizeEquipment(name) {
  const lowerName = name.toLowerCase();

  // Check for ammo first
  if (ammoKeywords.some((kw) => lowerName.includes(kw))) {
    return 'ammunition';
  }

  // Check electronics
  if (electronicsKeywords.some((kw) => lowerName.includes(kw))) {
    return 'electronics';
  }

  // Check misc
  if (miscKeywords.some((kw) => lowerName.includes(kw))) {
    return 'miscellaneous';
  }

  // Check weapon types
  if (energyKeywords.some((kw) => lowerName.includes(kw))) {
    if (
      lowerName.includes('laser') ||
      lowerName.includes('ppc') ||
      lowerName.includes('flamer') ||
      lowerName.includes('plasma')
    ) {
      return 'weapons.energy';
    }
  }

  if (ballisticKeywords.some((kw) => lowerName.includes(kw))) {
    return 'weapons.ballistic';
  }

  if (missileKeywords.some((kw) => lowerName.includes(kw))) {
    return 'weapons.missile';
  }

  // Check for physical weapons (melee, etc.)
  if (
    lowerName.includes('hatchet') ||
    lowerName.includes('sword') ||
    lowerName.includes('claw') ||
    lowerName.includes('mace')
  ) {
    return 'weapons.physical';
  }

  return 'unknown';
}

// Compare and find missing equipment
mmDataNames.forEach((name) => {
  const normalized = normalizeName(name);

  // Check if this equipment exists
  let found = false;

  // Direct match
  if (existingEquipment.has(normalized)) {
    found = true;
  }

  // Check partial matches (for variations like "AC10" vs "AC/10")
  const nameParts = normalized.match(/(\d+|[a-z]+)/g) || [];
  if (nameParts.length > 0) {
    const partialMatch = Array.from(existingEquipment).some((existing) => {
      const existingParts = existing.match(/(\d+|[a-z]+)/g) || [];
      // Check if significant parts match
      return (
        nameParts.length > 0 &&
        nameParts.every((part) => existingParts.includes(part)) &&
        existingParts.length === nameParts.length
      );
    });
    if (partialMatch) {
      found = true;
    }
  }

  if (!found) {
    const category = categorizeEquipment(name);

    if (category.startsWith('weapons.')) {
      const subCategory = category.split('.')[1];
      missingEquipment.weapons[subCategory].push(name);
    } else {
      missingEquipment[category].push(name);
    }
  }
});

// Generate report
console.log('='.repeat(80));
console.log('MISSING EQUIPMENT ANALYSIS');
console.log('='.repeat(80));
console.log(`\nTotal equipment names in mm-data: ${mmDataNames.length}`);
console.log(`Total existing equipment items: ${existingEquipment.size / 4}`); // Rough estimate

console.log('\n' + '='.repeat(80));
console.log('MISSING EQUIPMENT BY CATEGORY');
console.log('='.repeat(80));

const categories = [
  { name: 'Energy Weapons', items: missingEquipment.weapons.energy },
  { name: 'Ballistic Weapons', items: missingEquipment.weapons.ballistic },
  { name: 'Missile Weapons', items: missingEquipment.weapons.missile },
  { name: 'Physical Weapons', items: missingEquipment.weapons.physical },
  { name: 'Electronics', items: missingEquipment.electronics },
  { name: 'Miscellaneous', items: missingEquipment.miscellaneous },
  { name: 'Ammunition', items: missingEquipment.ammunition },
  { name: 'Unknown/Uncategorized', items: missingEquipment.unknown },
];

let totalMissing = 0;
categories.forEach((cat) => {
  if (cat.items.length > 0) {
    console.log(`\n${cat.name} (${cat.items.length} items):`);
    console.log('-'.repeat(80));
    cat.items.slice(0, 50).forEach((item) => {
      console.log(`  - ${item}`);
    });
    if (cat.items.length > 50) {
      console.log(`  ... and ${cat.items.length - 50} more`);
    }
    totalMissing += cat.items.length;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`TOTAL MISSING EQUIPMENT: ${totalMissing} items`);
console.log('='.repeat(80));

// Write detailed report to file
const reportPath = path.join(__dirname, '..', 'missing-equipment-report.json');
const report = {
  generatedAt: new Date().toISOString(),
  totalMmDataEquipment: mmDataNames.length,
  totalMissing: totalMissing,
  missingByCategory: categories.reduce((acc, cat) => {
    if (cat.items.length > 0) {
      acc[cat.name] = {
        count: cat.items.length,
        items: cat.items,
      };
    }
    return acc;
  }, {}),
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nDetailed report saved to: ${reportPath}`);
