#!/usr/bin/env node
/**
 * Merge Extracted Equipment with Official Equipment Files
 *
 * Merges extracted equipment from MegaMek with existing official equipment,
 * avoiding duplicates and maintaining data integrity.
 */

const fs = require('fs');
const path = require('path');

const EXTRACTED_DIR = path.join(
  __dirname,
  '..',
  'public',
  'data',
  'equipment',
  'extracted',
);
const OFFICIAL_DIR = path.join(
  __dirname,
  '..',
  'public',
  'data',
  'equipment',
  'official',
);
const MISSING_REPORT = path.join(
  __dirname,
  '..',
  'missing-equipment-report.json',
);

/**
 * Normalize equipment ID for comparison
 */
function normalizeId(id) {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Normalize equipment name for comparison
 */
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Check if equipment already exists
 */
function equipmentExists(existingItems, newItem) {
  const newId = normalizeId(newItem.id);
  const newName = normalizeName(newItem.name);

  return existingItems.some((existing) => {
    const existingId = normalizeId(existing.id);
    const existingName = normalizeName(existing.name);

    return existingId === newId || existingName === newName;
  });
}

/**
 * Merge equipment arrays, avoiding duplicates
 */
function mergeEquipment(existingItems, newItems) {
  const merged = [...existingItems];
  const existingIds = new Set(
    existingItems.map((item) => normalizeId(item.id)),
  );
  const existingNames = new Set(
    existingItems.map((item) => normalizeName(item.name)),
  );

  for (const newItem of newItems) {
    const newId = normalizeId(newItem.id);
    const newName = normalizeName(newItem.name);

    // Skip if already exists
    if (existingIds.has(newId) || existingNames.has(newName)) {
      continue;
    }

    // Add new item
    merged.push(newItem);
    existingIds.add(newId);
    existingNames.add(newName);
  }

  return merged;
}

/**
 * Load JSON file
 */
function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`Error loading ${filePath}:`, e.message);
    return null;
  }
}

/**
 * Save JSON file
 */
function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (e) {
    console.error(`Error saving ${filePath}:`, e.message);
    return false;
  }
}

/**
 * Main merge function
 */
function mergeEquipmentFiles() {
  console.log('Merging extracted equipment with official files...\n');

  // Load missing equipment report to prioritize
  let missingEquipment = null;
  if (fs.existsSync(MISSING_REPORT)) {
    missingEquipment = loadJsonFile(MISSING_REPORT);
    console.log(
      `Loaded missing equipment report with ${missingEquipment?.totalMissing || 0} missing items\n`,
    );
  }

  const mergeResults = {
    energy: { existing: 0, added: 0, total: 0 },
    ballistic: { existing: 0, added: 0, total: 0 },
    missile: { existing: 0, added: 0, total: 0 },
    electronics: { existing: 0, added: 0, total: 0 },
    miscellaneous: { existing: 0, added: 0, total: 0 },
    ammunition: { existing: 0, added: 0, total: 0 },
  };

  // Merge energy weapons
  const energyExtracted = loadJsonFile(
    path.join(EXTRACTED_DIR, 'weapons-energy.json'),
  );
  const energyOfficial = loadJsonFile(
    path.join(OFFICIAL_DIR, 'weapons', 'energy.json'),
  );
  if (energyExtracted && energyOfficial) {
    mergeResults.energy.existing = energyOfficial.items.length;
    const merged = mergeEquipment(energyOfficial.items, energyExtracted.items);
    mergeResults.energy.added = merged.length - mergeResults.energy.existing;
    mergeResults.energy.total = merged.length;

    energyOfficial.items = merged;
    energyOfficial.count = merged.length;
    energyOfficial.generatedAt = new Date().toISOString();

    saveJsonFile(
      path.join(OFFICIAL_DIR, 'weapons', 'energy.json'),
      energyOfficial,
    );
    console.log(
      `Energy Weapons: ${mergeResults.energy.existing} existing + ${mergeResults.energy.added} added = ${mergeResults.energy.total} total`,
    );
  }

  // Merge ballistic weapons
  const ballisticExtracted = loadJsonFile(
    path.join(EXTRACTED_DIR, 'weapons-ballistic.json'),
  );
  const ballisticOfficial = loadJsonFile(
    path.join(OFFICIAL_DIR, 'weapons', 'ballistic.json'),
  );
  if (ballisticExtracted && ballisticOfficial) {
    mergeResults.ballistic.existing = ballisticOfficial.items.length;
    const merged = mergeEquipment(
      ballisticOfficial.items,
      ballisticExtracted.items,
    );
    mergeResults.ballistic.added =
      merged.length - mergeResults.ballistic.existing;
    mergeResults.ballistic.total = merged.length;

    ballisticOfficial.items = merged;
    ballisticOfficial.count = merged.length;
    ballisticOfficial.generatedAt = new Date().toISOString();

    saveJsonFile(
      path.join(OFFICIAL_DIR, 'weapons', 'ballistic.json'),
      ballisticOfficial,
    );
    console.log(
      `Ballistic Weapons: ${mergeResults.ballistic.existing} existing + ${mergeResults.ballistic.added} added = ${mergeResults.ballistic.total} total`,
    );
  }

  // Merge missile weapons
  const missileExtracted = loadJsonFile(
    path.join(EXTRACTED_DIR, 'weapons-missile.json'),
  );
  const missileOfficial = loadJsonFile(
    path.join(OFFICIAL_DIR, 'weapons', 'missile.json'),
  );
  if (missileExtracted && missileOfficial) {
    mergeResults.missile.existing = missileOfficial.items.length;
    const merged = mergeEquipment(
      missileOfficial.items,
      missileExtracted.items,
    );
    mergeResults.missile.added = merged.length - mergeResults.missile.existing;
    mergeResults.missile.total = merged.length;

    missileOfficial.items = merged;
    missileOfficial.count = merged.length;
    missileOfficial.generatedAt = new Date().toISOString();

    saveJsonFile(
      path.join(OFFICIAL_DIR, 'weapons', 'missile.json'),
      missileOfficial,
    );
    console.log(
      `Missile Weapons: ${mergeResults.missile.existing} existing + ${mergeResults.missile.added} added = ${mergeResults.missile.total} total`,
    );
  }

  // Merge electronics
  const electronicsExtracted = loadJsonFile(
    path.join(EXTRACTED_DIR, 'electronics.json'),
  );
  const electronicsOfficial = loadJsonFile(
    path.join(OFFICIAL_DIR, 'electronics.json'),
  );
  if (electronicsExtracted && electronicsOfficial) {
    mergeResults.electronics.existing = electronicsOfficial.items.length;
    const merged = mergeEquipment(
      electronicsOfficial.items,
      electronicsExtracted.items,
    );
    mergeResults.electronics.added =
      merged.length - mergeResults.electronics.existing;
    mergeResults.electronics.total = merged.length;

    electronicsOfficial.items = merged;
    electronicsOfficial.count = merged.length;
    electronicsOfficial.generatedAt = new Date().toISOString();

    saveJsonFile(
      path.join(OFFICIAL_DIR, 'electronics.json'),
      electronicsOfficial,
    );
    console.log(
      `Electronics: ${mergeResults.electronics.existing} existing + ${mergeResults.electronics.added} added = ${mergeResults.electronics.total} total`,
    );
  }

  // Merge miscellaneous
  const miscExtracted = loadJsonFile(
    path.join(EXTRACTED_DIR, 'miscellaneous.json'),
  );
  const miscOfficial = loadJsonFile(
    path.join(OFFICIAL_DIR, 'miscellaneous.json'),
  );
  if (miscExtracted && miscOfficial) {
    mergeResults.miscellaneous.existing = miscOfficial.items.length;
    const merged = mergeEquipment(miscOfficial.items, miscExtracted.items);
    mergeResults.miscellaneous.added =
      merged.length - mergeResults.miscellaneous.existing;
    mergeResults.miscellaneous.total = merged.length;

    miscOfficial.items = merged;
    miscOfficial.count = merged.length;
    miscOfficial.generatedAt = new Date().toISOString();

    saveJsonFile(path.join(OFFICIAL_DIR, 'miscellaneous.json'), miscOfficial);
    console.log(
      `Miscellaneous: ${mergeResults.miscellaneous.existing} existing + ${mergeResults.miscellaneous.added} added = ${mergeResults.miscellaneous.total} total`,
    );
  }

  // Merge ammunition
  const ammoExtracted = loadJsonFile(
    path.join(EXTRACTED_DIR, 'ammunition.json'),
  );
  const ammoOfficial = loadJsonFile(path.join(OFFICIAL_DIR, 'ammunition.json'));
  if (ammoExtracted && ammoOfficial) {
    mergeResults.ammunition.existing = ammoOfficial.items.length;
    const merged = mergeEquipment(ammoOfficial.items, ammoExtracted.items);
    mergeResults.ammunition.added =
      merged.length - mergeResults.ammunition.existing;
    mergeResults.ammunition.total = merged.length;

    ammoOfficial.items = merged;
    ammoOfficial.count = merged.length;
    ammoOfficial.generatedAt = new Date().toISOString();

    saveJsonFile(path.join(OFFICIAL_DIR, 'ammunition.json'), ammoOfficial);
    console.log(
      `Ammunition: ${mergeResults.ammunition.existing} existing + ${mergeResults.ammunition.added} added = ${mergeResults.ammunition.total} total`,
    );
  }

  console.log('\nMerge complete!');
  console.log('\nSummary:');
  console.log(
    `  Total items added: ${Object.values(mergeResults).reduce((sum, r) => sum + r.added, 0)}`,
  );
  console.log(
    `  Total items now: ${Object.values(mergeResults).reduce((sum, r) => sum + r.total, 0)}`,
  );

  return mergeResults;
}

// Run merge
if (require.main === module) {
  mergeEquipmentFiles();
}

module.exports = { mergeEquipmentFiles, mergeEquipment };
