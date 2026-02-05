#!/usr/bin/env node
/**
 * Validate Extraction Results
 *
 * Compares extracted equipment against missing equipment report
 * to verify coverage.
 */

const fs = require('fs');
const path = require('path');

const MISSING_REPORT = path.join(
  __dirname,
  '..',
  'missing-equipment-report.json',
);
const OFFICIAL_DIR = path.join(
  __dirname,
  '..',
  'public',
  'data',
  'equipment',
  'official',
);

/**
 * Normalize name for comparison
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

/**
 * Check if equipment exists in official files
 */
function findEquipment(name, officialItems) {
  const normalized = normalizeName(name);

  return officialItems.some((item) => {
    const itemName = normalizeName(item.name);
    const itemId = normalizeName(item.id);
    return itemName === normalized || itemId === normalized;
  });
}

/**
 * Validate extraction coverage
 */
function validateExtraction() {
  console.log('Validating extraction coverage...\n');

  if (!fs.existsSync(MISSING_REPORT)) {
    console.error('Missing equipment report not found!');
    return;
  }

  const missingReport = JSON.parse(fs.readFileSync(MISSING_REPORT, 'utf8'));

  // Load all official equipment
  const officialEquipment = {
    weapons: {
      energy: [],
      ballistic: [],
      missile: [],
    },
    electronics: [],
    miscellaneous: [],
    ammunition: [],
  };

  // Load energy weapons
  const energyFile = path.join(OFFICIAL_DIR, 'weapons', 'energy.json');
  if (fs.existsSync(energyFile)) {
    officialEquipment.weapons.energy = JSON.parse(
      fs.readFileSync(energyFile, 'utf8'),
    ).items;
  }

  // Load ballistic weapons
  const ballisticFile = path.join(OFFICIAL_DIR, 'weapons', 'ballistic.json');
  if (fs.existsSync(ballisticFile)) {
    officialEquipment.weapons.ballistic = JSON.parse(
      fs.readFileSync(ballisticFile, 'utf8'),
    ).items;
  }

  // Load missile weapons
  const missileFile = path.join(OFFICIAL_DIR, 'weapons', 'missile.json');
  if (fs.existsSync(missileFile)) {
    officialEquipment.weapons.missile = JSON.parse(
      fs.readFileSync(missileFile, 'utf8'),
    ).items;
  }

  // Load electronics
  const electronicsFile = path.join(OFFICIAL_DIR, 'electronics.json');
  if (fs.existsSync(electronicsFile)) {
    officialEquipment.electronics = JSON.parse(
      fs.readFileSync(electronicsFile, 'utf8'),
    ).items;
  }

  // Load miscellaneous
  const miscFile = path.join(OFFICIAL_DIR, 'miscellaneous.json');
  if (fs.existsSync(miscFile)) {
    officialEquipment.miscellaneous = JSON.parse(
      fs.readFileSync(miscFile, 'utf8'),
    ).items;
  }

  // Load ammunition
  const ammoFile = path.join(OFFICIAL_DIR, 'ammunition.json');
  if (fs.existsSync(ammoFile)) {
    officialEquipment.ammunition = JSON.parse(
      fs.readFileSync(ammoFile, 'utf8'),
    ).items;
  }

  // Flatten all equipment for searching
  const allOfficial = [
    ...officialEquipment.weapons.energy,
    ...officialEquipment.weapons.ballistic,
    ...officialEquipment.weapons.missile,
    ...officialEquipment.electronics,
    ...officialEquipment.miscellaneous,
    ...officialEquipment.ammunition,
  ];

  console.log(`Total official equipment: ${allOfficial.length}`);
  console.log(`Missing equipment to check: ${missingReport.totalMissing}\n`);

  // Check each category
  const results = {};
  let totalFound = 0;
  let totalMissing = 0;

  for (const [category, data] of Object.entries(
    missingReport.missingByCategory,
  )) {
    const missingItems = data.items || [];
    const found = [];
    const stillMissing = [];

    for (const itemName of missingItems) {
      if (findEquipment(itemName, allOfficial)) {
        found.push(itemName);
        totalFound++;
      } else {
        stillMissing.push(itemName);
        totalMissing++;
      }
    }

    results[category] = {
      total: missingItems.length,
      found: found.length,
      stillMissing: stillMissing.length,
      coverage: ((found.length / missingItems.length) * 100).toFixed(1) + '%',
      stillMissingItems: stillMissing.slice(0, 10), // Show first 10
    };
  }

  // Print results
  console.log('='.repeat(80));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(80));
  console.log();

  for (const [category, result] of Object.entries(results)) {
    console.log(`${category}:`);
    console.log(`  Total Missing: ${result.total}`);
    console.log(`  Found: ${result.found} (${result.coverage} coverage)`);
    console.log(`  Still Missing: ${result.stillMissing}`);
    if (result.stillMissingItems.length > 0) {
      console.log(
        `  Examples: ${result.stillMissingItems.join(', ')}${result.stillMissing > 10 ? '...' : ''}`,
      );
    }
    console.log();
  }

  console.log('='.repeat(80));
  console.log(`OVERALL: ${totalFound} found, ${totalMissing} still missing`);
  console.log(
    `Coverage: ${((totalFound / missingReport.totalMissing) * 100).toFixed(1)}%`,
  );
  console.log('='.repeat(80));

  return results;
}

// Run validation
if (require.main === module) {
  validateExtraction();
}

module.exports = { validateExtraction };
