import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Only look at units with reliable MUL exact match
const overCalc = data.allResults.filter((d: any) => {
  if (d.difference <= 0 || d.percentDiff <= 1) return false;
  if (d.rootCause !== 'overcalculation') return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});

console.log('=== RELIABLE OVERCALCULATED UNITS (MUL exact match) ===');
console.log('Count:', overCalc.length);
console.log('');

// For each unit, load the file and check for specific patterns
let c3Count = 0;
let inarcCount = 0;
let narcCount = 0;
let mascCount = 0;
let scCount = 0;
let tsmCount = 0;
let tcCount = 0;
let ecmCount = 0;
let stealthCount = 0;
let droneOSCount = 0;
let celestialCount = 0;
let quadCount = 0;

const equipmentFreq: Record<string, number> = {};

for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
    const allCritsLo = allCrits.map((s: string) => s.toLowerCase());

    if (allCritsLo.some(s => s.includes('c3') && (s.includes('master') || s.includes('slave') || s.includes('c3i') || s.includes('c3s') || s.includes('c3m')))) c3Count++;
    if (allCritsLo.some(s => s.includes('inarc') || s.includes('improved narc'))) inarcCount++;
    if (allCritsLo.some(s => (s.includes('narc') && !s.includes('inarc')) && !s.includes('ammo'))) narcCount++;
    if (allCritsLo.some(s => s.includes('masc'))) mascCount++;
    if (allCritsLo.some(s => s.includes('supercharger'))) scCount++;
    if (allCritsLo.some(s => s.includes('tsm'))) tsmCount++;
    if (allCritsLo.some(s => s.includes('targeting computer'))) tcCount++;
    if (allCritsLo.some(s => s.includes('ecm'))) ecmCount++;
    if (unit.armor?.type?.toUpperCase()?.includes('STEALTH')) stealthCount++;
    if (allCritsLo.some(s => s.includes('droneoperatingsystem') || s.includes('drone operating system'))) droneOSCount++;
    if (unit.configuration === 'Quad') quadCount++;

    // Celestial OmniMechs (Blakist)
    const chassis = (unit.chassis || '').toLowerCase();
    if (['archangel', 'seraph', 'grigori', 'preta', 'deva', 'malak'].some(c => chassis.includes(c))) celestialCount++;

    // Track all equipment IDs
    for (const eq of unit.equipment || []) {
      const id = eq.id.toLowerCase();
      equipmentFreq[id] = (equipmentFreq[id] || 0) + 1;
    }
  } catch { /* skip */ }
}

console.log('Equipment in overcalculated MUL-exact units:');
console.log('  C3 (any variant):', c3Count);
console.log('  iNarc:', inarcCount);
console.log('  Narc (non-iNarc):', narcCount);
console.log('  MASC:', mascCount);
console.log('  Supercharger:', scCount);
console.log('  TSM:', tsmCount);
console.log('  Targeting Computer:', tcCount);
console.log('  ECM:', ecmCount);
console.log('  Stealth Armor:', stealthCount);
console.log('  Drone OS:', droneOSCount);
console.log('  Quad:', quadCount);
console.log('  Celestial OmniMech:', celestialCount);
console.log('');

// Top equipment IDs by frequency
const sortedEquip = Object.entries(equipmentFreq).sort((a, b) => b[1] - a[1]);
console.log('Top 20 equipment IDs:');
for (const [id, cnt] of sortedEquip.slice(0, 20)) {
  console.log(`  ${id}: ${cnt}`);
}
console.log('');

// Check: what's the average overcalculation for units WITH vs WITHOUT each equipment
const equipChecks: Array<[string, (unit: any, critsLo: string[]) => boolean]> = [
  ['MASC', (u, c) => c.some(s => s.includes('masc'))],
  ['Supercharger', (u, c) => c.some(s => s.includes('supercharger'))],
  ['TSM', (u, c) => c.some(s => s.includes('tsm'))],
  ['TC', (u, c) => c.some(s => s.includes('targeting computer'))],
  ['ECM', (u, c) => c.some(s => s.includes('ecm'))],
  ['Stealth', (u, _) => u.armor?.type?.toUpperCase()?.includes('STEALTH')],
  ['C3', (u, c) => c.some(s => s.includes('c3'))],
  ['iNarc', (u, c) => c.some(s => s.includes('inarc'))],
  ['Narc', (u, c) => c.some(s => s.includes('narc') && !s.includes('inarc'))],
  ['Celestial', (u, _) => ['archangel','seraph','grigori','preta','deva','malak'].some(c => (u.chassis || '').toLowerCase().includes(c))],
  ['DroneOS', (u, c) => c.some(s => s.includes('droneoperatingsystem'))],
];

console.log('Average overcalculation by equipment:');
for (const [name, check] of equipChecks) {
  const with_: any[] = [];
  const without_: any[] = [];

  for (const d of overCalc) {
    const iu = indexData.units.find((u: any) => u.id === d.unitId);
    if (!iu) continue;
    try {
      const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
      const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
      const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
      const allCritsLo = allCrits.map((s: string) => s.toLowerCase());

      if (check(unit, allCritsLo)) {
        with_.push(d);
      } else {
        without_.push(d);
      }
    } catch { /* skip */ }
  }

  if (with_.length > 0) {
    const avgWith = with_.reduce((s: number, d: any) => s + d.percentDiff, 0) / with_.length;
    const avgWithout = without_.length > 0 ? without_.reduce((s: number, d: any) => s + d.percentDiff, 0) / without_.length : 0;
    console.log(`  ${name}: with=${with_.length} (${avgWith.toFixed(1)}%) without=${without_.length} (${avgWithout.toFixed(1)}%)`);
  }
}

console.log('');

// Now check: do units with high defBV/totalBV ratio have higher overcalculation?
console.log('Overcalculation vs defense/offense ratio:');
const highDef = overCalc.filter((d: any) => d.breakdown.defensiveBV / d.calculatedBV > 0.5);
const lowDef = overCalc.filter((d: any) => d.breakdown.defensiveBV / d.calculatedBV <= 0.5);
console.log(`  High defense (>50% of total): ${highDef.length} units, avg ${(highDef.reduce((s: number, d: any) => s + d.percentDiff, 0) / highDef.length).toFixed(1)}%`);
console.log(`  Low defense (<=50% of total): ${lowDef.length} units, avg ${(lowDef.reduce((s: number, d: any) => s + d.percentDiff, 0) / lowDef.length).toFixed(1)}%`);
