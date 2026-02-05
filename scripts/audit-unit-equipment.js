#!/usr/bin/env node
/**
 * Unit Equipment Audit Script
 *
 * Cross-checks all unit JSON files against the official equipment catalog
 * to identify equipment references that are:
 * - Direct matches (exact ID match)
 * - Alias-resolvable (can be normalized to a canonical ID)
 * - Missing (not found in the equipment catalog)
 *
 * Usage: node scripts/audit-unit-equipment.js [--verbose] [--output report.json]
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================

const EQUIPMENT_DIR = path.join(
  __dirname,
  '..',
  'public',
  'data',
  'equipment',
  'official',
);
const UNITS_DIR = path.join(__dirname, '..', 'public', 'data', 'units');
const OUTPUT_FILE = path.join(
  __dirname,
  '..',
  'unit-equipment-audit-report.json',
);

// Parse command line args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const outputIdx = args.indexOf('--output');
const customOutput =
  outputIdx !== -1 && args[outputIdx + 1]
    ? path.resolve(args[outputIdx + 1])
    : OUTPUT_FILE;

// =============================================================================
// Equipment Loading
// =============================================================================

/**
 * Load equipment from a JSON file
 */
function loadEquipmentFile(relativePath) {
  try {
    const filePath = path.join(EQUIPMENT_DIR, relativePath);
    if (!fs.existsSync(filePath)) {
      console.warn(`Equipment file not found: ${relativePath}`);
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return data.items || [];
  } catch (e) {
    console.error(`Error loading ${relativePath}:`, e.message);
    return [];
  }
}

/**
 * Load all official equipment and build lookup maps
 */
function loadAllEquipment() {
  const equipment = {
    byId: new Map(),
    byNormalizedId: new Map(),
    byNormalizedName: new Map(),
    aliases: new Map(), // Legacy ID → canonical ID
  };

  // Load all equipment files
  const files = [
    'weapons/energy.json',
    'weapons/ballistic.json',
    'weapons/missile.json',
    'weapons/physical.json',
    'weapons/artillery.json',
    'electronics.json',
    'miscellaneous.json',
    'ammunition.json',
  ];

  let totalLoaded = 0;

  for (const file of files) {
    const items = loadEquipmentFile(file);
    for (const item of items) {
      equipment.byId.set(item.id, item);
      equipment.byNormalizedId.set(normalizeId(item.id), item.id);
      equipment.byNormalizedName.set(normalizeName(item.name), item.id);
      totalLoaded++;
    }
  }

  // Build alias mappings for common legacy ID patterns
  buildAliases(equipment);

  console.log(
    `Loaded ${totalLoaded} equipment items from ${files.length} files`,
  );
  console.log(`Built ${equipment.aliases.size} ID aliases`);

  return equipment;
}

/**
 * Normalize an ID for comparison (lowercase, remove special chars)
 */
function normalizeId(id) {
  return id.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/**
 * Normalize a name for comparison
 */
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Build alias mappings for common legacy ID patterns
 */
function buildAliases(equipment) {
  // For each canonical ID, generate possible legacy aliases
  for (const [id, item] of equipment.byId) {
    const isClan = id.startsWith('clan-');
    const baseId = isClan ? id.slice(5) : id;
    const prefix = isClan ? 'clan-' : '';

    // Ultra AC patterns: 'uac-5' → aliases include 'ultra-ac-5'
    const uacMatch = baseId.match(/^uac-(\d+)$/);
    if (uacMatch) {
      const num = uacMatch[1];
      equipment.aliases.set(`${prefix}ultra-ac-${num}`, id);
      equipment.aliases.set(`ultra-ac-${num}`, id);
    }

    // Rotary AC patterns: 'rac-5' → 'rotary-ac-5'
    const racMatch = baseId.match(/^rac-(\d+)$/);
    if (racMatch) {
      const num = racMatch[1];
      equipment.aliases.set(`${prefix}rotary-ac-${num}`, id);
      equipment.aliases.set(`rotary-ac-${num}`, id);
    }

    // Light AC patterns: 'lac-5' → 'light-ac-5'
    const lacMatch = baseId.match(/^lac-(\d+)$/);
    if (lacMatch) {
      const num = lacMatch[1];
      equipment.aliases.set(`${prefix}light-ac-${num}`, id);
      equipment.aliases.set(`light-ac-${num}`, id);
    }

    // LB-X AC patterns: 'lb-10x-ac' → 'lb-10-x-ac'
    const lbxMatch = baseId.match(/^lb-(\d+)x-ac$/);
    if (lbxMatch) {
      const num = lbxMatch[1];
      equipment.aliases.set(`${prefix}lb-${num}-x-ac`, id);
      equipment.aliases.set(`lb-${num}-x-ac`, id);
    }

    // ER Laser patterns
    const erMatch = baseId.match(/^er-(.+)-laser$/);
    if (erMatch) {
      const size = erMatch[1];
      equipment.aliases.set(`${prefix}extended-range-${size}-laser`, id);
      equipment.aliases.set(`extended-range-${size}-laser`, id);
    }

    // Ammo patterns
    const ammoPatterns = [
      { regex: /^uac-(\d+)-ammo$/, replace: (num) => `ultra-ac-${num}-ammo` },
      { regex: /^rac-(\d+)-ammo$/, replace: (num) => `rotary-ac-${num}-ammo` },
      { regex: /^lac-(\d+)-ammo$/, replace: (num) => `light-ac-${num}-ammo` },
      {
        regex: /^lb-(\d+)x-ac-(.*)$/,
        replace: (num, suffix) => `lb-${num}-x-ac-${suffix}`,
      },
    ];

    for (const pattern of ammoPatterns) {
      const match = baseId.match(pattern.regex);
      if (match) {
        const aliasId = pattern.replace(...match.slice(1));
        equipment.aliases.set(`${prefix}${aliasId}`, id);
        equipment.aliases.set(aliasId, id);
      }
    }

    // Also map display name to ID
    if (item.name) {
      equipment.aliases.set(normalizeName(item.name), id);
    }
  }
}

// =============================================================================
// Unit Loading
// =============================================================================

/**
 * Recursively find all JSON files in a directory (excluding index.json)
 */
function findUnitFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findUnitFiles(fullPath, files);
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.json') &&
      entry.name !== 'index.json'
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Load a unit JSON file and extract equipment IDs
 */
function loadUnitFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const unit = JSON.parse(content);

    const equipmentIds = [];

    if (unit.equipment && Array.isArray(unit.equipment)) {
      for (const item of unit.equipment) {
        if (item.id) {
          equipmentIds.push(item.id);
        }
      }
    }

    return {
      id: unit.id,
      name: unit.chassis + (unit.model ? ' ' + unit.model : ''),
      techBase: unit.techBase,
      filePath: path.relative(UNITS_DIR, filePath),
      equipmentIds,
    };
  } catch (e) {
    console.error(`Error loading unit file ${filePath}:`, e.message);
    return null;
  }
}

// =============================================================================
// Resolution Logic (matches UnitLoaderService)
// =============================================================================

/**
 * Normalize an equipment ID (matches UnitLoaderService.normalizeEquipmentId)
 */
function normalizeEquipmentId(id, techBase) {
  let normalized = id.toLowerCase().trim();

  // Check for Clan prefix
  const isClanPrefix = normalized.startsWith('clan-');
  if (isClanPrefix) {
    normalized = normalized.slice(5);
  }

  // Ultra AC/x patterns: 'ultra-ac-5' → 'uac-5'
  if (/^ultra-ac-?\d+$/.test(normalized)) {
    const num = normalized.match(/\d+$/)?.[0];
    normalized = `uac-${num}`;
  }

  // Rotary AC patterns: 'rotary-ac-5' → 'rac-5'
  if (/^rotary-ac-?\d+$/.test(normalized)) {
    const num = normalized.match(/\d+$/)?.[0];
    normalized = `rac-${num}`;
  }

  // Light AC patterns: 'light-ac-5' → 'lac-5'
  if (/^light-ac-?\d+$/.test(normalized)) {
    const num = normalized.match(/\d+$/)?.[0];
    normalized = `lac-${num}`;
  }

  // LB X AC patterns: 'lb-10-x-ac' → 'lb-10x-ac'
  normalized = normalized.replace(/^lb-(\d+)-x-ac$/, 'lb-$1x-ac');

  // ER laser patterns
  normalized = normalized.replace(/^extended-range-(.*)$/, 'er-$1');

  // Handle ammo patterns
  if (normalized.endsWith('-ammo') || normalized.includes('-ammo-')) {
    normalized = normalized.replace(/ultra-ac-(\d+)/, 'uac-$1');
    normalized = normalized.replace(/rotary-ac-(\d+)/, 'rac-$1');
    normalized = normalized.replace(/light-ac-(\d+)/, 'lac-$1');
    normalized = normalized.replace(/lb-(\d+)-x-ac/, 'lb-$1x-ac');
  }

  // Re-add clan prefix if needed
  if (isClanPrefix) {
    normalized = `clan-${normalized}`;
  }

  return normalized;
}

/**
 * Resolve an equipment ID using multiple strategies
 */
function resolveEquipmentId(id, techBase, equipment) {
  // Strategy 1: Direct lookup by exact ID
  if (equipment.byId.has(id)) {
    return { found: true, canonicalId: id, method: 'direct' };
  }

  // Strategy 2: Normalize the ID and try again
  const normalizedId = normalizeEquipmentId(id, techBase);
  if (normalizedId !== id && equipment.byId.has(normalizedId)) {
    return { found: true, canonicalId: normalizedId, method: 'normalized' };
  }

  // Strategy 3: Try with/without clan prefix based on tech base
  const isClan = techBase && techBase.toUpperCase().includes('CLAN');
  if (isClan && !normalizedId.startsWith('clan-')) {
    const clanId = `clan-${normalizedId}`;
    if (equipment.byId.has(clanId)) {
      return { found: true, canonicalId: clanId, method: 'clan-prefixed' };
    }
  }

  // Strategy 4: Check alias mappings
  if (equipment.aliases.has(id)) {
    return {
      found: true,
      canonicalId: equipment.aliases.get(id),
      method: 'alias',
    };
  }
  if (equipment.aliases.has(normalizedId)) {
    return {
      found: true,
      canonicalId: equipment.aliases.get(normalizedId),
      method: 'alias',
    };
  }

  // Strategy 5: Try normalized name lookup
  const normalizedName = normalizeName(id);
  if (equipment.byNormalizedName.has(normalizedName)) {
    return {
      found: true,
      canonicalId: equipment.byNormalizedName.get(normalizedName),
      method: 'name-match',
    };
  }

  // Not found
  return { found: false, canonicalId: null, method: 'missing' };
}

// =============================================================================
// Audit Report Generation
// =============================================================================

/**
 * Generate the audit report
 */
function generateAuditReport(equipment) {
  console.log('\nScanning unit files...');

  const unitFiles = findUnitFiles(UNITS_DIR);
  console.log(`Found ${unitFiles.length} unit files`);

  const report = {
    summary: {
      totalUnits: 0,
      totalEquipmentReferences: 0,
      directMatches: 0,
      aliasResolved: 0,
      missing: 0,
      scanDate: new Date().toISOString(),
    },
    byMethod: {
      direct: [],
      normalized: [],
      'clan-prefixed': [],
      alias: [],
      'name-match': [],
      missing: [],
    },
    byUnit: [],
    missingEquipmentIds: new Map(), // equipmentId → [units using it]
  };

  for (const filePath of unitFiles) {
    const unit = loadUnitFile(filePath);
    if (!unit || unit.equipmentIds.length === 0) {
      continue;
    }

    report.summary.totalUnits++;

    const unitReport = {
      id: unit.id,
      name: unit.name,
      techBase: unit.techBase,
      filePath: unit.filePath,
      equipment: [],
    };

    for (const equipmentId of unit.equipmentIds) {
      report.summary.totalEquipmentReferences++;

      const resolution = resolveEquipmentId(
        equipmentId,
        unit.techBase,
        equipment,
      );

      const equipmentReport = {
        originalId: equipmentId,
        canonicalId: resolution.canonicalId,
        method: resolution.method,
      };

      unitReport.equipment.push(equipmentReport);

      if (resolution.found) {
        if (resolution.method === 'direct') {
          report.summary.directMatches++;
        } else {
          report.summary.aliasResolved++;
        }
        report.byMethod[resolution.method].push({
          originalId: equipmentId,
          canonicalId: resolution.canonicalId,
          unit: unit.name,
        });
      } else {
        report.summary.missing++;
        report.byMethod.missing.push({
          originalId: equipmentId,
          unit: unit.name,
          filePath: unit.filePath,
        });

        // Track missing equipment usage
        if (!report.missingEquipmentIds.has(equipmentId)) {
          report.missingEquipmentIds.set(equipmentId, []);
        }
        report.missingEquipmentIds.get(equipmentId).push(unit.name);
      }
    }

    report.byUnit.push(unitReport);
  }

  // Convert Map to array for JSON serialization
  report.topMissingEquipment = Array.from(report.missingEquipmentIds.entries())
    .map(([id, units]) => ({
      id,
      usageCount: units.length,
      units: units.slice(0, 5),
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 50);

  delete report.missingEquipmentIds;

  return report;
}

/**
 * Print summary to console
 */
function printSummary(report) {
  console.log('\n' + '='.repeat(60));
  console.log('UNIT EQUIPMENT AUDIT REPORT');
  console.log('='.repeat(60));

  console.log(`\nScan Date: ${report.summary.scanDate}`);
  console.log(`Total Units: ${report.summary.totalUnits}`);
  console.log(
    `Total Equipment References: ${report.summary.totalEquipmentReferences}`,
  );

  console.log('\nResolution Results:');
  console.log(`  ✅ Direct matches: ${report.summary.directMatches}`);
  console.log(`  🔄 Alias resolved: ${report.summary.aliasResolved}`);
  console.log(`  ❌ Missing: ${report.summary.missing}`);

  const successRate = (
    ((report.summary.directMatches + report.summary.aliasResolved) /
      report.summary.totalEquipmentReferences) *
    100
  ).toFixed(1);
  console.log(`\nSuccess Rate: ${successRate}%`);

  if (report.byMethod.normalized.length > 0) {
    console.log(`\nNormalized IDs (${report.byMethod.normalized.length}):`);
    const uniqueNormalized = [
      ...new Set(
        report.byMethod.normalized.map(
          (e) => `${e.originalId} → ${e.canonicalId}`,
        ),
      ),
    ];
    uniqueNormalized.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    if (uniqueNormalized.length > 10) {
      console.log(`  ... and ${uniqueNormalized.length - 10} more`);
    }
  }

  if (report.topMissingEquipment.length > 0) {
    console.log(
      `\nTop Missing Equipment (${report.topMissingEquipment.length} unique IDs):`,
    );
    report.topMissingEquipment.slice(0, 15).forEach((item) => {
      console.log(`  - "${item.id}" (used by ${item.usageCount} units)`);
    });
    if (report.topMissingEquipment.length > 15) {
      console.log(`  ... and ${report.topMissingEquipment.length - 15} more`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

// =============================================================================
// Main
// =============================================================================

function main() {
  console.log('Unit Equipment Audit');
  console.log('====================\n');

  // Load equipment catalog
  const equipment = loadAllEquipment();

  // Generate audit report
  const report = generateAuditReport(equipment);

  // Print summary
  printSummary(report);

  // Write full report to file
  const outputPath = customOutput;
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report written to: ${outputPath}`);

  // Exit with error code if there are missing items
  if (report.summary.missing > 0) {
    console.log(
      `\n⚠️  ${report.summary.missing} equipment references could not be resolved.`,
    );
    process.exit(1);
  } else {
    console.log('\n✅ All equipment references resolved successfully!');
    process.exit(0);
  }
}

main();
