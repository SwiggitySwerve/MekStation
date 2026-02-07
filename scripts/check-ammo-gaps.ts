/**
 * check-ammo-gaps.ts
 *
 * Investigates ammo BV resolution gaps by:
 * 1. Reading the BV validation report
 * 2. Finding undercalculated units (percentDiff < -1) with ammo in crit slots but low ammoBV
 * 3. Printing per-unit ammo details
 * 4. Aggregating ammo types most commonly found on affected units
 *
 * Run: npx tsx scripts/check-ammo-gaps.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ValidationResult {
  unitId: string;
  chassis: string;
  model: string;
  tonnage: number;
  indexBV: number;
  calculatedBV: number;
  difference: number;
  percentDiff: number;
  status: string;
  breakdown?: {
    defensiveBV: number;
    offensiveBV: number;
    weaponBV: number;
    ammoBV: number;
    speedFactor: number;
    explosivePenalty: number;
    defensiveEquipBV: number;
    armorBV?: number;
    structureBV?: number;
    gyroBV?: number;
    defensiveFactor?: number;
  };
  issues: string[];
  rootCause?: string;
}

interface ValidationReport {
  summary: Record<string, number>;
  topDiscrepancies: ValidationResult[];
  allResults: ValidationResult[];
}

interface IndexUnit {
  id: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  path: string;
  bv: number;
}

interface UnitIndex {
  units: IndexUnit[];
}

interface UnitData {
  id: string;
  chassis: string;
  model: string;
  techBase: string;
  tonnage: number;
  criticalSlots?: Record<string, (string | null)[]>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'validation-output', 'bv-validation-report.json');
const INDEX_PATH = path.join(ROOT, 'public', 'data', 'units', 'battlemechs', 'index.json');
const UNITS_DIR = path.join(ROOT, 'public', 'data', 'units', 'battlemechs');

function isAmmoSlot(slotName: string): boolean {
  const lower = slotName.toLowerCase();
  // Must contain "ammo" but exclude AMS ammo (anti-missile system)
  if (!lower.includes('ammo')) return false;
  if (lower.includes('ams ammo')) return false;
  if (lower.includes('anti-missile') && lower.includes('ammo')) return false;
  return true;
}

// Normalise an ammo slot name into a canonical ammo type for aggregation
function normalizeAmmoType(slotName: string): string {
  let s = slotName.trim();
  // Strip common prefixes
  s = s.replace(/^(IS|Clan|CL|Inner Sphere)\s+/i, '');
  // Strip "(OmniPod)" suffix
  s = s.replace(/\s*\(omnipod\)/gi, '');
  // Strip "@ NN" shot counts
  s = s.replace(/@\s*\d+/g, '');
  // Trim again
  s = s.trim();
  return s;
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  // 1. Load data
  const report: ValidationReport = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
  const index: UnitIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
  const indexMap = new Map<string, IndexUnit>();
  for (const u of index.units) {
    indexMap.set(u.id, u);
  }

  // 2. Gather all results (topDiscrepancies + results, deduplicated)
  const allResults = new Map<string, ValidationResult>();
  for (const r of (report.topDiscrepancies ?? [])) {
    allResults.set(r.unitId, r);
  }
  for (const r of (report.allResults ?? [])) {
    if (!allResults.has(r.unitId)) {
      allResults.set(r.unitId, r);
    }
  }

  // 3. Filter: undercalculated with percentDiff < -1
  const undercalculated = [...allResults.values()].filter(r => r.percentDiff < -1);
  console.log(`Total validated results: ${allResults.size}`);
  console.log(`Undercalculated units (percentDiff < -1): ${undercalculated.length}\n`);

  // 4. For each undercalculated unit, load its file and check ammo in crits
  const LOW_AMMO_THRESHOLD = 10;
  const ammoTypeFrequency = new Map<string, number>();
  const affectedUnits: Array<{
    unitId: string;
    techBase: string;
    tonnage: number;
    gap: number;
    percentDiff: number;
    ammoBV: number;
    ammoSlots: Array<{ name: string; location: string; normalizedType: string }>;
    uniqueAmmoTypes: number;
  }> = [];

  let noFileCount = 0;
  let noAmmoInCritsCount = 0;
  let highAmmoBVCount = 0;

  for (const r of undercalculated) {
    const iu = indexMap.get(r.unitId);
    if (!iu) continue;

    const unitFilePath = path.join(UNITS_DIR, iu.path);
    if (!fs.existsSync(unitFilePath)) {
      noFileCount++;
      continue;
    }

    const ud: UnitData = JSON.parse(fs.readFileSync(unitFilePath, 'utf-8'));
    const crits = ud.criticalSlots;
    if (!crits) continue;

    // Find all ammo entries in critical slots
    const ammoSlots: Array<{ name: string; location: string; normalizedType: string }> = [];
    for (const [location, slots] of Object.entries(crits)) {
      for (const slot of slots) {
        if (slot && isAmmoSlot(slot)) {
          const normalizedType = normalizeAmmoType(slot);
          ammoSlots.push({ name: slot, location, normalizedType });
        }
      }
    }

    if (ammoSlots.length === 0) {
      noAmmoInCritsCount++;
      continue;
    }

    const ammoBV = r.breakdown?.ammoBV ?? 0;

    if (ammoBV >= LOW_AMMO_THRESHOLD) {
      highAmmoBVCount++;
      continue;
    }

    // This unit has ammo in crits but low ammoBV -- it's a candidate
    const uniqueTypes = new Set(ammoSlots.map(a => a.normalizedType));

    affectedUnits.push({
      unitId: r.unitId,
      techBase: iu.techBase,
      tonnage: iu.tonnage,
      gap: r.difference,
      percentDiff: r.percentDiff,
      ammoBV,
      ammoSlots,
      uniqueAmmoTypes: uniqueTypes.size,
    });

    // Tally ammo types
    for (const t of uniqueTypes) {
      ammoTypeFrequency.set(t, (ammoTypeFrequency.get(t) ?? 0) + 1);
    }
  }

  // ── Report ─────────────────────────────────────────────────────────────────

  console.log(`=== AMMO GAP ANALYSIS ===`);
  console.log(`Undercalculated units examined: ${undercalculated.length}`);
  console.log(`  - No unit file found: ${noFileCount}`);
  console.log(`  - No ammo in crit slots: ${noAmmoInCritsCount}`);
  console.log(`  - ammoBV >= ${LOW_AMMO_THRESHOLD} (not low): ${highAmmoBVCount}`);
  console.log(`  - AFFECTED (has ammo, ammoBV < ${LOW_AMMO_THRESHOLD}): ${affectedUnits.length}`);
  console.log();

  // Sort affected units by gap (most negative first)
  affectedUnits.sort((a, b) => a.gap - b.gap);

  console.log(`=== AFFECTED UNITS (ammo in crits but ammoBV < ${LOW_AMMO_THRESHOLD}) ===\n`);
  for (const u of affectedUnits) {
    console.log(`--- ${u.unitId} ---`);
    console.log(`  techBase: ${u.techBase}, tonnage: ${u.tonnage}`);
    console.log(`  gap: ${u.gap} (${u.percentDiff.toFixed(1)}%), ammoBV in breakdown: ${u.ammoBV}`);
    console.log(`  unique ammo types: ${u.uniqueAmmoTypes}`);
    console.log(`  ammo entries in crits:`);
    for (const a of u.ammoSlots) {
      console.log(`    [${a.location}] ${a.name}  =>  normalized: "${a.normalizedType}"`);
    }
    console.log();
  }

  // ── Aggregation ────────────────────────────────────────────────────────────

  console.log(`=== AMMO TYPE FREQUENCY (on affected units) ===\n`);
  const sortedTypes = [...ammoTypeFrequency.entries()].sort((a, b) => b[1] - a[1]);
  for (const [ammoType, count] of sortedTypes) {
    console.log(`  ${count.toString().padStart(4)} x  ${ammoType}`);
  }
  console.log();

  // ── Tech Base breakdown ────────────────────────────────────────────────────

  const techBaseCounts = new Map<string, number>();
  for (const u of affectedUnits) {
    techBaseCounts.set(u.techBase, (techBaseCounts.get(u.techBase) ?? 0) + 1);
  }
  console.log(`=== TECH BASE BREAKDOWN (affected units) ===`);
  for (const [tb, count] of [...techBaseCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tb}: ${count}`);
  }
  console.log();

  // ── Summary statistics ─────────────────────────────────────────────────────

  if (affectedUnits.length > 0) {
    const gaps = affectedUnits.map(u => u.gap);
    const avgGap = gaps.reduce((s, v) => s + v, 0) / gaps.length;
    const minGap = Math.min(...gaps);
    const maxGap = Math.max(...gaps);
    console.log(`=== SUMMARY STATISTICS ===`);
    console.log(`  Affected units: ${affectedUnits.length}`);
    console.log(`  Average BV gap: ${avgGap.toFixed(1)}`);
    console.log(`  Largest gap: ${minGap}`);
    console.log(`  Smallest gap: ${maxGap}`);

    // Count units with ammoBV == 0
    const zeroBV = affectedUnits.filter(u => u.ammoBV === 0).length;
    const lowBV = affectedUnits.filter(u => u.ammoBV > 0 && u.ammoBV < LOW_AMMO_THRESHOLD).length;
    console.log(`  ammoBV == 0: ${zeroBV}`);
    console.log(`  0 < ammoBV < ${LOW_AMMO_THRESHOLD}: ${lowBV}`);
  }
}

main();
