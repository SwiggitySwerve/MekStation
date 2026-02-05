#!/usr/bin/env node
/**
 * Update Name Mappings from Extracted Equipment
 *
 * Generates name mappings for new equipment to help with MTF file parsing.
 */

const fs = require('fs');
const path = require('path');

const OFFICIAL_DIR = path.join(
  __dirname,
  '..',
  'public',
  'data',
  'equipment',
  'official',
);
const MAPPINGS_FILE = path.join(
  __dirname,
  '..',
  'public',
  'data',
  'equipment',
  'name-mappings.json',
);

/**
 * Generate kebab-case ID from name
 */
function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Generate MTF name variations
 */
function generateMtfNames(name, techBase) {
  const names = [name];

  // Add tech base prefix variations
  if (techBase === 'CLAN' || techBase === 'CL') {
    names.push(`Clan ${name}`);
    names.push(`${name} (Clan)`);
    names.push(`CL${name.replace(/\s+/g, '')}`);
  } else if (techBase === 'INNER_SPHERE' || techBase === 'IS') {
    names.push(`IS ${name}`);
    names.push(`${name} [IS]`);
    names.push(`IS${name.replace(/\s+/g, '')}`);
  }

  // Add common variations
  names.push(name.replace(/\s+/g, ''));
  names.push(name.replace(/[^a-zA-Z0-9]/g, ''));

  return names;
}

/**
 * Load all equipment and generate mappings
 */
function updateNameMappings() {
  console.log('Generating name mappings from equipment files...\n');

  const mappings = {};

  // Load all equipment files
  const files = [
    { path: path.join(OFFICIAL_DIR, 'weapons', 'energy.json'), type: 'weapon' },
    {
      path: path.join(OFFICIAL_DIR, 'weapons', 'ballistic.json'),
      type: 'weapon',
    },
    {
      path: path.join(OFFICIAL_DIR, 'weapons', 'missile.json'),
      type: 'weapon',
    },
    {
      path: path.join(OFFICIAL_DIR, 'weapons', 'physical.json'),
      type: 'weapon',
    },
    { path: path.join(OFFICIAL_DIR, 'electronics.json'), type: 'electronics' },
    { path: path.join(OFFICIAL_DIR, 'miscellaneous.json'), type: 'misc' },
    { path: path.join(OFFICIAL_DIR, 'ammunition.json'), type: 'ammo' },
  ];

  for (const fileInfo of files) {
    if (!fs.existsSync(fileInfo.path)) {
      console.log(`Skipping ${fileInfo.path} (not found)`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(fileInfo.path, 'utf8'));
    console.log(`Processing ${fileInfo.path}: ${data.items.length} items`);

    for (const item of data.items) {
      const equipmentId = item.id;
      const name = item.name;
      const techBase = item.techBase || 'INNER_SPHERE';

      // Add direct name mapping
      mappings[name] = equipmentId;

      // Generate MTF name variations
      const mtfNames = generateMtfNames(name, techBase);
      for (const mtfName of mtfNames) {
        if (mtfName !== name && !mappings[mtfName]) {
          mappings[mtfName] = equipmentId;
        }
      }

      // Add internal name if available (for weapons)
      if (item.internalName) {
        mappings[item.internalName] = equipmentId;
      }
    }
  }

  // Load existing mappings to preserve custom ones
  let existingMappings = {};
  if (fs.existsSync(MAPPINGS_FILE)) {
    existingMappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf8'));
    console.log(
      `\nLoaded ${Object.keys(existingMappings).length} existing mappings`,
    );
  }

  // Merge: existing mappings take precedence
  const finalMappings = { ...mappings, ...existingMappings };

  // Sort alphabetically
  const sortedMappings = {};
  Object.keys(finalMappings)
    .sort()
    .forEach((key) => {
      sortedMappings[key] = finalMappings[key];
    });

  // Save mappings
  fs.writeFileSync(
    MAPPINGS_FILE,
    JSON.stringify(sortedMappings, null, 2) + '\n',
  );

  console.log(`\nGenerated ${Object.keys(mappings).length} new mappings`);
  console.log(`Total mappings: ${Object.keys(finalMappings).length}`);
  console.log(`Saved to ${MAPPINGS_FILE}`);
}

// Run update
if (require.main === module) {
  updateNameMappings();
}

module.exports = { updateNameMappings };
