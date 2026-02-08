import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Get the exact 1.0527 units
const exactFive = data.allResults.filter((d: any) => {
  if (d.difference <= 0) return false;
  const entry = mulCache.entries?.[d.unitId];
  if (!entry || entry.mulBV <= 0 || entry.matchType !== 'exact') return false;
  const ratio = d.calculatedBV / d.indexBV;
  return ratio >= 1.051 && ratio <= 1.054;
});

// Check each unit's detailed properties
console.log('=== CHECKING COMMON FEATURES OF 1.0527 RATIO UNITS ===');
console.log('Count:', exactFive.length);

let hasC3Master = 0, hasC3Slave = 0, hasC3i = 0, hasC3 = 0;
let hasNarc = 0, hasINarc = 0, hasTAG = 0;
let hasECM = 0, hasBAP = 0, hasBloodhound = 0;
let hasStealth = 0, hasNullSig = 0, hasVoidSig = 0, hasChameleon = 0;
let hasMASC = 0, hasSC = 0, hasTSM = 0;
let hasTC = 0;
let hasAMS = 0;
let celestial = 0;
let unitYear: number[] = [];

// Check MUL names for common patterns
const mulNames: string[] = [];

for (const d of exactFive) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;

  const mulEntry = mulCache.entries?.[d.unitId];
  if (mulEntry?.mulName) mulNames.push(mulEntry.mulName);
  if (iu.year) unitYear.push(iu.year);

  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
    const critsLo = allCrits.map(s => (s as string).toLowerCase());

    if (critsLo.some(s => s.includes('c3master') || s.includes('c3 master'))) hasC3Master++;
    if (critsLo.some(s => s.includes('c3slave') || s.includes('c3 slave') || s.includes('c3s'))) hasC3Slave++;
    if (critsLo.some(s => s.includes('c3i'))) hasC3i++;
    if (critsLo.some(s => s.includes('c3'))) hasC3++;
    if (critsLo.some(s => s.includes('narc') && !s.includes('inarc') && !s.includes('ammo'))) hasNarc++;
    if (critsLo.some(s => s.includes('inarc') && !s.includes('ammo'))) hasINarc++;
    if (critsLo.some(s => s.includes('tag') && !s.includes('ammo'))) hasTAG++;
    if (critsLo.some(s => s.includes('ecm'))) hasECM++;
    if (critsLo.some(s => s.includes('beagle') || s.includes('active probe') || s.includes('activeprobe') || s.includes('lightactiveprobe'))) hasBAP++;
    if (critsLo.some(s => s.includes('bloodhound'))) hasBloodhound++;
    if (unit.armor?.type?.toUpperCase()?.includes('STEALTH')) hasStealth++;
    if (critsLo.some(s => s.includes('nullsig'))) hasNullSig++;
    if (critsLo.some(s => s.includes('voidsig'))) hasVoidSig++;
    if (critsLo.some(s => s.includes('chameleon'))) hasChameleon++;
    if (critsLo.some(s => s.includes('masc'))) hasMASC++;
    if (critsLo.some(s => s.includes('supercharger'))) hasSC++;
    if (critsLo.some(s => s.includes('tsm') || s.includes('triplestrength'))) hasTSM++;
    if (critsLo.some(s => s.includes('targeting computer') || s.includes('istargeting') || s.includes('cltargeting'))) hasTC++;
    if (critsLo.some(s => (s.includes('anti-missile') || s.includes('antimissile') || s.includes('ams')))) hasAMS++;

    const chassis = (unit.chassis || '').toLowerCase();
    if (['archangel', 'seraph', 'grigori', 'preta', 'deva', 'malak', 'eidolon'].some(c => chassis.includes(c))) celestial++;
  } catch {}
}

console.log('\nEquipment in exact-1.0527 units:');
console.log('  C3 (any):', hasC3);
console.log('  C3 Master:', hasC3Master);
console.log('  C3 Slave:', hasC3Slave);
console.log('  C3i:', hasC3i);
console.log('  Narc:', hasNarc);
console.log('  iNarc:', hasINarc);
console.log('  TAG:', hasTAG);
console.log('  ECM:', hasECM);
console.log('  BAP:', hasBAP);
console.log('  Bloodhound:', hasBloodhound);
console.log('  Stealth Armor:', hasStealth);
console.log('  Null Sig:', hasNullSig);
console.log('  Void Sig:', hasVoidSig);
console.log('  Chameleon:', hasChameleon);
console.log('  MASC:', hasMASC);
console.log('  Supercharger:', hasSC);
console.log('  TSM:', hasTSM);
console.log('  TC:', hasTC);
console.log('  AMS:', hasAMS);
console.log('  Celestial:', celestial);

console.log('\nYear stats:');
if (unitYear.length > 0) {
  unitYear.sort();
  console.log('  min:', unitYear[0], 'max:', unitYear[unitYear.length-1]);
  console.log('  median:', unitYear[Math.floor(unitYear.length/2)]);
}

// Check MUL names for patterns
console.log('\nMUL names sample:');
for (const n of mulNames.slice(0, 20)) {
  console.log('  ', n);
}

// Check: do ALL 96 units have the SAME relationship between defBV and offBV?
// i.e., does the 0.95 apply to the same component?
console.log('\n=== COMPONENT ANALYSIS ===');
// If total * 0.95 = ref, then for each unit:
// ref = (defBV + offBV) * 0.95
// We know our defBV and offBV. Let's see if defBV * 0.95 + offBV * 0.95 = ref.
// This is trivially true since (a+b)*0.95 = a*0.95 + b*0.95.
// The question is whether the 0.95 comes from a factor in JUST one side.

// Let's check: if we reduce only defBV to make it match, what factor?
// (defBV * x + offBV) = ref
// x = (ref - offBV) / defBV
console.log('\nIf factor only on defBV:');
for (const d of exactFive.slice(0, 10)) {
  const neededDefFactor = (d.indexBV - d.breakdown.offensiveBV) / d.breakdown.defensiveBV;
  console.log(`  ${d.unitId}: defFactor=${neededDefFactor.toFixed(4)} (defBV=${d.breakdown.defensiveBV.toFixed(0)} offBV=${d.breakdown.offensiveBV.toFixed(0)})`);
}

// If factor only on offBV:
console.log('\nIf factor only on offBV:');
for (const d of exactFive.slice(0, 10)) {
  const neededOffFactor = (d.indexBV - d.breakdown.defensiveBV) / d.breakdown.offensiveBV;
  console.log(`  ${d.unitId}: offFactor=${neededOffFactor.toFixed(4)} (defBV=${d.breakdown.defensiveBV.toFixed(0)} offBV=${d.breakdown.offensiveBV.toFixed(0)})`);
}
